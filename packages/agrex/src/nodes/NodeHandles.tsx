import { Handle, Position } from '@xyflow/react'

const S: React.CSSProperties = {
  left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
  width: 1, height: 1, opacity: 0, border: 'none', background: 'transparent', minWidth: 0, minHeight: 0,
}

export default function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="center-in" style={S} />
      <Handle type="source" position={Position.Bottom} id="center-out" style={S} />
    </>
  )
}
