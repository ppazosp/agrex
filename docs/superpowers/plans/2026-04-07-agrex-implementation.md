# agrex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `agrex`, an npm package that renders AI agent execution as interactive graphs.

**Architecture:** Monorepo with pnpm workspaces. Core package (`agrex`) contains the React component, node types, layout algorithms, hooks, theming, and mock system. Adapters (`agrex-adapter-otel`) are separate packages. A dev playground (unpublished) for visual iteration.

**Tech Stack:** React 19, TypeScript, React Flow (`@xyflow/react` v12), Tailwind CSS v4, tsup (build), Vitest (tests), Vite (playground), pnpm workspaces.

---

## File Structure

```
~/projects/agrex/
├── package.json                           # root workspace config + scripts
├── pnpm-workspace.yaml                    # workspace definition
├── tsconfig.base.json                     # shared TS config
├── .gitignore
├── README.md
├── packages/
│   ├── agrex/                             # npm: agrex
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── src/
│   │   │   ├── index.ts                   # public exports
│   │   │   ├── types.ts                   # AgrexNode, AgrexEdge, ThemeObject, etc.
│   │   │   ├── theme/
│   │   │   │   ├── tokens.ts              # CSS custom property definitions
│   │   │   │   ├── dark.ts                # dark theme preset
│   │   │   │   ├── light.ts               # light theme preset
│   │   │   │   └── types.ts              # ThemeObject type (re-exported from types.ts)
│   │   │   ├── layout/
│   │   │   │   ├── radial.ts              # golden-angle radial placement
│   │   │   │   └── types.ts              # LayoutFn type
│   │   │   ├── hooks/
│   │   │   │   └── useAgrex.ts            # streaming state manager
│   │   │   ├── nodes/
│   │   │   │   ├── AgentNode.tsx           # rounded rect, configurable avatar
│   │   │   │   ├── ToolNode.tsx            # circle, icon
│   │   │   │   ├── FileNode.tsx            # diamond SVG
│   │   │   │   ├── OutputNode.tsx          # hexagon SVG
│   │   │   │   ├── SearchNode.tsx          # small circle, search icon
│   │   │   │   ├── DefaultNode.tsx         # fallback for custom types
│   │   │   │   ├── NodeHandles.tsx         # invisible center handles
│   │   │   │   ├── NodeTooltip.tsx         # hover tooltip wrapper
│   │   │   │   └── index.ts               # barrel export
│   │   │   ├── edges/
│   │   │   │   └── AgrexEdge.tsx           # color-coded straight edge
│   │   │   ├── components/
│   │   │   │   ├── Agrex.tsx               # main public component
│   │   │   │   ├── Graph.tsx               # React Flow wrapper + layout engine
│   │   │   │   ├── Controls.tsx            # zoom in/out/fit bar
│   │   │   │   ├── Legend.tsx              # collapsible legend panel
│   │   │   │   ├── DetailPanel.tsx         # node-click inspector
│   │   │   │   └── Toast.tsx              # node-add notification
│   │   │   ├── styles/
│   │   │   │   └── agrex.css              # keyframes, RF overrides, node animations
│   │   │   └── mocks/                     # subpath: agrex/mocks
│   │   │       ├── index.ts
│   │   │       ├── generators.ts          # createMockNode, createMockEdge
│   │   │       ├── scenarios.ts           # pre-built pipelines
│   │   │       └── replay.ts             # replay(instance, scenario, opts)
│   │   └── tests/
│   │       ├── types.test.ts
│   │       ├── layout.test.ts
│   │       ├── useAgrex.test.ts
│   │       ├── mocks.test.ts
│   │       └── components.test.tsx
│   ├── agrex-adapter-otel/                # npm: agrex-adapter-otel
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── transform.ts              # OTel spans → AgrexNode/Edge
│   │   └── tests/
│   │       └── transform.test.ts
│   └── playground/                        # NOT published
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx                    # scenario picker, prop toggles
│           └── index.css                  # Tailwind import + app styles
```

---

### Task 1: Monorepo Scaffolding

**Files:**
- Create: `~/projects/agrex/package.json`
- Create: `~/projects/agrex/pnpm-workspace.yaml`
- Create: `~/projects/agrex/tsconfig.base.json`
- Create: `~/projects/agrex/.gitignore`
- Create: `~/projects/agrex/packages/agrex/package.json`
- Create: `~/projects/agrex/packages/agrex/tsconfig.json`
- Create: `~/projects/agrex/packages/agrex/tsup.config.ts`
- Create: `~/projects/agrex/packages/playground/package.json`
- Create: `~/projects/agrex/packages/playground/tsconfig.json`
- Create: `~/projects/agrex/packages/playground/vite.config.ts`
- Create: `~/projects/agrex/packages/playground/index.html`

- [ ] **Step 1: Initialize git repo**

```bash
cd ~/projects/agrex && git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "agrex-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter playground dev",
    "build": "pnpm --filter agrex build",
    "test": "pnpm --filter agrex test",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.turbo/
*.tsbuildinfo
.DS_Store
```

- [ ] **Step 6: Create packages/agrex/package.json**

```json
{
  "name": "agrex",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./mocks": {
      "import": "./dist/mocks/index.js",
      "types": "./dist/mocks/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "@xyflow/react": ">=12"
  },
  "dependencies": {
    "lucide-react": "^0.475.0"
  },
  "devDependencies": {
    "@xyflow/react": "^12.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tsup": "^8.0.0",
    "vitest": "^2.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 7: Create packages/agrex/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 8: Create packages/agrex/tsup.config.ts**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'mocks/index': 'src/mocks/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@xyflow/react'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
```

- [ ] **Step 9: Create packages/playground/package.json**

```json
{
  "name": "playground",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "agrex": "workspace:*",
    "@xyflow/react": "^12.6.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.7.0",
    "vite": "^6.2.0"
  }
}
```

- [ ] **Step 10: Create packages/playground/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 11: Create packages/playground/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 12: Create packages/playground/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>agrex playground</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 13: Install dependencies**

```bash
cd ~/projects/agrex && pnpm install
```

- [ ] **Step 14: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: scaffold monorepo with core package and playground"
```

---

### Task 2: Types & Theme System

**Files:**
- Create: `packages/agrex/src/types.ts`
- Create: `packages/agrex/src/theme/types.ts`
- Create: `packages/agrex/src/theme/dark.ts`
- Create: `packages/agrex/src/theme/light.ts`
- Create: `packages/agrex/src/theme/tokens.ts`
- Create: `packages/agrex/src/styles/agrex.css`
- Test: `packages/agrex/tests/types.test.ts`

- [ ] **Step 1: Write type tests**

```typescript
// packages/agrex/tests/types.test.ts
import { describe, it, expect } from 'vitest'
import type { AgrexNode, AgrexEdge, ThemeObject } from '../src/types'

describe('AgrexNode', () => {
  it('accepts built-in types', () => {
    const node: AgrexNode = {
      id: '1',
      type: 'agent',
      label: 'Researcher',
    }
    expect(node.type).toBe('agent')
  })

  it('accepts custom type strings', () => {
    const node: AgrexNode = {
      id: '2',
      type: 'my_custom_type',
      label: 'Custom',
    }
    expect(node.type).toBe('my_custom_type')
  })

  it('accepts optional fields', () => {
    const node: AgrexNode = {
      id: '3',
      type: 'tool',
      label: 'Search',
      parentId: '1',
      status: 'running',
      metadata: { query: 'hello', results: ['a', 'b'] },
    }
    expect(node.status).toBe('running')
    expect(node.parentId).toBe('1')
    expect(node.metadata?.query).toBe('hello')
  })

  it('defaults status to idle when not set', () => {
    const node: AgrexNode = { id: '4', type: 'agent', label: 'Test' }
    expect(node.status).toBeUndefined()
  })
})

