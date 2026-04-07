import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface FileNodeData { label: string; status: NodeStatus; [key: string]: unknown }
type FileNodeType = Node<FileNodeData, 'file'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function FileNode({ data }: NodeProps<FileNodeType>) {
  const { label, status } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const S = 46
  return (
    <NodeTooltip label={label}>
      <div style={{ position: 'relative', width: S, height: S }}>
        <NodeHandles />
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{
          position: 'absolute', top: 0, left: 0, overflow: 'visible',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          animation: isRunning ? 'agrex-running-drop 1.5s ease-in-out infinite' : undefined,
        }}>
          <path d="M 19.5,4.5 Q 23,1 26.5,4.5 L 41.5,19.5 Q 45,23 41.5,26.5 L 26.5,41.5 Q 23,45 19.5,41.5 L 4.5,26.5 Q 1,23 4.5,19.5 Z"
            fill="var(--agrex-node-fill)" stroke={border} strokeWidth="1" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--agrex-node-icon)" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="9" x2="18" y2="9" /><line x1="6" y1="13" x2="18" y2="13" /><line x1="6" y1="17" x2="14" y2="17" />
          </svg>
        </div>
      </div>
    </NodeTooltip>
  )
}
