import { type NodeProps, type Node } from '@xyflow/react'
import { Search } from 'lucide-react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface SearchNodeData { label: string; status: NodeStatus; [key: string]: unknown }
type SearchNodeType = Node<SearchNodeData, 'search'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function SearchNode({ data }: NodeProps<SearchNodeType>) {
  const { label, status } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  return (
    <NodeTooltip label={label || 'Search'}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', border: `1px solid ${border}`,
        background: 'var(--agrex-node-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
      }}>
        <NodeHandles />
        <Search size={14} style={{ color: 'var(--agrex-node-icon)' }} />
      </div>
    </NodeTooltip>
  )
}
