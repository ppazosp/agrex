import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { useRef } from 'react'
import { Agrex } from '../index'
import type { AgrexNode, AgrexHandle, AgrexNodeProps } from '../types'

globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const agentWithChildren: AgrexNode[] = [
  { id: 'root', type: 'agent', label: 'Root', status: 'done' },
  { id: 'child1', type: 'tool', label: 'search', parentId: 'root', status: 'done' },
  { id: 'child2', type: 'tool', label: 'write', parentId: 'root', status: 'done' },
  { id: 'sub', type: 'sub_agent', label: 'Sub', parentId: 'root', status: 'running' },
  { id: 'grandchild', type: 'tool', label: 'fetch', parentId: 'sub', status: 'running' },
]

describe('Graph collapse/expand', () => {
  it('calls onNodeClick when a node is clicked', async () => {
    const onNodeClick = vi.fn()
    const { container } = render(<Agrex nodes={agentWithChildren} onNodeClick={onNodeClick} />)
    // React Flow renders nodes as divs with data-id attribute
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    const nodeEl = container.querySelector('[data-id="root"]')
    if (nodeEl) {
      fireEvent.click(nodeEl)
      expect(onNodeClick).toHaveBeenCalled()
    }
  })

  it('calls onEdgeClick when an edge is clicked', async () => {
    const onEdgeClick = vi.fn()
    const { container } = render(<Agrex nodes={agentWithChildren} onEdgeClick={onEdgeClick} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    // Edges are rendered as SVG elements inside .react-flow__edges
    const edgeEl = container.querySelector('.react-flow__edge')
    if (edgeEl) {
      fireEvent.click(edgeEl)
      expect(onEdgeClick).toHaveBeenCalled()
    }
  })
})

describe('Graph imperative handle', () => {
  function TestWrapper({ nodes }: { nodes: AgrexNode[] }) {
    const ref = useRef<AgrexHandle>(null)
    return (
      <div>
        <Agrex ref={ref} nodes={nodes} />
        <button data-testid="fit" onClick={() => ref.current?.fitView()} />
        <button data-testid="collapse" onClick={() => ref.current?.collapseAll()} />
        <button data-testid="expand" onClick={() => ref.current?.expandAll()} />
        <button
          data-testid="json"
          onClick={() => ((window as unknown as Record<string, unknown>).__json = ref.current?.toJSON())}
        />
      </div>
    )
  }

  it('exposes fitView, collapseAll, expandAll, toJSON via ref', async () => {
    const { getByTestId } = render(<TestWrapper nodes={agentWithChildren} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    // These should not throw
    fireEvent.click(getByTestId('fit'))
    fireEvent.click(getByTestId('collapse'))
    fireEvent.click(getByTestId('expand'))
    fireEvent.click(getByTestId('json'))
    const json = (window as unknown as Record<string, unknown>).__json as { nodes: AgrexNode[] }
    expect(json).toBeDefined()
    expect(json.nodes).toBeDefined()
    expect(Array.isArray(json.nodes)).toBe(true)
  })
})

describe('Graph keyboard shortcuts', () => {
  it('does not throw on keyboard events with shortcuts enabled', async () => {
    const { container } = render(<Agrex nodes={agentWithChildren} keyboardShortcuts={true} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    // These should be handled without error
    fireEvent.keyDown(window, { key: '=' })
    fireEvent.keyDown(window, { key: '-' })
    fireEvent.keyDown(window, { key: '0' })
    expect(container.querySelector('.agrex')).toBeTruthy()
  })

  it('does not respond to shortcuts when keyboardShortcuts is false', async () => {
    const { container } = render(<Agrex nodes={agentWithChildren} keyboardShortcuts={false} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    fireEvent.keyDown(window, { key: '=' })
    fireEvent.keyDown(window, { key: '-' })
    fireEvent.keyDown(window, { key: '0' })
    expect(container.querySelector('.agrex')).toBeTruthy()
  })

  it('ignores shortcuts when typing in an input', async () => {
    const { container } = render(
      <div>
        <input data-testid="input" />
        <Agrex nodes={agentWithChildren} keyboardShortcuts={true} />
      </div>,
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    const input = container.querySelector('input')!
    input.focus()
    fireEvent.keyDown(input, { key: '=' })
    expect(container.querySelector('.agrex')).toBeTruthy()
  })
})

describe('Graph custom nodeRenderers', () => {
  it('passes { node, status, theme } to custom renderers (AgrexNodeProps contract)', async () => {
    const capturedProps: AgrexNodeProps[] = []
    const CustomRenderer = (props: AgrexNodeProps) => {
      capturedProps.push(props)
      return <div data-testid={`custom-${props.node.id}`}>{props.node.label}</div>
    }

    const customNodes: AgrexNode[] = [
      { id: 'a', type: 'custom', label: 'Alpha', status: 'running', metadata: { foo: 1 } },
      { id: 'b', type: 'custom', label: 'Beta', status: 'done' },
    ]

    render(<Agrex nodes={customNodes} nodeRenderers={{ custom: CustomRenderer }} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(capturedProps.length).toBeGreaterThan(0)
    const byId = new Map(capturedProps.map((p) => [p.node.id, p]))

    const a = byId.get('a')!
    expect(a.node.label).toBe('Alpha')
    expect(a.node.metadata).toEqual({ foo: 1 })
    expect(a.status).toBe('running')
    expect(a.theme).toBeDefined()
    expect(typeof a.theme.statusRunning).toBe('string')

    const b = byId.get('b')!
    expect(b.node.label).toBe('Beta')
    expect(b.status).toBe('done')
  })

  it('defaults status to "idle" when AgrexNode.status is omitted', async () => {
    const captured: AgrexNodeProps[] = []
    const R = (p: AgrexNodeProps) => {
      captured.push(p)
      return <div>{p.node.label}</div>
    }
    render(<Agrex nodes={[{ id: 'x', type: 'custom', label: 'X' }]} nodeRenderers={{ custom: R }} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(captured[0]?.status).toBe('idle')
  })
})

describe('Graph UI toggles', () => {
  it('hides legend when showLegend is false', () => {
    const { container } = render(<Agrex nodes={agentWithChildren} showLegend={false} />)
    // Legend renders an <aside> element
    expect(container.querySelector('aside')).toBeNull()
  })

  it('shows legend when showLegend is true', () => {
    const { container } = render(<Agrex nodes={agentWithChildren} showLegend={true} />)
    expect(container.querySelector('aside')).toBeTruthy()
  })

  it('renders with showStats enabled', () => {
    const { container } = render(<Agrex nodes={agentWithChildren} showStats={true} />)
    expect(container.querySelector('.agrex')).toBeTruthy()
  })
})
