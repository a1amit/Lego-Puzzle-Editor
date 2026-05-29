import { useState, useRef, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePuzzleStore } from '../../store/puzzleStore';
import { Badge } from './shadcn/badge';
import {
  BookOpen, Keyboard, ListChecks, X, GripHorizontal, Minus,
  MousePointerClick, RotateCw, Trash2, Move, Grid3X3, ChevronDown,
} from 'lucide-react';
import type { UsePuzzleEngineReturn } from '../../engine';

const FRIENDLY_RULES: Record<string, { label: string; desc: string }> = {
  'ALL_BOARD_SQUARES_MUST_BE_COVERED': { label: 'Full Coverage', desc: 'Every cell on the board must be covered by a brick' },
  'ALL_PIECES_MUST_BE_PLACED': { label: 'Use All Pieces', desc: 'Every piece from the inventory must be placed' },
  'ALL_BRICKS_MUST_BE_USED': { label: 'Use All Bricks', desc: 'Every brick from the inventory must be placed' },
  'NO_OVERLAPPING': { label: 'No Overlap', desc: 'Bricks cannot overlap each other' },
  'NO_BRICK_OVERLAP': { label: 'No Overlap', desc: 'Bricks cannot overlap each other' },
  'NO_ROTATION': { label: 'No Rotation', desc: 'Bricks cannot be rotated' },
  'SLIDING_ONLY': { label: 'Slide Only', desc: 'Pieces can only slide, not be picked up' },
  'EXACT_COVERAGE': { label: 'Exact Coverage', desc: 'Cover exactly the right cells, no more' },
  'GOAL_REACHED': { label: 'Reach the Goal', desc: 'Move the target piece to the goal area' },
  'MAX_MOVES': { label: 'Move Limit', desc: 'Complete the puzzle within the move limit' },
  'MATCH_PATTERN': { label: 'Match Pattern', desc: 'Arrange bricks to match the target pattern' },
  'PATTERN_MATCH': { label: 'Match Pattern', desc: 'Arrange bricks to match the target pattern' },
  'NO_ADJACENT_SAME_COLOR': { label: 'Color Separation', desc: 'No two adjacent cells can share the same color' },
  'BINARY_ENCODING': { label: 'Binary Pattern', desc: 'Encode the correct binary pattern on the board' },
  'ROWS_AND_COLUMNS': { label: 'Row & Column Clues', desc: 'Satisfy all row and column number clues' },
  'NO_BRICKS_OUT_OF_BOUNDS': { label: 'Stay In Bounds', desc: 'All bricks must be within the board' },
  'NO_BLOCKED_CELLS': { label: 'Avoid Blocked', desc: 'Do not place bricks on blocked cells' },
  'FREE_PLACEMENT': { label: 'Free Placement', desc: 'Place bricks anywhere on the board' },
  'NO_BRICK_REMOVAL': { label: 'No Removal', desc: 'Once placed, bricks cannot be removed' },
};

interface PuzzleInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  engine?: UsePuzzleEngineReturn;
}

