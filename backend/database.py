from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Generator, Optional

from sqlalchemy import Column, String, UniqueConstraint, text
from sqlmodel import Field, SQLModel, Session, create_engine


class Role(str, Enum):
    ADMIN = "Admin"
    TEAM_LEADER = "Team_Leader"
    ADVISOR = "Advisor"
    DIRECTOR = "Director"


class InsightType(str, Enum):
    EXCELLED = "excelled"
    IMPROVEMENT = "improvement"


class User(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("email", name="uq_user_email"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(sa_column=Column(String(320), index=True, nullable=False))
    password_hash: str
    full_name: str
    role: Role = Field(index=True)
    team_id: Optional[int] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CallRecording(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    filepath: str
    advisor_id: int = Field(foreign_key="user.id", index=True)
    status: str = Field(default="Pending", index=True)
    score: Optional[float] = Field(default=None)
    tag: Optional[str] = Field(default=None, index=True)
    transcript_text: Optional[str] = Field(default=None)
    disputed: bool = Field(default=False, index=True)
    dispute_reason: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    completed_at: Optional[datetime] = Field(default=None)


class CallInsight(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    call_id: int = Field(foreign_key="callrecording.id", index=True)
    type: InsightType
    detail: str


class EmotionTrajectory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    call_id: int = Field(foreign_key="callrecording.id", index=True)
    timestamp: str
    speaker: str
    emotion_label: str
    confidence: float


def build_engine():
    requested = os.getenv("DATABASE_URL", os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./thankyouforcalling.db"))
    connect_args = {"check_same_thread": False} if requested.startswith("sqlite") else {}
    try:
        engine = create_engine(requested, pool_pre_ping=True, connect_args=connect_args)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return engine
    except Exception:
        fallback = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./thankyouforcalling.db")
        db_file = fallback.removeprefix("sqlite:///")
        if db_file and db_file != ":memory:":
            Path(db_file).parent.mkdir(parents=True, exist_ok=True)
        return create_engine(fallback, connect_args={"check_same_thread": False})


engine = build_engine()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
