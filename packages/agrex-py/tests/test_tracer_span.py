"""Tests for Tracer.span — sync + async context manager."""

import pytest

from agrex import create_tracer


def test_sync_span_emits_node_add_then_done():
    tracer = create_tracer()
    with tracer.span(id="s1", label="search"):
        pass

    events = tracer.events()
    assert len(events) == 2
    assert events[0]["type"] == "node_add"
    assert events[0]["node"]["type"] == "tool"  # default
    assert events[0]["node"]["id"] == "s1"
    assert events[0]["node"]["status"] == "running"
    assert events[1]["type"] == "node_update"
    assert events[1]["id"] == "s1"
    assert events[1]["status"] == "done"


def test_sync_span_emits_error_on_exception_and_reraises():
    tracer = create_tracer()
    with pytest.raises(ValueError, match="boom"), tracer.span(id="s1", label="fail"):
        raise ValueError("boom")

    events = tracer.events()
    assert len(events) == 2
    assert events[1]["status"] == "error"
    err = events[1]["metadata"]["error"]
    assert err["name"] == "ValueError"
    assert err["message"] == "boom"


async def test_async_span_emits_node_add_then_done():
    tracer = create_tracer()
    async with tracer.span(id="s1", label="search"):
        pass
    events = tracer.events()
    assert events[0]["type"] == "node_add"
    assert events[1]["status"] == "done"


async def test_async_span_emits_error_on_exception():
    tracer = create_tracer()
    with pytest.raises(RuntimeError, match="boom"):
        async with tracer.span(id="s1", label="fail"):
            raise RuntimeError("boom")
    events = tracer.events()
    assert events[1]["status"] == "error"
    assert events[1]["metadata"]["error"]["name"] == "RuntimeError"


def test_span_honors_type_parent_reads_writes_metadata():
    tracer = create_tracer()
    with tracer.span(
        id="s",
        label="sub",
        type="sub_agent",
        parent="root",
        reads=["f1"],
        writes=["f2"],
        metadata={"k": "v"},
    ):
        pass
    node = tracer.events()[0]["node"]
    assert node["type"] == "sub_agent"
    assert node["parentId"] == "root"
    assert node["reads"] == ["f1"]
    assert node["writes"] == ["f2"]
    assert node["metadata"] == {"k": "v"}


def test_span_default_type_is_tool():
    tracer = create_tracer()
    with tracer.span(id="s", label="default"):
        pass
    assert tracer.events()[0]["node"]["type"] == "tool"


async def test_async_span_with_real_await_inside():
    """The span body can use `await` — the context manager must yield control."""
    import asyncio

    tracer = create_tracer()
    async with tracer.span(id="s", label="awaiting"):
        await asyncio.sleep(0)
    assert tracer.events()[1]["status"] == "done"
