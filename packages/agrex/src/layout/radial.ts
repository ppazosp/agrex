import type { LayoutFn } from '../types'

const GOLDEN_ANGLE = 2.399963229728653
const BASE_R = 140
const MIN_DIST = 100

function placeNode(
  parentPos: { x: number; y: number } | undefined,
  placed: Map<string, { x: number; y: number }>,
  childIndex: number,
): { x: number; y: number } {
  if (!parentPos) return { x: 0, y: 0 }

  const parentDist = Math.hypot(parentPos.x, parentPos.y)

  for (let ring = 1; ring <= 10; ring++) {
    const r = BASE_R * ring
    const slots = Math.max(6, Math.floor((2 * Math.PI * r) / MIN_DIST))
    for (let s = 0; s < slots; s++) {
      const angle = childIndex * GOLDEN_ANGLE + (s * 2 * Math.PI) / slots
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

export const radialLayout: LayoutFn = (nodes, edges, existingPositions) => {
  const positions = new Map(existingPositions)
  const childCount = new Map<string, number>()

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
    if (!pid && positions.size > 0) continue

    const parentPos = pid ? positions.get(pid) : undefined
    const ci = pid ? (childCount.get(pid) ?? 0) : 0
    if (pid) childCount.set(pid, ci + 1)

    positions.set(node.id, placeNode(parentPos, positions, ci))
  }

  return positions
}
