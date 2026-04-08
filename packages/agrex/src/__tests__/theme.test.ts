import { describe, it, expect } from 'vitest'
import { resolveTheme, themeToCSS } from '../theme/tokens'
import { darkTheme } from '../theme/dark'
import { lightTheme } from '../theme/light'

describe('resolveTheme', () => {
  it('returns dark theme by default', () => {
    expect(resolveTheme(undefined)).toEqual(darkTheme)
  })

  it('resolves "dark" string', () => {
    expect(resolveTheme('dark')).toEqual(darkTheme)
  })

  it('resolves "light" string', () => {
    expect(resolveTheme('light')).toEqual(lightTheme)
  })

  it('merges custom theme over dark defaults', () => {
    const custom = resolveTheme({ background: '#111', accent: '#ff0' })
    expect(custom.background).toBe('#111')
    expect(custom.accent).toBe('#ff0')
    expect(custom.foreground).toBe(darkTheme.foreground) // inherited
  })
})

describe('themeToCSS', () => {
  it('maps theme to CSS variables', () => {
    const vars = themeToCSS(darkTheme)
    expect(vars['--agrex-bg']).toBe(darkTheme.background)
    expect(vars['--agrex-fg']).toBe(darkTheme.foreground)
    expect(vars['--agrex-status-running']).toBe(darkTheme.statusRunning)
    expect(vars['--agrex-font-mono']).toBe(darkTheme.fontMono)
  })
})
