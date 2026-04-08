import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import AgrexErrorBoundary from '../components/ErrorBoundary'

function ThrowingChild(): React.ReactNode {
  throw new Error('test render error')
}

function GoodChild() {
  return <div data-testid="child">ok</div>
}

describe('AgrexErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByTestId } = render(
      <AgrexErrorBoundary>
        <GoodChild />
      </AgrexErrorBoundary>,
    )
    expect(getByTestId('child').textContent).toBe('ok')
  })

  it('renders fallback when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <AgrexErrorBoundary>
        <ThrowingChild />
      </AgrexErrorBoundary>,
    )
    expect(container.textContent).toContain('agrex: render error')
    consoleSpy.mockRestore()
  })

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AgrexErrorBoundary>
        <ThrowingChild />
      </AgrexErrorBoundary>,
    )
    expect(consoleSpy).toHaveBeenCalledWith('[agrex] Render error:', expect.any(Error), expect.any(String))
    consoleSpy.mockRestore()
  })
})
