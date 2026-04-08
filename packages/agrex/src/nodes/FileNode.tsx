import { type NodeProps, type Node } from '@xyflow/react'
import type { ComponentType } from 'react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import { statusColor } from './statusColor'
import type { NodeStatus } from '../types'

interface FileNodeData {
  label: string
  status: NodeStatus
  icon?: ComponentType<{ size: number }>
  [key: string]: unknown
}
type FileNodeType = Node<FileNodeData, 'file'>

export default function FileNode({ data }: NodeProps<FileNodeType>) {
  const { label, status, icon: Icon } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const S = 48
  const H = Math.round((S * 2) / Math.sqrt(3))
  return (
    <NodeTooltip label={label}>
      <div
        role="treeitem"
        aria-label={`${label} file — ${status}`}
        style={{ position: 'relative', width: S, height: H }}
      >
        <NodeHandles />
        <svg
          width={S}
          height={H}
          viewBox={`0 0 ${S} ${H}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible',
            animation: isRunning ? 'agrex-running-drop 1.5s ease-in-out infinite' : undefined,
          }}
        >
          <path
            d="M 19.6,3.4 Q 24,1 28.4,3.4 L 42.6,11.3 Q 47,13.75 47,18.75 L 47,36.25 Q 47,41.25 42.6,43.7 L 28.4,51.6 Q 24,54 19.6,51.6 L 5.4,43.7 Q 1,41.25 1,36.25 L 1,18.75 Q 1,13.75 5.4,11.3 Z"
            fill="var(--agrex-node-fill)"
            stroke={border}
            strokeWidth="2"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--agrex-node-icon)',
          }}
        >
          {Icon ? (
            <Icon size={16} />
          ) : (
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="6" y1="9" x2="18" y2="9" />
              <line x1="6" y1="13" x2="18" y2="13" />
              <line x1="6" y1="17" x2="14" y2="17" />
            </svg>
          )}
        </div>
      </div>
    </NodeTooltip>
  )
}
