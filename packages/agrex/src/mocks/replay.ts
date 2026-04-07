import type { AgrexNode, AgrexEdge, UseAgrexReturn } from '../types'

interface ReplayOptions {
  speed?: number
  delay?: number
}

interface Scenario {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
}

export function replay(
  instance: Pick<UseAgrexReturn, 'addNode' | 'addEdge' | 'updateNode' | 'clear'>,
  scenario: Scenario,
  options: ReplayOptions = {},
): () => void {
  const { speed = 1, delay = 150 } = options
  const ms = delay / speed
  let cancelled = false

  const edgesByTarget = new Map<string, AgrexEdge[]>()
  for (const edge of scenario.edges) {
    const existing = edgesByTarget.get(edge.target) ?? []
    existing.push(edge)
    edgesByTarget.set(edge.target, existing)
  }

  instance.clear()

  const items = [...scenario.nodes]
  let i = 0

  function next() {
    if (cancelled || i >= items.length) return

    const node = items[i]
    instance.addNode({ ...node, status: 'running' })

    const nodeEdges = edgesByTarget.get(node.id) ?? []
    for (const edge of nodeEdges) {
      instance.addEdge(edge)
    }
    for (const edge of scenario.edges) {
      if (edge.source === node.id && !nodeEdges.includes(edge)) {
        const targetExists = items.slice(0, i).some(n => n.id === edge.target)
        if (targetExists) instance.addEdge(edge)
      }
    }

    if (i > 0) {
      instance.updateNode(items[i - 1].id, { status: 'done' })
    }

    i++

    if (i >= items.length) {
      setTimeout(() => {
        if (!cancelled) instance.updateNode(node.id, { status: 'done' })
      }, ms)
    } else {
      setTimeout(next, ms)
    }
  }

  next()

  return () => { cancelled = true }
}
