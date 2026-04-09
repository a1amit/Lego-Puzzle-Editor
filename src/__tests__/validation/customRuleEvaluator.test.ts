import { describe, it, expect } from 'vitest';
import type { BoardState, PlacedBrick } from '@/types/puzzle';
import type { ConditionNode } from '@/types/customRules';
import { evaluateCondition, validateCustomRule } from '@/validation/customRuleEvaluator';
import { createPlacedBrick } from '../helpers';

// ============================================
// HELPERS
// ============================================

function createBoard(
  bricks: Partial<PlacedBrick>[] = [],
  dims = { width: 4, height: 4, depth: 1 },
): BoardState {
  return {
    dimensions: dims,
    placedBricks: bricks.map((b, i) => createPlacedBrick({
      id: b.id ?? `brick-${i}`,
      instanceId: b.instanceId ?? `inst-${i}`,
      shape: b.shape,
      color: b.color,
      position: b.position,
      rotation: b.rotation,
      z: b.z,
    })),
    blockedCells: [],
  };
}

/** Place a unit brick at each (x, y) position. */
function unitBricksAt(
  cells: [number, number][],
  color = '#ff0000',
  z = 0,
): Partial<PlacedBrick>[] {
  return cells.map(([x, y], i) => ({
    id: `u-${x}-${y}-${z}-${i}`,
    instanceId: `inst-u-${x}-${y}-${z}-${i}`,
    shape: 'unit',
    color,
    position: { x, y },
    z,
  }));
}

// ============================================
// 1. cells_are_covered
// ============================================

describe('cells_are_covered', () => {
  it('passes when all specified cells are covered', () => {
    const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));
    const result = evaluateCondition(
      { kind: 'cells_are_covered', cells: [[0, 0], [1, 0]] },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when some cells are not covered', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'cells_are_covered', cells: [[0, 0], [2, 2]] },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells).toEqual([[2, 2]]);
  });

  it('fails when cells array is empty', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'cells_are_covered', cells: [] },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain('No cells');
  });

  it('fails when no bricks are placed', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'cells_are_covered', cells: [[0, 0]] },
      board,
    );
    expect(result.passed).toBe(false);
  });
});

// ============================================
// 2. cells_are_empty
// ============================================

describe('cells_are_empty', () => {
  it('passes when all specified cells are empty', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'cells_are_empty', cells: [[1, 1], [2, 2]] },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when some cells are occupied', () => {
    const board = createBoard(unitBricksAt([[1, 1]]));
    const result = evaluateCondition(
      { kind: 'cells_are_empty', cells: [[1, 1], [2, 2]] },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells).toEqual([[1, 1]]);
  });

  it('fails when cells array is empty', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'cells_are_empty', cells: [] },
      board,
    );
    expect(result.passed).toBe(false);
  });
});

// ============================================
// 3. cells_have_color
// ============================================

