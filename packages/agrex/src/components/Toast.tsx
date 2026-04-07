import type { AgrexNode } from '../types'

const KIND_LABELS: Record<string, string> = {
  agent: 'AGENT', sub_agent: 'SUB-AGENT', tool: 'TOOL', file: 'FILE', search: 'SEARCH', output: 'OUTPUT',
}

export default function Toast({ node }: { node: AgrexNode | null }) {
  if (!node) return null
  return (
    <div key={`${node.type}-${node.label}-${node.id}`} style={{
      position: 'absolute', bottom: 20, left: 20, zIndex: 10,
      background: 'color-mix(in srgb, var(--agrex-bg) 92%, transparent)',
      border: '1px solid var(--agrex-node-border)', borderRadius: 8, padding: '8px 16px',
      fontSize: 13, fontFamily: 'var(--agrex-font-mono)', display: 'flex', alignItems: 'center', gap: 10,
      pointerEvents: 'none', animation: 'agrex-slide-in 0.3s ease-out',
    }}>
      <span style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--agrex-fg)', opacity: 0.4, textTransform: 'uppercase' }}>
        {KIND_LABELS[node.type] ?? node.type}
      </span>
      <span style={{ color: 'var(--agrex-fg)' }}>{node.label}</span>
    </div>
  )
}
