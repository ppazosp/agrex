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
const PADDING = 20 // extra space between nodes

interface SimNode extends SimulationNodeDatum {
  id: string
  type: string
  w: number
  h: number
  settled: boolean // true = existing node, pin it
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
}

/**
 * Custom rectangular collision force.
 * Treats each node as a rectangle (w x h) + padding and pushes apart on overlap.
 */
function forceRectCollide(padding: number) {
  let nodes: SimNode[] = []

  function force(alpha: number) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]

        const dx = (b.x ?? 0) - (a.x ?? 0)
        const dy = (b.y ?? 0) - (a.y ?? 0)

        const overlapX = (a.w + b.w) / 2 + padding - Math.abs(dx)
        const overlapY = (a.h + b.h) / 2 + padding - Math.abs(dy)

        if (overlapX > 0 && overlapY > 0) {
          // Push apart along the axis of least overlap
          const strength = alpha * 0.8

          if (overlapX < overlapY) {
            const shift = overlapX * strength * 0.5
            const sx = dx > 0 ? shift : -shift
            if (!a.settled) { a.x = (a.x ?? 0) - sx }
            if (!b.settled) { b.x = (b.x ?? 0) + sx }
          } else {
            const shift = overlapY * strength * 0.5
            const sy = dy > 0 ? shift : -shift
            if (!a.settled) { a.y = (a.y ?? 0) - sy }
            if (!b.settled) { b.y = (b.y ?? 0) + sy }
          }
        }
      }
    }
  }

  force.initialize = (n: SimNode[]) => { nodes = n }

  return force
}

/**
 * d3-force layout with rectangular collision detection.
 * Existing nodes are pinned (fx/fy), only new nodes are simulated.
 * Runs synchronously for a fixed number of ticks.
 */
export const forceLayout: LayoutFn = (nodes, edges, existingPositions) => {
  const positions = new Map(existingPositions)

  // Find new nodes (not yet positioned)
  const newNodeIds = new Set<string>()
  for (const node of nodes) {
    if (!positions.has(node.id)) newNodeIds.add(node.id)
  }

  // Nothing new to place
  if (newNodeIds.size === 0) return positions

  // Build parent lookup for initial placement of new nodes
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
      // Place new node near its parent (with jitter to avoid stacking)
      const parentPos = node.parentId ? positions.get(node.parentId) : undefined
      if (parentPos) {
        const angle = Math.random() * Math.PI * 2
        x = parentPos.x + Math.cos(angle) * 140
        y = parentPos.y + Math.sin(angle) * 140
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
      // Pin settled nodes
      fx: isNew ? undefined : x,
      fy: isNew ? undefined : y,
      settled: !isNew,
    }
  })

  const nodeById = new Map(simNodes.map(n => [n.id, n]))

  // Create simulation links (only for edges where both nodes exist)
  const simLinks: SimLink[] = edges
    .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
    .map(e => ({ source: e.source, target: e.target }))

  // Build and run simulation
  const sim = forceSimulation<SimNode>(simNodes)
    .force('link', forceLink<SimNode, SimLink>(simLinks)
      .id(d => d.id)
      .distance(200)
      .strength(0.4))
    .force('charge', forceManyBody<SimNode>().strength(-400).distanceMax(800))
    .force('centerX', forceX<SimNode>(0).strength(0.01))
    .force('centerY', forceY<SimNode>(0).strength(0.01))
    .force('collide', forceRectCollide(PADDING))
    .stop()

  // Run ticks synchronously — more ticks for larger batches
  const ticks = newNodeIds.size <= 3 ? 100 : 150
  for (let i = 0; i < ticks; i++) {
    sim.tick()
  }

  // Extract final positions
  for (const simNode of simNodes) {
    positions.set(simNode.id, { x: simNode.x ?? 0, y: simNode.y ?? 0 })
  }

  return positions
}
