import * as React from "react"

interface Props {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, error: null }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-theme-base text-theme-text">
                    <div className="w-full max-w-md text-center space-y-6">
                        <div className="inline-flex p-4 bg-red-500/10 rounded-full border border-red-500/20">
                            <span className="material-icons-round text-5xl text-red-400">error_outline</span>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Error inesperado</h1>
                            <p className="text-theme-muted text-sm leading-relaxed">
                                Ocurrió un problema al mostrar esta página.
                                Tu información está segura.
                            </p>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-theme-accent1-600 text-white font-semibold rounded-xl hover:brightness-110 transition-all active:scale-95"
                        >
                            <span className="material-icons-round text-lg">refresh</span>
                            Reintentar
                        </button>

                        {import.meta.env.DEV && this.state.error && (
                            <details className="text-left mt-6 p-4 bg-theme-card rounded-xl border border-theme-border">
                                <summary className="text-sm font-medium text-theme-muted cursor-pointer">
                                    Detalles del error
                                </summary>
                                <pre className="mt-3 text-xs text-red-400 whitespace-pre-wrap font-mono leading-relaxed">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
