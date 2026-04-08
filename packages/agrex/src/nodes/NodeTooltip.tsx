import type { ReactNode } from 'react'

export default function NodeTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ position: 'relative' }} className="agrex-tooltip-wrapper">
      {children}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 'calc(100% + 6px)',
          opacity: 0,
          whiteSpace: 'nowrap',
          background: 'var(--agrex-node-fill)',
          border: '1px solid var(--agrex-node-border)',
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: 12,
          color: 'var(--agrex-fg)',
          zIndex: 50,
          transition: 'opacity 150ms',
        }}
        className="agrex-tooltip"
      >
        {label}
      </div>
    </div>
  )
}
