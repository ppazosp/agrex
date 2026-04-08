import dagre from '@dagrejs/dagre'
import type { AgrexNode, AgrexEdge } from '../types'

const NODE_SIZES: Record<string, { w: number; h: number }> = {
  agent: { w: 80, h: 80 },
  sub_agent: { w: 56, h: 56 },
  tool: { w: 36, h: 36 },
  file: { w: 46, h: 46 },
  output: { w: 48, h: 56 },
  search: { w: 32, h: 32 },
}
const DEFAULT_SIZE = { w: 48, h: 48 }

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

  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    const n = g.node(node.id)
    if (n) positions.set(node.id, { x: n.x, y: n.y })
  }

  return positions
}
