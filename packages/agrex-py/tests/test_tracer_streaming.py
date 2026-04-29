"""Tests for streaming sink, buffer mode, close, flush, to_json, to_jsonl."""

import io
import json

import pytest

from agrex import create_tracer


def test_streaming_writes_jsonl_to_sink_as_events_emit():
    sink = io.StringIO()
    tracer = create_tracer(out=sink)
    tracer.agent("a", "A")
    tracer.done("a")
    captured = sink.getvalue()
    tracer.close()

    lines = captured.splitlines()
    assert len(lines) == 2
    assert json.loads(lines[0])["type"] == "node_add"
    assert json.loads(lines[1])["type"] == "node_update"
    assert json.loads(lines[1])["status"] == "done"


def test_buffer_default_on_streaming_and_buffer_coexist():
    sink = io.StringIO()
    tracer = create_tracer(out=sink)
    tracer.agent("a", "A")

    sink.seek(0)
    assert sink.read().count("\n") == 1
    assert len(tracer.events()) == 1


def test_buffer_false_skips_memory_retention():
    sink = io.StringIO()
    tracer = create_tracer(out=sink, buffer=False)
    tracer.agent("a", "A")

    sink.seek(0)
    assert sink.read().count("\n") == 1
    with pytest.raises(RuntimeError, match="buffer mode"):
        tracer.events()
    with pytest.raises(RuntimeError, match="buffer mode"):
        tracer.to_json()
    with pytest.raises(RuntimeError, match="buffer mode"):
        tracer.to_jsonl()


def test_flush_calls_sink_flush_when_present():
    flushed = {"count": 0}

    class Sink:
        def write(self, s: str) -> None:
            pass

        def flush(self) -> None:
            flushed["count"] += 1

    tracer = create_tracer(out=Sink())
    tracer.flush()
    assert flushed["count"] == 1


def test_flush_is_noop_when_sink_has_no_flush():
    class Sink:
        def write(self, s: str) -> None:
            pass

    tracer = create_tracer(out=Sink())
    # Should not raise.
    tracer.flush()


def test_close_prevents_further_emits():
    sink = io.StringIO()
    tracer = create_tracer(out=sink)
    tracer.close()
    with pytest.raises(RuntimeError, match="closed"):
        tracer.agent("a", "A")


def test_close_calls_sink_close_when_present():
    closed = {"count": 0}

    class Sink:
        def write(self, s: str) -> None:
            pass

        def close(self) -> None:
            closed["count"] += 1

    tracer = create_tracer(out=Sink())
    tracer.close()
    assert closed["count"] == 1


def test_close_is_safe_when_sink_has_no_close():
    class Sink:
        def write(self, s: str) -> None:
            pass

    tracer = create_tracer(out=Sink())
    # Should not raise.
    tracer.close()


def test_to_jsonl_returns_buffered_events_with_trailing_newline():
    tracer = create_tracer()
    tracer.agent("a", "A")
    tracer.done("a")
    out = tracer.to_jsonl()
    assert out.endswith("\n")
    assert len(out.splitlines()) == 2


def test_to_jsonl_returns_empty_string_when_no_events():
    tracer = create_tracer()
    assert tracer.to_jsonl() == ""


def test_to_json_returns_events_dict():
    tracer = create_tracer()
    tracer.agent("a", "A")
    payload = tracer.to_json()
    assert list(payload.keys()) == ["events"]
    assert len(payload["events"]) == 1


def test_on_event_invoked_for_every_emit():
    received: list[dict] = []
    tracer = create_tracer(on_event=received.append)
    tracer.agent("a", "A")
    tracer.done("a")
    assert len(received) == 2
    assert received[0]["type"] == "node_add"
    assert received[1]["type"] == "node_update"
    assert received[1]["status"] == "done"


def test_on_event_runs_alongside_buffer_and_sink():
    """All three side channels fire per emit."""
    received: list[dict] = []
    sink = io.StringIO()
    tracer = create_tracer(out=sink, on_event=received.append)
    tracer.agent("a", "A")

    # Buffer captured it.
    assert len(tracer.events()) == 1
    # Sink captured it.
    sink.seek(0)
    assert sink.read().count("\n") == 1
    # on_event captured it.
    assert len(received) == 1


def test_on_event_not_called_when_emit_raises_for_closed_tracer():
    """Closed tracer aborts before any side-channel writes."""
    received: list[dict] = []
    tracer = create_tracer(on_event=received.append)
    tracer.close()
    with pytest.raises(RuntimeError, match="closed"):
        tracer.agent("a", "A")
    assert received == []
