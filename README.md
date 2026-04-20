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
  <a href="https://agrex.ppazosp.dev"><b>→ agrex.ppazosp.dev</b></a> — drop a JSON/JSONL trace, scrub through the agent execution. No setup, no backend.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/ppazosp/agrex/main/.github/example.png" alt="agrex in action" width="700">
</p>

---

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

See [full documentation](packages/agrex/README.md) for props, theming, framework integrations (Vercel AI SDK, Anthropic SDK, OpenAI SDK, LangChain), layout engines, and more.

## License

MIT