describe('AgrexEdge', () => {
  it('accepts built-in types', () => {
    const edge: AgrexEdge = {
      id: 'e1',
      source: '1',
      target: '2',
      type: 'spawn',
    }
    expect(edge.type).toBe('spawn')
  })

  it('accepts custom type strings', () => {
    const edge: AgrexEdge = {
      id: 'e2',
      source: '1',
      target: '2',
      type: 'data_flow',
    }
    expect(edge.type).toBe('data_flow')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/projects/agrex && pnpm --filter agrex test -- tests/types.test.ts
```

Expected: FAIL — `../src/types` not found.

- [ ] **Step 3: Create vitest config**

```typescript
// packages/agrex/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Create types.ts**

```typescript
// packages/agrex/src/types.ts

/** A node in the agent execution graph. */
export interface AgrexNode {
  /** Unique identifier */
  id: string
  /** Node type — built-in types get default rendering; custom strings use DefaultNode */
  type: 'agent' | 'sub_agent' | 'tool' | 'file' | 'output' | 'search' | (string & {})
  /** Display label */
  label: string
  /** Parent node ID — drives radial layout (child orbits parent) */
  parentId?: string
  /** Node status — drives border color and animations */
  status?: 'idle' | 'running' | 'done' | 'error'
  /** Arbitrary metadata — rendered in detail panel as key-value pairs */
  metadata?: Record<string, unknown>
}

/** An edge connecting two nodes. */
export interface AgrexEdge {
  /** Unique identifier */
  id: string
  /** Source node ID */
  source: string
  /** Target node ID */
  target: string
  /** Edge type — built-in types get default colors; custom strings use fallback gray */
  type?: 'spawn' | 'read' | 'write' | (string & {})
}

/** Node status type */
export type NodeStatus = 'idle' | 'running' | 'done' | 'error'

/** Theme customization object */
export interface ThemeObject {
  /** Graph background color */
  background?: string
  /** Primary text color */
  foreground?: string
  /** Accent color for interactive elements */
  accent?: string
  /** Node fill color */
  nodeFill?: string
  /** Node border color (idle state) */
  nodeBorder?: string
  /** Node icon color */
  nodeIcon?: string
  /** Default edge color */
  edgeDefault?: string
  /** Edge color for 'spawn' type */
  edgeSpawn?: string
  /** Edge color for 'write' type */
  edgeWrite?: string
  /** Edge color for 'read' type */
  edgeRead?: string
  /** Running status color (amber) */
  statusRunning?: string
  /** Done status color (green) */
  statusDone?: string
  /** Error status color (red) */
  statusError?: string
  /** Font family */
  fontFamily?: string
  /** Mono font family (for metadata) */
  fontMono?: string
  /** Animation duration — set to '0s' to disable all animations */
  animationDuration?: string
}

/** Theme preset name or custom object */
export type Theme = 'dark' | 'light' | ThemeObject

/** Layout function signature for custom layouts */
export type LayoutFn = (
  nodes: AgrexNode[],
  edges: AgrexEdge[],
  positions: Map<string, { x: number; y: number }>,
) => Map<string, { x: number; y: number }>

/** Layout preset name or custom function */
export type Layout = 'radial' | LayoutFn

/** Props for the main Agrex component */
export interface AgrexProps {
  /** Static mode: node array */
  nodes?: AgrexNode[]
  /** Static mode: edge array */
  edges?: AgrexEdge[]
  /** Streaming mode: instance from useAgrex() */
  instance?: UseAgrexReturn
  /** Node click callback */
  onNodeClick?: (node: AgrexNode) => void
  /** Theme: preset name or custom object */
  theme?: Theme
  /** Layout algorithm: 'radial' or custom function */
  layout?: Layout
  /** Custom React node renderers per type */
  nodeRenderers?: Record<string, React.ComponentType<AgrexNodeProps>>
  /** Custom icons per node type (used by built-in renderers) */
  nodeIcons?: Record<string, React.ComponentType<{ size: number }>>
  /** Override edge colors per type */
  edgeColors?: Record<string, string>
  /** Show viewport controls bar */
  showControls?: boolean
  /** Show legend panel */
  showLegend?: boolean
  /** Show node-add toast notifications */
  showToasts?: boolean
  /** Show node-click detail panel */
  showDetailPanel?: boolean
  /** Auto-fit viewport when graph changes */
  fitOnUpdate?: boolean
}

/** Props passed to custom node renderers */
export interface AgrexNodeProps {
  node: AgrexNode
  status: NodeStatus
  theme: ResolvedTheme
}

/** Resolved theme with all values filled in */
export interface ResolvedTheme {
  background: string
  foreground: string
  accent: string
  nodeFill: string
  nodeBorder: string
  nodeIcon: string
  edgeDefault: string
  edgeSpawn: string
  edgeWrite: string
  edgeRead: string
  statusRunning: string
  statusDone: string
  statusError: string
  fontFamily: string
  fontMono: string
  animationDuration: string
}

/** Return type of useAgrex hook */
export interface UseAgrexReturn {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
  addNode: (node: AgrexNode) => void
  addNodes: (nodes: AgrexNode[]) => void
  updateNode: (id: string, updates: Partial<Pick<AgrexNode, 'status' | 'label' | 'metadata'>>) => void
  removeNode: (id: string) => void
  addEdge: (edge: AgrexEdge) => void
  addEdges: (edges: AgrexEdge[]) => void
  removeEdge: (id: string) => void
  clear: () => void
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd ~/projects/agrex && pnpm --filter agrex test -- tests/types.test.ts
```

Expected: PASS

- [ ] **Step 6: Create theme types and presets**

```typescript
// packages/agrex/src/theme/types.ts
export type { ThemeObject, ResolvedTheme, Theme } from '../types'
```

```typescript
// packages/agrex/src/theme/dark.ts
import type { ResolvedTheme } from '../types'

export const darkTheme: ResolvedTheme = {
  background: '#000000',
  foreground: '#ffffff',
  accent: '#4a9eff',
  nodeFill: '#0d0d0d',
  nodeBorder: 'rgba(255,255,255,0.15)',
  nodeIcon: 'rgba(255,255,255,0.7)',
  edgeDefault: 'rgba(255,255,255,0.35)',
  edgeSpawn: 'rgba(255,255,255,0.35)',
  edgeWrite: 'rgba(251,191,36,0.35)',
  edgeRead: 'rgba(56,189,248,0.35)',
  statusRunning: '#f59e0b',
  statusDone: '#22c55e',
  statusError: '#ef4444',
  fontFamily: 'system-ui, sans-serif',
  fontMono: "'SF Mono', 'Monaco', monospace",
  animationDuration: '1.5s',
}
```

```typescript
// packages/agrex/src/theme/light.ts
import type { ResolvedTheme } from '../types'

export const lightTheme: ResolvedTheme = {
  background: '#ffffff',
  foreground: '#111111',
  accent: '#2563eb',
  nodeFill: '#f8f8f8',
  nodeBorder: 'rgba(0,0,0,0.15)',
  nodeIcon: 'rgba(0,0,0,0.6)',
  edgeDefault: 'rgba(0,0,0,0.25)',
  edgeSpawn: 'rgba(0,0,0,0.25)',
  edgeWrite: 'rgba(217,119,6,0.5)',
  edgeRead: 'rgba(14,116,144,0.5)',
  statusRunning: '#d97706',
  statusDone: '#16a34a',
  statusError: '#dc2626',
  fontFamily: 'system-ui, sans-serif',
  fontMono: "'SF Mono', 'Monaco', monospace",
  animationDuration: '1.5s',
}
```

```typescript
// packages/agrex/src/theme/tokens.ts
import type { ResolvedTheme, Theme, ThemeObject } from '../types'
import { darkTheme } from './dark'
import { lightTheme } from './light'

export function resolveTheme(theme: Theme | undefined): ResolvedTheme {
  if (!theme || theme === 'dark') return darkTheme
  if (theme === 'light') return lightTheme

  // Merge custom overrides onto dark base
  return { ...darkTheme, ...theme }
}

/** Injects theme as CSS custom properties on a container element */
export function themeToCSS(theme: ResolvedTheme): Record<string, string> {
  return {
    '--agrex-bg': theme.background,
    '--agrex-fg': theme.foreground,
    '--agrex-accent': theme.accent,
    '--agrex-node-fill': theme.nodeFill,
    '--agrex-node-border': theme.nodeBorder,
    '--agrex-node-icon': theme.nodeIcon,
    '--agrex-edge-default': theme.edgeDefault,
    '--agrex-edge-spawn': theme.edgeSpawn,
    '--agrex-edge-write': theme.edgeWrite,
    '--agrex-edge-read': theme.edgeRead,
    '--agrex-status-running': theme.statusRunning,
    '--agrex-status-done': theme.statusDone,
    '--agrex-status-error': theme.statusError,
    '--agrex-font': theme.fontFamily,
    '--agrex-font-mono': theme.fontMono,
    '--agrex-anim-duration': theme.animationDuration,
  }
}
```

- [ ] **Step 7: Create agrex.css — keyframes and React Flow overrides**

```css
/* packages/agrex/src/styles/agrex.css */

/* Kill React Flow default node styling */
.agrex .react-flow__node {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* Node entrance — fade in */
.agrex .react-flow__node {
  animation: agrex-node-fade var(--agrex-anim-duration, 1.5s) cubic-bezier(0.23, 1, 0.32, 1) both;
  animation-duration: 0.5s;
}

@keyframes agrex-node-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Node entrance — scale pop on inner content */
.agrex .react-flow__node > div {
  animation: agrex-node-pop 0.5s cubic-bezier(0.23, 1, 0.32, 1) both;
}

@keyframes agrex-node-pop {
  from  { transform: scale(0.5); }
  60%   { transform: scale(1.06); }
  to    { transform: scale(1); }
}

/* Running status — box-shadow glow pulse (for rectangular/circular nodes) */
@keyframes agrex-running-ring {
  0%, 100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--agrex-status-running) 40%, transparent);
  }
  50% {
    box-shadow: 0 0 14px 4px color-mix(in srgb, var(--agrex-status-running) 60%, transparent);
  }
}

/* Running status — drop-shadow variant for SVG shapes (diamond, hexagon) */
@keyframes agrex-running-drop {
  0%, 100% {
    filter: drop-shadow(0 0 0 color-mix(in srgb, var(--agrex-status-running) 40%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--agrex-status-running) 60%, transparent));
  }
}

/* Toast slide-in */
@keyframes agrex-slide-in {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

/* Collapsible section (grid-template-rows trick) */
.agrex-collapse {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.agrex-collapse[data-collapsed="true"] {
  grid-template-rows: 0fr;
}

.agrex-collapse > div {
  overflow: hidden;
}
```

- [ ] **Step 8: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: add types, theme system, and CSS keyframes"
```

---

### Task 3: Layout Algorithm

**Files:**
- Create: `packages/agrex/src/layout/types.ts`
- Create: `packages/agrex/src/layout/radial.ts`
- Test: `packages/agrex/tests/layout.test.ts`

- [ ] **Step 1: Write layout tests**

```typescript
// packages/agrex/tests/layout.test.ts
import { describe, it, expect } from 'vitest'
import { radialLayout } from '../src/layout/radial'
import type { AgrexNode, AgrexEdge } from '../src/types'

function node(id: string, parentId?: string): AgrexNode {
  return { id, type: 'agent', label: id, parentId }
}

describe('radialLayout', () => {
  it('places root at origin', () => {
    const nodes = [node('root')]
    const positions = new Map<string, { x: number; y: number }>()
    const result = radialLayout(nodes, [], positions)
    expect(result.get('root')).toEqual({ x: 0, y: 0 })
  })

  it('places child further from origin than parent', () => {
    const nodes = [node('root'), node('child', 'root')]
    const positions = new Map<string, { x: number; y: number }>()
    const result = radialLayout(nodes, [], positions)

    const root = result.get('root')!
    const child = result.get('child')!
    const rootDist = Math.hypot(root.x, root.y)
    const childDist = Math.hypot(child.x, child.y)
    expect(childDist).toBeGreaterThan(rootDist)
  })

  it('does not overlap nodes (minimum distance)', () => {
    const nodes = [
      node('root'),
      node('a', 'root'),
      node('b', 'root'),
      node('c', 'root'),
      node('d', 'root'),
      node('e', 'root'),
    ]
    const positions = new Map<string, { x: number; y: number }>()
    const result = radialLayout(nodes, [], positions)

    const MIN_DIST = 100
    const entries = [...result.entries()]
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [, a] = entries[i]
        const [, b] = entries[j]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        expect(dist).toBeGreaterThanOrEqual(MIN_DIST - 1) // 1px tolerance for float
      }
    }
  })

  it('preserves existing positions (incremental)', () => {
    const existing = new Map([['root', { x: 0, y: 0 }]])
    const nodes = [node('root'), node('child', 'root')]
    const result = radialLayout(nodes, [], existing)

    // Root position should not change
    expect(result.get('root')).toEqual({ x: 0, y: 0 })
    // Child should be placed
    expect(result.has('child')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/projects/agrex && pnpm --filter agrex test -- tests/layout.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create layout types**

```typescript
// packages/agrex/src/layout/types.ts
export type { LayoutFn } from '../types'
```

- [ ] **Step 4: Implement radial layout**

```typescript
// packages/agrex/src/layout/radial.ts
import type { AgrexNode, AgrexEdge, LayoutFn } from '../types'

const GOLDEN_ANGLE = 2.399963229728653
const BASE_R = 140
const MIN_DIST = 100

function placeNode(
  parentPos: { x: number; y: number } | undefined,
  placed: Map<string, { x: number; y: number }>,
  childIndex: number,
): { x: number; y: number } {
  if (!parentPos) return { x: 0, y: 0 }

  const parentDist = Math.hypot(parentPos.x, parentPos.y)

  for (let ring = 1; ring <= 10; ring++) {
    const r = BASE_R * ring
    const slots = Math.max(6, Math.floor((2 * Math.PI * r) / MIN_DIST))
    for (let s = 0; s < slots; s++) {
      const angle = childIndex * GOLDEN_ANGLE + (s * 2 * Math.PI) / slots
      const x = parentPos.x + r * Math.cos(angle)
      const y = parentPos.y + r * Math.sin(angle)

      if (Math.hypot(x, y) <= parentDist + 20) continue

      let free = true
      for (const [, pos] of placed) {
        if (Math.hypot(pos.x - x, pos.y - y) < MIN_DIST) {
          free = false
          break
        }
      }
      if (free) return { x, y }
    }
  }

  const angle = Math.atan2(parentPos.y || 1, parentPos.x || 1)
  return {
    x: parentPos.x + BASE_R * Math.cos(angle),
    y: parentPos.y + BASE_R * Math.sin(angle),
  }
}

/** Golden-angle radial layout. Children orbit their parent, expanding outward. */
export const radialLayout: LayoutFn = (nodes, edges, existingPositions) => {
  const positions = new Map(existingPositions)
  const childCount = new Map<string, number>()

  // Build parent lookup from parentId
  const parentOf = new Map<string, string>()
  for (const node of nodes) {
    if (node.parentId) {
      parentOf.set(node.id, node.parentId)
    }
  }

  for (const node of nodes) {
    if (positions.has(node.id)) continue

    const pid = parentOf.get(node.id)
    if (pid && !positions.has(pid) && positions.size > 0) continue
    if (!pid && positions.size > 0) continue

    const parentPos = pid ? positions.get(pid) : undefined
    const ci = pid ? (childCount.get(pid) ?? 0) : 0
    if (pid) childCount.set(pid, ci + 1)

    positions.set(node.id, placeNode(parentPos, positions, ci))
  }

  return positions
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd ~/projects/agrex && pnpm --filter agrex test -- tests/layout.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: implement golden-angle radial layout algorithm"
```

---

### Task 4: useAgrex Hook

**Files:**
- Create: `packages/agrex/src/hooks/useAgrex.ts`
- Test: `packages/agrex/tests/useAgrex.test.ts`

- [ ] **Step 1: Write hook tests**

```typescript
// packages/agrex/tests/useAgrex.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgrex } from '../src/hooks/useAgrex'
import type { AgrexNode, AgrexEdge } from '../src/types'

const mockNode = (id: string, parentId?: string): AgrexNode => ({
  id,
  type: 'agent',
  label: `Agent ${id}`,
  parentId,
})

const mockEdge = (source: string, target: string): AgrexEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: 'spawn',
})

describe('useAgrex', () => {
  it('starts with empty nodes and edges', () => {
    const { result } = renderHook(() => useAgrex())
    expect(result.current.nodes).toEqual([])
    expect(result.current.edges).toEqual([])
  })

  it('adds a node', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addNode(mockNode('1')))
    expect(result.current.nodes).toHaveLength(1)
    expect(result.current.nodes[0].id).toBe('1')
  })

  it('adds multiple nodes at once', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addNodes([mockNode('1'), mockNode('2')]))
    expect(result.current.nodes).toHaveLength(2)
  })

  it('updates a node', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addNode(mockNode('1')))
    act(() => result.current.updateNode('1', { status: 'done' }))
    expect(result.current.nodes[0].status).toBe('done')
  })

  it('removes a node', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addNode(mockNode('1')))
    act(() => result.current.removeNode('1'))
    expect(result.current.nodes).toHaveLength(0)
  })

  it('adds an edge', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addEdge(mockEdge('1', '2')))
    expect(result.current.edges).toHaveLength(1)
  })

  it('adds multiple edges at once', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addEdges([mockEdge('1', '2'), mockEdge('2', '3')]))
    expect(result.current.edges).toHaveLength(2)
  })

  it('removes an edge', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => result.current.addEdge(mockEdge('1', '2')))
    act(() => result.current.removeEdge('1-2'))
    expect(result.current.edges).toHaveLength(0)
  })

  it('clears all state', () => {
    const { result } = renderHook(() => useAgrex())
    act(() => {
      result.current.addNode(mockNode('1'))
      result.current.addEdge(mockEdge('1', '2'))
    })
    act(() => result.current.clear())
    expect(result.current.nodes).toHaveLength(0)
    expect(result.current.edges).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/projects/agrex && pnpm --filter agrex test -- tests/useAgrex.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useAgrex**

```typescript
// packages/agrex/src/hooks/useAgrex.ts
import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { AgrexNode, AgrexEdge, UseAgrexReturn } from '../types'

interface State {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
}

function createStore() {
  let state: State = { nodes: [], edges: [] }
  const listeners = new Set<() => void>()

  function emit() {
    listeners.forEach((l) => l())
  }

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    addNode: (node: AgrexNode) => {
      state = { ...state, nodes: [...state.nodes, node] }
      emit()
    },
    addNodes: (nodes: AgrexNode[]) => {
      state = { ...state, nodes: [...state.nodes, ...nodes] }
      emit()
    },
    updateNode: (id: string, updates: Partial<Pick<AgrexNode, 'status' | 'label' | 'metadata'>>) => {
      state = {
        ...state,
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      }
      emit()
    },
    removeNode: (id: string) => {
      state = { ...state, nodes: state.nodes.filter((n) => n.id !== id) }
      emit()
    },
    addEdge: (edge: AgrexEdge) => {
      state = { ...state, edges: [...state.edges, edge] }
      emit()
    },
    addEdges: (edges: AgrexEdge[]) => {
      state = { ...state, edges: [...state.edges, ...edges] }
      emit()
    },
    removeEdge: (id: string) => {
      state = { ...state, edges: state.edges.filter((e) => e.id !== id) }
      emit()
    },
    clear: () => {
      state = { nodes: [], edges: [] }
      emit()
    },
  }
}

export function useAgrex(): UseAgrexReturn {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createStore()
  }
  const store = storeRef.current

  const state = useSyncExternalStore(store.subscribe, store.getState)

  return {
    nodes: state.nodes,
    edges: state.edges,
    addNode: useCallback((node: AgrexNode) => store.addNode(node), [store]),
    addNodes: useCallback((nodes: AgrexNode[]) => store.addNodes(nodes), [store]),
    updateNode: useCallback(
      (id: string, updates: Partial<Pick<AgrexNode, 'status' | 'label' | 'metadata'>>) =>
        store.updateNode(id, updates),
      [store],
    ),
    removeNode: useCallback((id: string) => store.removeNode(id), [store]),
    addEdge: useCallback((edge: AgrexEdge) => store.addEdge(edge), [store]),
    addEdges: useCallback((edges: AgrexEdge[]) => store.addEdges(edges), [store]),
    removeEdge: useCallback((id: string) => store.removeEdge(id), [store]),
    clear: useCallback(() => store.clear(), [store]),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd ~/projects/agrex && pnpm --filter agrex test -- tests/useAgrex.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: implement useAgrex streaming state hook"
```

---

### Task 5: Node Components

**Files:**
- Create: `packages/agrex/src/nodes/NodeHandles.tsx`
- Create: `packages/agrex/src/nodes/NodeTooltip.tsx`
- Create: `packages/agrex/src/nodes/AgentNode.tsx`
- Create: `packages/agrex/src/nodes/ToolNode.tsx`
- Create: `packages/agrex/src/nodes/FileNode.tsx`
- Create: `packages/agrex/src/nodes/OutputNode.tsx`
- Create: `packages/agrex/src/nodes/SearchNode.tsx`
- Create: `packages/agrex/src/nodes/DefaultNode.tsx`
- Create: `packages/agrex/src/nodes/index.ts`

- [ ] **Step 1: Create NodeHandles — invisible center handles for edge connections**

```tsx
// packages/agrex/src/nodes/NodeHandles.tsx
import { Handle, Position } from '@xyflow/react'

const S: React.CSSProperties = {
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: 1,
  height: 1,
  opacity: 0,
  border: 'none',
  background: 'transparent',
  minWidth: 0,
  minHeight: 0,
}

export default function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="center-in" style={S} />
      <Handle type="source" position={Position.Bottom} id="center-out" style={S} />
    </>
  )
}
```

- [ ] **Step 2: Create NodeTooltip**

```tsx
// packages/agrex/src/nodes/NodeTooltip.tsx
import type { ReactNode } from 'react'

export default function NodeTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ position: 'relative' }} className="agrex-tooltip-wrapper">
      {children}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 'calc(100% + 6px)',
          opacity: 0,
          whiteSpace: 'nowrap',
          background: 'var(--agrex-node-fill)',
          border: '1px solid var(--agrex-node-border)',
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: 12,
          color: 'var(--agrex-fg)',
          zIndex: 50,
          transition: 'opacity 150ms',
        }}
        className="agrex-tooltip"
      >
        {label}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create AgentNode — rounded rectangle with configurable content**

```tsx
// packages/agrex/src/nodes/AgentNode.tsx
import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface AgentNodeData {
  label: string
  status: NodeStatus
  icon?: React.ComponentType<{ size: number }>
  [key: string]: unknown
}

type AgentNodeType = Node<AgentNodeData, 'agent'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function AgentNode({ data }: NodeProps<AgentNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'

  return (
    <NodeTooltip label={label}>
      <div
        style={{
          width: 80,
          height: 80,
          border: `2px solid ${border}`,
          borderRadius: 8,
          background: 'var(--agrex-node-fill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <NodeHandles />
        {Icon ? (
          <Icon size={40} />
        ) : (
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--agrex-fg)', opacity: 0.6 }}>
            {label.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </NodeTooltip>
  )
}
```

- [ ] **Step 4: Create SubAgentNode (same as agent but smaller)**

```tsx
// packages/agrex/src/nodes/SubAgentNode.tsx
import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface SubAgentNodeData {
  label: string
  status: NodeStatus
  icon?: React.ComponentType<{ size: number }>
  [key: string]: unknown
}

type SubAgentNodeType = Node<SubAgentNodeData, 'sub_agent'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function SubAgentNode({ data }: NodeProps<SubAgentNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'

  return (
    <NodeTooltip label={label}>
      <div
        style={{
          width: 56,
          height: 56,
          border: `2px solid ${border}`,
          borderRadius: 6,
          background: 'var(--agrex-node-fill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <NodeHandles />
        {Icon ? (
          <Icon size={28} />
        ) : (
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--agrex-fg)', opacity: 0.6 }}>
            {label.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </NodeTooltip>
  )
}
```

- [ ] **Step 5: Create ToolNode — circle with icon**

```tsx
// packages/agrex/src/nodes/ToolNode.tsx
import { type NodeProps, type Node } from '@xyflow/react'
import { Wrench } from 'lucide-react'
import type { ComponentType } from 'react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface ToolNodeData {
  label: string
  status: NodeStatus
  icon?: ComponentType<{ size: number }>
  [key: string]: unknown
}

type ToolNodeType = Node<ToolNodeData, 'tool'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function ToolNode({ data }: NodeProps<ToolNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const Ic = Icon ?? Wrench

  return (
    <NodeTooltip label={label}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: `1px solid ${border}`,
          background: 'var(--agrex-node-fill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <NodeHandles />
        <Ic size={16} />
      </div>
    </NodeTooltip>
  )
}
```

- [ ] **Step 6: Create FileNode — diamond shape**

```tsx
// packages/agrex/src/nodes/FileNode.tsx
import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface FileNodeData {
  label: string
  status: NodeStatus
  [key: string]: unknown
}

type FileNodeType = Node<FileNodeData, 'file'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function FileNode({ data }: NodeProps<FileNodeType>) {
  const { label, status } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const S = 46

  return (
    <NodeTooltip label={label}>
      <div style={{ position: 'relative', width: S, height: S }}>
        <NodeHandles />
        <svg
          width={S}
          height={S}
          viewBox={`0 0 ${S} ${S}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            animation: isRunning ? 'agrex-running-drop 1.5s ease-in-out infinite' : undefined,
          }}
        >
          <path
            d="M 19.5,4.5 Q 23,1 26.5,4.5 L 41.5,19.5 Q 45,23 41.5,26.5 L 26.5,41.5 Q 23,45 19.5,41.5 L 4.5,26.5 Q 1,23 4.5,19.5 Z"
            fill="var(--agrex-node-fill)"
            stroke={border}
            strokeWidth="1"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--agrex-node-icon)" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="9" x2="18" y2="9" />
            <line x1="6" y1="13" x2="18" y2="13" />
            <line x1="6" y1="17" x2="14" y2="17" />
          </svg>
        </div>
      </div>
    </NodeTooltip>
  )
}
```

- [ ] **Step 7: Create OutputNode — hexagon shape**

```tsx
// packages/agrex/src/nodes/OutputNode.tsx
import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface OutputNodeData {
  label: string
  status: NodeStatus
  [key: string]: unknown
}

