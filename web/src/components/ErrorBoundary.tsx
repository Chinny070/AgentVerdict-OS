import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced in console for diagnostics; never silently swallowed.
    // eslint-disable-next-line no-console
    console.error("AgentVerdict OS UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel" role="alert">
          <h3>{this.props.fallbackTitle ?? "Something went wrong rendering this screen"}</h3>
          <p className="field-help mono">{this.state.error.message}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
