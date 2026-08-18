from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any

import httpx

from .state import EvaluationState

HF_INFERENCE = "https://router.huggingface.co/hf-inference/models"

GROQ_URL = "https://api.groq.com/openai/v1"


def mock_mode() -> bool:
    return os.getenv("MOCK_PIPELINE", "false").lower() == "true"


def stamp(seconds: float) -> str:
    seconds = int(seconds)
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


async def diarize(state: EvaluationState) -> dict[str, Any]:
    if mock_mode():
        return {"diarization_data": [{"speaker": "Speaker 0", "start": 0.0, "end": 8.0, "text": "Hello, thank you for calling. How can I help today?"}, {"speaker": "Speaker 1", "start": 8.0, "end": 16.0, "text": "I would like to understand the membership options."}]}
    
    whisper_key = os.getenv("GROQ_API_KEY_WHISPER")
    eval_key = os.getenv("GROQ_API_KEY_EVAL")
    if not whisper_key or not eval_key:
        raise RuntimeError("GROQ_API_KEY_WHISPER and GROQ_API_KEY_EVAL are required for diarization/transcription")
    
    audio_path = Path(state["filepath"])
    audio_data = audio_path.read_bytes()
    
    ext = audio_path.suffix.lower().replace(".", "")
    if ext == "m4a":
        mime = "audio/m4a"
    elif ext == "wav":
        mime = "audio/wav"
    elif ext == "mp3":
        mime = "audio/mp3"
    else:
        mime = "audio/mpeg"
        
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{GROQ_URL}/audio/transcriptions",
            headers={"Authorization": f"Bearer {whisper_key}"},
            data={"model": "whisper-large-v3", "response_format": "verbose_json"},
            files={"file": (f"audio.{ext}", audio_data, mime)}
        )
        response.raise_for_status()
        payload = response.json()
        
    segments = payload.get("segments", [])
    if not segments:
        raise RuntimeError("Whisper transcription returned no segments")
        
    minified_segments = [
        {"index": idx, "start": round(s["start"], 2), "end": round(s["end"], 2), "text": s["text"]}
        for idx, s in enumerate(segments)
    ]
    
    system_prompt = (
        "You are an expert conversational analyst. Below is a list of timestamped speech segments from a phone call between an Advisor (who welcomes the caller, explains plans, and handles objections) and a Customer (who asks about weight loss, plans, and raises concerns).\n\n"
        "Your task is to assign the correct speaker to each segment:\n"
        "- Identify the Advisor as 'Speaker 0'\n"
        "- Identify the Customer as 'Speaker 1'\n\n"
        "Analyze the flow of dialogue, context of greetings, and responses carefully.\n"
        "Return a JSON object containing exactly one key 'turns' with a list of dictionaries. "
        "Each dictionary must have: 'index' (matching the input index), and 'speaker' ('Speaker 0' or 'Speaker 1')."
    )
    
    async with httpx.AsyncClient(timeout=120) as client:
        llm_response = await client.post(
            f"{GROQ_URL}/chat/completions",
            headers={"Authorization": f"Bearer {eval_key}"},
            json={
                "model": "llama-3.3-70b-versatile",
                "temperature": 0.0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(minified_segments)}
                ]
            }
        )
        llm_response.raise_for_status()
        llm_payload = llm_response.json()
        
    llm_result = json.loads(llm_payload["choices"][0]["message"]["content"])
    speaker_map = {item["index"]: item["speaker"] for item in llm_result.get("turns", [])}
    
    turns = []
    for idx, s in enumerate(segments):
        speaker = speaker_map.get(idx, "Speaker 0" if idx % 2 == 0 else "Speaker 1")
        turns.append({
            "speaker": speaker,
            "start": float(s["start"]),
            "end": float(s["end"]),
            "text": s["text"].strip()
        })
        
    return {"diarization_data": turns}


async def transcribe(state: EvaluationState) -> dict[str, Any]:
    turns = state["diarization_data"]
    if mock_mode():
        samples = ["Hello, thank you for calling. How can I help today?", "I would like to understand the membership options."]
        return {"audio_chunks": turns, "turns_transcripts": [{**turn, "text": samples[i % len(samples)]} for i, turn in enumerate(turns)]}
    return {"audio_chunks": turns, "turns_transcripts": turns}


