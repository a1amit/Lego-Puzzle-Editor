/**
 * Custom Rule Evaluator
 *
 * Recursive interpreter that evaluates a ConditionNode tree against a BoardState.
 * Registered in ValidationRegistry as the CUSTOM_RULE validator.
 */

import type { BoardState, PlacedBrick } from '../types/puzzle';
import type {
  ConditionNode,
  CombinatorNode,
  LeafCondition,
  ComparisonOperator,
} from '../types/customRules';
import { isCombinator, CustomRuleParamsSchema } from '../types/customRules';
import { getAllOccupiedCells, getBrickCells, ValidationRegistry } from './ValidationRegistry';
import type { ValidationFunction } from './ValidationRegistry';

// ============================================
// EVALUATION RESULT (internal)
// ============================================

interface EvalResult {
  passed: boolean;
  message: string;
  affectedCells?: [number, number][];
}

// ============================================
// COMPARISON UTILITY
// ============================================

function compareValues(actual: number, op: ComparisonOperator, expected: number): boolean {
  switch (op) {
    case 'eq': return actual === expected;
    case 'neq': return actual !== expected;
    case 'gt': return actual > expected;
    case 'gte': return actual >= expected;
    case 'lt': return actual < expected;
    case 'lte': return actual <= expected;
  }
}

function comparisonText(op: ComparisonOperator): string {
  switch (op) {
    case 'eq': return 'equal to';
    case 'neq': return 'not equal to';
    case 'gt': return 'greater than';
    case 'gte': return 'at least';
    case 'lt': return 'less than';
    case 'lte': return 'at most';
  }
}

// ============================================
// BOARD HELPERS
// ============================================

/** Get the color of the top brick at (x,y), or null if empty */
function getTopColorAt(occupiedMap: Map<string, PlacedBrick[]>, x: number, y: number): string | null {
  const bricks = occupiedMap.get(`${x},${y}`);
  if (!bricks || bricks.length === 0) return null;
  // Top brick = highest z
  let top = bricks[0];
  for (let i = 1; i < bricks.length; i++) {
    if (bricks[i].z > top.z) top = bricks[i];
  }
  return top.color.toLowerCase();
}

/** Count distinct z-levels occupied at a cell */
function stackHeightAt(occupiedMap: Map<string, PlacedBrick[]>, x: number, y: number): number {
  const bricks = occupiedMap.get(`${x},${y}`);
  if (!bricks || bricks.length === 0) return 0;
  const zLevels = new Set(bricks.map(b => b.z));
  return zLevels.size;
}

/** Get all stack heights across the board */
function getAllStackHeights(occupiedMap: Map<string, PlacedBrick[]>): number[] {
  const heights: number[] = [];
  for (const [, bricks] of occupiedMap) {
    if (bricks.length > 0) {
      const zLevels = new Set(bricks.map(b => b.z));
      heights.push(zLevels.size);
    }
  }
  return heights;
}

// ============================================
// LEAF EVALUATORS
// ============================================

type LeafEvaluator = (condition: LeafCondition, boardState: BoardState) => EvalResult;

const NO_CELLS: EvalResult = { passed: false, message: 'No cells selected — use the cell picker' };

