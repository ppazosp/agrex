import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgrexReplay } from '../replay/useAgrexReplay'
import type { AgrexEvent } from '../replay/types'

const sampleEvents: AgrexEvent[] = [
  { type: 'run_start', ts: 1000, run_id: 'r1' },
  { type: 'stage_change', ts: 1100, stage: 'research', status: 'running' },
  { type: 'node_add', ts: 1200, node: { id: 'a', type: 'agent', label: 'A', status: 'running' } },
  { type: 'agent_status', ts: 1300, agent: 'researcher', status: 'idle' },
  { type: 'node_update', ts: 1400, id: 'a', status: 'done' },
]

describe('useAgrexReplay — load / seek / step', () => {
  it('starts idle with no events', () => {
    const { result } = renderHook(() => useAgrexReplay())
    expect(result.current.events).toEqual([])
    expect(result.current.cursor).toBe(0)
    expect(result.current.mode).toBe('idle')
  })

  it('load(events) enters replay mode at cursor=events.length', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    expect(result.current.events).toHaveLength(5)
    expect(result.current.cursor).toBe(5)
    expect(result.current.mode).toBe('replay')
  })

  it('load accepts a Promise<events>', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(Promise.resolve(sampleEvents))
    })
    expect(result.current.events).toHaveLength(5)
  })

  it('seek clamps to bounds', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    act(() => result.current.seek(-10))
    expect(result.current.cursor).toBe(0)
    act(() => result.current.seek(999))
    expect(result.current.cursor).toBe(5)
    act(() => result.current.seek(2))
    expect(result.current.cursor).toBe(2)
  })

  it('stepForward advances to next mutation boundary', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    act(() => result.current.seek(0))
    // Mutating events in sampleEvents: node_add @ idx 2, node_update @ idx 4.
    // Default boundaries: [3, 5].
    act(() => result.current.stepForward())
    expect(result.current.cursor).toBe(3)
    act(() => result.current.stepForward())
    expect(result.current.cursor).toBe(5)
    // At the end, stays at events.length.
    act(() => result.current.stepForward())
    expect(result.current.cursor).toBe(5)
  })

  it('stepBack retreats to previous mutation boundary', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    // cursor starts at 5; boundaries [3, 5].
    act(() => result.current.stepBack())
    expect(result.current.cursor).toBe(3)
    act(() => result.current.stepBack())
    expect(result.current.cursor).toBe(0)
  })

  it('custom stepBoundaries override the default', async () => {
    const { result } = renderHook(() =>
      useAgrexReplay({
        stepBoundaries: (events) => events.map((e, i) => (e.type === 'stage_change' ? i + 1 : -1)).filter((n) => n > 0),
      }),
    )
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    act(() => result.current.seek(0))
    act(() => result.current.stepForward())
    // stage_change @ idx 1 → boundary at 2
    expect(result.current.cursor).toBe(2)
  })

  it('play at end auto-rewinds to 0', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    expect(result.current.cursor).toBe(5)
    act(() => result.current.play())
    expect(result.current.cursor).toBe(0)
    expect(result.current.playing).toBe(true)
  })

  it('appendLive is ignored in replay mode', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    const before = result.current.events.length
    act(() => {
      result.current.appendLive({ type: 'node_add', ts: 9999, node: { id: 'stray', type: 'agent', label: 's' } })
    })
    expect(result.current.events.length).toBe(before)
  })

  it('reset clears events and returns to idle', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    act(() => result.current.reset())
    expect(result.current.events).toEqual([])
    expect(result.current.cursor).toBe(0)
    expect(result.current.mode).toBe('idle')
  })
})

describe('useAgrexReplay — live streaming', () => {
  it('appendLive pins cursor to tail', () => {
    const { result } = renderHook(() => useAgrexReplay())
    act(() => result.current.setMode('live'))
    act(() => result.current.appendLive({ type: 'node_add', ts: 1, node: { id: 'a', type: 'agent', label: 'A' } }))
    expect(result.current.events).toHaveLength(1)
    expect(result.current.cursor).toBe(1)
    act(() => result.current.appendLive({ type: 'node_add', ts: 2, node: { id: 'b', type: 'agent', label: 'B' } }))
    expect(result.current.cursor).toBe(2)
  })

  it('scrubbed-back cursor stays put while live events append', () => {
    const { result } = renderHook(() => useAgrexReplay())
    act(() => result.current.setMode('live'))
    act(() => result.current.appendLive({ type: 'node_add', ts: 1, node: { id: 'a', type: 'agent', label: 'A' } }))
    act(() => result.current.seek(0))
    expect(result.current.cursor).toBe(0)
    act(() => result.current.appendLive({ type: 'node_add', ts: 2, node: { id: 'b', type: 'agent', label: 'B' } }))
    expect(result.current.cursor).toBe(0) // user kept their scrub
    expect(result.current.events).toHaveLength(2)
  })
})

