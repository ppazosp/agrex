import { type NodeProps, type Node } from '@xyflow/react'
import { Wrench } from 'lucide-react'
import type { ComponentType } from 'react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface ToolNodeData { label: string; status: NodeStatus; icon?: ComponentType<{ size: number }>; [key: string]: unknown }
type ToolNodeType = Node<ToolNodeData, 'tool'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function ToolNode({ data }: NodeProps<ToolNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const Ic = Icon ?? Wrench
  return (
    <NodeTooltip label={label}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', border: `2px solid ${border}`,
        background: 'var(--agrex-node-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--agrex-node-icon)',
        animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
      }}>
        <NodeHandles />
        <Ic size={16} />
      </div>
    </NodeTooltip>
  )
}
