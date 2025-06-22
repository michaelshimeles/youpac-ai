import React from 'react';
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">Something went wrong</h1>
                <p className="text-muted-foreground">
                  We encountered an unexpected error. Don't worry, your work has been saved.
                </p>
              </div>

              {this.state.error && (
                <Card className="w-full p-4 bg-muted/50">
                  <p className="text-sm font-mono text-left">
                    {this.state.error.message}
                  </p>
                </Card>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
                <Button
                  onClick={this.handleReset}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-4">
                If this issue persists, please contact support
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}