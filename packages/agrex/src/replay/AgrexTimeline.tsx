import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { resolveTheme, themeToCSS } from '../theme/tokens'
import type { AgrexNode } from '../types'
import type { AgrexMarker, AgrexTimelineProps, TimelineInsets, TimelinePlacement } from './types'

const PANEL_WIDTH = 640
const PANEL_HEIGHT = 50
const PANEL_HEIGHT_WITH_STATS = 74
const DEFAULT_PERSIST_KEY = 'agrex.timeline.collapsed'

function formatStatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function ReplayStatsRow({ nodes }: { nodes: AgrexNode[] }) {
  const total = nodes.length
  let running = 0
  let done = 0
  let errors = 0
  let tokens = 0
  let cost = 0
  let minStart = Number.POSITIVE_INFINITY
  let maxEnd = 0
  for (const n of nodes) {
    if (n.status === 'running') running++
    else if (n.status === 'done') done++
    else if (n.status === 'error') errors++
    if (typeof n.metadata?.tokens === 'number') tokens += n.metadata.tokens
    if (typeof n.metadata?.cost === 'number') cost += n.metadata.cost
    const s = typeof n.metadata?.startedAt === 'number' ? n.metadata.startedAt : undefined
    const e = typeof n.metadata?.endedAt === 'number' ? n.metadata.endedAt : undefined
    if (s !== undefined) minStart = Math.min(minStart, s)
    if (e !== undefined) maxEnd = Math.max(maxEnd, e)
  }
  const wallTime = minStart !== Number.POSITIVE_INFINITY && maxEnd > minStart ? maxEnd - minStart : 0

  const labelStyle: CSSProperties = { opacity: 0.5 }
  const valueStyle: CSSProperties = { fontWeight: 600, fontFamily: 'var(--agrex-font, inherit)' }
  const dot = (color: string): CSSProperties => ({ width: 6, height: 6, borderRadius: '50%', background: color })
  const Cell = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>{children}</div>
  )
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        fontSize: 11,
        color: 'var(--agrex-fg, #fff)',
        gap: 8,
      }}
    >
      <Cell>
        <span style={labelStyle}>nodes</span>
        <span style={valueStyle}>{total}</span>
      </Cell>
      <Cell>
        <div style={dot('var(--agrex-status-running, #f59e0b)')} />
        <span style={labelStyle}>running</span>
        <span style={valueStyle}>{running}</span>
      </Cell>
      <Cell>
        <div style={dot('var(--agrex-status-done, #4ade80)')} />
        <span style={labelStyle}>done</span>
        <span style={valueStyle}>{done}</span>
      </Cell>
      <Cell>
        <div style={dot('var(--agrex-status-error, #ef4444)')} />
        <span style={labelStyle}>errors</span>
        <span style={valueStyle}>{errors}</span>
      </Cell>
      <Cell>
        <span style={labelStyle}>time</span>
        <span style={valueStyle}>{formatMs(wallTime)}</span>
      </Cell>
      <Cell>
        <span style={labelStyle}>tokens</span>
        <span style={valueStyle}>{formatStatNumber(tokens)}</span>
      </Cell>
      <Cell>
        <span style={labelStyle}>cost</span>
        <span style={valueStyle}>${cost.toFixed(4)}</span>
      </Cell>
    </div>
  )
}

// Inline SVGs (lucide geometry, MIT). Keeps the dep footprint at zero icons.
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

// Match the panel chrome used by <Legend> / <DetailPanel> / <ToastStack>:
// 80% bg opacity, 16px blur, 1px border in --agrex-node-border, 16px radius.
//
// Every `var()` carries a dark-theme fallback so the panel renders with
// visible chrome even when placed *outside* a wrapping <Agrex> — the CSS
// variables (`--agrex-bg` etc.) are scoped to the Agrex root's subtree, so a
// sibling-positioned AgrexTimeline otherwise sees undefined vars and loses
// its background + border.
const panelChrome: CSSProperties = {
  background: 'color-mix(in srgb, var(--agrex-bg, #0a0a0a) 80%, transparent)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid var(--agrex-node-border, rgba(255,255,255,0.15))',
  borderRadius: 16,
}

