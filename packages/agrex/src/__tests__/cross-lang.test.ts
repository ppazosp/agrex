import { describe, it, expect } from 'vitest'
import { createTracer, parseTrace } from '../trace'

// We avoid pulling in @types/node (not a project dep). Instead we redeclare
// the small surface of the Node APIs we need. The values come from `require`
// at runtime — vitest runs in Node, so the modules resolve.
declare const require: (id: string) => unknown
declare const __dirname: string

interface FsLike {
  writeFileSync(path: string, data: string): void
  mkdirSync(path: string, opts?: { recursive?: boolean }): void
}
interface PathLike {
  resolve(...segments: string[]): string
  dirname(p: string): string
}

const { writeFileSync, mkdirSync } = require('node:fs') as FsLike
const { resolve, dirname } = require('node:path') as PathLike

describe('cross-language fixture', () => {
  it('emits a canonical fixture and round-trips through parseTrace', () => {
    let t = 1_700_000_000_000
    const trace = createTracer({ clock: () => t++ })

    trace.agent('root', 'Researcher', { metadata: { input: 'foo' } })
    trace.stage('Search phase', { color: '#7c8cff' })
    trace.tool('s1', 'web_search', { parent: 'root', args: { q: 'foo' } })
    trace.update('s1', { metadata: { tokens: 12 } })
    trace.done('s1', { output: ['hit1', 'hit2'] })
    trace.marker('checkpoint', { label: 'phase 1 done' })
    trace.subAgent('sub', 'Synthesizer', { parent: 'root' })
    trace.error('sub', { error: new Error('synthesis failed'), metadata: { retries: 1 } })
    trace.edge({ id: 'e1', source: 'root', target: 'sub', type: 'spawn' })
    trace.done('root')

    // Strip the machine-dependent error.stack so the fixture is byte-stable
    // across runs / machines. The Python test only asserts on error.name and
    // error.message, so dropping `stack` doesn't reduce coverage.
    const stableJsonl =
      trace
        .toJSONL()
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => {
          const event = JSON.parse(line)
          const meta = (event as { metadata?: { error?: { stack?: unknown } } }).metadata
          if (meta?.error?.stack !== undefined) {
            delete meta.error.stack
          }
          return JSON.stringify(event)
        })
        .join('\n') + '\n'

    // __dirname resolves to the source __tests__ directory under vitest. Walk up
    // three levels: __tests__ → src → agrex → packages, then into agrex-py.
    const fixturePath = resolve(__dirname, '../../../agrex-py/tests/fixtures/cross_lang.jsonl')
    mkdirSync(dirname(fixturePath), { recursive: true })
    writeFileSync(fixturePath, stableJsonl)

    const parsed = parseTrace(stableJsonl)
    expect(parsed).toHaveLength(10)
    expect(parsed[0].type).toBe('node_add')
    expect(parsed[parsed.length - 1].type).toBe('node_update')

    // Spot-check the error event preserves serialized error.
    const errorEvent = parsed.find((e) => (e as { status?: string }).status === 'error')
    expect(errorEvent).toBeDefined()
    const errMeta = (
      errorEvent as unknown as {
        metadata: { error: { name: string; message: string } }
      }
    ).metadata
    expect(errMeta.error.name).toBe('Error')
    expect(errMeta.error.message).toBe('synthesis failed')
  })
})
