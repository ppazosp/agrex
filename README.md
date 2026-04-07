# agrex

React component for visualizing AI agent execution as interactive graphs.

## Install

```bash
npm install agrex @xyflow/react
```

## Quick Start

```tsx
import { Agrex } from 'agrex'
import 'agrex/styles.css'

const nodes = [
  { id: '1', type: 'agent', label: 'Researcher' },
  { id: '2', type: 'tool', label: 'web_search', parentId: '1', status: 'done' },
]

const edges = [
  { id: 'e1', source: '1', target: '2', type: 'spawn' },
]

function App() {
  return <Agrex nodes={nodes} edges={edges} />
}
```

## Streaming

```tsx
import { Agrex, useAgrex } from 'agrex'
import 'agrex/styles.css'

function App() {
  const agrex = useAgrex()

  useEffect(() => {
    ws.onmessage = (msg) => {
      agrex.addNode(msg.node)
      agrex.addEdge(msg.edge)
    }
  }, [])

  return <Agrex instance={agrex} />
}
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` | `AgrexNode[]` | — | Static node data |
| `edges` | `AgrexEdge[]` | — | Static edge data |
| `instance` | `UseAgrexReturn` | — | Streaming mode |
| `theme` | `'dark' \| 'light' \| ThemeObject` | `'dark'` | Theme |
| `layout` | `'radial' \| LayoutFn` | `'radial'` | Layout algorithm |
| `nodeRenderers` | `Record<string, ComponentType>` | — | Custom node components |
| `nodeIcons` | `Record<string, ComponentType>` | — | Custom icons per type |
| `edgeColors` | `Record<string, string>` | — | Edge colors per type |
| `showControls` | `boolean` | `true` | Zoom controls |
| `showLegend` | `boolean` | `true` | Legend panel |
| `showToasts` | `boolean` | `true` | New-node toasts |
| `showDetailPanel` | `boolean` | `true` | Click detail panel |
| `fitOnUpdate` | `boolean` | `true` | Auto-fit viewport |

## Node Types

Built-in: `agent`, `sub_agent`, `tool`, `file`, `output`, `search`. Custom strings render with `DefaultNode`.

## Edge Types

Built-in: `spawn` (white), `write` (amber), `read` (blue). Custom strings render gray.

## Mocks

```tsx
import { createMockPipeline, replay } from 'agrex/mocks'

const scenario = createMockPipeline('multi-agent')
replay(agrexInstance, scenario, { speed: 2 })
```

Available scenarios: `research-agent`, `multi-agent`, `deep-chain`.

## License

MIT
