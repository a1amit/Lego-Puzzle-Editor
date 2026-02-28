import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { m, AnimatePresence } from 'framer-motion';
import { usePuzzleStore } from '../../store/puzzleStore';
import { Button } from '../ui/shadcn/button';
import { Badge } from '../ui/shadcn/badge';
import { Progress } from '../ui/shadcn/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/shadcn/tooltip';
import { ShieldCheck, Check, X, RefreshCw, Trophy } from 'lucide-react';
import type { UsePuzzleEngineReturn } from '../../engine';

const FRIENDLY_RULE_NAMES: Record<string, string> = {
  'ALL_BOARD_SQUARES_MUST_BE_COVERED': 'Cover every cell on the board',
  'ALL_PIECES_MUST_BE_PLACED': 'Place all pieces',
  'ALL_BRICKS_MUST_BE_USED': 'Place all bricks',
  'NO_OVERLAPPING': 'No overlapping pieces',
  'NO_BRICK_OVERLAP': 'No overlapping pieces',
  'NO_ROTATION': 'Rotation is disabled',
  'SLIDING_ONLY': 'Pieces can only slide',
  'EXACT_COVERAGE': 'Cover exactly the right cells',
  'GOAL_REACHED': 'Move the piece to the goal',
  'MAX_MOVES': 'Complete within move limit',
  'MATCH_PATTERN': 'Match the target pattern',
  'PATTERN_MATCH': 'Match the target pattern',
  'NO_ADJACENT_SAME_COLOR': 'No same colors touching',
  'BINARY_ENCODING': 'Encode the binary pattern',
  'ROWS_AND_COLUMNS': 'Match row and column clues',
  'NO_BRICKS_OUT_OF_BOUNDS': 'Keep all bricks on the board',
  'NO_BLOCKED_CELLS': 'Avoid blocked cells',
  'FREE_PLACEMENT': 'Free placement allowed',
  'NO_BRICK_REMOVAL': 'Bricks cannot be removed',
};

interface ValidationPanelProps {
  className?: string;
  engine?: UsePuzzleEngineReturn;
}

export function ValidationPanel({ className = '', engine }: ValidationPanelProps) {
  const store = usePuzzleStore(useShallow(s => ({
    puzzle: s.puzzle,
    validationResults: s.validationResults,
    isComplete: s.isComplete,
    resetPuzzle: s.resetPuzzle,
  })));

  const [confirmReset, setConfirmReset] = useState(false);

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

  const handleReset = () => {
    if (confirmReset) {
      resetPuzzle();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-[var(--surface-raised)] to-[var(--surface-base)] border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          VALIDATION
        </h3>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={confirmReset ? 'destructive' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1.5 shadow-sm"
                onClick={handleReset}
              >
                <RefreshCw className="w-3 h-3" />
                {confirmReset ? 'Confirm?' : 'Reset'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{confirmReset ? 'Click again to confirm reset' : 'Reset puzzle'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Status */}
      <div className={`
        flex-shrink-0 px-4 py-3 text-center transition-colors duration-300 border-b
        ${isComplete
          ? 'bg-success/15 text-success border-success/20'
          : 'bg-[var(--surface-sunken)] border-[var(--border-subtle)]'
        }
      `}>
        {isComplete ? (
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            <span
              className="font-bold tracking-wide bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, var(--color-success), #7ee787, var(--color-success))',
                backgroundSize: '200% auto',
                animation: 'shimmer-text 3s linear infinite',
              }}
            >
              PUZZLE COMPLETE!
            </span>
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
            <Progress value={passPercent} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-primary [&>[data-slot=progress-indicator]]:to-primary/70" />
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
          <AnimatePresence mode="popLayout">
            {validationResults.map((result) => (
              <m.div
                key={result.rule}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`
                  p-3 rounded-xl border transition-colors duration-300
                  ${result.isValid
                    ? 'bg-success/10 border-success/30'
                    : 'bg-destructive/10 border-destructive/30'
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
                      text-xs font-semibold tracking-wide
                      ${result.isValid ? 'text-success' : 'text-destructive'}
                    `}>
                      {FRIENDLY_RULE_NAMES[result.rule] || result.rule.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {result.message}
                    </div>
                  </div>
                </div>
              </m.div>
            ))}
          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