const leafEvaluators: Record<string, LeafEvaluator> = {
  // --- Cell ---
  cells_are_covered(cond, board) {
    if (cond.kind !== 'cells_are_covered') throw new Error('wrong kind');
    if (cond.cells.length === 0) return NO_CELLS;
    const occupied = getAllOccupiedCells(board);
    const uncovered: [number, number][] = [];
    for (const [x, y] of cond.cells) {
      if (!occupied.has(`${x},${y}`)) uncovered.push([x, y]);
    }
    return uncovered.length === 0
      ? { passed: true, message: `All ${cond.cells.length} target cell(s) are covered` }
      : { passed: false, message: `${uncovered.length} cell(s) not covered`, affectedCells: uncovered };
  },

  cells_are_empty(cond, board) {
    if (cond.kind !== 'cells_are_empty') throw new Error('wrong kind');
    if (cond.cells.length === 0) return NO_CELLS;
    const occupied = getAllOccupiedCells(board);
    const nonEmpty: [number, number][] = [];
    for (const [x, y] of cond.cells) {
      if (occupied.has(`${x},${y}`)) nonEmpty.push([x, y]);
    }
    return nonEmpty.length === 0
      ? { passed: true, message: `All ${cond.cells.length} target cell(s) are empty` }
      : { passed: false, message: `${nonEmpty.length} cell(s) should be empty`, affectedCells: nonEmpty };
  },

  cells_have_color(cond, board) {
    if (cond.kind !== 'cells_have_color') throw new Error('wrong kind');
    if (cond.cells.length === 0) return NO_CELLS;
    const occupied = getAllOccupiedCells(board);
    const target = cond.color.toLowerCase();
    const wrong: [number, number][] = [];
    for (const [x, y] of cond.cells) {
      const color = getTopColorAt(occupied, x, y);
      if (color !== target) wrong.push([x, y]);
    }
    return wrong.length === 0
      ? { passed: true, message: `All cells have the correct color` }
      : { passed: false, message: `${wrong.length} cell(s) have wrong color`, affectedCells: wrong };
  },

  // --- Row/Column ---
  row_fully_covered(cond, board) {
    if (cond.kind !== 'row_fully_covered') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const uncovered: [number, number][] = [];
    for (let x = 0; x < board.dimensions.width; x++) {
      if (!occupied.has(`${x},${cond.row}`)) uncovered.push([x, cond.row]);
    }
    return uncovered.length === 0
      ? { passed: true, message: `Row ${cond.row} is fully covered` }
      : { passed: false, message: `Row ${cond.row}: ${uncovered.length} cell(s) uncovered`, affectedCells: uncovered };
  },

  column_fully_covered(cond, board) {
    if (cond.kind !== 'column_fully_covered') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const uncovered: [number, number][] = [];
    for (let y = 0; y < board.dimensions.height; y++) {
      if (!occupied.has(`${cond.column},${y}`)) uncovered.push([cond.column, y]);
    }
    return uncovered.length === 0
      ? { passed: true, message: `Column ${cond.column} is fully covered` }
      : { passed: false, message: `Column ${cond.column}: ${uncovered.length} cell(s) uncovered`, affectedCells: uncovered };
  },

  row_is_empty(cond, board) {
    if (cond.kind !== 'row_is_empty') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const nonEmpty: [number, number][] = [];
    for (let x = 0; x < board.dimensions.width; x++) {
      if (occupied.has(`${x},${cond.row}`)) nonEmpty.push([x, cond.row]);
    }
    return nonEmpty.length === 0
      ? { passed: true, message: `Row ${cond.row} is empty` }
      : { passed: false, message: `Row ${cond.row}: ${nonEmpty.length} cell(s) should be empty`, affectedCells: nonEmpty };
  },

  column_is_empty(cond, board) {
    if (cond.kind !== 'column_is_empty') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const nonEmpty: [number, number][] = [];
    for (let y = 0; y < board.dimensions.height; y++) {
      if (occupied.has(`${cond.column},${y}`)) nonEmpty.push([cond.column, y]);
    }
    return nonEmpty.length === 0
      ? { passed: true, message: `Column ${cond.column} is empty` }
      : { passed: false, message: `Column ${cond.column}: ${nonEmpty.length} cell(s) should be empty`, affectedCells: nonEmpty };
  },

  // --- Count ---
  total_pieces_placed(cond, board) {
    if (cond.kind !== 'total_pieces_placed') throw new Error('wrong kind');
    const count = board.placedBricks.length;
    const pass = compareValues(count, cond.operator, cond.value);
    return {
      passed: pass,
      message: pass
        ? `${count} piece(s) placed (${comparisonText(cond.operator)} ${cond.value})`
        : `${count} piece(s) placed, need ${comparisonText(cond.operator)} ${cond.value}`,
    };
  },

  pieces_of_color_count(cond, board) {
    if (cond.kind !== 'pieces_of_color_count') throw new Error('wrong kind');
    const target = cond.color.toLowerCase();
    const count = board.placedBricks.filter(b => b.color.toLowerCase() === target).length;
    const pass = compareValues(count, cond.operator, cond.value);
    return {
      passed: pass,
      message: pass
        ? `${count} piece(s) of color ${cond.color}`
        : `${count} piece(s) of color ${cond.color}, need ${comparisonText(cond.operator)} ${cond.value}`,
    };
  },

  pieces_of_shape_count(cond, board) {
    if (cond.kind !== 'pieces_of_shape_count') throw new Error('wrong kind');
    const count = board.placedBricks.filter(b => b.shape === cond.shape).length;
    const pass = compareValues(count, cond.operator, cond.value);
    return {
      passed: pass,
      message: pass
        ? `${count} ${cond.shape} piece(s) placed`
        : `${count} ${cond.shape} piece(s), need ${comparisonText(cond.operator)} ${cond.value}`,
    };
  },

  covered_cell_count(cond, board) {
    if (cond.kind !== 'covered_cell_count') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const count = occupied.size;
    const pass = compareValues(count, cond.operator, cond.value);
    return {
      passed: pass,
      message: pass
        ? `${count} cell(s) covered`
        : `${count} cell(s) covered, need ${comparisonText(cond.operator)} ${cond.value}`,
    };
  },

  // --- 3D / Stacking ---
  stack_height_at_cells(cond, board) {
    if (cond.kind !== 'stack_height_at_cells') throw new Error('wrong kind');
    if (cond.cells.length === 0) return NO_CELLS;
    const occupied = getAllOccupiedCells(board);
    const failing: [number, number][] = [];
    for (const [x, y] of cond.cells) {
      const height = stackHeightAt(occupied, x, y);
      if (!compareValues(height, cond.operator, cond.value)) {
        failing.push([x, y]);
      }
    }
    return failing.length === 0
      ? { passed: true, message: `Stack height at target cells is ${comparisonText(cond.operator)} ${cond.value}` }
      : { passed: false, message: `${failing.length} cell(s) don't meet height requirement`, affectedCells: failing };
  },

  max_stack_height(cond, board) {
    if (cond.kind !== 'max_stack_height') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const heights = getAllStackHeights(occupied);
    const maxH = heights.length > 0 ? Math.max(...heights) : 0;
    const pass = compareValues(maxH, cond.operator, cond.value);
    return {
      passed: pass,
      message: pass
        ? `Max stack height is ${maxH}`
        : `Max stack height is ${maxH}, need ${comparisonText(cond.operator)} ${cond.value}`,
    };
  },

  min_stack_height(cond, board) {
    if (cond.kind !== 'min_stack_height') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const heights = getAllStackHeights(occupied);
    const minH = heights.length > 0 ? Math.min(...heights) : 0;
    const pass = compareValues(minH, cond.operator, cond.value);
    return {
      passed: pass,
      message: pass
        ? `Min stack height is ${minH}`
        : `Min stack height is ${minH}, need ${comparisonText(cond.operator)} ${cond.value}`,
    };
  },

  // --- Spatial ---
  no_adjacent_same_color(cond, board) {
    if (cond.kind !== 'no_adjacent_same_color') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const violations: [number, number][] = [];
    const directions: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (const [key] of occupied) {
      const [x, y] = key.split(',').map(Number);
      const color = getTopColorAt(occupied, x, y);
      if (!color) continue;

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborColor = getTopColorAt(occupied, nx, ny);
        if (neighborColor === color) {
          violations.push([x, y]);
          break;
        }
      }
    }

    return violations.length === 0
      ? { passed: true, message: 'No adjacent cells share a color' }
      : { passed: false, message: `${violations.length} cell(s) have same-color neighbors`, affectedCells: violations };
  },

  all_covered_connected(cond, board) {
    if (cond.kind !== 'all_covered_connected') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    if (occupied.size === 0) {
      return { passed: true, message: 'No covered cells (trivially connected)' };
    }

    // BFS flood fill from first occupied cell
    const allKeys = new Set(occupied.keys());
    const startKey = allKeys.values().next().value!;
    const visited = new Set<string>();
    const queue = [startKey];
    visited.add(startKey);

    while (queue.length > 0) {
      const key = queue.shift()!;
      const [x, y] = key.split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
        const nk = `${x + dx},${y + dy}`;
        if (allKeys.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    if (visited.size === allKeys.size) {
      return { passed: true, message: 'All covered cells are connected' };
    }

    // Find disconnected cells
    const disconnected: [number, number][] = [];
    for (const key of allKeys) {
      if (!visited.has(key)) {
        const [x, y] = key.split(',').map(Number);
        disconnected.push([x, y]);
      }
    }
    return { passed: false, message: `${disconnected.length} cell(s) are disconnected`, affectedCells: disconnected };
  },

  piece_at_position(cond, board) {
    if (cond.kind !== 'piece_at_position') throw new Error('wrong kind');
    if (cond.cells.length === 0) return NO_CELLS;
    const targetCellSet = new Set(cond.cells.map(([x, y]) => `${x},${y}`));
    const piece = board.placedBricks.find(b => b.id === cond.pieceId);

    if (!piece) {
      return { passed: false, message: `Piece "${cond.pieceId}" not placed yet` };
    }

    const pieceCells = getBrickCells(piece);
    const pieceCellSet = new Set(pieceCells.map(([x, y]) => `${x},${y}`));

    const match = pieceCellSet.size === targetCellSet.size &&
      [...pieceCellSet].every(k => targetCellSet.has(k));

    if (match) {
      return { passed: true, message: `Piece "${cond.pieceId}" is at the correct position` };
    }

    const wrong = pieceCells.filter(([x, y]) => !targetCellSet.has(`${x},${y}`));
    return { passed: false, message: `Piece "${cond.pieceId}" is not at the target position`, affectedCells: wrong };
  },

  // --- Symmetry ---
  horizontal_symmetry(cond, board) {
    if (cond.kind !== 'horizontal_symmetry') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const w = board.dimensions.width;
    const violations: [number, number][] = [];

    for (const [key] of occupied) {
      const [x, y] = key.split(',').map(Number);
      const mirrorX = w - 1 - x;
      const color = getTopColorAt(occupied, x, y);
      const mirrorColor = getTopColorAt(occupied, mirrorX, y);

      if (color !== mirrorColor) {
        violations.push([x, y]);
      }
    }

    // Also check: mirror cells must exist
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < board.dimensions.height; y++) {
        const key = `${x},${y}`;
        const mirrorKey = `${w - 1 - x},${y}`;
        const has = occupied.has(key);
        const mirrorHas = occupied.has(mirrorKey);
        if (has !== mirrorHas && !violations.some(([vx, vy]) => vx === x && vy === y)) {
          violations.push([x, y]);
        }
      }
    }

    return violations.length === 0
      ? { passed: true, message: 'Board is horizontally symmetric' }
      : { passed: false, message: `${violations.length} cell(s) break horizontal symmetry`, affectedCells: violations };
  },

  vertical_symmetry(cond, board) {
    if (cond.kind !== 'vertical_symmetry') throw new Error('wrong kind');
    const occupied = getAllOccupiedCells(board);
    const h = board.dimensions.height;
    const violations: [number, number][] = [];

    for (let x = 0; x < board.dimensions.width; x++) {
      for (let y = 0; y < h; y++) {
        const key = `${x},${y}`;
        const mirrorY = h - 1 - y;
        const mirrorKey = `${x},${mirrorY}`;
        const has = occupied.has(key);
        const mirrorHas = occupied.has(mirrorKey);

        if (has !== mirrorHas) {
          violations.push([x, y]);
        } else if (has && mirrorHas) {
          const color = getTopColorAt(occupied, x, y);
          const mirrorColor = getTopColorAt(occupied, x, mirrorY);
          if (color !== mirrorColor) {
            violations.push([x, y]);
          }
        }
      }
    }

    return violations.length === 0
      ? { passed: true, message: 'Board is vertically symmetric' }
      : { passed: false, message: `${violations.length} cell(s) break vertical symmetry`, affectedCells: violations };
  },
};

