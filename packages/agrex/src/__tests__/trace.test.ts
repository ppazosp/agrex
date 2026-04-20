import { describe, it, expect } from 'vitest'
import { snapshotToEvents, parseTrace, TraceParseError } from '../trace'
import type { AgrexNode, AgrexEdge } from '../types'

describe('snapshotToEvents', () => {
  it('emits node_add + node_update for timestamped nodes with final status', () => {
    const nodes: AgrexNode[] = [
      { id: 'a', type: 'agent', label: 'A', status: 'done', metadata: { startedAt: 100, endedAt: 200 } },
    ]
    const events = snapshotToEvents(nodes, [])
    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ type: 'node_add', ts: 100 })
    expect((events[0].node as AgrexNode).status).toBe('running')
    expect(events[1]).toMatchObject({ type: 'node_update', ts: 200, id: 'a', status: 'done' })
  })

  it('emits a single node_add when endedAt is missing', () => {
    const nodes: AgrexNode[] = [{ id: 'a', type: 'tool', label: 'A', status: 'done', metadata: { startedAt: 100 } }]
    const events = snapshotToEvents(nodes, [])
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('node_add')
    expect((events[0].node as AgrexNode).status).toBe('done')
  })

  it('orders events by timestamp', () => {
    const nodes: AgrexNode[] = [
      { id: 'a', type: 'agent', label: 'A', metadata: { startedAt: 200 } },
      { id: 'b', type: 'tool', label: 'B', metadata: { startedAt: 100 } },
    ]
    const events = snapshotToEvents(nodes, [])
    expect((events[0].node as AgrexNode).id).toBe('b')
    expect((events[1].node as AgrexNode).id).toBe('a')
  })

  it('emits edge_add at max(source, target) node timestamp', () => {
    const nodes: AgrexNode[] = [
      { id: 'a', type: 'agent', label: 'A', metadata: { startedAt: 100 } },
      { id: 'b', type: 'tool', label: 'B', metadata: { startedAt: 200 } },
    ]
    const edges: AgrexEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const events = snapshotToEvents(nodes, edges)
    const edgeEv = events.find((e) => e.type === 'edge_add')!
    expect(edgeEv.ts).toBe(200)
  })

  it('falls back to array order when no startedAt anywhere', () => {
    const nodes: AgrexNode[] = [
      { id: 'a', type: 'agent', label: 'A' },
      { id: 'b', type: 'tool', label: 'B' },
    ]
    const events = snapshotToEvents(nodes, [])
    expect((events[0].node as AgrexNode).id).toBe('a')
    expect((events[1].node as AgrexNode).id).toBe('b')
  })

  it('accepts ISO string timestamps', () => {
    const nodes: AgrexNode[] = [
      {
        id: 'a',
        type: 'agent',
        label: 'A',
        status: 'done',
        metadata: { startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T00:00:01Z' },
      },
    ]
    const events = snapshotToEvents(nodes, [])
    expect(events[0].ts).toBe(Date.parse('2026-01-01T00:00:00Z'))
    expect(events[1].ts).toBe(Date.parse('2026-01-01T00:00:01Z'))
  })
})

describe('parseTrace', () => {
  it('parses {events} shape', () => {
    const source = JSON.stringify({
      events: [
        { type: 'node_add', ts: 1, node: { id: 'a', type: 'agent', label: 'A' } },
        { type: 'node_update', ts: 2, id: 'a', status: 'done' },
      ],
    })
    const events = parseTrace(source)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('node_add')
  })

  it('parses {nodes, edges} snapshot shape', () => {
    const source = JSON.stringify({
      nodes: [{ id: 'a', type: 'agent', label: 'A', metadata: { startedAt: 10 } }],
      edges: [],
    })
    const events = parseTrace(source)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('node_add')
  })

  it('parses JSONL (one event per line)', () => {
    const source = [
      JSON.stringify({ type: 'node_add', ts: 1, node: { id: 'a', type: 'agent', label: 'A' } }),
      JSON.stringify({ type: 'node_update', ts: 2, id: 'a', status: 'done' }),
    ].join('\n')
    const events = parseTrace(source)
    expect(events).toHaveLength(2)
  })

  it('parses JSONL tolerating blank lines', () => {
    const source = [
      JSON.stringify({ type: 'node_add', ts: 1, node: { id: 'a', type: 'agent', label: 'A' } }),
      '',
      JSON.stringify({ type: 'node_add', ts: 2, node: { id: 'b', type: 'tool', label: 'B' } }),
    ].join('\n')
    const events = parseTrace(source)
    expect(events).toHaveLength(2)
  })

  it('accepts pre-parsed object', () => {
    const events = parseTrace({
      events: [{ type: 'node_add', ts: 1, node: { id: 'a', type: 'agent', label: 'A' } }],
    })
    expect(events).toHaveLength(1)
  })

  it('throws TraceParseError on empty input', () => {
    expect(() => parseTrace('')).toThrow(TraceParseError)
    expect(() => parseTrace('   ')).toThrow(TraceParseError)
  })

  it('throws TraceParseError on invalid JSON', () => {
    expect(() => parseTrace('{not json')).toThrow(TraceParseError)
  })

  it('throws TraceParseError when neither events nor nodes present', () => {
    expect(() => parseTrace(JSON.stringify({ foo: 'bar' }))).toThrow(TraceParseError)
  })

  it('throws TraceParseError on event missing type', () => {
    expect(() => parseTrace(JSON.stringify({ events: [{ ts: 1 }] }))).toThrow(TraceParseError)
  })

  it('throws TraceParseError on event missing ts', () => {
    expect(() => parseTrace(JSON.stringify({ events: [{ type: 'node_add' }] }))).toThrow(TraceParseError)
  })

  it('throws TraceParseError with line number on JSONL parse failure', () => {
    const source = [JSON.stringify({ type: 'node_add', ts: 1 }), '{ broken'].join('\n')
    expect(() => parseTrace(source)).toThrow(/line 2/)
  })
})
