import type { ResolvedTheme } from '../types'

export const darkTheme: ResolvedTheme = {
  background: '#000000',
  foreground: '#ffffff',
  accent: '#4a9eff',
  nodeFill: '#0d0d0d',
  nodeBorder: 'rgba(255,255,255,0.15)',
  nodeIcon: 'rgba(255,255,255,0.7)',
  edgeDefault: 'rgba(255,255,255,0.35)',
  edgeSpawn: 'rgba(255,255,255,0.35)',
  edgeWrite: 'rgba(251,191,36,0.35)',
  edgeRead: 'rgba(56,189,248,0.35)',
  statusRunning: '#f59e0b',
  statusDone: '#22c55e',
  statusError: '#ef4444',
  fontFamily: 'system-ui, sans-serif',
  fontMono: "'SF Mono', 'Monaco', monospace",
  animationDuration: '1.5s',
}
