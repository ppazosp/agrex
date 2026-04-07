import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgrex } from '../src/hooks/useAgrex'
import type { AgrexNode, AgrexEdge } from '../src/types'

const mockNode = (id: string, parentId?: string): AgrexNode => ({
  id, type: 'agent', label: `Agent ${id}`, parentId,
})

const mockEdge = (source: string, target: string): AgrexEdge => ({
  id: `${source}-${target}`, source, target, type: 'spawn',
})

describe('useAgrex', () => {
  it('starts with empty nodes and edges', () => {
    const { result } = renderHook(() => useAgrex())
    expect(result.current.nodes).toEqual([])
    expect(result.current.edges).toEqual([])
  })

  it('adds a node', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addNode(mockNode('1')))
    expect(result.current.nodes).toHaveLength(1)
    expect(result.current.nodes[0].id).toBe('1')
  })

  it('adds multiple nodes at once', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addNodes([mockNode('1'), mockNode('2')]))
    expect(result.current.nodes).toHaveLength(2)
  })

  it('updates a node', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addNode(mockNode('1')))
    act(() => result.current.updateNode('1', { status: 'done' }))
    expect(result.current.nodes[0].status).toBe('done')
  })

  it('removes a node', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addNode(mockNode('1')))
    act(() => result.current.removeNode('1'))
    expect(result.current.nodes).toHaveLength(0)
  })

  it('adds an edge', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addEdge(mockEdge('1', '2')))
    expect(result.current.edges).toHaveLength(1)
  })

  it('adds multiple edges at once', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addEdges([mockEdge('1', '2'), mockEdge('2', '3')]))
    expect(result.current.edges).toHaveLength(2)
  })

  it('removes an edge', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addEdge(mockEdge('1', '2')))
    act(() => result.current.removeEdge('1-2'))
    expect(result.current.edges).toHaveLength(0)
  })

  it('clears all state', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode(mockNode('1'))
      result.current.addEdge(mockEdge('1', '2'))
    })
    act(() => result.current.clear())
    expect(result.current.nodes).toHaveLength(0)
    expect(result.current.edges).toHaveLength(0)
  })
})
