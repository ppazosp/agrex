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

    if (i > 0) {
      instance.updateNode(items[i - 1].id, { status: 'done' })
    }

    i++

    if (i >= items.length) {
      scheduleNext(() => {
        if (!cancelled) {
          instance.updateNode(node.id, { status: 'done' })
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