type OutputNodeType = Node<OutputNodeData, 'output'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function OutputNode({ data }: NodeProps<OutputNodeType>) {
  const { label, status } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const S = 48
  const H = Math.round((S * 2) / Math.sqrt(3))

  return (
    <NodeTooltip label={label}>
      <div style={{ position: 'relative', width: S, height: H }}>
        <NodeHandles />
        <svg
          width={S}
          height={H}
          viewBox={`0 0 ${S} ${H}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            animation: isRunning ? 'agrex-running-drop 1.5s ease-in-out infinite' : undefined,
          }}
        >
          <path
            d="M 19.6,3.4 Q 24,1 28.4,3.4 L 42.6,11.3 Q 47,13.75 47,18.75 L 47,36.25 Q 47,41.25 42.6,43.7 L 28.4,51.6 Q 24,54 19.6,51.6 L 5.4,43.7 Q 1,41.25 1,36.25 L 1,18.75 Q 1,13.75 5.4,11.3 Z"
            fill="var(--agrex-node-fill)"
            stroke={border}
            strokeWidth="1.5"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--agrex-node-icon)" strokeWidth="2" strokeLinecap="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
      </div>
    </NodeTooltip>
  )
}
```

- [ ] **Step 8: Create SearchNode — small circle**

```tsx
// packages/agrex/src/nodes/SearchNode.tsx
import { type NodeProps, type Node } from '@xyflow/react'
import { Search } from 'lucide-react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface SearchNodeData {
  label: string
  status: NodeStatus
  [key: string]: unknown
}

type SearchNodeType = Node<SearchNodeData, 'search'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function SearchNode({ data }: NodeProps<SearchNodeType>) {
  const { label, status } = data
  const border = statusColor(status)
  const isRunning = status === 'running'

  return (
    <NodeTooltip label={label || 'Search'}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `1px solid ${border}`,
          background: 'var(--agrex-node-fill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <NodeHandles />
        <Search size={14} style={{ color: 'var(--agrex-node-icon)' }} />
      </div>
    </NodeTooltip>
  )
}
```

- [ ] **Step 9: Create DefaultNode — fallback for custom types**

```tsx
// packages/agrex/src/nodes/DefaultNode.tsx
import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface DefaultNodeData {
  label: string
  status: NodeStatus
  icon?: React.ComponentType<{ size: number }>
  [key: string]: unknown
}

type DefaultNodeType = Node<DefaultNodeData, string>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function DefaultNode({ data }: NodeProps<DefaultNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'

  return (
    <NodeTooltip label={label}>
      <div
        style={{
          width: 48,
          height: 48,
          border: `1.5px solid ${border}`,
          borderRadius: 8,
          background: 'var(--agrex-node-fill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <NodeHandles />
        {Icon ? (
          <Icon size={24} />
        ) : (
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--agrex-fg)', opacity: 0.5 }}>
            {label.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </NodeTooltip>
  )
}
```

- [ ] **Step 10: Create barrel export**

```typescript
// packages/agrex/src/nodes/index.ts
export { default as AgentNode } from './AgentNode'
export { default as SubAgentNode } from './SubAgentNode'
export { default as ToolNode } from './ToolNode'
export { default as FileNode } from './FileNode'
export { default as OutputNode } from './OutputNode'
export { default as SearchNode } from './SearchNode'
export { default as DefaultNode } from './DefaultNode'
```

- [ ] **Step 11: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: implement all node components with theme-aware styling"
```

---

### Task 6: Graph Component, Controls, Legend, DetailPanel, Toast

**Files:**
- Create: `packages/agrex/src/components/Graph.tsx`
- Create: `packages/agrex/src/components/Controls.tsx`
- Create: `packages/agrex/src/components/Legend.tsx`
- Create: `packages/agrex/src/components/DetailPanel.tsx`
- Create: `packages/agrex/src/components/Toast.tsx`
- Create: `packages/agrex/src/components/Agrex.tsx`

- [ ] **Step 1: Create Graph.tsx — React Flow wrapper with layout engine**

```tsx
// packages/agrex/src/components/Graph.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AgentNode,
  SubAgentNode,
  ToolNode,
  FileNode,
  OutputNode,
  SearchNode,
  DefaultNode,
} from '../nodes'
import { radialLayout } from '../layout/radial'
import type { AgrexNode, AgrexEdge, AgrexProps, ResolvedTheme, LayoutFn } from '../types'
import { themeToCSS } from '../theme/tokens'

const BUILT_IN_NODE_TYPES: NodeTypes = {
  agent: AgentNode,
  sub_agent: SubAgentNode,
  tool: ToolNode,
  file: FileNode,
  output: OutputNode,
  search: SearchNode,
}

interface GraphInternalProps {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
  theme: ResolvedTheme
  layout: 'radial' | LayoutFn
  nodeRenderers?: Record<string, React.ComponentType<any>>
  nodeIcons?: Record<string, React.ComponentType<{ size: number }>>
  edgeColors?: Record<string, string>
  fitOnUpdate: boolean
  onNodeClick?: (node: AgrexNode) => void
  onNewestNode?: (node: AgrexNode) => void
}

const DEFAULT_EDGE_COLORS: Record<string, string> = {
  spawn: 'var(--agrex-edge-spawn)',
  write: 'var(--agrex-edge-write)',
  read: 'var(--agrex-edge-read)',
}

export default function Graph({
  nodes,
  edges,
  theme,
  layout,
  nodeRenderers,
  nodeIcons,
  edgeColors: userEdgeColors,
  fitOnUpdate,
  onNodeClick,
  onNewestNode,
}: GraphInternalProps) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([])
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([])
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(new Map<string, { x: number; y: number }>())
  const agrexNodesRef = useRef<AgrexNode[]>(nodes)
  const [autoFit, setAutoFit] = useState(fitOnUpdate)

  const edgeColors = { ...DEFAULT_EDGE_COLORS, ...userEdgeColors }

  // Build merged node types
  const nodeTypes: NodeTypes = {
    ...BUILT_IN_NODE_TYPES,
    ...(nodeRenderers ?? {}),
  }
  // Add DefaultNode for any type not in the map
  const nodeTypesRef = useRef(nodeTypes)
  nodeTypesRef.current = nodeTypes

  useEffect(() => {
    agrexNodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    if (nodes.length === 0) {
      posRef.current.clear()
      setAutoFit(fitOnUpdate)
      setFlowNodes([])
      setFlowEdges([])
      return
    }

    // Run layout
    const layoutFn = typeof layout === 'function' ? layout : radialLayout
    const newPositions = layoutFn(nodes, edges, posRef.current)

    // Detect newest node
    let newest: AgrexNode | null = null
    for (const nd of nodes) {
      if (!posRef.current.has(nd.id) && newPositions.has(nd.id)) {
        newest = nd
      }
    }
    posRef.current = newPositions

    // Convert to React Flow nodes
    setFlowNodes(
      nodes
        .filter((n) => posRef.current.has(n.id))
        .map((n) => {
          const isCustomType = !(n.type in BUILT_IN_NODE_TYPES) && !(n.type in (nodeRenderers ?? {}))
          return {
            id: n.id,
            type: isCustomType ? 'default_agrex' : n.type,
            data: {
              label: n.label,
              status: n.status ?? 'idle',
              icon: nodeIcons?.[n.type],
              ...n.metadata,
            },
            position: posRef.current.get(n.id)!,
          }
        }),
    )

    // Convert to React Flow edges
    setFlowEdges(
      edges
        .filter((e) => posRef.current.has(e.source) && posRef.current.has(e.target))
        .map((e) => {
          const kind = e.type ?? 'spawn'
          return {
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: 'center-out',
            targetHandle: 'center-in',
            type: 'straight' as const,
            animated: true,
            style: {
              stroke: edgeColors[kind] ?? 'var(--agrex-edge-default)',
              strokeWidth: 1.5,
            },
          }
        }),
    )

    if (newest) onNewestNode?.(newest)

    // Auto-fit
    if (autoFit && newest) {
      const rf = rfRef.current
      if (rf) {
        setTimeout(() => {
          const el = containerRef.current
          const vw = el?.clientWidth || 800
          const vh = el?.clientHeight || 600
          let maxDist = 100
          for (const [, pos] of posRef.current) {
            maxDist = Math.max(maxDist, Math.hypot(pos.x, pos.y))
          }
          const halfSize = Math.min(vw, vh) / 2
          const zoom = Math.min(1, halfSize / (maxDist + 40))
          rf.setCenter(40, 40, { zoom: Math.max(0.15, zoom), duration: 300 })
        }, 60)
      }
    }
  }, [nodes, edges, layout, autoFit, fitOnUpdate, nodeIcons, nodeRenderers, setFlowNodes, setFlowEdges, onNewestNode])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!onNodeClick) return
      const orig = agrexNodesRef.current.find((n) => n.id === node.id)
      if (orig) onNodeClick(orig)
    },
    [onNodeClick],
  )

  // Register DefaultNode
  const allNodeTypes: NodeTypes = {
    ...nodeTypes,
    default_agrex: DefaultNode,
  }

  const cssVars = themeToCSS(theme)

  return (
    <div
      ref={containerRef}
      className="agrex"
      style={{ width: '100%', height: '100%', position: 'relative', background: theme.background, ...cssVars } as React.CSSProperties}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={allNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onMoveStart={(event) => { if (event) setAutoFit(false) }}
        onInit={(inst) => {
          rfRef.current = inst
          inst.setCenter(40, 40, { zoom: 1 })
        }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create Controls.tsx**

```tsx
// packages/agrex/src/components/Controls.tsx
import { useRef, useState } from 'react'

interface ControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  autoFit: boolean
  onToggleAutoFit: () => void
}

export default function Controls({ onZoomIn, onZoomOut, onFitView, autoFit, onToggleAutoFit }: ControlsProps) {
  const [collapsed, setCollapsed] = useState(false)

  const btnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    color: 'var(--agrex-fg)',
    opacity: 0.4,
    transition: 'opacity 150ms',
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: `translateX(-50%) ${collapsed ? 'translateY(calc(-100% - 20px))' : 'translateY(0)'}`,
          transition: 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)',
          zIndex: 30,
          borderRadius: 16,
          background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--agrex-node-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px',
        }}
      >
        <button onClick={onZoomIn} title="Zoom in" style={btnStyle} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <button
          onClick={onToggleAutoFit}
          title={autoFit ? 'Auto-fit ON' : 'Auto-fit OFF'}
          style={{
            ...btnStyle,
            background: autoFit ? 'color-mix(in srgb, var(--agrex-status-done) 12%, transparent)' : 'transparent',
            opacity: autoFit ? 1 : 0.4,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => { if (!autoFit) e.currentTarget.style.opacity = '0.4' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={autoFit ? 'var(--agrex-status-done)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>

        <button onClick={onZoomOut} title="Zoom out" style={btnStyle} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          position: 'absolute',
          top: collapsed ? 0 : 62,
          left: '50%',
          transform: 'translateX(-50%)',
          transition: 'top 250ms cubic-bezier(0.23, 1, 0.32, 1)',
          zIndex: 30,
          height: 20,
          width: 40,
          borderRadius: '0 0 6px 6px',
          background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--agrex-node-border)',
          borderTop: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--agrex-fg)',
          opacity: 0.4,
        }}
      >
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 200ms' }}
        >
          <path d="M1 2.5L4 5.5L7 2.5" />
        </svg>
      </button>
    </>
  )
}
```

- [ ] **Step 3: Create Legend.tsx**

```tsx
// packages/agrex/src/components/Legend.tsx
import { useState } from 'react'

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--agrex-node-border)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--agrex-fg)', opacity: 0.3 }}>{title}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ color: 'var(--agrex-fg)', opacity: 0.3, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 200ms' }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" />
        </svg>
      </button>
      <div className="agrex-collapse" data-collapsed={!open}>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 8 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function ShapeItem({ shape, label }: { shape: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {shape}
      <span>{label}</span>
    </div>
  )
}

export default function Legend() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <aside
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          bottom: 16,
          width: 160,
          zIndex: 30,
          borderRadius: 16,
          background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--agrex-node-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: collapsed ? 'translateX(calc(100% + 20px))' : 'translateX(0)',
          transition: 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--agrex-node-border)', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--agrex-fg)' }}>Legend</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px', fontSize: 12, color: 'var(--agrex-fg)', opacity: 0.6 }}>
          <Section title="Shapes">
            <ShapeItem shape={<div style={{ width: 12, height: 12, border: '1.5px solid var(--agrex-node-border)', borderRadius: 3 }} />} label="Agent" />
            <ShapeItem shape={<div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid var(--agrex-node-border)' }} />} label="Tool" />
            <ShapeItem
              shape={
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path d="M 5.8,1.3 Q 7,0 8.2,1.3 L 12.7,5.8 Q 14,7 12.7,8.2 L 8.2,12.7 Q 7,14 5.8,12.7 L 1.3,8.2 Q 0,7 1.3,5.8 Z" fill="none" stroke="var(--agrex-node-border)" strokeWidth="1.5" />
                </svg>
              }
              label="File"
            />
            <ShapeItem
              shape={
                <svg width="14" height="16" viewBox="0 0 48 55">
                  <path d="M 19.6,3.4 Q 24,1 28.4,3.4 L 42.6,11.3 Q 47,13.75 47,18.75 L 47,36.25 Q 47,41.25 42.6,43.7 L 28.4,51.6 Q 24,54 19.6,51.6 L 5.4,43.7 Q 1,41.25 1,36.25 L 1,18.75 Q 1,13.75 5.4,11.3 Z" fill="none" stroke="var(--agrex-node-border)" strokeWidth="2.5" />
                </svg>
              }
              label="Output"
            />
          </Section>

          <Section title="Data Flow" defaultOpen={false}>
            <ShapeItem shape={<div style={{ width: 20, height: 0, borderTop: '2px solid var(--agrex-edge-write)' }} />} label="Write" />
            <ShapeItem shape={<div style={{ width: 20, height: 0, borderTop: '2px solid var(--agrex-edge-read)' }} />} label="Read" />
            <ShapeItem shape={<div style={{ width: 20, height: 0, borderTop: '2px solid var(--agrex-edge-spawn)' }} />} label="Spawn" />
          </Section>

          <Section title="Status">
            <ShapeItem shape={<div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--agrex-status-running)', boxShadow: '0 0 6px color-mix(in srgb, var(--agrex-status-running) 50%, transparent)' }} />} label="Running" />
            <ShapeItem shape={<div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--agrex-status-done)' }} />} label="Done" />
            <ShapeItem shape={<div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--agrex-status-error)' }} />} label="Error" />
          </Section>
        </div>
      </aside>

      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          position: 'absolute',
          zIndex: 30,
          top: '50%',
          transform: 'translateY(-50%)',
          right: collapsed ? 0 : 176,
          transition: 'right 250ms cubic-bezier(0.23, 1, 0.32, 1)',
          width: 20,
          height: 40,
          borderRadius: '6px 0 0 6px',
          background: 'color-mix(in srgb, var(--agrex-bg) 80%, transparent)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--agrex-node-border)',
          borderRight: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--agrex-fg)',
          opacity: 0.4,
        }}
      >
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
        >
          <path d="M2 1L6 4L2 7" />
        </svg>
      </button>
    </>
  )
}
```

- [ ] **Step 4: Create DetailPanel.tsx**

```tsx
// packages/agrex/src/components/DetailPanel.tsx
import type { AgrexNode } from '../types'

interface DetailPanelProps {
  node: AgrexNode | null
  onClose: () => void
}

export default function DetailPanel({ node, onClose }: DetailPanelProps) {
  if (!node) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 280,
        maxHeight: 320,
        zIndex: 30,
        borderRadius: 12,
        background: 'color-mix(in srgb, var(--agrex-bg) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--agrex-node-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'agrex-slide-in 0.2s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--agrex-node-border)' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--agrex-fg)' }}>{node.label}</div>
          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--agrex-fg)', opacity: 0.4, marginTop: 2 }}>{node.type}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--agrex-fg)', opacity: 0.4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {node.status && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: node.status === 'running' ? 'var(--agrex-status-running)'
                : node.status === 'done' ? 'var(--agrex-status-done)'
                : node.status === 'error' ? 'var(--agrex-status-error)'
                : 'var(--agrex-node-border)',
            }} />
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--agrex-fg)', opacity: 0.5 }}>{node.status}</span>
          </div>
        )}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div style={{ fontSize: 12, fontFamily: 'var(--agrex-font-mono)', lineHeight: 1.6 }}>
            {Object.entries(node.metadata).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ color: 'var(--agrex-fg)', opacity: 0.4, flexShrink: 0 }}>{key}:</span>
                <span style={{ color: 'var(--agrex-fg)', opacity: 0.7, wordBreak: 'break-all' }}>
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create Toast.tsx**

```tsx
// packages/agrex/src/components/Toast.tsx
import type { AgrexNode } from '../types'

interface ToastProps {
  node: AgrexNode | null
}

const KIND_LABELS: Record<string, string> = {
  agent: 'AGENT',
  sub_agent: 'SUB-AGENT',
  tool: 'TOOL',
  file: 'FILE',
  search: 'SEARCH',
  output: 'OUTPUT',
}

export default function Toast({ node }: ToastProps) {
  if (!node) return null

  return (
    <div
      key={`${node.type}-${node.label}-${node.id}`}
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 10,
        background: 'color-mix(in srgb, var(--agrex-bg) 92%, transparent)',
        border: '1px solid var(--agrex-node-border)',
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: 13,
        fontFamily: 'var(--agrex-font-mono)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
        animation: 'agrex-slide-in 0.3s ease-out',
      }}
    >
      <span style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--agrex-fg)', opacity: 0.4, textTransform: 'uppercase' }}>
        {KIND_LABELS[node.type] ?? node.type}
      </span>
      <span style={{ color: 'var(--agrex-fg)' }}>{node.label}</span>
    </div>
  )
}
```

- [ ] **Step 6: Create Agrex.tsx — main public component that wires everything together**

```tsx
// packages/agrex/src/components/Agrex.tsx
import { useCallback, useRef, useState } from 'react'
import Graph from './Graph'
import Controls from './Controls'
import Legend from './Legend'
import DetailPanel from './DetailPanel'
import Toast from './Toast'
import { resolveTheme, themeToCSS } from '../theme/tokens'
import type { AgrexNode, AgrexProps, ResolvedTheme } from '../types'
import '../styles/agrex.css'

