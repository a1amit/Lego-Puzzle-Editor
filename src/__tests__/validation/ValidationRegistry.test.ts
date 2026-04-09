import { describe, it, expect } from 'vitest';
import {
  ValidationRegistry,
  rotateShape,
  getBrickCells,
  getAllOccupiedCells,
  getOccupiedCellsAtZ,
} from '@/validation/ValidationRegistry';
import type { BoardState, PlacedBrick } from '@/types/puzzle';
import { createBoardState as createBoard, createPlacedBrick as createBrick } from '../helpers';

// ============================================
// HELPERS
// ============================================

/**
 * Fill a board completely with unit bricks.
 * Optionally skip certain cells (given as "x,y" strings).
 */
function fillBoard(
  width: number,
  height: number,
  skip: Set<string> = new Set(),
  z = 0,
): PlacedBrick[] {
  const bricks: PlacedBrick[] = [];
  let idx = 0;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (skip.has(`${x},${y}`)) continue;
      bricks.push(
        createBrick({
          id: `unit-${idx}`,
          instanceId: `inst-${idx}`,
          position: { x, y },
          z,
        }),
      );
      idx++;
    }
  }
  return bricks;
}

// ============================================
// 1. VALIDATION REGISTRY CLASS
// ============================================

describe('ValidationRegistry class', () => {
  describe('register / unregister / has / get / getRegisteredRules', () => {
    it('has all default validators registered', () => {
      const rules = ValidationRegistry.getRegisteredRules();
      expect(rules).toContain('ALL_BOARD_SQUARES_MUST_BE_COVERED');
      expect(rules).toContain('NO_BRICK_OVERLAP');
      expect(rules).toContain('NO_BRICKS_OUT_OF_BOUNDS');
      expect(rules).toContain('NO_BLOCKED_CELLS');
      expect(rules).toContain('NO_BRICKS_EXCEED_DEPTH');
      expect(rules).toContain('ALL_BRICKS_MUST_BE_USED');
      expect(rules).toContain('PATTERN_MATCH');
      expect(rules).toContain('GOAL_REACHED');
      expect(rules).toContain('MAX_MOVES');
      expect(rules).toContain('SLIDING_ONLY');
      expect(rules).toContain('NO_ROTATION');
      expect(rules).toContain('FREE_PLACEMENT');
      expect(rules).toContain('NO_BRICK_REMOVAL');
    });

    it('has() returns true for a registered rule', () => {
      expect(ValidationRegistry.has('NO_BRICK_OVERLAP')).toBe(true);
    });

    it('has() returns false for an unregistered rule', () => {
      expect(ValidationRegistry.has('NONEXISTENT_RULE')).toBe(false);
    });

    it('get() returns a function for a registered rule', () => {
      const fn = ValidationRegistry.get('NO_BRICK_OVERLAP');
      expect(typeof fn).toBe('function');
    });

    it('get() returns undefined for an unregistered rule', () => {
      expect(ValidationRegistry.get('NONEXISTENT_RULE')).toBeUndefined();
    });

    it('register() adds a custom validator', () => {
      const customFn = () => ({ isValid: true, rule: 'CUSTOM', message: 'ok' });
      ValidationRegistry.register('CUSTOM_TEST_RULE', customFn);
      expect(ValidationRegistry.has('CUSTOM_TEST_RULE')).toBe(true);
      expect(ValidationRegistry.get('CUSTOM_TEST_RULE')).toBe(customFn);
      // cleanup
      ValidationRegistry.unregister('CUSTOM_TEST_RULE');
    });

    it('unregister() removes a validator and returns true', () => {
      ValidationRegistry.register('TEMP_RULE', () => ({
        isValid: true,
        rule: 'TEMP_RULE',
        message: '',
      }));
      const removed = ValidationRegistry.unregister('TEMP_RULE');
      expect(removed).toBe(true);
      expect(ValidationRegistry.has('TEMP_RULE')).toBe(false);
    });

    it('unregister() returns false for non-existent rule', () => {
      expect(ValidationRegistry.unregister('DOES_NOT_EXIST')).toBe(false);
    });

    it('getRegisteredRules() returns an array of strings', () => {
      const rules = ValidationRegistry.getRegisteredRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach((r) => expect(typeof r).toBe('string'));
    });
  });

  describe('validate()', () => {
    it('returns results for known rules', () => {
      const board = createBoard();
      const results = ValidationRegistry.validate(board, [
        { type: 'validation', rule: 'NO_BRICK_OVERLAP' },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].rule).toBe('NO_BRICK_OVERLAP');
      expect(results[0].isValid).toBe(true);
    });

    it('returns an error result for unknown rules', () => {
      const board = createBoard();
      const results = ValidationRegistry.validate(board, [
        { type: 'validation', rule: 'TOTALLY_FAKE' },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(false);
      expect(results[0].rule).toBe('TOTALLY_FAKE');
      expect(results[0].message).toContain('Unknown validation rule');
    });

    it('processes multiple rules and returns results in order', () => {
      const board = createBoard({
        placedBricks: fillBoard(4, 4),
      });
      const results = ValidationRegistry.validate(board, [
        { type: 'validation', rule: 'NO_BRICK_OVERLAP' },
        { type: 'validation', rule: 'ALL_BOARD_SQUARES_MUST_BE_COVERED' },
        { type: 'validation', rule: 'NO_BRICKS_OUT_OF_BOUNDS' },
      ]);
      expect(results).toHaveLength(3);
      expect(results[0].rule).toBe('NO_BRICK_OVERLAP');
      expect(results[1].rule).toBe('ALL_BOARD_SQUARES_MUST_BE_COVERED');
      expect(results[2].rule).toBe('NO_BRICKS_OUT_OF_BOUNDS');
    });

    it('passes params to validators', () => {
      const board = createBoard();
      const results = ValidationRegistry.validate(board, [
        {
          type: 'validation',
          rule: 'MAX_MOVES',
          params: { maxMoves: 5, currentMoves: 3 },
        },
      ]);
      expect(results[0].isValid).toBe(true);
      expect(results[0].message).toContain('3/5');
    });
  });

  describe('isAllValid()', () => {
    it('returns true when all results are valid', () => {
      const results = [
        { isValid: true, rule: 'A', message: '' },
        { isValid: true, rule: 'B', message: '' },
      ];
      expect(ValidationRegistry.isAllValid(results)).toBe(true);
    });

    it('returns false when any result is invalid', () => {
      const results = [
        { isValid: true, rule: 'A', message: '' },
        { isValid: false, rule: 'B', message: 'fail' },
      ];
      expect(ValidationRegistry.isAllValid(results)).toBe(false);
    });

    it('returns true for empty results array', () => {
      expect(ValidationRegistry.isAllValid([])).toBe(true);
    });
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

describe('Helper functions', () => {
  describe('rotateShape()', () => {
    it('returns cells unchanged for 0 rotation', () => {
      const cells: [number, number][] = [[0, 0], [1, 0]];
      expect(rotateShape(cells, 0)).toEqual([[0, 0], [1, 0]]);
    });

    it('rotates 90 degrees clockwise', () => {
      // domino horizontal [[0,0],[1,0]] -> vertical after 90 degrees
      const result = rotateShape([[0, 0], [1, 0]], 90);
      // After rotation: [0,0]->[0,-0]=[0,0], [1,0]->[0,-1]=[0,-1]
      // Normalize: minX=0, minY=-1 -> [0,1], [0,0]
      expect(result).toEqual([[0, 1], [0, 0]]);
    });

    it('rotates 180 degrees', () => {
      const result = rotateShape([[0, 0], [1, 0]], 180);
      // Should flip horizontally
      expect(result).toEqual([[1, 0], [0, 0]]);
    });

    it('rotates 360 degrees returns original', () => {
      const cells: [number, number][] = [[0, 0], [1, 0], [2, 0], [1, 1]];
      expect(rotateShape(cells, 360)).toEqual(cells);
    });
  });

  describe('getBrickCells()', () => {
    it('returns correct cells for a unit brick at origin', () => {
      const brick = createBrick({ shape: 'unit', position: { x: 0, y: 0 } });
      expect(getBrickCells(brick)).toEqual([[0, 0]]);
    });

    it('returns offset cells for a unit brick at (2,3)', () => {
      const brick = createBrick({ shape: 'unit', position: { x: 2, y: 3 } });
      expect(getBrickCells(brick)).toEqual([[2, 3]]);
    });

    it('returns correct cells for a domino', () => {
      const brick = createBrick({
        shape: 'domino',
        position: { x: 1, y: 1 },
        rotation: 0,
      });
      expect(getBrickCells(brick)).toEqual([[1, 1], [2, 1]]);
    });

    it('returns empty array for unknown shape', () => {
      const brick = createBrick({ shape: 'nonexistent-shape' as any });
      expect(getBrickCells(brick)).toEqual([]);
    });
  });

  describe('getAllOccupiedCells()', () => {
    it('returns empty map for empty board', () => {
      const board = createBoard();
      const map = getAllOccupiedCells(board);
      expect(map.size).toBe(0);
    });

    it('maps cells to their occupying bricks', () => {
      const brick = createBrick({ shape: 'domino', position: { x: 0, y: 0 } });
      const board = createBoard({ placedBricks: [brick] });
      const map = getAllOccupiedCells(board);
      expect(map.size).toBe(2);
      expect(map.get('0,0')).toEqual([brick]);
      expect(map.get('1,0')).toEqual([brick]);
    });

    it('records multiple bricks at the same cell', () => {
      const b1 = createBrick({ id: 'a', instanceId: 'a1', position: { x: 0, y: 0 }, z: 0 });
      const b2 = createBrick({ id: 'b', instanceId: 'b1', position: { x: 0, y: 0 }, z: 1 });
      const board = createBoard({ placedBricks: [b1, b2] });
      const map = getAllOccupiedCells(board);
      expect(map.get('0,0')!.length).toBe(2);
    });
  });

  describe('getOccupiedCellsAtZ()', () => {
    it('only returns bricks at the specified z-level', () => {
      const b0 = createBrick({ id: 'a', instanceId: 'a1', position: { x: 0, y: 0 }, z: 0 });
      const b1 = createBrick({ id: 'b', instanceId: 'b1', position: { x: 1, y: 0 }, z: 1 });
      const board = createBoard({
        dimensions: { width: 4, height: 4, depth: 2 },
        placedBricks: [b0, b1],
      });
      const mapZ0 = getOccupiedCellsAtZ(board, 0);
      const mapZ1 = getOccupiedCellsAtZ(board, 1);
      expect(mapZ0.has('0,0')).toBe(true);
      expect(mapZ0.has('1,0')).toBe(false);
      expect(mapZ1.has('1,0')).toBe(true);
      expect(mapZ1.has('0,0')).toBe(false);
    });
  });
});

// ============================================
// 2. validateAllBoardSquaresCovered
// ============================================

describe('validateAllBoardSquaresCovered', () => {
  const run = (board: BoardState) =>
    ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'ALL_BOARD_SQUARES_MUST_BE_COVERED' },
    ])[0];

  it('is valid when all cells are covered', () => {
    const board = createBoard({ placedBricks: fillBoard(4, 4) });
    const result = run(board);
    expect(result.isValid).toBe(true);
    expect(result.rule).toBe('ALL_BOARD_SQUARES_MUST_BE_COVERED');
  });

  it('is invalid when some cells are uncovered', () => {
    // Skip cell (2,2)
    const board = createBoard({
      placedBricks: fillBoard(4, 4, new Set(['2,2'])),
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toBeDefined();
    expect(result.affectedCells).toContainEqual([2, 2]);
    expect(result.message).toContain('1 cell(s)');
  });

  it('excludes blocked cells from coverage check', () => {
    // 2x2 board, block (1,1), fill the rest
    const board = createBoard({
      dimensions: { width: 2, height: 2, depth: 1 },
      blockedCells: [[1, 1]],
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', position: { x: 0, y: 0 } }),
        createBrick({ id: 'b', instanceId: 'b1', position: { x: 1, y: 0 } }),
        createBrick({ id: 'c', instanceId: 'c1', position: { x: 0, y: 1 } }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(true);
  });

  it('reports all cells uncovered on empty board', () => {
    const board = createBoard({
      dimensions: { width: 2, height: 2, depth: 1 },
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toHaveLength(4);
    expect(result.message).toContain('4 cell(s)');
  });

  it('correctly counts uncovered cells for larger board', () => {
    // 3x3 board with only one brick placed
    const board = createBoard({
      dimensions: { width: 3, height: 3, depth: 1 },
      placedBricks: [createBrick({ position: { x: 0, y: 0 } })],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toHaveLength(8); // 9 - 1 = 8 uncovered
  });

  it('counts multi-cell bricks covering multiple squares', () => {
    // 2x1 board with a domino covering both cells
    const board = createBoard({
      dimensions: { width: 2, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ shape: 'domino', position: { x: 0, y: 0 } }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(true);
  });
});

// ============================================
// 3. validateNoBrickOverlap
// ============================================

describe('validateNoBrickOverlap', () => {
  const run = (board: BoardState) =>
    ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'NO_BRICK_OVERLAP' },
    ])[0];

  it('is valid with no bricks', () => {
    const result = run(createBoard());
    expect(result.isValid).toBe(true);
  });

  it('is valid when bricks do not overlap at the same z-level', () => {
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', position: { x: 0, y: 0 }, z: 0 }),
        createBrick({ id: 'b', instanceId: 'b1', position: { x: 1, y: 0 }, z: 0 }),
      ],
    });
    expect(run(board).isValid).toBe(true);
  });

  it('is invalid when two bricks overlap at the same z-level', () => {
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', position: { x: 0, y: 0 }, z: 0 }),
        createBrick({ id: 'b', instanceId: 'b1', position: { x: 0, y: 0 }, z: 0 }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([0, 0]);
    expect(result.message).toContain('1 cell(s)');
  });

  it('is valid when bricks overlap at different z-levels (stacking)', () => {
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 2 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', position: { x: 0, y: 0 }, z: 0 }),
        createBrick({ id: 'b', instanceId: 'b1', position: { x: 0, y: 0 }, z: 1 }),
      ],
    });
    expect(run(board).isValid).toBe(true);
  });

  it('detects overlapping multi-cell bricks', () => {
    // Two dominoes that partially overlap at z=0
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', shape: 'domino', position: { x: 0, y: 0 }, z: 0 }),
        createBrick({ id: 'b', instanceId: 'b1', shape: 'domino', position: { x: 1, y: 0 }, z: 0 }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    // They overlap at (1,0)
    expect(result.affectedCells).toContainEqual([1, 0]);
  });

  it('reports multiple overlapping cells', () => {
    // Two O-tetrominoes stacked at the same position and z
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', shape: 'O-tetromino', position: { x: 0, y: 0 }, z: 0 }),
        createBrick({ id: 'b', instanceId: 'b1', shape: 'O-tetromino', position: { x: 0, y: 0 }, z: 0 }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells!.length).toBe(4);
  });
});

// ============================================
// 4. validateNoBricksOutOfBounds
// ============================================

describe('validateNoBricksOutOfBounds', () => {
  const run = (board: BoardState) =>
    ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'NO_BRICKS_OUT_OF_BOUNDS' },
    ])[0];

  it('is valid when all bricks are within bounds', () => {
    const board = createBoard({
      placedBricks: [createBrick({ position: { x: 0, y: 0 } })],
    });
    expect(run(board).isValid).toBe(true);
  });

  it('is invalid when brick is at negative x', () => {
    const board = createBoard({
      placedBricks: [createBrick({ position: { x: -1, y: 0 } })],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([-1, 0]);
  });

  it('is invalid when brick is at negative y', () => {
    const board = createBoard({
      placedBricks: [createBrick({ position: { x: 0, y: -1 } })],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([0, -1]);
  });

  it('is invalid when brick exceeds width', () => {
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 1 },
      placedBricks: [createBrick({ position: { x: 4, y: 0 } })],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([4, 0]);
  });

  it('is invalid when brick exceeds height', () => {
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 1 },
      placedBricks: [createBrick({ position: { x: 0, y: 4 } })],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
  });

  it('detects partially out-of-bounds multi-cell bricks', () => {
    // domino at x=3 on a width=4 board -> cells (3,0) and (4,0) — second is out
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 1 },
      placedBricks: [
        createBrick({ shape: 'domino', position: { x: 3, y: 0 } }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([4, 0]);
    expect(result.message).toContain('1 cell(s)');
  });

  it('is valid with an empty board', () => {
    expect(run(createBoard()).isValid).toBe(true);
  });

  it('allows brick at maximum valid position', () => {
    // width=4 -> valid x = 0..3
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 1 },
      placedBricks: [createBrick({ position: { x: 3, y: 3 } })],
    });
    expect(run(board).isValid).toBe(true);
  });
});

// ============================================
// 5. validateNoBlockedCells
// ============================================

describe('validateNoBlockedCells', () => {
  const run = (board: BoardState) =>
    ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'NO_BLOCKED_CELLS' },
    ])[0];

  it('is valid when no bricks are on blocked cells', () => {
    const board = createBoard({
      blockedCells: [[2, 2]],
      placedBricks: [createBrick({ position: { x: 0, y: 0 } })],
    });
    expect(run(board).isValid).toBe(true);
  });

  it('is invalid when a brick is on a blocked cell', () => {
    const board = createBoard({
      blockedCells: [[0, 0]],
      placedBricks: [createBrick({ position: { x: 0, y: 0 } })],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([0, 0]);
  });

  it('is valid with no blocked cells at all', () => {
    const board = createBoard({
      placedBricks: [createBrick()],
    });
    expect(run(board).isValid).toBe(true);
  });

  it('is valid with blocked cells but no bricks', () => {
    const board = createBoard({
      blockedCells: [[1, 1]],
    });
    expect(run(board).isValid).toBe(true);
  });

  it('detects multi-cell brick partially on blocked cell', () => {
    // domino at (1,0) -> cells (1,0) and (2,0); block (2,0)
    const board = createBoard({
      blockedCells: [[2, 0]],
      placedBricks: [
        createBrick({ shape: 'domino', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([2, 0]);
  });

  it('reports multiple blocked cell violations', () => {
    const board = createBoard({
      blockedCells: [[0, 0], [1, 0]],
      placedBricks: [
        createBrick({ shape: 'domino', position: { x: 0, y: 0 } }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toHaveLength(2);
    expect(result.message).toContain('2 brick cell(s)');
  });
});

// ============================================
// 6. validateNoBricksExceedDepth
// ============================================

describe('validateNoBricksExceedDepth', () => {
  const run = (board: BoardState) =>
    ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'NO_BRICKS_EXCEED_DEPTH' },
    ])[0];

  it('is valid when all bricks are within depth', () => {
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 2 },
      placedBricks: [
        createBrick({ z: 0 }),
        createBrick({ id: 'b', instanceId: 'b1', z: 1, position: { x: 1, y: 0 } }),
      ],
    });
    expect(run(board).isValid).toBe(true);
  });

  it('is invalid when a brick exceeds depth', () => {
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 1 },
      placedBricks: [createBrick({ z: 1 })],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('1 brick(s)');
    expect(result.message).toContain('max z-level: 0');
  });

  it('allows z=0 on depth=1 board', () => {
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 1 },
      placedBricks: [createBrick({ z: 0 })],
    });
    expect(run(board).isValid).toBe(true);
  });

  it('is valid with no bricks', () => {
    expect(run(createBoard()).isValid).toBe(true);
  });

  it('returns affected cells for exceeding bricks', () => {
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 1 },
      placedBricks: [
        createBrick({ shape: 'domino', position: { x: 0, y: 0 }, z: 2 }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toBeDefined();
    expect(result.affectedCells!.length).toBeGreaterThanOrEqual(2);
  });

  it('multiple bricks, only some exceed depth', () => {
    const board = createBoard({
      dimensions: { width: 4, height: 4, depth: 2 },
      placedBricks: [
        createBrick({ id: 'ok', instanceId: 'ok1', z: 1, position: { x: 0, y: 0 } }),
        createBrick({ id: 'bad', instanceId: 'bad1', z: 3, position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('1 brick(s)');
  });
});

// ============================================
// 7. validateAllBricksMustBeUsed
// ============================================

describe('validateAllBricksMustBeUsed', () => {
  const run = (board: BoardState, params?: Record<string, unknown>) =>
    ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'ALL_BRICKS_MUST_BE_USED', params },
    ])[0];

  it('is valid when all inventory bricks are placed', () => {
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'brick-a', instanceId: 'a1' }),
        createBrick({ id: 'brick-a', instanceId: 'a2', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board, {
      inventory: [{ id: 'brick-a', quantity: 2 }],
    });
    expect(result.isValid).toBe(true);
    expect(result.message).toContain('All 2 bricks');
  });

  it('is invalid when some bricks are missing', () => {
    const board = createBoard({
      placedBricks: [createBrick({ id: 'brick-a', instanceId: 'a1' })],
    });
    const result = run(board, {
      inventory: [{ id: 'brick-a', quantity: 3 }],
    });
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('1/3');
    expect(result.message).toContain('brick-a: 1/3');
  });

  it('is invalid when no inventory is provided', () => {
    const result = run(createBoard());
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Inventory not provided');
  });

  it('handles multiple inventory items', () => {
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'A', instanceId: 'a1', position: { x: 0, y: 0 } }),
        createBrick({ id: 'B', instanceId: 'b1', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board, {
      inventory: [
        { id: 'A', quantity: 1 },
        { id: 'B', quantity: 1 },
      ],
    });
    expect(result.isValid).toBe(true);
  });

  it('reports correct counts for partial placement', () => {
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'A', instanceId: 'a1', position: { x: 0, y: 0 } }),
      ],
    });
    const result = run(board, {
      inventory: [
        { id: 'A', quantity: 2 },
        { id: 'B', quantity: 3 },
      ],
    });
    expect(result.isValid).toBe(false);
    // totalPlaced=1, totalRequired=5
    expect(result.message).toContain('1/5');
    expect(result.message).toContain('A: 1/2');
    expect(result.message).toContain('B: 0/3');
  });

  it('is valid when extra bricks are placed beyond inventory', () => {
    // Placing 3 of type A when only 2 required — 3 >= 2 so passes
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'A', instanceId: 'a1', position: { x: 0, y: 0 } }),
        createBrick({ id: 'A', instanceId: 'a2', position: { x: 1, y: 0 } }),
        createBrick({ id: 'A', instanceId: 'a3', position: { x: 2, y: 0 } }),
      ],
    });
    const result = run(board, {
      inventory: [{ id: 'A', quantity: 2 }],
    });
    expect(result.isValid).toBe(true);
  });
});

