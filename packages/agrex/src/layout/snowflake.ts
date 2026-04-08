import type { AgrexNode } from '../types'

const RING_SPACING = 160

/**
 * Full relayout: places all nodes in a snowflake / radial-tree pattern.
 * Root at center, children evenly distributed in proportional angular sectors.
 */
export function snowflakeLayout(nodes: AgrexNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return positions

  // Build parent→children lookup
  const childrenOf = new Map<string, string[]>()
  const roots: string[] = []
  for (const n of nodes) {
    if (n.parentId) {
      let children = childrenOf.get(n.parentId)
      if (!children) {
        children = []
        childrenOf.set(n.parentId, children)
      }
      children.push(n.id)
    } else {
      roots.push(n.id)
    }
  }

  // Compute subtree sizes (memoized)
  const sizeCache = new Map<string, number>()
  function subtreeSize(id: string): number {
    if (sizeCache.has(id)) return sizeCache.get(id)!
    const children = childrenOf.get(id)
    let s = 1
    if (children) for (const c of children) s += subtreeSize(c)
    sizeCache.set(id, s)
    return s
  }

  function place(id: string, cx: number, cy: number, depth: number, angleStart: number, angleEnd: number) {
    positions.set(id, { x: cx, y: cy })
    const children = childrenOf.get(id)
    if (!children || children.length === 0) return

    const r = RING_SPACING * (depth + 1)
    const totalChildren = children.reduce((s, c) => s + subtreeSize(c), 0)
    let cursor = angleStart

    for (const cid of children) {
      const weight = subtreeSize(cid) / totalChildren
      const sector = (angleEnd - angleStart) * weight
      const mid = cursor + sector / 2
      const x = cx + r * Math.cos(mid)
      const y = cy + r * Math.sin(mid)
      place(cid, x, y, depth + 1, cursor, cursor + sector)
      cursor += sector
    }
  }

  if (roots.length === 1) {
    place(roots[0], 0, 0, 0, 0, 2 * Math.PI)
  } else {
    // Multiple roots: distribute evenly around center
    const totalSize = roots.reduce((s, r) => s + subtreeSize(r), 0)
    let cursor = 0
    for (const rid of roots) {
      const weight = subtreeSize(rid) / totalSize
      const sector = 2 * Math.PI * weight
      const mid = cursor + sector / 2
      const r = RING_SPACING
      const x = r * Math.cos(mid)
      const y = r * Math.sin(mid)
      place(rid, x, y, 1, cursor, cursor + sector)
      cursor += sector
    }
  }

  return positions
}
