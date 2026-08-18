from __future__ import annotations

import asyncio
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Optional

import bcrypt
import jwt
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from dotenv import load_dotenv
from sqlmodel import Session, select

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from .database import CallInsight, CallRecording, EmotionTrajectory, InsightType, Role, User, get_session, init_db
from .agent.graph import evaluation_graph
from .agent.nodes import normalized_evaluation

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "backend/uploads")).resolve()
ALLOWED_SUFFIXES = {".mp3", ".wav", ".m4a"}

app = FastAPI(title="Thankyou For Calling — Sales-Call Intelligence API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("FRONTEND_ORIGINS", "http://localhost:5111").split(","), allow_credentials=False, allow_methods=["*"], allow_headers=["*"])


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    role: Role
    team_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class DisputeRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=2000)


class ResolveRequest(BaseModel):
    resolution_note: str = Field(default="Reviewed and resolved by Team Leader.", max_length=2000)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: Role
    team_id: Optional[int]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def token_for(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user.id), "role": user.role.value, "exp": now + timedelta(minutes=int(os.getenv("JWT_EXPIRE_MINUTES", "480"))), "iat": now}
    return jwt.encode(payload, os.getenv("JWT_SECRET", "unsafe-development-secret-change-me"), algorithm="HS256")


def current_user(authorization: Annotated[Optional[str], __import__("fastapi").Header()] = None, session: Session = Depends(get_session)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        payload = jwt.decode(authorization[7:], os.getenv("JWT_SECRET", "unsafe-development-secret-change-me"), algorithms=["HS256"])
        user = session.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, ValueError, TypeError):
        user = None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return user


def require(*roles: Role):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your role cannot access this resource")
        return user
    return dependency


def call_out(call: CallRecording, advisor: Optional[User] = None) -> dict:
    return {"id": call.id, "filename": call.filename, "advisor_id": call.advisor_id, "advisor_name": advisor.full_name if advisor else None, "status": call.status, "score": call.score, "tag": call.tag, "disputed": call.disputed, "dispute_reason": call.dispute_reason, "created_at": call.created_at.isoformat(), "completed_at": call.completed_at.isoformat() if call.completed_at else None}


def call_or_404(session: Session, call_id: int) -> CallRecording:
    call = session.get(CallRecording, call_id)
    if not call:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Call not found")
    return call


def can_view_call(user: User, call: CallRecording, session: Session) -> bool:
    if user.role in (Role.ADMIN, Role.DIRECTOR):
        return True
    if user.role == Role.ADVISOR:
        return call.advisor_id == user.id
    advisor = session.get(User, call.advisor_id)
    return bool(advisor and advisor.team_id == user.id)


@app.on_event("startup")
def startup() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    with next(get_session()) as session:
        if not session.exec(select(User)).first() and os.getenv("BOOTSTRAP_ADMIN_EMAIL"):
            session.add(User(email=os.environ["BOOTSTRAP_ADMIN_EMAIL"].lower(), password_hash=hash_password(os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "ChangeMeImmediately!")), full_name=os.getenv("BOOTSTRAP_ADMIN_NAME", "TFC Admin"), role=Role.ADMIN))
            session.commit()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mock_pipeline": os.getenv("MOCK_PIPELINE", "false").lower() == "true"}


@app.post("/auth/login")
def login(body: LoginRequest, session: Session = Depends(get_session)) -> dict:
    user = session.exec(select(User).where(User.email == body.email.lower())).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return {"access_token": token_for(user), "token_type": "bearer", "user": UserOut.model_validate(user).model_dump(mode="json")}


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> User:
    return user


@app.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, _: User = Depends(require(Role.ADMIN)), session: Session = Depends(get_session)) -> User:
    if body.role == Role.ADVISOR and body.team_id is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Advisor accounts require a Team Leader ID")
    if body.team_id is not None:
        leader = session.get(User, body.team_id)
        if not leader or leader.role != Role.TEAM_LEADER:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "team_id must reference a Team Leader")
    if session.exec(select(User).where(User.email == body.email.lower())).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already exists")
    user = User(email=body.email.lower(), password_hash=hash_password(body.password), full_name=body.full_name.strip(), role=body.role, team_id=body.team_id)
    session.add(user); session.commit(); session.refresh(user)
    return user


