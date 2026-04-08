# agrex

React component for visualizing AI agent execution as interactive graphs.

## Install

```bash
npm install @ppazosp/agrex @xyflow/react
```

## Quick Start

```tsx
import { Agrex, useAgrex } from '@ppazosp/agrex'
import '@ppazosp/agrex/styles.css'

function App() {
  const agrex = useAgrex()

  useEffect(() => {
    const onCall = (e) => {
      agrex.addNode({ id: e.id, type: 'tool', label: e.name, parentId: e.agentId, status: 'running' })
    }
    const onDone = (e) => {
      agrex.updateNode(e.id, { status: 'done' })
    }
    agent.on('tool:call', onCall)
    agent.on('tool:done', onDone)
    return () => {
      agent.off('tool:call', onCall)
      agent.off('tool:done', onDone)
    }
  }, [])

  return <Agrex instance={agrex} />
}
```

Edges are auto-generated from `parentId`, `reads`, and `writes`. No manual edge wiring needed.

See [packages/agrex/README.md](packages/agrex/README.md) for full docs, props, and framework integration examples (Vercel AI SDK, Anthropic SDK, OpenAI SDK, LangChain).

## License

MIT
