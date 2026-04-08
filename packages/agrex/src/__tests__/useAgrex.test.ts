import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgrex } from '../hooks/useAgrex'

describe('useAgrex', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useAgrex())
    expect(result.current.nodes).toEqual([])
    expect(result.current.edges).toEqual([])
  })

  it('addNode appends a node', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode({ id: 'a', type: 'agent', label: 'Agent' })
    })
    expect(result.current.nodes).toHaveLength(1)
    expect(result.current.nodes[0].id).toBe('a')
  })

  it('addNodes appends multiple nodes', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNodes([
        { id: 'a', type: 'agent', label: 'Agent' },
        { id: 'b', type: 'tool', label: 'Tool' },
      ])
    })
    expect(result.current.nodes).toHaveLength(2)
  })

  it('updateNode changes status', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode({ id: 'a', type: 'agent', label: 'Agent', status: 'idle' })
    })
    act(() => {
      result.current.updateNode('a', { status: 'running' })
    })
    expect(result.current.nodes[0].status).toBe('running')
  })

  it('updateNode changes label and metadata', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode({ id: 'a', type: 'agent', label: 'Old' })
    })
    act(() => {
      result.current.updateNode('a', { label: 'New', metadata: { key: 'val' } })
    })
    expect(result.current.nodes[0].label).toBe('New')
    expect(result.current.nodes[0].metadata).toEqual({ key: 'val' })
  })

  it('removeNode removes a node', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode({ id: 'a', type: 'agent', label: 'Agent' })
      result.current.addNode({ id: 'b', type: 'tool', label: 'Tool' })
    })
    act(() => {
      result.current.removeNode('a')
    })
    expect(result.current.nodes).toHaveLength(1)
    expect(result.current.nodes[0].id).toBe('b')
  })

  it('addEdge appends an edge', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addEdge({ id: 'e1', source: 'a', target: 'b' })
    })
    expect(result.current.edges).toHaveLength(1)
    expect(result.current.edges[0].id).toBe('e1')
  })

  it('addEdges appends multiple edges', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addEdges([
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
      ])
    })
    expect(result.current.edges).toHaveLength(2)
  })

  it('removeEdge removes an edge', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addEdge({ id: 'e1', source: 'a', target: 'b' })
      result.current.addEdge({ id: 'e2', source: 'b', target: 'c' })
    })
    act(() => {
      result.current.removeEdge('e1')
    })
    expect(result.current.edges).toHaveLength(1)
    expect(result.current.edges[0].id).toBe('e2')
  })

  it('clear resets everything', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode({ id: 'a', type: 'agent', label: 'Agent' })
      result.current.addEdge({ id: 'e1', source: 'a', target: 'b' })
    })
    act(() => {
      result.current.clear()
    })
    expect(result.current.nodes).toEqual([])
    expect(result.current.edges).toEqual([])
  })

  it('loadJSON replaces all state', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode({ id: 'old', type: 'agent', label: 'Old' })
    })
    act(() => {
      result.current.loadJSON({
        nodes: [{ id: 'new1', type: 'tool', label: 'T1' }, { id: 'new2', type: 'file', label: 'F1' }],
        edges: [{ id: 'e1', source: 'new1', target: 'new2' }],
      })
    })
    expect(result.current.nodes).toHaveLength(2)
    expect(result.current.nodes[0].id).toBe('new1')
    expect(result.current.edges).toHaveLength(1)
  })

  it('preserves store identity across renders', () => {
    const { result, rerender } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode({ id: 'a', type: 'agent', label: 'Agent' })
    })
    rerender()
    expect(result.current.nodes).toHaveLength(1)
  })
})
