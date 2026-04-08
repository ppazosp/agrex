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
  UseAgrexReturn,
} from './types'

// Theme presets
export { darkTheme } from './theme/dark'
export { lightTheme } from './theme/light'
export { resolveTheme } from './theme/tokens'

// Layout — radialLayout is zero-dependency and always available
export { radialLayout } from './layout/radial'
// forceLayout and dagreLayout have external deps and are available
// via subpath imports to avoid bundling them when unused:
//   import { forceLayout } from 'agrex/layout/force'   // requires d3-force
//   import { dagreLayout } from 'agrex/layout/dagre'    // requires @dagrejs/dagre

// Node components (for advanced customization)
export { default as AgentNode } from './nodes/AgentNode'
export { default as SubAgentNode } from './nodes/SubAgentNode'
export { default as ToolNode } from './nodes/ToolNode'
export { default as FileNode } from './nodes/FileNode'
export { default as DefaultNode } from './nodes/DefaultNode'
export { default as NodeBadge } from './nodes/NodeBadge'
