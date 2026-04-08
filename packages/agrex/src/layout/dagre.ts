import dagre from '@dagrejs/dagre'
import type { AgrexNode, AgrexEdge } from '../types'
import { NODE_SIZES, DEFAULT_SIZE } from './sizes'

/**
 * Full dagre relayout — clean hierarchical placement, zero overlaps.
 * Ignores existing positions, computes fresh layout for all nodes.
 */
export function dagreLayout(
  nodes: AgrexNode[],
  edges: AgrexEdge[],
  _existingPositions?: Map<string, { x: number; y: number }>,
  direction: 'TB' | 'LR' = 'TB',
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  })

  for (const node of nodes) {
    const size = NODE_SIZES[node.type] ?? DEFAULT_SIZE
    g.setNode(node.id, { width: size.w, height: size.h })
  }

  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  }

  try {
    dagre.layout(g)
  } catch (err) {
    console.warn('[agrex] dagre layout failed, using grid fallback:', err)
    const positions = new Map<string, { x: number; y: number }>()
    const cols = Math.ceil(Math.sqrt(nodes.length))
    for (let i = 0; i < nodes.length; i++) {
      positions.set(nodes[i].id, { x: (i % cols) * 120, y: Math.floor(i / cols) * 120 })
    }
    return positions
  }

  const positions = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    const n = g.node(node.id)
    if (n) positions.set(node.id, { x: n.x, y: n.y })
  }

  return positions
}
