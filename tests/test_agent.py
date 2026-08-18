import asyncio
import os

os.environ["MOCK_PIPELINE"] = "true"

from backend.agent.nodes import normalized_evaluation


def test_tag_thresholds():
    assert normalized_evaluation({"score": 8})["tag"] == "Good"
    assert normalized_evaluation({"score": 6})["tag"] == "Okay"
    assert normalized_evaluation({"score": 5.99})["tag"] == "Bad"


def test_evaluation_is_clamped_and_shaped():
    result = normalized_evaluation({"score": 15, "excelled": ["A"], "improvements": ["B"]})
    assert result == {"score": 10.0, "tag": "Good", "excelled": ["A"], "improvements": ["B"]}
