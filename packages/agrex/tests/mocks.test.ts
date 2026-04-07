import { describe, it, expect, vi } from 'vitest'
import { createMockNode, createMockEdge } from '../src/mocks/generators'
import { createMockPipeline } from '../src/mocks/scenarios'
import { replay } from '../src/mocks/replay'
import type { UseAgrexReturn } from '../src/types'

describe('generators', () => {
  it('creates a node with defaults', () => {
    const node = createMockNode({ type: 'agent', label: 'Test' })
    expect(node.id).toBeTruthy()
    expect(node.type).toBe('agent')
    expect(node.label).toBe('Test')
    expect(node.status).toBe('idle')
  })

  it('creates a node with overrides', () => {
    const node = createMockNode({ id: 'custom', type: 'tool', label: 'Search', status: 'running' })
    expect(node.id).toBe('custom')
    expect(node.status).toBe('running')
  })

  it('creates an edge with defaults', () => {
    const edge = createMockEdge({ source: 'a', target: 'b' })
    expect(edge.id).toBe('a-b')
    expect(edge.type).toBe('spawn')
  })
})

describe('scenarios', () => {
  it('creates research-agent scenario', () => {
    const { nodes, edges } = createMockPipeline('research-agent')
    expect(nodes.length).toBeGreaterThan(0)
    expect(edges.length).toBeGreaterThan(0)
  })

  it('creates multi-agent scenario', () => {
    const { nodes, edges } = createMockPipeline('multi-agent')
    expect(nodes.length).toBeGreaterThan(5)
  })

  it('creates deep-chain scenario', () => {
    const { nodes, edges } = createMockPipeline('deep-chain')
    expect(nodes.length).toBeGreaterThan(3)
  })
})

describe('replay', () => {
  it('drips nodes and edges over time', async () => {
    vi.useFakeTimers()
    const { nodes, edges } = createMockPipeline('research-agent')

    const instance: Pick<UseAgrexReturn, 'addNode' | 'addEdge' | 'updateNode' | 'clear'> = {
      addNode: vi.fn(),
      addEdge: vi.fn(),
      updateNode: vi.fn(),
      clear: vi.fn(),
    }

    replay(instance, { nodes, edges })

    for (let i = 0; i < nodes.length + edges.length; i++) {
      await vi.advanceTimersByTimeAsync(200)
    }

    expect(instance.addNode).toHaveBeenCalled()
    expect(instance.addEdge).toHaveBeenCalled()

    vi.useRealTimers()
  })
})
