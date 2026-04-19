# Changelog

## 0.2.0

Event-replay is now a first-class feature — agrex ships "graph viz + execution tracking" instead of just a renderer.

- **`useAgrexReplay(options)`** — new hook. Owns an internal `useAgrex` store and keeps it in sync with `events[0..cursor]`. Live streaming (`appendLive`), saved runs (`load`), scrub/step/play, speed control, markers, and mode machine (`idle | live | live-finished | replay`) in one surface. Graph state becomes a pure projection of the event prefix — no more dual-source (live reducer + scrub reducer).
- **`<AgrexTimeline replay={...} />`** — new floating timeline component. Play/pause, step forward/back, scrubber with markers, speed selector, live/exit buttons, collapsible tab with localStorage persistence. Styled via agrex theme tokens; zero icon deps (inline SVGs). Rendered automatically by `<Agrex>` when `replay` is passed (`showTimeline={false}` to opt out, `timelinePlacement` / `timelineInsets` / `timelineProps` to customize).
- **Built-in event reducers** for 6 canonical mutation types: `node_add`, `node_update`, `node_remove`, `edge_add`, `edge_remove`, `clear`. Flat payload shape (`{type, id, status, ...}`) to match how most emitters already serialize. Consumers register extra reducers via `reducers: { stage_change: ... }`; `markerExtractor` and `stepBoundaries` are fully pluggable.
- **New exports**: the UI pieces embedded in `<Agrex>` are now importable standalone — `Graph`, `Legend`, `DetailPanel`, `StatsBar`, `ToastStack`, `Controls`, `AgrexErrorBoundary` — for consumers who want to assemble their own layout.
- `AgrexProps.instance` is still supported; when both `instance` and `replay` are passed, `instance` wins (covers the rare case of driving the graph from a non-replay store while still rendering a timeline).

## 0.1.15

- Deterministic layout: `placeRoot` now picks its angle from a hash of the node id instead of `Math.random()`, so replays of a recorded event stream reproduce the exact same node positions as the original live run.

## 0.1.8

- Fix: custom `nodeRenderers` now actually receive `{ node, status, theme }` (the `AgrexNodeProps` contract). Previously they were registered straight into React Flow and called with `NodeProps` (`{ data, id, ... }`), so `node.metadata` threw on first render despite a clean TypeScript signature.
- Internal: user renderers are now wrapped in an adapter (`AgrexRendererAdapter`) that reconstructs the `AgrexNode` and invokes the user component with the advertised props.
- Added Graph tests covering the contract, including the `status: 'idle'` default.

## 0.1.7

- Crop example screenshot

## 0.1.6

- Custom logo and example screenshot in README
- Badge row (npm version, license, downloads, bundle size)

## 0.1.5

- `updateNode` now shallow-merges metadata instead of replacing it
- README documents merge behavior and updated timing/cost example

## 0.1.4

- Disconnected root nodes placed on a random-angle circle around centroid instead of fixed-stride offset
- Collision push-out loop with iteration cap (200) prevents overlap and infinite loops
- Extracted `placeRoot` / `placeChild` from old `placeNode` in radial layout
- Graph.tsx delegates all placement to `radialLayout` (no duplicated logic)
- 5 new layout tests: basic placement, distance guarantee, centroid, loop termination, multi-root
- 2 new store tests: metadata merge, conflicting key overwrite

## 0.1.3

- Upgrade npm in CI for trusted publishing OIDC support

## 0.1.2

- Test trusted publishing

## 0.1.1

- Use npm publish for OIDC trusted publishing compatibility
- Rename package to `@ppazosp/agrex`

## 0.1.0

Initial release.

- Real-time graph visualization for AI agent execution flows
- Built on React Flow v12
- Node types: agent, sub_agent, tool, file, custom
- Auto-edge derivation from `parentId`, `reads`, `writes`
- Streaming mode via `useAgrex` hook
- Layout engines: radial (built-in), force (d3-force), dagre
- Dark/light/auto themes with CSS custom properties
- Node collapsing with descendant status badges
- Detail panel, stats bar, toast notifications, keyboard shortcuts
- Error boundary with recovery via `resetKey`
- SSR-compatible (`useSyncExternalStore` with server snapshot)
- Mock scenarios and time-based replay for development
- Subpath exports: `agrex/mocks`, `agrex/layout/force`, `agrex/layout/dagre`
