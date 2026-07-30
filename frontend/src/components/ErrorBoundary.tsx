import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);

    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Loading chunk');

    if (isChunkError) {
      const storageKey = 'last_chunk_error_reload';
      const now = Date.now();
      const lastReload = Number(sessionStorage.getItem(storageKey) || 0);
      if (now - lastReload > 10000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-950/50 border border-red-800/50 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Application Notice</h2>
              <p className="text-sm text-slate-400">
                An unexpected issue occurred while rendering this page. You can reload or return home.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-slate-950/80 rounded-xl text-left border border-slate-800/80">
                  <p className="text-[11px] font-mono text-red-400 line-clamp-3 break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={this.handleHome}
                className="w-full border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl"
              >
                <Home className="w-4 h-4 mr-2" /> Home
              </Button>
              <Button
                onClick={this.handleReload}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-950/50"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
