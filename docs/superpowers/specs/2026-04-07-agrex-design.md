# agrex — Agent Graph Execution Visualizer

**Date:** 2026-04-07
**Status:** Draft

## Overview

`agrex` is a React component library for visualizing AI agent execution as interactive graphs. Framework-agnostic, it accepts a simple JSON data model (nodes + edges) and renders a live, animated graph showing agents, tools, files, and data flow.

**Target audience:** Both agent framework authors (embedding visualization in playgrounds/docs) and app developers (showing users what an agent is doing in real-time).

**Market gap:** No embeddable, framework-agnostic React component exists for rendering agent execution as interactive graphs. AgentPrism (321 stars) does tree/timeline only. React Flow is generic. Observability platforms (LangSmith, Langfuse) bundle visualization into closed platforms.

## Distribution

- **npm package:** `agrex` (core + mocks)
- **Separate adapters:** `agrex-adapter-otel`, `agrex-adapter-langfuse`
- **Monorepo** with pnpm workspaces, not published: `playground/` (dev app)
- **React-only** for now, architecture allows future framework wrappers

## Core Data Model

```typescript
interface AgrexNode {
  id: string
  type: 'agent' | 'tool' | 'file' | 'output' | 'search' | string
  label: string
  parentId?: string
  status?: 'idle' | 'running' | 'done' | 'error'
  metadata?: Record<string, unknown>
}

interface AgrexEdge {
  id: string
  source: string
  target: string
  type?: 'spawn' | 'read' | 'write' | string
}
```

- `type` accepts built-in strings with default rendering + arbitrary custom strings (renders with `DefaultNode` or user-provided renderer)
- `parentId` drives layout — child nodes orbit their parent
- `metadata` is an open bag rendered in the detail panel
- `status` drives animations (running = amber pulse, done = green, error = red)

## Component API

### Static usage

```tsx
import { Agrex } from 'agrex'

<Agrex nodes={nodes} edges={edges} onNodeClick={(node) => {}} theme="dark" />
```

### Streaming usage

```tsx
import { Agrex, useAgrex } from 'agrex'

function MyApp() {
  const agrex = useAgrex()

  useEffect(() => {
    ws.onmessage = (msg) => {
      if (msg.type === 'node_add') agrex.addNode(msg.node)
      if (msg.type === 'node_update') agrex.updateNode(msg.id, { status: 'done' })
      if (msg.type === 'edge_add') agrex.addEdge(msg.edge)
    }
  }, [])

  return <Agrex instance={agrex} onNodeClick={handleClick} />
}
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` | `AgrexNode[]` | — | Static mode: node array |
| `edges` | `AgrexEdge[]` | — | Static mode: edge array |
| `instance` | `UseAgrexReturn` | — | Streaming mode: from `useAgrex()` |
| `onNodeClick` | `(node: AgrexNode) => void` | — | Click callback |
| `theme` | `'dark' \| 'light' \| ThemeObject` | `'dark'` | Theme |
| `layout` | `'radial' \| 'tree' \| LayoutFn` | `'radial'` | Layout algorithm |
| `nodeRenderers` | `Record<string, ComponentType>` | — | Custom node renderers per type |
| `nodeIcons` | `Record<string, ComponentType>` | — | Custom icons per node type |
| `edgeColors` | `Record<string, string>` | — | Override edge colors per type |
| `showControls` | `boolean` | `true` | Viewport controls bar |
| `showLegend` | `boolean` | `true` | Legend panel |
| `showToasts` | `boolean` | `true` | Node-add toast notifications |
| `showDetailPanel` | `boolean` | `true` | Click-to-inspect panel |
| `fitOnUpdate` | `boolean` | `true` | Auto-fit viewport on changes |

### Layered customization

```tsx
// Level 1: theme colors
<Agrex theme={{ background: '#1a1a2e', accent: '#e94560' }} />

// Level 2: custom icons
<Agrex nodeIcons={{ tool: MyToolIcon, agent: MyAgentIcon }} />

// Level 3: fully custom node renderer
<Agrex nodeRenderers={{ agent: MyCustomAgentNode }} />
```

## Mock System

Published as subpath export `agrex/mocks`.

```typescript
import { createMockPipeline, createMockNode, replay } from 'agrex/mocks'

// Pre-built scenarios
const scenario = createMockPipeline('research-agent')
const scenario2 = createMockPipeline('multi-agent')
const scenario3 = createMockPipeline('deep-chain')

// Custom nodes
const node = createMockNode({ type: 'agent', label: 'My Agent' })

// Replay: simulate streaming
replay(agrexInstance, scenario, { speed: 1.5 })
```

**Scenarios:**
- `research-agent` — single agent with tools and file outputs
- `multi-agent` — 3 agents collaborating, spawning sub-agents
- `deep-chain` — deeply nested agent hierarchy

## Dev Playground

Vite app in `packages/playground/` (NOT published). Features:
- Renders `<Agrex>` with all mock scenarios
- Sidebar to toggle props (theme, layout, panels)
- Manual controls: "Add node", "Trigger error", "Clear"
- Living demo and primary development tool

