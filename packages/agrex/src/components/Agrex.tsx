import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Graph, { type GraphRef } from './Graph'
import Legend from './Legend'
import DetailPanel from './DetailPanel'
import ToastStack from './Toast'
import StatsBar from './StatsBar'
import { resolveTheme, themeToCSS } from '../theme/tokens'
import type { AgrexNode, AgrexEdge, AgrexProps, AgrexHandle } from '../types'
import { deriveEdges } from '../deriveEdges'
import '../styles/agrex.css'

const Agrex = forwardRef<AgrexHandle, AgrexProps>(function Agrex({
  nodes: staticNodes, edges: staticEdges, instance, onNodeClick, onEdgeClick, theme: themeProp,
  layout = 'force', nodeRenderers, toolIcons, fileIcons, edgeColors, className,
  showControls = true, showLegend = true, showToasts = true, showDetailPanel = true,
  showStats = false, fitOnUpdate = true, keyboardShortcuts = true,
  animateEdges = true,
}, ref) {
  const theme = resolveTheme(themeProp)
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
  )
})

export default Agrex
