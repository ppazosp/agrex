import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AgentNode, SubAgentNode, ToolNode, FileNode, OutputNode, SearchNode, DefaultNode,
} from '../nodes'
import { elkStressLayout, elkFullRelayout } from '../layout/elk'
import Controls from './Controls'
import type { AgrexNode, AgrexEdge, ResolvedTheme, LayoutFn } from '../types'
import { themeToCSS } from '../theme/tokens'

const BUILT_IN_NODE_TYPES: NodeTypes = {
  agent: AgentNode, sub_agent: SubAgentNode, tool: ToolNode,
  file: FileNode, output: OutputNode, search: SearchNode,
}

interface GraphInternalProps {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
  theme: ResolvedTheme
  layout: 'radial' | 'force' | LayoutFn
  nodeRenderers?: Record<string, React.ComponentType<any>>
  nodeIcons?: Record<string, React.ComponentType<{ size: number }>>
  edgeColors?: Record<string, string>
  fitOnUpdate: boolean
  showControls: boolean
  onNodeClick?: (node: AgrexNode) => void
  onNewestNode?: (node: AgrexNode) => void
}

const DEFAULT_EDGE_COLORS: Record<string, string> = {
  spawn: 'var(--agrex-edge-spawn)',
  write: 'var(--agrex-edge-write)',
  read: 'var(--agrex-edge-read)',
}