export function PuzzleInfoPopup({ isOpen, onClose, engine }: PuzzleInfoPopupProps) {
  const store = usePuzzleStore(useShallow(s => ({ puzzle: s.puzzle })));
  const puzzle = engine?.puzzle ?? store.puzzle;

  const [size, setSize] = useState({ w: 420, h: 520 });
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, Math.round((window.innerWidth - 420) / 2)),
    y: Math.max(0, Math.round((window.innerHeight - 520) / 2)),
  }));
  const [minimized, setMinimized] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    const h = () => setPos(p => ({
      x: Math.min(p.x, window.innerWidth - 100),
      y: Math.min(p.y, window.innerHeight - 50),
    }));
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Center the popup each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    setPos({
      x: Math.max(0, Math.round((window.innerWidth - size.w) / 2)),
      y: Math.max(0, Math.round((window.innerHeight - size.h) / 2)),
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
  }, [pos]);
  const onDragMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos({ x: Math.max(0, d.startPosX + e.clientX - d.startX), y: Math.max(0, d.startPosY + e.clientY - d.startY) });
  }, []);
  const onDragEnd = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); dragRef.current = null; }
  }, []);

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };
  }, [size]);
  const onResizeMove = useCallback((e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    setSize({ w: Math.max(320, r.startW + e.clientX - r.startX), h: Math.max(250, r.startH + e.clientY - r.startY) });
  }, []);
  const onResizeEnd = useCallback((e: React.PointerEvent) => {
    if (resizeRef.current) { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); resizeRef.current = null; }
  }, []);

  if (!isOpen || !puzzle) return null;

  const board = puzzle.board.dimensions;

  return (
    <div
      ref={popupRef}
      className="fixed z-[45] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden cursor-move"
      style={{
        left: pos.x, top: pos.y,
        width: minimized ? 300 : size.w,
        height: minimized ? 'auto' : size.h,
      }}
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
    >
      {/* ── Title Bar ── */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-[var(--surface-raised)] to-card border-b border-border select-none shrink-0">
        <GripHorizontal className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        <BookOpen className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-bold text-foreground flex-1 truncate">Rules & Controls</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[9px] font-mono px-1.5 h-5">
            {board.width}&times;{board.height}
          </Badge>
          <Badge variant="outline" className="text-[9px] px-1.5 h-5">
            {puzzle.viewMode}
          </Badge>
        </div>
        <button onPointerDown={e => e.stopPropagation()} onClick={() => setMinimized(!minimized)} className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button onPointerDown={e => e.stopPropagation()} onClick={onClose} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Content ── */}
      {!minimized && (
        <div className="flex-1 overflow-y-auto py-2 cursor-default" onPointerDown={e => e.stopPropagation()}>
          {/* About Section */}
          <CollapsibleSection
            icon={<BookOpen className="w-3.5 h-3.5 text-primary" />}
            iconBg="bg-primary/15"
            title="About this Puzzle"
            defaultOpen
          >
            <div className="p-3.5 rounded-xl bg-[var(--surface-raised)] border border-border/60">
              <h2 className="text-base font-bold text-foreground leading-tight">{puzzle.title}</h2>
              {puzzle.description && (
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
                  {puzzle.description}
                </p>
              )}
              {puzzle.link && (
                <a
                  href={puzzle.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-primary hover:underline break-all"
                >
                  {puzzle.link_label ?? puzzle.link}
                </a>
              )}
              {puzzle.description_image && (
                <img
                  src={puzzle.description_image}
                  alt="Puzzle illustration"
                  className="mt-3 w-full max-h-64 object-contain rounded-lg border border-border bg-background"
                />
              )}
              {puzzle.description_html && (
                <iframe
                  title="Puzzle description"
                  srcDoc={puzzle.description_html}
                  sandbox=""
                  className="mt-3 w-full h-64 rounded-lg border border-border bg-background"
                />
              )}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="text-[10px] font-mono">{board.width}&times;{board.height} board</Badge>
                <Badge variant="outline" className="text-[10px]">{puzzle.viewMode} mode</Badge>
                <Badge variant="outline" className="text-[10px]">{puzzle.inventory.length} bricks</Badge>
              </div>
            </div>
          </CollapsibleSection>

          {/* Controls Section */}
          <CollapsibleSection
            icon={<Keyboard className="w-3.5 h-3.5 text-primary" />}
            iconBg="bg-primary/15"
            title="Controls"
            badge="4 actions"
            defaultOpen
          >
            <div className="grid grid-cols-1 gap-2">
              <ControlItem icon={<MousePointerClick className="w-4 h-4" />} action="Select & Place" steps={[
                { label: 'Click', target: 'a brick in the inventory', highlight: true },
                { label: 'Then click', target: 'a cell on the board', highlight: true },
              ]} />
              <ControlItem icon={<RotateCw className="w-4 h-4" />} action="Rotate Brick" steps={[
                { label: 'Press', target: 'R', isKey: true },
                { label: 'to rotate before placing' },
              ]} />
              <ControlItem icon={<Move className="w-4 h-4" />} action="Move Brick" steps={[
                { label: 'Click', target: 'a placed brick on the board', highlight: true },
                { label: 'to pick it back up' },
              ]} />
              <ControlItem icon={<Trash2 className="w-4 h-4" />} action="Remove Brick" steps={[
                { label: 'Select a placed brick, then press', target: 'Del', isKey: true },
              ]} />
            </div>
          </CollapsibleSection>

          {/* Win Rules Section */}
          <CollapsibleSection
            icon={<ListChecks className="w-3.5 h-3.5 text-gold" />}
            iconBg="bg-gold/15"
            title="Win Conditions"
            badge={`${puzzle.validation_rules.length} rules`}
            defaultOpen
          >
            <div className="space-y-2">
              {puzzle.validation_rules.map((rule, i) => {
                const isCustom = rule.rule.startsWith('CUSTOM:');
                const friendly = isCustom ? null : FRIENDLY_RULES[rule.rule];
                const label = isCustom ? rule.rule.slice(7) : (friendly?.label || rule.rule.replace(/_/g, ' '));
                const desc = isCustom ? 'Custom rule' : (friendly?.desc || `Rule type: ${rule.type}`);

                return (
                  <div key={`${rule.rule}-${i}`} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-raised)] border border-border/60 hover:border-primary/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Grid3X3 className="w-4 h-4 text-primary/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 h-5 shrink-0 mt-1">{rule.type}</Badge>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* ── Resize Handle ── */}
      {!minimized && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize group"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
        >
          <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
            <path d="M14 14L8 14M14 14L14 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M14 14L10 10" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

interface ControlStep {
  label: string;
  target?: string;
  isKey?: boolean;
  highlight?: boolean;
}

/** Collapsible section with icon header */
function CollapsibleSection({ icon, iconBg, title, badge, defaultOpen = true, children }: {
  icon: React.ReactNode; iconBg: string; title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className={`w-6 h-6 rounded-md ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 flex-1 text-left">{title}</h3>
        {badge && <span className="text-[10px] text-muted-foreground">{badge}</span>}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function ControlItem({ icon, action, steps }: { icon: React.ReactNode; action: string; steps: ControlStep[] }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-raised)] border border-border/60">
      <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center text-primary shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-foreground">{action}</span>
        <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
          {steps.map((step, i) => (
            <span key={i}>
              {i > 0 && ' '}
              {step.label}{' '}
              {step.target && (step.isKey ? (
                <kbd className="inline-flex px-1.5 py-0.5 bg-secondary text-foreground rounded font-mono text-[11px] font-bold border border-border shadow-[0_1px_0_var(--border)]">{step.target}</kbd>
              ) : step.highlight ? (
                <span className="font-semibold text-primary">{step.target}</span>
              ) : (
                <span>{step.target}</span>
              ))}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
