/**
 * Auth provider for Clerk + React (Vite).
 *
 * Setup: add VITE_CLERK_PUBLISHABLE_KEY to .env.local
 * Get your key at: https://dashboard.clerk.com/~/api-keys (choose "React")
 *
 * Docs: https://clerk.com/docs/react/getting-started/quickstart
 *
 * If the key is not set, the app runs in anonymous-only mode via an error
 * boundary fallback — all features work except auth.
 */

import { createContext, useContext, Component, type ReactNode } from 'react';
import {
  ClerkProvider,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  Show,
  UserButton,
  SignInButton,
  SignUpButton,
} from '@clerk/react';

export { Show, UserButton, SignInButton, SignUpButton };

// Safe useUser wrapper — returns { user: null, isLoaded: true } when
// ClerkProvider is not in the tree (no publishable key / anonymous mode).
const NO_USER = { isLoaded: true as const, isSignedIn: false as const, user: null };
export function useUser() {
  try {
    return useClerkUser();
  } catch {
    return NO_USER;
  }
}

// ── Auth context (works with or without Clerk) ──────────────────────

interface AuthContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  isLoaded: true,
  getToken: async () => null,
});

export function useAppAuth() {
  return useContext(AuthContext);
}

// ── Error boundary: graceful fallback if Clerk fails ────────────────

const NO_AUTH: AuthContextType = { isSignedIn: false, isLoaded: true, getToken: async () => null };

class ClerkErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[Auth] Clerk failed to initialize — running in anonymous mode.', error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ── Bridge: reads Clerk hooks → feeds our context ───────────────────

function ClerkBridge({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useClerkAuth();
  return (
    <AuthContext.Provider value={{ isSignedIn: !!isSignedIn, isLoaded, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Provider (used in main.tsx) ─────────────────────────────────────

// VITE_CLERK_PUBLISHABLE_KEY from .env.local or .env
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: ReactNode }) {
  const noAuthFallback = (
    <AuthContext.Provider value={NO_AUTH}>
      {children}
    </AuthContext.Provider>
  );

  // If no key is configured, skip Clerk entirely — anonymous-only mode.
  if (!PUBLISHABLE_KEY) {
    return noAuthFallback;
  }

  // Error boundary catches runtime Clerk errors (invalid key, network, etc.)
  return (
    <ClerkErrorBoundary fallback={noAuthFallback}>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <ClerkBridge>{children}</ClerkBridge>
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
}
