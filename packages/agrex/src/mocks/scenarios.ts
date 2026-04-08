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
    { id: 'wf1', type: 'tool', label: 'write_file', parentId: 'root', status: 'done', writes: ['f1'] },
    { id: 'f1', type: 'file', label: 'research.md', parentId: 'wf1', status: 'done', metadata: { path: 'research.md' } },
    { id: 'o1', type: 'file', label: 'research_output.md', parentId: 'root', status: 'done' },
  ]
  const edges: AgrexEdge[] = [
    { id: 'root-ws1', source: 'root', target: 'ws1' },
    { id: 'root-ws2', source: 'root', target: 'ws2' },
    { id: 'root-ws3', source: 'root', target: 'ws3' },
    { id: 'root-wf1', source: 'root', target: 'wf1' },
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
    { id: 'r-wf', type: 'tool', label: 'write_file', parentId: 'researcher', status: 'done', writes: ['r-f1'] },
    { id: 'r-f1', type: 'file', label: 'data.json', parentId: 'r-wf', status: 'done' },
    { id: 'a-rf', type: 'tool', label: 'read_file', parentId: 'analyst', status: 'done', reads: ['r-f1'] },
    { id: 'a-wf', type: 'tool', label: 'write_file', parentId: 'analyst', status: 'done', writes: ['a-f1'] },
    { id: 'a-f1', type: 'file', label: 'analysis.md', parentId: 'a-wf', status: 'done' },
    { id: 'w-rf', type: 'tool', label: 'read_file', parentId: 'writer', status: 'done', reads: ['a-f1'] },
    { id: 'w-wf', type: 'tool', label: 'write_file', parentId: 'writer', status: 'done', writes: ['w-o1'] },
    { id: 'w-o1', type: 'file', label: 'report.md', parentId: 'writer', status: 'done' },
  ]
  const edges: AgrexEdge[] = [
    { id: 'o-r', source: 'orchestrator', target: 'researcher' },
    { id: 'o-a', source: 'orchestrator', target: 'analyst' },
    { id: 'o-w', source: 'orchestrator', target: 'writer' },
    { id: 'r-ws1-e', source: 'researcher', target: 'r-ws1' },
    { id: 'r-ws2-e', source: 'researcher', target: 'r-ws2' },
    { id: 'r-wf-e', source: 'researcher', target: 'r-wf' },
    { id: 'a-rf-e', source: 'analyst', target: 'a-rf' },
    { id: 'a-wf-e', source: 'analyst', target: 'a-wf' },
    { id: 'w-rf-e', source: 'writer', target: 'w-rf' },
    { id: 'w-wf-e', source: 'writer', target: 'w-wf' },
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
    { id: 't3', type: 'tool', label: 'write_file', parentId: 'a2', status: 'done', writes: ['f1'] },
    { id: 'f1', type: 'file', label: 'output.py', parentId: 't3', status: 'done' },
    { id: 's1', type: 'tool', label: 'search', parentId: 'a3', status: 'done', metadata: { query: 'validation rules' } },
    { id: 'o1', type: 'file', label: 'result.json', parentId: 'a3', status: 'done' },
  ]
  const edges: AgrexEdge[] = [
    { id: 'a0-a1', source: 'a0', target: 'a1' },
    { id: 'a1-a2', source: 'a1', target: 'a2' },
    { id: 'a2-a3', source: 'a2', target: 'a3' },
    { id: 'a1-t1', source: 'a1', target: 't1' },
    { id: 'a2-t2', source: 'a2', target: 't2' },
    { id: 'a2-t3', source: 'a2', target: 't3' },
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
