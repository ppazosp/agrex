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
  AgentNode, SubAgentNode, ToolNode, FileNode, DefaultNode,
} from '../nodes'
import { radialLayout } from '../layout/radial'
import Controls from './Controls'
import type { AgrexNode, AgrexEdge, ResolvedTheme, LayoutFn } from '../types'
import { themeToCSS } from '../theme/tokens'

const BUILT_IN_NODE_TYPES: NodeTypes = {
  agent: AgentNode, sub_agent: SubAgentNode, tool: ToolNode,
  file: FileNode,
}

interface GraphInternalProps {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
  theme: ResolvedTheme
  layout: 'radial' | 'force' | LayoutFn
  nodeRenderers?: Record<string, React.ComponentType<any>>
  toolIcons?: Record<string, React.ComponentType<{ size: number }>>
  fileIcons?: Record<string, React.ComponentType<{ size: number }>>
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

function getFileIcon(
  label: string,
  fileIcons: Record<string, React.ComponentType<{ size: number }>> | undefined,
): React.ComponentType<{ size: number }> | undefined {
  if (!fileIcons) return undefined
  const dot = label.lastIndexOf('.')
  if (dot === -1) return undefined
  return fileIcons[label.slice(dot + 1)]
}

function toFlowNode(
  n: AgrexNode,
  pos: { x: number; y: number },
  nodeRenderers: Record<string, React.ComponentType<any>> | undefined,
  toolIcons: Record<string, React.ComponentType<{ size: number }>> | undefined,
  fileIcons: Record<string, React.ComponentType<{ size: number }>> | undefined,
): Node {
  const isCustomType = !(n.type in BUILT_IN_NODE_TYPES) && !(n.type in (nodeRenderers ?? {}))
  let icon: React.ComponentType<{ size: number }> | undefined
  if (n.type === 'tool') icon = toolIcons?.[n.label]
  else if (n.type === 'file') icon = getFileIcon(n.label, fileIcons)
  return {
    id: n.id,
    type: isCustomType ? 'default_agrex' : n.type,
    data: { label: n.label, status: n.status ?? 'idle', icon, ...n.metadata },
    position: pos,
  } as Node
}

function toFlowEdge(e: AgrexEdge, edgeColors: Record<string, string>): Edge {
  const kind = e.type ?? 'spawn'
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: 'center-out',
    targetHandle: 'center-in',
    type: 'straight',
    animated: true,
    style: { stroke: edgeColors[kind] ?? 'var(--agrex-edge-default)', strokeWidth: 1.5 },
  } as Edge
}

export default function Graph({
  nodes, edges, theme, nodeRenderers, toolIcons, fileIcons, edgeColors: userEdgeColors,
  fitOnUpdate, showControls, onNodeClick, onNewestNode,
}: GraphInternalProps) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([])
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([])
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(new Map<string, { x: number; y: number }>())
  const childCountRef = useRef(new Map<string, number>())
  const agrexNodesRef = useRef<AgrexNode[]>(nodes)
  const prevNodeIdsRef = useRef(new Set<string>())
  const prevEdgeIdsRef = useRef(new Set<string>())
  const [autoFit, setAutoFit] = useState(fitOnUpdate)

  const edgeColorsRef = useRef(DEFAULT_EDGE_COLORS)
  edgeColorsRef.current = { ...DEFAULT_EDGE_COLORS, ...userEdgeColors }

  const nodeTypes: NodeTypes = { ...BUILT_IN_NODE_TYPES, ...(nodeRenderers ?? {}), default_agrex: DefaultNode }

  useEffect(() => { agrexNodesRef.current = nodes }, [nodes])

  useEffect(() => {
    if (nodes.length === 0) {
      posRef.current.clear()
      childCountRef.current.clear()
      prevNodeIdsRef.current.clear()
      prevEdgeIdsRef.current.clear()
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
    for (const id of childCountRef.current.keys()) {
      if (!currentIds.has(id)) childCountRef.current.delete(id)
    }

    // Place new nodes using radial layout
    let newest: AgrexNode | null = null
    const newNodes: AgrexNode[] = []

    for (const nd of nodes) {
      if (posRef.current.has(nd.id)) continue

      const pid = nd.parentId
      if (pid && !posRef.current.has(pid) && posRef.current.size > 0) continue
      if (!pid && posRef.current.size > 0) continue

      const ci = pid ? (childCountRef.current.get(pid) ?? 0) : 0
      if (pid) childCountRef.current.set(pid, ci + 1)

      posRef.current.set(nd.id, radialLayout([nd], edges, posRef.current).get(nd.id) ?? { x: 0, y: 0 })
      newest = nd
      newNodes.push(nd)
    }

    // Check which nodes need status updates
    const updatedNodes: AgrexNode[] = []
    for (const nd of nodes) {
      if (!newNodes.includes(nd) && prevNodeIdsRef.current.has(nd.id)) {
        updatedNodes.push(nd)
      }
    }

    // Determine new edges
    const currentEdgeIds = new Set(edges.filter(e => posRef.current.has(e.source) && posRef.current.has(e.target)).map(e => e.id))
    const newEdges = edges.filter(e => !prevEdgeIdsRef.current.has(e.id) && posRef.current.has(e.source) && posRef.current.has(e.target))
    const removedEdgeIds = [...prevEdgeIdsRef.current].filter(id => !currentEdgeIds.has(id))

    // Incremental updates — only touch what changed
    const ec = edgeColorsRef.current

    if (prevNodeIdsRef.current.size === 0) {
      // First render — set everything
      setFlowNodes(nodes.filter(n => posRef.current.has(n.id)).map(n => toFlowNode(n, posRef.current.get(n.id)!, nodeRenderers, toolIcons, fileIcons)))
      setFlowEdges(edges.filter(e => posRef.current.has(e.source) && posRef.current.has(e.target)).map(e => toFlowEdge(e, ec)))
    } else {
      // Incremental — add new nodes, update changed nodes, add/remove edges
      if (newNodes.length > 0 || updatedNodes.length > 0 || [...prevNodeIdsRef.current].some(id => !currentIds.has(id))) {
        setFlowNodes(prev => {
          // Remove nodes no longer present
          let result = prev.filter(fn => currentIds.has(fn.id))
          // Update existing nodes (status changes etc)
          result = result.map(fn => {
            const agrexNode = nodes.find(n => n.id === fn.id)
            if (!agrexNode) return fn
            const newStatus = agrexNode.status ?? 'idle'
            const oldStatus = (fn.data as any)?.status
            if (newStatus === oldStatus) return fn // no change, keep same reference
            return toFlowNode(agrexNode, posRef.current.get(agrexNode.id)!, nodeRenderers, toolIcons, fileIcons)
          })
          // Add new nodes
          for (const nd of newNodes) {
            result.push(toFlowNode(nd, posRef.current.get(nd.id)!, nodeRenderers, toolIcons, fileIcons))
          }
          return result
        })
      }

      if (newEdges.length > 0 || removedEdgeIds.length > 0) {
        setFlowEdges(prev => {
          let result = prev
          if (removedEdgeIds.length > 0) {
            const removeSet = new Set(removedEdgeIds)
            result = result.filter(fe => !removeSet.has(fe.id))
          }
          for (const e of newEdges) {
            result = [...result, toFlowEdge(e, ec)]
          }
          return result
        })
      }
    }

    // Track state for next render
    prevNodeIdsRef.current = currentIds
    prevEdgeIdsRef.current = currentEdgeIds

    if (newest) onNewestNode?.(newest)

    if (autoFit && newest) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, fitOnUpdate])

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
          onRelayout={() => {}}
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
