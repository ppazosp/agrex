import { describe, it, expect, vi, afterEach } from 'vitest'
import { radialLayout } from '../layout/radial'
import type { AgrexNode } from '../types'

describe('radialLayout', () => {
  it('places root node at origin', () => {
    const nodes: AgrexNode[] = [{ id: 'root', type: 'agent', label: 'Root' }]
    const positions = radialLayout(nodes, [], new Map())
    expect(positions.get('root')).toEqual({ x: 0, y: 0 })
  })

  it('places child nodes around parent', () => {
    const nodes: AgrexNode[] = [{ id: 'child', type: 'tool', label: 'Tool', parentId: 'root' }]
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

  describe('placeRoot (disconnected root with existing nodes)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('places a parentless node when positions already exist', () => {
      const nodes: AgrexNode[] = [{ id: 'second', type: 'agent', label: 'Second' }]
      const existing = new Map([['first', { x: 0, y: 0 }]])
      const positions = radialLayout(nodes, [], existing)
      expect(positions.has('second')).toBe(true)
      const pos = positions.get('second')!
      expect(Math.hypot(pos.x, pos.y)).toBeGreaterThan(0)
    })

    it('maintains minimum distance from all existing nodes', () => {
      // Seed random to point toward the cluster, forcing push-out
      vi.spyOn(Math, 'random').mockReturnValue(0) // angle = 0 → points right
      const existing = new Map([
        ['a', { x: 0, y: 0 }],
        ['b', { x: 200, y: 0 }],
        ['c', { x: 100, y: 150 }],
      ])
      const nodes: AgrexNode[] = [{ id: 'new', type: 'agent', label: 'New' }]
      const positions = radialLayout(nodes, [], existing)
      const newPos = positions.get('new')!
      for (const [id, pos] of existing) {
        const dist = Math.hypot(newPos.x - pos.x, newPos.y - pos.y)
        expect(dist, `too close to ${id}`).toBeGreaterThanOrEqual(300)
      }
    })

    it('computes centroid correctly for placement', () => {
      // angle = 0 → cos(0)=1, sin(0)=0 → placed at centroid.x + 600
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const existing = new Map([
        ['a', { x: 0, y: 0 }],
        ['b', { x: 300, y: 0 }],
        ['c', { x: 150, y: 300 }],
      ])
      // centroid = (150, 100)
      const nodes: AgrexNode[] = [{ id: 'new', type: 'agent', label: 'New' }]
      const positions = radialLayout(nodes, [], existing)
      const pos = positions.get('new')!
      // Should be at roughly (150 + 600, 100) = (750, 100), possibly pushed further
      expect(pos.x).toBeGreaterThanOrEqual(750)
      expect(Math.abs(pos.y - 100)).toBeLessThan(1)
    })

    it('terminates with dense node arrangement along push direction', () => {
      // Create a dense line of nodes along angle 0 (x-axis) to stress the push-out loop
      vi.spyOn(Math, 'random').mockReturnValue(0) // angle = 0
      const existing = new Map<string, { x: number; y: number }>()
      for (let i = 0; i < 50; i++) {
        existing.set(`n${i}`, { x: i * 100, y: 0 })
      }
      const nodes: AgrexNode[] = [{ id: 'new', type: 'agent', label: 'New' }]
      // Should not hang — iteration cap guarantees termination
      const positions = radialLayout(nodes, [], existing)
      expect(positions.has('new')).toBe(true)
    })

    it('places multiple new roots without overlap', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0) // first root: angle = 0
        .mockReturnValueOnce(0.5) // second root: angle = π

      const existing = new Map([['origin', { x: 0, y: 0 }]])
      const nodes: AgrexNode[] = [
        { id: 'r1', type: 'agent', label: 'R1' },
        { id: 'r2', type: 'agent', label: 'R2' },
      ]
      const positions = radialLayout(nodes, [], existing)
      expect(positions.has('r1')).toBe(true)
      expect(positions.has('r2')).toBe(true)

      const r1 = positions.get('r1')!
      const r2 = positions.get('r2')!
      const dist = Math.hypot(r1.x - r2.x, r1.y - r2.y)
      expect(dist).toBeGreaterThanOrEqual(300)
    })
  })

  it('does not overlap nodes', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'root' },
      { id: 'a', type: 'agent', label: 'a', parentId: 'root' },
      { id: 'b', type: 'agent', label: 'b', parentId: 'root' },
      { id: 'c', type: 'agent', label: 'c', parentId: 'root' },
      { id: 'd', type: 'agent', label: 'd', parentId: 'root' },
      { id: 'e', type: 'agent', label: 'e', parentId: 'root' },
    ]
    const result = radialLayout(nodes, [], new Map())
    const entries = [...result.entries()]
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [, a] = entries[i]
        const [, b] = entries[j]
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(99)
      }
    }
  })
})
