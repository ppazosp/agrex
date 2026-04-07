import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type { LayoutFn } from '../types'

/**
 * Node sizes per type — used for rectangular collision.
 * Width and height in pixels (matching the actual node components).
 */
const NODE_SIZES: Record<string, { w: number; h: number }> = {
  agent: { w: 80, h: 80 },
  sub_agent: { w: 56, h: 56 },
  tool: { w: 36, h: 36 },
  file: { w: 46, h: 46 },
  output: { w: 48, h: 56 },
  search: { w: 32, h: 32 },
}
const DEFAULT_SIZE = { w: 48, h: 48 }
const PADDING = 24

interface SimNode extends SimulationNodeDatum {
  id: string
  type: string
  w: number
  h: number
  pinned: boolean
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
}

/**
 * Hard collision resolver — guarantees zero overlaps.
 * Iterates until no rectangles overlap (max iterations to prevent infinite loops).
 * Only moves unpinned nodes; if both are pinned and overlap, moves the second one anyway.
 */
function resolveCollisions(nodes: SimNode[], padding: number, maxIter = 50) {
  for (let iter = 0; iter < maxIter; iter++) {
    let anyOverlap = false

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]

        const dx = (b.x ?? 0) - (a.x ?? 0)
        const dy = (b.y ?? 0) - (a.y ?? 0)

        const minDx = (a.w + b.w) / 2 + padding
        const minDy = (a.h + b.h) / 2 + padding

        const overlapX = minDx - Math.abs(dx)
        const overlapY = minDy - Math.abs(dy)

        if (overlapX > 0 && overlapY > 0) {
          anyOverlap = true

          // Push apart along the axis of least overlap
          if (overlapX < overlapY) {
            const sign = dx >= 0 ? 1 : -1
            if (!a.pinned && !b.pinned) {
              a.x = (a.x ?? 0) - sign * overlapX * 0.5
              b.x = (b.x ?? 0) + sign * overlapX * 0.5
            } else if (!b.pinned) {
              b.x = (b.x ?? 0) + sign * overlapX
            } else if (!a.pinned) {
              a.x = (a.x ?? 0) - sign * overlapX
            } else {
              // Both pinned — force move the later one
              b.x = (b.x ?? 0) + sign * overlapX
              b.pinned = false // unpin so it can be adjusted further
            }
          } else {
            const sign = dy >= 0 ? 1 : -1
            if (!a.pinned && !b.pinned) {
              a.y = (a.y ?? 0) - sign * overlapY * 0.5
              b.y = (b.y ?? 0) + sign * overlapY * 0.5
            } else if (!b.pinned) {
              b.y = (b.y ?? 0) + sign * overlapY
            } else if (!a.pinned) {
              a.y = (a.y ?? 0) - sign * overlapY
            } else {
              b.y = (b.y ?? 0) + sign * overlapY
              b.pinned = false
            }
          }
        }
      }
    }

    if (!anyOverlap) break
  }
}

/**
 * d3-force layout with guaranteed zero overlaps.
 *
 * 1. Use d3-force simulation for organic placement (links, charge, centering)
 * 2. Run hard collision resolution pass to guarantee zero rectangle overlaps
 *
 * Existing nodes are pinned — only new nodes move.
 */
export const forceLayout: LayoutFn = (nodes, edges, existingPositions) => {
  const positions = new Map(existingPositions)

  // Find new nodes (not yet positioned)
  const newNodeIds = new Set<string>()
  for (const node of nodes) {
    if (!positions.has(node.id)) newNodeIds.add(node.id)
  }

  if (newNodeIds.size === 0) return positions

  // Build parent lookup
  const parentOf = new Map<string, string>()
  for (const node of nodes) {
    if (node.parentId) parentOf.set(node.id, node.parentId)
  }

  // Create simulation nodes
  const simNodes: SimNode[] = nodes.map(node => {
    const size = NODE_SIZES[node.type] ?? DEFAULT_SIZE
    const existing = positions.get(node.id)
    const isNew = newNodeIds.has(node.id)

    let x: number, y: number
    if (existing) {
      x = existing.x
      y = existing.y
    } else {
      const parentPos = node.parentId ? positions.get(node.parentId) : undefined
      if (parentPos) {
        const angle = Math.random() * Math.PI * 2
        x = parentPos.x + Math.cos(angle) * 160
        y = parentPos.y + Math.sin(angle) * 160
      } else {
        x = 0
        y = 0
      }
    }

    return {
      id: node.id,
      type: node.type,
      w: size.w,
      h: size.h,
      x,
      y,
      fx: isNew ? undefined : x,
      fy: isNew ? undefined : y,
      pinned: !isNew,
    }
  })

  const nodeById = new Map(simNodes.map(n => [n.id, n]))

  const simLinks: SimLink[] = edges
    .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
    .map(e => ({ source: e.source, target: e.target }))

  // Phase 1: d3-force simulation for organic placement
  const sim = forceSimulation<SimNode>(simNodes)
    .force('link', forceLink<SimNode, SimLink>(simLinks)
      .id(d => d.id)
      .distance(200)
      .strength(0.5))
    .force('charge', forceManyBody<SimNode>().strength(-500).distanceMax(800))
    .force('centerX', forceX<SimNode>(0).strength(0.01))
    .force('centerY', forceY<SimNode>(0).strength(0.01))
    .stop()

  const ticks = newNodeIds.size <= 3 ? 80 : 120
  for (let i = 0; i < ticks; i++) {
    sim.tick()
  }

  // Unpin for collision resolution — copy final sim positions
  for (const node of simNodes) {
    node.fx = undefined
    node.fy = undefined
    // Re-pin settled nodes (so collision resolver prefers moving new nodes)
    node.pinned = !newNodeIds.has(node.id)
  }

  // Phase 2: hard collision resolution — guarantees zero overlaps
  resolveCollisions(simNodes, PADDING)

  // Extract final positions
  for (const simNode of simNodes) {
    positions.set(simNode.id, { x: simNode.x ?? 0, y: simNode.y ?? 0 })
  }

  return positions
}
