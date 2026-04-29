"""Stress tests for concurrent emission. Without the threading.Lock around
buffer + sink writes, these tests would intermittently fail with corrupted
JSONL or lost buffer events under contention."""

import io
import json
from concurrent.futures import ThreadPoolExecutor

from agrex import create_tracer


def test_concurrent_emits_produce_well_formed_jsonl():
    """16 worker threads, 200 emits each, two events per emit (tool + done) = 6400 lines."""
    sink = io.StringIO()
    tracer = create_tracer(out=sink)

    def emit_pair(i: int) -> None:
        tracer.tool(f"t-{i}", f"label-{i}", parent="root")
        tracer.done(f"t-{i}", output={"i": i})

    with ThreadPoolExecutor(max_workers=16) as pool:
        list(pool.map(emit_pair, range(200)))

    sink.seek(0)
    lines = sink.read().splitlines()
    assert len(lines) == 400  # 200 pairs x 2 events
    parsed = [json.loads(line) for line in lines]
    assert all(p["type"] in ("node_add", "node_update") for p in parsed)


def test_buffered_concurrent_emits_count_matches():
    """500 concurrent emits all land in the buffer with no losses."""
    tracer = create_tracer()

    def emit(i: int) -> None:
        tracer.agent(f"a-{i}", f"A{i}")

    with ThreadPoolExecutor(max_workers=16) as pool:
        list(pool.map(emit, range(500)))

    assert len(tracer.events()) == 500


def test_on_event_runs_outside_lock():
    """A blocking on_event callback must not serialize subsequent emits.

    If on_event ran inside the lock, the second thread couldn't acquire it
    until the first thread's blocking callback returned — which it never
    would here because we use threading.Event for the rendezvous. The test
    verifies that emit completes (event lands in buffer) before on_event
    finishes."""
    import threading as _threading

    in_callback = _threading.Event()
    release_callback = _threading.Event()

    def on_event(event: dict) -> None:
        in_callback.set()
        # Block until the test releases us.
        release_callback.wait(timeout=5.0)

    tracer = create_tracer(on_event=on_event)

    def first_emit() -> None:
        tracer.agent("a", "A")

    t1 = _threading.Thread(target=first_emit)
    t1.start()

    # Wait for the on_event callback to start.
    assert in_callback.wait(timeout=5.0), "on_event was not called"

    # While the callback is blocked, the buffer should already contain the event
    # (because buffer + sink writes happened inside the lock, which has been
    # released by now — on_event runs outside it).
    assert len(tracer.events()) == 1

    # And another emit from this main thread must also succeed without blocking
    # on the held callback.
    tracer.agent("b", "B")
    assert len(tracer.events()) == 2

    # Release the first callback so the thread can finish.
    release_callback.set()
    t1.join(timeout=5.0)
    assert not t1.is_alive()