## Built-in Node Types

| Type | Shape | Default Icon | Size |
|---|---|---|---|
| `agent` | Rounded rectangle | Configurable avatar | 80x80 |
| `tool` | Circle | Lucide icon by tool name | 36x36 |
| `file` | Diamond (rotated square) | File type icon | 40x40 |
| `output` | Hexagon | File type icon | 44x44 |
| `search` | Circle | Search icon | 32x32 |
| (custom) | Rounded rectangle | Fallback icon | 48x48 |

## Built-in Edge Types

| Type | Color | Description |
|---|---|---|
| `spawn` | White (0.35 opacity) | Agent hierarchy |
| `write` | Amber (0.35 opacity) | Data write |
| `read` | Blue (0.35 opacity) | Data read |
| (custom) | Gray (0.35 opacity) | Fallback |

All edges are animated straight lines with configurable colors.

## Layout Algorithms

- **`radial`** (default) — golden-angle outward placement. Children orbit parent nodes on successive rings. Produces organic, non-overlapping layouts.
- **`tree`** — standard top-down tree. Better for strictly hierarchical agents.
- **Custom** — pass a `LayoutFn: (nodes, edges) => PositionedNode[]` for full control.

## Animations

- **Node entrance:** fade-in + scale pop
- **Running status:** amber pulsing glow (box-shadow for rectangular, drop-shadow for SVG shapes)
- **Done status:** green solid ring
- **Error status:** red solid ring
- **Edge drawing:** animated stroke on creation
- All animations use CSS, configurable via theme (duration, disable)

## Theming

```typescript
interface ThemeObject {
  background?: string
  foreground?: string
  accent?: string
  nodeBorder?: string
  edgeDefault?: string
  statusRunning?: string      // default: amber
  statusDone?: string         // default: green
  statusError?: string        // default: red
  fontFamily?: string
  fontSize?: string
  animationDuration?: string  // '0s' to disable
}
```

Two built-in presets: `dark` (default) and `light`.

## Adapter Protocol

Adapters convert external trace formats to `AgrexNode[]` + `AgrexEdge[]`.

```typescript
// agrex-adapter-otel
import { fromOtelSpans } from 'agrex-adapter-otel'

const { nodes, edges } = fromOtelSpans(spans)
```

Each adapter is a pure function: external format in, agrex format out. No side effects, no state.

**Planned adapters:**
- `agrex-adapter-otel` — OpenTelemetry GenAI spans
- `agrex-adapter-langfuse` — Langfuse trace format

## Package Structure

```
~/projects/agrex/
├── packages/
│   ├── agrex/                        # npm: agrex
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Agrex.tsx
│   │   │   │   ├── Graph.tsx
│   │   │   │   ├── Controls.tsx
│   │   │   │   ├── Legend.tsx
│   │   │   │   ├── DetailPanel.tsx
│   │   │   │   └── Toast.tsx
│   │   │   ├── nodes/
│   │   │   │   ├── AgentNode.tsx
│   │   │   │   ├── ToolNode.tsx
│   │   │   │   ├── FileNode.tsx
│   │   │   │   ├── OutputNode.tsx
│   │   │   │   ├── SearchNode.tsx
│   │   │   │   └── DefaultNode.tsx
│   │   │   ├── edges/
│   │   │   │   └── AgrexEdge.tsx
│   │   │   ├── layout/
│   │   │   │   ├── radial.ts
│   │   │   │   └── tree.ts
│   │   │   ├── hooks/
│   │   │   │   └── useAgrex.ts
│   │   │   ├── theme/
│   │   │   │   ├── dark.ts
│   │   │   │   ├── light.ts
│   │   │   │   └── types.ts
│   │   │   ├── mocks/
│   │   │   │   ├── scenarios.ts
│   │   │   │   ├── generators.ts
│   │   │   │   └── replay.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── agrex-adapter-otel/           # npm: agrex-adapter-otel
│   │   ├── src/index.ts
│   │   └── package.json
│   └── playground/                   # NOT published
│       ├── src/App.tsx
│       ├── package.json
│       └── vite.config.ts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
└── README.md
```

## Tooling

- **pnpm workspaces** — monorepo management
- **tsup** — build (ESM + CJS dual output)
- **Vite** — playground dev server
- **Vitest** — unit tests
- **TypeScript** — strict mode

## Peer Dependencies

- `react` >= 18
- `react-dom` >= 18
- `@xyflow/react` >= 12

## Exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./mocks": "./dist/mocks/index.js"
  }
}
```

## Out of Scope

- Human-in-the-loop review UI (app-specific)
- Pipeline stage sidebar (app-specific)
- Demo mode / landing page (app-specific)
- WebSocket transport (users bring their own)
- Rich markdown/code rendering in detail panel (default renders `metadata` as key-value pairs; users can override via `onNodeClick` for custom panels)
- Vue/Svelte wrappers (future, architecture allows it)
- shadcn-style ejection (future)
