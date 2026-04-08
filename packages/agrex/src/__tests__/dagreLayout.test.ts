import { describe, it, expect, vi } from 'vitest'
import { dagreLayout } from '../layout/dagre'
import type { AgrexNode, AgrexEdge } from '../types'

describe('dagreLayout', () => {
  it('returns positions for all nodes', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Root' },
      { id: 't1', type: 'tool', label: 'Tool', parentId: 'root' },
      { id: 'f1', type: 'file', label: 'File', parentId: 't1' },
    ]
    const edges: AgrexEdge[] = [
      { id: 'e1', source: 'root', target: 't1', type: 'spawn' },
      { id: 'e2', source: 't1', target: 'f1', type: 'spawn' },
    ]
    const positions = dagreLayout(nodes, edges)
    expect(positions.size).toBe(3)
    for (const node of nodes) {
      const pos = positions.get(node.id)
      expect(pos).toBeDefined()
      expect(typeof pos!.x).toBe('number')
      expect(typeof pos!.y).toBe('number')
    }
  })

  it('places nodes in hierarchical order (TB)', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Root' },
      { id: 'child', type: 'tool', label: 'Child', parentId: 'root' },
    ]
    const edges: AgrexEdge[] = [{ id: 'e1', source: 'root', target: 'child', type: 'spawn' }]
    const positions = dagreLayout(nodes, edges, undefined, 'TB')
    expect(positions.get('root')!.y).toBeLessThan(positions.get('child')!.y)
  })

  it('handles LR direction', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Root' },
      { id: 'child', type: 'tool', label: 'Child', parentId: 'root' },
    ]
    const edges: AgrexEdge[] = [{ id: 'e1', source: 'root', target: 'child', type: 'spawn' }]
    const positions = dagreLayout(nodes, edges, undefined, 'LR')
    expect(positions.get('root')!.x).toBeLessThan(positions.get('child')!.x)
  })

  it('falls back to grid layout when dagre throws', async () => {
    // Import dagre to mock it
    const dagre = await import('@dagrejs/dagre')
    const layoutSpy = vi.spyOn(dagre.default, 'layout').mockImplementationOnce(() => {
      throw new Error('test error')
    })

    const nodes: AgrexNode[] = [
      { id: 'a', type: 'agent', label: 'A' },
      { id: 'b', type: 'tool', label: 'B' },
      { id: 'c', type: 'file', label: 'C' },
    ]
    const positions = dagreLayout(nodes, [])
    expect(positions.size).toBe(3)
    for (const node of nodes) {
      expect(positions.has(node.id)).toBe(true)
    }

    layoutSpy.mockRestore()
  })
})
