import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface OutputNodeData { label: string; status: NodeStatus; [key: string]: unknown }
type OutputNodeType = Node<OutputNodeData, 'output'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function OutputNode({ data }: NodeProps<OutputNodeType>) {
  const { label, status } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const S = 48
  const H = Math.round((S * 2) / Math.sqrt(3))
  return (
    <NodeTooltip label={label}>
      <div style={{ position: 'relative', width: S, height: H }}>
        <NodeHandles />
        <svg width={S} height={H} viewBox={`0 0 ${S} ${H}`} style={{
          position: 'absolute', top: 0, left: 0, overflow: 'visible',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          animation: isRunning ? 'agrex-running-drop 1.5s ease-in-out infinite' : undefined,
        }}>
          <path d="M 19.6,3.4 Q 24,1 28.4,3.4 L 42.6,11.3 Q 47,13.75 47,18.75 L 47,36.25 Q 47,41.25 42.6,43.7 L 28.4,51.6 Q 24,54 19.6,51.6 L 5.4,43.7 Q 1,41.25 1,36.25 L 1,18.75 Q 1,13.75 5.4,11.3 Z"
            fill="var(--agrex-node-fill)" stroke={border} strokeWidth="1.5" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--agrex-node-icon)" strokeWidth="2" strokeLinecap="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
      </div>
    </NodeTooltip>
  )
}
