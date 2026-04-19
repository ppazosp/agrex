import { describe, it, expect } from 'vitest'
import { applyEvents, composeReducers, coreReducers, defaultStepBoundaries } from '../replay/reduceEvents'
import type { AgrexEvent, ReducerStore } from '../replay/types'
import type { AgrexNode } from '../types'

function makeStore(): ReducerStore & { _nodes: AgrexNode[]; _edges: { id: string; source: string; target: string }[] } {
  const state = { _nodes: [] as AgrexNode[], _edges: [] as { id: string; source: string; target: string }[] }
  return {
    ...state,
    addNode(node) { state._nodes.push(node) },
    addNodes(nodes) { state._nodes.push(...nodes) },
    updateNode(id, updates) {
      const n = state._nodes.find((x) => x.id === id)
      if (n) Object.assign(n, updates)
    },
    removeNode(id) {
      state._nodes = state._nodes.filter((n) => n.id !== id)
      state._edges = state._edges.filter((e) => e.source !== id && e.target !== id)
    },
    addEdge(edge) { state._edges.push(edge) },
    addEdges(edges) { state._edges.push(...edges) },
    removeEdge(id) { state._edges = state._edges.filter((e) => e.id !== id) },
    clear() { state._nodes = []; state._edges = [] },
    loadJSON() { /* not used by core reducers */ },
    // Expose the mutable arrays so assertions can read post-reduce state.
    get _nodes() { return state._nodes },
    get _edges() { return state._edges },
  }
}

describe('coreReducers', () => {
  it('node_add appends', () => {
    const s = makeStore()
    coreReducers.node_add(s, { type: 'node_add', ts: 0, node: { id: 'a', type: 'agent', label: 'A' } })
    expect(s._nodes).toHaveLength(1)
    expect(s._nodes[0].id).toBe('a')
  })

  it('node_update merges flat fields', () => {
    const s = makeStore()
    s.addNode({ id: 'a', type: 'agent', label: 'A', status: 'idle' })
    coreReducers.node_update(s, { type: 'node_update', ts: 0, id: 'a', status: 'running' })
    expect(s._nodes[0].status).toBe('running')
  })

  it('node_update accepts label and metadata', () => {
    const s = makeStore()
    s.addNode({ id: 'a', type: 'agent', label: 'old' })
    coreReducers.node_update(s, {
      type: 'node_update', ts: 0, id: 'a', label: 'new', metadata: { k: 1 },
    })
    expect(s._nodes[0].label).toBe('new')
    expect(s._nodes[0].metadata).toEqual({ k: 1 })
  })

  it('node_remove removes by id', () => {
    const s = makeStore()
    s.addNode({ id: 'a', type: 'agent', label: 'A' })
    s.addNode({ id: 'b', type: 'agent', label: 'B' })
    coreReducers.node_remove(s, { type: 'node_remove', ts: 0, id: 'a' })
    expect(s._nodes.map((n) => n.id)).toEqual(['b'])
  })

  it('edge_add / edge_remove', () => {
    const s = makeStore()
    coreReducers.edge_add(s, { type: 'edge_add', ts: 0, edge: { id: 'e1', source: 'a', target: 'b' } })
    expect(s._edges).toHaveLength(1)
    coreReducers.edge_remove(s, { type: 'edge_remove', ts: 0, id: 'e1' })
    expect(s._edges).toHaveLength(0)
  })

  it('clear empties both collections', () => {
    const s = makeStore()
    s.addNode({ id: 'a', type: 'agent', label: 'A' })
    s.addEdge({ id: 'e', source: 'a', target: 'b' })
    coreReducers.clear(s, { type: 'clear', ts: 0 })
    expect(s._nodes).toEqual([])
    expect(s._edges).toEqual([])
  })

  it('malformed events are no-ops', () => {
    const s = makeStore()
    coreReducers.node_add(s, { type: 'node_add', ts: 0 })          // no node
    coreReducers.node_update(s, { type: 'node_update', ts: 0 })    // no id
    coreReducers.edge_add(s, { type: 'edge_add', ts: 0 })          // no edge
    expect(s._nodes).toEqual([])
    expect(s._edges).toEqual([])
  })
})

describe('composeReducers', () => {
  it('returns coreReducers when no consumer map', () => {
    expect(composeReducers()).toBe(coreReducers)
  })

  it('consumer keys override built-ins', () => {
    let called = false
    const composed = composeReducers({
      node_add: () => { called = true },
    })
    const s = makeStore()
    composed.node_add(s, { type: 'node_add', ts: 0, node: { id: 'x', type: 'agent', label: 'X' } })
    expect(called).toBe(true)
    expect(s._nodes).toEqual([]) // built-in did not run
  })

  it('unknown types map to undefined', () => {
    const composed = composeReducers()
    expect(composed.whatever).toBeUndefined()
  })
})

describe('applyEvents', () => {
  it('clears store and replays prefix', () => {
    const s = makeStore()
    s.addNode({ id: 'stale', type: 'agent', label: 'S' })
    const events: AgrexEvent[] = [
      { type: 'node_add', ts: 1, node: { id: 'a', type: 'agent', label: 'A' } },
      { type: 'node_add', ts: 2, node: { id: 'b', type: 'agent', label: 'B' } },
    ]
    applyEvents(s, events, 2, coreReducers)
    expect(s._nodes.map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('respects upTo cursor', () => {
    const s = makeStore()
    const events: AgrexEvent[] = [
      { type: 'node_add', ts: 1, node: { id: 'a', type: 'agent', label: 'A' } },
      { type: 'node_add', ts: 2, node: { id: 'b', type: 'agent', label: 'B' } },
    ]
    applyEvents(s, events, 1, coreReducers)
    expect(s._nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('skips unknown event types without throwing', () => {
    const s = makeStore()
    const events: AgrexEvent[] = [
      { type: 'stage_change', ts: 1, stage: 'research' },
      { type: 'node_add', ts: 2, node: { id: 'a', type: 'agent', label: 'A' } },
    ]
    applyEvents(s, events, 2, coreReducers)
    expect(s._nodes).toHaveLength(1)
  })
})

describe('defaultStepBoundaries', () => {
  it('emits one boundary per core mutation event', () => {
    const events: AgrexEvent[] = [
      { type: 'run_start', ts: 1 },
      { type: 'stage_change', ts: 2, stage: 'research' },
      { type: 'node_add', ts: 3, node: { id: 'a', type: 'agent', label: 'A' } },
      { type: 'agent_status', ts: 4, agent: 'x', status: 'working' },
      { type: 'node_update', ts: 5, id: 'a', status: 'done' },
      { type: 'edge_add', ts: 6, edge: { id: 'e', source: 'a', target: 'b' } },
    ]
    // Indices 2, 4, 5 are boundary-producing; boundary values are i+1.
    expect(defaultStepBoundaries(events)).toEqual([3, 5, 6])
  })
})
