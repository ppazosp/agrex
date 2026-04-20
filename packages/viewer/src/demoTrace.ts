import type { AgrexNode, AgrexEdge } from '@ppazosp/agrex'

/**
 * Hand-authored demo trace: a research assistant composing a short report on
 * "lithium extraction from geothermal brines". Picked because it's realistic
 * (the kind of prompt people actually run), has natural branch/merge points,
 * and one plausible failure (a rate-limited fetch that retries), so the
 * scrubber has something interesting to scrub across.
 *
 * Timestamps are real ms offsets from a fixed epoch so consecutive runs of
 * the viewer render identically; node IDs are stable slugs so URL sharing
 * (future) works. Timestamps are shaped for readable playback: cheap ops
 * ~150ms, LLM summarizations 1–4s, file writes ~300ms.
 */

const T0 = Date.UTC(2026, 3, 18, 14, 0, 0)

type Node = Omit<AgrexNode, 'metadata'> & { metadata: Record<string, unknown> }
const n = (
  id: string,
  type: AgrexNode['type'],
  label: string,
  parentId: string | undefined,
  startOffsetMs: number,
  durationMs: number,
  status: NonNullable<AgrexNode['status']>,
  extra: Record<string, unknown> = {},
): Node => ({
  id,
  type,
  label,
  parentId,
  status,
  metadata: {
    startedAt: T0 + startOffsetMs,
    endedAt: status === 'running' ? undefined : T0 + startOffsetMs + durationMs,
    ...extra,
  },
})

