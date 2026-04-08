interface BadgeProps {
  text: string
  color?: string
}

export default function NodeBadge({ text, color }: BadgeProps) {
  return (
    <div style={{
      position: 'absolute', top: -6, right: -6, zIndex: 10,
      background: color ?? 'var(--agrex-node-fill)',
      border: '1px solid var(--agrex-node-border)',
      borderRadius: 8, padding: '0 5px', fontSize: 9, lineHeight: '16px',
      color: 'var(--agrex-fg)', opacity: 0.7, whiteSpace: 'nowrap',
      fontFamily: 'var(--agrex-font-mono)',
    }}>
      {text}
    </div>
  )
}
