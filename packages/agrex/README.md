<p align="center">
  <img src="https://raw.githubusercontent.com/ppazosp/agrex/main/.github/logo.svg" alt="agrex" width="160">
</p>

<h1 align="center">agrex</h1>

<p align="center">
  Real-time graph visualizer for AI agent execution flows. Built on React Flow.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ppazosp/agrex"><img src="https://img.shields.io/npm/v/@ppazosp/agrex" alt="npm version"></a>
  <a href="https://github.com/ppazosp/agrex/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ppazosp/agrex" alt="License"></a>
  <a href="https://www.npmjs.com/package/@ppazosp/agrex"><img src="https://img.shields.io/npm/dm/@ppazosp/agrex" alt="Downloads"></a>
  <a href="https://bundlephobia.com/package/@ppazosp/agrex"><img src="https://img.shields.io/bundlephobia/minzip/@ppazosp/agrex" alt="Bundle size"></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/ppazosp/agrex/main/.github/example.png" alt="agrex in action" width="700">
</p>

---

## Install

```bash
npm install @ppazosp/agrex @xyflow/react react react-dom
```

## Quick start

```tsx
import { Agrex } from '@ppazosp/agrex'
import 'agrex/styles.css'

const nodes = [
  { id: 'root', type: 'agent', label: 'Researcher', status: 'done' },
  { id: 'ws1', type: 'tool', label: 'web_search', parentId: 'root', status: 'done' },
  { id: 'wf1', type: 'tool', label: 'write_file', parentId: 'root', status: 'done', writes: ['f1'] },
  { id: 'f1', type: 'file', label: 'output.md', parentId: 'wf1', status: 'done' },
]

function App() {
  return <Agrex nodes={nodes} />
}
```

No manual edges needed. Edges are auto-generated from `parentId`, `reads`, and `writes`.

## Streaming mode

For real-time updates from a running agent:

```tsx
import { Agrex, useAgrex } from '@ppazosp/agrex'
import 'agrex/styles.css'

function App() {
  const agrex = useAgrex()

  useEffect(() => {
    const onStart = (e) => {
      agrex.addNode({ id: e.id, type: 'agent', label: e.name, status: 'running' })
    }
    const onCall = (e) => {
      agrex.addNode({ id: e.id, type: 'tool', label: e.name, parentId: e.agentId, status: 'running' })
    }
    const onDone = (e) => {
      agrex.updateNode(e.id, { status: 'done' })
    }
    agent.on('agent:start', onStart)
    agent.on('tool:call', onCall)
    agent.on('tool:done', onDone)
    return () => {
      agent.off('agent:start', onStart)
      agent.off('tool:call', onCall)
      agent.off('tool:done', onDone)
    }
  }, [])

  return <Agrex instance={agrex} />
}
```

The full store API:

```tsx
agrex.addNode(node) // Add a node (no-op if id exists)
agrex.addNodes(nodes) // Add multiple nodes (skips duplicates)
agrex.updateNode(id, updates) // Update status, label, or metadata (metadata is merged, not replaced)
agrex.removeNode(id) // Remove a node and its edges
agrex.clear() // Clear everything
agrex.loadJSON({ nodes }) // Load from snapshot
```

## Auto edges

Edges are derived automatically from node fields. You never need to call `addEdge` for common patterns:

| Field            | Edge type | Direction           |
| ---------------- | --------- | ------------------- |
| `parentId`       | `spawn`   | parent -> child     |
| `reads: ['id']`  | `read`    | target -> this node |
| `writes: ['id']` | `write`   | this node -> target |

```tsx
// This single addNode call creates both the node AND a spawn edge from 'agent1'
agrex.addNode({ id: 't1', type: 'tool', label: 'search', parentId: 'agent1', status: 'running' })

// This creates the node, a spawn edge from 'wf1', AND a write edge to 'f1'
agrex.addNode({ id: 'f1', type: 'file', label: 'data.json', parentId: 'wf1' })
```

You can still use `addEdge` for custom edge types not covered by auto-derivation.

## Framework integrations

### Vercel AI SDK

```tsx
import { useChat } from 'ai/react'
import { Agrex, useAgrex } from '@ppazosp/agrex'
import 'agrex/styles.css'

function Chat() {
  const agrex = useAgrex()
  const agentId = 'assistant'

  const { messages } = useChat({
    onToolCall: ({ toolCall }) => {
      agrex.addNode({
        id: toolCall.toolCallId,
        type: 'tool',
        label: toolCall.toolName,
        parentId: agentId,
        status: 'running',
        metadata: { args: toolCall.args, startedAt: Date.now() },
      })
    },
  })

  // Mark tools as done when results arrive
  useEffect(() => {
    for (const msg of messages) {
      for (const part of msg.parts ?? []) {
        if (part.type === 'tool-invocation' && part.state === 'result') {
          agrex.updateNode(part.toolInvocation.toolCallId, {
            status: 'done',
            metadata: { endedAt: Date.now() },
          })
        }
      }
    }
  }, [messages])

  return <Agrex instance={agrex} />
}
```

