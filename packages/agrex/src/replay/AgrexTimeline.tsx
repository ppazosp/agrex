import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { AgrexTimelineProps, TimelinePlacement, TimelineInsets } from './types'

const PANEL_WIDTH = 820
const PANEL_HEIGHT = 58
const DEFAULT_PERSIST_KEY = 'agrex.timeline.collapsed'

// Inline SVGs (lucide geometry, MIT). Keeping them here avoids a lucide-react
// peer dep just for six icons.
const iconProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const Icon = {
  Play: () => (
    <svg {...iconProps}>
      <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />
    </svg>
  ),
  Pause: () => (
    <svg {...iconProps}>
      <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
    </svg>
  ),
  StepBack: () => (
    <svg {...iconProps}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  StepForward: () => (
    <svg {...iconProps}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  SkipBack: () => (
    <svg {...iconProps}>
      <polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  ),
  SkipForward: () => (
    <svg {...iconProps}>
      <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  ),
  Live: () => (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
    </svg>
  ),
  Close: () => (
    <svg {...iconProps}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
} as const

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function containerStyle(placement: TimelinePlacement, insets: TimelineInsets, collapsed: boolean): CSSProperties {
  const vertical: keyof TimelineInsets = placement === 'top' ? 'top' : 'bottom'
  const inset = insets[vertical] ?? 16
  return {
    position: 'absolute',
    left: '50%',
    [vertical]: inset,
    width: PANEL_WIDTH,
    maxWidth: 'calc(100% - 32px)',
    // Slide the panel fully off-screen in the direction of its anchor edge.
    transform: collapsed
      ? placement === 'top'
        ? `translate(-50%, calc(-100% - ${PANEL_HEIGHT}px))`
        : `translate(-50%, calc(100% + ${PANEL_HEIGHT}px))`
      : 'translate(-50%, 0)',
    transition: 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)',
    zIndex: 30,
    background: 'color-mix(in srgb, var(--agrex-bg) 88%, transparent)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--agrex-node-border)',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    padding: '10px 14px',
    fontFamily: 'var(--agrex-font)',
    color: 'var(--agrex-fg)',
  }
}

function tabStyle(placement: TimelinePlacement, insets: TimelineInsets, collapsed: boolean): CSSProperties {
  const vertical: keyof TimelineInsets = placement === 'top' ? 'top' : 'bottom'
  const anchorInset = insets[vertical] ?? 16
  return {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    [vertical]: collapsed ? 0 : anchorInset + PANEL_HEIGHT + 16,
    width: 40,
    height: 20,
    borderRadius: placement === 'top' ? '0 0 6px 6px' : '6px 6px 0 0',
    background: 'color-mix(in srgb, var(--agrex-bg) 88%, transparent)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--agrex-node-border)',
    borderBottomWidth: placement === 'top' ? 1 : 0,
    borderTopWidth: placement === 'top' ? 0 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--agrex-fg)',
    opacity: 0.6,
    zIndex: 30,
    transition: `${vertical} 250ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms`,
  }
}

const buttonStyle: CSSProperties = {
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  color: 'var(--agrex-fg)',
  opacity: 0.8,
  padding: 0,
}

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'var(--agrex-fg)',
  color: 'var(--agrex-bg)',
  opacity: 1,
}

