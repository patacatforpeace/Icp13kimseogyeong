import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setFixedToday, isValidISO } from './lib/date';

// Debug hook for testing other dates: ?today=2027-01-15
try {
  const t = new URLSearchParams(location.search).get('today');
  if (t && isValidISO(t)) setFixedToday(t);
} catch {
  /* ignore */
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 560 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>화면을 그리는 중 오류가 발생했습니다.</h1>
        <p style={{ color: '#737373', marginTop: 8 }}>저장된 데이터는 그대로 남아 있습니다. 새로고침해 보세요.</p>
        <pre style={{ marginTop: 16, fontSize: 12, whiteSpace: 'pre-wrap', color: '#DC2626' }}>{String(this.state.error.message)}</pre>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
