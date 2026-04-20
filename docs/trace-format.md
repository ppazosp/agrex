# agrex trace format

The [viewer](https://agrex.ppazosp.dev) and the `parseTrace()` utility in `@ppazosp/agrex/trace` accept **three shapes**. The loader auto-detects which one you gave it.

## 1. Event trace — the canonical shape

```json
{
  "events": [
    { "type": "node_add", "ts": 1700000000000, "node": { "id": "a", "type": "agent", "label": "Research Assistant" } },
    { "type": "node_add", "ts": 1700000000400, "node": { "id": "b", "type": "tool", "label": "search_web", "parentId": "a", "status": "running" } },
    { "type": "node_update", "ts": 1700000000740, "id": "b", "status": "done", "metadata": { "tokens": 420 } },
    { "type": "edge_add", "ts": 1700000000800, "edge": { "id": "e1", "source": "a", "target": "b", "type": "spawn" } }
  ]
}
```

Every event has **`type`** (string) and **`ts`** (ms since epoch, or any monotonic clock — drives timeline spacing). Additional fields depend on the type.

### Built-in event types

| `type`        | Fields                                                 | Effect                                                 |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `node_add`    | `node: AgrexNode`                                      | Add a node to the graph                                |
| `node_update` | `id: string`, optional `status`, `label`, `metadata`   | Patch an existing node (metadata shallow-merges)       |
| `node_remove` | `id: string`                                           | Remove a node                                          |
| `edge_add`    | `edge: AgrexEdge`                                      | Add an edge                                            |
| `edge_remove` | `id: string`                                           | Remove an edge                                         |
| `clear`       | —                                                      | Clear everything                                       |

Unknown event types are ignored by the viewer but preserved in the stream — consumers can register custom reducers via `useAgrexReplay({ reducers })`.

### Timeline markers

Two non-mutating event types the [viewer](https://agrex.ppazosp.dev) recognises for timeline chapters + point markers. They don't touch the graph; they're rendered on the scrub track.

| `type`   | Fields                                          | Renders as                                                   |
| -------- | ----------------------------------------------- | ------------------------------------------------------------ |
| `stage`  | `label`, optional `color`                       | **Chapter segment** + sentinel pill. Skip-prev / skip-next jump between stages. |
| `marker` | `kind`, optional `label`, optional `color`      | **Point marker** on the track. Does not segment the rail. |

`stage` example:

```json
{ "type": "stage", "ts": 1700000000500, "label": "Search phase", "color": "#7c8cff" }
{ "type": "stage", "ts": 1700000018000, "label": "Synthesis" }
```

- `color` is optional. When omitted the viewer hashes `label` to a curated palette (indigo / pink / cyan / violet / rose / blue / lavender / teal) — consistent across reloads, avoids agrex's status colours so stages never clash with `running` / `done` / `error`.
- The active stage gets a subtle inner glow.

`marker` example — custom point markers for things like retries, checkpoints, user annotations:

```json
{ "type": "marker", "ts": 1700000005400, "kind": "retry", "label": "retry 1", "color": "#a855f7" }
{ "type": "marker", "ts": 1700000012300, "kind": "checkpoint", "label": "saved v1" }
```

`kind` is a free-form string — pick anything. The marker renders as a 6×12 vertical bar in its `color`. Hovering shows `label`.

### Auto-extraction (when stages / markers aren't supplied)

The viewer fills in sensible defaults if your trace doesn't include explicit stage or marker events:

- **Stages fall back to agent spawns.** Every `node_add` of a `type: 'agent'` or `type: 'sub_agent'` becomes a stage, coloured deterministically from the agent's label. If *any* `stage` event is present, the fallback disables so you stay in control.
- **Errors always emit.** Any node entering `status: 'error'` (via `node_add` or `node_update`) renders as a red point marker, regardless of what stages/markers you've declared.

### `AgrexNode` shape

```ts
{
  id: string
  type: 'agent' | 'sub_agent' | 'tool' | 'file' | string
  label: string
  parentId?: string
  status?: 'idle' | 'running' | 'done' | 'error'
  metadata?: Record<string, unknown>
  reads?: string[]   // node ids — auto-generates read edges
  writes?: string[]  // node ids — auto-generates write edges
}
```

### `AgrexEdge` shape

```ts
{
  id: string
  source: string       // node id
  target: string       // node id
  type?: 'spawn' | 'read' | 'write' | string
  label?: string
}
```

## 2. Snapshot — `{ nodes, edges }`

```json
{
  "nodes": [
    {
      "id": "a",
      "type": "agent",
      "label": "Research Assistant",
      "status": "done",
      "metadata": { "startedAt": 1700000000000, "endedAt": 1700000042000 }
    }
  ],
  "edges": []
}
```

The viewer converts a snapshot into events via `snapshotToEvents(nodes, edges)`:

- Nodes sort by `metadata.startedAt`; ones without a timestamp land first in array order.
- When both `startedAt` and `endedAt` are present, two events are emitted — `node_add` (status `running`) followed by `node_update` (final status) — so the scrubber shows the transition.
- Edges land at `max(source.startedAt, target.startedAt)` so they never appear before their endpoints.
- `startedAt` / `endedAt` may be epoch ms numbers or ISO 8601 strings.

Snapshots are lossy: intermediate `node_update`s are unrecoverable. Export an event trace if you want full fidelity.

## 3. JSONL — one event per line

```jsonl
{"type":"node_add","ts":1700000000000,"node":{"id":"a","type":"agent","label":"Research Assistant"}}
{"type":"node_add","ts":1700000000400,"node":{"id":"b","type":"tool","label":"search_web","parentId":"a","status":"running"}}
{"type":"node_update","ts":1700000000740,"id":"b","status":"done"}
```

Same events as shape 1, newline-delimited. Auto-detected when the file has ≥2 non-empty lines that each start with `{`. Good for streaming exports — append-only, no outer array to close.

## Exporting from a running `<Agrex>`

```tsx
const ref = useRef<AgrexHandle>(null)
// ...
const { events } = ref.current!.toTrace()
// or for a snapshot:
const { nodes, edges } = ref.current!.toJSON()
```

## Producing traces from your own code — `createTracer`

`createTracer()` is the canonical way to record a trace from arbitrary JS/TS — an agent loop, a pipeline, a test fixture. It timestamps events for you and emits the same shape the viewer already reads.

```ts
import { createTracer } from '@ppazosp/agrex/trace'

const trace = createTracer()

trace.agent('root', 'Researcher', { metadata: { input: query } })
trace.stage('Search phase')
trace.tool('s1', 'web_search', { parent: 'root', args: { q: query } })
// … do the work …
trace.done('s1', { output: hits })
trace.done('root', { output: summary })

// Drop the result on agrex.ppazosp.dev, or parse in-process:
const fileContent = trace.toJSONL()
```

### Async scopes — `span()`

`span()` wraps a function (sync or async) and auto-emits `node_add` on entry plus `done` / `error` on settle. The wrapped return value is returned to you; rejections re-throw after the error event is recorded.

```ts
const hits = await trace.span({ id: 's1', label: 'web_search', parent: 'root' }, async () => {
  return await search(query)
})
```

Default node type is `tool`. Pass `type: 'sub_agent'` etc. to override.

### Streaming for long runs

For agents that run for hours, pipe events to a file instead of buffering. The viewer reads JSONL directly.

```ts
import { createWriteStream } from 'node:fs'

const trace = createTracer({
  out: createWriteStream('run.jsonl'),
  buffer: false, // skip in-memory retention
})

// ... emit events during the run ...

trace.close() // flushes and ends the stream
```

### `flush()` for mid-run snapshots

When the sink buffers writes (e.g. a custom stream with its own queue), `flush()` invokes `out.flush?.()` if present. On plain Node `WriteStream`s it's a no-op — writes already hit the OS buffer synchronously.

### API summary

| Method                                 | Emits                     |
| -------------------------------------- | ------------------------- |
| `agent(id, label, init?)`              | `node_add` (`type: agent`)      |
| `subAgent(id, label, init?)`           | `node_add` (`type: sub_agent`)  |
| `tool(id, label, init?)`               | `node_add` (`type: tool`). `init.args` folds into `metadata.args`. |
| `file(id, label, init?)`               | `node_add` (`type: file`)       |
| `node(partial)`                        | `node_add` — escape hatch       |
| `update(id, patch)`                    | `node_update`                   |
| `done(id, patch?)`                     | `node_update` (`status: done`). `patch.output` folds into `metadata.output`. |
| `error(id, patch?)`                    | `node_update` (`status: error`). `Error` instances are serialized. |
| `remove(id)`                           | `node_remove`                   |
| `edge(edge)`                           | `edge_add`                      |
| `stage(label, opts?)`                  | `stage`                         |
| `marker(kind, opts?)`                  | `marker`                        |
| `clear()`                              | `clear`                         |
| `span(init, fn)`                       | `node_add` + `done`/`error`     |

All `init` objects accept `parent`, `reads`, `writes`, `metadata`, and `status`. The viewer auto-renders a spawn edge when `parent` is set — no need to emit one explicitly.

Output: `events()` / `toJSON()` / `toJSONL()` return buffered events (throw when `buffer: false`).

## Limits

The hosted viewer caps pasted/dropped input at **25 MB**. Above that the `parseTrace()` loader aborts before allocating. Clone the viewer and raise the `MAX_BYTES` constant if you need more.
