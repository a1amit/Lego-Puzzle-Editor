import { usePuzzleStore } from '../../store/puzzleStore';
import { Button } from '../ui/shadcn/button';
import { Sparkles } from 'lucide-react';
import type { UsePuzzleEngineReturn } from '../../engine';

interface MovesPanelProps {
  className?: string;
  /** When provided, dispatches against the engine — required for the
   * editor's preview pane which uses a local engine instance instead of
   * the global puzzleStore. */
  engine?: UsePuzzleEngineReturn;
}

/**
 * Renders the puzzle's `moves[]` as a grid of buttons. Each click dispatches
 * `applyMove(moveId)`, which atomically applies the move's transform to the
 * board.
 *
 * The panel is only rendered when `puzzle.moves` is non-empty — see
 * PuzzleShell which conditionally adds the tab. Inside the panel we still
 * guard for the empty case so the component can be used standalone.
 */
export function MovesPanel({ className = '', engine }: MovesPanelProps) {
  const storePuzzle = usePuzzleStore((s) => s.puzzle);
  const storeApplyMove = usePuzzleStore((s) => s.applyMove);

  const puzzle = engine?.puzzle ?? storePuzzle;
  const applyMove = engine?.applyMove ?? storeApplyMove;

  const moves = puzzle?.moves ?? [];

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-[var(--surface-raised)] to-[var(--surface-base)] border-b border-border">
        <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          MOVES
        </h3>
        <div className="mt-1 text-xs text-muted-foreground">
          {moves.length} {moves.length === 1 ? 'move' : 'moves'} available
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 bg-gradient-to-b from-transparent to-background/40">
        {moves.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            This puzzle defines no moves.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
            {moves.map((move) => {
              if (move.trigger.kind !== 'button') return null;
              const accent = move.trigger.color;
              return (
                <Button
                  key={move.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyMove(move.id)}
                  className="h-12 flex-col gap-1 font-mono text-sm font-bold border-2 hover:bg-primary/10"
                  style={accent ? { borderColor: accent, color: accent } : undefined}
                  title={`Move: ${move.id}`}
                >
                  {move.trigger.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
