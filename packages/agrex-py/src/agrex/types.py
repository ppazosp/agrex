"""Pydantic models for the agrex trace event format.

The trace format spec lives at docs/trace-format.md. JSON field names use
camelCase (matching the TypeScript source); Python attributes use snake_case
and are aliased on the wire.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

NodeStatus = Literal["idle", "running", "done", "error"]


def _to_camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part.title() for part in rest)


class _StrictModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class AgrexNode(_StrictModel):
    id: str
    type: str
    label: str
    parent_id: str | None = None
    status: NodeStatus | None = None
    metadata: dict[str, Any] | None = None
    reads: list[str] | None = None
    writes: list[str] | None = None


class AgrexEdge(_StrictModel):
    id: str
    source: str
    target: str
    type: str | None = None
    label: str | None = None


class AgrexEvent(BaseModel):
    """Permissive event base. Matches the TS `validateEvents` contract:
    every event must carry `type: str` and `ts: int | float`; arbitrary
    other fields are preserved verbatim so custom event types round-trip.
    """

    model_config = ConfigDict(extra="allow")

    type: str
    ts: int | float = Field(..., description="Milliseconds since epoch or any monotonic clock")

    @field_validator("ts", mode="before")
    @classmethod
    def _reject_bool_ts(cls, v: object) -> object:
        # bool is a subclass of int in Python, so without this guard
        # `True` / `False` round-trip through `int | float`. TS's
        # `validateEvents` rejects non-numbers (`typeof e.ts !== 'number'`),
        # so we mirror that to keep the format identical across languages.
        if isinstance(v, bool):
            raise ValueError("ts must be a number, not bool")
        return v
