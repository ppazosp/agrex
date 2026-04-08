import { useState, useCallback, useRef } from 'react'
import { Agrex, useAgrex, type AgrexHandle, type Theme } from 'agrex'
import { createMockPipeline, replay, createMockNode, type ReplayController } from 'agrex/mocks'
import 'agrex/styles.css'

type ScenarioName = 'research-agent' | 'multi-agent' | 'deep-chain'

export default function App() {
  const agrex = useAgrex()
  const ref = useRef<AgrexHandle>(null)
  const [theme, setTheme] = useState<Theme>('dark')
  const [showControls, setShowControls] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showToasts, setShowToasts] = useState(true)
  const [showDetailPanel, setShowDetailPanel] = useState(true)

  const [showStats, setShowStats] = useState(false)
  const [animateEdges, setAnimateEdges] = useState(true)
  const [controller, setController] = useState<ReplayController | null>(null)

  const loadScenario = useCallback((name: ScenarioName) => {
    controller?.cancel()
    const scenario = createMockPipeline(name)
    const ctrl = replay(agrex, scenario, { speed: 1 })
    setController(ctrl)
  }, [agrex, controller])

  const loadStatic = useCallback((name: ScenarioName) => {
    controller?.cancel()
    agrex.clear()
    const { nodes, edges } = createMockPipeline(name)
    agrex.addNodes(nodes)
    agrex.addEdges(edges)
  }, [agrex, controller])

  const addRandomNode = useCallback(() => {
    const types = ['agent', 'tool', 'file', 'sub_agent']
    const type = types[Math.floor(Math.random() * types.length)]
    const parentNode = agrex.nodes.length > 0
      ? agrex.nodes[Math.floor(Math.random() * agrex.nodes.length)]
      : null

    const node = createMockNode({
      type,
      label: `Random ${type}`,
      parentId: parentNode?.id,
      status: 'running',
      metadata: { startedAt: Date.now() },
    })
    agrex.addNode(node)

    setTimeout(() => agrex.updateNode(node.id, {
      status: 'done',
      metadata: { startedAt: node.metadata!.startedAt, endedAt: Date.now(), tokens: Math.floor(Math.random() * 5000) },
    }), 1500)
  }, [agrex])

  const addErrorNode = useCallback(() => {
    const parentNode = agrex.nodes.length > 0
      ? agrex.nodes[Math.floor(Math.random() * agrex.nodes.length)]
      : null

    const node = createMockNode({
      type: 'tool',
      label: 'failing_tool',
      parentId: parentNode?.id,
      status: 'error',
      metadata: { error: 'Connection timeout after 30s' },
    })
    agrex.addNode(node)
  }, [agrex])

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
    color: '#fff', fontSize: 12, cursor: 'pointer',
  }

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    ...btnStyle,
    background: on ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
    borderColor: on ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.15)',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#050505', zIndex: 50,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, marginRight: 12, opacity: 0.6 }}>agrex</span>

        <button style={btnStyle} onClick={() => loadScenario('research-agent')}>Research Agent</button>
        <button style={btnStyle} onClick={() => loadScenario('multi-agent')}>Multi Agent</button>
        <button style={btnStyle} onClick={() => loadScenario('deep-chain')}>Deep Chain</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={btnStyle} onClick={() => loadStatic('multi-agent')}>Static Load</button>
        <button style={btnStyle} onClick={addRandomNode}>+ Random</button>
        <button style={{ ...btnStyle, borderColor: 'rgba(239,68,68,0.3)' }} onClick={addErrorNode}>+ Error</button>
        <button style={{ ...btnStyle, borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => { controller?.cancel(); agrex.clear() }}>Clear</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={btnStyle} onClick={() => ref.current?.collapseAll()}>Collapse All</button>
        <button style={btnStyle} onClick={() => ref.current?.expandAll()}>Expand All</button>
        <button style={btnStyle} onClick={() => ref.current?.fitView()}>Fit</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={toggleStyle(showControls)} onClick={() => setShowControls(v => !v)}>Controls</button>
        <button style={toggleStyle(showLegend)} onClick={() => setShowLegend(v => !v)}>Legend</button>
        <button style={toggleStyle(showToasts)} onClick={() => setShowToasts(v => !v)}>Toasts</button>
        <button style={toggleStyle(showDetailPanel)} onClick={() => setShowDetailPanel(v => !v)}>Detail</button>

        <button style={toggleStyle(showStats)} onClick={() => setShowStats(v => !v)}>Stats</button>
        <button style={toggleStyle(animateEdges)} onClick={() => setAnimateEdges(v => !v)}>Animate</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={toggleStyle(theme === 'dark')} onClick={() => setTheme((t: Theme) => t === 'dark' ? 'light' : t === 'light' ? 'auto' : 'dark')}>
          {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto'}
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <Agrex
          ref={ref}
          instance={agrex}
          theme={theme}
          showControls={showControls}
          showLegend={showLegend}
          showToasts={showToasts}
          showDetailPanel={showDetailPanel}

          showStats={showStats}
          animateEdges={animateEdges}
        />
      </div>
    </div>
  )
}
