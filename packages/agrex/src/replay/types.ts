import type { Theme, UseAgrexReturn } from '../types'

/**
 * A single event in a recorded execution stream.
 *
 * `type` is an open string — agrex knows a handful of built-in mutation types
 * and consumers can register custom types via `reducers`. `ts` is the emitter
 * timestamp (ms since epoch) and drives playback timing; `seq` is an optional
 * monotonic counter for the consumer's own ordering/deduplication.
 */
export interface AgrexEvent<T extends string = string> {
  type: T
  ts: number
  seq?: number
  [k: string]: unknown
}

export type ReplayMode = 'idle' | 'live' | 'live-finished' | 'replay'

/**
 * A marker on the timeline scrubber. `kind` is a free-form consumer tag used
 * both for styling and for the prev/next-marker jump buttons (see
 * `AgrexTimeline.jumpMarkerKind`). `cursor` is the event index to seek to.
 */
export interface AgrexMarker {
  cursor: number
  kind: string
  label?: string
  color?: string
}

/**
 * A reducer that folds one event into the agrex graph store.
 *
 * The reducer calls store methods imperatively (`store.addNode`,
 * `store.updateNode`, …). Returning anything is ignored. Reducers for unknown
 * event types in the consumer's map are no-ops.
 *
 * Built-in reducers exist for: `node_add`, `node_update`, `node_remove`,
 * `edge_add`, `edge_remove`, `clear`. Consumer reducers override built-ins
 * when they share a `type`.
 */
export type EventReducer = (store: ReducerStore, event: AgrexEvent) => void

/**
 * The slice of `UseAgrexReturn` that event reducers may call. Read access is
 * intentionally omitted — reducers should be pure projections of the event
 * stream and not branch on graph state.
 */
export type ReducerStore = Pick<
  UseAgrexReturn,
  'addNode' | 'addNodes' | 'updateNode' | 'removeNode' | 'addEdge' | 'addEdges' | 'removeEdge' | 'clear' | 'loadJSON'
>

export interface UseAgrexReplayOptions {
  /** Consumer reducers, keyed by event `type`. Override built-ins when keys collide. */
  reducers?: Record<string, EventReducer>
  /** Extract timeline markers from the full event log. Re-computed when events change. */
  markerExtractor?: (events: AgrexEvent[]) => AgrexMarker[]
  /**
   * Override the default step-boundary set (one cursor position per visible
   * graph delta). Default boundaries are emitted after every built-in mutation
   * event.
   */
  stepBoundaries?: (events: AgrexEvent[]) => number[]
  /**
   * Max interpolated delay between events during playback. Longer gaps are
   * capped so dead time doesn't freeze the UI. Default: 300ms.
   */
  maxPlaybackGapMs?: number
}

export interface UseAgrexReplay {
  /** The graph store driven by the reduced event prefix `events[0..cursor]`. */
  instance: UseAgrexReturn

  events: AgrexEvent[]
  cursor: number
  mode: ReplayMode
  markers: AgrexMarker[]

  playing: boolean
  speed: number

  seek(cursor: number): void
  stepForward(): void
  stepBack(): void
  play(): void
  pause(): void
  setSpeed(speed: number): void

  prevMarker(kind?: string): void
  nextMarker(kind?: string): void

  /** Replace the event stream with a saved run and enter `replay` mode. */
  load(events: AgrexEvent[] | Promise<AgrexEvent[]>): Promise<void>
  /** Append a single live event (no-op while in `replay` mode). */
  appendLive(event: AgrexEvent): void
  setMode(mode: ReplayMode): void
  /** Jump the cursor to the tail of the event stream (exits scrub). */
  goLive(): void
  /** Clear events, reset cursor, return to `idle`. Does not touch `mode` otherwise. */
  reset(): void
}

export type TimelinePlacement = 'bottom' | 'top'

export interface TimelineInsets {
  top?: number
  bottom?: number
  left?: number
  right?: number
}

export interface AgrexTimelineProps {
  replay: UseAgrexReplay
  /** Optional exit button handler (shown only in `replay` mode). */
  onExit?: () => void
  onCollapsedChange?: (collapsed: boolean) => void
  /** Enables prev/next skip buttons that jump between markers of this kind. */
  jumpMarkerKind?: string
  /** Speeds offered in the selector. Default `[1, 2, 4]`. */
  speeds?: number[]
  showSpeedControl?: boolean
  showCollapseTab?: boolean
  /** localStorage key for persisting the collapsed state. Default `'agrex.timeline.collapsed'`. */
  persistKey?: string
  placement?: TimelinePlacement
  insets?: TimelineInsets
  className?: string
  /**
   * Theme to apply to the timeline. Only required when mounting
   * `<AgrexTimeline>` as a sibling of `<Agrex>` (rather than embedded inside
   * it via `replay` on `<Agrex>`) — `--agrex-*` CSS variables are scoped to
   * the Agrex root's subtree, so a sibling panel otherwise inherits nothing
   * and relies on the baked-in dark fallbacks.
   */
  theme?: Theme
}
