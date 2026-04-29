"""Tests for parse_trace + TraceParseError. snapshot_to_events is stubbed
in Task 11; full snapshot tests land in Task 12."""

import json
from pathlib import Path

import pytest

from agrex import create_tracer, parse_trace
from agrex.parse import TraceParseError


def test_parse_events_dict():
    payload = {
        "events": [
            {"type": "node_add", "ts": 1, "node": {"id": "a", "type": "agent", "label": "A"}},
            {"type": "node_update", "ts": 2, "id": "a", "status": "done"},
        ]
    }
    events = parse_trace(payload)
    assert len(events) == 2
    assert events[0]["type"] == "node_add"


def test_parse_events_string():
    payload = json.dumps(
        {"events": [{"type": "node_add", "ts": 1, "node": {"id": "a", "type": "agent", "label": "A"}}]}
    )
    events = parse_trace(payload)
    assert len(events) == 1


def test_parse_jsonl_string():
    jsonl = (
        json.dumps({"type": "node_add", "ts": 1, "node": {"id": "a", "type": "agent", "label": "A"}})
        + "\n"
        + json.dumps({"type": "node_update", "ts": 2, "id": "a", "status": "done"})
        + "\n"
    )
    events = parse_trace(jsonl)
    assert len(events) == 2
    assert events[1]["status"] == "done"


def test_parse_round_trip_with_tracer():
    tracer = create_tracer()
    tracer.agent("a", "Researcher")
    tracer.tool("b", "search", parent="a")
    tracer.done("b")
    tracer.done("a")
    parsed = parse_trace(tracer.to_jsonl())
    assert len(parsed) == 4
    assert [e["type"] for e in parsed] == [
        "node_add",
        "node_add",
        "node_update",
        "node_update",
    ]


def test_empty_input_raises():
    with pytest.raises(TraceParseError) as exc:
        parse_trace("")
    assert exc.value.format == "unknown"


def test_invalid_json_raises():
    with pytest.raises(TraceParseError, match="Invalid JSON"):
        parse_trace("{not json")


def test_missing_events_or_nodes_raises():
    with pytest.raises(TraceParseError, match="must contain"):
        parse_trace({"other": "field"})


def test_event_missing_type_raises():
    with pytest.raises(TraceParseError, match="missing string 'type'"):
        parse_trace({"events": [{"ts": 1}]})


def test_event_missing_ts_raises():
    with pytest.raises(TraceParseError, match="missing numeric 'ts'"):
        parse_trace({"events": [{"type": "x"}]})


def test_event_bool_ts_raises():
    """bool ⊂ int in Python — must be rejected to match TS behavior."""
    with pytest.raises(TraceParseError, match="missing numeric 'ts'"):
        parse_trace({"events": [{"type": "x", "ts": True}]})


def test_jsonl_invalid_line_reports_line_number():
    bad = (
        json.dumps({"type": "node_add", "ts": 1, "node": {"id": "a", "type": "agent", "label": "A"}})
        + "\n"
        + "{not json\n"
    )
    with pytest.raises(TraceParseError, match="line 2") as exc:
        parse_trace(bad)
    assert exc.value.format == "jsonl"


def test_non_dict_input_raises():
    with pytest.raises(TraceParseError, match="JSON object or JSONL stream"):
        parse_trace("[1, 2, 3]")


def test_jsonl_single_line_falls_through_to_json():
    """Single-line JSONL would be ambiguous — should parse as a JSON object instead.
    The looks_like_jsonl heuristic requires >=2 non-empty lines."""
    # A single JSON object string is not JSONL — it should hit the json.loads branch
    # and then fail because it has no 'events' or 'nodes' key.
    with pytest.raises(TraceParseError, match="must contain"):
        parse_trace(json.dumps({"type": "node_add", "ts": 1}))


def test_cross_language_fixture_round_trips():
    """The TS test suite writes a fixture; Python parses it. Catches schema drift."""
    fixture = Path(__file__).parent / "fixtures" / "cross_lang.jsonl"
    assert fixture.exists(), "Run TS suite first to regenerate the fixture"

    events = parse_trace(fixture.read_text())
    assert len(events) == 10

    # Spot-check structural correctness — event types in order.
    types = [e["type"] for e in events]
    assert types[0] == "node_add"
    assert types[-1] == "node_update"
    assert "stage" in types
    assert "marker" in types
    assert "edge_add" in types

    # Error event preserves serialized error.
    error_events = [e for e in events if e.get("status") == "error"]
    assert len(error_events) == 1
    err = error_events[0]["metadata"]["error"]
    assert err["name"] == "Error"
    assert err["message"] == "synthesis failed"

    # Tool args sugar folded correctly.
    tool_events = [e for e in events if e.get("node", {}).get("type") == "tool"]
    assert len(tool_events) == 1
    assert tool_events[0]["node"]["metadata"]["args"] == {"q": "foo"}

    # parentId aliasing landed correctly on cross-language wire format.
    sub_event = next(e for e in events if e.get("node", {}).get("id") == "sub")
    assert sub_event["node"]["parentId"] == "root"