const nodes: Node[] = [
  // Root — the outer agent, runs the whole time
  n('root', 'agent', 'Research Assistant', undefined, 0, 42000, 'done', {
    tokens: 28400,
    cost: 0.0426,
    input: 'Write a 1-page brief on lithium extraction from geothermal brines.',
  }),

  // Three sub-agents coordinate phases
  n('search-agent', 'sub_agent', 'Search Agent', 'root', 200, 8400, 'done', { tokens: 1820, cost: 0.0027 }),
  n('reader-agent', 'sub_agent', 'Reader Agent', 'root', 9000, 19000, 'done', { tokens: 12600, cost: 0.0189 }),
  n('writer-agent', 'sub_agent', 'Writer Agent', 'root', 29000, 12500, 'done', { tokens: 13980, cost: 0.021 }),

  // ── Search phase ─────────────────────────────────────────────────────
  n('t-query-plan', 'tool', 'plan_queries', 'search-agent', 400, 1200, 'done', {
    args: { topic: 'lithium extraction geothermal brines' },
    output: ['DLE geothermal brine 2025', 'Salton Sea lithium pilot', 'selective adsorption brine lithium'],
    tokens: 420,
    cost: 0.00063,
  }),
  n('t-search-1', 'tool', 'search_web', 'search-agent', 1800, 340, 'done', {
    args: { q: 'DLE geothermal brine 2025' },
    output: { results: 9 },
  }),
  n('t-search-2', 'tool', 'search_web', 'search-agent', 2200, 280, 'done', {
    args: { q: 'Salton Sea lithium pilot' },
    output: { results: 11 },
  }),
  n('t-search-3', 'tool', 'search_web', 'search-agent', 2550, 360, 'done', {
    args: { q: 'selective adsorption brine lithium' },
    output: { results: 7 },
  }),

  // Fetch sources — one fails, retries, succeeds
  n('t-fetch-a', 'tool', 'fetch_url', 'search-agent', 3100, 820, 'done', {
    args: { url: 'https://doe.gov/releases/2025/geothermal-lithium-pilot' },
  }),
  n('t-fetch-b', 'tool', 'fetch_url', 'search-agent', 3400, 910, 'done', {
    args: { url: 'https://nature.com/articles/s41560-025-dle-brine' },
  }),
  n('t-fetch-c-try1', 'tool', 'fetch_url', 'search-agent', 3700, 480, 'error', {
    args: { url: 'https://ieee.org/xplore/10456789' },
    error: 'HTTP 429 — rate limited',
  }),
  n('t-fetch-c-try2', 'tool', 'fetch_url', 'search-agent', 5400, 740, 'done', {
    args: { url: 'https://ieee.org/xplore/10456789', retry: 1 },
  }),
  n('t-fetch-d', 'tool', 'fetch_url', 'search-agent', 4200, 1020, 'done', {
    args: { url: 'https://usgs.gov/publications/lithium-2025' },
  }),

  // File artifacts from the fetches
  n('f-src-a', 'file', 'doe_pilot.html', 't-fetch-a', 3920, 10, 'done', { size: 42100 }),
  n('f-src-b', 'file', 'nature_dle.pdf', 't-fetch-b', 4310, 10, 'done', { size: 1842000 }),
  n('f-src-c', 'file', 'ieee_adsorption.pdf', 't-fetch-c-try2', 6140, 10, 'done', { size: 2290000 }),
  n('f-src-d', 'file', 'usgs_lithium_2025.pdf', 't-fetch-d', 5220, 10, 'done', { size: 980000 }),

  // ── Read phase ───────────────────────────────────────────────────────
  n('t-read-a', 'tool', 'read_file', 'reader-agent', 9200, 210, 'done', { args: { path: 'doe_pilot.html' } }),
  n('t-read-b', 'tool', 'parse_pdf', 'reader-agent', 9500, 1640, 'done', { args: { path: 'nature_dle.pdf' } }),
  n('t-read-c', 'tool', 'parse_pdf', 'reader-agent', 11200, 1880, 'done', { args: { path: 'ieee_adsorption.pdf' } }),
  n('t-read-d', 'tool', 'parse_pdf', 'reader-agent', 13100, 1210, 'done', { args: { path: 'usgs_lithium_2025.pdf' } }),

  n('t-extract-a', 'tool', 'extract_claims', 'reader-agent', 14400, 1900, 'done', {
    output: { claims: 6 },
    tokens: 1240,
    cost: 0.00186,
  }),
  n('t-extract-b', 'tool', 'extract_claims', 'reader-agent', 16400, 2380, 'done', {
    output: { claims: 11 },
    tokens: 2180,
    cost: 0.00327,
  }),
  n('t-extract-c', 'tool', 'extract_claims', 'reader-agent', 18900, 2140, 'done', {
    output: { claims: 8 },
    tokens: 1950,
    cost: 0.00293,
  }),
  n('t-extract-d', 'tool', 'extract_claims', 'reader-agent', 21100, 1720, 'done', {
    output: { claims: 5 },
    tokens: 1480,
    cost: 0.00222,
  }),

  n('t-summarize', 'tool', 'summarize', 'reader-agent', 22900, 3400, 'done', {
    tokens: 4120,
    cost: 0.00618,
    output: 'Direct lithium extraction (DLE) from geothermal brines targets the Salton Sea…',
  }),
  n('f-notes', 'file', 'notes.md', 't-summarize', 26310, 10, 'done', { size: 8420 }),

  // Cross-referencing — uncovers one conflicting claim
  n('t-xref-1', 'tool', 'cross_reference', 'reader-agent', 26500, 640, 'done', {
    args: { claim: 'Salton Sea annual lithium potential', sources: ['src-a', 'src-d'] },
  }),
  n('t-xref-2', 'tool', 'cross_reference', 'reader-agent', 27200, 720, 'done', {
    args: { claim: 'DLE water intensity', sources: ['src-b', 'src-c'] },
  }),
  n('t-xref-3', 'tool', 'cross_reference', 'reader-agent', 27950, 580, 'error', {
    args: { claim: 'recovery efficiency > 90%', sources: ['src-b', 'src-c'] },
    error: 'Sources disagree: 72% (src-b) vs 94% (src-c). Flagged for review.',
  }),

  // ── Write phase ──────────────────────────────────────────────────────
  n('t-outline', 'tool', 'draft_outline', 'writer-agent', 29100, 1120, 'done', {
    tokens: 780,
    cost: 0.00117,
    output: ['Background', 'Current pilots', 'Tradeoffs', 'Open questions'],
  }),
  n('t-verify-1', 'tool', 'verify_citation', 'writer-agent', 30400, 420, 'done', {
    args: { ref: 'Nature 2025 doi:10.1038/s41560-025-dle' },
  }),
  n('t-verify-2', 'tool', 'verify_citation', 'writer-agent', 30900, 380, 'done', {
    args: { ref: 'USGS Mineral Commodity Summaries 2025' },
  }),
  n('t-verify-3', 'tool', 'verify_citation', 'writer-agent', 31300, 420, 'done', {
    args: { ref: 'DOE Press Release 2025-03' },
  }),

  n('t-write-bg', 'tool', 'write_section', 'writer-agent', 31900, 2140, 'done', {
    args: { section: 'Background' },
    tokens: 1420,
    cost: 0.00213,
  }),
  n('t-write-pilots', 'tool', 'write_section', 'writer-agent', 34100, 2310, 'done', {
    args: { section: 'Current pilots' },
    tokens: 1680,
    cost: 0.00252,
  }),
  n('t-write-tradeoffs', 'tool', 'write_section', 'writer-agent', 36500, 2480, 'done', {
    args: { section: 'Tradeoffs' },
    tokens: 1790,
    cost: 0.00269,
  }),
  n('t-write-open', 'tool', 'write_section', 'writer-agent', 39050, 1820, 'done', {
    args: { section: 'Open questions' },
    tokens: 1240,
    cost: 0.00186,
  }),

  n('f-draft', 'file', 'draft.md', 'writer-agent', 40900, 10, 'done', { size: 11400 }),

  n('t-format', 'tool', 'format_markdown', 'writer-agent', 40950, 320, 'done', {
    args: { path: 'draft.md' },
  }),
  n('t-lint', 'tool', 'lint_citations', 'writer-agent', 41300, 180, 'done', {
    output: { missing: 0, conflicts: 1, note: 'recovery-efficiency conflict carried forward' },
  }),

  n('f-final', 'file', 'brief.md', 'writer-agent', 41500, 10, 'done', { size: 11420 }),
]

