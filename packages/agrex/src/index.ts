'use client'

// Main component
export { default as Agrex } from './components/Agrex'

// Hook
export { useAgrex } from './hooks/useAgrex'

// Trace utilities — exchange formats between snapshot and event stream.
// Also available at the `/trace` subpath for tree-shaken consumers.
export { snapshotToEvents, parseTrace, TraceParseError } from './trace'
export type { TraceFormat } from './trace'

// Replay engine (new in 0.2.0) — events-driven time travel over the agrex store.
export { useAgrexReplay } from './replay/useAgrexReplay'
export { default as AgrexTimeline } from './replay/AgrexTimeline'
export {
  coreReducers,
  composeReducers,
  applyEvents,
  applyEventRange,
  defaultStepBoundaries,
  DEFAULT_BOUNDARY_TYPES,
} from './replay/reduceEvents'

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

// Replay types
export type {
  AgrexEvent,
  AgrexMarker,
  ReplayMode,
  EventReducer,
  ReducerStore,
  UseAgrexReplay,
  UseAgrexReplayOptions,
  AgrexTimelineProps,
  TimelinePlacement,
  TimelineInsets,
} from './replay/types'

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

// Composable UI pieces (rendered internally by <Agrex>; re-exported for
// consumers who want to assemble their own layout).
export { default as Graph } from './components/Graph'
export { default as Legend } from './components/Legend'
export { default as DetailPanel } from './components/DetailPanel'
export { default as NodeTooltip } from './components/NodeTooltip'
export { default as StatsBar } from './components/StatsBar'
export { default as ToastStack } from './components/Toast'
export { default as Controls } from './components/Controls'
export { default as AgrexErrorBoundary } from './components/ErrorBoundary'

// Node components (for advanced customization)
export { default as AgentNode } from './nodes/AgentNode'
export { default as SubAgentNode } from './nodes/SubAgentNode'
export { default as ToolNode } from './nodes/ToolNode'
export { default as FileNode } from './nodes/FileNode'
export { default as DefaultNode } from './nodes/DefaultNode'
export { default as NodeBadge } from './nodes/NodeBadge'