@app.get("/users/advisors", response_model=list[UserOut])
def advisors(_: User = Depends(require(Role.ADMIN)), session: Session = Depends(get_session)) -> list[User]:
    return session.exec(select(User).where(User.role == Role.ADVISOR).order_by(User.full_name)).all()


@app.get("/users/team-leaders", response_model=list[UserOut])
def team_leaders(_: User = Depends(require(Role.ADMIN)), session: Session = Depends(get_session)) -> list[User]:
    return session.exec(select(User).where(User.role == Role.TEAM_LEADER).order_by(User.full_name)).all()


@app.get("/teams/my-advisors", response_model=list[UserOut])
def my_team_advisors(user: User = Depends(require(Role.TEAM_LEADER)), session: Session = Depends(get_session)) -> list[User]:
    """Return only the signed-in leader's pod; never expose other team rosters."""
    return session.exec(select(User).where(User.role == Role.ADVISOR, User.team_id == user.id).order_by(User.full_name)).all()


async def run_auto_evaluation(call_id: int):
    session = next(get_session())
    try:
        call = session.get(CallRecording, call_id)
        if not call or call.status == "Completed":
            return
        
        result = await asyncio.wait_for(
            evaluation_graph.ainvoke({"call_id": call.id, "filepath": call.filepath}),
            timeout=int(os.getenv("PIPELINE_TIMEOUT_SECONDS", "600"))
        )
        evaluation = normalized_evaluation(result["verified_evaluation"])
        call.status = "Completed"
        call.score = evaluation["score"]
        call.tag = evaluation["tag"]
        call.transcript_text = result["full_transcript"]
        call.completed_at = datetime.utcnow()
        
        # Clean up any existing records
        for row in session.exec(select(CallInsight).where(CallInsight.call_id == call.id)).all():
            session.delete(row)
        for row in session.exec(select(EmotionTrajectory).where(EmotionTrajectory.call_id == call.id)).all():
            session.delete(row)
            
        # Add new insights
        session.add_all([CallInsight(call_id=call.id, type=InsightType.EXCELLED, detail=detail) for detail in evaluation["excelled"]] + [CallInsight(call_id=call.id, type=InsightType.IMPROVEMENT, detail=detail) for detail in evaluation["improvements"]])
        session.add_all([EmotionTrajectory(call_id=call.id, timestamp=e["timestamp"], speaker=e["speaker"], emotion_label=e["emotion_label"], confidence=e["confidence"]) for e in result["emotions"]])
        session.add(call)
        session.commit()
        print(f"Auto-evaluation succeeded for call {call_id}")
    except Exception as exc:
        print(f"Auto-evaluation failed for call {call_id}: {exc}")
        try:
            session.rollback()
        except Exception:
            pass


@app.post("/calls/upload", status_code=status.HTTP_201_CREATED)
async def upload_calls(advisor_id: Annotated[int, Form()], files: list[UploadFile] = File(...), background_tasks: BackgroundTasks = None, _: User = Depends(require(Role.ADMIN)), session: Session = Depends(get_session)) -> dict:
    advisor = session.get(User, advisor_id)
    if not advisor or advisor.role != Role.ADVISOR:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "advisor_id must reference an Advisor")
    staged = []
    for upload in files:
        original = Path(upload.filename or "recording").name
        if Path(original).suffix.lower() not in ALLOWED_SUFFIXES:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only .mp3, .wav, and .m4a files are accepted")
        stored = f"{secrets.token_hex(8)}_{original}"
        destination = UPLOAD_DIR / stored
        with destination.open("wb") as stream:
            while chunk := await upload.read(1024 * 1024):
                stream.write(chunk)
        call = CallRecording(filename=original, filepath=str(destination), advisor_id=advisor.id)
        session.add(call); staged.append(call)
    session.commit()
    for call in staged: 
        session.refresh(call)
        if background_tasks:
            background_tasks.add_task(run_auto_evaluation, call.id)
    return {"calls": [call_out(call, advisor) for call in staged]}


