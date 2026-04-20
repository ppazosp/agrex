import type { AgrexEdge, AgrexNode, NodeStatus } from '../types'
import type { AgrexEvent } from '../replay/types'

/**
 * Duck-typed writable sink. Matches Node `WriteStream`, the Web
 * `WritableStreamDefaultWriter`-wrapped object, or anything with a `write`
 * method. Keeping it this loose avoids pulling `fs` or Node types into the
 * package surface.
 */
export interface TracerWritable {
  write(chunk: string): unknown
  end?(): unknown
  flush?(): unknown
}

export interface TracerOptions {
  /** Stream each event as JSONL. Omit for buffer-only mode. */
  out?: TracerWritable
  /** Retain events in memory. Default: `true`. Set false for very long streaming runs. */
  buffer?: boolean
  /** Timestamp source. Default: `Date.now`. Inject for deterministic tests. */
  clock?: () => number
  /** Side channel invoked with every emitted event (live feeds, dev tools). */
  onEvent?: (event: AgrexEvent) => void
}

export interface NodeInit {
  /** Parent node id — auto-renders a spawn edge via the viewer's edge derivation. */
  parent?: string
  reads?: string[]
  writes?: string[]
  /** Override initial status. Default: `'running'`. */
  status?: NodeStatus
  metadata?: Record<string, unknown>
}

export interface ToolInit extends NodeInit {
  /** Sugar: folded into `metadata.args`. */
  args?: unknown
}

export interface UpdatePatch {
  status?: NodeStatus
  label?: string
  metadata?: Record<string, unknown>
}

export interface DonePatch {
  metadata?: Record<string, unknown>
  /** Sugar: folded into `metadata.output`. */
  output?: unknown
}

export interface ErrorPatch {
  metadata?: Record<string, unknown>
  /** Sugar: folded into `metadata.error`. `Error` instances are serialized. */
  error?: unknown
}

export interface SpanInit {
  id: string
  label: string
  type?: AgrexNode['type']
  parent?: string
  reads?: string[]
  writes?: string[]
  metadata?: Record<string, unknown>
}

export interface Tracer {
  agent(id: string, label: string, init?: NodeInit): void
  subAgent(id: string, label: string, init?: NodeInit): void
  tool(id: string, label: string, init?: ToolInit): void
  file(id: string, label: string, init?: NodeInit): void
  /** Escape hatch — emit a `node_add` with an arbitrary node shape. */
  node(partial: AgrexNode): void

  update(id: string, patch: UpdatePatch): void
  done(id: string, patch?: DonePatch): void
  error(id: string, patch?: ErrorPatch): void
  remove(id: string): void

  edge(edge: AgrexEdge): void

  /** Timeline chapter. The viewer segments the rail per stage. */
  stage(label: string, opts?: { color?: string }): void
  /** Timeline point marker — non-segmenting tag. */
  marker(kind: string, opts?: { label?: string; color?: string }): void

  clear(): void

  /**
   * Wrap an async (or sync) operation. Emits a `node_add` on entry and a
   * `done` / `error` `node_update` on resolve / reject. Default type: `tool`.
   * The returned promise mirrors the wrapped function's result — rejections
   * are re-thrown after the `error` event is emitted.
   */
  span<T>(init: SpanInit, fn: () => T | Promise<T>): Promise<T>

  /** Snapshot of buffered events. Throws when `buffer: false`. */
  events(): AgrexEvent[]
  /** Viewer-compatible `{ events }`. Throws when `buffer: false`. */
  toJSON(): { events: AgrexEvent[] }
  /** Newline-delimited JSON of buffered events. Throws when `buffer: false`. */
  toJSONL(): string
  /** Best-effort flush of the sink. No-op on plain Node streams. */
  flush(): void
  /** End the sink and mark the tracer closed. Further emits throw. */
  close(): void
}

