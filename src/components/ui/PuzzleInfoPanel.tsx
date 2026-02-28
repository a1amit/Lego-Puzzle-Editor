import { useShallow } from 'zustand/react/shallow';
import { usePuzzleStore } from '../../store/puzzleStore';
import { Badge } from '../ui/shadcn/badge';
import { BookOpen, Keyboard, ListChecks } from 'lucide-react';
import type { UsePuzzleEngineReturn } from '../../engine';

interface PuzzleInfoPanelProps {
  className?: string;
  engine?: UsePuzzleEngineReturn;
}

export function PuzzleInfoPanel({ className = '', engine }: PuzzleInfoPanelProps) {
  const store = usePuzzleStore(useShallow(s => ({
    puzzle: s.puzzle,
  })));
  const puzzle = engine?.puzzle ?? store.puzzle;

  if (!puzzle) {
    return null;
  }

  const board = puzzle.board.dimensions;

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-[var(--surface-raised)] to-[var(--surface-base)] border-b border-border">
        <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          PUZZLE INFO
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px] font-mono">
            {board.width}x{board.height}x{board.depth}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {puzzle.viewMode} mode
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {puzzle.validation_rules.length} rules
          </Badge>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 bg-gradient-to-b from-transparent to-background/35">
        <section className="rounded-xl border border-border bg-[var(--surface-raised)] p-3">
          <div className="text-xs font-semibold tracking-wide text-foreground/90 mb-2">{puzzle.title}</div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {puzzle.description}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-[var(--surface-raised)] p-3">
          <div className="text-xs font-semibold tracking-wide text-foreground/90 mb-2 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-primary" />
            CONTROLS
          </div>
          <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <p>Click a brick to select it.</p>
            <p>
              Press <kbd className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded font-mono text-[10px]">R</kbd> to rotate before placing.
            </p>
            <p>Click on the board to place the selected brick.</p>
            <p>Click a placed brick to lift it back.</p>
            <p>
              Press <kbd className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded font-mono text-[10px]">Del</kbd> to remove selected placed bricks.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-[var(--surface-raised)] p-3">
          <div className="text-xs font-semibold tracking-wide text-foreground/90 mb-2 flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5 text-primary" />
            WIN RULES
          </div>
          <div className="space-y-2">
            {puzzle.validation_rules.map((rule, index) => (
              <div key={`${rule.rule}-${index}`} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-2.5 active:scale-[0.97] transition-transform">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/90">
                  {rule.rule.replace(/_/g, ' ')}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Type: {rule.type}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