export default function Agrex({
  nodes: staticNodes,
  edges: staticEdges,
  instance,
  onNodeClick,
  theme: themeProp,
  layout = 'radial',
  nodeRenderers,
  nodeIcons,
  edgeColors,
  showControls = true,
  showLegend = true,
  showToasts = true,
  showDetailPanel = true,
  fitOnUpdate = true,
}: AgrexProps) {
  const theme = resolveTheme(themeProp)

  // Resolve data source: instance (streaming) or static arrays
  const nodes = instance?.nodes ?? staticNodes ?? []
  const edges = instance?.edges ?? staticEdges ?? []

  // Detail panel state
  const [selectedNode, setSelectedNode] = useState<AgrexNode | null>(null)

  // Toast state
  const [toastNode, setToastNode] = useState<AgrexNode | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNodeClick = useCallback((node: AgrexNode) => {
    if (showDetailPanel) setSelectedNode(node)
    onNodeClick?.(node)
  }, [onNodeClick, showDetailPanel])

  const handleNewestNode = useCallback((node: AgrexNode) => {
    if (!showToasts) return
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastNode(node)
    toastTimer.current = setTimeout(() => setToastNode(null), 2500)
  }, [showToasts])

  // Graph needs a ref for zoom controls — we'll use ReactFlow's instance
  // Controls are rendered inside the Graph container to share the context
  const cssVars = themeToCSS(theme) as Record<string, string>

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        fontFamily: theme.fontFamily,
        ...cssVars,
      } as React.CSSProperties}
      className="agrex"
    >
      <Graph
        nodes={nodes}
        edges={edges}
        theme={theme}
        layout={layout}
        nodeRenderers={nodeRenderers}
        nodeIcons={nodeIcons}
        edgeColors={edgeColors}
        fitOnUpdate={fitOnUpdate}
        onNodeClick={handleNodeClick}
        onNewestNode={handleNewestNode}
      />

      {showLegend && <Legend />}

      {showDetailPanel && (
        <DetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {showToasts && <Toast node={toastNode} />}
    </div>
  )
}
```

Note: Controls component is designed but will be wired to Graph's ReactFlow instance in a follow-up refinement. For now, the auto-fit and zoom are handled internally by Graph.

- [ ] **Step 7: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: implement Agrex main component with Graph, Legend, DetailPanel, Toast"
```