export default function AgrexTimeline({
  replay,
  onExit,
  onCollapsedChange,
  jumpMarkerKind,
  speeds = [1, 2, 4],
  showSpeedControl = true,
  showCollapseTab = true,
  persistKey = DEFAULT_PERSIST_KEY,
  placement = 'bottom',
  insets,
  className,
}: AgrexTimelineProps) {
  const {
    events,
    cursor,
    playing,
    speed,
    mode,
    markers,
    play,
    pause,
    seek,
    goLive,
    setSpeed,
    stepForward,
    stepBack,
    prevMarker,
    nextMarker,
  } = replay

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage?.getItem(persistKey) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage?.setItem(persistKey, collapsed ? '1' : '0')
    } catch {
      /* ignore — localStorage unavailable */
    }
    onCollapsedChange?.(collapsed)
  }, [collapsed, onCollapsedChange, persistKey])

  const total = events.length
  const elapsed = useMemo(() => {
    if (total === 0) return 0
    const first = Number(events[0].ts)
    const idx = Math.max(0, Math.min(cursor, total) - 1)
    return Number(events[idx].ts) - first
  }, [cursor, total, events])
  const duration = useMemo(() => {
    if (total < 2) return 0
    return Number(events[total - 1].ts) - Number(events[0].ts)
  }, [events, total])

  if (mode === 'idle') return null

  const safeInsets: TimelineInsets = insets ?? {}
  const jumpMarkers = jumpMarkerKind ? markers.filter((m) => m.kind === jumpMarkerKind) : []
  const showMarkerJump = !!jumpMarkerKind && jumpMarkers.length > 0

  return (
    <>
      <div style={containerStyle(placement, safeInsets, collapsed)} className={className}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {showMarkerJump && (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => prevMarker(jumpMarkerKind)}
              aria-label="Previous marker"
              title="Previous marker"
            >
              <Icon.SkipBack />
            </button>
          )}
          <button
            type="button"
            style={buttonStyle}
            onClick={stepBack}
            aria-label="Step back"
            title="Step back"
          >
            <Icon.StepBack />
          </button>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={playing ? pause : play}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Icon.Pause /> : <Icon.Play />}
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={stepForward}
            aria-label="Step forward"
            title="Step forward"
          >
            <Icon.StepForward />
          </button>
          {showMarkerJump && (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => nextMarker(jumpMarkerKind)}
              aria-label="Next marker"
              title="Next marker"
            >
              <Icon.SkipForward />
            </button>
          )}

          {/* Scrub track */}
          <div style={{ position: 'relative', flex: 1, height: 18, margin: '0 4px' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: 2,
                background: 'var(--agrex-node-border)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: 2,
                width: total ? `${(cursor / total) * 100}%` : '0%',
                background: 'var(--agrex-fg)',
                opacity: 0.6,
              }}
            />
            {markers.map((m, i) => (
              <div
                key={`m-${i}`}
                title={m.label ?? m.kind}
                onClick={() => seek(m.cursor)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: `calc(${total ? (m.cursor / total) * 100 : 0}% - 4px)`,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: m.color ?? 'var(--agrex-fg)',
                  opacity: 0.6,
                  cursor: 'pointer',
                }}
              />
            ))}
            <input
              type="range"
              aria-label="Scrub"
              min={0}
              max={total}
              value={cursor}
              onChange={(e) => seek(parseInt(e.target.value, 10))}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                opacity: 0,
                cursor: 'pointer',
                margin: 0,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
                left: `calc(${total ? (cursor / total) * 100 : 0}% - 6px)`,
                width: 12,
                height: 12,
                background: 'var(--agrex-fg)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {showSpeedControl && (
            <div style={{ display: 'flex', gap: 2, fontSize: 11 }}>
              {speeds.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  style={{
                    padding: '2px 6px',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: speed === s ? 'var(--agrex-node-border)' : 'transparent',
                    color: speed === s ? 'var(--agrex-fg)' : 'color-mix(in srgb, var(--agrex-fg) 60%, transparent)',
                    fontFamily: 'var(--agrex-font-mono)',
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}

          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--agrex-font-mono)',
              color: 'color-mix(in srgb, var(--agrex-fg) 60%, transparent)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatElapsed(elapsed)} / {formatElapsed(duration)}
          </span>

          <button
            type="button"
            style={buttonStyle}
            onClick={goLive}
            aria-label={mode === 'live' ? 'Return to live' : 'Jump to end'}
            title={mode === 'live' ? 'Return to live' : 'Jump to end'}
          >
            <Icon.Live />
          </button>

          {mode === 'replay' && onExit && (
            <button
              type="button"
              style={buttonStyle}
              onClick={onExit}
              aria-label="Exit replay"
              title="Exit replay"
            >
              <Icon.Close />
            </button>
          )}
        </div>
      </div>

      {showCollapseTab && (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          style={tabStyle(placement, safeInsets, collapsed)}
          aria-label={collapsed ? 'Expand timeline' : 'Collapse timeline'}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              transform: collapsed
                ? placement === 'top'
                  ? 'rotate(90deg)'
                  : 'rotate(-90deg)'
                : placement === 'top'
                  ? 'rotate(-90deg)'
                  : 'rotate(90deg)',
              transition: 'transform 200ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            <path d="M2 1L6 4L2 7" />
          </svg>
        </button>
      )}
    </>
  )
}