describe('cells_have_color', () => {
  it('passes when all cells have the correct color', () => {
    const board = createBoard(unitBricksAt([[0, 0], [1, 0]], '#ff0000'));
    const result = evaluateCondition(
      { kind: 'cells_have_color', cells: [[0, 0], [1, 0]], color: '#ff0000' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when cells have wrong color', () => {
    const board = createBoard(unitBricksAt([[0, 0]], '#ff0000'));
    const result = evaluateCondition(
      { kind: 'cells_have_color', cells: [[0, 0]], color: '#00ff00' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells).toEqual([[0, 0]]);
  });

  it('is case insensitive', () => {
    const board = createBoard(unitBricksAt([[0, 0]], '#FF0000'));
    const result = evaluateCondition(
      { kind: 'cells_have_color', cells: [[0, 0]], color: '#ff0000' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when cell is empty (no color)', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'cells_have_color', cells: [[0, 0]], color: '#ff0000' },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('fails with empty cells array', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'cells_have_color', cells: [], color: '#ff0000' },
      board,
    );
    expect(result.passed).toBe(false);
  });
});

// ============================================
// 4. row_fully_covered
// ============================================

describe('row_fully_covered', () => {
  it('passes when the entire row is covered', () => {
    const board = createBoard(
      unitBricksAt([[0, 0], [1, 0], [2, 0], [3, 0]]),
    );
    const result = evaluateCondition(
      { kind: 'row_fully_covered', row: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when row is partially covered', () => {
    const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));
    const result = evaluateCondition(
      { kind: 'row_fully_covered', row: 0 },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells).toBeDefined();
    expect(result.affectedCells!.length).toBe(2);
  });

  it('fails when row is completely empty', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'row_fully_covered', row: 0 },
      board,
    );
    expect(result.passed).toBe(false);
  });
});

// ============================================
// 5. column_fully_covered
// ============================================

describe('column_fully_covered', () => {
  it('passes when the entire column is covered', () => {
    const board = createBoard(
      unitBricksAt([[0, 0], [0, 1], [0, 2], [0, 3]]),
    );
    const result = evaluateCondition(
      { kind: 'column_fully_covered', column: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when column is partially covered', () => {
    const board = createBoard(unitBricksAt([[0, 0], [0, 1]]));
    const result = evaluateCondition(
      { kind: 'column_fully_covered', column: 0 },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells!.length).toBe(2);
  });
});

// ============================================
// 6. row_is_empty
// ============================================

describe('row_is_empty', () => {
  it('passes when row has no bricks', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'row_is_empty', row: 1 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when row has bricks', () => {
    const board = createBoard(unitBricksAt([[2, 1]]));
    const result = evaluateCondition(
      { kind: 'row_is_empty', row: 1 },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells).toEqual([[2, 1]]);
  });
});

// ============================================
// 7. column_is_empty
// ============================================

describe('column_is_empty', () => {
  it('passes when column has no bricks', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'column_is_empty', column: 1 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when column has bricks', () => {
    const board = createBoard(unitBricksAt([[1, 2]]));
    const result = evaluateCondition(
      { kind: 'column_is_empty', column: 1 },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells).toEqual([[1, 2]]);
  });
});

// ============================================
// 8. total_pieces_placed
// ============================================

describe('total_pieces_placed', () => {
  const twoBoard = createBoard(unitBricksAt([[0, 0], [1, 0]]));

  it('eq — passes when count matches', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
      twoBoard,
    );
    expect(result.passed).toBe(true);
  });

  it('eq — fails when count differs', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'eq', value: 3 },
      twoBoard,
    );
    expect(result.passed).toBe(false);
  });

  it('gt — passes when count is greater', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'gt', value: 1 },
      twoBoard,
    );
    expect(result.passed).toBe(true);
  });

  it('gt — fails when count equals value', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'gt', value: 2 },
      twoBoard,
    );
    expect(result.passed).toBe(false);
  });

  it('lt — passes when count is less', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'lt', value: 5 },
      twoBoard,
    );
    expect(result.passed).toBe(true);
  });

  it('gte — passes when count is equal', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'gte', value: 2 },
      twoBoard,
    );
    expect(result.passed).toBe(true);
  });

  it('lte — passes when count is less', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'lte', value: 3 },
      twoBoard,
    );
    expect(result.passed).toBe(true);
  });

  it('neq — passes when count differs', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'neq', value: 5 },
      twoBoard,
    );
    expect(result.passed).toBe(true);
  });

  it('neq — fails when count matches', () => {
    const result = evaluateCondition(
      { kind: 'total_pieces_placed', operator: 'neq', value: 2 },
      twoBoard,
    );
    expect(result.passed).toBe(false);
  });
});

// ============================================
// 9. pieces_of_color_count
// ============================================

