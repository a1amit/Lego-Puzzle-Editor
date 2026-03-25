import { Component, type ReactNode } from 'react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

// Lazy-load @sentry/react only when DSN is configured to avoid
// loading ~200KB of code and global patches in dev/unconfigured envs.
let sentryReady: Promise<typeof import('@sentry/react')> | null = null;

if (dsn) {
  sentryReady = import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    return Sentry;
  });
}

/**
 * Lightweight ErrorBoundary that delegates to Sentry when available,
 * otherwise acts as a plain React error boundary.
 */
class SentryErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (sentryReady) {
      sentryReady.then((Sentry) => Sentry.captureException(error, { extra: { componentStack: info.componentStack } }));
    }
    console.error('Uncaught error:', error, info);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export const Sentry = { ErrorBoundary: SentryErrorBoundary };
