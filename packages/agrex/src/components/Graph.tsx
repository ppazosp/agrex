import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
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

interface FlowNodeData {
  label: string
  status: string
  collapsed?: boolean
  childCount?: number
  childrenAllDone?: boolean
  [key: string]: unknown
}

const BUILT_IN_NODE_TYPES: NodeTypes = {
  agent: AgentNode, sub_agent: SubAgentNode, tool: ToolNode,
  file: FileNode,
}

interface GraphInternalProps {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
  theme: ResolvedTheme
  layout: 'radial' | 'force' | 'dagre' | LayoutFn
  nodeRenderers?: Record<string, React.ComponentType<any>>
  toolIcons?: Record<string, React.ComponentType<{ size: number }>>
  fileIcons?: Record<string, React.ComponentType<{ size: number }>>
  edgeColors?: Record<string, string>
  fitOnUpdate: boolean
  showControls: boolean

  keyboardShortcuts: boolean
  animateEdges: boolean
  onNodeClick?: (node: AgrexNode) => void
  onEdgeClick?: (edge: AgrexEdge) => void
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

import { formatElapsed } from '../utils/formatElapsed'

function getElapsed(metadata?: Record<string, unknown>): string | undefined {
  if (!metadata) return undefined
  return formatElapsed(metadata.startedAt, metadata.endedAt)
}

function toFlowNode(
  n: AgrexNode,
  pos: { x: number; y: number },
  nodeRenderers: Record<string, React.ComponentType<any>> | undefined,
  toolIcons: Record<string, React.ComponentType<{ size: number }>> | undefined,
  fileIcons: Record<string, React.ComponentType<{ size: number }>> | undefined,
  collapsedNodes: Set<string>,
  collapsedChildCounts: Map<string, number>,
  childrenAllDoneMap: Map<string, boolean>,
): Node {
  const isCustomType = !(n.type in BUILT_IN_NODE_TYPES) && !(n.type in (nodeRenderers ?? {}))
  let icon: React.ComponentType<{ size: number }> | undefined
  if (n.type === 'tool') icon = toolIcons?.[n.label]
  else if (n.type === 'file') icon = getFileIcon(n.label, fileIcons)
  const elapsed = getElapsed(n.metadata)
  const collapsed = collapsedNodes.has(n.id)
  const childCount = collapsedChildCounts.get(n.id)
  const childrenAllDone = collapsed ? childrenAllDoneMap.get(n.id) : undefined
  return {
    id: n.id,
    type: isCustomType ? 'default_agrex' : n.type,
    data: { ...n.metadata, label: n.label, status: n.status ?? 'idle', icon, elapsed, collapsed, childCount, childrenAllDone },
    position: pos,
  } as Node
}

function toFlowEdge(e: AgrexEdge, edgeColors: Record<string, string>, animated: boolean): Edge {
  const kind = e.type ?? 'spawn'
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: 'center-out',
    targetHandle: 'center-in',
    type: 'straight',
    animated,
    label: e.label,
    labelStyle: { fill: 'var(--agrex-fg)', fontSize: 10, opacity: 0.5 },
    labelBgStyle: { fill: 'var(--agrex-bg)', fillOpacity: 0.8 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
    style: { stroke: edgeColors[kind] ?? 'var(--agrex-edge-default)', strokeWidth: 1.5 },
  } as Edge
}

/** Get all descendant IDs using a pre-built children lookup — O(descendants) per call */
function getDescendants(nodeId: string, childrenOf: Map<string, string[]>): Set<string> {
  const result = new Set<string>()
  const queue = childrenOf.get(nodeId)
  if (!queue) return result
  const stack = [...queue]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (result.has(current)) continue
    result.add(current)
    const children = childrenOf.get(current)
    if (children) for (const c of children) stack.push(c)
  }
  return result
}

/** Build a parentId → childId[] lookup map in a single O(n) pass */
function buildChildrenMap(nodes: AgrexNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const n of nodes) {
    if (n.parentId) {
      let children = map.get(n.parentId)
      if (!children) { children = []; map.set(n.parentId, children) }
      children.push(n.id)
    }
  }
  return map
}

export type GraphRef = {
  fitView: () => void
  collapseAll: () => void
  expandAll: () => void
}

