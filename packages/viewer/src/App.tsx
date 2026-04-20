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
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <TopBar sourceLabel={sourceLabel} onReset={reset} />
      <div style={{ flex: 1, position: 'relative' }}>
        <Agrex ref={agrexRef} replay={replay} theme="dark" />
      </div>
    </div>
  )
}

function TopBar({ sourceLabel, onReset }: { sourceLabel: string; onReset: () => void }) {
  return (
    <div
      style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(0,0,0,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontSize: 12,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.85 }}>
        <span style={{ fontWeight: 600 }}>agrex</span>
        <span style={{ opacity: 0.35 }}>·</span>
        <span style={{ opacity: 0.7, fontFamily: 'ui-monospace, monospace' }}>{sourceLabel}</span>
      </div>
      <button
        type="button"
        onClick={onReset}
        style={{
          background: 'transparent',
          color: 'inherit',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        load another
      </button>
    </div>
  )
}
