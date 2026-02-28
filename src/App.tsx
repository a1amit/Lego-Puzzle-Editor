import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { Toaster, toast } from 'sonner';
import { ResizablePanels } from './components/layout/ResizablePanels';
import { Header } from './components/layout/Header';
import type { ViewMode } from './components/layout/Header';
import { PuzzleRenderer, ViewModeIndicator } from './components/renderer';
import { InventoryPanel } from './components/ui/InventoryPanel';
import { ValidationPanel } from './components/ui/ValidationPanel';
import { PuzzleInfoPanel } from './components/ui/PuzzleInfoPanel';
import { OnboardingOverlay } from './components/ui/OnboardingOverlay';
import { KeyboardShortcutsOverlay } from './components/ui/KeyboardShortcutsOverlay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/shadcn/tabs';
import { usePuzzleStore } from './store/puzzleStore';
import { usePuzzleEngine } from './engine';
import { SoundManager } from './services/SoundManager';

// Lazy-loaded heavy components
const PuzzleEditor = React.lazy(() =>
  import('./components/editor/PuzzleEditor').then(m => ({ default: m.PuzzleEditor }))
);
const PuzzleScene = React.lazy(() =>
  import('./components/3d/PuzzleScene').then(m => ({ default: m.PuzzleScene }))
);
const InstructionsModal = React.lazy(() =>
  import('./components/ui/InstructionsModal').then(m => ({ default: m.InstructionsModal }))
);
const CongratulationsPopup = React.lazy(() =>
  import('./components/ui/CongratulationsPopup').then(m => ({ default: m.CongratulationsPopup }))
);
const ChatPanel = React.lazy(() =>
  import('./components/ui/ChatPanel').then(m => ({ default: m.ChatPanel }))
);

function EditorSkeleton() {
  return (
    <div className="h-full flex flex-col bg-[#0f0f14]">
      <div className="flex-1 m-2 rounded-lg bg-muted/10 animate-pulse" />
    </div>
  );
}

function SceneSkeleton() {
  return (
    <div className="h-full w-full bg-[#0f1520]" />
  );
}

function EditorPanel() {
  return (
    <div className="h-full flex flex-col bg-background">
      <Suspense fallback={<EditorSkeleton />}>
        <PuzzleEditor className="flex-1" />
      </Suspense>
    </div>
  );
}

function PreviewPanel() {
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const storeIsComplete = usePuzzleStore((s) => s.isComplete);
  const resetPuzzle = usePuzzleStore((s) => s.resetPuzzle);

  const viewMode = puzzle?.viewMode ?? '3D';
  const is2D = viewMode === '2D';

  const engine = usePuzzleEngine({ puzzle: null });

  useEffect(() => {
    if (puzzle && is2D) {
      engine.loadPuzzle(puzzle);
    }
  }, [puzzle, is2D]); // eslint-disable-line react-hooks/exhaustive-deps

  const isComplete = is2D ? engine.isComplete : storeIsComplete;
  const [showCongrats, setShowCongrats] = useState(false);
  const prevCompleteRef = useRef(false);

  useEffect(() => {
    if (isComplete && !prevCompleteRef.current) {
      setShowCongrats(true);
      SoundManager.getInstance().play('complete');
    }
    prevCompleteRef.current = isComplete;
  }, [isComplete]);

  const handlePlayAgain = () => {
    setShowCongrats(false);
    if (is2D) {
      engine.resetBoard();
    } else {
      resetPuzzle();
    }
  };

  return (
    <>
      <ResizablePanels direction="horizontal" defaultSize={70} minSize={40} maxSize={82}>
        <div className="h-full bg-[radial-gradient(circle_at_30%_20%,rgba(101,143,222,0.16),rgba(8,12,20,0.15)_35%,rgba(8,12,20,0.9)_100%)] relative">
          {is2D ? (
            <PuzzleRenderer engine={engine} />
          ) : (
            <Suspense fallback={<SceneSkeleton />}>
              <PuzzleScene />
            </Suspense>
          )}
          <div className="absolute top-3 right-3 z-10">
            <ViewModeIndicator viewMode={viewMode} />
          </div>
        </div>
        <div className="h-full min-w-[320px] bg-gradient-to-b from-card to-background border-l border-border shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <ResizablePanels direction="vertical" defaultSize={58} minSize={32} maxSize={78}>
            <div className="h-full p-2 pb-1">
              <Tabs defaultValue="inventory" className="h-full gap-0">
                <div className="px-1 pb-2">
                  <TabsList variant="line" className="w-full h-9 grid grid-cols-2 rounded-lg bg-[var(--surface-raised)] border border-border">
                    <TabsTrigger value="inventory" className="text-xs">
                      Inventory
                    </TabsTrigger>
                    <TabsTrigger value="info" className="text-xs">
                      Info
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="inventory" className="min-h-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                  <InventoryPanel className="h-full" engine={is2D ? engine : undefined} />
                </TabsContent>

                <TabsContent value="info" className="min-h-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                  <PuzzleInfoPanel className="h-full" engine={is2D ? engine : undefined} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="h-full p-2 pt-1">
              <div className="h-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                <ValidationPanel className="h-full" engine={is2D ? engine : undefined} />
              </div>
            </div>
          </ResizablePanels>
        </div>
      </ResizablePanels>

      <Suspense fallback={null}>
        {showCongrats && (
          <CongratulationsPopup
            isVisible={showCongrats}
            onClose={() => setShowCongrats(false)}
            onPlayAgain={handlePlayAgain}
            puzzleTitle={puzzle?.title}
          />
        )}
      </Suspense>
    </>
  );
}

