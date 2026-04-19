import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAgrex } from '../hooks/useAgrex'
import { applyEvents, composeReducers, defaultStepBoundaries } from './reduceEvents'
import type { AgrexEvent, AgrexMarker, ReplayMode, UseAgrexReplay, UseAgrexReplayOptions } from './types'

const DEFAULT_MAX_GAP_MS = 300

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/**
 * Owns an agrex store and keeps it in sync with `events[0..cursor]`.
 *
 * Live streaming and seeking share a single source of truth: every cursor
 * change re-runs the reducer prefix into a freshly cleared store. That makes
 * scrub/step/play identical code paths and guarantees live/replay produce the
 * same graph state for the same event prefix (deterministic layout follows).
 */
export function useAgrexReplay(options: UseAgrexReplayOptions = {}): UseAgrexReplay {
  const instance = useAgrex()
  const reducers = useMemo(() => composeReducers(options.reducers), [options.reducers])
  const maxGap = options.maxPlaybackGapMs ?? DEFAULT_MAX_GAP_MS

  const [events, setEvents] = useState<AgrexEvent[]>([])
  const [cursor, setCursor] = useState(0)
  const [mode, setMode] = useState<ReplayMode>('idle')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState<number>(1)

  // Refs mirror the latest state so callbacks captured by the playback timer
  // stay current without re-subscribing.
  const eventsRef = useRef(events)
  eventsRef.current = events
  const cursorRef = useRef(cursor)
  cursorRef.current = cursor
  const modeRef = useRef(mode)
  modeRef.current = mode
  const speedRef = useRef(speed)
  speedRef.current = speed
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markers = useMemo<AgrexMarker[]>(
    () => options.markerExtractor?.(events) ?? [],
    [events, options.markerExtractor],
  )
  const boundaries = useMemo(
    () => options.stepBoundaries?.(events) ?? defaultStepBoundaries(events),
    [events, options.stepBoundaries],
  )
  const boundariesRef = useRef(boundaries)
  boundariesRef.current = boundaries
  const markersRef = useRef(markers)
  markersRef.current = markers

  // `useAgrex()` returns a new object literal each render (its method
  // references are stable, but the wrapper is not). Pinning it through a ref
  // keeps the projection effect from self-triggering after a store emit.
  const instanceRef = useRef(instance)
  instanceRef.current = instance

  // The store projection. Runs whenever the rendered prefix changes.
  useEffect(() => {
    applyEvents(instanceRef.current, events, cursor, reducers)
  }, [events, cursor, reducers])

  const stopTimer = useCallback(() => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current)
      playTimerRef.current = null
    }
    setPlaying(false)
  }, [])

  const load = useCallback(
    async (input: AgrexEvent[] | Promise<AgrexEvent[]>) => {
      stopTimer()
      const resolved = await Promise.resolve(input)
      setEvents(resolved)
      setCursor(resolved.length)
      setMode('replay')
    },
    [stopTimer],
  )

  const seek = useCallback(
    (c: number) => {
      stopTimer()
      setCursor(clamp(c, 0, eventsRef.current.length))
    },
    [stopTimer],
  )

  const stepForward = useCallback(() => {
    stopTimer()
    setCursor((prev) => {
      const next = boundariesRef.current.find((b) => b > prev)
      return next ?? eventsRef.current.length
    })
  }, [stopTimer])

  const stepBack = useCallback(() => {
    stopTimer()
    setCursor((prev) => {
      const earlier = boundariesRef.current.filter((b) => b < prev)
      return earlier.length ? earlier[earlier.length - 1] : 0
    })
  }, [stopTimer])

  const goLive = useCallback(() => {
    stopTimer()
    setCursor(eventsRef.current.length)
  }, [stopTimer])

  const reset = useCallback(() => {
    stopTimer()
    setEvents([])
    setCursor(0)
    setMode('idle')
  }, [stopTimer])

  const prevMarker = useCallback(
    (kind?: string) => {
      stopTimer()
      setCursor((prev) => {
        const pool = kind ? markersRef.current.filter((m) => m.kind === kind) : markersRef.current
        const earlier = pool.filter((m) => m.cursor < prev)
        return earlier.length ? earlier[earlier.length - 1].cursor : 0
      })
    },
    [stopTimer],
  )

  const nextMarker = useCallback(
    (kind?: string) => {
      stopTimer()
      setCursor((prev) => {
        const pool = kind ? markersRef.current.filter((m) => m.kind === kind) : markersRef.current
        const later = pool.find((m) => m.cursor > prev)
        return later ? later.cursor : eventsRef.current.length
      })
    },
    [stopTimer],
  )

  const play = useCallback(() => {
    // Auto-rewind from the tail so pressing play at the end replays from 0.
    if (cursorRef.current >= eventsRef.current.length) setCursor(0)
    setPlaying(true)
  }, [])

  const pause = useCallback(() => stopTimer(), [stopTimer])

  const setSpeed = useCallback((s: number) => {
    setSpeedState(Math.max(0.1, s))
  }, [])

  // Playback loop: schedules the next tick based on inter-event timestamp
  // delta, capped by `maxGap` / scaled by `speed`. Using setTimeout chained by
  // cursor rather than a fixed interval keeps timing faithful to the original
  // run's pacing.
  useEffect(() => {
    if (!playing) return
    const scheduleNext = (currentCursor: number) => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
      const evs = eventsRef.current
      if (currentCursor >= evs.length) {
        setPlaying(false)
        return
      }
      let delay: number
      if (currentCursor >= evs.length - 1) {
        delay = 0
      } else {
        const a = evs[currentCursor]
        const b = evs[currentCursor + 1]
        const raw = Math.max(0, Number(b.ts) - Number(a.ts))
        delay = Math.min(maxGap, raw) / speedRef.current
      }
      playTimerRef.current = setTimeout(() => {
        setCursor((prev) => {
          const next = prev + 1
          if (next >= eventsRef.current.length) {
            setPlaying(false)
            return eventsRef.current.length
          }
          scheduleNext(next)
          return next
        })
      }, delay)
    }
    scheduleNext(cursorRef.current)
    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current)
        playTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const appendLive = useCallback((event: AgrexEvent) => {
    // Live events must not corrupt a loaded past run.
    if (modeRef.current === 'replay') return
    setEvents((prev) => {
      const next = [...prev, event]
      // Keep cursor pinned to tail while the user hasn't scrubbed back.
      setCursor((c) => (c === prev.length ? next.length : c))
      return next
    })
  }, [])

  return {
    instance,
    events,
    cursor,
    mode,
    markers,
    playing,
    speed,
    seek,
    stepForward,
    stepBack,
    play,
    pause,
    setSpeed,
    prevMarker,
    nextMarker,
    load,
    appendLive,
    setMode,
    goLive,
    reset,
  }
}
