import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, render, act, fireEvent, screen } from '@testing-library/react'
import AgrexTimeline from '../replay/AgrexTimeline'
import { useAgrexReplay } from '../replay/useAgrexReplay'
import type { AgrexEvent } from '../replay/types'

const events: AgrexEvent[] = [
  { type: 'run_start', ts: 0 },
  { type: 'stage_change', ts: 100, stage: 'research' },
  { type: 'node_add', ts: 200, node: { id: 'a', type: 'agent', label: 'A' } },
  { type: 'node_add', ts: 300, node: { id: 'b', type: 'agent', label: 'B' } },
]

describe('AgrexTimeline', () => {
  beforeEach(() => {
    window.localStorage?.clear?.()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when replay.mode is idle', () => {
    const { result } = renderHook(() => useAgrexReplay())
    const { container } = render(<AgrexTimeline replay={result.current} />)
    expect(container.firstChild).toBeNull()
  })

  it('play button toggles playing state', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    const { rerender } = render(<AgrexTimeline replay={result.current} />)
    act(() => result.current.seek(0))
    rerender(<AgrexTimeline replay={result.current} />)

    const playButton = screen.getByLabelText('Play')
    fireEvent.click(playButton)
    expect(result.current.playing).toBe(true)
  })

  it('step-forward advances cursor to next boundary', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    act(() => result.current.seek(0))
    const { rerender } = render(<AgrexTimeline replay={result.current} />)
    rerender(<AgrexTimeline replay={result.current} />)

    fireEvent.click(screen.getByLabelText('Step forward'))
    expect(result.current.cursor).toBe(3) // node_add @ idx 2 → boundary 3
  })

  it('jumpMarkerKind enables prev/next marker buttons', async () => {
    const { result } = renderHook(() =>
      useAgrexReplay({
        markerExtractor: (evs) =>
          evs
            .map((ev, i) => (ev.type === 'stage_change' ? { cursor: i, kind: 'stage' as const } : null))
            .filter((m): m is { cursor: number; kind: 'stage' } => m !== null),
      }),
    )
    await act(async () => {
      await result.current.load(events)
    })

    const { rerender } = render(<AgrexTimeline replay={result.current} jumpMarkerKind="stage" />)
    rerender(<AgrexTimeline replay={result.current} jumpMarkerKind="stage" />)

    expect(screen.getByLabelText('Previous marker')).toBeTruthy()
    expect(screen.getByLabelText('Next marker')).toBeTruthy()

    act(() => result.current.seek(4))
    fireEvent.click(screen.getByLabelText('Previous marker'))
    expect(result.current.cursor).toBe(1)
  })

  it('hides marker skip buttons without jumpMarkerKind', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    render(<AgrexTimeline replay={result.current} />)
    expect(screen.queryByLabelText('Previous marker')).toBeNull()
    expect(screen.queryByLabelText('Next marker')).toBeNull()
  })

  it('exit button only renders when onExit provided and mode=replay', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    const onExit = vi.fn()
    render(<AgrexTimeline replay={result.current} onExit={onExit} />)
    const btn = screen.getByLabelText('Exit replay')
    fireEvent.click(btn)
    expect(onExit).toHaveBeenCalled()
  })

  it('persists collapsed state in localStorage', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    render(<AgrexTimeline replay={result.current} persistKey="test-key" />)
    const toggle = screen.getByLabelText('Collapse timeline')
    fireEvent.click(toggle)
    expect(window.localStorage.getItem('test-key')).toBe('1')
  })

  it('speed control sets the replay speed', async () => {
    const { result } = renderHook(() => useAgrexReplay())
    await act(async () => {
      await result.current.load(events)
    })
    const { rerender } = render(<AgrexTimeline replay={result.current} speeds={[1, 2]} />)
    rerender(<AgrexTimeline replay={result.current} speeds={[1, 2]} />)
    fireEvent.click(screen.getByText('2×'))
    expect(result.current.speed).toBe(2)
  })
})