@app.get("/calls")
def list_calls(user: User = Depends(current_user), session: Session = Depends(get_session)) -> dict:
    calls = session.exec(select(CallRecording).order_by(CallRecording.created_at.desc())).all()
    visible = [call for call in calls if can_view_call(user, call, session)]
    return {"calls": [call_out(call, session.get(User, call.advisor_id)) for call in visible]}


@app.get("/calls/{call_id}/insights")
def insights(call_id: int, user: User = Depends(current_user), session: Session = Depends(get_session)) -> dict:
    call = call_or_404(session, call_id)
    if not can_view_call(user, call, session): raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your call")
    rows = session.exec(select(CallInsight).where(CallInsight.call_id == call_id)).all()
    emotions = session.exec(select(EmotionTrajectory).where(EmotionTrajectory.call_id == call_id)).all()
    return {
        "call": call_out(call, session.get(User, call.advisor_id)),
        "excelled": [r.detail for r in rows if r.type == InsightType.EXCELLED],
        "improvements": [r.detail for r in rows if r.type == InsightType.IMPROVEMENT],
        "emotions": [{"timestamp": e.timestamp, "speaker": e.speaker, "label": e.emotion_label, "confidence": e.confidence} for e in emotions],
        "transcript_text": call.transcript_text
    }


@app.post("/calls/{call_id}/evaluate")
async def evaluate_call(call_id: int, user: User = Depends(require(Role.TEAM_LEADER)), session: Session = Depends(get_session)) -> dict:
    call = call_or_404(session, call_id)
    if not can_view_call(user, call, session): raise HTTPException(status.HTTP_403_FORBIDDEN, "This call is not in your pod")
    if call.status == "Completed": raise HTTPException(status.HTTP_409_CONFLICT, "Call has already been evaluated")
    try:
        result = await asyncio.wait_for(evaluation_graph.ainvoke({"call_id": call.id, "filepath": call.filepath}), timeout=int(os.getenv("PIPELINE_TIMEOUT_SECONDS", "600")))
        evaluation = normalized_evaluation(result["verified_evaluation"])
        call.status, call.score, call.tag = "Completed", evaluation["score"], evaluation["tag"]
        call.transcript_text, call.completed_at = result["full_transcript"], datetime.utcnow()
        for row in session.exec(select(CallInsight).where(CallInsight.call_id == call.id)).all(): session.delete(row)
        for row in session.exec(select(EmotionTrajectory).where(EmotionTrajectory.call_id == call.id)).all(): session.delete(row)
        session.add_all([CallInsight(call_id=call.id, type=InsightType.EXCELLED, detail=detail) for detail in evaluation["excelled"]] + [CallInsight(call_id=call.id, type=InsightType.IMPROVEMENT, detail=detail) for detail in evaluation["improvements"]])
        session.add_all([EmotionTrajectory(call_id=call.id, timestamp=e["timestamp"], speaker=e["speaker"], emotion_label=e["emotion_label"], confidence=e["confidence"]) for e in result["emotions"]])
        session.add(call); session.commit(); session.refresh(call)
        return {"call": call_out(call, session.get(User, call.advisor_id)), "evaluation": evaluation}
    except Exception as exc:
        session.rollback()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Evaluation failed; call remains Pending: {str(exc)}")


@app.get("/calls/{call_id}/transcript")
def transcript(call_id: int, user: User = Depends(require(Role.ADVISOR)), session: Session = Depends(get_session)):
    call = call_or_404(session, call_id)
    if call.advisor_id != user.id: raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your call")
    path = Path(call.filepath).with_suffix(".txt")
    if not path.exists(): raise HTTPException(status.HTTP_404_NOT_FOUND, "Transcript not yet available")
    return FileResponse(path, media_type="text/plain", filename=f"{Path(call.filename).stem}.txt")


