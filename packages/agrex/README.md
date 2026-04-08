# agrex

Real-time graph visualizer for AI agent execution flows. Built on React Flow.

## Install

```bash
npm install agrex @xyflow/react react react-dom
```

## Quick start

```tsx
import { Agrex } from 'agrex'
import 'agrex/styles.css'

const nodes = [
  { id: 'root', type: 'agent', label: 'Researcher', status: 'running' },
  { id: 'ws1', type: 'tool', label: 'web_search', parentId: 'root', status: 'done' },
  { id: 'f1', type: 'file', label: 'output.md', parentId: 'root', status: 'idle' },
]

const edges = [
  { id: 'root-ws1', source: 'root', target: 'ws1' },
  { id: 'root-f1', source: 'root', target: 'f1', type: 'write', label: 'output.md' },
]

function App() {
  return <Agrex nodes={nodes} edges={edges} theme="dark" />
}
```

## Streaming mode

For real-time updates from a running agent:

```tsx
import { useEffect } from 'react'
import { Agrex, useAgrex } from 'agrex'
import 'agrex/styles.css'

function App() {
  const agrex = useAgrex()

  useEffect(() => {
    agrex.addNode({ id: 'root', type: 'agent', label: 'Orchestrator', status: 'running' })
    // Later, as events arrive:
    agrex.addNode({ id: 't1', type: 'tool', label: 'web_search', parentId: 'root', status: 'running' })
    agrex.addEdge({ id: 'root-t1', source: 'root', target: 't1' })
    agrex.updateNode('t1', { status: 'done' })
  }, [])

  return <Agrex instance={agrex} theme="dark" />
}
```

## Node types

| Type | Shape | Description |
|------|-------|-------------|
| `agent` | Rounded rectangle (80px) | Root or top-level agent |
| `sub_agent` | Rounded rectangle (56px) | Delegated sub-agent |
| `tool` | Circle (36px) | Tool call (wrench icon default) |
| `file` | Hexagon (48px) | File artifact |
| Custom string | Rounded rectangle (48px) | Falls back to DefaultNode |

## Edge types

| Type | Color | Description |
|------|-------|-------------|
| `spawn` | Default edge color | Agent spawns child |
| `write` | Amber | Write to file |
| `read` | Blue | Read from file |

Edges support `label` for showing data flow names.

## Props

```tsx
interface AgrexProps {
  // Data
  nodes?: AgrexNode[]
  edges?: AgrexEdge[]
  instance?: UseAgrexReturn        // from useAgrex() for streaming

  // Callbacks
  onNodeClick?: (node: AgrexNode) => void
  onEdgeClick?: (edge: AgrexEdge) => void

  // Appearance
  theme?: 'dark' | 'light' | 'auto' | ThemeObject
  layout?: 'radial' | 'force' | LayoutFn
  className?: string

  // Custom rendering
  nodeRenderers?: Record<string, React.ComponentType<AgrexNodeProps>>
  toolIcons?: Record<string, React.ComponentType<{ size: number }>>
  fileIcons?: Record<string, React.ComponentType<{ size: number }>>
  edgeColors?: Record<string, string>

  // UI toggles
  showControls?: boolean           // default: true
  showLegend?: boolean             // default: true
  showToasts?: boolean             // default: true
  showDetailPanel?: boolean        // default: true

  showStats?: boolean              // default: false
  fitOnUpdate?: boolean            // default: true
  keyboardShortcuts?: boolean      // default: true
  animateEdges?: boolean           // default: true
}
```

## Imperative API

Access graph methods via ref:

```tsx
import { useRef } from 'react'
import { Agrex, type AgrexHandle } from 'agrex'

function App() {
  const ref = useRef<AgrexHandle>(null)

  return (
    <>
      <button onClick={() => ref.current?.fitView()}>Fit</button>
      <button onClick={() => ref.current?.collapseAll()}>Collapse All</button>
      <button onClick={() => ref.current?.expandAll()}>Expand All</button>
      <button onClick={() => console.log(ref.current?.toJSON())}>Export</button>
      <Agrex ref={ref} nodes={nodes} edges={edges} />
    </>
  )
}
```

## Auto theme

`theme="auto"` follows the system's `prefers-color-scheme`:

```tsx
<Agrex nodes={nodes} edges={edges} theme="auto" />
```

## Custom icons

Map tool names or file extensions to icon components:

```tsx
import { Search, FileCode, FileJson } from 'lucide-react'

<Agrex
  toolIcons={{ web_search: Search, run_tests: TestTube }}
  fileIcons={{ py: FileCode, json: FileJson, md: FileText }}
/>
```

## Timing and cost tracking

Pass `startedAt` and `endedAt` in node metadata to show elapsed time badges:

```tsx
agrex.addNode({
  id: 't1', type: 'tool', label: 'web_search', parentId: 'root',
  status: 'running',
  metadata: { startedAt: Date.now() },
})

// When done:
agrex.updateNode('t1', {
  status: 'done',
  metadata: { startedAt: 1234567890, endedAt: Date.now(), tokens: 1500, cost: 0.003 },
})
```

- `tokens` shows as a badge (e.g., "1.5k tok")
- `cost` shows as a badge (e.g., "$0.0030")
- Elapsed time auto-computes from `startedAt`/`endedAt`

## Stats bar

Enable `showStats` to see an aggregate dashboard:

```tsx
<Agrex nodes={nodes} edges={edges} showStats />
```

Shows total nodes, running/done/error counts, total tokens, and total cost.

## Node collapsing

Click any `agent` or `sub_agent` node to collapse/expand its children. Agent nodes always show their direct child count as a badge. When collapsed, the badge turns blue and shows "N collapsed".

Use the imperative API for bulk operations: `collapseAll()` / `expandAll()`.

## Error display

When a node has `status: 'error'` and `metadata.error`, the detail panel shows the error prominently in a red highlight box.

## JSON import/export

```tsx
// Export
const data = ref.current?.toJSON()
localStorage.setItem('graph', JSON.stringify(data))

// Import
const saved = JSON.parse(localStorage.getItem('graph')!)
agrex.loadJSON(saved)
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Fit to view |
| `r` | Relayout |

Disable with `keyboardShortcuts={false}`.

## Mocks

For development and testing:

```tsx
import { createMockPipeline, replay } from 'agrex/mocks'

const scenario = createMockPipeline('multi-agent')
const controller = replay(agrex, scenario, { speed: 2 })

// Replay controls
controller.pause()
controller.resume()
controller.setSpeed(4)
controller.cancel()
```

Available scenarios: `research-agent`, `multi-agent`, `deep-chain`.

## Next.js

The package includes `"use client"` directive. For dynamic import:

```tsx
import dynamic from 'next/dynamic'
const Agrex = dynamic(() => import('agrex').then(m => m.Agrex), { ssr: false })
```

## License

MIT
