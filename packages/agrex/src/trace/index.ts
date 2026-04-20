import type { AgrexEdge, AgrexNode } from '../types'
import type { AgrexEvent } from '../replay/types'

/**
 * Pure utilities for moving between snapshots, traces, and event streams.
 *
 * Canonical event shape lives in `../replay/types`. This module adds the
 * lossy inverse — `snapshotToEvents` — and a permissive parser that accepts
 * all three shapes the `@ppazosp/agrex` viewer (and consumers) read from
 * disk.
 */

/**
 * Synthesize an event stream from a final-state snapshot. Lossy by design:
 * intermediate `node_update`s aren't recoverable from a snapshot, so each
 * node produces at most one `node_add` plus one `node_update` (for the
 * final non-`running` status, if any).
 *
 * Ordering falls back to array order when `metadata.startedAt` is absent on
 * a node. Mixed data (some nodes timestamped, some not) works but the
 * untimestamped nodes land at the very start.
 */
export function snapshotToEvents(nodes: readonly AgrexNode[], edges: readonly AgrexEdge[] = []): AgrexEvent[] {
  const withTs = nodes.map((node, i) => ({
    node,
    startedAt: readTs(node.metadata?.startedAt),
    endedAt: readTs(node.metadata?.endedAt),
    originalIndex: i,
  }))

  const anyStartedAt = withTs.some((n) => n.startedAt !== undefined)
  const baseTs = anyStartedAt
    ? Math.min(...withTs.filter((n) => n.startedAt !== undefined).map((n) => n.startedAt!))
    : Date.now()

  // Sort: nodes with startedAt come in timestamp order; ones without keep
  // their array order but still land before the earliest timestamped node.
  const sorted = [...withTs].sort((a, b) => {
    const at = a.startedAt ?? baseTs - (withTs.length - a.originalIndex)
    const bt = b.startedAt ?? baseTs - (withTs.length - b.originalIndex)
    return at - bt
  })

  const events: AgrexEvent[] = []

  for (const { node, startedAt, endedAt } of sorted) {
    const addTs = startedAt ?? baseTs
    // Emit the node in its "running" state if we can later mark it done.
    // Otherwise emit it with its final status so the graph is consistent
    // even without per-event transitions.
    const canTransition = endedAt !== undefined && node.status && node.status !== 'running'
    const addNode: AgrexNode = canTransition ? { ...node, status: 'running' } : node
    events.push({ type: 'node_add', ts: addTs, node: addNode })

    if (canTransition) {
      events.push({
        type: 'node_update',
        ts: endedAt!,
        id: node.id,
        status: node.status,
      })
    }
  }

  // Edges land at their source node's startedAt (or the snapshot's base
  // timestamp). Keeps edges from appearing before their endpoints on scrub.
  const nodeAddTs = new Map<string, number>()
  for (const ev of events) {
    if (ev.type === 'node_add') {
      const n = ev.node as AgrexNode
      nodeAddTs.set(n.id, ev.ts)
    }
  }
  for (const edge of edges) {
    const srcTs = nodeAddTs.get(edge.source) ?? baseTs
    const tgtTs = nodeAddTs.get(edge.target) ?? baseTs
    events.push({ type: 'edge_add', ts: Math.max(srcTs, tgtTs), edge })
  }

  return events.sort((a, b) => a.ts - b.ts)
}

function readTs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

/**
 * Parse a trace from a string or already-parsed object. Accepts:
 *
 * 1. JSONL — one JSON event per line (detected when `source` is a string
 *    containing more than one line that each parse as objects).
 * 2. `{ events: AgrexEvent[] }` — the canonical trace shape.
 * 3. `{ nodes: AgrexNode[], edges?: AgrexEdge[] }` — a snapshot; synthesized
 *    into events via `snapshotToEvents`.
 *
 * Throws a `TraceParseError` with a human-readable message otherwise. The
 * `format` field on the error tells callers which branch was attempted.
 */
export function parseTrace(source: string | object): AgrexEvent[] {
  let parsed: unknown = source

  if (typeof source === 'string') {
    const trimmed = source.trim()
    if (!trimmed) throw new TraceParseError('Empty input', 'unknown')

    // JSONL heuristic: multiple lines and the first non-empty line parses
    // as an object. Beats trying to `JSON.parse` the whole thing and then
    // fall back, because a single pretty-printed JSON object spans many
    // lines too.
    if (looksLikeJSONL(trimmed)) {
      return parseJSONLText(trimmed)
    }

    try {
      parsed = JSON.parse(trimmed)
    } catch (e) {
      throw new TraceParseError(`Invalid JSON: ${(e as Error).message}`, 'unknown')
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new TraceParseError('Trace must be a JSON object or JSONL stream', 'unknown')
  }

  const obj = parsed as Record<string, unknown>

  if (Array.isArray(obj.events)) {
    return validateEvents(obj.events, 'events')
  }

  if (Array.isArray(obj.nodes)) {
    const edges = Array.isArray(obj.edges) ? (obj.edges as AgrexEdge[]) : []
    return snapshotToEvents(obj.nodes as AgrexNode[], edges)
  }

  throw new TraceParseError("Trace must contain either an 'events' array or a 'nodes' array", 'unknown')
}

function looksLikeJSONL(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return false
  // Every non-empty line must start with `{` — single-object pretty-print
  // fails this (lines start with quoted keys, spaces, etc.).
  return lines.every((l) => l.trim().startsWith('{'))
}

function parseJSONLText(text: string): AgrexEvent[] {
  const events: AgrexEvent[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    let ev: unknown
    try {
      ev = JSON.parse(line)
    } catch (e) {
      throw new TraceParseError(`Invalid JSON on line ${i + 1}: ${(e as Error).message}`, 'jsonl')
    }
    events.push(...validateEvents([ev], 'jsonl'))
  }
  return events
}

function validateEvents(raw: unknown[], format: TraceFormat): AgrexEvent[] {
  const out: AgrexEvent[] = []
  for (let i = 0; i < raw.length; i++) {
    const ev = raw[i]
    if (!ev || typeof ev !== 'object') {
      throw new TraceParseError(`Event at index ${i} is not an object`, format)
    }
    const e = ev as Record<string, unknown>
    if (typeof e.type !== 'string') {
      throw new TraceParseError(`Event at index ${i} missing string 'type'`, format)
    }
    if (typeof e.ts !== 'number') {
      throw new TraceParseError(`Event at index ${i} missing numeric 'ts'`, format)
    }
    out.push(e as AgrexEvent)
  }
  return out
}

export type TraceFormat = 'events' | 'snapshot' | 'jsonl' | 'unknown'

export class TraceParseError extends Error {
  readonly format: TraceFormat
  constructor(message: string, format: TraceFormat) {
    super(message)
    this.name = 'TraceParseError'
    this.format = format
  }
}