const Graph = forwardRef<GraphRef, GraphInternalProps>(function Graph({
  nodes, edges, theme, nodeRenderers, toolIcons, fileIcons, edgeColors: userEdgeColors,
  fitOnUpdate, showControls, keyboardShortcuts, animateEdges, onNodeClick, onEdgeClick, onNewestNode,
}, ref) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([])
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([])
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(new Map<string, { x: number; y: number }>())
  const childCountRef = useRef(new Map<string, number>())
  const agrexNodesRef = useRef<AgrexNode[]>(nodes)
  const agrexEdgesRef = useRef<AgrexEdge[]>(edges)
  const prevNodeIdsRef = useRef(new Set<string>())
  const prevEdgeIdsRef = useRef(new Set<string>())
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>())
  const [autoFit, _setAutoFit] = useState(fitOnUpdate)
  const autoFitRef = useRef(fitOnUpdate)
  const setAutoFit = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    _setAutoFit(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      autoFitRef.current = next
      return next
    })
  }, [])
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())

  // Tick counter to force elapsed-time re-renders for running nodes
  const [, setTick] = useState(0)
  const hasRunning = nodes.some(n => n.status === 'running')
  useEffect(() => {
    if (!hasRunning) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [hasRunning])

  const edgeColorsRef = useRef(DEFAULT_EDGE_COLORS)
  edgeColorsRef.current = { ...DEFAULT_EDGE_COLORS, ...userEdgeColors }

  // Stable refs for props used inside effects to avoid stale closures
  const nodeRenderersRef = useRef(nodeRenderers)
  nodeRenderersRef.current = nodeRenderers
  const toolIconsRef = useRef(toolIcons)
  toolIconsRef.current = toolIcons
  const fileIconsRef = useRef(fileIcons)
  fileIconsRef.current = fileIcons
  const onNewestNodeRef = useRef(onNewestNode)
  onNewestNodeRef.current = onNewestNode
  const animateEdgesRef = useRef(animateEdges)
  animateEdgesRef.current = animateEdges

  const initRef = useRef(false)

  // Clean up pending timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => { for (const t of timers) clearTimeout(t); timers.clear() }
  }, [])

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { timersRef.current.delete(id); fn() }, ms)
    timersRef.current.add(id)
    return id
  }, [])

  const nodeTypes: NodeTypes = useMemo(() => ({ ...BUILT_IN_NODE_TYPES, ...(nodeRenderers ?? {}), default_agrex: DefaultNode }), [nodeRenderers])

  useEffect(() => { agrexNodesRef.current = nodes }, [nodes])
  useEffect(() => { agrexEdgesRef.current = edges }, [edges])

  // Compute hidden nodes and descendant status for collapsed nodes — O(n) build + O(descendants) per collapsed
  const { hiddenIds, childrenAllDoneMap } = useMemo(() => {
    const ids = new Set<string>()
    const allDone = new Map<string, boolean>()
    if (collapsedNodes.size === 0) return { hiddenIds: ids, childrenAllDoneMap: allDone }
    const childrenOf = buildChildrenMap(nodes)
    const nodeById = new Map(nodes.map(n => [n.id, n]))
    for (const cid of collapsedNodes) {
      const descendants = getDescendants(cid, childrenOf)
      for (const did of descendants) {
        ids.add(did)
      }
      allDone.set(cid, [...descendants].every(did => {
        const dn = nodeById.get(did)
        return dn?.status === 'done'
      }))
    }
    return { hiddenIds: ids, childrenAllDoneMap: allDone }
  }, [nodes, collapsedNodes])

  const visibleNodes = useMemo(() => nodes.filter(n => !hiddenIds.has(n.id)), [nodes, hiddenIds])
  const visibleEdges = useMemo(() => edges.filter(e => !hiddenIds.has(e.source) && !hiddenIds.has(e.target)), [edges, hiddenIds])

  // Count direct children for all agent/sub_agent nodes (for badge display) — O(n)
  const childCounts = useMemo(() => {
    const parentCounts = new Map<string, number>()
    const agentIds = new Set<string>()
    for (const n of nodes) {
      if (n.type === 'agent' || n.type === 'sub_agent') agentIds.add(n.id)
      if (n.parentId) parentCounts.set(n.parentId, (parentCounts.get(n.parentId) ?? 0) + 1)
    }
    const counts = new Map<string, number>()
    for (const [pid, count] of parentCounts) {
      if (agentIds.has(pid)) counts.set(pid, count)
    }
    return counts
  }, [nodes])

  useEffect(() => {
    if (visibleNodes.length === 0) {
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
    const currentIds = new Set(visibleNodes.map(n => n.id))
    for (const id of posRef.current.keys()) {
      if (!currentIds.has(id)) posRef.current.delete(id)
    }
    for (const id of childCountRef.current.keys()) {
      if (!currentIds.has(id)) childCountRef.current.delete(id)
    }

    // Place new nodes using radial layout
    let newest: AgrexNode | null = null
    const newNodes: AgrexNode[] = []

    let rootCount = 0
    for (const nd of visibleNodes) {
      if (!nd.parentId && posRef.current.has(nd.id)) rootCount++
    }

    for (const nd of visibleNodes) {
      if (posRef.current.has(nd.id)) continue

      const pid = nd.parentId
      if (pid && !posRef.current.has(pid) && posRef.current.size > 0) continue

      if (!pid && posRef.current.size > 0) {
        // Additional root node — offset from existing roots
        posRef.current.set(nd.id, { x: rootCount * 300, y: 0 })
        rootCount++
      } else {
        const ci = pid ? (childCountRef.current.get(pid) ?? 0) : 0
        if (pid) childCountRef.current.set(pid, ci + 1)
        posRef.current.set(nd.id, radialLayout([nd], visibleEdges, posRef.current).get(nd.id) ?? { x: 0, y: 0 })
      }
      newest = nd
      newNodes.push(nd)
    }

    // Check which nodes need status updates
    const updatedNodes: AgrexNode[] = []
    for (const nd of visibleNodes) {
      if (!newNodes.includes(nd) && prevNodeIdsRef.current.has(nd.id)) {
        updatedNodes.push(nd)
      }
    }

    // Determine new edges
    const currentEdgeIds = new Set(visibleEdges.filter(e => posRef.current.has(e.source) && posRef.current.has(e.target)).map(e => e.id))
    const newEdges = visibleEdges.filter(e => !prevEdgeIdsRef.current.has(e.id) && posRef.current.has(e.source) && posRef.current.has(e.target))
    const removedEdgeIds = [...prevEdgeIdsRef.current].filter(id => !currentEdgeIds.has(id))

    // Incremental updates — only touch what changed
    const ec = edgeColorsRef.current

    const visibleNodeMap = new Map(visibleNodes.map(n => [n.id, n]))

    const nr = nodeRenderersRef.current
    const ti = toolIconsRef.current
    const fi = fileIconsRef.current
    const ae = animateEdgesRef.current

    if (prevNodeIdsRef.current.size === 0) {
      // First render — set everything
      setFlowNodes(visibleNodes.filter(n => posRef.current.has(n.id)).map(n => toFlowNode(n, posRef.current.get(n.id)!, nr, ti, fi, collapsedNodes, childCounts, childrenAllDoneMap)))
      setFlowEdges(visibleEdges.filter(e => posRef.current.has(e.source) && posRef.current.has(e.target)).map(e => toFlowEdge(e, ec, ae)))
    } else {
      // Incremental — add new nodes, update changed nodes, add/remove edges
      if (newNodes.length > 0 || updatedNodes.length > 0 || [...prevNodeIdsRef.current].some(id => !currentIds.has(id))) {
        setFlowNodes(prev => {
          // Remove nodes no longer present
          let result = prev.filter(fn => currentIds.has(fn.id))
          // Update existing nodes (status changes etc)
          result = result.map(fn => {
            const agrexNode = visibleNodeMap.get(fn.id)
            if (!agrexNode) return fn
            const newStatus = agrexNode.status ?? 'idle'
            const oldStatus = (fn.data as FlowNodeData)?.status
            const isCollapsed = collapsedNodes.has(agrexNode.id)
            // Always re-render collapsed nodes — their badge color depends on descendant statuses
            if (isCollapsed) return toFlowNode(agrexNode, posRef.current.get(agrexNode.id)!, nr, ti, fi, collapsedNodes, childCounts, childrenAllDoneMap)
            const wasCollapsed = (fn.data as FlowNodeData)?.collapsed
            if (newStatus === oldStatus && wasCollapsed === isCollapsed) return fn
            return toFlowNode(agrexNode, posRef.current.get(agrexNode.id)!, nr, ti, fi, collapsedNodes, childCounts, childrenAllDoneMap)
          })
          // Add new nodes
          for (const nd of newNodes) {
            result.push(toFlowNode(nd, posRef.current.get(nd.id)!, nr, ti, fi, collapsedNodes, childCounts, childrenAllDoneMap))
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
            result = [...result, toFlowEdge(e, ec, ae)]
          }
          return result
        })
      }
    }

    // Track state for next render
    prevNodeIdsRef.current = currentIds
    prevEdgeIdsRef.current = currentEdgeIds

    if (newest) onNewestNodeRef.current?.(newest)

    if (autoFitRef.current && posRef.current.size > 0) {
      scheduleTimer(fitView, 60)
    }

  }, [visibleNodes, visibleEdges, fitOnUpdate, collapsedNodes, childCounts, childrenAllDoneMap, scheduleTimer])

  // Update all existing edges when animateEdges changes
  useEffect(() => {
    setFlowEdges(prev => prev.map(e => ({ ...e, animated: animateEdges })))

  }, [animateEdges])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const orig = agrexNodesRef.current.find((n) => n.id === node.id)
      if (!orig) return
      // Toggle collapse for agent/sub_agent nodes
      if (orig.type === 'agent' || orig.type === 'sub_agent') {
        const hasChildren = agrexNodesRef.current.some(n => n.parentId === orig.id)
        if (hasChildren) {
          setCollapsedNodes(prev => {
            const next = new Set(prev)
            if (next.has(orig.id)) next.delete(orig.id)
            else next.add(orig.id)
            return next
          })
        }
      }
      onNodeClick?.(orig)
    },
    [onNodeClick],
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (!onEdgeClick) return
      const orig = agrexEdgesRef.current.find((e) => e.id === edge.id)
      if (orig) onEdgeClick(orig)
    },
    [onEdgeClick],
  )

  const fitView = useCallback(() => {
    const rf = rfRef.current
    if (!rf) return
    const el = containerRef.current
    const vw = el?.clientWidth || 800
    const vh = el?.clientHeight || 600
    let cx = 0, cy = 0, count = 0
    for (const [, pos] of posRef.current) { cx += pos.x; cy += pos.y; count++ }
    if (count > 0) { cx /= count; cy /= count }
    let maxDist = 100
    for (const [, pos] of posRef.current) maxDist = Math.max(maxDist, Math.hypot(pos.x - cx, pos.y - cy))
    const halfSize = Math.min(vw, vh) / 2
    const zoom = Math.min(1, halfSize / (maxDist + 40))
    rf.setCenter(cx, cy, { zoom: Math.max(0.15, zoom), duration: 300 })
  }, [])

  useImperativeHandle(ref, () => ({
    fitView,
    collapseAll: () => {
      const ids = new Set<string>()
      for (const n of agrexNodesRef.current) {
        if ((n.type === 'agent' || n.type === 'sub_agent') && agrexNodesRef.current.some(c => c.parentId === n.id)) {
          ids.add(n.id)
        }
      }
      setCollapsedNodes(ids)
    },
    expandAll: () => setCollapsedNodes(new Set()),
  }), [fitView])

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcuts) return
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const rf = rfRef.current
      if (!rf) return
      switch (e.key) {
        case '=':
        case '+':
          rf.zoomIn({ duration: 200 })
          break
        case '-':
          rf.zoomOut({ duration: 200 })
          break
        case '0':
          fitView()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keyboardShortcuts, fitView])

  const cssVars = themeToCSS(theme)

  return (
    <div ref={containerRef} className="agrex"
      style={{ width: '100%', height: '100%', position: 'relative', background: theme.background, ...cssVars } as React.CSSProperties}>
      <ReactFlow
        nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onMoveStart={() => { if (initRef.current) setAutoFit(false) }}
        onInit={(inst) => { rfRef.current = inst; inst.setCenter(40, 40, { zoom: 1 }); scheduleTimer(() => { initRef.current = true }, 200) }}
        minZoom={0.1} maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >

      </ReactFlow>
      {showControls && (
        <Controls
          onZoomIn={() => rfRef.current?.zoomIn({ duration: 200 })}
          onZoomOut={() => rfRef.current?.zoomOut({ duration: 200 })}
          autoFit={autoFit}
          onToggleAutoFit={() => {
            setAutoFit(v => {
              if (!v) fitView()
              return !v
            })
          }}
        />
      )}
    </div>
  )
})

export default Graph
