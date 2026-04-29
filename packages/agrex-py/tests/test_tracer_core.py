from collections.abc import Iterator

import pytest
from pydantic import ValidationError

from agrex import create_tracer
from agrex._serialize import serialize_error
from agrex.types import AgrexEdge, AgrexEvent, AgrexNode


def test_node_serializes_parent_id_as_camel_case():
    node = AgrexNode(id="a", type="agent", label="Researcher", parent_id="root")
    dumped = node.model_dump(mode="json", exclude_none=True, by_alias=True)
    assert dumped == {"id": "a", "type": "agent", "label": "Researcher", "parentId": "root"}


def test_node_omits_unset_fields():
    node = AgrexNode(id="a", type="agent", label="Researcher")
    dumped = node.model_dump(mode="json", exclude_none=True, by_alias=True)
    assert dumped == {"id": "a", "type": "agent", "label": "Researcher"}


def test_node_accepts_camel_case_input():
    node = AgrexNode.model_validate({"id": "a", "type": "agent", "label": "L", "parentId": "p"})
    assert node.parent_id == "p"


def test_edge_round_trip():
    edge = AgrexEdge(id="e1", source="a", target="b", type="spawn")
    assert edge.model_dump(mode="json", exclude_none=True) == {
        "id": "e1",
        "source": "a",
        "target": "b",
        "type": "spawn",
    }


def test_event_preserves_unknown_fields():
    event = AgrexEvent.model_validate({"type": "custom", "ts": 100, "payload": {"k": "v"}})
    dumped = event.model_dump(mode="json")
    assert dumped == {"type": "custom", "ts": 100, "payload": {"k": "v"}}


def test_event_requires_type_and_ts():
    with pytest.raises(ValidationError):
        AgrexEvent.model_validate({"ts": 100})
    with pytest.raises(ValidationError):
        AgrexEvent.model_validate({"type": "x"})


def test_event_rejects_bool_ts():
    """bool ⊂ int in Python — guard against TS-incompatible booleans for ts."""
    with pytest.raises(ValidationError):
        AgrexEvent.model_validate({"type": "x", "ts": True})
    with pytest.raises(ValidationError):
        AgrexEvent.model_validate({"type": "x", "ts": False})


def test_serialize_error_for_exception():
    exc = ValueError("boom")
    result = serialize_error(exc)
    assert result["name"] == "ValueError"
    assert result["message"] == "boom"
    # When an exception is created without being raised, __traceback__ is None.
    # The traceback formatter still produces the "ValueError: boom" header line.
    assert "ValueError" in result["stack"]


def test_serialize_error_for_non_exception():
    assert serialize_error("just a string") == "just a string"
    assert serialize_error({"code": 42}) == {"code": 42}


def test_serialize_error_for_none():
    assert serialize_error(None) is None


def test_serialize_error_includes_traceback_for_raised_exception():
    try:
        raise RuntimeError("realsies")
    except RuntimeError as e:
        result = serialize_error(e)
    assert result["name"] == "RuntimeError"
    assert "Traceback" in result["stack"]


def step_clock(start: int = 1_000_000) -> Iterator[int]:
    t = start
    while True:
        yield t
        t += 1


def test_agent_emits_node_add_with_injected_ts():
    clock = step_clock(100)
    tracer = create_tracer(clock=lambda: next(clock))
    tracer.agent("a", "Researcher")
    tracer.tool("b", "search", parent="a", args={"q": "foo"})

    events = tracer.events()
    assert len(events) == 2
    assert events[0]["type"] == "node_add"
    assert events[0]["ts"] == 100
    assert events[0]["node"] == {
        "id": "a",
        "type": "agent",
        "label": "Researcher",
        "status": "running",
    }
    assert events[1]["ts"] == 101
    assert events[1]["node"] == {
        "id": "b",
        "type": "tool",
        "label": "search",
        "parentId": "a",
        "status": "running",
        "metadata": {"args": {"q": "foo"}},
    }


def test_tool_args_merge_with_explicit_metadata():
    clock = step_clock()
    tracer = create_tracer(clock=lambda: next(clock))
    tracer.tool("b", "search", args={"q": "foo"}, metadata={"tokens": 42})
    node = tracer.events()[0]["node"]
    assert node["metadata"] == {"tokens": 42, "args": {"q": "foo"}}


def test_sub_agent_and_file_node_types():
    clock = step_clock()
    tracer = create_tracer(clock=lambda: next(clock))
    tracer.sub_agent("s", "Sub")
    tracer.file("f", "data.csv")
    types = [e["node"]["type"] for e in tracer.events()]
    assert types == ["sub_agent", "file"]


def test_node_escape_hatch_emits_arbitrary_shape():
    clock = step_clock()
    tracer = create_tracer(clock=lambda: next(clock))
    tracer.node({"id": "x", "type": "custom", "label": "X", "status": "done"})
    assert tracer.events()[0]["node"]["type"] == "custom"


def test_reads_writes_pass_through():
    clock = step_clock()
    tracer = create_tracer(clock=lambda: next(clock))
    tracer.tool("t", "write_file", reads=["f1"], writes=["f2"])
    node = tracer.events()[0]["node"]
    assert node["reads"] == ["f1"]
    assert node["writes"] == ["f2"]


def test_parent_does_not_synthesize_spawn_edge():
    clock = step_clock()
    tracer = create_tracer(clock=lambda: next(clock))
    tracer.agent("a", "A")
    tracer.tool("b", "B", parent="a")
    events = tracer.events()
    assert all(e["type"] != "edge_add" for e in events)
    assert events[1]["node"]["parentId"] == "a"