// ============================================
// 8. validatePatternMatch
// ============================================

describe('validatePatternMatch', () => {
  const run = (board: BoardState, params?: Record<string, unknown>) =>
    ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'PATTERN_MATCH', params },
    ])[0];

  it('is valid when pattern matches exactly', () => {
    // 2x2 pattern: all should be red
    const board = createBoard({
      dimensions: { width: 2, height: 2, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', color: '#ff0000', position: { x: 0, y: 0 } }),
        createBrick({ id: 'b', instanceId: 'b1', color: '#ff0000', position: { x: 1, y: 0 } }),
        createBrick({ id: 'c', instanceId: 'c1', color: '#ff0000', position: { x: 0, y: 1 } }),
        createBrick({ id: 'd', instanceId: 'd1', color: '#ff0000', position: { x: 1, y: 1 } }),
      ],
    });
    const result = run(board, {
      rows: [['1', '1'], ['1', '1']],
      color_mapping: { '1': '#ff0000' },
    });
    expect(result.isValid).toBe(true);
  });

  it('is invalid when color does not match', () => {
    const board = createBoard({
      dimensions: { width: 2, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', color: '#ff0000', position: { x: 0, y: 0 } }),
        createBrick({ id: 'b', instanceId: 'b1', color: '#0000ff', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board, {
      rows: [['1', '1']],
      color_mapping: { '1': '#ff0000' },
    });
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([1, 0]);
  });

  it('handles allow_empty_cells - empty cells pass when flag is true', () => {
    // Pattern says cell (1,0) should be red, but nothing is placed there
    const board = createBoard({
      dimensions: { width: 2, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', color: '#ff0000', position: { x: 0, y: 0 } }),
      ],
    });
    const result = run(board, {
      rows: [['1', '1']],
      color_mapping: { '1': '#ff0000' },
      allow_empty_cells: true,
    });
    expect(result.isValid).toBe(true);
  });

  it('empty cells fail when allow_empty_cells is false/not set', () => {
    const board = createBoard({
      dimensions: { width: 2, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ color: '#ff0000', position: { x: 0, y: 0 } }),
      ],
    });
    const result = run(board, {
      rows: [['1', '1']],
      color_mapping: { '1': '#ff0000' },
    });
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([1, 0]);
  });

  it('is invalid when missing params (no rows)', () => {
    const result = run(createBoard(), {
      color_mapping: { '1': '#ff0000' },
    });
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Pattern parameters not provided');
  });

  it('is invalid when missing params (no color_mapping)', () => {
    const result = run(createBoard(), {
      rows: [['1']],
    });
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Pattern parameters not provided');
  });

  it('is invalid when missing all params', () => {
    const result = run(createBoard());
    expect(result.isValid).toBe(false);
  });

  it('handles case-insensitive color comparison', () => {
    const board = createBoard({
      dimensions: { width: 1, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ color: '#FF0000', position: { x: 0, y: 0 } }),
      ],
    });
    const result = run(board, {
      rows: [['1']],
      color_mapping: { '1': '#ff0000' },
    });
    expect(result.isValid).toBe(true);
  });

  it('cells with unmapped values are ignored (no rejection by default)', () => {
    // Pattern value "0" is NOT in color_mapping, so any brick there is fine
    const board = createBoard({
      dimensions: { width: 2, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', color: '#ff0000', position: { x: 0, y: 0 } }),
        createBrick({ id: 'b', instanceId: 'b1', color: '#000000', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board, {
      rows: [['1', '0']],
      color_mapping: { '1': '#ff0000' },
    });
    expect(result.isValid).toBe(true);
  });

  it('reject_unmapped_target_colors rejects target color in unmapped cell', () => {
    // "0" is unmapped, but a target color (#000000) is placed there
    const board = createBoard({
      dimensions: { width: 2, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', color: '#ff0000', position: { x: 0, y: 0 } }),
        createBrick({ id: 'b', instanceId: 'b1', color: '#000000', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board, {
      rows: [['1', '0']],
      color_mapping: { '1': '#000000' },
      reject_unmapped_target_colors: true,
    });
    // Cell (0,0) has #ff0000 but expected #000000 -> mismatch
    // Cell (1,0) is unmapped but has a target color placed -> rejected
    expect(result.isValid).toBe(false);
  });

  it('reject_unmapped_target_colors allows non-target color in unmapped cell', () => {
    // "0" is unmapped. #ff0000 placed there is NOT a target color, so it should pass.
    const board = createBoard({
      dimensions: { width: 2, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', color: '#000000', position: { x: 0, y: 0 } }),
        createBrick({ id: 'b', instanceId: 'b1', color: '#ff0000', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board, {
      rows: [['1', '0']],
      color_mapping: { '1': '#000000' },
      reject_unmapped_target_colors: true,
    });
    // (0,0) has #000000 matching target -> ok
    // (1,0) is unmapped, #ff0000 is NOT a target color (#000000 is) -> ok
    expect(result.isValid).toBe(true);
  });

  it('handles numeric values in rows', () => {
    const board = createBoard({
      dimensions: { width: 2, height: 1, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', color: '#ff0000', position: { x: 0, y: 0 } }),
        createBrick({ id: 'b', instanceId: 'b1', color: '#0000ff', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board, {
      rows: [[1, 2]],
      color_mapping: { '1': '#ff0000', '2': '#0000ff' },
    });
    expect(result.isValid).toBe(true);
  });
});

// ============================================
// 9. validateGoalReached
// ============================================

describe('validateGoalReached', () => {
  const run = (board: BoardState, params?: Record<string, unknown>) =>
    ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'GOAL_REACHED', params },
    ])[0];

  it('is valid when target piece is at goal', () => {
    // unit brick at (2,2), goal cells = [[2,2]]
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'target', instanceId: 't1', position: { x: 2, y: 2 } }),
      ],
    });
    const result = run(board, {
      targetPieceId: 'target',
      goalCells: [[2, 2]],
    });
    expect(result.isValid).toBe(true);
    expect(result.message).toContain('Goal reached');
  });

  it('is invalid when target piece is not at goal', () => {
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'target', instanceId: 't1', position: { x: 0, y: 0 } }),
      ],
    });
    const result = run(board, {
      targetPieceId: 'target',
      goalCells: [[3, 3]],
    });
    expect(result.isValid).toBe(false);
    expect(result.affectedCells).toContainEqual([3, 3]);
  });

  it('is invalid when no goal cells provided', () => {
    const board = createBoard({
      placedBricks: [createBrick({ id: 'target', instanceId: 't1' })],
    });
    const result = run(board, { targetPieceId: 'target' });
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Goal cells not provided');
  });

  it('is invalid with empty goal cells array', () => {
    const result = run(createBoard(), {
      targetPieceId: 'target',
      goalCells: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Goal cells not provided');
  });

  it('is invalid when no target specification given', () => {
    const result = run(createBoard(), {
      goalCells: [[0, 0]],
    });
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('No target piece(s) specified');
  });

  describe('allowAnyPiece mode', () => {
    it('is valid when any piece is at goal', () => {
      const board = createBoard({
        placedBricks: [
          createBrick({ id: 'random', instanceId: 'r1', position: { x: 1, y: 1 } }),
        ],
      });
      const result = run(board, {
        allowAnyPiece: true,
        goalCells: [[1, 1]],
      });
      expect(result.isValid).toBe(true);
    });

    it('is invalid when no piece is at goal', () => {
      const board = createBoard({
        placedBricks: [
          createBrick({ id: 'random', instanceId: 'r1', position: { x: 0, y: 0 } }),
        ],
      });
      const result = run(board, {
        allowAnyPiece: true,
        goalCells: [[3, 3]],
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe('targetPieceIds (array) mode', () => {
    it('is valid when one of the target pieces is at goal', () => {
      const board = createBoard({
        placedBricks: [
          createBrick({ id: 'piece-A', instanceId: 'a1', position: { x: 0, y: 0 } }),
          createBrick({ id: 'piece-B', instanceId: 'b1', position: { x: 2, y: 2 } }),
        ],
      });
      const result = run(board, {
        targetPieceIds: ['piece-A', 'piece-B'],
        goalCells: [[2, 2]],
      });
      expect(result.isValid).toBe(true);
    });

    it('is invalid when none of the target pieces is at goal', () => {
      const board = createBoard({
        placedBricks: [
          createBrick({ id: 'piece-A', instanceId: 'a1', position: { x: 0, y: 0 } }),
          createBrick({ id: 'piece-B', instanceId: 'b1', position: { x: 1, y: 1 } }),
        ],
      });
      const result = run(board, {
        targetPieceIds: ['piece-A', 'piece-B'],
        goalCells: [[3, 3]],
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe('requireOtherPiecesStationary', () => {
    it('is valid when target at goal and other pieces unmoved', () => {
      const board = createBoard({
        placedBricks: [
          createBrick({ id: 'target', instanceId: 't1', position: { x: 2, y: 2 } }),
          createBrick({ id: 'blocker', instanceId: 'bl1', position: { x: 0, y: 0 } }),
        ],
      });
      const result = run(board, {
        targetPieceId: 'target',
        goalCells: [[2, 2]],
        requireOtherPiecesStationary: true,
        initialPositions: [
          { id: 'target', cells: [[0, 0] as [number, number]] },
          { id: 'blocker', cells: [[0, 0] as [number, number]] },
        ],
      });
      expect(result.isValid).toBe(true);
    });

    it('is invalid when a non-target piece has moved', () => {
      const board = createBoard({
        placedBricks: [
          createBrick({ id: 'target', instanceId: 't1', position: { x: 2, y: 2 } }),
          createBrick({ id: 'blocker', instanceId: 'bl1', position: { x: 1, y: 1 } }),
        ],
      });
      const result = run(board, {
        targetPieceId: 'target',
        goalCells: [[2, 2]],
        requireOtherPiecesStationary: true,
        initialPositions: [
          { id: 'target', cells: [[0, 0] as [number, number]] },
          { id: 'blocker', cells: [[0, 0] as [number, number]] },
        ],
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('not quite right');
    });

    it('is invalid when a non-target piece is missing', () => {
      const board = createBoard({
        placedBricks: [
          createBrick({ id: 'target', instanceId: 't1', position: { x: 2, y: 2 } }),
          // blocker is missing
        ],
      });
      const result = run(board, {
        targetPieceId: 'target',
        goalCells: [[2, 2]],
        requireOtherPiecesStationary: true,
        initialPositions: [
          { id: 'target', cells: [[0, 0] as [number, number]] },
          { id: 'blocker', cells: [[0, 0] as [number, number]] },
        ],
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('not quite right');
    });
  });

  it('works with multi-cell piece matching goal cells exactly', () => {
    // domino at (1,0) -> cells (1,0) and (2,0)
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'target', instanceId: 't1', shape: 'domino', position: { x: 1, y: 0 } }),
      ],
    });
    const result = run(board, {
      targetPieceId: 'target',
      goalCells: [[1, 0], [2, 0]],
    });
    expect(result.isValid).toBe(true);
  });

  it('fails when multi-cell piece only partially covers goal', () => {
    // domino at (0,0) -> cells (0,0) and (1,0), goal = (1,0) and (2,0)
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'target', instanceId: 't1', shape: 'domino', position: { x: 0, y: 0 } }),
      ],
    });
    const result = run(board, {
      targetPieceId: 'target',
      goalCells: [[1, 0], [2, 0]],
    });
    expect(result.isValid).toBe(false);
  });

  it('ignores non-target pieces when using targetPieceId', () => {
    // Non-target piece is at goal, but target piece is not
    const board = createBoard({
      placedBricks: [
        createBrick({ id: 'target', instanceId: 't1', position: { x: 0, y: 0 } }),
        createBrick({ id: 'other', instanceId: 'o1', position: { x: 3, y: 3 } }),
      ],
    });
    const result = run(board, {
      targetPieceId: 'target',
      goalCells: [[3, 3]],
    });
    expect(result.isValid).toBe(false);
  });
});

// ============================================
// 10. validateMaxMoves
// ============================================

describe('validateMaxMoves', () => {
  const run = (params?: Record<string, unknown>) =>
    ValidationRegistry.validate(createBoard(), [
      { type: 'validation', rule: 'MAX_MOVES', params },
    ])[0];

  it('is valid when under the limit', () => {
    const result = run({ maxMoves: 10, currentMoves: 5 });
    expect(result.isValid).toBe(true);
    expect(result.message).toContain('5/10');
  });

  it('is invalid when over the limit', () => {
    const result = run({ maxMoves: 10, currentMoves: 11 });
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('11/10');
    expect(result.message).toContain('Exceeded');
  });

  it('is valid when no limit is set (maxMoves undefined)', () => {
    const result = run({ currentMoves: 100 });
    expect(result.isValid).toBe(true);
    expect(result.message).toContain('No move limit');
  });

  it('is valid when exactly at the limit', () => {
    const result = run({ maxMoves: 5, currentMoves: 5 });
    expect(result.isValid).toBe(true);
    expect(result.message).toContain('5/5');
  });

  it('defaults currentMoves to 0 when not provided', () => {
    const result = run({ maxMoves: 5 });
    expect(result.isValid).toBe(true);
    expect(result.message).toContain('0/5');
  });

  it('is valid with no params at all', () => {
    const result = run();
    expect(result.isValid).toBe(true);
  });

  it('is valid when currentMoves is 0', () => {
    const result = run({ maxMoves: 3, currentMoves: 0 });
    expect(result.isValid).toBe(true);
  });

  it('is invalid when maxMoves is 0 and currentMoves is 1', () => {
    const result = run({ maxMoves: 0, currentMoves: 1 });
    expect(result.isValid).toBe(false);
  });

  it('is valid when maxMoves is 0 and currentMoves is 0', () => {
    const result = run({ maxMoves: 0, currentMoves: 0 });
    expect(result.isValid).toBe(true);
  });
});

// ============================================
// 11. MOVEMENT / CONSTRAINT RULES (always valid)
// ============================================

describe('Movement/Constraint rules (always valid)', () => {
  const board = createBoard();

  it('SLIDING_ONLY always returns isValid: true', () => {
    const results = ValidationRegistry.validate(board, [
      { type: 'constraint', rule: 'SLIDING_ONLY' },
    ]);
    expect(results[0].isValid).toBe(true);
    expect(results[0].rule).toBe('SLIDING_ONLY');
  });

  it('NO_ROTATION always returns isValid: true', () => {
    const results = ValidationRegistry.validate(board, [
      { type: 'constraint', rule: 'NO_ROTATION' },
    ]);
    expect(results[0].isValid).toBe(true);
    expect(results[0].rule).toBe('NO_ROTATION');
  });

  it('FREE_PLACEMENT always returns isValid: true', () => {
    const results = ValidationRegistry.validate(board, [
      { type: 'constraint', rule: 'FREE_PLACEMENT' },
    ]);
    expect(results[0].isValid).toBe(true);
    expect(results[0].rule).toBe('FREE_PLACEMENT');
  });

  it('NO_BRICK_REMOVAL always returns isValid: true', () => {
    const results = ValidationRegistry.validate(board, [
      { type: 'constraint', rule: 'NO_BRICK_REMOVAL' },
    ]);
    expect(results[0].isValid).toBe(true);
    expect(results[0].rule).toBe('NO_BRICK_REMOVAL');
  });

  it('constraint rules return valid regardless of board state', () => {
    const busyBoard = createBoard({
      placedBricks: fillBoard(4, 4),
      blockedCells: [[0, 0]],
    });
    const constraintRules = ['SLIDING_ONLY', 'NO_ROTATION', 'FREE_PLACEMENT', 'NO_BRICK_REMOVAL'];
    for (const rule of constraintRules) {
      const results = ValidationRegistry.validate(busyBoard, [
        { type: 'constraint', rule },
      ]);
      expect(results[0].isValid).toBe(true);
    }
  });
});

// ============================================
// EDGE CASES & INTEGRATION
// ============================================

describe('Edge cases and integration', () => {
  it('validates multiple rules at once with mixed pass/fail', () => {
    // Board with overlap and out of bounds
    const board = createBoard({
      dimensions: { width: 2, height: 2, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', position: { x: 0, y: 0 }, z: 0 }),
        createBrick({ id: 'b', instanceId: 'b1', position: { x: 0, y: 0 }, z: 0 }),
        createBrick({ id: 'c', instanceId: 'c1', position: { x: 5, y: 5 }, z: 0 }),
      ],
    });
    const results = ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'NO_BRICK_OVERLAP' },
      { type: 'validation', rule: 'NO_BRICKS_OUT_OF_BOUNDS' },
    ]);
    expect(results[0].isValid).toBe(false); // overlap
    expect(results[1].isValid).toBe(false); // out of bounds
    expect(ValidationRegistry.isAllValid(results)).toBe(false);
  });

  it('a fully valid board passes all standard checks', () => {
    const board = createBoard({
      dimensions: { width: 2, height: 2, depth: 1 },
      placedBricks: [
        createBrick({ id: 'a', instanceId: 'a1', position: { x: 0, y: 0 } }),
        createBrick({ id: 'b', instanceId: 'b1', position: { x: 1, y: 0 } }),
        createBrick({ id: 'c', instanceId: 'c1', position: { x: 0, y: 1 } }),
        createBrick({ id: 'd', instanceId: 'd1', position: { x: 1, y: 1 } }),
      ],
    });
    const results = ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'ALL_BOARD_SQUARES_MUST_BE_COVERED' },
      { type: 'validation', rule: 'NO_BRICK_OVERLAP' },
      { type: 'validation', rule: 'NO_BRICKS_OUT_OF_BOUNDS' },
      { type: 'validation', rule: 'NO_BLOCKED_CELLS' },
      { type: 'validation', rule: 'NO_BRICKS_EXCEED_DEPTH' },
    ]);
    expect(ValidationRegistry.isAllValid(results)).toBe(true);
  });

  it('handles rotated bricks properly for coverage', () => {
    // domino rotated 90 degrees at (0,0) -> cells (0,0) and (0,1)
    const board = createBoard({
      dimensions: { width: 1, height: 2, depth: 1 },
      placedBricks: [
        createBrick({ shape: 'domino', position: { x: 0, y: 0 }, rotation: 90 }),
      ],
    });
    const results = ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'ALL_BOARD_SQUARES_MUST_BE_COVERED' },
      { type: 'validation', rule: 'NO_BRICKS_OUT_OF_BOUNDS' },
    ]);
    expect(results[0].isValid).toBe(true); // both cells covered
    expect(results[1].isValid).toBe(true); // within bounds
  });

  it('handles T-tetromino covering correct cells', () => {
    // T-tetromino at (0,0): cells [[0,0],[1,0],[2,0],[1,1]]
    const board = createBoard({
      dimensions: { width: 3, height: 2, depth: 1 },
      placedBricks: [
        createBrick({
          shape: 'T-tetromino',
          position: { x: 0, y: 0 },
          rotation: 0,
        }),
        createBrick({ id: 'fill1', instanceId: 'f1', position: { x: 0, y: 1 } }),
        createBrick({ id: 'fill2', instanceId: 'f2', position: { x: 2, y: 1 } }),
      ],
    });
    const coverageResult = ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'ALL_BOARD_SQUARES_MUST_BE_COVERED' },
    ])[0];
    expect(coverageResult.isValid).toBe(true);
  });

  it('large board with many bricks performs correctly', () => {
    const w = 10;
    const h = 10;
    const board = createBoard({
      dimensions: { width: w, height: h, depth: 1 },
      placedBricks: fillBoard(w, h),
    });
    const results = ValidationRegistry.validate(board, [
      { type: 'validation', rule: 'ALL_BOARD_SQUARES_MUST_BE_COVERED' },
      { type: 'validation', rule: 'NO_BRICK_OVERLAP' },
      { type: 'validation', rule: 'NO_BRICKS_OUT_OF_BOUNDS' },
    ]);
    expect(ValidationRegistry.isAllValid(results)).toBe(true);
  });
});