// ============================================
// RECURSIVE EVALUATOR
// ============================================

function evaluateCombinator(node: CombinatorNode, boardState: BoardState): EvalResult {
  const childResults = node.children.map(child => evaluateCondition(child, boardState));
  const passCount = childResults.filter(r => r.passed).length;
  const total = childResults.length;

  // Merge affected cells from failing children
  const affectedCells: [number, number][] = [];
  for (const r of childResults) {
    if (!r.passed && r.affectedCells) {
      affectedCells.push(...r.affectedCells);
    }
  }

  switch (node.kind) {
    case 'ALL': {
      const passed = passCount === total;
      return {
        passed,
        message: passed
          ? `All ${total} condition(s) met`
          : `${passCount} of ${total} conditions met — all must pass`,
        affectedCells: passed ? undefined : affectedCells,
      };
    }
    case 'ANY': {
      const passed = passCount > 0;
      return {
        passed,
        message: passed
          ? `${passCount} of ${total} condition(s) met`
          : `0 of ${total} conditions met — at least one must pass`,
        affectedCells: passed ? undefined : affectedCells,
      };
    }
    case 'NONE': {
      const passed = passCount === 0;
      return {
        passed,
        message: passed
          ? `None of ${total} conditions met (as required)`
          : `${passCount} condition(s) unexpectedly pass — none must pass`,
        affectedCells: passed ? undefined : affectedCells,
      };
    }
    case 'EXACTLY_N': {
      const n = node.n ?? 1;
      const passed = passCount === n;
      return {
        passed,
        message: passed
          ? `Exactly ${n} of ${total} condition(s) met`
          : `${passCount} of ${total} conditions pass, but exactly ${n} must pass`,
        affectedCells: passed ? undefined : affectedCells,
      };
    }
    case 'AT_LEAST_N': {
      const n = node.n ?? 1;
      const passed = passCount >= n;
      return {
        passed,
        message: passed
          ? `${passCount} of ${total} condition(s) met (need ${n}+)`
          : `${passCount} of ${total} conditions pass, but at least ${n} must pass`,
        affectedCells: passed ? undefined : affectedCells,
      };
    }
  }
}

