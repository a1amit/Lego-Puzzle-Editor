import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ResizablePanels } from '../components/layout/ResizablePanels';
import { PuzzleRenderer, ViewModeIndicator } from '../components/renderer';
import { InventoryPanel } from '../components/ui/InventoryPanel';
import { ValidationPanel } from '../components/ui/ValidationPanel';
import { HtmlSandboxModal } from '../components/ui/HtmlSandboxModal';
import { MovesPanel } from '../components/ui/MovesPanel';
import { PuzzleInfoPopup } from '../components/ui/PuzzleInfoPopup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/shadcn/tabs';
import { Button } from '../components/ui/shadcn/button';
import { useQueryClient } from '@tanstack/react-query';
import { usePuzzleStore } from '../store/puzzleStore';
import { useEditorViewStore, type EditorViewMode } from '../store/editorViewStore';
import { useAppAuth } from '../auth/AuthProvider';
import { usePuzzleEngine } from '../engine';
import { SoundManager } from '../services/SoundManager';
import { PUZZLE_CATEGORIES, BLANK_PUZZLE } from '../config/puzzleCategories';
import { recordCompletion } from '../store/completionTracker';
import { useUserStore } from '../store/userStore';

import { Save, Upload, ArchiveRestore, BookOpen, PanelLeftOpen, PanelRightOpen, GraduationCap, Lightbulb } from 'lucide-react';
import { CellPickerOverlay } from '../components/editor/ruleBuilder/CellPickerOverlay';

// Lazy-loaded heavy components
const PuzzleEditor = React.lazy(() =>
  import('../components/editor/PuzzleEditor').then(m => ({ default: m.PuzzleEditor }))
);
const RuleBuilderPanel = React.lazy(() =>
  import('../components/editor/ruleBuilder').then(m => ({ default: m.RuleBuilderPanel }))
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
    <Tabs defaultValue="json" className="h-full flex flex-col bg-background">
      <TabsList className="flex-shrink-0 mx-2 mt-2">
        <TabsTrigger value="json" className="text-xs">JSON Editor</TabsTrigger>
        <TabsTrigger value="rules" className="text-xs">Custom Rules</TabsTrigger>
      </TabsList>
      <TabsContent value="json" className="flex-1 min-h-0">
        <Suspense fallback={<EditorSkeleton />}>
          <PuzzleEditor className="h-full" />
        </Suspense>
      </TabsContent>
      <TabsContent value="rules" className="flex-1 min-h-0">
        <Suspense fallback={<EditorSkeleton />}>
          <RuleBuilderPanel className="h-full" />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}

function RendererPanel({ is2D, engine, viewMode }: { is2D: boolean; engine: ReturnType<typeof usePuzzleEngine>; viewMode: '2D' | '3D' }) {
  return (
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
      <CellPickerOverlay />
    </div>
  );
}

