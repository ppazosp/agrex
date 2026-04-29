"""Permissive trace parser. Mirrors @ppazosp/agrex/trace's parseTrace.

Auto-detects three input shapes:
1. JSONL — string with multiple lines, each parsing as an object.
2. `{events: [...]}` — canonical event trace.
3. `{nodes: [...], edges?: [...]}` — snapshot, synthesized via
   snapshot_to_events.

Raises TraceParseError with a `format` tag identifying which branch
was attempted.
"""

from __future__ import annotations

import json
from typing import Any, Literal

TraceFormat = Literal["events", "snapshot", "jsonl", "unknown"]


class TraceParseError(Exception):
    """Raised when a trace input can't be parsed.

    `format` identifies which input branch the parser tried (for diagnostics)."""

    def __init__(self, message: str, format: TraceFormat) -> None:
        super().__init__(message)
        self.format: TraceFormat = format


def parse_trace(source: str | dict[str, Any]) -> list[dict[str, Any]]:
    """Parse a trace from a string or already-parsed dict.

    Returns a list of events. Raises TraceParseError on any failure."""

    if isinstance(source, str):
        trimmed = source.strip()
        if not trimmed:
            raise TraceParseError("Empty input", "unknown")
        if _looks_like_jsonl(trimmed):
            return _parse_jsonl_text(trimmed)
        try:
            parsed: Any = json.loads(trimmed)
        except json.JSONDecodeError as e:
            raise TraceParseError(f"Invalid JSON: {e.msg}", "unknown") from e
    else:
        parsed = source

    if not isinstance(parsed, dict):
        raise TraceParseError("Trace must be a JSON object or JSONL stream", "unknown")

    if isinstance(parsed.get("events"), list):
        return _validate_events(parsed["events"], "events")

    if isinstance(parsed.get("nodes"), list):
        from .snapshot import snapshot_to_events

        nodes = parsed["nodes"]
        edges = parsed.get("edges") if isinstance(parsed.get("edges"), list) else []
        return snapshot_to_events(nodes, edges)

    raise TraceParseError(
        "Trace must contain either an 'events' array or a 'nodes' array",
        "unknown",
    )


def _looks_like_jsonl(text: str) -> bool:
    lines = [line for line in text.split("\n") if line.strip()]
    if len(lines) < 2:
        return False
    return all(line.strip().startswith("{") for line in lines)


def _parse_jsonl_text(text: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for i, raw in enumerate(text.split("\n")):
        line = raw.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
        except json.JSONDecodeError as e:
            raise TraceParseError(f"Invalid JSON on line {i + 1}: {e.msg}", "jsonl") from e
        out.extend(_validate_events([ev], "jsonl"))
    return out


def _validate_events(raw: list[Any], fmt: TraceFormat) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for i, ev in enumerate(raw):
        if not isinstance(ev, dict):
            raise TraceParseError(f"Event at index {i} is not an object", fmt)
        if not isinstance(ev.get("type"), str):
            raise TraceParseError(f"Event at index {i} missing string 'type'", fmt)
        ts = ev.get("ts")
        # bool ⊂ int in Python — explicitly reject like the AgrexEvent validator does.
        if isinstance(ts, bool) or not isinstance(ts, (int, float)):
            raise TraceParseError(f"Event at index {i} missing numeric 'ts'", fmt)
        out.append(ev)
    return out
