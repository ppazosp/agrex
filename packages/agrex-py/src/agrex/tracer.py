"""Imperative trace recorder. Mirrors @ppazosp/agrex/trace's createTracer.

Public surface (this task):
- create_tracer(clock=None) -> Tracer
- Tracer.agent / sub_agent / tool / file / node
- Tracer.events()

Streaming sink, mutations, edge/stage/marker/clear, threading lock,
and span context manager land in later tasks.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

from .types import AgrexNode, NodeStatus

ClockFn = Callable[[], int | float]


def _default_clock() -> int:
    return int(time.time() * 1000)


class Tracer:
    def __init__(self, *, clock: ClockFn | None = None) -> None:
        self._clock: ClockFn = clock or _default_clock
        self._log: list[dict[str, Any]] = []

    def _emit(self, event: dict[str, Any]) -> None:
        self._log.append(event)

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

    def events(self) -> list[dict[str, Any]]:
        return list(self._log)


def create_tracer(*, clock: ClockFn | None = None) -> Tracer:
    return Tracer(clock=clock)
