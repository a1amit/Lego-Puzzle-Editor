import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { ResizablePanels } from './components/layout/ResizablePanels';
import { Header } from './components/layout/Header';
import type { ViewMode } from './components/layout/Header';
import { PuzzleEditor } from './components/editor/PuzzleEditor';
import { PuzzleScene } from './components/3d/PuzzleScene';
import { PuzzleRenderer, ViewModeIndicator } from './components/renderer';
import { InventoryPanel } from './components/ui/InventoryPanel';
import { ValidationPanel } from './components/ui/ValidationPanel';
import { InstructionsModal } from './components/ui/InstructionsModal';
import { CongratulationsPopup } from './components/ui/CongratulationsPopup';
import { ChatPanel } from './components/ui/ChatPanel';
import { usePuzzleStore } from './store/puzzleStore';
import { usePuzzleEngine } from './engine';

function EditorPanel() {
  return (
    <div className="h-full flex flex-col bg-background">
      <PuzzleEditor className="flex-1" />
    </div>
  );
}

function PreviewPanel() {
  const { puzzle, isComplete: storeIsComplete, resetPuzzle } = usePuzzleStore();
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
  const [prevComplete, setPrevComplete] = useState(false);

  useEffect(() => {
    if (isComplete && !prevComplete) {
      setShowCongrats(true);
    }
    setPrevComplete(isComplete);
  }, [isComplete, prevComplete]);

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
      <ResizablePanels direction="horizontal" defaultSize={75} minSize={40} maxSize={90}>
        <div className="h-full bg-background relative">
          {is2D ? (
            <PuzzleRenderer engine={engine} />
          ) : (
            <PuzzleScene />
          )}
          <div className="absolute top-3 right-3 z-10">
            <ViewModeIndicator viewMode={viewMode} />
          </div>
        </div>
        <div className="h-full bg-card border-l border-border">
          <ResizablePanels direction="vertical" defaultSize={60} minSize={20} maxSize={85}>
            <InventoryPanel className="h-full" engine={is2D ? engine : undefined} />
            <ValidationPanel className="h-full" engine={is2D ? engine : undefined} />
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
  const [viewMode, setViewMode] = useState<ViewMode>('split');
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
    </div>
  );
}

export default App;
