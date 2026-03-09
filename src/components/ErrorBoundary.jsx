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
          backgroundColor: '#F6F9FC',
          color: '#0A2540',
          minHeight: '100vh'
        }}>
          <h1 style={{ color: '#DC2626', marginBottom: '20px' }}>
            Something went wrong
          </h1>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #E2E8F0'
          }}>
            <h3 style={{ color: '#0A2540', marginBottom: '10px' }}>Error:</h3>
            <pre style={{
              color: '#DC2626',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '14px'
            }}>
              {this.state.error?.toString()}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <h3 style={{ color: '#0A2540', marginBottom: '10px' }}>Stack Trace:</h3>
              <pre style={{
                color: '#64748B',
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
              backgroundColor: '#635BFF',
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
