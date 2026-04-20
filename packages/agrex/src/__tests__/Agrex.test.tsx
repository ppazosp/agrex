import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Agrex } from '../index'
import type { AgrexNode, AgrexEdge } from '../types'

// Mock ResizeObserver for jsdom
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const nodes: AgrexNode[] = [
  { id: '1', type: 'agent', label: 'Agent' },
  { id: '2', type: 'tool', label: 'search', parentId: '1', status: 'running' },
]

const edges: AgrexEdge[] = [{ id: 'e1', source: '1', target: '2' }]

describe('Agrex component', () => {
  it('renders without crashing with static nodes', () => {
    const { container } = render(<Agrex nodes={nodes} edges={edges} />)
    expect(container.querySelector('.agrex')).toBeTruthy()
  })

  it('renders with empty state', () => {
    const { container } = render(<Agrex nodes={[]} edges={[]} />)
    expect(container.querySelector('.agrex')).toBeTruthy()
  })

  it('applies custom className', () => {
    const { container } = render(<Agrex nodes={[]} edges={[]} className="my-class" />)
    expect(container.querySelector('.agrex.my-class')).toBeTruthy()
  })

  it('renders with light theme', () => {
    const { container } = render(<Agrex nodes={nodes} edges={edges} theme="light" />)
    const el = container.querySelector('.agrex') as HTMLElement
    expect(el.style.getPropertyValue('--agrex-bg')).toBe('#ffffff')
  })

  it('renders StatsBar by default', () => {
    const { container } = render(<Agrex nodes={nodes} edges={edges} />)
    expect(container.textContent).toContain('nodes')
  })

  it('suppresses StatsBar when externalTimeline is set', () => {
    const { container } = render(<Agrex nodes={nodes} edges={edges} externalTimeline />)
    // StatsBar renders "nodes" label; nothing else in Agrex does
    expect(container.textContent).not.toContain('nodes')
  })

  it('auto-generates edges from reads/writes', () => {
    const rwNodes: AgrexNode[] = [
      { id: 'a', type: 'agent', label: 'Agent' },
      { id: 'wf', type: 'tool', label: 'write_file', parentId: 'a', writes: ['f1'] },
      { id: 'f1', type: 'file', label: 'data.json', parentId: 'wf' },
      { id: 'rf', type: 'tool', label: 'read_file', parentId: 'a', reads: ['f1'] },
    ]
    const rwEdges: AgrexEdge[] = [
      { id: 'e1', source: 'a', target: 'wf' },
      { id: 'e2', source: 'a', target: 'rf' },
    ]
    // Should render without error — derived edges are created internally
    const { container } = render(<Agrex nodes={rwNodes} edges={rwEdges} />)
    expect(container.querySelector('.agrex')).toBeTruthy()
  })
})
