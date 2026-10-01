import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <pre className="text-sm text-red-300 max-w-2xl whitespace-pre-wrap">{this.state.error.message}</pre>
        <button onClick={() => location.reload()} className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-lg">Reload</button>
      </div>
    );
  }
}

// No <StrictMode>: its dev-only double-mount leaves Sandpack's preview stuck on "loading".
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