async def assemble_script(state: EvaluationState) -> dict[str, Any]:
    lines = [f"{turn['speaker']} ({stamp(turn['start'])}): {turn['text']}" for turn in state["turns_transcripts"]]
    transcript = "\n".join(lines)
    Path(state["filepath"]).with_suffix(".txt").write_text(transcript, encoding="utf-8")
    return {"full_transcript": transcript}


async def mine_emotions(state: EvaluationState) -> dict[str, Any]:
    if mock_mode():
        return {"emotions": [{"timestamp": f"[{stamp(turn['start'])} - {stamp(turn['end'])}]", "speaker": turn["speaker"], "emotion_label": "neutral", "confidence": 0.92} for turn in state["turns_transcripts"]]}
    token = os.getenv("HF_EMOTION_TOKEN")
    if not token:
        raise RuntimeError("HF_EMOTION_TOKEN is required for live emotion mining")
    async with httpx.AsyncClient(timeout=60) as client:
        async def one(turn: dict[str, Any]) -> dict[str, Any]:
            last_error: Exception | None = None
            for attempt in range(4):
                try:
                    response = await client.post(f"{HF_INFERENCE}/j-hartmann/emotion-english-distilroberta-base", headers={"Authorization": f"Bearer {token}"}, json={"inputs": turn["text"]})
                    if response.status_code in (503, 429):
                        await asyncio.sleep(2 ** attempt)
                        continue
                    response.raise_for_status()
                    options = response.json()[0]
                    best = max(options, key=lambda value: value["score"])
                    return {"timestamp": f"[{stamp(turn['start'])} - {stamp(turn['end'])}]", "speaker": turn["speaker"], "emotion_label": best["label"].lower(), "confidence": float(best["score"])}
                except Exception as exc:
                    last_error = exc
                    await asyncio.sleep(2 ** attempt)
            raise RuntimeError(f"Emotion service failed: {last_error}")
        emotions = await asyncio.gather(*(one(turn) for turn in state["turns_transcripts"]))
    return {"emotions": emotions}


async def groq_chat(key: str, system: str, user: str) -> dict[str, Any]:
    if not key:
        raise RuntimeError("Required Groq API key is missing")
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(f"{GROQ_URL}/chat/completions", headers={"Authorization": f"Bearer {key}"}, json={"model": "llama-3.3-70b-versatile", "temperature": 0.1, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        response.raise_for_status()
    return json.loads(response.json()["choices"][0]["message"]["content"])


async def evaluate(state: EvaluationState) -> dict[str, Any]:
    if mock_mode():
        return {"raw_evaluation": {"score": 8.2, "excelled": ["Opened with a clear, welcoming greeting."], "improvements": ["Confirm customer budget before recommending a plan."]}}
    system = (
        "You are an expert sales performance auditor. Evaluate the provided call transcript between the Advisor and the Customer.\n"
        "Your evaluation must be balanced and contain both positive points (what the advisor did well) and constructive areas of improvement.\n"
        "Return a JSON object with exactly these keys:\n"
        "- 'score': a float score from 1.0 to 10.0\n"
        "- 'excelled': a list of strings highlighting areas of excellence (at least 2-3 points)\n"
        "- 'improvements': a list of strings highlighting growth areas or improvement suggestions (at least 2-3 points)\n"
        "Ensure all points are factually supported by the transcript text."
    )
    return {"raw_evaluation": await groq_chat(os.getenv("GROQ_API_KEY_EVAL", ""), system, state["full_transcript"])}


async def verify(state: EvaluationState) -> dict[str, Any]:
    raw = state["raw_evaluation"]
    if mock_mode():
        return {"verified_evaluation": raw}
    system = (
        "Fact-audit this evaluation against the transcript. Remove unsupported quotes or claims.\n"
        "Ensure the final output contains both positive reviews ('excelled') and growth areas ('improvements').\n"
        "Return JSON with exactly 'score' (1-10), 'excelled' (string list), and 'improvements' (string list)."
    )
    user = json.dumps({"transcript": state["full_transcript"], "evaluation": raw})
    return {"verified_evaluation": await groq_chat(os.getenv("GROQ_API_KEY_VERIFY", ""), system, user)}


def normalized_evaluation(value: dict[str, Any]) -> dict[str, Any]:
    score = max(1.0, min(10.0, float(value.get("score", 1.0))))
    return {"score": score, "tag": "Good" if score >= 8 else "Okay" if score >= 6 else "Bad", "excelled": [str(x) for x in value.get("excelled", [])], "improvements": [str(x) for x in value.get("improvements", [])]}