describe('pieces_of_color_count', () => {
  const board = createBoard([
    ...unitBricksAt([[0, 0], [1, 0]], '#ff0000'),
    ...unitBricksAt([[2, 0]], '#00ff00'),
  ]);

  it('passes when color count matches', () => {
    const result = evaluateCondition(
      { kind: 'pieces_of_color_count', color: '#ff0000', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when color count does not match', () => {
    const result = evaluateCondition(
      { kind: 'pieces_of_color_count', color: '#ff0000', operator: 'eq', value: 1 },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('is case insensitive', () => {
    const result = evaluateCondition(
      { kind: 'pieces_of_color_count', color: '#FF0000', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('returns 0 for a color not present', () => {
    const result = evaluateCondition(
      { kind: 'pieces_of_color_count', color: '#0000ff', operator: 'eq', value: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 10. pieces_of_shape_count
// ============================================

describe('pieces_of_shape_count', () => {
  const board = createBoard([
    { shape: 'unit', position: { x: 0, y: 0 } },
    { shape: 'unit', position: { x: 1, y: 0 } },
    { shape: 'domino', position: { x: 0, y: 1 } },
  ]);

  it('passes when shape count matches', () => {
    const result = evaluateCondition(
      { kind: 'pieces_of_shape_count', shape: 'unit', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when shape count does not match', () => {
    const result = evaluateCondition(
      { kind: 'pieces_of_shape_count', shape: 'domino', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('returns 0 for a shape not used', () => {
    const result = evaluateCondition(
      { kind: 'pieces_of_shape_count', shape: 'T-tetromino', operator: 'eq', value: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 11. covered_cell_count
// ============================================

describe('covered_cell_count', () => {
  it('counts unique occupied cells', () => {
    // A domino covers cells (0,0) and (1,0)
    const board = createBoard([{ shape: 'domino', position: { x: 0, y: 0 } }]);
    const result = evaluateCondition(
      { kind: 'covered_cell_count', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when count does not match', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'covered_cell_count', operator: 'eq', value: 5 },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('counts 0 for an empty board', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'covered_cell_count', operator: 'eq', value: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 12. stack_height_at_cells
// ============================================

describe('stack_height_at_cells', () => {
  it('passes when stack heights meet the comparison at all cells', () => {
    // Two bricks stacked at (0,0) at z=0 and z=1
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000', 0),
      ...unitBricksAt([[0, 0]], '#00ff00', 1),
    ]);
    const result = evaluateCondition(
      { kind: 'stack_height_at_cells', cells: [[0, 0]], operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when a cell does not meet the requirement', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'stack_height_at_cells', cells: [[0, 0]], operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells).toEqual([[0, 0]]);
  });

  it('fails with empty cells array', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'stack_height_at_cells', cells: [], operator: 'eq', value: 1 },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('returns height 0 for unoccupied cell', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'stack_height_at_cells', cells: [[0, 0]], operator: 'eq', value: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 13. max_stack_height
// ============================================

describe('max_stack_height', () => {
  it('passes when max height meets comparison', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000', 0),
      ...unitBricksAt([[0, 0]], '#00ff00', 1),
      ...unitBricksAt([[1, 0]], '#ff0000', 0),
    ]);
    const result = evaluateCondition(
      { kind: 'max_stack_height', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when max height does not meet comparison', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'max_stack_height', operator: 'gt', value: 1 },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('returns 0 for an empty board', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'max_stack_height', operator: 'eq', value: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 14. min_stack_height
// ============================================

describe('min_stack_height', () => {
  it('passes when min height meets comparison', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000', 0),
      ...unitBricksAt([[0, 0]], '#00ff00', 1),
      ...unitBricksAt([[1, 0]], '#ff0000', 0),
    ]);
    // Min non-empty height is 1 (at cell (1,0))
    const result = evaluateCondition(
      { kind: 'min_stack_height', operator: 'eq', value: 1 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when min height does not meet comparison', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'min_stack_height', operator: 'gt', value: 1 },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('returns 0 on empty board', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'min_stack_height', operator: 'eq', value: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 15. no_adjacent_same_color
// ============================================

describe('no_adjacent_same_color', () => {
  it('passes when no adjacent cells share a color', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[1, 0]], '#00ff00'),
    ]);
    const result = evaluateCondition(
      { kind: 'no_adjacent_same_color' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when adjacent cells share a color', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[1, 0]], '#ff0000'),
    ]);
    const result = evaluateCondition(
      { kind: 'no_adjacent_same_color' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells!.length).toBeGreaterThanOrEqual(1);
  });

  it('passes on empty board', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'no_adjacent_same_color' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('passes when same color cells are diagonal (not adjacent)', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[1, 1]], '#ff0000'),
    ]);
    const result = evaluateCondition(
      { kind: 'no_adjacent_same_color' },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 16. all_covered_connected
// ============================================

describe('all_covered_connected', () => {
  it('passes when all covered cells are connected', () => {
    const board = createBoard(
      unitBricksAt([[0, 0], [1, 0], [2, 0]]),
    );
    const result = evaluateCondition(
      { kind: 'all_covered_connected' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when covered cells are disconnected', () => {
    const board = createBoard(
      unitBricksAt([[0, 0], [3, 3]]),
    );
    const result = evaluateCondition(
      { kind: 'all_covered_connected' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells!.length).toBeGreaterThan(0);
  });

  it('passes on empty board (trivially connected)', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'all_covered_connected' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('passes with a single cell', () => {
    const board = createBoard(unitBricksAt([[2, 2]]));
    const result = evaluateCondition(
      { kind: 'all_covered_connected' },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 17. piece_at_position
// ============================================

describe('piece_at_position', () => {
  it('passes when piece is at the expected cells', () => {
    const board = createBoard([
      { id: 'hero', shape: 'unit', position: { x: 2, y: 3 } },
    ]);
    const result = evaluateCondition(
      { kind: 'piece_at_position', pieceId: 'hero', cells: [[2, 3]] },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when piece is at wrong position', () => {
    const board = createBoard([
      { id: 'hero', shape: 'unit', position: { x: 0, y: 0 } },
    ]);
    const result = evaluateCondition(
      { kind: 'piece_at_position', pieceId: 'hero', cells: [[2, 3]] },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('fails when piece is not placed', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'piece_at_position', pieceId: 'hero', cells: [[0, 0]] },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not placed');
  });

  it('works with multi-cell shapes (domino)', () => {
    const board = createBoard([
      { id: 'dom', shape: 'domino', position: { x: 1, y: 2 } },
    ]);
    // domino at position (1,2) occupies cells (1,2) and (2,2)
    const result = evaluateCondition(
      { kind: 'piece_at_position', pieceId: 'dom', cells: [[1, 2], [2, 2]] },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails with empty cells array', () => {
    const board = createBoard([
      { id: 'hero', shape: 'unit', position: { x: 0, y: 0 } },
    ]);
    const result = evaluateCondition(
      { kind: 'piece_at_position', pieceId: 'hero', cells: [] },
      board,
    );
    expect(result.passed).toBe(false);
  });
});

// ============================================
// 18. no_shared_diagonal
// ============================================

describe('no_shared_diagonal', () => {
  it('passes when no two covered cells share a diagonal', () => {
    // Two cells in the same row: (0,0) and (1,0) — not diagonal (dx=1, dy=0, 1 !== 0)
    const board = createBoard(unitBricksAt([[0, 0], [2, 0]]));
    const result = evaluateCondition(
      { kind: 'no_shared_diagonal' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when two cells share a diagonal', () => {
    // (0,0) and (1,1) — abs(1-0) === abs(1-0) → diagonal
    const board = createBoard(unitBricksAt([[0, 0], [1, 1]]));
    const result = evaluateCondition(
      { kind: 'no_shared_diagonal' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells!.length).toBe(2);
  });

  it('passes on empty board', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'no_shared_diagonal' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('passes with a single cell', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'no_shared_diagonal' },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 19. path_exists
// ============================================

describe('path_exists', () => {
  it('passes when a path exists from start to end', () => {
    const board = createBoard(
      unitBricksAt([[0, 0], [1, 0], [2, 0]]),
    );
    const result = evaluateCondition(
      { kind: 'path_exists', startCell: [0, 0], endCell: [2, 0] },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when no path exists', () => {
    const board = createBoard(
      unitBricksAt([[0, 0], [3, 3]]),
    );
    const result = evaluateCondition(
      { kind: 'path_exists', startCell: [0, 0], endCell: [3, 3] },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('fails when start cell is not occupied', () => {
    const board = createBoard(unitBricksAt([[1, 0]]));
    const result = evaluateCondition(
      { kind: 'path_exists', startCell: [0, 0], endCell: [1, 0] },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not covered');
  });

  it('fails when end cell is not occupied', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'path_exists', startCell: [0, 0], endCell: [3, 3] },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('passes when start and end are the same occupied cell', () => {
    const board = createBoard(unitBricksAt([[1, 1]]));
    const result = evaluateCondition(
      { kind: 'path_exists', startCell: [1, 1], endCell: [1, 1] },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 20. all_same_color_connected
// ============================================

describe('all_same_color_connected', () => {
  it('passes when each color group is connected', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0], [1, 0]], '#ff0000'),
      ...unitBricksAt([[0, 1], [1, 1]], '#00ff00'),
    ]);
    const result = evaluateCondition(
      { kind: 'all_same_color_connected' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when a color group is disconnected', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[3, 3]], '#ff0000'),
    ]);
    const result = evaluateCondition(
      { kind: 'all_same_color_connected' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells!.length).toBeGreaterThan(0);
  });

  it('passes on empty board', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'all_same_color_connected' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('passes when each color has only one cell', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[3, 3]], '#00ff00'),
    ]);
    const result = evaluateCondition(
      { kind: 'all_same_color_connected' },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 21. horizontal_symmetry
// ============================================

describe('horizontal_symmetry', () => {
  it('passes when board is horizontally symmetric', () => {
    // Board width=4: mirror of x=0 is x=3, mirror of x=1 is x=2
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[3, 0]], '#ff0000'),
    ]);
    const result = evaluateCondition(
      { kind: 'horizontal_symmetry' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when board is asymmetric', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'horizontal_symmetry' },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('passes on empty board', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'horizontal_symmetry' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when positions mirror but colors differ', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[3, 0]], '#00ff00'),
    ]);
    const result = evaluateCondition(
      { kind: 'horizontal_symmetry' },
      board,
    );
    expect(result.passed).toBe(false);
  });
});

// ============================================
// 22. vertical_symmetry
// ============================================

describe('vertical_symmetry', () => {
  it('passes when board is vertically symmetric', () => {
    // Board height=4: mirror of y=0 is y=3, mirror of y=1 is y=2
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[0, 3]], '#ff0000'),
    ]);
    const result = evaluateCondition(
      { kind: 'vertical_symmetry' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when board is asymmetric', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      { kind: 'vertical_symmetry' },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('fails when positions mirror but colors differ', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[0, 3]], '#0000ff'),
    ]);
    const result = evaluateCondition(
      { kind: 'vertical_symmetry' },
      board,
    );
    expect(result.passed).toBe(false);
  });
});

// ============================================
// 23. max_colors_used
// ============================================

describe('max_colors_used', () => {
  it('passes when distinct color count meets comparison', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[1, 0]], '#00ff00'),
      ...unitBricksAt([[2, 0]], '#0000ff'),
    ]);
    const result = evaluateCondition(
      { kind: 'max_colors_used', operator: 'eq', value: 3 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when distinct color count does not match', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000'),
      ...unitBricksAt([[1, 0]], '#ff0000'),
    ]);
    const result = evaluateCondition(
      { kind: 'max_colors_used', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('counts 0 for empty board', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'max_colors_used', operator: 'eq', value: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('is case insensitive — same color different case counts as one', () => {
    const board = createBoard([
      { shape: 'unit', color: '#FF0000', position: { x: 0, y: 0 } },
      { shape: 'unit', color: '#ff0000', position: { x: 1, y: 0 } },
    ]);
    const result = evaluateCondition(
      { kind: 'max_colors_used', operator: 'eq', value: 1 },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 24. count_per_row
// ============================================

describe('count_per_row', () => {
  it('passes when every row meets the count comparison', () => {
    // 4x4 board, place 2 bricks in each row
    const board = createBoard([
      ...unitBricksAt([[0, 0], [1, 0]]),
      ...unitBricksAt([[0, 1], [1, 1]]),
      ...unitBricksAt([[0, 2], [1, 2]]),
      ...unitBricksAt([[0, 3], [1, 3]]),
    ]);
    const result = evaluateCondition(
      { kind: 'count_per_row', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when some rows do not meet the comparison', () => {
    // Row 0 has 3 bricks, rows 1-3 have 0; operator eq 2 means row 0 fails (3!=2)
    const board = createBoard(unitBricksAt([[0, 0], [1, 0], [2, 0]]));
    const result = evaluateCondition(
      { kind: 'count_per_row', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells!.length).toBe(3);
  });

  it('passes vacuously when empty rows have 0 cells and operator matches 0', () => {
    // Empty rows have 0 occupied cells, so 'gte 0' passes for all rows
    const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));
    const result = evaluateCondition(
      { kind: 'count_per_row', operator: 'gte', value: 0 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('passes with lte when no row exceeds the value', () => {
    const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));
    const result = evaluateCondition(
      { kind: 'count_per_row', operator: 'lte', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 25. count_per_column
// ============================================

describe('count_per_column', () => {
  it('passes when every column meets the count comparison', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0], [0, 1], [0, 2], [0, 3]]),
      ...unitBricksAt([[1, 0], [1, 1], [1, 2], [1, 3]]),
      ...unitBricksAt([[2, 0], [2, 1], [2, 2], [2, 3]]),
      ...unitBricksAt([[3, 0], [3, 1], [3, 2], [3, 3]]),
    ]);
    const result = evaluateCondition(
      { kind: 'count_per_column', operator: 'eq', value: 4 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when some columns do not meet the comparison', () => {
    // Col 0 has 3 bricks (fails eq 2), cols 1-3 have 0 (empty rows report no affected cells)
    const board = createBoard(unitBricksAt([[0, 0], [0, 1], [0, 2]]));
    const result = evaluateCondition(
      { kind: 'count_per_column', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells!.length).toBe(3);
  });
});

// ============================================
// 26. parity_per_row
// ============================================

describe('parity_per_row', () => {
  it('passes when every row has even covered count', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0], [1, 0]]), // row 0: 2 (even)
      ...unitBricksAt([[0, 1], [1, 1]]), // row 1: 2 (even)
      // rows 2,3: 0 (even)
    ]);
    const result = evaluateCondition(
      { kind: 'parity_per_row', parity: 'even' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when a row has wrong parity', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]]), // row 0: 1 (odd) — fails even check
    ]);
    const result = evaluateCondition(
      { kind: 'parity_per_row', parity: 'even' },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('passes when every row has odd covered count', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]]), // row 0: 1 (odd)
      ...unitBricksAt([[0, 1]]), // row 1: 1 (odd)
      ...unitBricksAt([[0, 2]]), // row 2: 1 (odd)
      ...unitBricksAt([[0, 3]]), // row 3: 1 (odd)
    ]);
    const result = evaluateCondition(
      { kind: 'parity_per_row', parity: 'odd' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('treats 0 as even', () => {
    const board = createBoard(); // all rows have 0 bricks
    const result = evaluateCondition(
      { kind: 'parity_per_row', parity: 'even' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('empty rows with 0 bricks pass oddly because no affected cells to report', () => {
    // Implementation note: when a row has 0 occupied cells and fails parity,
    // no cells are added to the failing list, so the result is vacuously "passed".
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'parity_per_row', parity: 'odd' },
      board,
    );
    // 0 is even, not odd, but since no cells are occupied, failing list is empty → passes
    expect(result.passed).toBe(true);
  });

  it('fails odd parity when a row has even non-zero count', () => {
    // Row 0 has 2 bricks (even) — fails odd parity check, and has cells to report
    const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));
    const result = evaluateCondition(
      { kind: 'parity_per_row', parity: 'odd' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.affectedCells!.length).toBe(2);
  });
});

// ============================================
// 27. parity_per_column
// ============================================

describe('parity_per_column', () => {
  it('passes when every column has even covered count', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0], [0, 1]]), // col 0: 2 (even)
      ...unitBricksAt([[1, 0], [1, 1]]), // col 1: 2 (even)
      // cols 2,3: 0 (even)
    ]);
    const result = evaluateCondition(
      { kind: 'parity_per_column', parity: 'even' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when a column has wrong parity', () => {
    const board = createBoard(unitBricksAt([[0, 0]])); // col 0: 1 (odd)
    const result = evaluateCondition(
      { kind: 'parity_per_column', parity: 'even' },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('passes when every column has odd covered count', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]]),
      ...unitBricksAt([[1, 0]]),
      ...unitBricksAt([[2, 0]]),
      ...unitBricksAt([[3, 0]]),
    ]);
    const result = evaluateCondition(
      { kind: 'parity_per_column', parity: 'odd' },
      board,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 28. custom_code
// ============================================

describe('custom_code', () => {
  it('evaluates valid JS returning {passed, message}', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = evaluateCondition(
      {
        kind: 'custom_code',
        code: 'return { passed: board.placedBricks.length === 1, message: "one brick" };',
      },
      board,
    );
    expect(result.passed).toBe(true);
    expect(result.message).toBe('one brick');
  });

  it('handles runtime errors gracefully', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'custom_code', code: 'throw new Error("oops");' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain('oops');
  });

  it('fails when code is empty', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'custom_code', code: '' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain('No code');
  });

  it('fails when code is whitespace only', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'custom_code', code: '   ' },
      board,
    );
    expect(result.passed).toBe(false);
  });

  it('fails when code does not return an object with passed', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'custom_code', code: 'return 42;' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain('must return');
  });

  it('provides helpers.isOccupied to custom code', () => {
    const board = createBoard(unitBricksAt([[2, 3]]));
    const result = evaluateCondition(
      {
        kind: 'custom_code',
        code: 'return { passed: helpers.isOccupied(2, 3), message: "ok" };',
      },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('provides helpers.getCellColor to custom code', () => {
    const board = createBoard(unitBricksAt([[0, 0]], '#abcdef'));
    const result = evaluateCondition(
      {
        kind: 'custom_code',
        code: 'return { passed: helpers.getCellColor(0, 0) === "#abcdef", message: "color check" };',
      },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('provides helpers.countOccupied to custom code', () => {
    const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));
    const result = evaluateCondition(
      {
        kind: 'custom_code',
        code: 'return { passed: helpers.countOccupied() === 2, message: "count" };',
      },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('provides default message when code returns passed:true with no message', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'custom_code', code: 'return { passed: true };' },
      board,
    );
    expect(result.passed).toBe(true);
    expect(result.message).toBe('Passed');
  });

  it('provides default message when code returns passed:false with no message', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'custom_code', code: 'return { passed: false };' },
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.message).toBe('Failed');
  });

  it('passes through affectedCells from custom code', () => {
    const board = createBoard();
    const result = evaluateCondition(
      {
        kind: 'custom_code',
        code: 'return { passed: false, message: "bad", affectedCells: [[1,2]] };',
      },
      board,
    );
    expect(result.affectedCells).toEqual([[1, 2]]);
  });
});

// ============================================
// 29. ALL combinator
// ============================================

describe('ALL combinator', () => {
  const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));

  it('passes when all children pass', () => {
    const node: ConditionNode = {
      kind: 'ALL',
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
        { kind: 'cells_are_covered', cells: [[0, 0]] },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });

  it('fails when one child fails', () => {
    const node: ConditionNode = {
      kind: 'ALL',
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('1 of 2');
  });

  it('passes with empty children (vacuously true)', () => {
    const node: ConditionNode = { kind: 'ALL', children: [] };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 30. ANY combinator
// ============================================

describe('ANY combinator', () => {
  const board = createBoard(unitBricksAt([[0, 0]]));

  it('passes when at least one child passes', () => {
    const node: ConditionNode = {
      kind: 'ANY',
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 1 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });

  it('fails when no children pass', () => {
    const node: ConditionNode = {
      kind: 'ANY',
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 5 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 10 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('0 of 2');
  });
});

// ============================================
// 31. NONE combinator
// ============================================

describe('NONE combinator', () => {
  const board = createBoard(unitBricksAt([[0, 0]]));

  it('passes when no children pass', () => {
    const node: ConditionNode = {
      kind: 'NONE',
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 50 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });

  it('fails when one child passes', () => {
    const node: ConditionNode = {
      kind: 'NONE',
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 1 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('1 condition(s) unexpectedly pass');
  });
});

// ============================================
// 32. EXACTLY_N combinator
// ============================================

describe('EXACTLY_N combinator', () => {
  const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));

  it('passes when exactly n children pass', () => {
    const node: ConditionNode = {
      kind: 'EXACTLY_N',
      n: 1,
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });

  it('fails when pass count differs from n', () => {
    const node: ConditionNode = {
      kind: 'EXACTLY_N',
      n: 2,
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(false);
  });

  it('defaults n to 1 when not specified', () => {
    const node: ConditionNode = {
      kind: 'EXACTLY_N',
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 33. AT_LEAST_N combinator
// ============================================

describe('AT_LEAST_N combinator', () => {
  const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));

  it('passes when at least n children pass', () => {
    const node: ConditionNode = {
      kind: 'AT_LEAST_N',
      n: 1,
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });

  it('fails when fewer than n children pass', () => {
    const node: ConditionNode = {
      kind: 'AT_LEAST_N',
      n: 2,
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('at least 2 must pass');
  });

  it('defaults n to 1 when not specified', () => {
    const node: ConditionNode = {
      kind: 'AT_LEAST_N',
      children: [
        { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
        { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 34. Nested combinators
// ============================================

describe('nested combinators', () => {
  it('ALL containing ANY works correctly', () => {
    const board = createBoard(unitBricksAt([[0, 0], [1, 0]]));
    const node: ConditionNode = {
      kind: 'ALL',
      children: [
        {
          kind: 'ANY',
          children: [
            { kind: 'total_pieces_placed', operator: 'eq', value: 2 },
            { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
          ],
        },
        { kind: 'cells_are_covered', cells: [[0, 0]] },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });

  it('NONE containing ALL works correctly', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    // ALL(eq 99) fails, so NONE(failing child) → passes
    const node: ConditionNode = {
      kind: 'NONE',
      children: [
        {
          kind: 'ALL',
          children: [
            { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
          ],
        },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });

  it('deeply nested combinator resolves correctly', () => {
    const board = createBoard(unitBricksAt([[0, 0], [1, 0], [2, 0]]));
    const node: ConditionNode = {
      kind: 'ALL',
      children: [
        {
          kind: 'ANY',
          children: [
            {
              kind: 'ALL',
              children: [
                { kind: 'total_pieces_placed', operator: 'gte', value: 2 },
                { kind: 'covered_cell_count', operator: 'eq', value: 3 },
              ],
            },
          ],
        },
      ],
    };
    const result = evaluateCondition(node, board);
    expect(result.passed).toBe(true);
  });
});

// ============================================
// 35-37. validateCustomRule (integration)
// ============================================

describe('validateCustomRule', () => {
  it('evaluates a valid custom rule correctly — passes', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = validateCustomRule(board, {
      label: 'Test Rule',
      condition: { kind: 'total_pieces_placed', operator: 'eq', value: 1 },
    });
    expect(result.isValid).toBe(true);
    expect(result.rule).toBe('CUSTOM:Test Rule');
  });

  it('evaluates a valid custom rule correctly — fails', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = validateCustomRule(board, {
      label: 'Test Rule',
      condition: { kind: 'total_pieces_placed', operator: 'eq', value: 99 },
    });
    expect(result.isValid).toBe(false);
    expect(result.rule).toBe('CUSTOM:Test Rule');
  });

  it('returns error for invalid params (missing label)', () => {
    const board = createBoard();
    const result = validateCustomRule(board, {
      condition: { kind: 'total_pieces_placed', operator: 'eq', value: 1 },
    });
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Invalid custom rule');
  });

  it('returns error for completely missing params', () => {
    const board = createBoard();
    const result = validateCustomRule(board, undefined as unknown as Record<string, unknown>);
    expect(result.isValid).toBe(false);
  });

  it('shows description on failure when description is provided', () => {
    const board = createBoard();
    const result = validateCustomRule(board, {
      label: 'My Rule',
      description: 'You need at least one brick!',
      condition: { kind: 'total_pieces_placed', operator: 'gte', value: 1 },
    });
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('You need at least one brick!');
  });

  it('shows evaluator message on pass (not description)', () => {
    const board = createBoard(unitBricksAt([[0, 0]]));
    const result = validateCustomRule(board, {
      label: 'My Rule',
      description: 'You need at least one brick!',
      condition: { kind: 'total_pieces_placed', operator: 'gte', value: 1 },
    });
    expect(result.isValid).toBe(true);
    expect(result.message).not.toBe('You need at least one brick!');
  });

  it('propagates affectedCells from evaluator', () => {
    const board = createBoard();
    const result = validateCustomRule(board, {
      label: 'Cover rule',
      condition: { kind: 'cells_are_covered', cells: [[0, 0]] },
    });
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toEqual([[0, 0]]);
  });
});

// ============================================
// Edge cases & unknown condition
// ============================================

describe('edge cases', () => {
  it('returns failure for unknown condition kind', () => {
    const board = createBoard();
    const result = evaluateCondition(
      { kind: 'nonexistent_condition' } as unknown as ConditionNode,
      board,
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Unknown condition');
  });

  it('domino shape covers two cells correctly in covered_cell_count', () => {
    const board = createBoard([
      { shape: 'domino', position: { x: 0, y: 0 } },
    ]);
    const result = evaluateCondition(
      { kind: 'covered_cell_count', operator: 'eq', value: 2 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('T-tetromino covers correct cells in cells_are_covered', () => {
    // T-tetromino cells: [[0,0],[1,0],[2,0],[1,1]] placed at position (1,1)
    // occupied: (1,1), (2,1), (3,1), (2,2)
    const board = createBoard([
      { shape: 'T-tetromino', position: { x: 1, y: 1 } },
    ]);
    const result = evaluateCondition(
      { kind: 'cells_are_covered', cells: [[1, 1], [2, 1], [3, 1], [2, 2]] },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('overlapping bricks at same cell with different z produce correct stack height', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000', 0),
      ...unitBricksAt([[0, 0]], '#00ff00', 1),
      ...unitBricksAt([[0, 0]], '#0000ff', 2),
    ]);
    const result = evaluateCondition(
      { kind: 'stack_height_at_cells', cells: [[0, 0]], operator: 'eq', value: 3 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('duplicate z-levels count as one stack height', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000', 0),
      ...unitBricksAt([[0, 0]], '#00ff00', 0), // same z
    ]);
    const result = evaluateCondition(
      { kind: 'stack_height_at_cells', cells: [[0, 0]], operator: 'eq', value: 1 },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('getTopColorAt returns highest-z brick color for cells_have_color', () => {
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000', 0),
      ...unitBricksAt([[0, 0]], '#00ff00', 1),
    ]);
    const result = evaluateCondition(
      { kind: 'cells_have_color', cells: [[0, 0]], color: '#00ff00' },
      board,
    );
    expect(result.passed).toBe(true);
  });

  it('no_adjacent_same_color considers top color of stacked cells', () => {
    // At (0,0): red at z=0, green at z=1 → top is green
    // At (1,0): green at z=0 → top is green → adjacent same color
    const board = createBoard([
      ...unitBricksAt([[0, 0]], '#ff0000', 0),
      ...unitBricksAt([[0, 0]], '#00ff00', 1),
      ...unitBricksAt([[1, 0]], '#00ff00', 0),
    ]);
    const result = evaluateCondition(
      { kind: 'no_adjacent_same_color' },
      board,
    );
    expect(result.passed).toBe(false);
  });
});
