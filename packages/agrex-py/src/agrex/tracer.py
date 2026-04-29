"""Imperative trace recorder. Mirrors @ppazosp/agrex/trace's createTracer.

Public surface:
- create_tracer(*, clock=None, out=None, buffer=True, on_event=None) -> Tracer
- Tracer.agent / sub_agent / tool / file / node
- Tracer.update / done / error / remove
- Tracer.edge / stage / marker / clear
- Tracer.span (context manager — sync `with` and async `async with`)
- Tracer.events / to_json / to_jsonl / flush / close

Concurrent emit() from multiple threads is safe — buffer append + sink
write are wrapped in a `threading.Lock`. The `on_event` callback runs
outside the lock so user code never serializes across all emits.
"""

from __future__ import annotations

import json
import threading
import time
from collections.abc import Callable
from typing import Any, Protocol

from .types import AgrexNode, NodeStatus

ClockFn = Callable[[], int | float]


def _default_clock() -> int:
    return int(time.time() * 1000)


class TracerWritable(Protocol):
    """Duck-typed sink. Anything with a `.write(str)` method works.
    Optional `close()` and `flush()` are honored when present."""

    def write(self, chunk: str) -> Any: ...


class _Span:
    """Context manager returned by `Tracer.span(...)`. Supports both
    `with` and `async with` so the same call site works in sync and
    async code paths. Emits `node_add` on enter and `done`/`error`
    on exit (re-raising the exception in the error case)."""

    def __init__(
        self,
        tracer: Tracer,
        *,
        id: str,
        label: str,
        type: str = "tool",
        parent: str | None = None,
        reads: list[str] | None = None,
        writes: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self._tracer = tracer
        self._id = id
        self._label = label
        self._type = type
        self._parent = parent
        self._reads = reads
        self._writes = writes
        self._metadata = metadata

    def _enter(self) -> _Span:
        node = self._tracer._build_node(
            self._id,
            self._label,
            self._type,
            parent=self._parent,
            reads=self._reads,
            writes=self._writes,
            status="running",
            metadata=self._metadata,
        )
        self._tracer._node_add(node)
        return self

    def _exit(self, exc: BaseException | None) -> None:
        if exc is None:
            self._tracer.done(self._id)
        else:
            self._tracer.error(self._id, error=exc)

    def __enter__(self) -> _Span:
        return self._enter()

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: object,
    ) -> None:
        self._exit(exc)
        # Returning None propagates the exception, which is what we want.

    async def __aenter__(self) -> _Span:
        return self._enter()

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: object,
    ) -> None:
        self._exit(exc)


