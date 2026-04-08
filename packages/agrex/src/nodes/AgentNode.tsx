import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import type { NodeStatus } from '../types'

interface AgentNodeData { label: string; status: NodeStatus; icon?: React.ComponentType<{ size: number }>; collapsed?: boolean; childCount?: number; childrenAllDone?: boolean; [key: string]: unknown }
type AgentNodeType = Node<AgentNodeData, 'agent'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

export default function AgentNode({ data }: NodeProps<AgentNodeType>) {
  const { label, status, icon: Icon, collapsed, childCount, childrenAllDone } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  return (
    <NodeTooltip label={label}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 80, height: 80, border: `2px solid ${border}`, borderRadius: 8,
          background: 'var(--agrex-node-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}>
          <NodeHandles />
          {Icon ? <Icon size={40} /> : <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--agrex-node-icon)' }}>{label.charAt(0).toUpperCase()}</span>}
        </div>
        {childCount != null && (() => {
          const badgeColor = collapsed
            ? (childrenAllDone ? 'var(--agrex-status-done)' : 'var(--agrex-status-running)')
            : 'var(--agrex-node-border)'
          return (
            <div style={{
              position: 'absolute', top: -8, right: -8, zIndex: 10,
              width: 20, height: 20, borderRadius: '50%',
              background: collapsed ? badgeColor : 'var(--agrex-node-fill)',
              border: `1.5px solid ${badgeColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: collapsed ? '#fff' : 'var(--agrex-fg)',
            }}>
              {childCount}
            </div>
          )
        })()}
      </div>
    </NodeTooltip>
  )
}
