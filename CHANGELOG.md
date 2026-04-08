# Changelog

## 0.1.0

Initial release.

- Real-time graph visualization for AI agent execution flows
- Built on React Flow v12
- Node types: agent, sub_agent, tool, file, custom
- Auto-edge derivation from `parentId`, `reads`, `writes`
- Streaming mode via `useAgrex` hook
- Layout engines: radial (built-in), force (d3-force), dagre, ELK (async)
- Dark/light/auto themes with CSS custom properties
- Node collapsing with descendant status badges
- Detail panel, stats bar, toast notifications, keyboard shortcuts
- Error boundary with recovery via `resetKey`
- SSR-compatible (`useSyncExternalStore` with server snapshot)
- Mock scenarios and time-based replay for development
- Subpath exports: `agrex/mocks`, `agrex/layout/force`, `agrex/layout/dagre`, `agrex/layout/elk`