class Tracer:
    def __init__(
        self,
        *,
        clock: ClockFn | None = None,
        out: TracerWritable | None = None,
        buffer: bool = True,
        on_event: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self._clock: ClockFn = clock or _default_clock
        self._out = out
        self._buffer = buffer
        self._on_event = on_event
        self._log: list[dict[str, Any]] = []
        self._closed = False
        self._lock = threading.Lock()

    def _require_buffer(self, method: str) -> None:
        if not self._buffer:
            raise RuntimeError(f"{method}() requires buffer mode. Omit `buffer=False` to enable it.")

    def _emit(self, event: dict[str, Any]) -> None:
        if self._closed:
            raise RuntimeError("Tracer is closed")
        with self._lock:
            if self._buffer:
                self._log.append(event)
            if self._out is not None:
                self._out.write(json.dumps(event) + "\n")
        if self._on_event is not None:
            self._on_event(event)

    def _build_node(
        self,
        id: str,
        label: str,
        type: str,
        *,
        parent: str | None,
        reads: list[str] | None,
        writes: list[str] | None,
        status: NodeStatus,
        metadata: dict[str, Any] | None,
        extra_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        merged = {**(metadata or {}), **(extra_metadata or {})} or None
        node = AgrexNode(
            id=id,
            type=type,
            label=label,
            parent_id=parent,
            status=status,
            metadata=merged,
            reads=reads or None,
            writes=writes or None,
        )
        return node.model_dump(mode="json", exclude_none=True, by_alias=True)

    def _node_add(self, node: dict[str, Any]) -> None:
        self._emit({"type": "node_add", "ts": self._clock(), "node": node})

    def agent(
        self,
        id: str,
        label: str,
        *,
        parent: str | None = None,
        reads: list[str] | None = None,
        writes: list[str] | None = None,
        status: NodeStatus = "running",
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self._node_add(
            self._build_node(
                id,
                label,
                "agent",
                parent=parent,
                reads=reads,
                writes=writes,
                status=status,
                metadata=metadata,
            )
        )

    def sub_agent(
        self,
        id: str,
        label: str,
        *,
        parent: str | None = None,
        reads: list[str] | None = None,
        writes: list[str] | None = None,
        status: NodeStatus = "running",
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self._node_add(
            self._build_node(
                id,
                label,
                "sub_agent",
                parent=parent,
                reads=reads,
                writes=writes,
                status=status,
                metadata=metadata,
            )
        )

    def tool(
        self,
        id: str,
        label: str,
        *,
        parent: str | None = None,
        reads: list[str] | None = None,
        writes: list[str] | None = None,
        status: NodeStatus = "running",
        metadata: dict[str, Any] | None = None,
        args: Any = None,
    ) -> None:
        extra = {"args": args} if args is not None else None
        self._node_add(
            self._build_node(
                id,
                label,
                "tool",
                parent=parent,
                reads=reads,
                writes=writes,
                status=status,
                metadata=metadata,
                extra_metadata=extra,
            )
        )

    def file(
        self,
        id: str,
        label: str,
        *,
        parent: str | None = None,
        reads: list[str] | None = None,
        writes: list[str] | None = None,
        status: NodeStatus = "running",
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self._node_add(
            self._build_node(
                id,
                label,
                "file",
                parent=parent,
                reads=reads,
                writes=writes,
                status=status,
                metadata=metadata,
            )
        )

    def node(self, partial: dict[str, Any]) -> None:
        # Escape hatch: trust the caller's shape, no Pydantic validation.
        self._emit({"type": "node_add", "ts": self._clock(), "node": dict(partial)})

    def update(
        self,
        id: str,
        *,
        status: NodeStatus | None = None,
        label: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        ev: dict[str, Any] = {"type": "node_update", "ts": self._clock(), "id": id}
        if status is not None:
            ev["status"] = status
        if label is not None:
            ev["label"] = label
        if metadata is not None:
            ev["metadata"] = metadata
        self._emit(ev)

    def done(
        self,
        id: str,
        *,
        output: Any = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        merged: dict[str, Any] = {**(metadata or {})}
        if output is not None:
            merged["output"] = output
        ev: dict[str, Any] = {
            "type": "node_update",
            "ts": self._clock(),
            "id": id,
            "status": "done",
        }
        if merged:
            ev["metadata"] = merged
        self._emit(ev)

    def error(
        self,
        id: str,
        *,
        error: Any = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        from ._serialize import serialize_error

        merged: dict[str, Any] = {**(metadata or {})}
        if error is not None:
            merged["error"] = serialize_error(error)
        ev: dict[str, Any] = {
            "type": "node_update",
            "ts": self._clock(),
            "id": id,
            "status": "error",
        }
        if merged:
            ev["metadata"] = merged
        self._emit(ev)

    def remove(self, id: str) -> None:
        self._emit({"type": "node_remove", "ts": self._clock(), "id": id})

    def edge(
        self,
        *,
        id: str,
        source: str,
        target: str,
        type: str | None = None,
        label: str | None = None,
    ) -> None:
        from .types import AgrexEdge

        edge = AgrexEdge(id=id, source=source, target=target, type=type, label=label)
        self._emit(
            {
                "type": "edge_add",
                "ts": self._clock(),
                "edge": edge.model_dump(mode="json", exclude_none=True, by_alias=True),
            }
        )

    def stage(self, label: str, *, color: str | None = None) -> None:
        ev: dict[str, Any] = {"type": "stage", "ts": self._clock(), "label": label}
        if color is not None:
            ev["color"] = color
        self._emit(ev)

    def marker(self, kind: str, *, label: str | None = None, color: str | None = None) -> None:
        ev: dict[str, Any] = {"type": "marker", "ts": self._clock(), "kind": kind}
        if label is not None:
            ev["label"] = label
        if color is not None:
            ev["color"] = color
        self._emit(ev)

    def clear(self) -> None:
        self._emit({"type": "clear", "ts": self._clock()})

    def span(
        self,
        *,
        id: str,
        label: str,
        type: str = "tool",
        parent: str | None = None,
        reads: list[str] | None = None,
        writes: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> _Span:
        return _Span(
            self,
            id=id,
            label=label,
            type=type,
            parent=parent,
            reads=reads,
            writes=writes,
            metadata=metadata,
        )

    def events(self) -> list[dict[str, Any]]:
        self._require_buffer("events")
        return list(self._log)

    def to_json(self) -> dict[str, Any]:
        self._require_buffer("to_json")
        return {"events": list(self._log)}

    def to_jsonl(self) -> str:
        self._require_buffer("to_jsonl")
        if not self._log:
            return ""
        return "\n".join(json.dumps(e) for e in self._log) + "\n"

    def flush(self) -> None:
        flush = getattr(self._out, "flush", None)
        if callable(flush):
            flush()

    def close(self) -> None:
        self._closed = True
        close = getattr(self._out, "close", None)
        if callable(close):
            close()


def create_tracer(
    *,
    clock: ClockFn | None = None,
    out: TracerWritable | None = None,
    buffer: bool = True,
    on_event: Callable[[dict[str, Any]], None] | None = None,
) -> Tracer:
    return Tracer(clock=clock, out=out, buffer=buffer, on_event=on_event)
