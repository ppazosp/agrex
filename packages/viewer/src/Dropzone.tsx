import { useCallback, useEffect, useRef, useState } from 'react'
import { parseTrace, TraceParseError, type AgrexEvent } from '@ppazosp/agrex'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

export interface DropzoneProps {
  onLoad: (events: AgrexEvent[], sourceLabel: string) => void
  onLoadDemo: () => void
}

export default function Dropzone({ onLoad, onLoadDemo }: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const flashError = useCallback((msg: string) => {
    setError(msg)
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
  }, [])

  const handleText = useCallback(
    (text: string, sourceLabel: string) => {
      if (text.length > MAX_BYTES) {
        flashError(`${(text.length / 1024 / 1024).toFixed(1)} MB — limit is 25 MB.`)
        return
      }
      try {
        const events = parseTrace(text)
        if (events.length === 0) {
          flashError('Parsed, but the trace is empty.')
          return
        }
        setError(null)
        onLoad(events, sourceLabel)
      } catch (e) {
        if (e instanceof TraceParseError) flashError(e.message)
        else flashError((e as Error).message)
      }
    },
    [flashError, onLoad],
  )

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        flashError(`${(file.size / 1024 / 1024).toFixed(1)} MB — limit is 25 MB.`)
        return
      }
      handleText(await file.text(), file.name)
    },
    [flashError, handleText],
  )

  // Drag anywhere on the viewport. Counter avoids flicker when the cursor
  // crosses child elements (each fires its own dragleave).
  useEffect(() => {
    let counter = 0
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return
      counter += 1
      setDragOver(true)
    }
    const onDragLeave = () => {
      counter = Math.max(0, counter - 1)
      if (counter === 0) setDragOver(false)
    }
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      counter = 0
      setDragOver(false)
      const file = e.dataTransfer?.files[0]
      if (file) handleFile(file)
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [handleFile])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain')
      if (!text) return
      e.preventDefault()
      handleText(text, 'pasted')
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleText])

  // Cursor-reactive hover light. Writes CSS custom properties on the root
  // container instead of lifting cursor into React state — avoids a render
  // per mousemove while the `radial-gradient(... at var(--x) var(--y))`
  // paints itself from the live values.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      el.style.setProperty('--hoverlight-x', `${e.clientX}px`)
      el.style.setProperty('--hoverlight-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const openPicker = () => fileInput.current?.click()

  return (
    <div
      ref={rootRef}
      data-drag={dragOver}
      className={shaking ? 'viewer-shake' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        cursor: dragOver ? 'copy' : 'default',
      }}
    >
      <div className="viewer-dot-grid" aria-hidden />
      <div className="viewer-hoverlight" aria-hidden />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="viewer-chrome viewer-enter"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 3,
          animationDelay: '40ms',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/favicon.svg" alt="" aria-hidden style={{ width: 24, height: 24, borderRadius: 5 }} />
          <span style={{ color: 'var(--color-fg)' }}>agrex</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span>viewer</span>
        </div>
        <a href="https://github.com/ppazosp/agrex" target="_blank" rel="noreferrer">
          github ↗
        </a>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 clamp(24px, 8vw, 120px)',
          zIndex: 2,
          maxWidth: 1600,
        }}
      >
        <div className="viewer-label viewer-enter" style={{ marginBottom: '1.4rem', animationDelay: '140ms' }}>
          trace viewer · v0.5.1
        </div>

        <h1 className="viewer-hero">
          <span style={{ display: 'block' }}>
            <span className="viewer-hero-word" style={{ animationDelay: '220ms' }}>
              drop
            </span>
          </span>
          <span style={{ display: 'block' }} className="viewer-hero-accent">
            <span className="viewer-hero-word" style={{ animationDelay: '340ms' }}>
              a
            </span>{' '}
            <span className="viewer-hero-word" style={{ animationDelay: '440ms' }}>
              trace.
            </span>
          </span>
        </h1>

        <p
          className="viewer-enter"
          style={{
            marginTop: 'clamp(1.4rem, 2.2vw, 2.2rem)',
            marginBottom: 0,
            maxWidth: 620,
            fontSize: 'clamp(15px, 1.2vw, 17px)',
            color: 'var(--color-muted)',
            lineHeight: 1.6,
            textWrap: 'pretty',
            animationDelay: '560ms',
          }}
        >
          drop a <code style={{ color: 'var(--color-fg)' }}>.json</code> or{' '}
          <code style={{ color: 'var(--color-fg)' }}>.jsonl</code> file anywhere, paste with{' '}
          <kbd className="viewer-kbd">⌘V</kbd>, or{' '}
          <button type="button" onClick={openPicker} className="viewer-inline-link">
            pick a file
          </button>
          .
          <br />
          scrub every step of the execution —{' '}
          <a
            href="https://github.com/ppazosp/agrex/blob/main/docs/trace-format.md"
            target="_blank"
            rel="noreferrer"
            className="viewer-inline-link"
          >
            see the trace format ↗
          </a>
        </p>

        <div
          className="viewer-enter"
          style={{
            marginTop: '2.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            animationDelay: '680ms',
          }}
        >
          <button type="button" onClick={onLoadDemo} className="viewer-demo-btn">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            play the demo
          </button>
          <span className="viewer-chrome" style={{ fontSize: 10, opacity: 0.55 }}>
            ← or drop your own
          </span>
        </div>

        {error && (
          <div role="alert" className="viewer-error viewer-shake" style={{ marginTop: '1.6rem' }}>
            {error}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="viewer-chrome viewer-enter"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          opacity: 0.65,
          zIndex: 3,
          animationDelay: '780ms',
        }}
      >
        <span>nothing leaves your browser</span>
        <span>
          accepts {'{events}'} · {'{nodes, edges}'} · jsonl · 25 mb max
        </span>
      </footer>

      <div className="viewer-drag-ring" aria-hidden />

      <input
        ref={fileInput}
        type="file"
        accept=".json,.jsonl,application/json,application/x-ndjson"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
