import { useState, useRef } from 'react';
import { ChevronDown, GraduationCap, Lightbulb, BookOpen, Package, ListChecks } from 'lucide-react';
import { InventoryPanel } from '../ui/InventoryPanel';
import { ValidationPanel } from '../ui/ValidationPanel';
import { HtmlSandboxModal } from '../ui/HtmlSandboxModal';

type SheetTab = 'inventory' | 'validation';

interface MobilePuzzlePlayProps {
  renderer: React.ReactNode;
  puzzle: any;
  activeEngine: any;
  validationResults: { rule: string; isValid: boolean; message?: string }[];
  isComplete: boolean;
  showInfo: boolean;
  setShowInfo: (v: boolean) => void;
}

/**
 * Dedicated mobile play layout: the board fills the screen and the
 * inventory / validation live in a collapsible bottom sheet, so both the
 * board and the pieces are usable on a phone (the desktop side-by-side
 * ResizablePanels with a 300px side panel can't fit). Tap a brick to select,
 * then tap a board cell to place (see Renderer2D / PuzzleScene touch handling).
 */
export function MobilePuzzlePlay({
  renderer,
  puzzle,
  activeEngine,
  validationResults,
  isComplete,
  showInfo,
  setShowInfo,
}: MobilePuzzlePlayProps) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<SheetTab>('inventory');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const hasTutorial = typeof puzzle?.tutorial_html === 'string' && puzzle.tutorial_html.length > 0;
  const hasHint = typeof puzzle?.clue_html === 'string' && puzzle.clue_html.length > 0;
  const hasInventory = (puzzle?.inventory?.length ?? 0) > 0;

  // Plugin puzzles render their own controls inside the sandbox — no inventory
  // sheet needed; just show the board full-bleed with the action overlay.
  const isPlugin = puzzle?.engine === 'plugin';

  const validCount = validationResults.filter((r) => r.isValid).length;

  // Drag-to-toggle the sheet via the grab handle.
  const dragRef = useRef<{ y: number } | null>(null);

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Board area */}
      <div className="relative flex-1 min-h-0">
        {renderer}

        {/* Top-right action overlay: Tutorial / Hint / Rules */}
        <div className="absolute top-2 right-2 z-10 flex gap-1.5">
          {hasTutorial && (
            <OverlayButton label="Tutorial" onClick={() => setShowTutorial(true)}>
              <GraduationCap className="w-5 h-5" />
            </OverlayButton>
          )}
          {hasHint && (
            <OverlayButton label="Hint" onClick={() => setShowHint(true)}>
              <Lightbulb className="w-5 h-5" />
            </OverlayButton>
          )}
          <OverlayButton label="Rules & Controls" onClick={() => setShowInfo(!showInfo)}>
            <BookOpen className="w-5 h-5" />
          </OverlayButton>
        </div>
      </div>

      {/* Bottom sheet (hidden for plugin puzzles that own their full UI) */}
      {!isPlugin && (
        <div
          className="shrink-0 flex flex-col bg-[var(--surface-raised)]/95 backdrop-blur-xl border-t border-border rounded-t-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.35)] transition-[height] duration-200 ease-out pb-safe"
          style={{ height: open ? 'min(46dvh, 360px)' : '3rem' }}
        >
          {/* Grab handle / header — tap or drag to toggle */}
          <div
            className="shrink-0 h-12 flex items-center px-3 gap-2 cursor-pointer select-none touch-none"
            onClick={() => setOpen((o) => !o)}
            onPointerDown={(e) => {
              dragRef.current = { y: e.clientY };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerUp={(e) => {
              const start = dragRef.current;
              dragRef.current = null;
              if (!start) return;
              const dy = e.clientY - start.y;
              if (dy > 24) setOpen(false);
              else if (dy < -24) setOpen(true);
            }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-muted-foreground/40" />
            {/* Segmented tab switcher */}
            <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
              {hasInventory && (
                <SheetTabButton
                  active={tab === 'inventory'}
                  onClick={() => { setTab('inventory'); setOpen(true); }}
                >
                  <Package className="w-4 h-4" /> Inventory
                </SheetTabButton>
              )}
              <SheetTabButton
                active={tab === 'validation'}
                onClick={() => { setTab('validation'); setOpen(true); }}
              >
                <ListChecks className="w-4 h-4" /> Validation
                {validationResults.length > 0 && (
                  <span className={`ml-1 text-[9px] font-mono px-1 rounded ${isComplete ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {validCount}/{validationResults.length}
                  </span>
                )}
              </SheetTabButton>
            </div>
            <ChevronDown className={`ml-auto w-5 h-5 text-muted-foreground transition-transform ${open ? '' : 'rotate-180'}`} />
          </div>

          {/* Sheet body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {tab === 'inventory' && hasInventory ? (
              <InventoryPanel className="h-full" engine={activeEngine} />
            ) : (
              <ValidationPanel className="h-full" engine={activeEngine} />
            )}
          </div>
        </div>
      )}

      {hasTutorial && (
        <HtmlSandboxModal open={showTutorial} onOpenChange={setShowTutorial} title="Tutorial" html={puzzle.tutorial_html} />
      )}
      {hasHint && (
        <HtmlSandboxModal open={showHint} onOpenChange={setShowHint} title="Hint" html={puzzle.clue_html} />
      )}
    </div>
  );
}

function OverlayButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/90 active:scale-95 transition-transform"
    >
      {children}
    </button>
  );
}

function SheetTabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
