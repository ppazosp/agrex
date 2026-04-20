import type { AgrexNode } from '../types'
import { formatElapsed } from '../utils/formatElapsed'

interface NodeTooltipProps {
  node: AgrexNode | null
  onClose?: () => void
  /** Distance from the right edge. Used to clear a visible Legend panel. Default: 16. */
  rightOffset?: number
  /** Controls the enter/exit animation. Defaults to true. Pass false to animate out. */
  open?: boolean
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function prettify(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const HIDDEN_KEYS = new Set(['args', 'input', 'output', 'tokens', 'cost', 'startedAt', 'endedAt', 'error'])

function containerStyle(rightOffset: number, open: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: 16,
    right: rightOffset,
    bottom: 16,
    width: 300,
    zIndex: 30,
    borderRadius: 16,
    background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--agrex-node-border)',
    transform: open ? 'translateX(0)' : 'translateX(calc(100% + 20px))',
    opacity: open ? 1 : 0,
    transition: 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
    pointerEvents: open ? 'auto' : 'none',
    willChange: 'transform, opacity',
    color: 'var(--agrex-fg)',
    fontFamily: 'var(--agrex-font, inherit)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderBottom: '1px solid var(--agrex-node-border)',
  flexShrink: 0,
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--agrex-fg)',
}

const typeStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'var(--agrex-fg)',
  opacity: 0.4,
  marginTop: 2,
}

const closeButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 6,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--agrex-fg)',
  opacity: 0.4,
}

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minHeight: 0,
}

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
  fontSize: 12,
}

const statCellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const statLabelStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
  opacity: 0.4,
}

const statValueStyle: React.CSSProperties = {
  fontSize: 13,
  fontFamily: 'var(--agrex-font, inherit)',
  fontVariantNumeric: 'tabular-nums',
  opacity: 0.9,
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
  opacity: 0.4,
  marginBottom: 4,
}

const codeBlockStyle: React.CSSProperties = {
  margin: 0,
  padding: '6px 8px',
  borderRadius: 6,
  background: 'color-mix(in srgb, var(--agrex-fg) 6%, transparent)',
  border: '1px solid color-mix(in srgb, var(--agrex-fg) 10%, transparent)',
  fontSize: 11,
  fontFamily: 'var(--agrex-font-mono, monospace)',
  lineHeight: 1.4,
  color: 'var(--agrex-fg)',
  opacity: 0.85,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 100,
  overflowY: 'auto',
}

const errorBoxStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 6,
  background: 'color-mix(in srgb, var(--agrex-status-error) 10%, transparent)',
  border: '1px solid color-mix(in srgb, var(--agrex-status-error) 30%, transparent)',
}

function StatusChip({ status }: { status?: string }) {
  if (!status) return null
  const dot =
    status === 'running'
      ? 'var(--agrex-status-running)'
      : status === 'done'
        ? 'var(--agrex-status-done)'
        : status === 'error'
          ? 'var(--agrex-status-error)'
          : 'var(--agrex-node-border)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
      <span
        style={{
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--agrex-fg)',
          opacity: 0.6,
        }}
      >
        {status}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={sectionLabelStyle}>{title}</div>
      {children}
    </div>
  )
}

function CodeSection({ title, value }: { title: string; value: unknown }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <Section title={title}>
      <pre style={codeBlockStyle}>{prettify(value)}</pre>
    </Section>
  )
}

export default function NodeTooltip({ node, onClose, rightOffset = 16, open = true }: NodeTooltipProps) {
  if (!node) return null

  const m = node.metadata ?? {}
  const elapsed = formatElapsed(m.startedAt, m.endedAt)
  const tokens = typeof m.tokens === 'number' ? m.tokens : undefined
  const cost = typeof m.cost === 'number' ? m.cost : undefined
  const args = m.args
  const input = m.input
  const output = m.output
  const errorValue = node.status === 'error' ? m.error : undefined
  const extras = Object.entries(m).filter(([k]) => !HIDDEN_KEYS.has(k))

  return (
    <div role="dialog" aria-label={`Details for ${node.label}`} style={containerStyle(rightOffset, open)}>
      <div style={headerStyle}>
        <div>
          <div style={labelStyle}>{node.label}</div>
          <div style={typeStyle}>{node.type}</div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        )}
      </div>

      <div style={bodyStyle}>
        <StatusChip status={node.status} />

        {errorValue != null && (
          <div style={errorBoxStyle}>
            <div style={{ fontSize: 12, fontFamily: 'var(--agrex-font-mono, monospace)', opacity: 0.9 }}>
              {prettify(errorValue)}
            </div>
          </div>
        )}

        {(elapsed || tokens != null || cost != null) && (
          <div style={statsRowStyle}>
            {elapsed && (
              <div style={statCellStyle}>
                <span style={statLabelStyle}>Time</span>
                <span style={statValueStyle}>{elapsed}</span>
              </div>
            )}
            {tokens != null && (
              <div style={statCellStyle}>
                <span style={statLabelStyle}>Tokens</span>
                <span style={statValueStyle}>{formatTokens(tokens)}</span>
              </div>
            )}
            {cost != null && (
              <div style={statCellStyle}>
                <span style={statLabelStyle}>Cost</span>
                <span style={statValueStyle}>${cost.toFixed(4)}</span>
              </div>
            )}
          </div>
        )}

        <CodeSection title="Args" value={args} />
        <CodeSection title="Input" value={input} />
        <CodeSection title="Output" value={output} />

        {extras.length > 0 && (
          <Section title="Metadata">
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              {extras.map(([key, value]) => (
                <div key={key} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ opacity: 0.4, flexShrink: 0 }}>{key}:</span>
                  <span style={{ opacity: 0.8, wordBreak: 'break-word' }}>
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
