import React from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-3 rounded-2xl border border-rose-500/40 bg-zinc-950/95 text-rose-300 text-xs shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-foreground text-xs">
                {this.props.title || 'Widget Encountered an Issue'}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[200px]">
                {this.state.error?.message || 'Recovering state...'}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleReset}
            className="h-7 px-2.5 text-[11px] rounded-lg border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 gap-1 font-mono"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
