import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging but don't alert
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Only log useState-related errors for specific debugging
    if (error.message?.includes('useState') || error.message?.includes('reading \'useState\'')) {
      console.error('React Hook Error detected:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI with retry functionality
      return this.props.fallback || (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-gray-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4 text-sm">
              The app encountered an error. This is usually temporary.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                // Force a page reload if error persists
                if (this.state.error?.message?.includes('useState')) {
                  window.location.reload();
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;