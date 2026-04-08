import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgrexNode } from '../types'

const KIND_LABELS: Record<string, string> = {
  agent: 'AGENT', sub_agent: 'SUB-AGENT', tool: 'TOOL', file: 'FILE',
}

interface ToastItem {
  id: string
  node: AgrexNode
  exiting: boolean
}

const MAX_VISIBLE = 5
const DURATION = 2500
const EXIT_MS = 300

export default function ToastStack({ node }: { node: AgrexNode | null }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>())

  // Clear all pending timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => { for (const t of timers) clearTimeout(t); timers.clear() }
  }, [])

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { timersRef.current.delete(id); fn() }, ms)
    timersRef.current.add(id)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => {
      if (!prev.some(t => t.id === id && !t.exiting)) return prev
      return prev.map(t => t.id === id ? { ...t, exiting: true } : t)
    })
    scheduleTimer(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, EXIT_MS)
  }, [scheduleTimer])

  useEffect(() => {
    if (!node) return
    const id = `toast-${++counterRef.current}`

    setToasts(prev => {
      let next = [...prev, { id, node, exiting: false }]
      // Evict oldest non-exiting toasts over the limit
      while (next.filter(t => !t.exiting).length > MAX_VISIBLE) {
        const oldest = next.find(t => !t.exiting)
        if (oldest) next = next.filter(t => t.id !== oldest.id)
        else break
      }
      return next
    })

    scheduleTimer(() => dismiss(id), DURATION)
  }, [node, dismiss, scheduleTimer])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'absolute', top: 16, left: 16, zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: 6,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: 'color-mix(in srgb, var(--agrex-bg) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--agrex-node-border)', borderRadius: 8, padding: '6px 14px',
          fontSize: 12, fontFamily: 'var(--agrex-font-mono)', display: 'flex', alignItems: 'center', gap: 8,
          opacity: t.exiting ? 0 : 1,
          transform: t.exiting ? 'translateX(-20px)' : 'translateX(0)',
          transition: `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease`,
          animation: t.exiting ? undefined : 'agrex-slide-in 0.2s ease-out',
        }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--agrex-fg)', opacity: 0.4, textTransform: 'uppercase' }}>
            {KIND_LABELS[t.node.type] ?? t.node.type}
          </span>
          <span style={{ color: 'var(--agrex-fg)', opacity: 0.8 }}>{t.node.label}</span>
        </div>
      ))}
    </div>
  )
}
