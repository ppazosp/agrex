import { describe, it, expect } from 'vitest'
import { forceLayout } from '../layout/force'
import type { AgrexNode, AgrexEdge } from '../types'

describe('forceLayout', () => {
  it('places root node at origin area', () => {
    const nodes: AgrexNode[] = [{ id: 'root', type: 'agent', label: 'Root' }]
    const positions = forceLayout(nodes, [], new Map())
    const root = positions.get('root')
    expect(root).toBeDefined()
    // After simulation, root should be near origin (pulled by centering forces)
    expect(Math.abs(root!.x)).toBeLessThan(50)
    expect(Math.abs(root!.y)).toBeLessThan(50)
  })

  it('places connected nodes apart but not too far', () => {
    const nodes: AgrexNode[] = [
      { id: 'a', type: 'agent', label: 'Agent' },
      { id: 'b', type: 'tool', label: 'Tool', parentId: 'a' },
    ]
    const edges: AgrexEdge[] = [
      { id: 'e1', source: 'a', target: 'b', type: 'spawn' },
    ]
    const positions = forceLayout(nodes, edges, new Map())
    const posA = positions.get('a')!
    const posB = positions.get('b')!
    const dist = Math.hypot(posA.x - posB.x, posA.y - posB.y)
    // Should be separated by at least node size + padding
    expect(dist).toBeGreaterThan(30)
    // But not ridiculously far
    expect(dist).toBeLessThan(600)
  })

  it('returns existing positions unchanged when no new nodes', () => {
    const existing = new Map([['a', { x: 100, y: 200 }]])
    const nodes: AgrexNode[] = [{ id: 'a', type: 'agent', label: 'Agent' }]
    const positions = forceLayout(nodes, [], existing)
    expect(positions.get('a')).toEqual({ x: 100, y: 200 })
  })

  it('pins existing nodes and only moves new ones', () => {
    const existing = new Map([['root', { x: 0, y: 0 }]])
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Root' },
      { id: 't1', type: 'tool', label: 'Tool', parentId: 'root' },
    ]
    const edges: AgrexEdge[] = [
      { id: 'e1', source: 'root', target: 't1', type: 'spawn' },
    ]
    const positions = forceLayout(nodes, edges, existing)
    // Root should stay at origin (pinned)
    expect(positions.get('root')).toEqual({ x: 0, y: 0 })
    // New node should be placed
    expect(positions.has('t1')).toBe(true)
  })

  it('produces no overlapping nodes for multiple children', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Root' },
      { id: 'a', type: 'tool', label: 'A', parentId: 'root' },
      { id: 'b', type: 'tool', label: 'B', parentId: 'root' },
      { id: 'c', type: 'tool', label: 'C', parentId: 'root' },
      { id: 'd', type: 'tool', label: 'D', parentId: 'root' },
    ]
    const edges: AgrexEdge[] = nodes.slice(1).map(n => ({
      id: `e-${n.id}`, source: 'root', target: n.id, type: 'spawn' as const,
    }))
    const positions = forceLayout(nodes, edges, new Map())
    const entries = [...positions.entries()]
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [, a] = entries[i]
        const [, b] = entries[j]
        // Min distance should be at least node size (36px tool) - allow small tolerance
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(20)
      }
    }
  })
})
