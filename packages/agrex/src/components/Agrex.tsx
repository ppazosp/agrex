import { useCallback, useRef, useState } from 'react'
import Graph from './Graph'
import Legend from './Legend'
import DetailPanel from './DetailPanel'
import Toast from './Toast'
import { resolveTheme, themeToCSS } from '../theme/tokens'
import type { AgrexNode, AgrexProps } from '../types'
import '../styles/agrex.css'

export default function Agrex({
  nodes: staticNodes, edges: staticEdges, instance, onNodeClick, theme: themeProp,
  layout = 'force', nodeRenderers, nodeIcons, edgeColors,
  showControls = true, showLegend = true, showToasts = true, showDetailPanel = true, fitOnUpdate = true,
}: AgrexProps) {
  const theme = resolveTheme(themeProp)
  const nodes = instance?.nodes ?? staticNodes ?? []
  const edges = instance?.edges ?? staticEdges ?? []

  const [selectedNode, setSelectedNode] = useState<AgrexNode | null>(null)
  const [toastNode, setToastNode] = useState<AgrexNode | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNodeClick = useCallback((node: AgrexNode) => {
    if (showDetailPanel) setSelectedNode(node)
    onNodeClick?.(node)
  }, [onNodeClick, showDetailPanel])

  const handleNewestNode = useCallback((node: AgrexNode) => {
    if (!showToasts) return
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastNode(node)
    toastTimer.current = setTimeout(() => setToastNode(null), 2500)
  }, [showToasts])

  const cssVars = themeToCSS(theme) as Record<string, string>

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', fontFamily: theme.fontFamily, ...cssVars } as React.CSSProperties} className="agrex">
      <Graph nodes={nodes} edges={edges} theme={theme} layout={layout}
        nodeRenderers={nodeRenderers} nodeIcons={nodeIcons} edgeColors={edgeColors}
        fitOnUpdate={fitOnUpdate} showControls={showControls} onNodeClick={handleNodeClick} onNewestNode={handleNewestNode} />
      {showLegend && <Legend />}
      {showDetailPanel && <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />}
      {showToasts && <Toast node={toastNode} />}
    </div>
  )
}
