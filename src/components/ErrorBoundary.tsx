import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly declare properties to guarantee TypeScript compatibility
  public props!: Props;
  public state!: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  // Explicitly override or define setState for TypeScript compatibility
  public setState<K extends keyof State>(
    state: State | ((prevState: Readonly<State>, props: Readonly<Props>) => State | Pick<State, K> | null) | Pick<State, K> | null,
    callback?: () => void
  ): void {
    const parentSetState = (super.setState || (this as any).setState).bind(this);
    parentSetState(state as any, callback);
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-800 rounded-xl border border-rose-500/30 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            
            <div className="flex items-center space-x-3 text-rose-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h1 className="text-xl font-bold tracking-tight">Terjadi Kesalahan Runtime (Crash)</h1>
            </div>

            <p className="text-slate-300 text-sm mb-4">
              Aplikasi mendeteksi error runtime yang tidak terduga. Kami telah mengisolasi error ini menggunakan Error Boundary untuk mencegah halaman putih (blank white screen).
            </p>

            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-rose-300 overflow-auto max-h-60 mb-6 border border-slate-700">
              <div className="font-bold text-rose-400 mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown error'}
              </div>
              {this.state.error?.stack && (
                <pre className="whitespace-pre-wrap mt-2 text-slate-400 text-[10px] leading-relaxed">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 rounded-lg font-medium transition duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg font-medium transition duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-lg shadow-rose-950/40"
              >
                Reset Data & Cache Lokal
              </button>
            </div>

            <p className="text-slate-500 text-[10px] text-center mt-4">
              LMS Lulus.id • Modul Akademik & Integrasi Sistem Terpadu
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
