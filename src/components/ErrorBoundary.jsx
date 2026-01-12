import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          minHeight: '100vh'
        }}>
          <h1 style={{ color: '#ff6b6b', marginBottom: '20px' }}>
            Something went wrong
          </h1>
          <div style={{
            backgroundColor: '#16213e',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#ffd93d', marginBottom: '10px' }}>Error:</h3>
            <pre style={{
              color: '#ff6b6b',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '14px'
            }}>
              {this.state.error?.toString()}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div style={{
              backgroundColor: '#16213e',
              padding: '20px',
              borderRadius: '8px'
            }}>
              <h3 style={{ color: '#ffd93d', marginBottom: '10px' }}>Stack Trace:</h3>
              <pre style={{
                color: '#a0a0a0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '12px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#4361ee',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