export default function Graph({
  nodes, edges, theme, layout, nodeRenderers, nodeIcons, edgeColors: userEdgeColors,
  fitOnUpdate, showControls, onNodeClick, onNewestNode,
}: GraphInternalProps) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([])
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([])
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(new Map<string, { x: number; y: number }>())
  const animatedRef = useRef(new Set<string>())
  const agrexNodesRef = useRef<AgrexNode[]>(nodes)
  const [autoFit, setAutoFit] = useState(fitOnUpdate)
  const layoutVersionRef = useRef(0)
  const relayoutRequestedRef = useRef(false)
  const [relayoutTick, setRelayoutTick] = useState(0)

  // Store mutable refs for values needed in async callback
  const edgeColorsRef = useRef(DEFAULT_EDGE_COLORS)
  edgeColorsRef.current = { ...DEFAULT_EDGE_COLORS, ...userEdgeColors }
  const nodeIconsRef = useRef(nodeIcons)
  nodeIconsRef.current = nodeIcons
  const nodeRenderersRef = useRef(nodeRenderers)
  nodeRenderersRef.current = nodeRenderers
  const onNewestNodeRef = useRef(onNewestNode)
  onNewestNodeRef.current = onNewestNode
  const autoFitRef = useRef(autoFit)
  autoFitRef.current = autoFit

  const nodeTypes: NodeTypes = { ...BUILT_IN_NODE_TYPES, ...(nodeRenderers ?? {}), default_agrex: DefaultNode }

  useEffect(() => { agrexNodesRef.current = nodes }, [nodes])

  useEffect(() => {
    if (nodes.length === 0) {
      posRef.current.clear()
      animatedRef.current.clear()
      setAutoFit(fitOnUpdate)
      setFlowNodes([])
      setFlowEdges([])
      return
    }

    // Prune positions for nodes that no longer exist
    const currentIds = new Set(nodes.map(n => n.id))
    for (const id of posRef.current.keys()) {
      if (!currentIds.has(id)) posRef.current.delete(id)
    }

    const version = ++layoutVersionRef.current
    const isRelayout = relayoutRequestedRef.current
    if (isRelayout) relayoutRequestedRef.current = false

    const snapNodes = [...nodes]
    const snapEdges = [...edges]
    const snapPositions = new Map(posRef.current)

    const layoutPromise = isRelayout
      ? elkFullRelayout(snapNodes, snapEdges)
      : elkStressLayout(snapNodes, snapEdges, snapPositions)

    layoutPromise.then(newPositions => {
      if (version !== layoutVersionRef.current) return

      // Detect newest node
      let newest: AgrexNode | null = null
      for (const nd of snapNodes) {
        if (!posRef.current.has(nd.id) && newPositions.has(nd.id)) newest = nd
      }
      posRef.current = newPositions

      // Build flow nodes
      const ec = edgeColorsRef.current
      const ni = nodeIconsRef.current
      const nr = nodeRenderersRef.current

      const flowNodeList = snapNodes.filter((n) => posRef.current.has(n.id)).map((n) => {
        const isCustomType = !(n.type in BUILT_IN_NODE_TYPES) && !(n.type in (nr ?? {}))
        const isNew = !animatedRef.current.has(n.id)
        if (isNew) animatedRef.current.add(n.id)
        return {
          id: n.id,
          type: isCustomType ? 'default_agrex' : n.type,
          className: isNew ? 'agrex-new' : undefined,
          data: { label: n.label, status: n.status ?? 'idle', icon: ni?.[n.type], ...n.metadata },
          position: posRef.current.get(n.id)!,
        }
      })
      setFlowNodes(flowNodeList as Node[])

      setFlowEdges(
        snapEdges.filter((e) => posRef.current.has(e.source) && posRef.current.has(e.target)).map((e) => {
          const kind = e.type ?? 'spawn'
          return {
            id: e.id, source: e.source, target: e.target,
            sourceHandle: 'center-out', targetHandle: 'center-in',
            type: 'straight' as const, animated: true,
            style: { stroke: ec[kind] ?? 'var(--agrex-edge-default)', strokeWidth: 1.5 },
          }
        }),
      )

      if (newest) onNewestNodeRef.current?.(newest)

      if (autoFitRef.current) {
        const rf = rfRef.current
        if (rf) {
          setTimeout(() => {
            const el = containerRef.current
            const vw = el?.clientWidth || 800
            const vh = el?.clientHeight || 600
            let maxDist = 100
            for (const [, pos] of posRef.current) maxDist = Math.max(maxDist, Math.hypot(pos.x, pos.y))
            const halfSize = Math.min(vw, vh) / 2
            const zoom = Math.min(1, halfSize / (maxDist + 40))
            rf.setCenter(40, 40, { zoom: Math.max(0.15, zoom), duration: 300 })
          }, 60)
        }
      }
    })
  // Only re-run when data or relayout changes — NOT when callbacks/theme change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, fitOnUpdate, relayoutTick])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!onNodeClick) return
      const orig = agrexNodesRef.current.find((n) => n.id === node.id)
      if (orig) onNodeClick(orig)
    },
    [onNodeClick],
  )

  const cssVars = themeToCSS(theme)

  return (
    <div ref={containerRef} className="agrex"
      style={{ width: '100%', height: '100%', position: 'relative', background: theme.background, ...cssVars } as React.CSSProperties}>
      <ReactFlow
        nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onMoveStart={(event) => { if (event) setAutoFit(false) }}
        onInit={(inst) => { rfRef.current = inst; inst.setCenter(40, 40, { zoom: 1 }) }}
        minZoom={0.1} maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      />
      {showControls && (
        <Controls
          onZoomIn={() => rfRef.current?.zoomIn({ duration: 200 })}
          onZoomOut={() => rfRef.current?.zoomOut({ duration: 200 })}
          autoFit={autoFit}
          onRelayout={() => { relayoutRequestedRef.current = true; setRelayoutTick(v => v + 1) }}
          onToggleAutoFit={() => {
            setAutoFit(v => {
              if (!v) {
                const rf = rfRef.current
                if (rf) {
                  const el = containerRef.current
                  const vw = el?.clientWidth || 800
                  const vh = el?.clientHeight || 600
                  let maxDist = 100
                  for (const [, pos] of posRef.current) maxDist = Math.max(maxDist, Math.hypot(pos.x, pos.y))
                  const halfSize = Math.min(vw, vh) / 2
                  const zoom = Math.min(1, halfSize / (maxDist + 40))
                  rf.setCenter(40, 40, { zoom: Math.max(0.15, zoom), duration: 300 })
                }
              }
              return !v
            })
          }}
        />
      )}
    </div>
  )
}