@app.post("/calls/{call_id}/dispute")
def dispute(call_id: int, body: DisputeRequest, user: User = Depends(require(Role.ADVISOR)), session: Session = Depends(get_session)) -> dict:
    call = call_or_404(session, call_id)
    if call.advisor_id != user.id: raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your call")
    if call.status != "Completed": raise HTTPException(status.HTTP_409_CONFLICT, "Only completed calls may be disputed")
    call.disputed = True
    call.dispute_reason = body.reason.strip()
    session.add(call); session.commit()
    return {"message": "Dispute submitted successfully. Your Team Leader will review it."}


@app.post("/calls/{call_id}/resolve-dispute")
def resolve_dispute(call_id: int, body: ResolveRequest, user: User = Depends(require(Role.TEAM_LEADER)), session: Session = Depends(get_session)) -> dict:
    call = call_or_404(session, call_id)
    if not can_view_call(user, call, session): raise HTTPException(status.HTTP_403_FORBIDDEN, "This call is not in your pod")
    if not call.disputed: raise HTTPException(status.HTTP_409_CONFLICT, "This call has no active dispute")
    call.disputed = False
    call.dispute_reason = f"[RESOLVED by {user.full_name}] {body.resolution_note.strip()}"
    session.add(call); session.commit()
    return {"message": "Dispute resolved successfully."}


@app.get("/analytics/director")
def director_analytics(_: User = Depends(require(Role.DIRECTOR)), session: Session = Depends(get_session)) -> dict:
    calls = session.exec(select(CallRecording)).all()
    completed = [c for c in calls if c.status == "Completed" and c.score is not None]
    distribution = {tag: sum(1 for c in completed if c.tag == tag) for tag in ("Good", "Okay", "Bad")}
    leaders = session.exec(select(User).where(User.role == Role.TEAM_LEADER)).all()
    leader_map = {l.id: l.full_name for l in leaders}

    # Per-team leaderboard
    leaderboard = []
    for leader in leaders:
        pod_ids = {a.id for a in session.exec(select(User).where(User.role == Role.ADVISOR, User.team_id == leader.id)).all()}
        pod_calls = [c.score for c in completed if c.advisor_id in pod_ids]
        leaderboard.append({
            "team_leader": leader.full_name,
            "advisor_count": len(pod_ids),
            "evaluated_calls": len(pod_calls),
            "average_score": round(sum(pod_calls) / len(pod_calls), 2) if pod_calls else None
        })

    # Per-advisor scores
    all_advisors = session.exec(select(User).where(User.role == Role.ADVISOR)).all()
    advisor_scores = []
    for advisor in all_advisors:
        advisor_calls = [c.score for c in completed if c.advisor_id == advisor.id]
        if advisor_calls:
            advisor_scores.append({
                "advisor_name": advisor.full_name,
                "team_leader": leader_map.get(advisor.team_id, "Unknown"),
                "call_count": len(advisor_calls),
                "average_score": round(sum(advisor_calls) / len(advisor_calls), 2)
            })
    advisor_scores.sort(key=lambda x: x["average_score"], reverse=True)

    return {
        "metrics": {
            "total_evaluated_volume": len(completed),
            "global_average_score": round(sum(c.score for c in completed) / len(completed), 2) if completed else 0,
            "active_pending_disputes": sum(1 for c in calls if c.disputed)
        },
        "distribution": distribution,
        "leaderboard": sorted(leaderboard, key=lambda row: row["average_score"] or 0, reverse=True),
        "advisor_scores": advisor_scores,
        "top_advisor": advisor_scores[0] if advisor_scores else None,
        "bottom_advisor": advisor_scores[-1] if advisor_scores else None,
    }