describe('useAgrexReplay — instance sync', () => {
  it('graph store reflects cursor prefix', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    expect(result.current.instance.nodes).toHaveLength(1)
    expect(result.current.instance.nodes[0].status).toBe('done')
    act(() => result.current.seek(3)) // before node_update
    expect(result.current.instance.nodes[0].status).toBe('running')
    act(() => result.current.seek(0))
    expect(result.current.instance.nodes).toHaveLength(0)
  })
})

describe('useAgrexReplay — incremental forward motion', () => {
  it('forward stepping does not evict existing nodes from the store', async () => {
    // When cursor moves forward through a pre-loaded stream, the store should
    // retain all previously-added nodes and only *append* the new ones. This
    // is what keeps downstream layout position caches stable during playback.
    const events: AgrexEvent[] = [
      { type: 'node_add', ts: 0, node: { id: 'a', type: 'agent', label: 'A' } },
      { type: 'node_add', ts: 1, node: { id: 'b', type: 'agent', label: 'B' } },
      { type: 'node_add', ts: 2, node: { id: 'c', type: 'agent', label: 'C' } },
    ]
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    act(() => result.current.seek(1))
    const nodeA_atSeek1 = result.current.instance.nodes.find((n) => n.id === 'a')
    expect(nodeA_atSeek1).toBeDefined()
    act(() => result.current.seek(2))
    const nodeA_atSeek2 = result.current.instance.nodes.find((n) => n.id === 'a')
    // Same reference — incremental forward motion must not recreate existing
    // nodes, otherwise layout caches keyed by reference equality miss.
    expect(nodeA_atSeek2).toBe(nodeA_atSeek1)
  })
})

describe('useAgrexReplay — markers', () => {
  it('markerExtractor output is exposed and filterable by kind', async () => {
    const { result } = renderHook(() =>
      useAgrexReplay({
        markerExtractor: (events) =>
          events
            .map((ev, i) =>
              ev.type === 'stage_change' ? { cursor: i, kind: 'stage' as const, label: String(ev.stage) } : null,
            )
            .filter((m): m is { cursor: number; kind: 'stage'; label: string } => m !== null),
      }),
    )
    await act(async () => {
      await result.current.load(sampleEvents)
    })
    expect(result.current.markers).toHaveLength(1)
    expect(result.current.markers[0].kind).toBe('stage')

    act(() => result.current.seek(5))
    act(() => result.current.prevMarker('stage'))
    expect(result.current.cursor).toBe(1)
    act(() => result.current.nextMarker('stage'))
    expect(result.current.cursor).toBe(5) // past the last stage marker → tail
  })
})

describe('useAgrexReplay — playback timing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances at inter-event ts deltas', async () => {
    const events: AgrexEvent[] = [
      { type: 'run_start', ts: 0 },
      { type: 'node_add', ts: 100, node: { id: 'a', type: 'agent', label: 'A' } },
      { type: 'node_add', ts: 250, node: { id: 'b', type: 'agent', label: 'B' } },
    ]
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    act(() => result.current.seek(0))
    act(() => result.current.play())

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.cursor).toBe(1)
    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current.cursor).toBe(2)
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.cursor).toBe(3)
    expect(result.current.playing).toBe(false)
  })

  it('caps gap at maxPlaybackGapMs (default 300)', async () => {
    const events: AgrexEvent[] = [
      { type: 'run_start', ts: 0 },
      { type: 'node_add', ts: 5000, node: { id: 'a', type: 'agent', label: 'A' } },
    ]
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    act(() => result.current.seek(0))
    act(() => result.current.play())
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.cursor).toBe(1)
  })

  it('maxPlaybackGapMs is configurable', async () => {
    const events: AgrexEvent[] = [
      { type: 'run_start', ts: 0 },
      { type: 'node_add', ts: 5000, node: { id: 'a', type: 'agent', label: 'A' } },
    ]
    const { result } = renderHook(() => useAgrexReplay({ maxPlaybackGapMs: 50 }))
    await act(async () => {
      await result.current.load(events)
    })
    act(() => result.current.seek(0))
    act(() => result.current.play())
    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.cursor).toBe(1)
  })

  it('speed=2 halves the delay', async () => {
    const events: AgrexEvent[] = [
      { type: 'run_start', ts: 0 },
      { type: 'node_add', ts: 100, node: { id: 'a', type: 'agent', label: 'A' } },
    ]
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    act(() => result.current.seek(0))
    act(() => result.current.setSpeed(2))
    act(() => result.current.play())
    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.cursor).toBe(1)
  })
})
