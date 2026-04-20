# agrex viewer

Static site at **[agrex.ppazosp.dev](https://agrex.ppazosp.dev)** for pasting or dropping an agrex trace and scrubbing through the agent execution.

Nothing leaves the browser — the viewer is a client-only Vite build, no backend, no telemetry.

## Accepted formats

- `{ events: [...] }` — canonical `AgrexEvent[]` trace (what `useAgrexReplay.load()` takes).
- `{ nodes: [...], edges: [...] }` — a snapshot. Events are synthesized from `metadata.startedAt` / `metadata.endedAt`.
- JSONL — one `AgrexEvent` JSON object per line.

See [`@ppazosp/agrex/trace`](../agrex/README.md) for the `parseTrace` and `snapshotToEvents` utilities the viewer uses.

## Local dev

```bash
pnpm --filter viewer dev      # http://localhost:5173
pnpm --filter viewer build    # static output in packages/viewer/dist
```

## Deploy

Vercel is configured via the root `vercel.json`:

- install: `pnpm install --frozen-lockfile`
- build: `pnpm --filter viewer build`
- output: `packages/viewer/dist`

Set the Vercel project's **Root Directory** to the repo root (not `packages/viewer`) so pnpm workspace resolution works. Point the `agrex.ppazosp.dev` CNAME at the Vercel project.
