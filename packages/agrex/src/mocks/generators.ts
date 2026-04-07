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

export function resetMockCounter() {
  counter = 0
}
