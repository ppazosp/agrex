import { useCallback, useMemo, useRef, useState } from 'react'
import { Agrex, useAgrexReplay, type AgrexEvent, type AgrexMarker, type AgrexHandle, type Theme } from '@ppazosp/agrex'
import { createMockPipeline, createMockNode } from '@ppazosp/agrex/mocks'
import '@ppazosp/agrex/styles.css'

type ScenarioName = 'research-agent' | 'multi-agent' | 'deep-chain'

const STAGE_KIND = 'stage'

function scenarioToEvents(name: ScenarioName): AgrexEvent[] {
  const { nodes, edges } = createMockPipeline(name)
  const events: AgrexEvent[] = []
  let ts = Date.now()

  events.push({ type: STAGE_KIND, ts, label: 'Spawn' })
  for (const edge of edges) {
    events.push({ type: 'edge_add', ts, edge })
    ts += 10
  }
  const addedAt = new Map<string, number>()
  for (const n of nodes) {
    ts += 150
    addedAt.set(n.id, ts)
    events.push({
      type: 'node_add',
      ts,
      node: { ...n, status: 'running', metadata: { ...(n.metadata ?? {}), startedAt: ts } },
    })
  }

  events.push({ type: STAGE_KIND, ts, label: 'Resolve' })
  for (const n of nodes) {
    ts += 200
    events.push({
      type: 'node_update',
      ts,
      id: n.id,
      status: 'done',
      metadata: { ...(n.metadata ?? {}), startedAt: addedAt.get(n.id), endedAt: ts },
    })
  }
  return events
}

const extractMarkers = (events: AgrexEvent[]): AgrexMarker[] => {
  const out: AgrexMarker[] = []
  events.forEach((e, i) => {
    if (e.type === STAGE_KIND) {
      out.push({ cursor: i, kind: STAGE_KIND, label: (e.label as string | undefined) ?? e.type })
    }
  })
  return out
}

export default function App() {
  const replay = useAgrexReplay({ markerExtractor: extractMarkers })
  const ref = useRef<AgrexHandle>(null)

  const [theme, setTheme] = useState<Theme>('dark')
  const [showControls, setShowControls] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showToasts, setShowToasts] = useState(true)
  const [showDetailPanel, setShowDetailPanel] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [animateEdges, setAnimateEdges] = useState(true)
  const [showTimeline, setShowTimeline] = useState(true)

  const loadScenario = useCallback(
    (name: ScenarioName) => {
      replay.load(scenarioToEvents(name))
    },
    [replay],
  )

  const staticLoad = useCallback(
    async (name: ScenarioName) => {
      const events = scenarioToEvents(name)
      await replay.load(events)
      replay.seek(events.length)
    },
    [replay],
  )

  const ensureLive = useCallback(() => {
    if (replay.mode === 'idle' || replay.mode === 'replay') replay.setMode('live')
  }, [replay])

  const addRandomNode = useCallback(() => {
    ensureLive()
    const types = ['agent', 'tool', 'file', 'sub_agent']
    const type = types[Math.floor(Math.random() * types.length)]
    const existingNodes = replay.instance.nodes
    const parentNode = existingNodes.length > 0 ? existingNodes[Math.floor(Math.random() * existingNodes.length)] : null

    const node = createMockNode({
      type,
      label: `Random ${type}`,
      parentId: parentNode?.id,
      status: 'running',
      metadata: { startedAt: Date.now() },
    })
    const addedAt = Date.now()
    replay.appendLive({ type: 'node_add', ts: addedAt, node })

    setTimeout(() => {
      replay.appendLive({
        type: 'node_update',
        ts: Date.now(),
        id: node.id,
        status: 'done',
        metadata: {
          startedAt: node.metadata!.startedAt,
          endedAt: Date.now(),
          tokens: Math.floor(Math.random() * 5000),
        },
      })
    }, 1500)
  }, [ensureLive, replay])

  const addErrorNode = useCallback(() => {
    ensureLive()
    const existingNodes = replay.instance.nodes
    const parentNode = existingNodes.length > 0 ? existingNodes[Math.floor(Math.random() * existingNodes.length)] : null

    const node = createMockNode({
      type: 'tool',
      label: 'failing_tool',
      parentId: parentNode?.id,
      status: 'error',
      metadata: { error: 'Connection timeout after 30s' },
    })
    replay.appendLive({ type: 'node_add', ts: Date.now(), node })
  }, [ensureLive, replay])

  const timelineProps = useMemo(() => ({ jumpMarkerKind: STAGE_KIND, showCollapseTab: true }), [])

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  }

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    ...btnStyle,
    background: on ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
    borderColor: on ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.15)',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          background: '#050505',
          zIndex: 50,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, marginRight: 12, opacity: 0.6 }}>agrex</span>

        <button style={btnStyle} onClick={() => loadScenario('research-agent')}>
          Research Agent
        </button>
        <button style={btnStyle} onClick={() => loadScenario('multi-agent')}>
          Multi Agent
        </button>
        <button style={btnStyle} onClick={() => loadScenario('deep-chain')}>
          Deep Chain
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={btnStyle} onClick={() => staticLoad('multi-agent')}>
          Static Load
        </button>
        <button style={btnStyle} onClick={addRandomNode}>
          + Random
        </button>
        <button style={{ ...btnStyle, borderColor: 'rgba(239,68,68,0.3)' }} onClick={addErrorNode}>
          + Error
        </button>
        <button style={{ ...btnStyle, borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => replay.reset()}>
          Clear
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={btnStyle} onClick={() => ref.current?.collapseAll()}>
          Collapse All
        </button>
        <button style={btnStyle} onClick={() => ref.current?.expandAll()}>
          Expand All
        </button>
        <button style={btnStyle} onClick={() => ref.current?.fitView()}>
          Fit
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={toggleStyle(showControls)} onClick={() => setShowControls((v) => !v)}>
          Controls
        </button>
        <button style={toggleStyle(showLegend)} onClick={() => setShowLegend((v) => !v)}>
          Legend
        </button>
        <button style={toggleStyle(showToasts)} onClick={() => setShowToasts((v) => !v)}>
          Toasts
        </button>
        <button style={toggleStyle(showDetailPanel)} onClick={() => setShowDetailPanel((v) => !v)}>
          Detail
        </button>
        <button style={toggleStyle(showStats)} onClick={() => setShowStats((v) => !v)}>
          Stats
        </button>
        <button style={toggleStyle(animateEdges)} onClick={() => setAnimateEdges((v) => !v)}>
          Animate
        </button>
        <button style={toggleStyle(showTimeline)} onClick={() => setShowTimeline((v) => !v)}>
          Timeline
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button
          style={toggleStyle(theme === 'dark')}
          onClick={() => setTheme((t: Theme) => (t === 'dark' ? 'light' : t === 'light' ? 'auto' : 'dark'))}
        >
          {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto'}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <Agrex
          ref={ref}
          replay={replay}
          theme={theme}
          showControls={showControls}
          showLegend={showLegend}
          showToasts={showToasts}
          showDetailPanel={showDetailPanel}
          showStats={showStats}
          animateEdges={animateEdges}
          showTimeline={showTimeline}
          timelineProps={timelineProps}
        />
      </div>
    </div>
  )
}
