import { describe, it, expect } from 'vitest'
import { deriveEdges } from '../deriveEdges'
import type { AgrexNode, AgrexEdge } from '../types'

describe('deriveEdges', () => {
  it('returns explicit edges unchanged when no derivable fields', () => {
    const nodes: AgrexNode[] = [
      { id: 'a', type: 'agent', label: 'Agent' },
      { id: 'b', type: 'tool', label: 'Tool' },
    ]
    const edges: AgrexEdge[] = [{ id: 'e1', source: 'a', target: 'b', type: 'spawn' }]
    const result = deriveEdges(nodes, edges)
    expect(result).toBe(edges) // same reference when no derivations
  })

  it('generates spawn edges from parentId', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Root' },
      { id: 't1', type: 'tool', label: 'Tool', parentId: 'root' },
      { id: 't2', type: 'tool', label: 'Tool2', parentId: 'root' },
    ]
    const result = deriveEdges(nodes, [])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: '_spawn_root_t1', source: 'root', target: 't1', type: 'spawn',
    })
    expect(result[1]).toEqual({
      id: '_spawn_root_t2', source: 'root', target: 't2', type: 'spawn',
    })
  })

  it('generates read edges from reads', () => {
    const nodes: AgrexNode[] = [
      { id: 'f1', type: 'file', label: 'data.json' },
      { id: 't1', type: 'tool', label: 'read_file', reads: ['f1'] },
    ]
    const result = deriveEdges(nodes, [])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: '_read_f1_t1', source: 'f1', target: 't1', type: 'read',
    })
  })

  it('generates write edges from writes', () => {
    const nodes: AgrexNode[] = [
      { id: 't1', type: 'tool', label: 'write_file', writes: ['f1'] },
      { id: 'f1', type: 'file', label: 'output.md' },
    ]
    const result = deriveEdges(nodes, [])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: '_write_t1_f1', source: 't1', target: 'f1', type: 'write',
    })
  })

  it('combines parentId, reads, and writes edges', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Agent' },
      { id: 'wf', type: 'tool', label: 'write_file', parentId: 'root', writes: ['f1'] },
      { id: 'f1', type: 'file', label: 'data.json', parentId: 'wf' },
      { id: 'rf', type: 'tool', label: 'read_file', parentId: 'root', reads: ['f1'] },
    ]
    const result = deriveEdges(nodes, [])
    const types = result.map(e => e.type)
    expect(types).toContain('spawn')
    expect(types).toContain('write')
    expect(types).toContain('read')
    expect(result).toHaveLength(5) // 3 spawn + 1 write + 1 read
  })

  it('does not duplicate edges that already exist explicitly', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Root' },
      { id: 't1', type: 'tool', label: 'Tool', parentId: 'root' },
    ]
    const explicit: AgrexEdge[] = [
      { id: 'manual', source: 'root', target: 't1', type: 'spawn' },
    ]
    const result = deriveEdges(nodes, explicit)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('manual') // keeps the explicit edge
  })

  it('handles multiple reads and writes on one node', () => {
    const nodes: AgrexNode[] = [
      { id: 'f1', type: 'file', label: 'a.json' },
      { id: 'f2', type: 'file', label: 'b.json' },
      { id: 'f3', type: 'file', label: 'c.json' },
      { id: 't1', type: 'tool', label: 'process', reads: ['f1', 'f2'], writes: ['f3'] },
    ]
    const result = deriveEdges(nodes, [])
    expect(result).toHaveLength(3) // 2 read + 1 write
  })

  it('returns empty when no nodes', () => {
    const result = deriveEdges([], [])
    expect(result).toEqual([])
  })

  it('preserves explicit edges alongside derived ones', () => {
    const nodes: AgrexNode[] = [
      { id: 'root', type: 'agent', label: 'Root' },
      { id: 't1', type: 'tool', label: 'Tool', parentId: 'root' },
    ]
    const explicit: AgrexEdge[] = [
      { id: 'custom', source: 'root', target: 't1', type: 'custom' },
    ]
    const result = deriveEdges(nodes, explicit)
    expect(result).toHaveLength(2) // 1 explicit custom + 1 derived spawn
    expect(result[0].id).toBe('custom')
    expect(result[1].type).toBe('spawn')
  })

  it('skips spawn edge when parentId references non-existent node', () => {
    const nodes: AgrexNode[] = [
      { id: 't1', type: 'tool', label: 'Tool', parentId: 'ghost' },
    ]
    const result = deriveEdges(nodes, [])
    expect(result).toHaveLength(0)
  })

  it('skips read/write edges referencing non-existent nodes', () => {
    const nodes: AgrexNode[] = [
      { id: 't1', type: 'tool', label: 'Reader', reads: ['ghost'] },
      { id: 't2', type: 'tool', label: 'Writer', writes: ['phantom'] },
    ]
    const result = deriveEdges(nodes, [])
    expect(result).toHaveLength(0)
  })

  it('generates valid edges and skips phantom ones in same node', () => {
    const nodes: AgrexNode[] = [
      { id: 'f1', type: 'file', label: 'data.json' },
      { id: 't1', type: 'tool', label: 'process', reads: ['f1', 'ghost'], writes: ['f1', 'missing'] },
    ]
    const result = deriveEdges(nodes, [])
    expect(result).toHaveLength(2) // 1 read from f1, 1 write to f1
    expect(result.every(e => e.source !== 'ghost' && e.target !== 'ghost')).toBe(true)
    expect(result.every(e => e.source !== 'missing' && e.target !== 'missing')).toBe(true)
  })
})
