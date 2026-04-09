import type { LayoutFn } from '../types'

const GOLDEN_ANGLE = 2.399963229728653
const BASE_R = 140
const MIN_DIST = 100
const ROOT_RADIUS = 600
const ROOT_MIN_DIST = 300
const ROOT_STEP = 100

/** Place a new root node away from the centroid of all existing nodes. */
function placeRoot(placed: Map<string, { x: number; y: number }>): { x: number; y: number } {
  let cx = 0
  let cy = 0
  for (const [, pos] of placed) {
    cx += pos.x
    cy += pos.y
  }
  cx /= placed.size
  cy /= placed.size

  const angle = Math.random() * 2 * Math.PI
  const candidate = {
    x: cx + ROOT_RADIUS * Math.cos(angle),
    y: cy + ROOT_RADIUS * Math.sin(angle),
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
  parentPos: { x: number; y: number },
  placed: Map<string, { x: number; y: number }>,
): { x: number; y: number } {
  const parentDist = Math.hypot(parentPos.x, parentPos.y)

  // Count already-placed siblings around this parent
  let siblingIndex = 0
  for (const [, pos] of placed) {
    const d = Math.hypot(pos.x - parentPos.x, pos.y - parentPos.y)
    if (d > BASE_R * 0.5 && d < BASE_R * 1.5) siblingIndex++
  }

  const parentAngle = Math.atan2(parentPos.y || 1, parentPos.x || 1)

  for (let ring = 1; ring <= 10; ring++) {
    const r = BASE_R * ring
    const slots = Math.max(6, Math.floor((2 * Math.PI * r) / MIN_DIST))
    for (let s = 0; s < slots; s++) {
      const angle = parentAngle + siblingIndex * GOLDEN_ANGLE + (s * 2 * Math.PI) / slots
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

  const angle = Math.atan2(parentPos.y || 1, parentPos.x || 1)
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
      positions.set(node.id, placeRoot(positions))
      continue
    }

    const parentPos = pid ? positions.get(pid) : undefined
    positions.set(node.id, parentPos ? placeChild(parentPos, positions) : { x: 0, y: 0 })
  }

  return positions
}
