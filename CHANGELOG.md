# Changelog

## 0.4.2

- **Stats panel folded into the timeline.** New `<AgrexTimeline showStats>` prop renders a stats row (nodes, running, done, errors, time, tokens, cost) _inside_ the timeline panel, above the transport row. Values are computed from `replay.instance.nodes`, so they update as the cursor moves (scrub back and counts/tokens/time shrink; live forward and they grow). Row uses `justify-content: space-between` so the cells stretch across the full panel width.
- **`showStats` defaults to true** on `<Agrex>` now that stats has a clean home in the timeline.
- **Time stat in `m:ss`.** `time` shows wall-clock from earliest `startedAt` to latest `endedAt` across rendered nodes. Playground `scenarioToEvents` now emits `startedAt` on `node_add` so demos have real time data.
- **`<AgrexTimeline>` measures its own height** via `ResizeObserver` and uses the measured value to position the collapse tab. Previously the tab relied on a `PANEL_HEIGHT` constant that drifted from the actual rendered height (e.g. 74.5px vs 76), leaving a 0.5-7.5px gap. Now the tab sits pixel-flush with the panel's top edge regardless of stats/content changes. Collapse transform still uses the constant (only needs to be ≥ actual height for clean slide-off).
- **`<StatsBar>`** accepts `bottomOffset` so consumers (or the auto-wiring inside `<Agrex>`) can lift it above a visible timeline. Only rendered when no timeline is present; the timeline's inline stats take over otherwise.

## 0.4.1

- **Stages live on the scrub track.** The separate chapter strip above the scrub bar is gone; stage markers are now vertical pill sentinels on the track itself, and the track rail is segmented and tinted per-stage (past / active / future distinct). Native `title` tooltip shows the stage name, hover expands the sentinel with a subtle scale, click seeks to the stage start. `jumpMarkerKind` still drives everything — only the rendering changed.
- **Compacter control bar.** `PANEL_WIDTH` dropped from 820 → 640 so the timeline no longer overlaps right-edge panels (`<Legend>`'s collapse tab, future overlays). Transport buttons (skip / step / play) are grouped in their own tight `gap: 2` flex row so they sit close together instead of floating evenly across the bar.
- **`PANEL_HEIGHT` lowered to 50.** Matches the now-shorter single-row panel (chapter strip gone).
- **Collapse tab flush to the viewport edge when the timeline is collapsed.** Instead of floating 16px above the bottom, the tab sticks to the edge (`bottom: 0`) so it reads as a drawer handle.

## 0.4.0

- **`<NodeTooltip>` — click-driven node inspector.** New right-docked panel that replaces the bottom-left `<DetailPanel>` on node click. Surfaces the dedicated fields consumers care about — status, elapsed time, tokens, cost, args, input, output, error — with args/input/output rendered as scrollable pretty-JSON blocks. Closes on × button, clicking another node (jumps), or clicking empty canvas. `<DetailPanel>` stays exported for consumers still using the old surface.
- **Click-to-collapse moved to the child-count badge.** Clicking the node body used to toggle collapse on `agent`/`sub_agent` nodes; now the body click opens `<NodeTooltip>` and the circular count badge is the dedicated collapse target (with `cursor: pointer`, `aria-label`, and stop-propagation). Disambiguates inspect vs. collapse without a modifier key.
- **`<Legend>` ↔ `<NodeTooltip>` cross-transition.** When the tooltip opens, the legend slides off-screen to the right and its collapse tab fades; when the tooltip closes, the legend slides back in. Both use matching `cubic-bezier(0.23, 1, 0.32, 1)` at 250ms. New `<Legend>` prop: `forceCollapsed?: boolean` — lets the parent drive the collapsed state from outside (independently of the internal user-toggle).
- **Enriched mock scenarios.** `createMockPipeline` now ships realistic `tokens`, `cost`, `args`, `input`, and `output` metadata on every node across all three scenarios — so `<NodeTooltip>` renders meaningful content out of the box in demos and tests.
- **Timeline collapse-tab sits flush.** `PANEL_HEIGHT` lowered from 76 to 72 (matches actual rendered height with stage chapters) so the tab docks against the panel's top edge instead of floating 16px above it.

## 0.3.3

- **`<AgrexTimeline>` chrome polish.** Play button now renders flat like the other transport buttons instead of an inverted accent pill. Stage chapter segments are stitched (no gap) with pill-rounded outer edges only — the track reads as a single chapter bar rather than a row of separate pills. Speed selector and elapsed-time display drop the hard-coded mono font in favor of `var(--agrex-font)` so they inherit the consumer's typography.

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
