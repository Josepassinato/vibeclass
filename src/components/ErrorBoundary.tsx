import React from 'react';
import * as Sentry from '@sentry/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RotateCcw } from 'lucide-react';

interface ErrorFallbackProps {
  onRetry: () => void;
}

function ErrorFallback({ onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
          <CardTitle className="text-lg">Algo deu errado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Ocorreu um erro inesperado. Tente novamente ou volte ao painel.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Tentar novamente
            </Button>
            <Button variant="default" size="sm" onClick={() => window.location.href = '/'}>
              <Home className="w-4 h-4 mr-1.5" />
              Voltar ao painel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Component crash:', error, errorInfo);
    Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack || '' } } });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorFallback onRetry={() => this.setState({ hasError: false })} />
      );
    }
    return this.props.children;
  }
}
