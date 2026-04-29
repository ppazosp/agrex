"""Tests for snapshot_to_events. Mirrors the behavior of TS snapshotToEvents
at packages/agrex/src/trace/index.ts:36-94."""

from agrex import parse_trace, snapshot_to_events


def test_orders_nodes_by_started_at():
    nodes = [
        {"id": "b", "type": "agent", "label": "B", "metadata": {"startedAt": 200}},
        {"id": "a", "type": "agent", "label": "A", "metadata": {"startedAt": 100}},
    ]
    events = snapshot_to_events(nodes)
    ids = [e["node"]["id"] for e in events if e["type"] == "node_add"]
    assert ids == ["a", "b"]


def test_emits_transition_when_started_and_ended_present():
    nodes = [
        {
            "id": "a",
            "type": "agent",
            "label": "A",
            "status": "done",
            "metadata": {"startedAt": 100, "endedAt": 150},
        }
    ]
    events = snapshot_to_events(nodes)
    assert len(events) == 2
    assert events[0]["type"] == "node_add"
    assert events[0]["ts"] == 100
    assert events[0]["node"]["status"] == "running"
    assert events[1] == {"type": "node_update", "ts": 150, "id": "a", "status": "done"}


def test_skips_transition_when_status_missing_or_running():
    """Without a final non-running status, no transition is emitted."""
    nodes_no_status = [
        {"id": "a", "type": "agent", "label": "A", "metadata": {"startedAt": 100, "endedAt": 200}},
    ]
    events = snapshot_to_events(nodes_no_status)
    assert len(events) == 1
    assert events[0]["type"] == "node_add"

    nodes_running = [
        {
            "id": "a",
            "type": "agent",
            "label": "A",
            "status": "running",
            "metadata": {"startedAt": 100, "endedAt": 200},
        }
    ]
    events = snapshot_to_events(nodes_running)
    assert len(events) == 1


def test_skips_transition_when_ended_at_missing():
    """startedAt without endedAt — no transition."""
    nodes = [
        {"id": "a", "type": "agent", "label": "A", "status": "done", "metadata": {"startedAt": 100}},
    ]
    events = snapshot_to_events(nodes)
    assert len(events) == 1
    assert events[0]["type"] == "node_add"
    # Without a transition, status survives intact (NOT rewritten to running).
    assert events[0]["node"]["status"] == "done"


def test_iso_string_started_at_parsed():
    nodes = [
        {"id": "a", "type": "agent", "label": "A", "metadata": {"startedAt": "2026-01-01T00:00:00Z"}},
    ]
    events = snapshot_to_events(nodes)
    assert events[0]["type"] == "node_add"
    assert isinstance(events[0]["ts"], (int, float))


def test_edges_land_at_max_endpoint_ts():
    nodes = [
        {"id": "a", "type": "agent", "label": "A", "metadata": {"startedAt": 100}},
        {"id": "b", "type": "tool", "label": "B", "metadata": {"startedAt": 300}},
    ]
    edges = [{"id": "e1", "source": "a", "target": "b"}]
    events = snapshot_to_events(nodes, edges)
    edge_event = next(e for e in events if e["type"] == "edge_add")
    assert edge_event["ts"] == 300


def test_untimestamped_nodes_keep_array_order_at_start():
    nodes = [
        {"id": "x", "type": "agent", "label": "X"},
        {"id": "y", "type": "agent", "label": "Y"},
        {"id": "z", "type": "agent", "label": "Z", "metadata": {"startedAt": 1000}},
    ]
    events = snapshot_to_events(nodes)
    ids = [e["node"]["id"] for e in events if e["type"] == "node_add"]
    assert ids == ["x", "y", "z"]


def test_empty_input_returns_empty():
    assert snapshot_to_events([]) == []
    assert snapshot_to_events([], []) == []


def test_parse_trace_snapshot_branch_now_works():
    """parse_trace's snapshot branch was stubbed in Task 11 — Task 12 unblocks it."""
    payload = {
        "nodes": [{"id": "a", "type": "agent", "label": "A", "metadata": {"startedAt": 100}}],
        "edges": [],
    }
    events = parse_trace(payload)
    assert len(events) == 1
    assert events[0]["type"] == "node_add"


def test_invalid_iso_string_treated_as_no_timestamp():
    """Garbage string → no ts → falls into the untimestamped sort bucket."""
    nodes = [
        {"id": "a", "type": "agent", "label": "A", "metadata": {"startedAt": "not-a-date"}},
        {"id": "b", "type": "agent", "label": "B", "metadata": {"startedAt": 1000}},
    ]
    events = snapshot_to_events(nodes)
    ids = [e["node"]["id"] for e in events if e["type"] == "node_add"]
    # 'a' has invalid ts → untimestamped → lands before 'b'.
    assert ids == ["a", "b"]
