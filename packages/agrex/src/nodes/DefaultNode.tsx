import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface DefaultNodeData { label: string; status: NodeStatus; icon?: React.ComponentType<{ size: number }>; [key: string]: unknown }
type DefaultNodeType = Node<DefaultNodeData, string>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function DefaultNode({ data }: NodeProps<DefaultNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  return (
    <NodeTooltip label={label}>
      <div style={{
        width: 48, height: 48, border: `1.5px solid ${border}`, borderRadius: 8,
        background: 'var(--agrex-node-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
      }}>
        <NodeHandles />
        {Icon ? <Icon size={24} /> : <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--agrex-fg)', opacity: 0.5 }}>{label.charAt(0).toUpperCase()}</span>}
      </div>
    </NodeTooltip>
  )
}
