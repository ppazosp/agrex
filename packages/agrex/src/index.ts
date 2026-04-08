'use client'

// Main component
export { default as Agrex } from './components/Agrex'

// Hook
export { useAgrex } from './hooks/useAgrex'

// Types
export type {
  AgrexNode,
  AgrexEdge,
  AgrexProps,
  AgrexNodeProps,
  AgrexHandle,
  NodeStatus,
  ThemeObject,
  Theme,
  ResolvedTheme,
  LayoutFn,
  Layout,
  UseAgrexReturn,
} from './types'

// Theme presets
export { darkTheme } from './theme/dark'
export { lightTheme } from './theme/light'
export { resolveTheme } from './theme/tokens'

// Layout
export { radialLayout } from './layout/radial'
export { forceLayout } from './layout/force'
// ELK layouts are async and don't conform to the synchronous LayoutFn type.
// Use them manually: const positions = await elkStressLayout(nodes, edges, existing)
export { elkStressLayout, elkFullRelayout } from './layout/elk'
export { dagreLayout } from './layout/dagre'

// Node components (for advanced customization)
export { default as AgentNode } from './nodes/AgentNode'
export { default as SubAgentNode } from './nodes/SubAgentNode'
export { default as ToolNode } from './nodes/ToolNode'
export { default as FileNode } from './nodes/FileNode'
export { default as DefaultNode } from './nodes/DefaultNode'
export { default as NodeBadge } from './nodes/NodeBadge'
