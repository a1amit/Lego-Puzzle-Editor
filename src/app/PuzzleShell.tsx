import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ResizablePanels } from '../components/layout/ResizablePanels';
import { PuzzleRenderer, ViewModeIndicator } from '../components/renderer';
import { InventoryPanel } from '../components/ui/InventoryPanel';
import { ValidationPanel } from '../components/ui/ValidationPanel';
import { PuzzleInfoPanel } from '../components/ui/PuzzleInfoPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/shadcn/tabs';
import { Button } from '../components/ui/shadcn/button';
import { usePuzzleStore } from '../store/puzzleStore';
import { useEditorViewStore, type EditorViewMode } from '../store/editorViewStore';
import { useAppAuth } from '../auth/AuthProvider';
import { usePuzzleEngine } from '../engine';
import { SoundManager } from '../services/SoundManager';
import { PUZZLE_CATEGORIES, BLANK_PUZZLE } from '../config/puzzleCategories';
import { recordCompletion } from '../store/completionTracker';
import { useUserStore } from '../store/userStore';
import { Save, Upload, Eye as EyeIcon } from 'lucide-react';

// Lazy-loaded heavy components
const PuzzleEditor = React.lazy(() =>
  import('../components/editor/PuzzleEditor').then(m => ({ default: m.PuzzleEditor }))
);
const PuzzleScene = React.lazy(() =>
  import('../components/3d/PuzzleScene').then(m => ({ default: m.PuzzleScene }))
);
const CongratulationsPopup = React.lazy(() =>
  import('../components/ui/CongratulationsPopup').then(m => ({ default: m.CongratulationsPopup }))
);

function EditorSkeleton() {
  return (
    <div className="h-full flex flex-col bg-[#0f0f14]">
      <div className="flex-1 m-2 rounded-lg bg-muted/10 animate-pulse" />
    </div>
  );
}

function SceneSkeleton() {
  return <div className="h-full w-full bg-[#0f1520]" />;
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
  const storeMoveCount = usePuzzleStore((s) => s.moveCount);
  const resetPuzzle = usePuzzleStore((s) => s.resetPuzzle);
  const { getToken } = useAppAuth();
  const location = useLocation();

  const viewMode = puzzle?.viewMode ?? '3D';
  const is2D = viewMode === '2D';

  const engine = usePuzzleEngine({ puzzle: null });

  useEffect(() => {
    if (puzzle && is2D) {
      engine.loadPuzzle(puzzle);
    }
  }, [puzzle, is2D]); // eslint-disable-line react-hooks/exhaustive-deps

  const isComplete = is2D ? engine.isComplete : storeIsComplete;
  const moveCount = is2D ? engine.moveCount : storeMoveCount;
  const [showCongrats, setShowCongrats] = useState(false);
  const [completionXP, setCompletionXP] = useState(0);
  const prevCompleteRef = useRef(false);
  const solveStartRef = useRef(Date.now());

  // Reset puzzle to initial state when navigating to it
  useEffect(() => {
    solveStartRef.current = Date.now();
    prevCompleteRef.current = false;
    if (is2D) {
      engine.resetBoard();
    } else {
      resetPuzzle();
    }
  }, [puzzle?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isComplete && !prevCompleteRef.current) {
      setShowCongrats(true);
      SoundManager.getInstance().play('complete');

      // Record the completion
      const slugMatch = location.pathname.match(/^\/puzzle\/([^/]+)/);
      const slug = slugMatch?.[1];
      const timeSeconds = Math.round((Date.now() - solveStartRef.current) / 1000);

      if (slug && puzzle) {
        recordCompletion({
          puzzleSlug: slug,
          puzzleTitle: puzzle.title,
          moveCount,
          timeSeconds,
          getToken,
        }).then(result => {
          if (result) {
            setCompletionXP(result.xpEarned);
            if (result.xpEarned > 0) {
              useUserStore.getState().addXP(result.xpEarned);
            }
          }
        });
      }
    }
    prevCompleteRef.current = isComplete;
  }, [isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayAgain = () => {
    setShowCongrats(false);
    setCompletionXP(0);
    solveStartRef.current = Date.now();
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
                    <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
                    <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
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
            xpEarned={completionXP}
          />
        )}
      </Suspense>
    </>
  );
}

// Look up a hard-coded puzzle by its category ID
function findPuzzleBySlug(slug: string) {
  for (const cat of PUZZLE_CATEGORIES) {
    for (const p of cat.puzzles) {
      if (p.id === slug) return p.puzzle;
    }
  }
  return null;
}

interface PuzzleShellProps {
  visible: boolean;
}

