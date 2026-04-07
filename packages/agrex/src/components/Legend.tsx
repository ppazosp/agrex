import { useState } from 'react'

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--agrex-node-border)' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 0', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left',
      }}>
        <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--agrex-fg)', opacity: 0.3 }}>{title}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ color: 'var(--agrex-fg)', opacity: 0.3, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 200ms' }}>
          <path d="M2 3.5L5 6.5L8 3.5" />
        </svg>
      </button>
      <div className="agrex-collapse" data-collapsed={!open}>
        <div><div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 8 }}>{children}</div></div>
      </div>
    </div>
  )
}

function ShapeItem({ shape, label }: { shape: React.ReactNode; label: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{shape}<span>{label}</span></div>
}

export default function Legend() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <>
      <aside style={{
        position: 'absolute', right: 16, top: 16, bottom: 16, width: 160, zIndex: 30, borderRadius: 16,
        background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)', backdropFilter: 'blur(16px)',
        border: '1px solid var(--agrex-node-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: collapsed ? 'translateX(calc(100% + 20px))' : 'translateX(0)',
        transition: 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--agrex-node-border)', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--agrex-fg)' }}>Legend</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px', fontSize: 12, color: 'var(--agrex-fg)', opacity: 0.6 }}>
          <Section title="Shapes">
            <ShapeItem shape={<div style={{ width: 12, height: 12, border: '1.5px solid var(--agrex-node-border)', borderRadius: 3 }} />} label="Agent" />
            <ShapeItem shape={<div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid var(--agrex-node-border)' }} />} label="Tool" />
            <ShapeItem shape={<svg width="14" height="14" viewBox="0 0 14 14"><path d="M 5.8,1.3 Q 7,0 8.2,1.3 L 12.7,5.8 Q 14,7 12.7,8.2 L 8.2,12.7 Q 7,14 5.8,12.7 L 1.3,8.2 Q 0,7 1.3,5.8 Z" fill="none" stroke="var(--agrex-node-border)" strokeWidth="1.5" /></svg>} label="File" />
            <ShapeItem shape={<svg width="14" height="16" viewBox="0 0 48 55"><path d="M 19.6,3.4 Q 24,1 28.4,3.4 L 42.6,11.3 Q 47,13.75 47,18.75 L 47,36.25 Q 47,41.25 42.6,43.7 L 28.4,51.6 Q 24,54 19.6,51.6 L 5.4,43.7 Q 1,41.25 1,36.25 L 1,18.75 Q 1,13.75 5.4,11.3 Z" fill="none" stroke="var(--agrex-node-border)" strokeWidth="2.5" /></svg>} label="Output" />
          </Section>
          <Section title="Data Flow" defaultOpen={false}>
            <ShapeItem shape={<div style={{ width: 20, height: 0, borderTop: '2px solid var(--agrex-edge-write)' }} />} label="Write" />
            <ShapeItem shape={<div style={{ width: 20, height: 0, borderTop: '2px solid var(--agrex-edge-read)' }} />} label="Read" />
            <ShapeItem shape={<div style={{ width: 20, height: 0, borderTop: '2px solid var(--agrex-edge-spawn)' }} />} label="Spawn" />
          </Section>
          <Section title="Status">
            <ShapeItem shape={<div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--agrex-status-running)', boxShadow: '0 0 6px color-mix(in srgb, var(--agrex-status-running) 50%, transparent)' }} />} label="Running" />
            <ShapeItem shape={<div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--agrex-status-done)' }} />} label="Done" />
            <ShapeItem shape={<div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--agrex-status-error)' }} />} label="Error" />
          </Section>
        </div>
      </aside>
      <button onClick={() => setCollapsed(v => !v)} style={{
        position: 'absolute', zIndex: 30, top: '50%', transform: 'translateY(-50%)',
        right: collapsed ? 0 : 176, transition: 'right 250ms cubic-bezier(0.23, 1, 0.32, 1)',
        width: 20, height: 40, borderRadius: '6px 0 0 6px',
        background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)', backdropFilter: 'blur(16px)',
        border: '1px solid var(--agrex-node-border)', borderRight: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--agrex-fg)', opacity: 0.4,
      }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>
          <path d="M2 1L6 4L2 7" />
        </svg>
      </button>
    </>
  )
}