---

### Task 7: Public Exports (index.ts)

**Files:**
- Create: `packages/agrex/src/index.ts`

- [ ] **Step 1: Create index.ts — public API surface**

```typescript
// packages/agrex/src/index.ts

// Main component
export { default as Agrex } from './components/Agrex'

// Hook
export { useAgrex } from './hooks/useAgrex'

// Types
export type {
  AgrexNode,
  AgrexEdge,
  AgrexProps,
  AgrexNodeProps,
  NodeStatus,
  ThemeObject,
  Theme,
  ResolvedTheme,
  LayoutFn,
  Layout,
  UseAgrexReturn,
} from './types'

// Theme presets
export { darkTheme } from './theme/dark'
export { lightTheme } from './theme/light'
export { resolveTheme } from './theme/tokens'

// Layout
export { radialLayout } from './layout/radial'

// Node components (for advanced customization)
export { default as AgentNode } from './nodes/AgentNode'
export { default as SubAgentNode } from './nodes/SubAgentNode'
export { default as ToolNode } from './nodes/ToolNode'
export { default as FileNode } from './nodes/FileNode'
export { default as OutputNode } from './nodes/OutputNode'
export { default as SearchNode } from './nodes/SearchNode'
export { default as DefaultNode } from './nodes/DefaultNode'
```

