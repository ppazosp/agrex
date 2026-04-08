import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { AgrexNode, AgrexEdge, UseAgrexReturn } from '../types'

interface State {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
}

function createStore() {
  let state: State = { nodes: [], edges: [] }
  const listeners = new Set<() => void>()

  function emit() {
    listeners.forEach((l) => l())
  }

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    addNode: (node: AgrexNode) => {
      state = { ...state, nodes: [...state.nodes, node] }
      emit()
    },
    addNodes: (nodes: AgrexNode[]) => {
      state = { ...state, nodes: [...state.nodes, ...nodes] }
      emit()
    },
    updateNode: (id: string, updates: Partial<Pick<AgrexNode, 'status' | 'label' | 'metadata'>>) => {
      state = {
        ...state,
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      }
      emit()
    },
    removeNode: (id: string) => {
      state = { ...state, nodes: state.nodes.filter((n) => n.id !== id) }
      emit()
    },
    addEdge: (edge: AgrexEdge) => {
      state = { ...state, edges: [...state.edges, edge] }
      emit()
    },
    addEdges: (edges: AgrexEdge[]) => {
      state = { ...state, edges: [...state.edges, ...edges] }
      emit()
    },
    removeEdge: (id: string) => {
      state = { ...state, edges: state.edges.filter((e) => e.id !== id) }
      emit()
    },
    clear: () => {
      state = { nodes: [], edges: [] }
      emit()
    },
    loadJSON: (data: { nodes: AgrexNode[]; edges: AgrexEdge[] }) => {
      state = { nodes: [...data.nodes], edges: [...data.edges] }
      emit()
    },
  }
}

export function useAgrex(): UseAgrexReturn {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createStore()
  }
  const store = storeRef.current

  const state = useSyncExternalStore(store.subscribe, store.getState)

  return {
    nodes: state.nodes,
    edges: state.edges,
    addNode: useCallback((node: AgrexNode) => store.addNode(node), [store]),
    addNodes: useCallback((nodes: AgrexNode[]) => store.addNodes(nodes), [store]),
    updateNode: useCallback(
      (id: string, updates: Partial<Pick<AgrexNode, 'status' | 'label' | 'metadata'>>) =>
        store.updateNode(id, updates),
      [store],
    ),
    removeNode: useCallback((id: string) => store.removeNode(id), [store]),
    addEdge: useCallback((edge: AgrexEdge) => store.addEdge(edge), [store]),
    addEdges: useCallback((edges: AgrexEdge[]) => store.addEdges(edges), [store]),
    removeEdge: useCallback((id: string) => store.removeEdge(id), [store]),
    clear: useCallback(() => store.clear(), [store]),
    loadJSON: useCallback((data: { nodes: AgrexNode[]; edges: AgrexEdge[] }) => store.loadJSON(data), [store]),
  }
}
