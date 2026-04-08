import { type NodeProps, type Node } from '@xyflow/react'
import { Wrench } from 'lucide-react'
import type { ComponentType } from 'react'
import NodeHandles from './NodeHandles'
import NodeTooltip from './NodeTooltip'
import NodeBadge from './NodeBadge'
import type { NodeStatus } from '../types'

interface ToolNodeData { label: string; status: NodeStatus; icon?: ComponentType<{ size: number }>; elapsed?: string; tokens?: number; cost?: number; [key: string]: unknown }
type ToolNodeType = Node<ToolNodeData, 'tool'>

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

export default function ToolNode({ data }: NodeProps<ToolNodeType>) {
  const { label, status, icon: Icon, elapsed, tokens, cost } = data
  const border = statusColor(status)
  const isRunning = status === 'running'
  const Ic = Icon ?? Wrench
  return (
    <NodeTooltip label={label}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', border: `1px solid ${border}`,
          background: 'var(--agrex-node-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: isRunning ? 'agrex-running-ring 1.5s ease-in-out infinite' : undefined,
        }}>
          <NodeHandles />
          <Ic size={16} />
        </div>
        {elapsed && <NodeBadge text={elapsed} />}
        {tokens != null && !elapsed && <NodeBadge text={`${formatTokens(tokens)} tok`} />}
        {cost != null && !tokens && !elapsed && <NodeBadge text={`$${cost.toFixed(4)}`} />}
      </div>
    </NodeTooltip>
  )
}
