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

## Limits

The hosted viewer caps pasted/dropped input at **25 MB**. Above that the `parseTrace()` loader aborts before allocating. Clone the viewer and raise the `MAX_BYTES` constant if you need more.
