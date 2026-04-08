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

function usePrefersDark(): boolean {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq?.addEventListener) return
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return dark
}

const Agrex = forwardRef<AgrexHandle, AgrexProps>(function Agrex({
  nodes: staticNodes, edges: staticEdges, instance, onNodeClick, onEdgeClick, theme: themeProp,
  layout = 'force', nodeRenderers, toolIcons, fileIcons, edgeColors, className,
  showControls = true, showLegend = true, showToasts = true, showDetailPanel = true,
  showStats = false, fitOnUpdate = true, keyboardShortcuts = true,
  animateEdges = true,
}, ref) {
  const prefersDark = usePrefersDark()
  const theme = themeProp === 'auto'
    ? resolveTheme(prefersDark ? 'dark' : 'light')
    : resolveTheme(themeProp)
  const rawNodes = instance?.nodes ?? staticNodes ?? []
  const rawEdges = instance?.edges ?? staticEdges ?? []
  const nodes = rawNodes
  const edges = useMemo(() => deriveEdges(rawNodes, rawEdges), [rawNodes, rawEdges])

  const [selectedNode, setSelectedNode] = useState<AgrexNode | null>(null)
  const [toastNode, setToastNode] = useState<AgrexNode | null>(null)
  const graphRef = useRef<GraphRef>(null)

  useImperativeHandle(ref, () => ({
    fitView: () => graphRef.current?.fitView(),
    collapseAll: () => graphRef.current?.collapseAll(),
    expandAll: () => graphRef.current?.expandAll(),
    toJSON: () => ({ nodes, edges }),
  }), [nodes, edges])

  const handleNodeClick = useCallback((node: AgrexNode) => {
    if (showDetailPanel) setSelectedNode(node)
    onNodeClick?.(node)
  }, [onNodeClick, showDetailPanel])

  const handleNewestNode = useCallback((node: AgrexNode) => {
    if (!showToasts) return
    // Each new reference triggers a toast in the stack
    setToastNode({ ...node })
  }, [showToasts])

  const cssVars = themeToCSS(theme) as Record<string, string>

  return (
    <AgrexErrorBoundary>
      <div style={{ width: '100%', height: '100%', position: 'relative', fontFamily: theme.fontFamily, ...cssVars } as React.CSSProperties} className={className ? `agrex ${className}` : 'agrex'}>
        <Graph ref={graphRef} nodes={nodes} edges={edges} theme={theme} layout={layout}
          nodeRenderers={nodeRenderers} toolIcons={toolIcons} fileIcons={fileIcons} edgeColors={edgeColors}
          fitOnUpdate={fitOnUpdate} showControls={showControls}
          keyboardShortcuts={keyboardShortcuts} animateEdges={animateEdges}
          onNodeClick={handleNodeClick} onEdgeClick={onEdgeClick} onNewestNode={handleNewestNode} />
        {showLegend && <Legend />}
        {showStats && <StatsBar nodes={nodes} />}
        {showDetailPanel && <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />}
        {showToasts && <ToastStack node={toastNode} />}
      </div>
    </AgrexErrorBoundary>
  )
})

export default Agrex
