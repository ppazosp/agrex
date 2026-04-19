import type { LayoutFn } from '../types'

const BASE_R = 140
const MIN_DIST = 100
const ROOT_RADIUS = 600
const ROOT_MIN_DIST = 300
const ROOT_STEP = 100

/** Derive a stable angle in [0, 2π) from a node id. Keeps layouts reproducible
 * so event-sourced replays render identically to the original live run. */
function angleFromId(id: string): number {
  let h = 2166136261 // FNV-1a 32-bit offset basis
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) / 0x100000000) * 2 * Math.PI
}

/** Place a new root on a circle around the origin, at an angle derived from
 * its id. Deliberately *not* centroid-based: a centroid anchor means the same
 * root lands at different absolute coordinates depending on which siblings
 * happen to be placed at the time — fine for live-only, wrong for replay
 * (scrub-back, jump, and live streams would each place the same node
 * differently). The collision push-out below still guarantees no two roots
 * overlap, and the push direction is the root's own id-angle so convergence
 * is order-invariant. */
function placeRoot(id: string, placed: Map<string, { x: number; y: number }>): { x: number; y: number } {
  const angle = angleFromId(id)
  const candidate = {
    x: ROOT_RADIUS * Math.cos(angle),
    y: ROOT_RADIUS * Math.sin(angle),
  }

  let tooClose = true
  let iterations = 0
  while (tooClose && iterations < 200) {
    tooClose = false
    iterations++
    for (const [, pos] of placed) {
      if (Math.hypot(pos.x - candidate.x, pos.y - candidate.y) < ROOT_MIN_DIST) {
        candidate.x += ROOT_STEP * Math.cos(angle)
        candidate.y += ROOT_STEP * Math.sin(angle)
        tooClose = true
        break
      }
    }
  }

  return candidate
}

function placeChild(
  childId: string,
  parentPos: { x: number; y: number },
  placed: Map<string, { x: number; y: number }>,
): { x: number; y: number } {
  const parentDist = Math.hypot(parentPos.x, parentPos.y)
  const parentAngle = Math.atan2(parentPos.y || 1, parentPos.x || 1)
  // id-derived sibling spread — order-invariant so replay reproduces the
  // same placement as the original live run, regardless of how many siblings
  // were in the layout map at the time the child was placed.
  const childAngleOffset = angleFromId(childId)

  for (let ring = 1; ring <= 10; ring++) {
    const r = BASE_R * ring
    const slots = Math.max(6, Math.floor((2 * Math.PI * r) / MIN_DIST))
    for (let s = 0; s < slots; s++) {
      const angle = parentAngle + childAngleOffset + (s * 2 * Math.PI) / slots
      const x = parentPos.x + r * Math.cos(angle)
      const y = parentPos.y + r * Math.sin(angle)

      if (Math.hypot(x, y) <= parentDist + 20) continue

      let free = true
      for (const [, pos] of placed) {
        if (Math.hypot(pos.x - x, pos.y - y) < MIN_DIST) {
          free = false
          break
        }
      }
      if (free) return { x, y }
    }
  }

  // Final fallback: place along the parent-outward direction offset by the
  // child's id-angle so even overflow placements stay deterministic per id.
  const angle = parentAngle + childAngleOffset
  return {
    x: parentPos.x + BASE_R * Math.cos(angle),
    y: parentPos.y + BASE_R * Math.sin(angle),
  }
}

export const radialLayout: LayoutFn = (nodes, _edges, existingPositions) => {
  const positions = new Map(existingPositions)

  const parentOf = new Map<string, string>()
  for (const node of nodes) {
    if (node.parentId) {
      parentOf.set(node.id, node.parentId)
    }
  }

  for (const node of nodes) {
    if (positions.has(node.id)) continue

    const pid = parentOf.get(node.id)
    if (pid && !positions.has(pid) && positions.size > 0) continue

    if (!pid && positions.size > 0) {
      positions.set(node.id, placeRoot(node.id, positions))
      continue
    }

    const parentPos = pid ? positions.get(pid) : undefined
    positions.set(node.id, parentPos ? placeChild(node.id, parentPos, positions) : { x: 0, y: 0 })
  }

  return positions
}
