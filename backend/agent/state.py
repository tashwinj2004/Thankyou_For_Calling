from __future__ import annotations

from typing import Any, TypedDict


class EvaluationState(TypedDict, total=False):
    call_id: int
    filepath: str
    diarization_data: list[dict[str, Any]]
    audio_chunks: list[dict[str, Any]]
    turns_transcripts: list[dict[str, Any]]
    full_transcript: str
    emotions: list[dict[str, Any]]
    raw_evaluation: dict[str, Any]
    verified_evaluation: dict[str, Any]
