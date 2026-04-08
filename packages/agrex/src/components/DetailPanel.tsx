import type { AgrexNode } from '../types'

interface DetailPanelProps {
  node: AgrexNode | null
  onClose: () => void
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

import { formatElapsed } from '../utils/formatElapsed'

const ROW: React.CSSProperties = { display: 'flex', gap: 8, marginBottom: 4 }
const KEY: React.CSSProperties = { color: 'var(--agrex-fg)', opacity: 0.4, flexShrink: 0 }
const VAL: React.CSSProperties = { color: 'var(--agrex-fg)', opacity: 0.7, wordBreak: 'break-all' }

export default function DetailPanel({ node, onClose }: DetailPanelProps) {
  if (!node) return null

  const elapsed = formatElapsed(node.metadata?.startedAt, node.metadata?.endedAt)
  const tokens = typeof node.metadata?.tokens === 'number' ? node.metadata.tokens : undefined
  const cost = typeof node.metadata?.cost === 'number' ? node.metadata.cost : undefined

  // Keys to hide from generic metadata display (rendered separately)
  const hiddenKeys = new Set(['error', 'startedAt', 'endedAt', 'tokens', 'cost'])

  return (
    <div
      role="complementary"
      aria-label={`Details for ${node.label}`}
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: 280,
        maxHeight: 320,
        zIndex: 30,
        borderRadius: 12,
        background: 'color-mix(in srgb, var(--agrex-bg) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--agrex-node-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'agrex-slide-in 0.2s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--agrex-node-border)',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--agrex-fg)' }}>{node.label}</div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'var(--agrex-fg)',
              opacity: 0.4,
              marginTop: 2,
            }}
          >
            {node.type}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
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
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {node.status && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  node.status === 'running'
                    ? 'var(--agrex-status-running)'
                    : node.status === 'done'
                      ? 'var(--agrex-status-done)'
                      : node.status === 'error'
                        ? 'var(--agrex-status-error)'
                        : 'var(--agrex-node-border)',
              }}
            />
            <span
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: 'var(--agrex-fg)',
                opacity: 0.5,
              }}
            >
              {node.status}
            </span>
          </div>
        )}
        {node.status === 'error' && !!node.metadata?.error && (
          <div
            style={{
              marginBottom: 8,
              padding: '6px 8px',
              borderRadius: 6,
              background: 'color-mix(in srgb, var(--agrex-status-error) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--agrex-status-error) 30%, transparent)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--agrex-status-error)',
                opacity: 0.8,
                marginBottom: 2,
              }}
            >
              Error
            </div>
            <div
              style={{
                fontSize: 12,
                fontFamily: 'var(--agrex-font-mono)',
                color: 'var(--agrex-fg)',
                opacity: 0.8,
                wordBreak: 'break-all',
              }}
            >
              {String(
                typeof node.metadata.error === 'string' ? node.metadata.error : JSON.stringify(node.metadata.error),
              )}
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, fontFamily: 'var(--agrex-font-mono)', lineHeight: 1.6 }}>
          {elapsed && (
            <div style={ROW}>
              <span style={KEY}>time:</span>
              <span style={VAL}>{elapsed}</span>
            </div>
          )}
          {tokens != null && (
            <div style={ROW}>
              <span style={KEY}>tokens:</span>
              <span style={VAL}>{formatTokens(tokens)}</span>
            </div>
          )}
          {cost != null && (
            <div style={ROW}>
              <span style={KEY}>cost:</span>
              <span style={VAL}>${cost.toFixed(4)}</span>
            </div>
          )}
          {node.metadata &&
            Object.entries(node.metadata)
              .filter(([key]) => !hiddenKeys.has(key))
              .map(([key, value]) => (
                <div key={key} style={ROW}>
                  <span style={KEY}>{key}:</span>
                  <span style={VAL}>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
