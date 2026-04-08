import { useState } from 'react'

interface ControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  autoFit: boolean
  onToggleAutoFit: () => void
}

export default function Controls({ onZoomIn, onZoomOut, autoFit, onToggleAutoFit }: ControlsProps) {
  const [collapsed, setCollapsed] = useState(false)

  const btnStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--agrex-fg)', opacity: 0.4,
    transition: 'opacity 150ms',
  }

  return (
    <>
      <div style={{
        position: 'absolute', top: 16, left: '50%',
        transform: `translateX(-50%) ${collapsed ? 'translateY(calc(-100% - 20px))' : 'translateY(0)'}`,
        transition: 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)', zIndex: 30, borderRadius: 16,
        background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)', backdropFilter: 'blur(16px)',
        border: '1px solid var(--agrex-node-border)', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px',
      }}>
        <button onClick={onZoomIn} title="Zoom in" style={btnStyle}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button onClick={onToggleAutoFit} title={autoFit ? 'Auto-fit ON' : 'Auto-fit OFF'}
          style={{ ...btnStyle, background: autoFit ? 'color-mix(in srgb, var(--agrex-status-done) 12%, transparent)' : 'transparent', opacity: autoFit ? 1 : 0.4, transition: 'opacity 150ms, background 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => { if (!autoFit) e.currentTarget.style.opacity = '0.4' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={autoFit ? 'var(--agrex-status-done)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" style={{ transition: 'stroke 150ms' }}>
            <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
        <button onClick={onZoomOut} title="Zoom out" style={btnStyle}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <button onClick={() => setCollapsed(v => !v)} style={{
        position: 'absolute', top: collapsed ? 0 : 62, left: '50%', transform: 'translateX(-50%)',
        transition: 'top 250ms cubic-bezier(0.23, 1, 0.32, 1)', zIndex: 30, height: 20, width: 40,
        borderRadius: '0 0 6px 6px', background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)',
        backdropFilter: 'blur(16px)', border: '1px solid var(--agrex-node-border)', borderTop: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--agrex-fg)', opacity: 0.4,
      }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 200ms' }}>
          <path d="M1 2.5L4 5.5L7 2.5" />
        </svg>
      </button>
    </>
  )
}
