import { useEffect, useRef, useState, type ComponentType } from 'react'

function prettifyToolName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--agrex-node-border)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'var(--agrex-fg)',
            opacity: 0.3,
          }}
        >
          {title}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            color: 'var(--agrex-fg)',
            opacity: 0.3,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 200ms',
          }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" />
        </svg>
      </button>
      <div className="agrex-collapse" data-collapsed={!open}>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 8 }}>{children}</div>
        </div>
      </div>
    </div>
  )
}

function ShapeItem({ shape, label }: { shape: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {shape}
      <span style={{ opacity: 0.6 }}>{label}</span>
    </div>
  )
}

type IconComponent = ComponentType<{ size: number }>

interface LegendProps {
  toolIcons?: Record<string, IconComponent>
  fileIcons?: Record<string, IconComponent>
  /** When true, forces the legend into its collapsed (off-screen) state regardless of user toggle. */
  forceCollapsed?: boolean
}

export default function Legend({ toolIcons, fileIcons, forceCollapsed = false }: LegendProps = {}) {
  const [userCollapsed, setUserCollapsed] = useState(false)
  const collapsed = userCollapsed || forceCollapsed
  const [compact, setCompact] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = containerRef.current?.closest('.agrex') as HTMLElement | null
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < 500)
    })
    observer.observe(el)
    setCompact(el.clientWidth < 500)
    return () => observer.disconnect()
  }, [])

  const width = compact ? 120 : 160

  return (
    <>
      <aside
        ref={containerRef}
        style={{
          position: 'absolute',
          right: compact ? 8 : 16,
          top: compact ? 8 : 16,
          bottom: compact ? 8 : 16,
          width,
          zIndex: 30,
          borderRadius: compact ? 10 : 16,
          background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--agrex-node-border)',
          display: 'flex',
          flexDirection: 'column',
          transform: collapsed ? 'translateX(calc(100% + 20px))' : 'translateX(0)',
          transition: 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div
          style={{
            padding: compact ? '8px 12px' : '12px 16px',
            borderBottom: '1px solid var(--agrex-node-border)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: compact ? 11 : 13, fontWeight: 600, color: 'var(--agrex-fg)' }}>Legend</span>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: compact ? '4px 8px' : '4px 12px',
            fontSize: compact ? 10 : 12,
            color: 'var(--agrex-fg)',
          }}
        >
          <Section title="Shapes">
            <ShapeItem
              shape={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    x="1.5"
                    y="1.5"
                    width="11"
                    height="11"
                    rx="2.5"
                    stroke="var(--agrex-node-border)"
                    strokeWidth="1.5"
                  />
                </svg>
              }
              label="Agent"
            />
            <ShapeItem
              shape={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="var(--agrex-node-border)" strokeWidth="1.5" />
                </svg>
              }
              label="Tool"
            />
            <ShapeItem
              shape={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M5.8 1.2Q7 0.5 8.2 1.2L11.6 3.1Q12.8 3.85 12.8 5.25V8.75Q12.8 10.15 11.6 10.9L8.2 12.8Q7 13.5 5.8 12.8L2.4 10.9Q1.2 10.15 1.2 8.75V5.25Q1.2 3.85 2.4 3.1Z"
                    stroke="var(--agrex-node-border)"
                    strokeWidth="1.5"
                  />
                </svg>
              }
              label="File"
            />
          </Section>
          <Section title="Data Flow" defaultOpen={!compact}>
            <ShapeItem
              shape={<div style={{ width: 20, height: 0, borderTop: '1.5px solid var(--agrex-edge-spawn)' }} />}
              label="Spawn"
            />
            <ShapeItem
              shape={<div style={{ width: 20, height: 0, borderTop: '1.5px solid var(--agrex-edge-write)' }} />}
              label="Write"
            />
            <ShapeItem
              shape={<div style={{ width: 20, height: 0, borderTop: '1.5px solid var(--agrex-edge-read)' }} />}
              label="Read"
            />
          </Section>
          {toolIcons && Object.keys(toolIcons).length > 0 && (
            <Section title="Tools" defaultOpen={!compact}>
              {Object.entries(toolIcons)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, Icon]) => (
                  <ShapeItem
                    key={name}
                    shape={
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 14,
                          height: 14,
                          color: 'var(--agrex-node-icon)',
                        }}
                      >
                        <Icon size={12} />
                      </span>
                    }
                    label={prettifyToolName(name)}
                  />
                ))}
            </Section>
          )}
          {fileIcons && Object.keys(fileIcons).length > 0 && (
            <Section title="Files" defaultOpen={!compact}>
              {Object.entries(fileIcons)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ext, Icon]) => (
                  <ShapeItem
                    key={ext}
                    shape={
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 14,
                          height: 14,
                          color: 'var(--agrex-node-icon)',
                        }}
                      >
                        <Icon size={12} />
                      </span>
                    }
                    label={`.${ext}`}
                  />
                ))}
            </Section>
          )}
          <Section title="Status">
            <ShapeItem
              shape={
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: '2px solid var(--agrex-status-running)',
                  }}
                />
              }
              label="Running"
            />
            <ShapeItem
              shape={
                <div
                  style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--agrex-status-done)' }}
                />
              }
              label="Done"
            />
            <ShapeItem
              shape={
                <div
                  style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--agrex-status-error)' }}
                />
              }
              label="Error"
            />
          </Section>
        </div>
      </aside>
      <button
        onClick={() => setUserCollapsed((v) => !v)}
        aria-hidden={forceCollapsed}
        style={{
          position: 'absolute',
          zIndex: 30,
          top: '50%',
          right: collapsed ? 0 : width + 16,
          transform: `translateY(-50%) ${forceCollapsed ? 'translateX(calc(100% + 4px))' : 'translateX(0)'}`,
          transition:
            'right 250ms cubic-bezier(0.23, 1, 0.32, 1), transform 250ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms',
          width: 20,
          height: 40,
          borderRadius: '6px 0 0 6px',
          background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--agrex-node-border)',
          borderRight: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--agrex-fg)',
          opacity: forceCollapsed ? 0 : 0.4,
          pointerEvents: forceCollapsed ? 'none' : 'auto',
        }}
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
        >
          <path d="M2 1L6 4L2 7" />
        </svg>
      </button>
    </>
  )
}
