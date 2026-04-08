import type { AgrexNode, AgrexEdge, UseAgrexReturn } from '../types'

interface ReplayOptions {
  speed?: number
  delay?: number
}

interface Scenario {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
}

export interface ReplayController {
  cancel: () => void
  pause: () => void
  resume: () => void
  setSpeed: (speed: number) => void
  readonly isPaused: boolean
  readonly isComplete: boolean
}

export function replay(
  instance: Pick<UseAgrexReturn, 'addNode' | 'addEdge' | 'updateNode' | 'clear'>,
  scenario: Scenario,
  options: ReplayOptions = {},
): ReplayController {
  const { delay = 150 } = options
  let speed = Math.max(0.1, options.speed ?? 1)
  let cancelled = false
  let paused = false
  let complete = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let resumeFn: (() => void) | null = null

  instance.clear()

  // Add any explicit edges upfront
  for (const edge of scenario.edges) {
    instance.addEdge(edge)
  }

  const items = [...scenario.nodes]
  let i = 0

  // Pre-compute set of nodeIds that have children appearing later in the sequence — O(n)
  const hasChildAfter = new Set<string>()
  for (let j = items.length - 1; j >= 0; j--) {
    const pid = items[j].parentId
    if (pid) hasChildAfter.add(pid)
  }
  // Track remaining children count per parent to know when all children are processed
  const remainingChildren = new Map<string, number>()
  for (const item of items) {
    if (item.parentId) remainingChildren.set(item.parentId, (remainingChildren.get(item.parentId) ?? 0) + 1)
  }

  function scheduleNext(fn: () => void) {
    timer = setTimeout(fn, delay / speed)
  }

  function next() {
    if (cancelled || i >= items.length) return

    if (paused) {
      resumeFn = next
      return
    }

    const node = items[i]
    instance.addNode({ ...node, status: 'running' })

    // Decrement remaining children for this node's parent
    if (node.parentId) {
      const rem = (remainingChildren.get(node.parentId) ?? 1) - 1
      remainingChildren.set(node.parentId, rem)
      if (rem <= 0) hasChildAfter.delete(node.parentId)
    }

    // Mark previous node done only if it has no unprocessed children
    if (i > 0) {
      const prev = items[i - 1]
      if (!hasChildAfter.has(prev.id)) {
        instance.updateNode(prev.id, { status: 'done' })
      }
    }

    i++

    if (i >= items.length) {
      scheduleNext(() => {
        if (!cancelled) {
          // Mark all remaining nodes as done
          for (const item of items) {
            instance.updateNode(item.id, { status: 'done' })
          }
          complete = true
        }
      })
    } else {
      scheduleNext(next)
    }
  }

  next()

  return {
    cancel: () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    },
    pause: () => {
      paused = true
      if (timer) {
        clearTimeout(timer)
        timer = null
        resumeFn = next
      }
    },
    resume: () => {
      if (!paused) return
      paused = false
      resumeFn?.()
      resumeFn = null
    },
    setSpeed: (s: number) => {
      speed = Math.max(0.1, s)
    },
    get isPaused() {
      return paused
    },
    get isComplete() {
      return complete
    },
  }
}
