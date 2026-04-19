import type { AgrexNode, AgrexEdge } from '../types'
import type { AgrexEvent, EventReducer, ReducerStore } from './types'

/**
 * Built-in reducers for agrex's canonical mutation events.
 *
 * Event payloads are flat (not nested under `data`) to match how most agent
 * emitters already serialize messages — e.g. `{type:"node_update", id, status}`
 * rather than `{type:"node_update", data:{id, status}}`.
 */
export const coreReducers: Record<string, EventReducer> = {
  node_add(store, ev) {
    const node = ev.node as AgrexNode | undefined
    if (node) store.addNode(node)
  },

  node_update(store, ev) {
    const id = ev.id as string | undefined
    if (!id) return
    const updates: Partial<Pick<AgrexNode, 'status' | 'label' | 'metadata'>> = {}
    if ('status' in ev) updates.status = ev.status as AgrexNode['status']
    if ('label' in ev) updates.label = ev.label as string
    if ('metadata' in ev) updates.metadata = ev.metadata as Record<string, unknown>
    store.updateNode(id, updates)
  },

  node_remove(store, ev) {
    const id = ev.id as string | undefined
    if (id) store.removeNode(id)
  },

  edge_add(store, ev) {
    const edge = ev.edge as AgrexEdge | undefined
    if (edge) store.addEdge(edge)
  },

  edge_remove(store, ev) {
    const id = ev.id as string | undefined
    if (id) store.removeEdge(id)
  },

  clear(store) {
    store.clear()
  },
}

/**
 * Event types that emit a step boundary by default. Consumers can override
 * the whole boundary set via `stepBoundaries` in the replay options.
 */
export const DEFAULT_BOUNDARY_TYPES: ReadonlySet<string> = new Set([
  'node_add',
  'node_update',
  'node_remove',
  'edge_add',
  'edge_remove',
  'clear',
])

/**
 * Compose the reducer map: consumer entries override built-ins. Returning the
 * full map (not a dispatcher) keeps `replay(events, cursor)` a plain loop.
 */
export function composeReducers(consumer?: Record<string, EventReducer>): Record<string, EventReducer> {
  if (!consumer) return coreReducers
  return { ...coreReducers, ...consumer }
}

/**
 * Reduce a prefix of events into a cleared store. Used when the cursor jumps
 * backward or the event log is replaced; cost is O(cursor) per invocation.
 */
export function applyEvents(
  store: ReducerStore,
  events: readonly AgrexEvent[],
  upTo: number,
  reducers: Record<string, EventReducer>,
): void {
  store.clear()
  applyEventRange(store, events, 0, upTo, reducers)
}

/**
 * Apply `events[from..to)` without clearing the store. Used for forward
 * cursor motion (live streaming, playback, step-forward) so graph layouts
 * that cache per-node positions don't see nodes disappear and reappear
 * between ticks — that's what causes deterministic-layout regressions during
 * replay playback.
 */
export function applyEventRange(
  store: ReducerStore,
  events: readonly AgrexEvent[],
  from: number,
  to: number,
  reducers: Record<string, EventReducer>,
): void {
  const end = Math.min(to, events.length)
  for (let i = Math.max(0, from); i < end; i++) {
    const ev = events[i]
    const fn = reducers[ev.type]
    if (fn) fn(store, ev)
  }
}

/**
 * Default step boundaries: cursor positions after each mutation event.
 * Non-mutating events (agent telemetry, stage changes, custom signals) are
 * skipped so one "step" always advances the rendered graph by one observable
 * delta.
 */
export function defaultStepBoundaries(events: readonly AgrexEvent[]): number[] {
  const out: number[] = []
  for (let i = 0; i < events.length; i++) {
    if (DEFAULT_BOUNDARY_TYPES.has(events[i].type)) {
      out.push(i + 1)
    }
  }
  return out
}
