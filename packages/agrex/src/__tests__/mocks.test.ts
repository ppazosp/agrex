import { describe, it, expect, beforeEach } from 'vitest'
import { createMockNode, createMockEdge, resetMockCounter } from '../mocks/generators'
import { createMockPipeline } from '../mocks/scenarios'

beforeEach(() => {
  resetMockCounter()
})

describe('createMockNode', () => {
  it('creates node with auto-incremented id', () => {
    const n1 = createMockNode({ type: 'agent', label: 'A' })
    const n2 = createMockNode({ type: 'tool', label: 'B' })
    expect(n1.id).toBe('mock-1')
    expect(n2.id).toBe('mock-2')
  })

  it('defaults status to idle', () => {
    const n = createMockNode({ type: 'agent', label: 'A' })
    expect(n.status).toBe('idle')
  })

  it('allows overriding all fields', () => {
    const n = createMockNode({ id: 'custom', type: 'tool', label: 'T', status: 'done' })
    expect(n.id).toBe('custom')
    expect(n.status).toBe('done')
  })
})

describe('createMockEdge', () => {
  it('creates edge with auto id from source-target', () => {
    const e = createMockEdge({ source: 'a', target: 'b' })
    expect(e.id).toBe('a-b')
    expect(e.type).toBe('spawn')
  })

  it('allows overriding type', () => {
    const e = createMockEdge({ source: 'a', target: 'b', type: 'write' })
    expect(e.type).toBe('write')
  })
})

describe('createMockPipeline', () => {
  it('creates research-agent scenario', () => {
    const { nodes, edges } = createMockPipeline('research-agent')
    expect(nodes.length).toBeGreaterThan(0)
    expect(edges.length).toBeGreaterThan(0)
    expect(nodes[0].type).toBe('agent')
  })

  it('creates multi-agent scenario', () => {
    const { nodes, edges } = createMockPipeline('multi-agent')
    expect(nodes.length).toBeGreaterThan(5)
    expect(edges.length).toBeGreaterThan(5)
  })

  it('creates deep-chain scenario', () => {
    const { nodes, edges } = createMockPipeline('deep-chain')
    const subAgents = nodes.filter(n => n.type === 'sub_agent')
    expect(subAgents.length).toBeGreaterThan(0)
  })

  it('all scenario nodes have valid types', () => {
    for (const name of ['research-agent', 'multi-agent', 'deep-chain'] as const) {
      const { nodes } = createMockPipeline(name)
      for (const n of nodes) {
        expect(['agent', 'sub_agent', 'tool', 'file']).toContain(n.type)
      }
    }
  })

  it('all scenario edges reference existing nodes', () => {
    for (const name of ['research-agent', 'multi-agent', 'deep-chain'] as const) {
      const { nodes, edges } = createMockPipeline(name)
      const ids = new Set(nodes.map(n => n.id))
      for (const e of edges) {
        expect(ids.has(e.source)).toBe(true)
        expect(ids.has(e.target)).toBe(true)
      }
    }
  })
})