// Auto-wire parent→child spawn edges plus a few explicit file reads/writes.
const parentEdges: AgrexEdge[] = nodes
  .filter((node) => node.parentId)
  .map((node) => ({ id: `e-${node.parentId}-${node.id}`, source: node.parentId!, target: node.id, type: 'spawn' }))

// Flow edges: data passing between tools (displayed differently from spawn).
const flowEdges: AgrexEdge[] = [
  { id: 'fe-search-read-a', source: 't-fetch-a', target: 't-read-a', type: 'read' },
  { id: 'fe-search-read-b', source: 't-fetch-b', target: 't-read-b', type: 'read' },
  { id: 'fe-search-read-c', source: 't-fetch-c-try2', target: 't-read-c', type: 'read' },
  { id: 'fe-search-read-d', source: 't-fetch-d', target: 't-read-d', type: 'read' },
  { id: 'fe-extract-sum', source: 't-extract-a', target: 't-summarize', type: 'read' },
  { id: 'fe-extract-sum-b', source: 't-extract-b', target: 't-summarize', type: 'read' },
  { id: 'fe-extract-sum-c', source: 't-extract-c', target: 't-summarize', type: 'read' },
  { id: 'fe-extract-sum-d', source: 't-extract-d', target: 't-summarize', type: 'read' },
  { id: 'fe-sum-notes', source: 't-summarize', target: 'f-notes', type: 'write' },
  { id: 'fe-notes-outline', source: 'f-notes', target: 't-outline', type: 'read' },
  { id: 'fe-write-bg', source: 't-write-bg', target: 'f-draft', type: 'write' },
  { id: 'fe-write-pilots', source: 't-write-pilots', target: 'f-draft', type: 'write' },
  { id: 'fe-write-tradeoffs', source: 't-write-tradeoffs', target: 'f-draft', type: 'write' },
  { id: 'fe-write-open', source: 't-write-open', target: 'f-draft', type: 'write' },
  { id: 'fe-format', source: 'f-draft', target: 'f-final', type: 'write' },
]

export const demoTrace = {
  nodes: nodes as AgrexNode[],
  edges: [...parentEdges, ...flowEdges],
}