- [ ] **Step 2: Verify build**

```bash
cd ~/projects/agrex && pnpm --filter agrex build
```

Expected: builds successfully, output in `packages/agrex/dist/`

- [ ] **Step 3: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: add public API exports"
```

---

### Task 8: Mock System

**Files:**
- Create: `packages/agrex/src/mocks/index.ts`
- Create: `packages/agrex/src/mocks/generators.ts`
- Create: `packages/agrex/src/mocks/scenarios.ts`
- Create: `packages/agrex/src/mocks/replay.ts`
- Test: `packages/agrex/tests/mocks.test.ts`

- [ ] **Step 1: Write mock tests**

```typescript
// packages/agrex/tests/mocks.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createMockNode, createMockEdge } from '../src/mocks/generators'
import { createMockPipeline } from '../src/mocks/scenarios'
import { replay } from '../src/mocks/replay'
import type { UseAgrexReturn } from '../src/types'

describe('generators', () => {
  it('creates a node with defaults', () => {
    const node = createMockNode({ type: 'agent', label: 'Test' })
    expect(node.id).toBeTruthy()
    expect(node.type).toBe('agent')
    expect(node.label).toBe('Test')
    expect(node.status).toBe('idle')
  })

  it('creates a node with overrides', () => {
    const node = createMockNode({ id: 'custom', type: 'tool', label: 'Search', status: 'running' })
    expect(node.id).toBe('custom')
    expect(node.status).toBe('running')
  })

  it('creates an edge with defaults', () => {
    const edge = createMockEdge({ source: 'a', target: 'b' })
    expect(edge.id).toBe('a-b')
    expect(edge.type).toBe('spawn')
  })
})

describe('scenarios', () => {
  it('creates research-agent scenario', () => {
    const { nodes, edges } = createMockPipeline('research-agent')
    expect(nodes.length).toBeGreaterThan(0)
    expect(edges.length).toBeGreaterThan(0)
  })

  it('creates multi-agent scenario', () => {
    const { nodes, edges } = createMockPipeline('multi-agent')
    expect(nodes.length).toBeGreaterThan(5)
  })

  it('creates deep-chain scenario', () => {
    const { nodes, edges } = createMockPipeline('deep-chain')
    expect(nodes.length).toBeGreaterThan(3)
  })
})

