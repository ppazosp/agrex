import pytest
from pydantic import ValidationError

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
