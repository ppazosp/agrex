import { useCallback, useState } from 'react'
import { Agrex, useAgrexReplay, snapshotToEvents, type AgrexEvent, type AgrexHandle } from '@ppazosp/agrex'
import '@ppazosp/agrex/styles.css'
import Dropzone from './Dropzone'
import { demoTrace } from './demoTrace'
import { useRef } from 'react'

export default function App() {
  const [sourceLabel, setSourceLabel] = useState<string | null>(null)
  const replay = useAgrexReplay()
  const agrexRef = useRef<AgrexHandle>(null)

  const loadEvents = useCallback(
    async (events: AgrexEvent[], label: string) => {
      await replay.load(events)
      replay.seek(events.length) // land at the end, let the user scrub back
      setSourceLabel(label)
    },
    [replay],
  )

  const loadDemo = useCallback(() => {
    const events = snapshotToEvents(demoTrace.nodes, demoTrace.edges)
    loadEvents(events, 'demo: lithium research')
  }, [loadEvents])

  const reset = useCallback(() => {
    replay.reset()
    setSourceLabel(null)
  }, [replay])

  if (!sourceLabel) {
    return <Dropzone onLoad={loadEvents} onLoadDemo={loadDemo} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Agrex ref={agrexRef} replay={replay} theme="dark" />
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
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        zIndex: 30,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 6px 6px 12px',
        borderRadius: 12,
        background: 'color-mix(in srgb, var(--agrex-bg, #050505) 82%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--agrex-node-border, #1c1c1c)',
        fontSize: 12,
        color: 'var(--agrex-fg, #f5f5f5)',
      }}
    >
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
      <span style={{ opacity: 0.85, lineHeight: 1 }}>{sourceLabel}</span>
      <button
        type="button"
        onClick={onReset}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="Load another trace"
        title="Load another trace"
        style={{
          width: 26,
          height: 26,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hover ? 'color-mix(in srgb, var(--agrex-status-done, #22c55e) 14%, transparent)' : 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          color: hover ? 'var(--agrex-status-done, #22c55e)' : 'var(--agrex-fg, #f5f5f5)',
          opacity: hover ? 1 : 0.6,
          transition: 'opacity 150ms, background 150ms, color 150ms',
          padding: 0,
        }}
      >
        <svg
          width="13"
          height="13"
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
      </button>
    </div>
  )
}
