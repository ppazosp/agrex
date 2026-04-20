import { describe, it, expect, vi } from 'vitest'
import { createTracer, parseTrace } from '../trace'
import type { AgrexEvent } from '../replay/types'
import type { AgrexNode } from '../types'

function stepClock(start = 1_000_000) {
  let t = start
  return () => t++
}

describe('createTracer', () => {
  describe('buffer mode', () => {
    it('buffers node_add events with injected ts', () => {
      const trace = createTracer({ clock: stepClock(100) })
      trace.agent('a', 'Researcher')
      trace.tool('b', 'search', { parent: 'a', args: { q: 'foo' } })

      const events = trace.events()
      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({ type: 'node_add', ts: 100 })
      expect(events[0].node as AgrexNode).toMatchObject({
        id: 'a',
        type: 'agent',
        label: 'Researcher',
        status: 'running',
      })
      expect(events[1]).toMatchObject({ type: 'node_add', ts: 101 })
      expect(events[1].node as AgrexNode).toMatchObject({
        id: 'b',
        type: 'tool',
        label: 'search',
        parentId: 'a',
        status: 'running',
        metadata: { args: { q: 'foo' } },
      })
    })

    it('merges user metadata with tool args sugar', () => {
      const trace = createTracer({ clock: stepClock() })
      trace.tool('b', 'search', { args: { q: 'foo' }, metadata: { tokens: 42 } })
      const node = trace.events()[0].node as AgrexNode
      expect(node.metadata).toEqual({ tokens: 42, args: { q: 'foo' } })
    })

    it('emits node_update for update / done / error', () => {
      const trace = createTracer({ clock: stepClock(500) })
      trace.tool('b', 'search')
      trace.update('b', { label: 'search_web' })
      trace.done('b', { output: 'ok', metadata: { tokens: 10 } })
      trace.error('c', { error: new Error('bang'), metadata: { retries: 2 } })

      const events = trace.events()
      expect(events[1]).toMatchObject({ type: 'node_update', id: 'b', label: 'search_web' })
      expect(events[2]).toMatchObject({
        type: 'node_update',
        id: 'b',
        status: 'done',
        metadata: { tokens: 10, output: 'ok' },
      })
      expect(events[3]).toMatchObject({ type: 'node_update', id: 'c', status: 'error' })
      const errMeta = events[3].metadata as { error: { name: string; message: string }; retries: number }
      expect(errMeta.retries).toBe(2)
      expect(errMeta.error).toMatchObject({ name: 'Error', message: 'bang' })
    })

    it('emits edge_add, node_remove, and clear', () => {
      const trace = createTracer({ clock: stepClock() })
      trace.edge({ id: 'e1', source: 'a', target: 'b', type: 'read' })
      trace.remove('a')
      trace.clear()

      const [edgeEv, removeEv, clearEv] = trace.events()
      expect(edgeEv).toMatchObject({ type: 'edge_add', edge: { id: 'e1', source: 'a', target: 'b' } })
      expect(removeEv).toMatchObject({ type: 'node_remove', id: 'a' })
      expect(clearEv).toMatchObject({ type: 'clear' })
    })

    it('emits stage and marker events', () => {
      const trace = createTracer({ clock: stepClock() })
      trace.stage('Search phase', { color: '#7c8cff' })
      trace.marker('retry', { label: 'retry 1', color: '#a855f7' })

      const [stageEv, markerEv] = trace.events()
      expect(stageEv).toMatchObject({ type: 'stage', label: 'Search phase', color: '#7c8cff' })
      expect(markerEv).toMatchObject({ type: 'marker', kind: 'retry', label: 'retry 1', color: '#a855f7' })
    })

    it('sets parentId without synthesizing a spawn edge', () => {
      const trace = createTracer({ clock: stepClock() })
      trace.agent('a', 'A')
      trace.tool('b', 'B', { parent: 'a' })

      const events = trace.events()
      expect(events.filter((e) => e.type === 'edge_add')).toHaveLength(0)
      expect((events[1].node as AgrexNode).parentId).toBe('a')
    })

    it('round-trips through parseTrace', () => {
      const trace = createTracer({ clock: stepClock() })
      trace.agent('a', 'Researcher')
      trace.tool('b', 'search', { parent: 'a' })
      trace.done('b')
      trace.done('a')

      const parsed = parseTrace(trace.toJSON())
      expect(parsed).toHaveLength(4)
      expect(parsed.map((e) => e.type)).toEqual(['node_add', 'node_add', 'node_update', 'node_update'])
    })

    it('toJSONL output parses via parseTrace', () => {
      const trace = createTracer({ clock: stepClock() })
      trace.agent('a', 'A')
      trace.done('a')

      const jsonl = trace.toJSONL()
      expect(jsonl.endsWith('\n')).toBe(true)
      const parsed = parseTrace(jsonl)
      expect(parsed).toHaveLength(2)
    })

    it('toJSONL returns empty string when no events were emitted', () => {
      const trace = createTracer()
      expect(trace.toJSONL()).toBe('')
    })

    it('reads / writes on node init pass through', () => {
      const trace = createTracer({ clock: stepClock() })
      trace.tool('t', 'write_file', { reads: ['f1'], writes: ['f2'] })
      const node = trace.events()[0].node as AgrexNode
      expect(node.reads).toEqual(['f1'])
      expect(node.writes).toEqual(['f2'])
    })

    it('node() escape hatch emits an arbitrary node shape', () => {
      const trace = createTracer({ clock: stepClock() })
      trace.node({ id: 'x', type: 'custom-type', label: 'X', status: 'done' })
      const ev = trace.events()[0]
      expect((ev.node as AgrexNode).type).toBe('custom-type')
    })
  })

  describe('streaming mode', () => {
    it('writes JSONL to the sink as events are emitted', () => {
      const lines: string[] = []
      const sink = { write: (chunk: string) => lines.push(chunk), end: vi.fn() }
      const trace = createTracer({ out: sink, clock: stepClock() })
      trace.agent('a', 'A')
      trace.done('a')
      trace.close()

      expect(lines).toHaveLength(2)
      expect(JSON.parse(lines[0])).toMatchObject({ type: 'node_add' })
      expect(JSON.parse(lines[1])).toMatchObject({ type: 'node_update', status: 'done' })
      expect(lines.every((l) => l.endsWith('\n'))).toBe(true)
      expect(sink.end).toHaveBeenCalledTimes(1)
    })

    it('buffer defaults on — streaming and buffer coexist', () => {
      const sink = { write: vi.fn() }
      const trace = createTracer({ out: sink, clock: stepClock() })
      trace.agent('a', 'A')
      expect(sink.write).toHaveBeenCalledTimes(1)
      expect(trace.events()).toHaveLength(1)
    })

    it('buffer:false skips memory retention — events() throws', () => {
      const sink = { write: vi.fn() }
      const trace = createTracer({ out: sink, buffer: false, clock: stepClock() })
      trace.agent('a', 'A')
      expect(sink.write).toHaveBeenCalledTimes(1)
      expect(() => trace.events()).toThrow(/buffer mode/)
      expect(() => trace.toJSON()).toThrow(/buffer mode/)
      expect(() => trace.toJSONL()).toThrow(/buffer mode/)
    })

    it('flush() calls out.flush when present', () => {
      const flush = vi.fn()
      const sink = { write: vi.fn(), flush }
      const trace = createTracer({ out: sink, clock: stepClock() })
      trace.flush()
      expect(flush).toHaveBeenCalledTimes(1)
    })

    it('close() prevents further emits', () => {
      const sink = { write: vi.fn(), end: vi.fn() }
      const trace = createTracer({ out: sink, clock: stepClock() })
      trace.close()
      expect(() => trace.agent('a', 'A')).toThrow(/closed/)
    })
  })

  describe('onEvent side channel', () => {
    it('invokes onEvent for every emit', () => {
      const received: AgrexEvent[] = []
      const trace = createTracer({ clock: stepClock(), onEvent: (e) => received.push(e) })
      trace.agent('a', 'A')
      trace.done('a')
      expect(received).toHaveLength(2)
      expect(received[0].type).toBe('node_add')
    })
  })

  describe('span', () => {
    it('emits node_add then node_update(done) on successful resolve and returns the result', async () => {
      const trace = createTracer({ clock: stepClock() })
      const result = await trace.span({ id: 'b', label: 'search' }, async () => 42)

      expect(result).toBe(42)
      const events = trace.events()
      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({ type: 'node_add' })
      expect((events[0].node as AgrexNode).type).toBe('tool')
      expect(events[1]).toMatchObject({ type: 'node_update', id: 'b', status: 'done' })
    })

    it('supports synchronous functions', async () => {
      const trace = createTracer({ clock: stepClock() })
      const result = await trace.span({ id: 'b', label: 'sync' }, () => 'hello')
      expect(result).toBe('hello')
      expect(trace.events()).toHaveLength(2)
    })

    it('emits node_update(error) and re-throws on reject', async () => {
      const trace = createTracer({ clock: stepClock() })
      const boom = new Error('boom')
      await expect(
        trace.span({ id: 'b', label: 'fail' }, async () => {
          throw boom
        }),
      ).rejects.toBe(boom)

      const events = trace.events()
      expect(events[1]).toMatchObject({ type: 'node_update', id: 'b', status: 'error' })
      const meta = events[1].metadata as { error: { name: string; message: string } }
      expect(meta.error).toMatchObject({ name: 'Error', message: 'boom' })
    })

    it('honors type override, parent, reads, writes', async () => {
      const trace = createTracer({ clock: stepClock() })
      await trace.span(
        { id: 's', label: 'sub', type: 'sub_agent', parent: 'root', reads: ['f1'], writes: ['f2'] },
        async () => null,
      )
      const node = trace.events()[0].node as AgrexNode
      expect(node.type).toBe('sub_agent')
      expect(node.parentId).toBe('root')
      expect(node.reads).toEqual(['f1'])
      expect(node.writes).toEqual(['f2'])
    })
  })
})
