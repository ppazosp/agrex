import { type NodeProps, type Node } from '@xyflow/react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import NodeBadge from './NodeBadge'
import type { NodeStatus } from '../types'

interface SubAgentNodeData { label: string; status: NodeStatus; icon?: React.ComponentType<{ size: number }>; elapsed?: string; collapsed?: boolean; tokens?: number; cost?: number; childCount?: number; [key: string]: unknown }
type SubAgentNodeType = Node<SubAgentNodeData, 'sub_agent'>

function statusColor(status: NodeStatus): string {
  if (status === 'running') return 'var(--agrex-status-running)'
  if (status === 'done') return 'var(--agrex-status-done)'
  if (status === 'error') return 'var(--agrex-status-error)'
  return 'var(--agrex-node-border)'
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function SubAgentNode({ data }: NodeProps<SubAgentNodeType>) {
  const { label, status, icon: Icon, elapsed, collapsed, tokens, cost, childCount } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  return (
    <NodeTooltip label={label}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 56, height: 56, border: `2px solid ${border}`, borderRadius: 6,
          background: 'var(--agrex-node-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}>
          <NodeHandles />
          {Icon ? <Icon size={28} /> : <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--agrex-fg)', opacity: 0.6 }}>{label.charAt(0).toUpperCase()}</span>}
        </div>
        {elapsed && <NodeBadge text={elapsed} />}
        {tokens != null && <NodeBadge text={`${formatTokens(tokens)} tok`} />}
        {cost != null && !tokens && <NodeBadge text={`$${cost.toFixed(4)}`} />}
        {collapsed && (
          <div style={{
            position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
            background: 'var(--agrex-accent)', borderRadius: 8, padding: '0 6px',
            fontSize: 9, lineHeight: '16px', color: '#fff', whiteSpace: 'nowrap',
          }}>
            {childCount ?? '+'} collapsed
          </div>
        )}
      </div>
    </NodeTooltip>
  )
}
