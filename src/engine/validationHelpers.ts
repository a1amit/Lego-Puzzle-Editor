/**
 * Shared Validation Helpers
 *
 * Enriches puzzle validation rules with runtime parameters.
 * Used by BOTH the Zustand store and the usePuzzleEngine hook
 * to eliminate duplicated rule-enrichment logic.
 */

import type { PuzzleDefinition, ValidationRule } from '../types/puzzle';
import type { Coordinate2D } from './types';

// Side-effect import: registers CUSTOM_RULE validator in ValidationRegistry
import '../validation/customRuleEvaluator';

/**
 * Enrich validation rules from a puzzle definition with the runtime
 * parameters that specific validators need (inventory data, goal cells,
 * target pattern, current move count, etc.)
 */
export function enrichValidationRules(
  puzzle: PuzzleDefinition,
  moveCount: number,
): ValidationRule[] {
  return puzzle.validation_rules.map(rule => {
    // ALL_BRICKS_MUST_BE_USED needs inventory data
    if (rule.rule === 'ALL_BRICKS_MUST_BE_USED') {
      return {
        ...rule,
        params: {
          ...rule.params,
          inventory: puzzle.inventory.map(b => ({ id: b.id, quantity: b.quantity })),
        },
      };
    }

    // GOAL_REACHED needs goal cells + optional stationary data
    if (rule.rule === 'GOAL_REACHED' && puzzle.goal) {
      let initialPositions: Array<{ id: string; cells: Coordinate2D[] }> | undefined;
      if (puzzle.goal.requireOtherPiecesStationary && puzzle.board.initial_state) {
        initialPositions = puzzle.board.initial_state
          .filter((p): p is { id: string; cells: Coordinate2D[]; color: string } =>
            'cells' in p && 'id' in p,
          )
          .map(p => ({ id: p.id, cells: p.cells }));
      }

      return {
        ...rule,
        params: {
          ...rule.params,
          targetPieceId: puzzle.goal.targetPieceId,
          targetPieceIds: puzzle.goal.targetPieceIds,
          allowAnyPiece: puzzle.goal.allowAnyPiece,
          goalCells: puzzle.goal.cells,
          requireOtherPiecesStationary: puzzle.goal.requireOtherPiecesStationary,
          initialPositions,
        },
      };
    }

    // PATTERN_MATCH needs target pattern data
    if (rule.rule === 'PATTERN_MATCH' && puzzle.target_pattern) {
      return {
        ...rule,
        params: {
          ...rule.params,
          rows: puzzle.target_pattern.rows,
          color_mapping: puzzle.target_pattern.color_mapping,
          allow_empty_cells: puzzle.target_pattern.allow_empty_cells,
        },
      };
    }

    // CUSTOM_RULE is self-contained — params already has the full condition tree
    if (rule.rule === 'CUSTOM_RULE') {
      return rule;
    }

    // MAX_MOVES needs current move count
    if (rule.rule === 'MAX_MOVES') {
      return {
        ...rule,
        params: {
          ...rule.params,
          currentMoves: moveCount,
        },
      };
    }

    return rule;
  });
}

/**
 * Check if a puzzle has the SLIDING_ONLY movement rule
 */
export function hasSlidingOnlyRule(puzzle: PuzzleDefinition | null): boolean {
  if (!puzzle) return false;
  return puzzle.validation_rules.some(
    r => r.type === 'MOVEMENT' && r.rule === 'SLIDING_ONLY',
  );
}

/**
 * Check if a puzzle has the NO_BRICK_REMOVAL constraint rule
 */
export function hasNoBrickRemovalRule(puzzle: PuzzleDefinition | null): boolean {
  if (!puzzle) return false;
  return puzzle.validation_rules.some(r => r.rule === 'NO_BRICK_REMOVAL');
}
