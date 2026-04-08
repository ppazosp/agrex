/** Node sizes per type (width × height in pixels), matching the actual node components. */
export const NODE_SIZES: Record<string, { w: number; h: number }> = {
  agent: { w: 80, h: 80 },
  sub_agent: { w: 56, h: 56 },
  tool: { w: 36, h: 36 },
  file: { w: 46, h: 46 },
  output: { w: 48, h: 56 },
  search: { w: 32, h: 32 },
}

export const DEFAULT_SIZE = { w: 48, h: 48 }
