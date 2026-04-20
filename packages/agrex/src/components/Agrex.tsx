import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Graph, { type GraphRef } from './Graph'
import Legend from './Legend'
import NodeTooltip from './NodeTooltip'
import ToastStack from './Toast'
import StatsBar from './StatsBar'
import AgrexErrorBoundary from './ErrorBoundary'
import AgrexTimeline from '../replay/AgrexTimeline'
import { resolveTheme, themeToCSS } from '../theme/tokens'
import type { AgrexNode, AgrexProps, AgrexHandle } from '../types'
import { deriveEdges } from '../deriveEdges'
import '../styles/agrex.css'

function useMediaQuery(query: string, fallback: boolean): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return fallback
    return window.matchMedia?.(query)?.matches ?? fallback
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia?.(query)
    if (!mq?.addEventListener) return
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

const Agrex = forwardRef<AgrexHandle, AgrexProps>(function Agrex(
  {
    nodes: staticNodes,
    edges: staticEdges,
    instance,
    onNodeClick,
    onEdgeClick,
    theme: themeProp,
    nodeRenderers,
    toolIcons,
    fileIcons,
    edgeColors,
    className,
    showControls = true,
    showLegend = true,
    showToasts = true,
    toastPlacement = 'top-left',
    toastInsets,
    showDetailPanel = true,
    showStats = false,
    fitOnUpdate = true,
    keyboardShortcuts = true,
    animateEdges = true,
    replay,
    showTimeline = true,
    timelinePlacement = 'bottom',
    timelineInsets,
    timelineProps,
  },
  ref,
) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', true)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', false)
  const theme = useMemo(
    () => (themeProp === 'auto' ? resolveTheme(prefersDark ? 'dark' : 'light') : resolveTheme(themeProp)),
    [themeProp, prefersDark],
  )
  // Precedence: explicit `instance` > `replay.instance` > static props. Passing
  // both `replay` and `instance` is legal for advanced cases (e.g. driving the
  // graph from a non-replay store while still rendering a timeline).
  const effectiveInstance = instance ?? replay?.instance
  const rawNodes = effectiveInstance?.nodes ?? staticNodes ?? []
  const rawEdges = effectiveInstance?.edges ?? staticEdges ?? []
  const nodes = rawNodes
  const edges = useMemo(() => deriveEdges(rawNodes, rawEdges), [rawNodes, rawEdges])

  const [toastNode, setToastNode] = useState<AgrexNode | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = useMemo(
    () => (selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null),
    [nodes, selectedNodeId],
  )
  // Keep the last rendered node around for one extra exit-transition frame so the
  // NodeTooltip can animate out with its data still visible instead of snapping empty.
  const [lastSelectedNode, setLastSelectedNode] = useState<AgrexNode | null>(null)
  useEffect(() => {
    if (selectedNode) setLastSelectedNode(selectedNode)
  }, [selectedNode])
  const detailOpen = showDetailPanel && !!selectedNode
  const graphRef = useRef<GraphRef>(null)

  useImperativeHandle(
    ref,
    () => ({
      fitView: () => graphRef.current?.fitView(),
      collapseAll: () => graphRef.current?.collapseAll(),
      expandAll: () => graphRef.current?.expandAll(),
      toJSON: () => ({ nodes, edges }),
    }),
    [nodes, edges],
  )

  const handleNodeClick = useCallback((node: AgrexNode) => onNodeClick?.(node), [onNodeClick])

  const handleNewestNode = useCallback(
    (node: AgrexNode) => {
      if (!showToasts) return
      // Each new reference triggers a toast in the stack
      setToastNode({ ...node })
    },
    [showToasts],
  )

  const cssVars = useMemo(() => themeToCSS(theme) as Record<string, string>, [theme])

  return (
    <AgrexErrorBoundary resetKey={nodes.length}>
      <div
        style={
          {
            width: '100%',
            height: '100%',
            position: 'relative',
            fontFamily: theme.fontFamily,
            ...cssVars,
          } as React.CSSProperties
        }
        className={className ? `agrex ${className}` : 'agrex'}
      >
        <Graph
          ref={graphRef}
          nodes={nodes}
          edges={edges}
          theme={theme}
          nodeRenderers={nodeRenderers}
          toolIcons={toolIcons}
          fileIcons={fileIcons}
          edgeColors={edgeColors}
          fitOnUpdate={fitOnUpdate}
          showControls={showControls}
          keyboardShortcuts={keyboardShortcuts}
          animateEdges={prefersReducedMotion ? false : animateEdges}
          onNodeSelect={(n) => setSelectedNodeId(n?.id ?? null)}
          onNodeClick={handleNodeClick}
          onEdgeClick={onEdgeClick}
          onNewestNode={handleNewestNode}
        />
        {showLegend && <Legend toolIcons={toolIcons} fileIcons={fileIcons} forceCollapsed={detailOpen} />}
        {showStats && <StatsBar nodes={nodes} />}
        {showDetailPanel && lastSelectedNode && (
          <NodeTooltip
            node={lastSelectedNode}
            open={detailOpen}
            onClose={() => setSelectedNodeId(null)}
            rightOffset={16}
          />
        )}
        {showToasts && <ToastStack node={toastNode} placement={toastPlacement} insets={toastInsets} />}
        {replay && showTimeline && (
          <AgrexTimeline
            {...timelineProps}
            replay={replay}
            placement={timelineProps?.placement ?? timelinePlacement}
            insets={timelineProps?.insets ?? timelineInsets}
          />
        )}
      </div>
    </AgrexErrorBoundary>
  )
})

export default Agrex