export function PuzzleShell({ visible }: PuzzleShellProps) {
  const isMobile = () => window.innerWidth < 640;
  const location = useLocation();
  const navigate = useNavigate();
  const isCreateRoute = location.pathname === '/create';
  const isEditRoute = location.pathname.endsWith('/edit') || isCreateRoute;

  // Extract slug from URL
  const slugMatch = location.pathname.match(/^\/puzzle\/([^/]+)/);
  const slug = slugMatch?.[1] ?? null;

  const setPuzzle = usePuzzleStore((s) => s.setPuzzle);
  const resetPuzzle = usePuzzleStore((s) => s.resetPuzzle);
  const { isSignedIn, getToken } = useAppAuth();

  // Shared view mode store (Header also reads this)
  const viewMode = useEditorViewStore((s) => s.viewMode);
  const setViewMode = useEditorViewStore((s) => s.setViewMode);
  const setIsEditRoute = useEditorViewStore((s) => s.setIsEditRoute);

  const [mountedModes, setMountedModes] = useState<Set<EditorViewMode>>(() =>
    new Set([isMobile() ? 'preview' : (isEditRoute ? 'split' : 'preview')])
  );
  const [hasEverBeenVisible, setHasEverBeenVisible] = useState(visible);

  // Initialize view mode on first mount
  useEffect(() => {
    const initial: EditorViewMode = isMobile() ? 'preview' : (isEditRoute ? 'split' : 'preview');
    setViewMode(initial);
    setIsEditRoute(isEditRoute);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Only mount internals after first visit to a puzzle route
  useEffect(() => {
    if (visible && !hasEverBeenVisible) setHasEverBeenVisible(true);
  }, [visible, hasEverBeenVisible]);

  // Sync edit route state
  useEffect(() => {
    setIsEditRoute(isEditRoute);
  }, [isEditRoute, setIsEditRoute]);

  // Update view mode when switching between solver/editor routes
  useEffect(() => {
    if (!visible) return;
    if (isEditRoute && viewMode === 'preview') {
      setViewMode('split');
    } else if (!isEditRoute && (viewMode === 'split' || viewMode === 'editor')) {
      setViewMode('preview');
    }
  }, [isEditRoute, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load blank puzzle for /create
  useEffect(() => {
    if (!isCreateRoute || !visible) return;
    setPuzzle(BLANK_PUZZLE);
    resetPuzzle();
  }, [isCreateRoute, visible, setPuzzle, resetPuzzle]);

  // Load puzzle from slug (fallback to hard-coded puzzles)
  useEffect(() => {
    if (!slug || !visible || isCreateRoute) return;

    const hardcoded = findPuzzleBySlug(slug);
    if (hardcoded) {
      setPuzzle(hardcoded);
      return;
    }

    // Try loading from API
    (async () => {
      try {
        const res = await fetch(`/api/puzzles/${slug}`);
        if (res.ok) {
          const { puzzle: apiPuzzle } = await res.json();
          if (apiPuzzle?.definition) {
            setPuzzle(apiPuzzle.definition);
          }
        }
      } catch {
        // API unavailable — puzzle not found
      }
    })();
  }, [slug, visible, isCreateRoute, setPuzzle]);

  // Mount modes lazily
  useEffect(() => {
    setMountedModes(prev => {
      if (prev.has(viewMode)) return prev;
      return new Set([...prev, viewMode]);
    });
  }, [viewMode]);

  // Mobile auto-switch
  useEffect(() => {
    const handleResize = () => {
      if (isMobile() && viewMode !== 'preview') setViewMode('preview');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode, setViewMode]);

  // Save draft to API
  const handleSaveDraft = async () => {
    if (!isSignedIn) {
      toast.error('Sign in to save puzzles');
      return;
    }
    const puzzle = usePuzzleStore.getState().puzzle;
    if (!puzzle) return;

    try {
      const token = await getToken();
      const res = await fetch('/api/puzzles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ definition: puzzle, category: 'Coverage', difficulty: 'medium' }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
        return;
      }
      const { puzzle: saved } = await res.json();
      toast.success(`Draft saved! Slug: ${saved.slug}`);
      navigate(`/puzzle/${saved.slug}/edit`);
    } catch {
      toast.error('Failed to save puzzle');
    }
  };

  // Publish puzzle
  const handlePublish = async () => {
    if (!isSignedIn) {
      toast.error('Sign in to publish puzzles');
      return;
    }
    if (!slug || isCreateRoute) {
      toast.info('Save as draft first, then publish');
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`/api/puzzles/${slug}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to publish');
        return;
      }
      const data = await res.json();
      toast.success(`Published! +${data.xpAwarded} XP`);
    } catch {
      toast.error('Failed to publish');
    }
  };

  if (!hasEverBeenVisible) return null;

  return (
    <div className={`absolute inset-0 transition-opacity duration-150 ease-out flex flex-col ${
      visible ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
    }`}>
      {/* Creator toolbar — shown on edit/create routes */}
      {isEditRoute && visible && (
        <div className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border-b border-border shrink-0 z-20">
          <span className="text-xs text-muted-foreground mr-auto">
            {isCreateRoute ? 'New Puzzle' : `Editing: ${usePuzzleStore.getState().puzzle?.title || slug}`}
          </span>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSaveDraft}>
            <Save className="h-3 w-3" />Save Draft
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => {
            if (slug) navigate(`/puzzle/${slug}`);
          }}>
            <EyeIcon className="h-3 w-3" />Preview
          </Button>
          <Button variant="default" size="sm" className="h-7 gap-1.5 text-xs" onClick={handlePublish}>
            <Upload className="h-3 w-3" />Publish
          </Button>
        </div>
      )}

      <div className="flex-1 relative">
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
      </div>
    </div>
  );
}
