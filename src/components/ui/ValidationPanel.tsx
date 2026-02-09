import { usePuzzleStore } from '../../store/puzzleStore';
import { Button } from '../ui/shadcn/button';
import { Badge } from '../ui/shadcn/badge';
import { ShieldCheck, Check, X, RefreshCw, Trophy } from 'lucide-react';
import type { UsePuzzleEngineReturn } from '../../engine';

interface ValidationPanelProps {
  className?: string;
  engine?: UsePuzzleEngineReturn;
}

export function ValidationPanel({ className = '', engine }: ValidationPanelProps) {
  const store = usePuzzleStore();

  const puzzle = engine?.puzzle ?? store.puzzle;
  const validationResults = engine?.validationResults ?? store.validationResults;
  const isComplete = engine?.isComplete ?? store.isComplete;
  const resetPuzzle = engine?.resetBoard ?? store.resetPuzzle;

  if (!puzzle) {
    return null;
  }

  const passedCount = validationResults.filter(r => r.isValid).length;
  const totalCount = validationResults.length;

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-card/50 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          VALIDATION
        </h3>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={resetPuzzle}>
          <RefreshCw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      {/* Status */}
      <div className={`
        flex-shrink-0 px-4 py-3 text-center transition-colors duration-300
        ${isComplete
          ? 'bg-success/15 text-success'
          : 'bg-card/30'
        }
      `}>
        {isComplete ? (
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            <span className="font-bold tracking-wide">PUZZLE COMPLETE!</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Badge variant="secondary" className="text-xs font-mono">
              {passedCount} / {totalCount}
            </Badge>
            <span>rules passing</span>
          </div>
        )}
      </div>

      {/* Rules list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {validationResults.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Place bricks to see validation
          </p>
        ) : (
          validationResults.map((result, index) => (
            <div
              key={index}
              className={`
                p-3 rounded-lg border transition-all duration-200
                ${result.isValid
                  ? 'bg-success/10 border-success/30'
                  : 'bg-destructive/10 border-destructive/30'
                }
              `}
            >
              <div className="flex items-start gap-2">
                {result.isValid ? (
                  <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`
                    text-xs font-medium
                    ${result.isValid ? 'text-success' : 'text-destructive'}
                  `}>
                    {result.rule.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {result.message}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Puzzle info */}
      <div className="flex-shrink-0 px-4 py-3 bg-card/50 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <div className="font-medium text-foreground mb-1">{puzzle.title}</div>
          <p className="line-clamp-2">{puzzle.description}</p>
        </div>
      </div>
    </div>
  );
}
