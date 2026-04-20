import type { AgrexNode } from '../types'

interface StatsBarProps {
  nodes: AgrexNode[]
  /** Distance from the bottom edge in px. Lets the consumer lift the bar above the timeline when it's expanded. Default: 16. */
  bottomOffset?: number
}

export default function StatsBar({ nodes, bottomOffset = 16 }: StatsBarProps) {
  const total = nodes.length
  const running = nodes.filter((n) => n.status === 'running').length
  const done = nodes.filter((n) => n.status === 'done').length
  const errors = nodes.filter((n) => n.status === 'error').length

  let totalTokens = 0
  let totalCost = 0
  for (const n of nodes) {
    if (typeof n.metadata?.tokens === 'number') totalTokens += n.metadata.tokens
    if (typeof n.metadata?.cost === 'number') totalCost += n.metadata.cost
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        transition: 'bottom 250ms cubic-bezier(0.23, 1, 0.32, 1)',
        zIndex: 30,
        background: 'color-mix(in srgb, var(--agrex-bg) 85%, transparent)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--agrex-node-border)',
        borderRadius: 10,
        padding: '5px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 11,
        fontFamily: 'var(--agrex-font, inherit)',
        color: 'var(--agrex-fg)',
      }}
    >
      <Stat label="nodes" value={total} />
      {running > 0 && <Stat label="running" value={running} color="var(--agrex-status-running)" />}
      {done > 0 && <Stat label="done" value={done} color="var(--agrex-status-done)" />}
      {errors > 0 && <Stat label="errors" value={errors} color="var(--agrex-status-error)" />}
      {totalTokens > 0 && <Stat label="tokens" value={formatNum(totalTokens)} />}
      {totalCost > 0 && <Stat label="cost" value={`$${totalCost.toFixed(2)}`} />}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {color && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
      <span style={{ opacity: 0.5 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
