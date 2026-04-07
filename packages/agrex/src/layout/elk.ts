import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js'
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

const elk = new ELK()

/**
 * ELK stress layout with per-node pinning.
 *
 * - Existing nodes (in existingPositions) are pinned via `org.eclipse.elk.stress.fixed`
 * - New nodes are free to be placed by the stress minimizer
 * - Spacing guarantees no overlaps
 *
 * Returns a Promise because ELK runs async. The layout wrapper handles this.
 */
export async function elkStressLayout(
  nodes: AgrexNode[],
  edges: AgrexEdge[],
  existingPositions: Map<string, { x: number; y: number }>,
): Promise<Map<string, { x: number; y: number }>> {
  if (nodes.length === 0) return new Map()

  const nodeSet = new Set(nodes.map(n => n.id))

  const children: ElkNode[] = nodes.map(node => {
    const size = NODE_SIZES[node.type] ?? DEFAULT_SIZE
    const existing = existingPositions.get(node.id)
    const isFixed = !!existing

    return {
      id: node.id,
      width: size.w,
      height: size.h,
      ...(existing ? { x: existing.x, y: existing.y } : {}),
      layoutOptions: {
        ...(isFixed ? { 'org.eclipse.elk.stress.fixed': 'true' } : {}),
      },
    }
  })

  const elkEdges: ElkExtendedEdge[] = edges
    .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
    .map(e => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    }))

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'stress',
      'org.eclipse.elk.interactive': 'true',
      'org.eclipse.elk.stress.desiredEdgeLength': '180',
      'elk.spacing.nodeNode': '60',
    },
    children,
    edges: elkEdges,
  }

  const result = await elk.layout(graph)

  const positions = new Map<string, { x: number; y: number }>()
  for (const child of result.children ?? []) {
    positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 })
  }

  return positions
}

/**
 * Full ELK relayout — no pinning, all nodes repositioned cleanly.
 */
export async function elkFullRelayout(
  nodes: AgrexNode[],
  edges: AgrexEdge[],
): Promise<Map<string, { x: number; y: number }>> {
  return elkStressLayout(nodes, edges, new Map())
}
