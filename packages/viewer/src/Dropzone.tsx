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

  const flashError = useCallback((msg: string) => {
    setError(msg)
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
  }, [])

  const handleText = useCallback(
    (text: string, sourceLabel: string) => {
      if (text.length > MAX_BYTES) {
        flashError(`File is ${(text.length / 1024 / 1024).toFixed(1)} MB — limit is 25 MB.`)
        return
      }
      try {
        const events = parseTrace(text)
        if (events.length === 0) {
          flashError('Parsed successfully but the trace is empty.')
          return
        }
        setError(null)
        onLoad(events, sourceLabel)
      } catch (e) {
        if (e instanceof TraceParseError) {
          flashError(e.message)
        } else {
          flashError((e as Error).message)
        }
      }
    },
    [flashError, onLoad],
  )

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        flashError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — limit is 25 MB.`)
        return
      }
      const text = await file.text()
      handleText(text, file.name)
    },
    [flashError, handleText],
  )

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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInput.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className={shaking ? 'viewer-shake' : undefined}
        style={{
          width: 'min(720px, 100%)',
          height: 360,
          border: `2px dashed ${dragOver ? '#7c8cff' : '#333'}`,
          borderRadius: 14,
          background: dragOver ? 'rgba(124,140,255,0.06)' : 'rgba(255,255,255,0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          cursor: 'pointer',
          transition: 'border-color 160ms, background 160ms',
          outline: 'none',
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.4 }}>Drop a trace</div>
        <div style={{ fontSize: 14, opacity: 0.65, textAlign: 'center', maxWidth: 480, lineHeight: 1.45 }}>
          Drag and drop a <code style={{ opacity: 0.9 }}>.json</code> or <code style={{ opacity: 0.9 }}>.jsonl</code>{' '}
          file, click to pick one, or paste a trace anywhere on this page.
        </div>
        <div style={{ fontSize: 12, opacity: 0.4 }}>
          accepts <code>{'{events}'}</code>, <code>{'{nodes, edges}'}</code>, or newline-delimited events · 25 MB max
        </div>
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

      {error ? (
        <div
          style={{
            marginTop: 14,
            color: '#ff8a8a',
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            maxWidth: 720,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      ) : (
        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.5 }}>
          no trace handy?{' '}
          <button
            type="button"
            onClick={onLoadDemo}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9fb0ff',
              cursor: 'pointer',
              fontSize: 13,
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            try the demo
          </button>
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11,
          opacity: 0.35,
          letterSpacing: 0.2,
        }}
      >
        agrex viewer — nothing leaves your browser ·{' '}
        <a href="https://github.com/ppazosp/agrex" style={{ color: 'inherit' }} target="_blank" rel="noreferrer">
          github
        </a>
      </div>
    </div>
  )
}
