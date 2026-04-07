import { describe, it, expect } from 'vitest'
import { radialLayout } from '../src/layout/radial'
import type { AgrexNode } from '../src/types'

function node(id: string, parentId?: string): AgrexNode {
  return { id, type: 'agent', label: id, parentId }
}

describe('radialLayout', () => {
  it('places root at origin', () => {
    const nodes = [node('root')]
    const positions = new Map<string, { x: number; y: number }>()
    const result = radialLayout(nodes, [], positions)
    expect(result.get('root')).toEqual({ x: 0, y: 0 })
  })

  it('places child further from origin than parent', () => {
    const nodes = [node('root'), node('child', 'root')]
    const positions = new Map<string, { x: number; y: number }>()
    const result = radialLayout(nodes, [], positions)
    const root = result.get('root')!
    const child = result.get('child')!
    expect(Math.hypot(child.x, child.y)).toBeGreaterThan(Math.hypot(root.x, root.y))
  })

  it('does not overlap nodes', () => {
    const nodes = [node('root'), node('a', 'root'), node('b', 'root'), node('c', 'root'), node('d', 'root'), node('e', 'root')]
    const positions = new Map<string, { x: number; y: number }>()
    const result = radialLayout(nodes, [], positions)
    const entries = [...result.entries()]
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [, a] = entries[i]
        const [, b] = entries[j]
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(99)
      }
    }
  })

  it('preserves existing positions', () => {
    const existing = new Map([['root', { x: 0, y: 0 }]])
    const nodes = [node('root'), node('child', 'root')]
    const result = radialLayout(nodes, [], existing)
    expect(result.get('root')).toEqual({ x: 0, y: 0 })
    expect(result.has('child')).toBe(true)
  })
})
