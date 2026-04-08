import type { ComponentType } from 'react'
import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import { statusColor } from './statusColor'
import type { NodeStatus } from '../types'

interface DefaultNodeData {
  label: string
  status: NodeStatus
  icon?: ComponentType<{ size: number }>
  [key: string]: unknown
}
type DefaultNodeType = Node<DefaultNodeData, string>

export default function DefaultNode({ data }: NodeProps<DefaultNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  return (
    <NodeTooltip label={label}>
      <div
        role="treeitem"
        aria-label={`${label} — ${status}`}
        style={{
          width: 48,
          height: 48,
          border: `1.5px solid ${border}`,
          borderRadius: 8,
          background: 'var(--agrex-node-fill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <NodeHandles />
        {Icon ? (
          <Icon size={24} />
        ) : (
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--agrex-fg)', opacity: 0.5 }}>
            {label.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </NodeTooltip>
  )
}
