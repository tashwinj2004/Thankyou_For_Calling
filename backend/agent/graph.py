from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from .nodes import assemble_script, diarize, evaluate, mine_emotions, transcribe, verify
from .state import EvaluationState


def build_graph():
    graph = StateGraph(EvaluationState)
    graph.add_node("diarization", diarize)
    graph.add_node("transcription", transcribe)
    graph.add_node("script_assembly", assemble_script)
    graph.add_node("emotion_mining", mine_emotions)
    graph.add_node("cognitive_evaluation", evaluate)
    graph.add_node("fact_audit", verify)
    graph.add_edge(START, "diarization")
    graph.add_edge("diarization", "transcription")
    graph.add_edge("transcription", "script_assembly")
    graph.add_edge("script_assembly", "emotion_mining")
    graph.add_edge("emotion_mining", "cognitive_evaluation")
    graph.add_edge("cognitive_evaluation", "fact_audit")
    graph.add_edge("fact_audit", END)
    return graph.compile()


evaluation_graph = build_graph()
