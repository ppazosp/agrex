import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Graph, { type GraphRef } from './Graph'
import Legend from './Legend'
import DetailPanel from './DetailPanel'
import ToastStack from './Toast'
import StatsBar from './StatsBar'
import { resolveTheme, themeToCSS } from '../theme/tokens'
import type { AgrexNode, AgrexEdge, AgrexProps, AgrexHandle } from '../types'
import '../styles/agrex.css'

/** Derive read/write edges from node.reads and node.writes fields. */
function deriveEdges(nodes: AgrexNode[], explicitEdges: AgrexEdge[]): AgrexEdge[] {
  const explicitSet = new Set(explicitEdges.map(e => `${e.source}:${e.target}:${e.type ?? ''}`))
  const derived: AgrexEdge[] = []
  for (const node of nodes) {
    if (node.reads) {
      for (const sourceId of node.reads) {
        const key = `${sourceId}:${node.id}:read`
        if (!explicitSet.has(key)) {
          derived.push({ id: `_read_${sourceId}_${node.id}`, source: sourceId, target: node.id, type: 'read' })
          explicitSet.add(key)
        }
      }
    }
    if (node.writes) {
      for (const targetId of node.writes) {
        const key = `${node.id}:${targetId}:write`
        if (!explicitSet.has(key)) {
          derived.push({ id: `_write_${node.id}_${targetId}`, source: node.id, target: targetId, type: 'write' })
          explicitSet.add(key)
        }
      }
    }
  }
  return derived.length > 0 ? [...explicitEdges, ...derived] : explicitEdges
}

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
