import React, { useEffect, Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useAppAuth, useUser } from '../auth/AuthProvider';
import { LazyMotion, domAnimation } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { Toaster, toast } from 'sonner';
import { Header } from '../components/layout/Header';
import { PuzzleShell } from './PuzzleShell';
import { OnboardingOverlay } from '../components/ui/OnboardingOverlay';
import { KeyboardShortcutsOverlay } from '../components/ui/KeyboardShortcutsOverlay';
import { usePuzzleStore } from '../store/puzzleStore';
import { useUserStore } from '../store/userStore';
import { useGamificationStore } from '../store/gamificationStore';
import { apiClient } from '../services/apiClient';

const InstructionsModal = React.lazy(() =>
  import('../components/ui/InstructionsModal').then(m => ({ default: m.InstructionsModal }))
);
const ChatPanel = React.lazy(() =>
  import('../components/ui/ChatPanel').then(m => ({ default: m.ChatPanel }))
);
const LevelUpPopup = React.lazy(() =>
  import('../components/ui/LevelUpPopup').then(m => ({ default: m.LevelUpPopup }))
);

export function RootLayout() {
  const [showChat, setShowChat] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const hasVisited = localStorage.getItem('lego-puzzle-hasVisited');
    if (!hasVisited) {
      localStorage.setItem('lego-puzzle-hasVisited', 'true');
      return true;
    }
    return false;
  });

  const lastActionError = usePuzzleStore((s) => s.lastActionError);
  const location = useLocation();
  const isPuzzleRoute = location.pathname.startsWith('/puzzle/') || location.pathname === '/create';

  // Auth integration
  const { getToken, isSignedIn } = useAppAuth();
  const { user: clerkUser } = useUser();
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const showLevelUp = useGamificationStore((s) => s.showLevelUp);
  const dismissLevelUp = useGamificationStore((s) => s.dismissLevelUp);
  const processOfflineQueue = useGamificationStore((s) => s.processOfflineQueue);

  // Set up API client token provider
  useEffect(() => {
    apiClient.setTokenProvider(() => getToken());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Fetch user profile on sign-in
  useEffect(() => {
    if (isSignedIn) {
      const displayName = clerkUser?.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
        : clerkUser?.username || undefined;
      fetchProfile(() => getToken(), {
        displayName,
        avatarUrl: clerkUser?.imageUrl || undefined,
      });
      processOfflineQueue(() => getToken());
    } else {
      useUserStore.getState().clearProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Bridge store errors to Sonner toasts
  useEffect(() => {
    if (lastActionError) toast.error(lastActionError);
  }, [lastActionError]);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        usePuzzleStore.getState().undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        usePuzzleStore.getState().redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        usePuzzleStore.getState().redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        <Header
          onChatToggle={() => setShowChat(prev => !prev)}
          isChatOpen={showChat}
          onShowInstructions={() => setShowInstructions(true)}
          isPuzzleRoute={isPuzzleRoute}
        />

        <main className="flex-1 overflow-hidden relative">
          {/* Normal pages (gallery, profile, leaderboard) */}
          <div className={`absolute inset-0 transition-opacity duration-150 ease-out ${
            isPuzzleRoute ? 'opacity-0 z-0 pointer-events-none' : 'opacity-100 z-10'
          }`}>
            <div className="h-full overflow-y-auto">
              <Outlet />
            </div>
          </div>

          {/* Puzzle shell — always mounted once visited, CSS-hidden on non-puzzle routes */}
          <PuzzleShell visible={isPuzzleRoute} />
        </main>

        <Toaster
          position="bottom-center"
          theme="dark"
          richColors
          toastOptions={{
            className: 'font-sans',
            style: { background: 'var(--card)', border: '1px solid var(--border)' },
          }}
        />

        <Suspense fallback={null}>
          {showInstructions && <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />}
        </Suspense>
        <Suspense fallback={null}>
          {showChat && <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />}
        </Suspense>
        <Suspense fallback={null}>
          {showLevelUp && <LevelUpPopup onDismiss={dismissLevelUp} />}
        </Suspense>
        <OnboardingOverlay isVisible={showOnboarding} onDismiss={() => setShowOnboarding(false)} />
        <KeyboardShortcutsOverlay />
        <Analytics />
      </div>
    </LazyMotion>
  );
}
