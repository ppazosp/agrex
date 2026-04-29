# agrex (Python)

Record agent execution traces for the [agrex viewer](https://agrex.ppazosp.dev). Same trace format as the TypeScript [`@ppazosp/agrex/trace`](../agrex) package — write a trace from Python, drop it on the viewer, get the same scrubbing replay.

## Install

```bash
uv add agrex     # or: pip install agrex
```

Requires Python 3.10+.

## Quick start

```python
from agrex import create_tracer

trace = create_tracer()

trace.agent("root", "Researcher", metadata={"input": query})
trace.stage("Search phase")
trace.tool("s1", "web_search", parent="root", args={"q": query})
# … do the work …
trace.done("s1", output=hits)
trace.done("root", output=summary)

# Drop on agrex.ppazosp.dev:
with open("run.jsonl", "w") as f:
    f.write(trace.to_jsonl())
```

## Async scopes — `span()`

Wraps any block. Emits `node_add` on entry and `done` / `error` on settle:

```python
with trace.span(id="s1", label="web_search", parent="root"):
    hits = search(query)

# async too
async with trace.span(id="s1", label="web_search", parent="root"):
    hits = await search(query)
```

Default node type is `tool`. Pass `type="sub_agent"` etc. to override. On exception the span emits `node_update` with `status="error"` and a serialized exception in `metadata.error`, then re-raises.

## Streaming for long runs

Pipe events directly to a file — the viewer reads JSONL natively.

```python
with open("run.jsonl", "w") as f:
    trace = create_tracer(out=f, buffer=False)
    # ... emit events ...
    trace.close()  # flushes and closes the sink
```

`buffer=False` skips the in-memory log. `events()` / `to_json()` / `to_jsonl()` raise in that mode.

## API summary

| Method | Emits |
|---|---|
| `agent(id, label, **kw)` | `node_add` (`type: agent`) |
| `sub_agent(id, label, **kw)` | `node_add` (`type: sub_agent`) |
| `tool(id, label, args=None, **kw)` | `node_add` (`type: tool`). `args` folds into `metadata.args`. |
| `file(id, label, **kw)` | `node_add` (`type: file`) |
| `node(partial)` | `node_add` — escape hatch, no validation |
| `update(id, status=, label=, metadata=)` | `node_update` |
| `done(id, output=None, metadata=None)` | `node_update` (`status: done`). `output` folds into `metadata.output`. |
| `error(id, error=None, metadata=None)` | `node_update` (`status: error`). Exceptions are serialized into `metadata.error`. |
| `remove(id)` | `node_remove` |
| `edge(id=, source=, target=, type=, label=)` | `edge_add` |
| `stage(label, color=None)` | `stage` |
| `marker(kind, label=None, color=None)` | `marker` |
| `clear()` | `clear` |
| `span(id=, label=, type='tool', **kw)` | sync/async context manager — `node_add` + `done`/`error` |

All node helpers accept `parent`, `reads`, `writes`, `metadata`, and `status` as keyword-only arguments.

## Loading traces back

`parse_trace` auto-detects three input shapes — JSONL, `{events: [...]}`, or `{nodes, edges}` snapshots:

```python
from agrex import parse_trace

with open("run.jsonl") as f:
    events = parse_trace(f.read())
```

Raises `TraceParseError` with a `format` attribute on parse failure.

## Thread safety

`emit()` is wrapped in a `threading.Lock` — concurrent calls from a `ThreadPoolExecutor` produce well-formed JSONL. asyncio-only callers pay no real cost (the lock is uncontended). The `on_event` callback runs outside the lock so user code never serializes across all emits.

## Trace format

See the [trace format spec](https://github.com/ppazosp/agrex/blob/main/docs/trace-format.md). The Python and TypeScript packages emit the same canonical shape; the cross-language fixture round-trip test in CI guards against drift.
