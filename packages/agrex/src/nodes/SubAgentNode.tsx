import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface SubAgentNodeData { label: string; status: NodeStatus; icon?: React.ComponentType<{ size: number }>; [key: string]: unknown }
type SubAgentNodeType = Node<SubAgentNodeData, 'sub_agent'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function SubAgentNode({ data }: NodeProps<SubAgentNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  return (
    <NodeTooltip label={label}>
      <div style={{
        width: 56, height: 56, border: `2px solid ${border}`, borderRadius: 6,
        background: 'var(--agrex-node-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
      }}>
        <NodeHandles />
        {Icon ? <Icon size={28} /> : <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--agrex-fg)', opacity: 0.6 }}>{label.charAt(0).toUpperCase()}</span>}
      </div>
    </NodeTooltip>
  )
}
