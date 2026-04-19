# Changelog

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