### Anthropic SDK (Claude)

```tsx
const agrex = useAgrex()
const agentId = 'claude'

agrex.addNode({ id: agentId, type: 'agent', label: 'Claude', status: 'running' })

const stream = anthropic.messages.stream({
  model: 'claude-sonnet-4-20250514',
  messages,
  tools,
})

stream.on('contentBlockStart', (block) => {
  if (block.content_block.type === 'tool_use') {
    agrex.addNode({
      id: block.content_block.id,
      type: 'tool',
      label: block.content_block.name,
      parentId: agentId,
      status: 'running',
      metadata: { startedAt: Date.now() },
    })
  }
})

stream.on('finalMessage', (message) => {
  for (const block of message.content) {
    if (block.type === 'tool_use') {
      agrex.updateNode(block.id, { status: 'done', metadata: { endedAt: Date.now() } })
    }
  }
  agrex.updateNode(agentId, { status: 'done' })
})
```

### OpenAI SDK

```tsx
const agrex = useAgrex()
const agentId = 'gpt'

agrex.addNode({ id: agentId, type: 'agent', label: 'GPT-4', status: 'running' })

const stream = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages,
  tools,
  stream: true,
})

const toolCalls = new Map()

for await (const chunk of stream) {
  for (const tc of chunk.choices[0].delta.tool_calls ?? []) {
    if (tc.function?.name && !toolCalls.has(tc.index)) {
      const id = `tool-${tc.index}`
      toolCalls.set(tc.index, id)
      agrex.addNode({
        id,
        type: 'tool',
        label: tc.function.name,
        parentId: agentId,
        status: 'running',
        metadata: { startedAt: Date.now() },
      })
    }
  }
}

// Mark all done after stream completes
for (const id of toolCalls.values()) {
  agrex.updateNode(id, { status: 'done', metadata: { endedAt: Date.now() } })
}
agrex.updateNode(agentId, { status: 'done' })
```

### LangChain / LangGraph

```tsx
const agrex = useAgrex()

const eventStream = agent.streamEvents(input, { version: 'v2' })

for await (const event of eventStream) {
  switch (event.event) {
    case 'on_chain_start':
      agrex.addNode({
        id: event.run_id,
        type: 'agent',
        label: event.name,
        parentId: event.parent_ids?.[0],
        status: 'running',
      })
      break
    case 'on_tool_start':
      agrex.addNode({
        id: event.run_id,
        type: 'tool',
        label: event.name,
        parentId: event.parent_ids?.[0],
        status: 'running',
        metadata: { input: event.data.input, startedAt: Date.now() },
      })
      break
    case 'on_tool_end':
      agrex.updateNode(event.run_id, {
        status: 'done',
        metadata: { endedAt: Date.now() },
      })
      break
    case 'on_chain_end':
      agrex.updateNode(event.run_id, { status: 'done' })
      break
  }
}
```

## Node types

| Type          | Shape                    | Description                     |
| ------------- | ------------------------ | ------------------------------- |
| `agent`       | Rounded rectangle (80px) | Root or top-level agent         |
| `sub_agent`   | Rounded rectangle (56px) | Delegated sub-agent             |
| `tool`        | Circle (36px)            | Tool call (wrench icon default) |
| `file`        | Hexagon (48px)           | File artifact                   |
| Custom string | Rounded rectangle (48px) | Falls back to DefaultNode       |

## Edge types

| Type    | Color              | Description                               |
| ------- | ------------------ | ----------------------------------------- |
| `spawn` | Default edge color | Agent spawns child (auto from `parentId`) |
| `write` | Amber              | Write to file (auto from `writes`)        |
| `read`  | Blue               | Read from file (auto from `reads`)        |

## Props

```tsx
interface AgrexProps {
  // Data
  nodes?: AgrexNode[]
  edges?: AgrexEdge[]
  instance?: UseAgrexReturn // from useAgrex() for streaming

  // Callbacks
  onNodeClick?: (node: AgrexNode) => void
  onEdgeClick?: (edge: AgrexEdge) => void

  // Appearance
  theme?: 'dark' | 'light' | 'auto' | ThemeObject
  className?: string

  // Custom rendering
  nodeRenderers?: Record<string, React.ComponentType<AgrexNodeProps>>
  toolIcons?: Record<string, React.ComponentType<{ size: number }>>
  fileIcons?: Record<string, React.ComponentType<{ size: number }>>
  edgeColors?: Record<string, string>

  // UI toggles
  showControls?: boolean // default: true
  showLegend?: boolean // default: true
  showToasts?: boolean // default: true
  showDetailPanel?: boolean // default: true
  showStats?: boolean // default: false
  fitOnUpdate?: boolean // default: true
  keyboardShortcuts?: boolean // default: true
  animateEdges?: boolean // default: true
}
```

