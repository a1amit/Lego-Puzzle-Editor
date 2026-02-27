import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Toaster, toast } from 'sonner';
import { ResizablePanels } from './components/layout/ResizablePanels';
import { Header } from './components/layout/Header';
import type { ViewMode } from './components/layout/Header';
import { PuzzleRenderer, ViewModeIndicator } from './components/renderer';
import { InventoryPanel } from './components/ui/InventoryPanel';
import { ValidationPanel } from './components/ui/ValidationPanel';
import { PuzzleInfoPanel } from './components/ui/PuzzleInfoPanel';
import { InstructionsModal } from './components/ui/InstructionsModal';
import { CongratulationsPopup } from './components/ui/CongratulationsPopup';
import { ChatPanel } from './components/ui/ChatPanel';
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

function EditorSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background animate-pulse">
      <div className="flex-1 m-2 rounded-lg bg-muted/30" />
    </div>
  );
}

function SceneSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-background/50 animate-pulse">
      <div className="w-32 h-32 rounded-xl bg-muted/30" />
    </div>
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
  const congratsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isComplete && !prevCompleteRef.current) {
      // Delay showing congratulations by 300ms so the player registers their last move
      congratsTimerRef.current = setTimeout(() => {
        setShowCongrats(true);
        SoundManager.getInstance().play('complete');
      }, 300);
    }
    prevCompleteRef.current = isComplete;
    return () => {
      if (congratsTimerRef.current) clearTimeout(congratsTimerRef.current);
    };
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
        <div className="h-full min-w-[320px] bg-gradient-to-b from-card to-background border-l border-border/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <ResizablePanels direction="vertical" defaultSize={58} minSize={32} maxSize={78}>
            <div className="h-full p-2 pb-1">
              <Tabs defaultValue="inventory" className="h-full gap-0">
                <div className="px-1 pb-2">
                  <TabsList variant="line" className="w-full h-9 grid grid-cols-2 rounded-lg bg-card/70 border border-border/70">
                    <TabsTrigger value="inventory" className="text-xs">
                      Inventory
                    </TabsTrigger>
                    <TabsTrigger value="info" className="text-xs">
                      Info
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="inventory" className="min-h-0 overflow-hidden rounded-lg border border-border/70 bg-card/25">
                  <InventoryPanel className="h-full" engine={is2D ? engine : undefined} />
                </TabsContent>

                <TabsContent value="info" className="min-h-0 overflow-hidden rounded-lg border border-border/70 bg-card/25">
                  <PuzzleInfoPanel className="h-full" engine={is2D ? engine : undefined} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="h-full p-2 pt-1">
              <div className="h-full overflow-hidden rounded-lg border border-border/70 bg-card/25">
                <ValidationPanel className="h-full" engine={is2D ? engine : undefined} />
              </div>
            </div>
          </ResizablePanels>
        </div>
      </ResizablePanels>

      <CongratulationsPopup
        isVisible={showCongrats}
        onClose={() => setShowCongrats(false)}
        onPlayAgain={handlePlayAgain}
        puzzleTitle={puzzle?.title}
      />
    </>
  );
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const hasVisited = localStorage.getItem('lego-puzzle-hasVisited');
    if (!hasVisited) {
      localStorage.setItem('lego-puzzle-hasVisited', 'true');
      return 'preview';
    }
    return 'split';
  });
  const [showChat, setShowChat] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const lastActionError = usePuzzleStore((s) => s.lastActionError);

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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <Header
        onChatToggle={() => setShowChat(prev => !prev)}
        isChatOpen={showChat}
        onShowInstructions={() => setShowInstructions(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <main className="flex-1 overflow-hidden">
        {viewMode === 'split' && (
          <ResizablePanels direction="horizontal" defaultSize={40} minSize={20} maxSize={70}>
            <EditorPanel />
            <PreviewPanel />
          </ResizablePanels>
        )}
        {viewMode === 'editor' && <EditorPanel />}
        {viewMode === 'preview' && <PreviewPanel />}
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

      <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
      <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
      <Analytics />
    </div>
  );
}

export default App;