describe('replay', () => {
  it('drips nodes and edges over time', async () => {
    vi.useFakeTimers()
    const { nodes, edges } = createMockPipeline('research-agent')

    const instance: UseAgrexReturn = {
      nodes: [],
      edges: [],
      addNode: vi.fn(),
      addNodes: vi.fn(),
      updateNode: vi.fn(),
      removeNode: vi.fn(),
      addEdge: vi.fn(),
      addEdges: vi.fn(),
      removeEdge: vi.fn(),
      clear: vi.fn(),
    }

    replay(instance, { nodes, edges })

    // Advance time to process all nodes
    for (let i = 0; i < nodes.length + edges.length; i++) {
      await vi.advanceTimersByTimeAsync(200)
    }

    expect(instance.addNode).toHaveBeenCalled()
    expect(instance.addEdge).toHaveBeenCalled()

    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/projects/agrex && pnpm --filter agrex test -- tests/mocks.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create generators.ts**

```typescript
// packages/agrex/src/mocks/generators.ts
import type { AgrexNode, AgrexEdge } from '../types'

let counter = 0

export function createMockNode(overrides: Partial<AgrexNode> & { type: string; label: string }): AgrexNode {
  return {
    id: `mock-${++counter}`,
    status: 'idle',
    ...overrides,
  }
}

export function createMockEdge(overrides: Partial<AgrexEdge> & { source: string; target: string }): AgrexEdge {
  return {
    id: `${overrides.source}-${overrides.target}`,
    type: 'spawn',
    ...overrides,
  }
}

/** Reset the internal counter (useful in tests) */
export function resetMockCounter() {
  counter = 0
}
```

- [ ] **Step 4: Create scenarios.ts**

```typescript
// packages/agrex/src/mocks/scenarios.ts
import type { AgrexNode, AgrexEdge } from '../types'

interface Scenario {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
}

function researchAgent(): Scenario {
  const nodes: AgrexNode[] = [
    { id: 'root', type: 'agent', label: 'Researcher', status: 'done' },
    { id: 'ws1', type: 'tool', label: 'web_search', parentId: 'root', status: 'done', metadata: { query: 'prospect theory' } },
    { id: 'ws2', type: 'tool', label: 'web_search', parentId: 'root', status: 'done', metadata: { query: 'game theory' } },
    { id: 'ws3', type: 'tool', label: 'web_search', parentId: 'root', status: 'done', metadata: { query: 'bounded rationality' } },
    { id: 'wf1', type: 'tool', label: 'write_file', parentId: 'root', status: 'done' },
    { id: 'f1', type: 'file', label: 'research.md', parentId: 'wf1', status: 'done', metadata: { path: 'research.md' } },
    { id: 'o1', type: 'output', label: 'research_output.md', parentId: 'root', status: 'done' },
  ]

  const edges: AgrexEdge[] = [
    { id: 'root-ws1', source: 'root', target: 'ws1' },
    { id: 'root-ws2', source: 'root', target: 'ws2' },
    { id: 'root-ws3', source: 'root', target: 'ws3' },
    { id: 'root-wf1', source: 'root', target: 'wf1' },
    { id: 'wf1-f1', source: 'wf1', target: 'f1', type: 'write' },
    { id: 'root-o1', source: 'root', target: 'o1' },
  ]

  return { nodes, edges }
}

function multiAgent(): Scenario {
  const nodes: AgrexNode[] = [
    { id: 'orchestrator', type: 'agent', label: 'Orchestrator', status: 'done' },
    { id: 'researcher', type: 'agent', label: 'Researcher', parentId: 'orchestrator', status: 'done' },
    { id: 'analyst', type: 'agent', label: 'Analyst', parentId: 'orchestrator', status: 'done' },
    { id: 'writer', type: 'agent', label: 'Writer', parentId: 'orchestrator', status: 'done' },
    { id: 'r-ws1', type: 'tool', label: 'web_search', parentId: 'researcher', status: 'done' },
    { id: 'r-ws2', type: 'tool', label: 'web_search', parentId: 'researcher', status: 'done' },
    { id: 'r-wf', type: 'tool', label: 'write_file', parentId: 'researcher', status: 'done' },
    { id: 'r-f1', type: 'file', label: 'data.json', parentId: 'r-wf', status: 'done' },
    { id: 'a-rf', type: 'tool', label: 'read_file', parentId: 'analyst', status: 'done' },
    { id: 'a-wf', type: 'tool', label: 'write_file', parentId: 'analyst', status: 'done' },
    { id: 'a-f1', type: 'file', label: 'analysis.md', parentId: 'a-wf', status: 'done' },
    { id: 'w-rf', type: 'tool', label: 'read_file', parentId: 'writer', status: 'done' },
    { id: 'w-wf', type: 'tool', label: 'write_file', parentId: 'writer', status: 'done' },
    { id: 'w-o1', type: 'output', label: 'report.md', parentId: 'writer', status: 'done' },
  ]

  const edges: AgrexEdge[] = [
    { id: 'o-r', source: 'orchestrator', target: 'researcher' },
    { id: 'o-a', source: 'orchestrator', target: 'analyst' },
    { id: 'o-w', source: 'orchestrator', target: 'writer' },
    { id: 'r-ws1-e', source: 'researcher', target: 'r-ws1' },
    { id: 'r-ws2-e', source: 'researcher', target: 'r-ws2' },
    { id: 'r-wf-e', source: 'researcher', target: 'r-wf' },
    { id: 'r-wf-f1', source: 'r-wf', target: 'r-f1', type: 'write' },
    { id: 'a-rf-e', source: 'analyst', target: 'a-rf' },
    { id: 'r-f1-a', source: 'r-f1', target: 'a-rf', type: 'read' },
    { id: 'a-wf-e', source: 'analyst', target: 'a-wf' },
    { id: 'a-wf-f1', source: 'a-wf', target: 'a-f1', type: 'write' },
    { id: 'w-rf-e', source: 'writer', target: 'w-rf' },
    { id: 'a-f1-w', source: 'a-f1', target: 'w-rf', type: 'read' },
    { id: 'w-wf-e', source: 'writer', target: 'w-wf' },
    { id: 'w-wf-o1', source: 'w-wf', target: 'w-o1' },
  ]

  return { nodes, edges }
}

function deepChain(): Scenario {
  const nodes: AgrexNode[] = [
    { id: 'a0', type: 'agent', label: 'Coordinator', status: 'done' },
    { id: 'a1', type: 'sub_agent', label: 'Planner', parentId: 'a0', status: 'done' },
    { id: 'a2', type: 'sub_agent', label: 'Executor', parentId: 'a1', status: 'done' },
    { id: 'a3', type: 'sub_agent', label: 'Validator', parentId: 'a2', status: 'done' },
    { id: 't1', type: 'tool', label: 'web_search', parentId: 'a1', status: 'done' },
    { id: 't2', type: 'tool', label: 'run_tests', parentId: 'a2', status: 'done' },
    { id: 't3', type: 'tool', label: 'write_file', parentId: 'a2', status: 'done' },
    { id: 'f1', type: 'file', label: 'output.py', parentId: 't3', status: 'done' },
    { id: 's1', type: 'search', label: 'docs search', parentId: 'a3', status: 'done', metadata: { query: 'validation rules' } },
    { id: 'o1', type: 'output', label: 'result.json', parentId: 'a3', status: 'done' },
  ]

  const edges: AgrexEdge[] = [
    { id: 'a0-a1', source: 'a0', target: 'a1' },
    { id: 'a1-a2', source: 'a1', target: 'a2' },
    { id: 'a2-a3', source: 'a2', target: 'a3' },
    { id: 'a1-t1', source: 'a1', target: 't1' },
    { id: 'a2-t2', source: 'a2', target: 't2' },
    { id: 'a2-t3', source: 'a2', target: 't3' },
    { id: 't3-f1', source: 't3', target: 'f1', type: 'write' },
    { id: 'a3-s1', source: 'a3', target: 's1' },
    { id: 'a3-o1', source: 'a3', target: 'o1' },
  ]

  return { nodes, edges }
}

const SCENARIOS: Record<string, () => Scenario> = {
  'research-agent': researchAgent,
  'multi-agent': multiAgent,
  'deep-chain': deepChain,
}

export function createMockPipeline(name: 'research-agent' | 'multi-agent' | 'deep-chain'): Scenario {
  return SCENARIOS[name]()
}
```

- [ ] **Step 5: Create replay.ts**

```typescript
// packages/agrex/src/mocks/replay.ts
import type { AgrexNode, AgrexEdge, UseAgrexReturn } from '../types'

interface ReplayOptions {
  /** Playback speed multiplier (default 1) */
  speed?: number
  /** Delay between items in ms (default 150) */
  delay?: number
}

interface Scenario {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
}

/**
 * Replays a scenario by dripping nodes and edges into a useAgrex instance.
 * Nodes are added first, then their connecting edges.
 * Returns a cancel function.
 */
export function replay(
  instance: Pick<UseAgrexReturn, 'addNode' | 'addEdge' | 'updateNode' | 'clear'>,
  scenario: Scenario,
  options: ReplayOptions = {},
): () => void {
  const { speed = 1, delay = 150 } = options
  const ms = delay / speed
  let cancelled = false

  // Build edge lookup: target -> edge
  const edgesByTarget = new Map<string, AgrexEdge[]>()
  for (const edge of scenario.edges) {
    const existing = edgesByTarget.get(edge.target) ?? []
    existing.push(edge)
    edgesByTarget.set(edge.target, existing)
  }

  instance.clear()

  // Drip nodes one by one, adding connecting edges after each node
  const items = [...scenario.nodes]
  let i = 0

  function next() {
    if (cancelled || i >= items.length) return

    const node = items[i]
    // Add as running first
    instance.addNode({ ...node, status: 'running' })

    // Add edges that target this node (if source already exists)
    const nodeEdges = edgesByTarget.get(node.id) ?? []
    for (const edge of nodeEdges) {
      instance.addEdge(edge)
    }
    // Also add edges where this node is the source
    for (const edge of scenario.edges) {
      if (edge.source === node.id && !nodeEdges.includes(edge)) {
        // Only add if target already exists
        const targetExists = items.slice(0, i).some(n => n.id === edge.target)
        if (targetExists) instance.addEdge(edge)
      }
    }

    // Mark previous node as done
    if (i > 0) {
      instance.updateNode(items[i - 1].id, { status: 'done' })
    }

    i++

    if (i >= items.length) {
      // Mark last node as done
      setTimeout(() => {
        if (!cancelled) instance.updateNode(node.id, { status: 'done' })
      }, ms)
    } else {
      setTimeout(next, ms)
    }
  }

  next()

  return () => { cancelled = true }
}
```

- [ ] **Step 6: Create mocks/index.ts**

```typescript
// packages/agrex/src/mocks/index.ts
export { createMockNode, createMockEdge, resetMockCounter } from './generators'
export { createMockPipeline } from './scenarios'
export { replay } from './replay'
```

- [ ] **Step 7: Run tests**

```bash
cd ~/projects/agrex && pnpm --filter agrex test -- tests/mocks.test.ts
```

Expected: PASS

- [ ] **Step 8: Verify build with mocks subpath**

```bash
cd ~/projects/agrex && pnpm --filter agrex build
```

Expected: `dist/mocks/index.js` exists alongside `dist/index.js`

- [ ] **Step 9: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: add mock system with scenarios and replay"
```

---

### Task 9: Dev Playground

**Files:**
- Create: `packages/playground/src/main.tsx`
- Create: `packages/playground/src/App.tsx`
- Create: `packages/playground/src/index.css`

- [ ] **Step 1: Create main.tsx**

```tsx
// packages/playground/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: Create index.css**

```css
/* packages/playground/src/index.css */
@import "tailwindcss";

body {
  margin: 0;
  padding: 0;
  background: #000;
  color: #fff;
  font-family: system-ui, sans-serif;
  overflow: hidden;
}

#root {
  height: 100vh;
}
```

- [ ] **Step 3: Create App.tsx — playground with scenario picker and prop toggles**

```tsx
// packages/playground/src/App.tsx
import { useState, useCallback } from 'react'
import { Agrex, useAgrex } from 'agrex'
import { createMockPipeline, replay, createMockNode, createMockEdge } from 'agrex/mocks'
import type { Theme } from 'agrex'

type ScenarioName = 'research-agent' | 'multi-agent' | 'deep-chain'

export default function App() {
  const agrex = useAgrex()
  const [theme, setTheme] = useState<Theme>('dark')
  const [showControls, setShowControls] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showToasts, setShowToasts] = useState(true)
  const [showDetailPanel, setShowDetailPanel] = useState(true)
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null)

  const loadScenario = useCallback((name: ScenarioName) => {
    if (cancelFn) cancelFn()
    const scenario = createMockPipeline(name)
    const cancel = replay(agrex, scenario, { speed: 1 })
    setCancelFn(() => cancel)
  }, [agrex, cancelFn])

  const loadStatic = useCallback((name: ScenarioName) => {
    agrex.clear()
    const { nodes, edges } = createMockPipeline(name)
    agrex.addNodes(nodes)
    agrex.addEdges(edges)
  }, [agrex])

  const addRandomNode = useCallback(() => {
    const types = ['agent', 'tool', 'file', 'output', 'search']
    const type = types[Math.floor(Math.random() * types.length)]
    const parentNode = agrex.nodes.length > 0
      ? agrex.nodes[Math.floor(Math.random() * agrex.nodes.length)]
      : null

    const node = createMockNode({
      type,
      label: `Random ${type}`,
      parentId: parentNode?.id,
      status: 'running',
    })
    agrex.addNode(node)

    if (parentNode) {
      agrex.addEdge(createMockEdge({ source: parentNode.id, target: node.id }))
    }

    setTimeout(() => agrex.updateNode(node.id, { status: 'done' }), 1500)
  }, [agrex])

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  }

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    ...btnStyle,
    background: on ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
    borderColor: on ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.15)',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        background: '#050505',
        zIndex: 50,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, marginRight: 12, opacity: 0.6 }}>agrex</span>

        {/* Scenario buttons */}
        <button style={btnStyle} onClick={() => loadScenario('research-agent')}>Research Agent</button>
        <button style={btnStyle} onClick={() => loadScenario('multi-agent')}>Multi Agent</button>
        <button style={btnStyle} onClick={() => loadScenario('deep-chain')}>Deep Chain</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={btnStyle} onClick={() => loadStatic('multi-agent')}>Static Load</button>
        <button style={btnStyle} onClick={addRandomNode}>+ Random Node</button>
        <button style={{ ...btnStyle, borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => agrex.clear()}>Clear</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* Toggles */}
        <button style={toggleStyle(showControls)} onClick={() => setShowControls(v => !v)}>Controls</button>
        <button style={toggleStyle(showLegend)} onClick={() => setShowLegend(v => !v)}>Legend</button>
        <button style={toggleStyle(showToasts)} onClick={() => setShowToasts(v => !v)}>Toasts</button>
        <button style={toggleStyle(showDetailPanel)} onClick={() => setShowDetailPanel(v => !v)}>Detail</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button style={toggleStyle(theme === 'dark')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </div>

      {/* Graph */}
      <div style={{ flex: 1 }}>
        <Agrex
          instance={agrex}
          theme={theme}
          showControls={showControls}
          showLegend={showLegend}
          showToasts={showToasts}
          showDetailPanel={showDetailPanel}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Install deps and test playground runs**

```bash
cd ~/projects/agrex && pnpm install && pnpm --filter agrex build && pnpm dev
```

Expected: playground opens at localhost:5173 with toolbar and empty graph. Clicking scenario buttons populates graph.

- [ ] **Step 5: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: add dev playground with scenario picker and prop toggles"
```

---

### Task 10: Run All Tests & Verify Build

**Files:** (no new files — validation only)

- [ ] **Step 1: Run full test suite**

```bash
cd ~/projects/agrex && pnpm --filter agrex test
```

Expected: all tests pass.

- [ ] **Step 2: Verify production build**

```bash
cd ~/projects/agrex && pnpm --filter agrex build && ls -la packages/agrex/dist/
```

Expected: `index.js`, `index.d.ts`, `mocks/index.js`, `mocks/index.d.ts`, `styles.css` all present.

- [ ] **Step 3: Verify playground build**

```bash
cd ~/projects/agrex && pnpm --filter playground build
```

Expected: builds without errors.

- [ ] **Step 4: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "fix[agrex]: verify all tests pass and build succeeds"
```

---

### Task 11: CSS Tooltip Hover (agrex.css addition)

The NodeTooltip uses a class-based hover approach. We need a small CSS addition to make the tooltip visible on hover.

**Files:**
- Modify: `packages/agrex/src/styles/agrex.css`

- [ ] **Step 1: Add tooltip hover rule to agrex.css**

Add at the end of `packages/agrex/src/styles/agrex.css`:

```css
/* Tooltip hover visibility */
.agrex-tooltip-wrapper:hover .agrex-tooltip {
  opacity: 1 !important;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "fix[agrex]: add tooltip hover CSS rule"
```

---

### Task 12: README

**Files:**
- Create: `~/projects/agrex/README.md`

- [ ] **Step 1: Write README**

```markdown
# agrex

React component for visualizing AI agent execution as interactive graphs.

## Install

```bash
npm install agrex @xyflow/react
```

## Quick Start

```tsx
import { Agrex } from 'agrex'
import 'agrex/styles.css'

const nodes = [
  { id: '1', type: 'agent', label: 'Researcher' },
  { id: '2', type: 'tool', label: 'web_search', parentId: '1', status: 'done' },
]

const edges = [
  { id: 'e1', source: '1', target: '2', type: 'spawn' },
]

function App() {
  return <Agrex nodes={nodes} edges={edges} />
}
```

## Streaming

```tsx
import { Agrex, useAgrex } from 'agrex'
import 'agrex/styles.css'

function App() {
  const agrex = useAgrex()

  useEffect(() => {
    ws.onmessage = (msg) => {
      agrex.addNode(msg.node)
      agrex.addEdge(msg.edge)
    }
  }, [])

  return <Agrex instance={agrex} />
}
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` | `AgrexNode[]` | — | Static node data |
| `edges` | `AgrexEdge[]` | — | Static edge data |
| `instance` | `UseAgrexReturn` | — | Streaming mode |
| `theme` | `'dark' \| 'light' \| ThemeObject` | `'dark'` | Theme |
| `layout` | `'radial' \| LayoutFn` | `'radial'` | Layout algorithm |
| `nodeRenderers` | `Record<string, ComponentType>` | — | Custom node components |
| `nodeIcons` | `Record<string, ComponentType>` | — | Custom icons per type |
| `edgeColors` | `Record<string, string>` | — | Edge colors per type |
| `showControls` | `boolean` | `true` | Zoom controls |
| `showLegend` | `boolean` | `true` | Legend panel |
| `showToasts` | `boolean` | `true` | New-node toasts |
| `showDetailPanel` | `boolean` | `true` | Click detail panel |
| `fitOnUpdate` | `boolean` | `true` | Auto-fit viewport |

## Mocks

```tsx
import { createMockPipeline, replay } from 'agrex/mocks'

const scenario = createMockPipeline('multi-agent')
replay(agrexInstance, scenario, { speed: 2 })
```

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
cd ~/projects/agrex && git add -A && git commit -m "feat[agrex]: add README with usage docs"
```
