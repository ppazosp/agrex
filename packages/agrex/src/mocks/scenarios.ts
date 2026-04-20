import type { AgrexNode, AgrexEdge } from '../types'

interface Scenario {
  nodes: AgrexNode[]
  edges: AgrexEdge[]
}

function researchAgent(): Scenario {
  const nodes: AgrexNode[] = [
    {
      id: 'root',
      type: 'agent',
      label: 'Researcher',
      status: 'done',
      metadata: {
        tokens: 12480,
        cost: 0.0623,
        input: 'Write a short brief on decision-making theories in behavioral economics.',
        output:
          'Synthesized a three-page brief covering prospect theory, game theory, and bounded rationality; attached research.md.',
      },
    },
    {
      id: 'ws1',
      type: 'tool',
      label: 'web_search',
      parentId: 'root',
      status: 'done',
      metadata: {
        tokens: 480,
        args: { query: 'prospect theory', top_k: 5 },
        output: [
          { title: 'Kahneman & Tversky (1979)', url: 'https://www.jstor.org/stable/1914185' },
          { title: 'Prospect Theory — Wikipedia', url: 'https://en.wikipedia.org/wiki/Prospect_theory' },
          { title: 'Thinking, Fast and Slow (summary)', url: 'https://example.com/tfs' },
        ],
      },
    },
    {
      id: 'ws2',
      type: 'tool',
      label: 'web_search',
      parentId: 'root',
      status: 'done',
      metadata: {
        tokens: 420,
        args: { query: 'game theory', top_k: 5 },
        output: '5 results (Nash equilibrium, mechanism design, repeated games, …)',
      },
    },
    {
      id: 'ws3',
      type: 'tool',
      label: 'web_search',
      parentId: 'root',
      status: 'done',
      metadata: {
        tokens: 390,
        args: { query: 'bounded rationality', top_k: 5 },
        output: '5 results (Simon 1955, satisficing, heuristics & biases, …)',
      },
    },
    {
      id: 'wf1',
      type: 'tool',
      label: 'write_file',
      parentId: 'root',
      status: 'done',
      writes: ['f1'],
      metadata: {
        args: { path: 'research.md', bytes: 4812 },
        output: 'wrote 4812 bytes to research.md',
      },
    },
    {
      id: 'f1',
      type: 'file',
      label: 'research.md',
      parentId: 'wf1',
      status: 'done',
      metadata: { path: 'research.md', bytes: 4812 },
    },
    {
      id: 'o1',
      type: 'file',
      label: 'research_output.md',
      parentId: 'root',
      status: 'done',
      metadata: { path: 'research_output.md', bytes: 7184 },
    },
  ]
  return { nodes, edges: [] }
}

function multiAgent(): Scenario {
  const nodes: AgrexNode[] = [
    {
      id: 'orchestrator',
      type: 'agent',
      label: 'Orchestrator',
      status: 'done',
      metadata: {
        tokens: 3120,
        cost: 0.0156,
        input: 'Produce a market report on EV adoption in the EU.',
        output: 'Spawned Researcher → Analyst → Writer; final report at report.md.',
      },
    },
    {
      id: 'researcher',
      type: 'agent',
      label: 'Researcher',
      parentId: 'orchestrator',
      status: 'done',
      metadata: {
        tokens: 8640,
        cost: 0.0432,
        input: 'Gather EV registration stats for the last 3 years across EU member states.',
        output: 'Saved normalized dataset to data.json.',
      },
    },
    {
      id: 'analyst',
      type: 'agent',
      label: 'Analyst',
      parentId: 'orchestrator',
      status: 'done',
      metadata: {
        tokens: 6210,
        cost: 0.031,
        input: 'Analyze data.json and surface 5 key trends.',
        output: 'Wrote analysis.md with trend breakdown.',
      },
    },
    {
      id: 'writer',
      type: 'agent',
      label: 'Writer',
      parentId: 'orchestrator',
      status: 'done',
      metadata: {
        tokens: 4890,
        cost: 0.0244,
        input: 'Write a 1-page executive summary from analysis.md.',
        output: 'Produced report.md (executive summary).',
      },
    },
    {
      id: 'r-ws1',
      type: 'tool',
      label: 'web_search',
      parentId: 'researcher',
      status: 'done',
      metadata: {
        tokens: 520,
        args: { query: 'EU EV registrations 2022', top_k: 10 },
        output: '10 results (ACEA reports, Eurostat tables, …)',
      },
    },
    {
      id: 'r-ws2',
      type: 'tool',
      label: 'web_search',
      parentId: 'researcher',
      status: 'done',
      metadata: {
        tokens: 510,
        args: { query: 'EU EV registrations 2023', top_k: 10 },
        output: '10 results (ACEA reports, Eurostat tables, …)',
      },
    },
    {
      id: 'r-wf',
      type: 'tool',
      label: 'write_file',
      parentId: 'researcher',
      status: 'done',
      writes: ['r-f1'],
      metadata: {
        args: { path: 'data.json', bytes: 18240 },
        output: 'wrote 18240 bytes to data.json',
      },
    },
    {
      id: 'r-f1',
      type: 'file',
      label: 'data.json',
      parentId: 'r-wf',
      status: 'done',
      metadata: { path: 'data.json', bytes: 18240 },
    },
    {
      id: 'a-rf',
      type: 'tool',
      label: 'read_file',
      parentId: 'analyst',
      status: 'done',
      reads: ['r-f1'],
      metadata: {
        args: { path: 'data.json' },
        output: 'read 18240 bytes from data.json',
      },
    },
    {
      id: 'a-wf',
      type: 'tool',
      label: 'write_file',
      parentId: 'analyst',
      status: 'done',
      writes: ['a-f1'],
      metadata: {
        args: { path: 'analysis.md', bytes: 6120 },
        output: 'wrote 6120 bytes to analysis.md',
      },
    },
    {
      id: 'a-f1',
      type: 'file',
      label: 'analysis.md',
      parentId: 'a-wf',
      status: 'done',
      metadata: { path: 'analysis.md', bytes: 6120 },
    },
    {
      id: 'w-rf',
      type: 'tool',
      label: 'read_file',
      parentId: 'writer',
      status: 'done',
      reads: ['a-f1'],
      metadata: {
        args: { path: 'analysis.md' },
        output: 'read 6120 bytes from analysis.md',
      },
    },
    {
      id: 'w-wf',
      type: 'tool',
      label: 'write_file',
      parentId: 'writer',
      status: 'done',
      writes: ['w-o1'],
      metadata: {
        args: { path: 'report.md', bytes: 2840 },
        output: 'wrote 2840 bytes to report.md',
      },
    },
    {
      id: 'w-o1',
      type: 'file',
      label: 'report.md',
      parentId: 'writer',
      status: 'done',
      metadata: { path: 'report.md', bytes: 2840 },
    },
  ]
  return { nodes, edges: [] }
}