export function createTracer(opts: TracerOptions = {}): Tracer {
  const clock = opts.clock ?? (() => Date.now())
  const shouldBuffer = opts.buffer ?? true
  const { out, onEvent } = opts
  const log: AgrexEvent[] = []
  let closed = false

  function emit(event: AgrexEvent) {
    if (closed) throw new Error('Tracer is closed')
    if (shouldBuffer) log.push(event)
    if (out) out.write(JSON.stringify(event) + '\n')
    if (onEvent) onEvent(event)
  }

  function buildNode(
    id: string,
    label: string,
    type: AgrexNode['type'],
    init: NodeInit = {},
    extraMetadata?: Record<string, unknown>,
  ): AgrexNode {
    const mergedMetadata = { ...(init.metadata ?? {}), ...(extraMetadata ?? {}) }
    const node: AgrexNode = {
      id,
      label,
      type,
      status: init.status ?? 'running',
    }
    if (init.parent !== undefined) node.parentId = init.parent
    if (init.reads?.length) node.reads = init.reads
    if (init.writes?.length) node.writes = init.writes
    if (Object.keys(mergedMetadata).length > 0) node.metadata = mergedMetadata
    return node
  }

  function requireBuffer(method: string) {
    if (!shouldBuffer) {
      throw new Error(`${method}() requires buffer mode. Omit \`buffer: false\` to enable it.`)
    }
  }

  return {
    agent(id, label, init) {
      emit({ type: 'node_add', ts: clock(), node: buildNode(id, label, 'agent', init) })
    },
    subAgent(id, label, init) {
      emit({ type: 'node_add', ts: clock(), node: buildNode(id, label, 'sub_agent', init) })
    },
    tool(id, label, init) {
      const extra = init?.args !== undefined ? { args: init.args } : undefined
      emit({ type: 'node_add', ts: clock(), node: buildNode(id, label, 'tool', init, extra) })
    },
    file(id, label, init) {
      emit({ type: 'node_add', ts: clock(), node: buildNode(id, label, 'file', init) })
    },
    node(partial) {
      emit({ type: 'node_add', ts: clock(), node: partial })
    },

    update(id, patch) {
      const ev: AgrexEvent = { type: 'node_update', ts: clock(), id }
      if (patch.status !== undefined) ev.status = patch.status
      if (patch.label !== undefined) ev.label = patch.label
      if (patch.metadata !== undefined) ev.metadata = patch.metadata
      emit(ev)
    },
    done(id, patch) {
      const metadata = {
        ...(patch?.metadata ?? {}),
        ...(patch?.output !== undefined ? { output: patch.output } : {}),
      }
      const ev: AgrexEvent = { type: 'node_update', ts: clock(), id, status: 'done' }
      if (Object.keys(metadata).length > 0) ev.metadata = metadata
      emit(ev)
    },
    error(id, patch) {
      const metadata = {
        ...(patch?.metadata ?? {}),
        ...(patch?.error !== undefined ? { error: serializeError(patch.error) } : {}),
      }
      const ev: AgrexEvent = { type: 'node_update', ts: clock(), id, status: 'error' }
      if (Object.keys(metadata).length > 0) ev.metadata = metadata
      emit(ev)
    },
    remove(id) {
      emit({ type: 'node_remove', ts: clock(), id })
    },
    edge(edge) {
      emit({ type: 'edge_add', ts: clock(), edge })
    },

    stage(label, init) {
      const ev: AgrexEvent = { type: 'stage', ts: clock(), label }
      if (init?.color) ev.color = init.color
      emit(ev)
    },
    marker(kind, init) {
      const ev: AgrexEvent = { type: 'marker', ts: clock(), kind }
      if (init?.label) ev.label = init.label
      if (init?.color) ev.color = init.color
      emit(ev)
    },

    clear() {
      emit({ type: 'clear', ts: clock() })
    },

    async span(init, fn) {
      const type = init.type ?? 'tool'
      emit({
        type: 'node_add',
        ts: clock(),
        node: buildNode(init.id, init.label, type, {
          parent: init.parent,
          reads: init.reads,
          writes: init.writes,
          metadata: init.metadata,
          status: 'running',
        }),
      })
      try {
        const result = await fn()
        emit({ type: 'node_update', ts: clock(), id: init.id, status: 'done' })
        return result
      } catch (err) {
        emit({
          type: 'node_update',
          ts: clock(),
          id: init.id,
          status: 'error',
          metadata: { error: serializeError(err) },
        })
        throw err
      }
    },

    events() {
      requireBuffer('events')
      return [...log]
    },
    toJSON() {
      requireBuffer('toJSON')
      return { events: [...log] }
    },
    toJSONL() {
      requireBuffer('toJSONL')
      return log.length > 0 ? log.map((e) => JSON.stringify(e)).join('\n') + '\n' : ''
    },
    flush() {
      if (typeof out?.flush === 'function') out.flush()
    },
    close() {
      closed = true
      if (out?.end) out.end()
    },
  }
}

function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return err
}
