"""Snapshot → events synthesis. Lossy by design — intermediate updates
aren't recoverable from a snapshot, so each node emits at most one
`node_add` plus one final `node_update`."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, cast


def snapshot_to_events(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Synthesize an `AgrexEvent` stream from a `{nodes, edges}` snapshot.

    Nodes sort by `metadata.startedAt` (number ms or ISO 8601 string).
    Untimestamped nodes land first in array order. When both `startedAt`
    and `endedAt` are present and `status` is set and not `running`, a
    transition is emitted (`node_add` running → `node_update` final).
    Edges land at `max(source.startedAt, target.startedAt)` so they
    never appear before their endpoints.
    """
    edges = edges or []

    enriched: list[dict[str, Any]] = []
    for i, node in enumerate(nodes):
        meta = node.get("metadata") or {}
        enriched.append(
            {
                "node": node,
                "started_at": _read_ts(meta.get("startedAt")),
                "ended_at": _read_ts(meta.get("endedAt")),
                "original_index": i,
            }
        )

    started = [n for n in enriched if n["started_at"] is not None]
    base_ts: int | float = min(n["started_at"] for n in started) if started else int(time.time() * 1000)

    def sort_key(n: dict[str, Any]) -> int | float:
        if n["started_at"] is not None:
            return cast("int | float", n["started_at"])
        # untimestamped nodes land before the earliest timestamped, in array order
        return base_ts - (len(enriched) - cast(int, n["original_index"]))

    sorted_nodes = sorted(enriched, key=sort_key)

    events: list[dict[str, Any]] = []
    node_add_ts: dict[str, int | float] = {}

    for entry in sorted_nodes:
        node = entry["node"]
        started_at = entry["started_at"]
        ended_at = entry["ended_at"]
        add_ts: int | float = started_at if started_at is not None else base_ts
        status = node.get("status")
        can_transition = ended_at is not None and bool(status) and status != "running"

        emitted_node = dict(node)
        if can_transition:
            emitted_node["status"] = "running"
        events.append({"type": "node_add", "ts": add_ts, "node": emitted_node})
        node_add_ts[node["id"]] = add_ts

        if can_transition:
            events.append(
                {
                    "type": "node_update",
                    "ts": ended_at,
                    "id": node["id"],
                    "status": status,
                }
            )

    for edge in edges:
        src_ts = node_add_ts.get(edge.get("source", ""), base_ts)
        tgt_ts = node_add_ts.get(edge.get("target", ""), base_ts)
        events.append({"type": "edge_add", "ts": max(src_ts, tgt_ts), "edge": edge})

    events.sort(key=lambda e: e["ts"])
    return events


def _read_ts(value: Any) -> int | float | None:
    """Parse a timestamp from int, float, or ISO 8601 string. Returns None
    on bool / unrecognized strings / None / unsupported types."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        try:
            # Handle the common 'Z' suffix (ISO 8601 UTC).
            normalized = value.replace("Z", "+00:00") if value.endswith("Z") else value
            dt = datetime.fromisoformat(normalized)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return int(dt.timestamp() * 1000)
        except ValueError:
            return None
    return None
