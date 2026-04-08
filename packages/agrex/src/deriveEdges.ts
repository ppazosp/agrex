import type { AgrexNode, AgrexEdge } from './types'

/** Derive edges from parentId, reads, and writes fields. */
export function deriveEdges(nodes: AgrexNode[], explicitEdges: AgrexEdge[]): AgrexEdge[] {
  const nodeIds = new Set(nodes.map(n => n.id))
  const explicitSet = new Set(explicitEdges.map(e => `${e.source}:${e.target}:${e.type ?? ''}`))
  const derived: AgrexEdge[] = []
  for (const node of nodes) {
    if (node.parentId && nodeIds.has(node.parentId)) {
      const key = `${node.parentId}:${node.id}:spawn`
      if (!explicitSet.has(key)) {
        derived.push({ id: `_spawn_${node.parentId}_${node.id}`, source: node.parentId, target: node.id, type: 'spawn' })
        explicitSet.add(key)
      }
    }
    if (node.reads) {
      for (const sourceId of node.reads) {
        if (!nodeIds.has(sourceId)) continue
        const key = `${sourceId}:${node.id}:read`
        if (!explicitSet.has(key)) {
          derived.push({ id: `_read_${sourceId}_${node.id}`, source: sourceId, target: node.id, type: 'read' })
          explicitSet.add(key)
        }
      }
    }
    if (node.writes) {
      for (const targetId of node.writes) {
        if (!nodeIds.has(targetId)) continue
        const key = `${node.id}:${targetId}:write`
        if (!explicitSet.has(key)) {
          derived.push({ id: `_write_${node.id}_${targetId}`, source: node.id, target: targetId, type: 'write' })
          explicitSet.add(key)
        }
      }
    }
  }
  return derived.length > 0 ? [...explicitEdges, ...derived] : explicitEdges
}
