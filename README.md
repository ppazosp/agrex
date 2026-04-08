# agrex

React component for visualizing AI agent execution as interactive graphs.

## Install

```bash
npm install agrex @xyflow/react
```

## Quick Start

```tsx
import { Agrex, useAgrex } from 'agrex'
import 'agrex/styles.css'

function App() {
  const agrex = useAgrex()

  useEffect(() => {
    agent.on('tool:call', (e) => {
      agrex.addNode({ id: e.id, type: 'tool', label: e.name, parentId: e.agentId, status: 'running' })
    })
    agent.on('tool:done', (e) => {
      agrex.updateNode(e.id, { status: 'done' })
    })
  }, [])

  return <Agrex instance={agrex} />
}
```

Edges are auto-generated from `parentId`, `reads`, and `writes`. No manual edge wiring needed.

See [packages/agrex/README.md](packages/agrex/README.md) for full docs, props, and framework integration examples (Vercel AI SDK, Anthropic SDK, OpenAI SDK, LangChain).

## License

MIT
