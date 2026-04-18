import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Graph, { type GraphRef } from './Graph'
import Legend from './Legend'
import DetailPanel from './DetailPanel'
import ToastStack from './Toast'
import StatsBar from './StatsBar'
import AgrexErrorBoundary from './ErrorBoundary'
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
    showDetailPanel = true,
    showStats = false,
    fitOnUpdate = true,
    keyboardShortcuts = true,
    animateEdges = true,
  },
  ref,
) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', true)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', false)
  const theme = useMemo(
    () => (themeProp === 'auto' ? resolveTheme(prefersDark ? 'dark' : 'light') : resolveTheme(themeProp)),
    [themeProp, prefersDark],
  )
  const rawNodes = instance?.nodes ?? staticNodes ?? []
  const rawEdges = instance?.edges ?? staticEdges ?? []
  const nodes = rawNodes
  const edges = useMemo(() => deriveEdges(rawNodes, rawEdges), [rawNodes, rawEdges])

  const [selectedNode, setSelectedNode] = useState<AgrexNode | null>(null)
  const [toastNode, setToastNode] = useState<AgrexNode | null>(null)
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

  const handleNodeClick = useCallback(
    (node: AgrexNode) => {
      if (showDetailPanel) setSelectedNode(node)
      onNodeClick?.(node)
    },
    [onNodeClick, showDetailPanel],
  )

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
          onNodeClick={handleNodeClick}
          onEdgeClick={onEdgeClick}
          onNewestNode={handleNewestNode}
        />
        {showLegend && <Legend toolIcons={toolIcons} fileIcons={fileIcons} />}
        {showStats && <StatsBar nodes={nodes} />}
        {showDetailPanel && <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />}
        {showToasts && <ToastStack node={toastNode} placement={toastPlacement} />}
      </div>
    </AgrexErrorBoundary>
  )
})

export default Agrex
