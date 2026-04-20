import { useCallback, useEffect, useState } from 'react'
import {
  Agrex,
  useAgrexReplay,
  snapshotToEvents,
  type AgrexEvent,
  type AgrexHandle,
  type AgrexMarker,
  type AgrexNode,
} from '@ppazosp/agrex'
import '@ppazosp/agrex/styles.css'
import Dropzone from './Dropzone'
import { demoTrace } from './demoTrace'
import { useRef } from 'react'

// Marker kinds the viewer knows about:
//   STAGE_KIND — chapters on the rail. Each one tints a segment of the
//     track in its own color and gets a sentinel pill.
//   ERROR_KIND — reserved red point markers from `status: 'error'`.
// Users can also define their own kinds via `marker` events (see docs);
// those render as point markers too, coloured by the event's `color`.
const STAGE_KIND = 'stage'
const ERROR_KIND = 'error'

// Curated palette for stages. Deliberately avoids agrex's status colours
// (green/done, orange/running, red/error) so stages never get confused
// with state. Hash-to-palette gives each label a stable colour across
// reloads.
const STAGE_PALETTE = [
  '#7c8cff', // indigo
  '#ff6b9d', // pink
  '#06b6d4', // cyan
  '#a855f7', // violet
  '#f472b6', // rose
  '#60a5fa', // blue
  '#c084fc', // lavender
  '#5eead4', // teal
] as const

function hashLabelToColor(label: string): string {
  // Tiny deterministic string hash — not cryptographic, just consistent.
  let h = 0
  for (let i = 0; i < label.length; i++) {
    h = (h * 31 + label.charCodeAt(i)) | 0
  }
  const idx = Math.abs(h) % STAGE_PALETTE.length
  return STAGE_PALETTE[idx]
}

function readStringField(ev: AgrexEvent, field: string): string | undefined {
  const v = (ev as Record<string, unknown>)[field]
  return typeof v === 'string' ? v : undefined
}

/**
 * Extract timeline markers from an arbitrary trace.
 *
 * Precedence:
 * 1. Explicit `stage` events — become STAGE_KIND with their supplied
 *    `color` or a hash-derived palette color.
 * 2. Explicit `marker` events — become whatever `kind` the event
 *    declares, colored by its `color`. Point markers, not chapters.
 * 3. Fallback: if no explicit `stage` events exist, agent / sub_agent
 *    spawns auto-promote to STAGE_KIND with hash-derived colors.
 * 4. Always: `status: 'error'` transitions emit ERROR_KIND (reserved
 *    red), regardless of the other rules.
 */
function extractMarkers(events: AgrexEvent[]): AgrexMarker[] {
  const hasExplicitStages = events.some((e) => e.type === STAGE_KIND)
  const out: AgrexMarker[] = []

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]
    const cursor = i + 1 // land on the state that includes the event

    if (ev.type === STAGE_KIND) {
      const label = readStringField(ev, 'label') ?? 'stage'
      const explicitColor = readStringField(ev, 'color')
      out.push({ cursor, kind: STAGE_KIND, label, color: explicitColor ?? hashLabelToColor(label) })
      continue
    }

    // Custom point markers — users declare `{ type: 'marker', kind, ... }`
    // to tag moments like `retry` or `checkpoint` without them becoming
    // rail segments. Unknown kinds are preserved verbatim so consumer
    // tooling (e.g. a kind-filtered jump) can read them back.
    if (ev.type === 'marker') {
      const kind = readStringField(ev, 'kind') ?? 'marker'
      const label = readStringField(ev, 'label') ?? kind
      const color = readStringField(ev, 'color')
      out.push({ cursor, kind, label, color })
      continue
    }

    if (ev.type === 'node_add') {
      const node = ev.node as AgrexNode | undefined
      if (!node) continue
      if (!hasExplicitStages && (node.type === 'agent' || node.type === 'sub_agent')) {
        out.push({ cursor, kind: STAGE_KIND, label: node.label, color: hashLabelToColor(node.label) })
      }
      if (node.status === 'error') {
        out.push({
          cursor,
          kind: ERROR_KIND,
          label: `error · ${node.label}`,
          color: 'var(--agrex-status-error, #ef4444)',
        })
      }
      continue
    }

    if (ev.type === 'node_update') {
      const status = (ev as Record<string, unknown>).status
      if (status !== 'error') continue
      const id = readStringField(ev, 'id')
      out.push({
        cursor,
        kind: ERROR_KIND,
        label: id ? `error · ${id}` : 'error',
        color: 'var(--agrex-status-error, #ef4444)',
      })
    }
  }
  return out
}

