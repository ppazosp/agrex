import type { ResolvedTheme } from '../types'

export const lightTheme: ResolvedTheme = {
  background: '#ffffff',
  foreground: '#111111',
  accent: '#2563eb',
  nodeFill: '#f8f8f8',
  nodeBorder: 'rgba(0,0,0,0.15)',
  nodeIcon: 'rgba(0,0,0,0.6)',
  edgeDefault: 'rgba(0,0,0,0.25)',
  edgeSpawn: 'rgba(0,0,0,0.25)',
  edgeWrite: 'rgba(217,119,6,0.5)',
  edgeRead: 'rgba(14,116,144,0.5)',
  statusRunning: '#d97706',
  statusDone: '#16a34a',
  statusError: '#dc2626',
  fontFamily: 'system-ui, sans-serif',
  fontMono: "'SF Mono', 'Monaco', monospace",
  animationDuration: '1.5s',
}
