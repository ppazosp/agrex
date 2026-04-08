import type React from 'react'

/** A node in the agent execution graph. */
export interface AgrexNode {
  id: string
  type: 'agent' | 'sub_agent' | 'tool' | 'file' | (string & {})
  label: string
  parentId?: string
  status?: 'idle' | 'running' | 'done' | 'error'
  metadata?: Record<string, unknown>
}

export interface AgrexEdge {
  id: string
  source: string
  target: string
  type?: 'spawn' | 'read' | 'write' | (string & {})
  label?: string
}

export type NodeStatus = 'idle' | 'running' | 'done' | 'error'

export interface ThemeObject {
  background?: string
  foreground?: string
  accent?: string
  nodeFill?: string
  nodeBorder?: string
  nodeIcon?: string
  edgeDefault?: string
  edgeSpawn?: string
  edgeWrite?: string
  edgeRead?: string
  statusRunning?: string
  statusDone?: string
  statusError?: string
  fontFamily?: string
  fontMono?: string
  animationDuration?: string
}

export type Theme = 'dark' | 'light' | 'auto' | ThemeObject

export type LayoutFn = (
  nodes: AgrexNode[],
  edges: AgrexEdge[],
  positions: Map<string, { x: number; y: number }>,
) => Map<string, { x: number; y: number }>

export type Layout = 'radial' | 'force' | LayoutFn

export interface AgrexProps {
  nodes?: AgrexNode[]
  edges?: AgrexEdge[]
  instance?: UseAgrexReturn
  onNodeClick?: (node: AgrexNode) => void
  onEdgeClick?: (edge: AgrexEdge) => void
  theme?: Theme
  layout?: Layout
  nodeRenderers?: Record<string, React.ComponentType<AgrexNodeProps>>
  toolIcons?: Record<string, React.ComponentType<{ size: number }>>
  fileIcons?: Record<string, React.ComponentType<{ size: number }>>
  edgeColors?: Record<string, string>
  className?: string
  showControls?: boolean
  showLegend?: boolean
  showToasts?: boolean
  showDetailPanel?: boolean
  showMinimap?: boolean
  showStats?: boolean
  fitOnUpdate?: boolean
  keyboardShortcuts?: boolean
  animateEdges?: boolean
}

export interface AgrexNodeProps {
  node: AgrexNode
  status: NodeStatus
  theme: ResolvedTheme
}

export interface ResolvedTheme {
  background: string
  foreground: string
  accent: string
  nodeFill: string
  nodeBorder: string
  nodeIcon: string
  edgeDefault: string
  edgeSpawn: string
  edgeWrite: string
  edgeRead: string
  statusRunning: string
  statusDone: string
  statusError: string
  fontFamily: string
  fontMono: string
  animationDuration: string
}

export interface UseAgrexReturn {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
  addNode: (node: AgrexNode) => void
  addNodes: (nodes: AgrexNode[]) => void
  updateNode: (id: string, updates: Partial<Pick<AgrexNode, 'status' | 'label' | 'metadata'>>) => void
  removeNode: (id: string) => void
  addEdge: (edge: AgrexEdge) => void
  addEdges: (edges: AgrexEdge[]) => void
  removeEdge: (id: string) => void
  clear: () => void
  loadJSON: (data: { nodes: AgrexNode[]; edges: AgrexEdge[] }) => void
}

export interface AgrexHandle {
  fitView: () => void
  collapseAll: () => void
  expandAll: () => void
  toJSON: () => { nodes: AgrexNode[]; edges: AgrexEdge[] }
}