export function evaluateCondition(node: ConditionNode, boardState: BoardState): EvalResult {
  if (isCombinator(node)) {
    return evaluateCombinator(node, boardState);
  }

  const evaluator = leafEvaluators[node.kind];
  if (!evaluator) {
    return { passed: false, message: `Unknown condition: ${node.kind}` };
  }

  return evaluator(node, boardState);
}

// ============================================
// VALIDATION REGISTRY ENTRY POINT
// ============================================

export const validateCustomRule: ValidationFunction = (boardState, params) => {
  const parsed = CustomRuleParamsSchema.safeParse(params);
  if (!parsed.success) {
    return {
      isValid: false,
      rule: 'CUSTOM_RULE',
      message: `Invalid custom rule: ${parsed.error.message}`,
    };
  }

  const { label, description, condition } = parsed.data;
  const result = evaluateCondition(condition, boardState);

  // Show the creator's description when failing, internal status when passing
  const message = !result.passed && description
    ? description
    : result.message;

  return {
    isValid: result.passed,
    rule: `CUSTOM:${label}`,
    message,
    affectedCells: result.affectedCells,
  };
};

// Self-register into ValidationRegistry — avoids circular dependency
// (this module imports helpers from ValidationRegistry, so the registry
// can't import from here at module load time)
ValidationRegistry.register('CUSTOM_RULE', validateCustomRule);