function App() {
  const [isFirstVisit] = useState(() => {
    const hasVisited = localStorage.getItem('lego-puzzle-hasVisited');
    if (!hasVisited) {
      localStorage.setItem('lego-puzzle-hasVisited', 'true');
      return true;
    }
    return false;
  });
  const isMobile = () => window.innerWidth < 640;
  const initialMode: ViewMode = isFirstVisit || isMobile() ? 'preview' : 'split';
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  // Track which modes have been visited — mount once per mode, never unmount.
  // This keeps Three.js canvases and Monaco editors alive across tab switches.
  const [mountedModes, setMountedModes] = useState<Set<ViewMode>>(() => new Set([initialMode]));
  const [showChat, setShowChat] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(isFirstVisit);
  const lastActionError = usePuzzleStore((s) => s.lastActionError);

  // Lazily mount view layers on first visit (but never unmount them)
  useEffect(() => {
    setMountedModes(prev => {
      if (prev.has(viewMode)) return prev;
      return new Set([...prev, viewMode]);
    });
  }, [viewMode]);

  // On mobile (<640px), force preview mode and prevent split/editor
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (isMobile() && mode !== 'preview') {
      setViewMode('preview');
    } else {
      setViewMode(mode);
    }
  }, []);

  // Auto-switch to preview mode when resizing to mobile
  useEffect(() => {
    const handleResize = () => {
      if (isMobile() && viewMode !== 'preview') {
        setViewMode('preview');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Bridge store errors to Sonner toasts
  useEffect(() => {
    if (lastActionError) {
      toast.error(lastActionError);
    }
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
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        <main className="flex-1 overflow-hidden relative">
          {/* All view layers are mounted on first visit and kept alive (never unmounted).
              This prevents Three.js / Monaco from being destroyed on tab switch. */}
          {mountedModes.has('split') && (
            <div className={`absolute inset-0 transition-opacity duration-150 ease-out ${viewMode === 'split' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <ResizablePanels direction="horizontal" defaultSize={40} minSize={20} maxSize={70}>
                <EditorPanel />
                <PreviewPanel />
              </ResizablePanels>
            </div>
          )}
          {mountedModes.has('editor') && (
            <div className={`absolute inset-0 transition-opacity duration-150 ease-out ${viewMode === 'editor' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <EditorPanel />
            </div>
          )}
          {mountedModes.has('preview') && (
            <div className={`absolute inset-0 transition-opacity duration-150 ease-out ${viewMode === 'preview' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <PreviewPanel />
            </div>
          )}
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
        <OnboardingOverlay isVisible={showOnboarding} onDismiss={() => setShowOnboarding(false)} />
        <KeyboardShortcutsOverlay />
        <Analytics />
      </div>
    </LazyMotion>
  );
}

export default App;
