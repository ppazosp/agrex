import { describe, it, expect } from 'vitest'
import type { AgrexNode, AgrexEdge } from '../types'

describe('AgrexNode', () => {
  it('accepts built-in types', () => {
    const node: AgrexNode = { id: '1', type: 'agent', label: 'Researcher' }
    expect(node.type).toBe('agent')
  })

  it('accepts custom type strings', () => {
    const node: AgrexNode = { id: '2', type: 'my_custom_type', label: 'Custom' }
    expect(node.type).toBe('my_custom_type')
  })

  it('accepts optional fields', () => {
    const node: AgrexNode = {
      id: '3', type: 'tool', label: 'Search',
      parentId: '1', status: 'running',
      metadata: { query: 'hello', results: ['a', 'b'] },
    }
    expect(node.status).toBe('running')
    expect(node.parentId).toBe('1')
    expect(node.metadata?.query).toBe('hello')
  })

  it('defaults status to undefined when not set', () => {
    const node: AgrexNode = { id: '4', type: 'agent', label: 'Test' }
    expect(node.status).toBeUndefined()
  })

  it('accepts reads and writes arrays', () => {
    const node: AgrexNode = {
      id: '5', type: 'tool', label: 'read_file',
      reads: ['f1', 'f2'], writes: ['f3'],
    }
    expect(node.reads).toEqual(['f1', 'f2'])
    expect(node.writes).toEqual(['f3'])
  })
})

describe('AgrexEdge', () => {
  it('accepts built-in types', () => {
    const edge: AgrexEdge = { id: 'e1', source: '1', target: '2', type: 'spawn' }
    expect(edge.type).toBe('spawn')
  })

  it('accepts custom type strings', () => {
    const edge: AgrexEdge = { id: 'e2', source: '1', target: '2', type: 'data_flow' }
    expect(edge.type).toBe('data_flow')
  })
})
