import { type NodeProps, type Node } from '@xyflow/react'
import type { ComponentType } from 'react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import { statusColor } from './statusColor'
import type { NodeStatus } from '../types'

function WrenchIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

interface ToolNodeData {
  label: string
  status: NodeStatus
  icon?: ComponentType<{ size: number }>
  [key: string]: unknown
}
type ToolNodeType = Node<ToolNodeData, 'tool'>

export default function ToolNode({ data }: NodeProps<ToolNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const Ic = Icon ?? WrenchIcon
  return (
    <NodeTooltip label={label}>
      <div
        role="treeitem"
        aria-label={`${label} tool — ${status}`}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: `2px solid ${border}`,
          background: 'var(--agrex-node-fill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--agrex-node-icon)',
          animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <NodeHandles />
        <Ic size={16} />
      </div>
    </NodeTooltip>
  )
}