function SidePanel({ puzzle, showInfo, setShowInfo, activeEngine, validationResults, isComplete, flipped }: {
  puzzle: any; showInfo: boolean; setShowInfo: (v: boolean) => void;
  activeEngine: any; validationResults: { rule: string; isValid: boolean; message?: string }[];
  isComplete: boolean; flipped?: boolean;
}) {
  const togglePanelFlip = useEditorViewStore((s) => s.togglePanelFlip);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hasTutorial = typeof puzzle?.tutorial_html === 'string' && puzzle.tutorial_html.length > 0;
  const hasHint = typeof puzzle?.clue_html === 'string' && puzzle.clue_html.length > 0;
  return (
    <div className={`h-full min-w-[300px] bg-gradient-to-b from-card to-background ${flipped ? 'border-r' : 'border-l'} border-border shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] flex flex-col`}>
      <div className="shrink-0 px-3 pt-2 pb-1 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground truncate flex-1">
          {puzzle?.title}
        </span>
        {hasTutorial && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1.5 shrink-0"
            onClick={() => setShowTutorial(true)}
            title="Open the puzzle tutorial"
          >
            <GraduationCap className="w-3 h-3" />
            Tutorial
          </Button>
        )}
        {hasHint && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1.5 shrink-0"
            onClick={() => setShowHint(true)}
            title="Show a hint for this puzzle"
          >
            <Lightbulb className="w-3 h-3" />
            Hint
          </Button>
        )}
        <Button
          variant={showInfo ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-[11px] gap-1.5 shrink-0"
          onClick={() => setShowInfo(!showInfo)}
        >
          <BookOpen className="w-3 h-3" />
          Rules & Controls
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={togglePanelFlip}
          title={flipped ? 'Move panel to right' : 'Move panel to left'}
        >
          {flipped ? <PanelRightOpen className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
        </Button>
      </div>
      {hasTutorial && (
        <HtmlSandboxModal
          open={showTutorial}
          onOpenChange={setShowTutorial}
          title="Tutorial"
          html={puzzle.tutorial_html}
        />
      )}
      {hasHint && (
        <HtmlSandboxModal
          open={showHint}
          onOpenChange={setShowHint}
          title="Hint"
          html={puzzle.clue_html}
        />
      )}
      {(() => {
        const hasMoves = (puzzle?.moves?.length ?? 0) > 0;
        const defaultTab = hasMoves ? 'moves' : 'inventory';
        return (
          <Tabs defaultValue={defaultTab} className="flex-1 min-h-0 flex flex-col gap-0 px-2 pb-2">
            <div className="shrink-0 pb-1.5">
              <TabsList
                variant="line"
                className={`w-full h-9 grid ${hasMoves ? 'grid-cols-3' : 'grid-cols-2'} rounded-lg bg-[var(--surface-raised)] border border-border`}
              >
                {hasMoves && (
                  <TabsTrigger value="moves" className="text-xs">Moves</TabsTrigger>
                )}
                <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
                <TabsTrigger value="validation" className="text-xs gap-1.5">
                  Validation
                  {validationResults.length > 0 && (
                    <span className={`text-[9px] font-mono px-1 py-0 rounded ${isComplete ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {validationResults.filter(r => r.isValid).length}/{validationResults.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            {hasMoves && (
              <TabsContent value="moves" className="flex-1 min-h-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                <MovesPanel className="h-full" engine={activeEngine} />
              </TabsContent>
            )}
            <TabsContent value="inventory" className="flex-1 min-h-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
              <InventoryPanel className="h-full" engine={activeEngine} />
            </TabsContent>
            <TabsContent value="validation" className="flex-1 min-h-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
              <ValidationPanel className="h-full" engine={activeEngine} />
            </TabsContent>
          </Tabs>
        );
      })()}
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

  // Load puzzle into engine synchronously during render so PuzzleRenderer
  // never sees a stale board. This triggers a dev-mode "Cannot update a
  // component while rendering" warning (which was present before these
  // changes too), but it's harmless and doesn't appear in production.
  if (is2D && puzzle && engine.puzzle !== puzzle) {
    engine.loadPuzzle(puzzle);
  }

  const storeValidationResults = usePuzzleStore((s) => s.validationResults);
  const activeEngine = is2D ? engine : undefined;
  const validationResults = activeEngine ? activeEngine.validationResults : storeValidationResults;
  const isComplete = activeEngine ? activeEngine.isComplete : storeIsComplete;
  const moveCount = activeEngine ? activeEngine.moveCount : storeMoveCount;
  const panelFlipped = useEditorViewStore((s) => s.panelFlipped);
  const [showCongrats, setShowCongrats] = useState(false);
  const [completionXP, setCompletionXP] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const prevCompleteRef = useRef(false);
  const solveStartRef = useRef(Date.now());
  const activePuzzleTitleRef = useRef<string | undefined>(undefined);

  // Reset puzzle to initial state when navigating to it
  useEffect(() => {
    solveStartRef.current = Date.now();
    setShowCongrats(false);
    setCompletionXP(0);
    if (is2D) {
      engine.resetBoard();
    } else {
      resetPuzzle();
    }
  }, [puzzle?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // On puzzle change, sync refs to prevent stale completion triggers
    // and ensure the next real completion is detected even if isComplete
    // stayed false across the navigation.
    if (puzzle?.title !== activePuzzleTitleRef.current) {
      activePuzzleTitleRef.current = puzzle?.title;
      prevCompleteRef.current = isComplete;
      return;
    }

    if (isComplete && !prevCompleteRef.current) {
      setShowCongrats(true);
      SoundManager.getInstance().play('complete');

      // Record the completion
      const slugMatch = location.pathname.match(/^\/puzzle\/([^/]+)/);
      const slug = slugMatch?.[1];
      const timeSeconds = Math.round((Date.now() - solveStartRef.current) / 1000);

      if (slug && puzzle) {
        const meta = (puzzle as { metadata?: { difficulty?: string } }).metadata;
        recordCompletion({
          puzzleSlug: slug,
          puzzleTitle: puzzle.title,
          moveCount,
          timeSeconds,
          difficulty: meta?.difficulty,
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
  }, [isComplete, puzzle?.title]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <ResizablePanels direction="horizontal" defaultSize={panelFlipped ? 30 : 70} minSize={18} maxSize={82}>
        {panelFlipped ? (
          <SidePanel puzzle={puzzle} showInfo={showInfo} setShowInfo={setShowInfo} activeEngine={activeEngine} validationResults={validationResults} isComplete={isComplete} flipped />
        ) : (
          <RendererPanel is2D={is2D} engine={engine} viewMode={viewMode} />
        )}
        {panelFlipped ? (
          <RendererPanel is2D={is2D} engine={engine} viewMode={viewMode} />
        ) : (
          <SidePanel puzzle={puzzle} showInfo={showInfo} setShowInfo={setShowInfo} activeEngine={activeEngine} validationResults={validationResults} isComplete={isComplete} />
        )}
      </ResizablePanels>

      <PuzzleInfoPopup isOpen={showInfo} onClose={() => setShowInfo(false)} engine={activeEngine} />

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

function SplitView() {
  const panelFlipped = useEditorViewStore((s) => s.panelFlipped);
  return (
    <ResizablePanels direction="horizontal" defaultSize={panelFlipped ? 60 : 40} minSize={20} maxSize={70}>
      {panelFlipped ? <PreviewPanel /> : <EditorPanel />}
      {panelFlipped ? <EditorPanel /> : <PreviewPanel />}
    </ResizablePanels>
  );
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
  const queryClient = useQueryClient();

  // Shared view mode store (Header also reads this)
  const viewMode = useEditorViewStore((s) => s.viewMode);
  const setViewMode = useEditorViewStore((s) => s.setViewMode);
  const setIsEditRoute = useEditorViewStore((s) => s.setIsEditRoute);
  const setCanEdit = useEditorViewStore((s) => s.setCanEdit);
  const userRole = useUserStore((s) => s.profile?.role);

  const [mountedModes, setMountedModes] = useState<Set<EditorViewMode>>(() =>
    new Set([isMobile() ? 'preview' : (isEditRoute ? 'split' : 'preview')])
  );
  const [hasEverBeenVisible, setHasEverBeenVisible] = useState(visible);
  const [puzzleStatus, setPuzzleStatus] = useState<'draft' | 'published' | null>(null);
  const [puzzleDifficulty, setPuzzleDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [isLoadingPuzzle, setIsLoadingPuzzle] = useState(false);
  const [isOwnPuzzle, setIsOwnPuzzle] = useState(false);

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

  // Sync edit route state and canEdit flag
  useEffect(() => {
    setIsEditRoute(isEditRoute);
  }, [isEditRoute, setIsEditRoute]);

  useEffect(() => {
    setCanEdit(visible && (isEditRoute || isOwnPuzzle || userRole === 'admin'));
  }, [isEditRoute, isOwnPuzzle, userRole, visible, setCanEdit]);

  // Update view mode when switching between solver/editor routes
  useEffect(() => {
    if (!visible) return;
    if (isEditRoute && viewMode === 'preview') {
      // Entering edit route from preview — default to split
      setViewMode('split');
    } else if (!isEditRoute && viewMode !== 'preview') {
      // Leaving edit route — go to preview
      setViewMode('preview');
    }
  }, [isEditRoute, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load blank puzzle for /create
  useEffect(() => {
    if (!isCreateRoute || !visible) return;
    setPuzzle(BLANK_PUZZLE);
    resetPuzzle();
    setPuzzleDifficulty('medium');
  }, [isCreateRoute, visible, setPuzzle, resetPuzzle]);

  // Load puzzle from slug — hardcoded puzzles in layout effect (before paint), API puzzles async
  const prevSlugRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!slug || !visible || isCreateRoute) return;
    if (slug === prevSlugRef.current) return;
    prevSlugRef.current = slug;
    const hardcoded = findPuzzleBySlug(slug);
    if (hardcoded) {
      setPuzzle(hardcoded);
      setIsLoadingPuzzle(false);
      const meta = (hardcoded as { metadata?: { difficulty?: string } }).metadata;
      setPuzzleDifficulty((meta?.difficulty as typeof puzzleDifficulty) || 'medium');
    } else {
      // Clear stale puzzle immediately so the old puzzle doesn't flash while API loads
      setIsLoadingPuzzle(true);
      usePuzzleStore.setState({
        puzzle: null,
        boardState: { dimensions: { width: 1, height: 1, depth: 1 }, placedBricks: [], blockedCells: [] },
        inventoryState: new Map(),
        validationResults: [],
        isComplete: false,
        moveCount: 0,
      });
    }
  }, [slug, visible, isCreateRoute, setPuzzle, resetPuzzle]);

  // Async: fetch API puzzles that aren't hardcoded
  const myId = useUserStore((s) => s.profile?._id);

  useEffect(() => {
    if (!slug || !visible || isCreateRoute) return;

    // Built-in puzzles don't exist in the DB — skip the API call
    if (findPuzzleBySlug(slug)) {
      setIsLoadingPuzzle(false);
      setIsOwnPuzzle(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/puzzles/${slug}`);
        if (res.ok && !cancelled) {
          const { puzzle: apiPuzzle } = await res.json();
          if (apiPuzzle) {
            setPuzzleStatus(apiPuzzle.status ?? null);
            setPuzzleDifficulty(apiPuzzle.difficulty ?? 'medium');
            setIsOwnPuzzle(myId ? apiPuzzle.authorId === myId : false);
            if (apiPuzzle.definition) {
              setPuzzle(apiPuzzle.definition);
            }
          }
        }
      } catch {
        // API unavailable — puzzle not found
      }
      if (!cancelled) setIsLoadingPuzzle(false);
    })();

    return () => { cancelled = true; };
  }, [slug, visible, isCreateRoute, setPuzzle, resetPuzzle, myId]);

  // Mount only the active mode — previously this accumulated all visited modes,
  // which left duplicate PreviewPanel instances alive (each with its own
  // window-level keydown listener), causing 'R' to rotate 180° instead of 90°.
  useEffect(() => {
    setMountedModes(new Set([viewMode]));
  }, [viewMode]);

  // Mobile auto-switch
  useEffect(() => {
    const handleResize = () => {
      if (isMobile() && viewMode !== 'preview') setViewMode('preview');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode, setViewMode]);

  // Save draft to API (create new or update existing)
  const handleSaveDraft = () => {
    if (!isSignedIn) {
      toast.error('Sign in to save puzzles');
      return;
    }
    const puzzle = usePuzzleStore.getState().puzzle;
    if (!puzzle) return;

    toast.promise(
      (async () => {
        const token = await getToken();

        if (slug && !isCreateRoute) {
          const res = await fetch(`/api/puzzles/${slug}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ definition: puzzle, difficulty: puzzleDifficulty }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to save');
          }
        } else {
          const res = await fetch('/api/puzzles/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ definition: puzzle, category: 'Coverage', difficulty: puzzleDifficulty }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to save');
          }
          const { puzzle: saved } = await res.json();
          navigate(`/puzzle/${saved.slug}/edit`);
        }
      })(),
      {
        loading: 'Saving...',
        success: slug && !isCreateRoute ? 'Puzzle saved!' : 'Draft saved!',
        error: (err) => err.message || 'Failed to save',
      }
    );
  };

  // Publish puzzle
  const handlePublish = () => {
    if (!isSignedIn) {
      toast.error('Sign in to publish puzzles');
      return;
    }
    if (!slug || isCreateRoute) {
      toast.info('Save as draft first, then publish');
      return;
    }
    toast.promise(
      (async () => {
        const token = await getToken();
        const res = await fetch(`/api/puzzles/${slug}/publish`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to publish');
        }
        const data = await res.json();
        setPuzzleStatus('published');
        queryClient.invalidateQueries({ queryKey: ['puzzles'] });
        return data;
      })(),
      {
        loading: 'Publishing...',
        success: 'Published!',
        error: (err) => err.message || 'Failed to publish',
      }
    );
  };

  // Unpublish puzzle (revert to draft)
  const handleUnpublish = () => {
    if (!slug) return;
    toast.promise(
      (async () => {
        const token = await getToken();
        const res = await fetch(`/api/puzzles/${slug}/unpublish`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to unpublish');
        }
        setPuzzleStatus('draft');
        queryClient.invalidateQueries({ queryKey: ['puzzles'] });
      })(),
      {
        loading: 'Unpublishing...',
        success: 'Reverted to draft',
        error: (err) => err.message || 'Failed to unpublish',
      }
    );
  };

  if (!hasEverBeenVisible) return null;

  return (
    <div className={`absolute inset-0 transition-opacity duration-150 ease-out flex flex-col ${
      visible ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
    }`}>
      {/* Creator toolbar — shown for owners and admins */}
      {(isEditRoute || isOwnPuzzle || userRole === 'admin') && visible && (
        <div className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border-b border-border shrink-0 z-20">
          <span className="text-xs text-muted-foreground">
            {isCreateRoute ? 'New Puzzle' : `Editing: ${usePuzzleStore.getState().puzzle?.title || slug}`}
          </span>
          <div className="flex items-center gap-1 mr-auto ml-3">
            {(['easy', 'medium', 'hard', 'expert'] as const).map(d => (
              <button
                key={d}
                onClick={() => setPuzzleDifficulty(d)}
                className={`h-6 px-2 text-[11px] capitalize rounded-md border transition-colors ${
                  puzzleDifficulty === d
                    ? d === 'easy' ? 'bg-green-500/30 text-green-300 border-green-500/50'
                    : d === 'medium' ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50'
                    : d === 'hard' ? 'bg-orange-500/30 text-orange-300 border-orange-500/50'
                    : 'bg-red-500/30 text-red-300 border-red-500/50'
                    : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSaveDraft}>
            <Save className="h-3 w-3" />{puzzleStatus === 'published' ? 'Save' : 'Save Draft'}
          </Button>
          {puzzleStatus === 'published' ? (
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleUnpublish}>
              <ArchiveRestore className="h-3 w-3" />Unpublish
            </Button>
          ) : (
            <Button variant="default" size="sm" className="h-7 gap-1.5 text-xs" onClick={handlePublish}>
              <Upload className="h-3 w-3" />Publish
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 relative">
      {/* Loading overlay for API puzzles */}
      {isLoadingPuzzle && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading puzzle...</p>
        </div>
      )}
      {mountedModes.has('split') && (
        <div className={`absolute inset-0 transition-opacity duration-150 ease-out ${viewMode === 'split' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <SplitView />
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
