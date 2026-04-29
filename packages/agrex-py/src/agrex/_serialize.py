"""Mirrors the TS tracer's `serializeError` helper. Exception instances
become {name, message, stack} dicts; everything else passes through."""

from __future__ import annotations

import traceback
from typing import Any


def serialize_error(err: Any) -> Any:
    if isinstance(err, BaseException):
        return {
            "name": type(err).__name__,
            "message": str(err),
            "stack": "".join(traceback.format_exception(type(err), err, err.__traceback__)),
        }
    return err