export default function App() {
  const [sourceLabel, setSourceLabel] = useState<string | null>(null)
  const replay = useAgrexReplay({ markerExtractor: extractMarkers })
  const agrexRef = useRef<AgrexHandle>(null)

  const loadEvents = useCallback(
    async (events: AgrexEvent[], label: string) => {
      // `replay.load` already sets cursor to `events.length` — an extra
      // `replay.seek(events.length)` here races against the events ref
      // (clamp reads the stale length on the first drop) and resets cursor
      // to 0. Trust `load`.
      await replay.load(events)
      setSourceLabel(label)
      // Push a history entry so the browser back button returns to the
      // landing instead of leaving the site. Only push if we're not
      // already on one (e.g. the user reloaded in trace view) so back
      // still works cleanly.
      if (window.location.hash !== '#trace') {
        window.history.pushState(null, '', '#trace')
      }
    },
    [replay],
  )

  const loadDemo = useCallback(() => {
    const events = snapshotToEvents(demoTrace.nodes, demoTrace.edges)
    loadEvents(events, 'demo: lithium research')
  }, [loadEvents])

  const reset = useCallback(() => {
    // Going back in history is the same gesture as the browser back
    // button — popstate handles the state reset, so both paths funnel
    // through the same teardown.
    if (window.location.hash === '#trace') {
      window.history.back()
      return
    }
    replay.reset()
    setSourceLabel(null)
  }, [replay])

  // Browser back (or forward → back) on the #trace URL returns to the
  // landing. Any hash that isn't '#trace' triggers the reset.
  useEffect(() => {
    const onPop = () => {
      if (window.location.hash === '#trace') return
      replay.reset()
      setSourceLabel(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [replay])

  if (!sourceLabel) {
    return <Dropzone onLoad={loadEvents} onLoadDemo={loadDemo} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Agrex ref={agrexRef} replay={replay} theme="dark" timelineProps={{ jumpMarkerKind: STAGE_KIND }} />
      <SourcePill sourceLabel={sourceLabel} onReset={reset} />
    </div>
  )
}

/**
 * Floating pill that matches agrex's Controls / Legend / StatsBar flavour:
 * rounded 12, backdrop blur, hairline border, translucent surface. Docks
 * bottom-left so it's symmetric with <Controls> (top-center) and <Legend>
 * (top-right). Sits above the timeline's 640px centered panel and its
 * collapse-tab, so it never overlaps.
 */
function SourcePill({ sourceLabel, onReset }: { sourceLabel: string; onReset: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className="source-pill"
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: 6,
        borderRadius: 12,
        background: 'color-mix(in srgb, var(--agrex-bg, #050505) 82%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--agrex-node-border, #1c1c1c)',
        fontSize: 12,
        color: 'var(--agrex-fg, #f5f5f5)',
        minWidth: 200,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
        <div
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--agrex-status-done, #22c55e)',
            boxShadow: '0 0 8px color-mix(in srgb, var(--agrex-status-done, #22c55e) 55%, transparent)',
            flexShrink: 0,
          }}
        />
        <span style={{ opacity: 0.85, lineHeight: 1, whiteSpace: 'nowrap' }}>{sourceLabel}</span>
      </div>
      <div className="source-pill-reveal">
        <div className="source-pill-reveal-inner">
          <div aria-hidden style={{ height: 1, background: 'var(--agrex-node-border, #1c1c1c)', margin: '6px 2px' }} />
          <button
            type="button"
            onClick={onReset}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            aria-label="Load another trace"
            title="Back to landing to load another trace"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              gap: 8,
              height: 28,
              padding: '0 10px',
              background: hover
                ? 'color-mix(in srgb, var(--agrex-status-done, #22c55e) 14%, transparent)'
                : 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: hover ? 'var(--agrex-status-done, #22c55e)' : 'var(--agrex-fg, #f5f5f5)',
              opacity: hover ? 1 : 0.85,
              transition: 'opacity 150ms, background 150ms, color 150ms',
              fontSize: 12,
              fontFamily: 'inherit',
              lineHeight: 1,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            load another
          </button>
        </div>
      </div>
    </div>
  )
}
