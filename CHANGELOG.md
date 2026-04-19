# Changelog

## 0.3.2

- **`<AgrexTimeline>` renders correctly as a sibling of `<Agrex>`.** The `--agrex-*` CSS variables are scoped to the Agrex root's subtree, so mounting the timeline outside that subtree (the standalone-export usage the 0.2.0 changelog explicitly advertised) lost its background, border, and colors. Two fixes: every `var()` now carries a dark-theme fallback, so a standalone timeline looks right out of the box; and a new `theme?: Theme` prop lets consumers apply an explicit theme (same shape as `<Agrex>`'s theme), which sets the CSS vars on the timeline's own root.

## 0.3.1

- **Truly deterministic radial layout.** `placeRoot` anchored at the centroid of already-placed nodes, and `placeChild` offset siblings by a runtime `siblingIndex` count — both made position history-dependent. A replay that scrubs back and re-plays would prune positions and re-place roots against a different centroid, landing nodes in new absolute coordinates. Both now derive their anchors from id-hash angles alone: roots use a fixed-origin circle, children offset by `angleFromId(child.id)` rather than a live sibling count. Same graph, same positions, every time — regardless of arrival order or the state of the position cache.

## 0.3.0

Fixes three issues surfaced while dog-fooding the 0.2.0 replay engine.

- **Incremental forward reduction.** `useAgrexReplay` used to clear the store and replay the entire prefix on every cursor change — during playback that meant each tick triggered a full rebuild, causing downstream layout caches (per-node positions) to see nodes disappear and reappear and re-solve layout from scratch. That's what made nodes drift to new positions after scrub-back + play. Forward motion (live appends, step, play, seek forward) now applies only the new events via the new `applyEventRange` primitive. Backward motion and event-log replacement still clear-and-rebuild.
- **Panel chrome matches other agrex surfaces.** `<AgrexTimeline>` now uses the same background mix (80% `--agrex-bg`), blur (16px), border (`--agrex-node-border`), and radius as `<Legend>` / `<DetailPanel>` / `<ToastStack>`. Drops the stray box-shadow.
- **Stage chapter track.** When `jumpMarkerKind` is set, the timeline renders a labeled segment strip above the scrub slider — each marker of that kind becomes a chapter bar with its label. Click a chapter to seek to its start; the current chapter is highlighted. Non-jump markers still render as colored ticks on the scrub line.
- New export: `applyEventRange(store, events, from, to, reducers)` — the incremental primitive, for consumers who want to own the reduction loop.

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
