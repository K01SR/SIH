import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Catches render errors so a single failing page cannot blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] render error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ground p-6">
          <div className="w-full max-w-md rounded-[5px] border border-line bg-panel p-8 text-center">
            <p className="label marker text-pigment">Fault</p>
            <h1 className="mt-4 font-display text-[32px] leading-none text-ink">
              Something went <em>wrong.</em>
            </h1>
            <p className="mt-4 text-[10.5px] leading-relaxed text-muted">{this.state.message}</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary mt-6">
              Reload application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
