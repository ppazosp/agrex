import { useState, useCallback } from 'react'
import { Agrex, useAgrex } from 'agrex'
import { createMockPipeline, replay, createMockNode, createMockEdge } from 'agrex/mocks'
import 'agrex/styles.css'
import type { Theme } from 'agrex'

type ScenarioName = 'research-agent' | 'multi-agent' | 'deep-chain'

export default function App() {
  const agrex = useAgrex()
  const [theme, setTheme] = useState<Theme>('dark')
  const [showControls, setShowControls] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showToasts, setShowToasts] = useState(true)
  const [showDetailPanel, setShowDetailPanel] = useState(true)
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null)

  const loadScenario = useCallback((name: ScenarioName) => {
    if (cancelFn) cancelFn()
    const scenario = createMockPipeline(name)
    const cancel = replay(agrex, scenario, { speed: 1 })
    setCancelFn(() => cancel)
  }, [agrex, cancelFn])

  const loadStatic = useCallback((name: ScenarioName) => {
    agrex.clear()
    const { nodes, edges } = createMockPipeline(name)
    agrex.addNodes(nodes)
    agrex.addEdges(edges)
  }, [agrex])

  const addRandomNode = useCallback(() => {
    const types = ['agent', 'tool', 'file', 'output', 'search']
    const type = types[Math.floor(Math.random() * types.length)]
    const parentNode = agrex.nodes.length > 0
      ? agrex.nodes[Math.floor(Math.random() * agrex.nodes.length)]
      : null

    const node = createMockNode({
      type,
      label: `Random ${type}`,
      parentId: parentNode?.id,
      status: 'running',
    })
    agrex.addNode(node)

    if (parentNode) {
      agrex.addEdge(createMockEdge({ source: parentNode.id, target: node.id }))
    }

    setTimeout(() => agrex.updateNode(node.id, { status: 'done' }), 1500)
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
        <button style={btnStyle} onClick={addRandomNode}>+ Random Node</button>
        <button style={{ ...btnStyle, borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => agrex.clear()}>Clear</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={toggleStyle(showControls)} onClick={() => setShowControls(v => !v)}>Controls</button>
        <button style={toggleStyle(showLegend)} onClick={() => setShowLegend(v => !v)}>Legend</button>
        <button style={toggleStyle(showToasts)} onClick={() => setShowToasts(v => !v)}>Toasts</button>
        <button style={toggleStyle(showDetailPanel)} onClick={() => setShowDetailPanel(v => !v)}>Detail</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={toggleStyle(theme === 'dark')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <Agrex
          instance={agrex}
          theme={theme}
          showControls={showControls}
          showLegend={showLegend}
          showToasts={showToasts}
          showDetailPanel={showDetailPanel}
        />
      </div>
    </div>
  )
}