function containerStyle(
  placement: TimelinePlacement,
  insets: TimelineInsets,
  collapsed: boolean,
  themeVars: CSSProperties,
  panelHeight: number,
): CSSProperties {
  const vertical: keyof TimelineInsets = placement === 'top' ? 'top' : 'bottom'
  const inset = insets[vertical] ?? 16
  return {
    ...themeVars,
    ...panelChrome,
    position: 'absolute',
    left: '50%',
    [vertical]: inset,
    width: PANEL_WIDTH,
    maxWidth: 'calc(100% - 32px)',
    transform: collapsed
      ? placement === 'top'
        ? `translate(-50%, calc(-100% - ${panelHeight}px))`
        : `translate(-50%, calc(100% + ${panelHeight}px))`
      : 'translate(-50%, 0)',
    transition: 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)',
    zIndex: 30,
    padding: '10px 14px',
    fontFamily: 'var(--agrex-font, inherit)',
    color: 'var(--agrex-fg, #fff)',
  }
}

function tabStyle(
  placement: TimelinePlacement,
  insets: TimelineInsets,
  collapsed: boolean,
  themeVars: CSSProperties,
  panelHeight: number,
): CSSProperties {
  const vertical: keyof TimelineInsets = placement === 'top' ? 'top' : 'bottom'
  const anchorInset = insets[vertical] ?? 16
  return {
    ...themeVars,
    ...panelChrome,
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    [vertical]: collapsed ? 0 : anchorInset + panelHeight,
    width: 40,
    height: 20,
    borderRadius: placement === 'top' ? '0 0 6px 6px' : '6px 6px 0 0',
    borderBottomWidth: placement === 'top' ? 1 : 0,
    borderTopWidth: placement === 'top' ? 0 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--agrex-fg, #fff)',
    opacity: 0.4,
    zIndex: 30,
    padding: 0,
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
  color: 'var(--agrex-fg, #fff)',
  opacity: 0.8,
  padding: 0,
}

interface StageSegment {
  cursor: number
  end: number
  label: string
  color?: string
}

/**
 * Build contiguous chapter segments from jump-kind markers. Each segment spans
 * from one marker's cursor up to the next marker's cursor (or the end of the
 * event log). Segments render as labeled bars — a `<details>`-like chapter
 * track on top of the precision scrub slider.
 */
function buildStageSegments(markers: readonly AgrexMarker[], kind: string, totalEvents: number): StageSegment[] {
  const pool = markers.filter((m) => m.kind === kind).sort((a, b) => a.cursor - b.cursor)
  if (pool.length === 0 || totalEvents === 0) return []
  return pool.map((m, i) => ({
    cursor: m.cursor,
    end: i + 1 < pool.length ? pool[i + 1].cursor : totalEvents,
    label: m.label ?? m.kind,
    color: m.color,
  }))
}

export default function AgrexTimeline({
  replay,
  onExit,
  onCollapsedChange,
  jumpMarkerKind,
  speeds = [1, 2, 4],
  showSpeedControl = true,
  showCollapseTab = true,
  showStats = false,
  persistKey = DEFAULT_PERSIST_KEY,
  placement = 'bottom',
  insets,
  className,
  theme,
}: AgrexTimelineProps) {
  const fallbackHeight = showStats ? PANEL_HEIGHT_WITH_STATS : PANEL_HEIGHT
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    const update = () => setMeasuredHeight(el.getBoundingClientRect().height)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [showStats])
  // Tab follows the real rendered height so it sits flush with the panel edge.
  // Collapse transform uses the fallback so the slide-off distance is stable.
  const panelHeight = measuredHeight ?? fallbackHeight
  // When `theme` is passed, apply its CSS custom properties directly on the
  // panel root — necessary when AgrexTimeline is mounted as a *sibling* of
  // <Agrex> (not a descendant), because the `--agrex-*` vars are scoped to
  // the Agrex root's subtree and don't leak to siblings. When `theme` is
  // absent, `themeVars` is empty and the panel inherits vars normally (the
  // embedded-in-<Agrex> case) or falls back to the `var(...)` defaults
  // baked into every style below.
  const themeVars = useMemo<CSSProperties>(
    () => (theme ? (themeToCSS(resolveTheme(theme)) as unknown as CSSProperties) : {}),
    [theme],
  )
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

  const stageSegments = useMemo(
    () => (jumpMarkerKind ? buildStageSegments(markers, jumpMarkerKind, total) : []),
    [jumpMarkerKind, markers, total],
  )
  const nonStageMarkers = useMemo(
    () => (jumpMarkerKind ? markers.filter((m) => m.kind !== jumpMarkerKind) : markers),
    [jumpMarkerKind, markers],
  )

  if (mode === 'idle') return null

  const safeInsets: TimelineInsets = insets ?? {}
  const showMarkerJump = !!jumpMarkerKind && stageSegments.length > 0
  const activeStage = stageSegments.findIndex((s) => cursor > s.cursor && cursor <= s.end)

  return (
    <>
      <div
        ref={panelRef}
        style={containerStyle(placement, safeInsets, collapsed, themeVars, panelHeight)}
        className={className}
      >
        {showStats && <ReplayStatsRow nodes={replay.instance.nodes} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <button type="button" style={buttonStyle} onClick={stepBack} aria-label="Step back" title="Step back">
              <Icon.StepBack />
            </button>
            <button
              type="button"
              style={buttonStyle}
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
          </div>

          {/* Scrub track */}
          <div style={{ position: 'relative', flex: 1, height: 18, margin: '0 4px' }}>
            {stageSegments.length > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: 4,
                  display: 'flex',
                  gap: 0,
                  overflow: 'hidden',
                  borderRadius: 999,
                }}
              >
                {stageSegments.map((seg, i) => {
                  const widthPct = total > 0 ? ((seg.end - seg.cursor) / total) * 100 : 0
                  const isActive = i === activeStage
                  const isPast = cursor >= seg.end
                  const base = seg.color ?? 'var(--agrex-fg)'
                  const bg = isActive
                    ? `color-mix(in srgb, ${base} 55%, transparent)`
                    : isPast
                      ? `color-mix(in srgb, ${base} 35%, transparent)`
                      : `color-mix(in srgb, ${base} 12%, transparent)`
                  return (
                    <div
                      key={`seg-${i}`}
                      style={{
                        flex: `${widthPct} 1 0`,
                        minWidth: 0,
                        height: '100%',
                        background: bg,
                        transition: 'background 150ms',
                      }}
                    />
                  )
                })}
              </div>
            ) : (
              <>
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
              </>
            )}
            {stageSegments.map((seg, i) => {
              const left = total ? (seg.cursor / total) * 100 : 0
              const color = seg.color ?? 'var(--agrex-fg)'
              return (
                <button
                  key={`stg-ic-${i}`}
                  type="button"
                  onClick={() => seek(seg.cursor)}
                  title={seg.label}
                  aria-label={`Jump to ${seg.label}`}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${left}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 3,
                    height: 14,
                    borderRadius: 2,
                    background: color,
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    zIndex: 2,
                    transition: 'transform 150ms cubic-bezier(0.23, 1, 0.32, 1), height 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scaleY(1.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scaleY(1)'
                  }}
                />
              )
            })}
            {nonStageMarkers.map((m, i) => (
              <div
                key={`m-${i}`}
                title={m.label ?? m.kind}
                onClick={() => seek(m.cursor)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: `calc(${total ? (m.cursor / total) * 100 : 0}% - 3px)`,
                  width: 6,
                  height: 12,
                  borderRadius: 2,
                  background: m.color ?? 'var(--agrex-fg)',
                  opacity: 0.8,
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
                    fontFamily: 'var(--agrex-font, inherit)',
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
              fontFamily: 'var(--agrex-font, inherit)',
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
            <button type="button" style={buttonStyle} onClick={onExit} aria-label="Exit replay" title="Exit replay">
              <Icon.Close />
            </button>
          )}
        </div>
      </div>

      {showCollapseTab && (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          style={tabStyle(placement, safeInsets, collapsed, themeVars, panelHeight)}
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
