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
  let speed = options.speed ?? 1
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

  // Precompute which nodes have children later in the sequence
  function hasLaterChildren(nodeId: string, fromIndex: number): boolean {
    for (let j = fromIndex; j < items.length; j++) {
      if (items[j].parentId === nodeId) return true
    }
    return false
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

    // Mark previous node done only if it has no unprocessed children
    if (i > 0) {
      const prev = items[i - 1]
      if (!hasLaterChildren(prev.id, i)) {
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
      if (timer) clearTimeout(timer)
    },
    resume: () => {
      if (!paused) return
      paused = false
      resumeFn?.()
      resumeFn = null
    },
    setSpeed: (s: number) => { speed = s },
    get isPaused() { return paused },
    get isComplete() { return complete },
  }
}
