import { describe, it, expect } from 'vitest'
import { radialLayout } from '../layout/radial'
import type { AgrexNode } from '../types'

describe('radialLayout', () => {
  it('places root node at origin', () => {
    const nodes: AgrexNode[] = [{ id: 'root', type: 'agent', label: 'Root' }]
    const positions = radialLayout(nodes, [], new Map())
    expect(positions.get('root')).toEqual({ x: 0, y: 0 })
  })

  it('places child nodes around parent', () => {
    const nodes: AgrexNode[] = [
      { id: 'child', type: 'tool', label: 'Tool', parentId: 'root' },
    ]
    const existing = new Map([['root', { x: 0, y: 0 }]])
    const positions = radialLayout(nodes, [], existing)
    const childPos = positions.get('child')
    expect(childPos).toBeDefined()
    // Child should be offset from parent, not at origin
    const dist = Math.hypot(childPos!.x, childPos!.y)
    expect(dist).toBeGreaterThan(0)
  })

  it('preserves existing positions', () => {
    const nodes: AgrexNode[] = [{ id: 'new', type: 'tool', label: 'New', parentId: 'root' }]
    const existing = new Map([['root', { x: 100, y: 200 }]])
    const positions = radialLayout(nodes, [], existing)
    // Should place the new node
    expect(positions.has('new')).toBe(true)
    // Root position should remain unchanged
    expect(positions.get('root')).toEqual({ x: 100, y: 200 })
  })
})
