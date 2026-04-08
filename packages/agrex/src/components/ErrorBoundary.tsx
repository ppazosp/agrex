import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  resetKey?: string | number
}

interface State {
  error: Error | null
}

export default class AgrexErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    // Reset error state when resetKey changes, allowing recovery from transient errors
    if (state.error && props.resetKey !== undefined) {
      return { error: null }
    }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[agrex] Render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', color: '#888', fontSize: 13,
        }}>
          <span>agrex: render error — check console</span>
        </div>
      )
    }
    return this.props.children
  }
}
