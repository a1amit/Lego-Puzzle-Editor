import { usePuzzleStore } from '../../store/puzzleStore';
import { Button } from '../ui/shadcn/button';
import { Badge } from '../ui/shadcn/badge';
import { Progress } from '../ui/shadcn/progress';
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
  const failedCount = Math.max(0, totalCount - passedCount);
  const passPercent = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-card/95 via-card/85 to-card/70 border-b border-border/70 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          VALIDATION
        </h3>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 shadow-sm" onClick={resetPuzzle}>
          <RefreshCw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      {/* Status */}
      <div className={`
        flex-shrink-0 px-4 py-3 text-center transition-colors duration-300 border-b
        ${isComplete
          ? 'bg-success/15 text-success border-success/20'
          : 'bg-card/35 border-border/60'
        }
      `}>
        {isComplete ? (
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            <span className="font-bold tracking-wide">PUZZLE COMPLETE!</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-2">
            <Badge variant="secondary" className="text-xs font-mono">
              {passedCount} / {totalCount}
            </Badge>
            <span>rules passing</span>
          </div>
        )}
        {!isComplete && (
          <>
            <Progress value={passPercent} className="h-1.5" />
            <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
              <span className="text-success font-medium">Passed: {passedCount}</span>
              <span className="text-destructive font-medium">Failed: {failedCount}</span>
            </div>
          </>
        )}
      </div>

      {/* Rules list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5 bg-gradient-to-b from-transparent to-background/35">
        {validationResults.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Place bricks to see validation
          </p>
        ) : (
          validationResults.map((result, index) => (
            <div
              key={index}
              className={`
                p-3 rounded-xl border transition-all duration-200
                ${result.isValid
                  ? 'bg-success/10 border-success/30 shadow-[0_0_0_1px_rgba(63,185,80,0.08)]'
                  : 'bg-destructive/10 border-destructive/30 shadow-[0_0_0_1px_rgba(248,81,73,0.08)]'
                }
              `}
            >
              <div className="flex items-start gap-2.5">
                {result.isValid ? (
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-success" />
                  </div>
                ) : (
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`
                    text-xs font-semibold tracking-wide uppercase
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

    </div>
  );
}