function deepChain(): Scenario {
  const nodes: AgrexNode[] = [
    {
      id: 'a0',
      type: 'agent',
      label: 'Coordinator',
      status: 'done',
      metadata: {
        tokens: 2200,
        cost: 0.011,
        input: 'Build and validate a small Python pipeline.',
        output: 'Delegated to Planner → Executor → Validator.',
      },
    },
    {
      id: 'a1',
      type: 'sub_agent',
      label: 'Planner',
      parentId: 'a0',
      status: 'done',
      metadata: {
        tokens: 1840,
        input: 'Plan the build steps.',
        output: '3-step plan: scaffold, test, ship.',
      },
    },
    {
      id: 'a2',
      type: 'sub_agent',
      label: 'Executor',
      parentId: 'a1',
      status: 'done',
      metadata: {
        tokens: 3460,
        input: 'Execute the plan.',
        output: 'Wrote output.py and ran tests.',
      },
    },
    {
      id: 'a3',
      type: 'sub_agent',
      label: 'Validator',
      parentId: 'a2',
      status: 'done',
      metadata: {
        tokens: 1520,
        input: 'Validate output.py results.',
        output: 'All validation checks passed.',
      },
    },
    {
      id: 't1',
      type: 'tool',
      label: 'web_search',
      parentId: 'a1',
      status: 'done',
      metadata: {
        args: { query: 'python project scaffolding' },
        output: 'Top result: src-layout with pyproject.toml.',
      },
    },
    {
      id: 't2',
      type: 'tool',
      label: 'run_tests',
      parentId: 'a2',
      status: 'done',
      metadata: {
        args: { cmd: 'pytest -q' },
        output: '12 passed, 0 failed in 1.42s',
      },
    },
    {
      id: 't3',
      type: 'tool',
      label: 'write_file',
      parentId: 'a2',
      status: 'done',
      writes: ['f1'],
      metadata: {
        args: { path: 'output.py', bytes: 742 },
        output: 'wrote 742 bytes to output.py',
      },
    },
    {
      id: 'f1',
      type: 'file',
      label: 'output.py',
      parentId: 't3',
      status: 'done',
      metadata: { path: 'output.py', bytes: 742 },
    },
    {
      id: 's1',
      type: 'tool',
      label: 'search',
      parentId: 'a3',
      status: 'done',
      metadata: {
        args: { query: 'validation rules' },
        output: '3 rule sets found (schema, semantic, performance).',
      },
    },
    {
      id: 'o1',
      type: 'file',
      label: 'result.json',
      parentId: 'a3',
      status: 'done',
      metadata: { path: 'result.json', bytes: 412 },
    },
  ]
  return { nodes, edges: [] }
}

const SCENARIOS: Record<string, () => Scenario> = {
  'research-agent': researchAgent,
  'multi-agent': multiAgent,
  'deep-chain': deepChain,
}

export function createMockPipeline(name: 'research-agent' | 'multi-agent' | 'deep-chain'): Scenario {
  return SCENARIOS[name]()
}
