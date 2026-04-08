import type { ResolvedTheme, Theme } from '../types'
import { darkTheme } from './dark'
import { lightTheme } from './light'

function prefersDark(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true
}

export function resolveTheme(theme: Theme | undefined): ResolvedTheme {
  if (!theme || theme === 'dark') return darkTheme
  if (theme === 'light') return lightTheme
  if (theme === 'auto') return prefersDark() ? darkTheme : lightTheme
  return { ...darkTheme, ...theme }
}

export function themeToCSS(theme: ResolvedTheme): Record<string, string> {
  return {
    '--agrex-bg': theme.background,
    '--agrex-fg': theme.foreground,
    '--agrex-accent': theme.accent,
    '--agrex-node-fill': theme.nodeFill,
    '--agrex-node-border': theme.nodeBorder,
    '--agrex-node-icon': theme.nodeIcon,
    '--agrex-edge-default': theme.edgeDefault,
    '--agrex-edge-spawn': theme.edgeSpawn,
    '--agrex-edge-write': theme.edgeWrite,
    '--agrex-edge-read': theme.edgeRead,
    '--agrex-status-running': theme.statusRunning,
    '--agrex-status-done': theme.statusDone,
    '--agrex-status-error': theme.statusError,
    '--agrex-font': theme.fontFamily,
    '--agrex-font-mono': theme.fontMono,
    '--agrex-anim-duration': theme.animationDuration,
  }
}
