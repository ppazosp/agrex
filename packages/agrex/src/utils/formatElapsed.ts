/** Format elapsed time between two timestamps. Returns undefined for invalid/missing input. */
export function formatElapsed(startedAt: unknown, endedAt: unknown): string | undefined {
  if (!startedAt) return undefined
  const startMs = typeof startedAt === 'number' ? startedAt : new Date(startedAt as string).getTime()
  if (Number.isNaN(startMs)) return undefined
  const endMs = endedAt ? (typeof endedAt === 'number' ? endedAt : new Date(endedAt as string).getTime()) : Date.now()
  if (Number.isNaN(endMs)) return undefined
  const diff = endMs - startMs
  if (diff < 0) return undefined
  if (diff < 1000) return `${diff}ms`
  if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`
  return `${(diff / 60000).toFixed(1)}m`
}