## Imperative API

```tsx
const ref = useRef<AgrexHandle>(null)

ref.current?.fitView()
ref.current?.collapseAll()
ref.current?.expandAll()
ref.current?.toJSON() // { nodes, edges }

<Agrex ref={ref} nodes={nodes} />
```

## Theming

```tsx
// Built-in themes
<Agrex theme="dark" />
<Agrex theme="light" />
<Agrex theme="auto" /> // follows prefers-color-scheme

// Custom theme (merges with dark)
<Agrex theme={{ background: '#1a1a2e', accent: '#e94560', statusRunning: '#f5a623' }} />
```

## Custom icons

```tsx
import { Search, FileCode, FileJson } from 'lucide-react'
;<Agrex
  toolIcons={{ web_search: Search, run_tests: TestTube }}
  fileIcons={{ py: FileCode, json: FileJson, md: FileText }}
/>
```

## Timing and cost tracking

```tsx
agrex.addNode({
  id: 't1',
  type: 'tool',
  label: 'web_search',
  parentId: 'root',
  status: 'running',
  metadata: { startedAt: Date.now() },
})

// metadata is merged — only pass the new keys, existing ones are preserved
agrex.updateNode('t1', {
  status: 'done',
  metadata: { endedAt: Date.now(), tokens: 1500, cost: 0.003 },
})
```

## Node collapsing

Click any `agent` or `sub_agent` to collapse/expand children. Use `collapseAll()` / `expandAll()` for bulk operations.

## JSON import/export

```tsx
const data = ref.current?.toJSON()
agrex.loadJSON(data)
```

## Recording traces from your agent

Instrument your agent code with `createTracer()` to produce a file the [hosted viewer](https://agrex.ppazosp.dev) (or a local `<Agrex replay>`) can play back. Events are timestamped for you.

```ts
import { createTracer } from '@ppazosp/agrex/trace'
import { writeFileSync } from 'node:fs'

const trace = createTracer()

trace.agent('root', 'Researcher', { metadata: { input: query } })
trace.stage('Search phase')

const hits = await trace.span({ id: 's1', label: 'web_search', parent: 'root' }, () => search(query))

trace.done('root', { output: summary })

writeFileSync('run.jsonl', trace.toJSONL())
```

Drop `run.jsonl` on [agrex.ppazosp.dev](https://agrex.ppazosp.dev) to scrub through the run.

### Streaming for long runs

Pipe events to a file instead of buffering — good for agents that run for hours.

```ts
import { createWriteStream } from 'node:fs'

const trace = createTracer({
  out: createWriteStream('run.jsonl'),
  buffer: false,
})

// … emit events as the agent runs …

trace.close()
```

See [`docs/trace-format.md`](https://github.com/ppazosp/agrex/blob/main/docs/trace-format.md) for the full tracer API and event reference.

## Keyboard shortcuts

| Key       | Action      |
| --------- | ----------- |
| `+` / `=` | Zoom in     |
| `-`       | Zoom out    |
| `0`       | Fit to view |

## Layout engines

Agrex uses a built-in radial layout optimized for streaming — nodes are positioned incrementally as they arrive without repositioning existing ones.

Alternative layout engines are available as standalone imports for static or batch scenarios (e.g., JSON import, post-hoc repositioning):

```tsx
import { forceLayout } from '@ppazosp/agrex/layout/force' // requires d3-force
import { dagreLayout } from '@ppazosp/agrex/layout/dagre' // requires @dagrejs/dagre
```

Install only the layout deps you need:

```bash
npm install d3-force          # for forceLayout
npm install @dagrejs/dagre    # for dagreLayout
```

## Mocks

```tsx
import { createMockPipeline, replay } from '@ppazosp/agrex/mocks'

const scenario = createMockPipeline('multi-agent')
const controller = replay(agrex, scenario, { speed: 2 })

controller.pause()
controller.resume()
controller.setSpeed(4)
controller.cancel()
```

Scenarios: `research-agent`, `multi-agent`, `deep-chain`.

## Next.js

The package includes `"use client"`. For dynamic import:

```tsx
const Agrex = dynamic(() => import('agrex').then((m) => m.Agrex), { ssr: false })
```

## License

MIT
