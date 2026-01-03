import { BoardState, ValidationResult, SHAPE_LIBRARY, ShapeDefinition, PlacedBrick } from '../types/puzzle';

// ============================================
// VALIDATION FUNCTION TYPE
// ============================================

export type ValidationFunction = (
  boardState: BoardState,
  params?: Record<string, unknown>
) => ValidationResult;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Rotate shape cells by 90 degrees clockwise
 */
export function rotateShape(cells: [number, number][], rotation: number): [number, number][] {
  const steps = Math.floor((rotation % 360) / 90);
  let rotated = [...cells];

  for (let i = 0; i < steps; i++) {
    rotated = rotated.map(([x, y]) => [y, -x] as [number, number]);
  }

  // Normalize to positive coordinates
  const minX = Math.min(...rotated.map(([x]) => x));
  const minY = Math.min(...rotated.map(([, y]) => y));

  return rotated.map(([x, y]) => [x - minX, y - minY] as [number, number]);
}

/**
 * Get all cells occupied by a placed brick
 */
export function getBrickCells(brick: PlacedBrick, shapeLibrary: Record<string, ShapeDefinition> = SHAPE_LIBRARY): [number, number][] {
  const shape = shapeLibrary[brick.shape];
  if (!shape) {
    console.warn(`Unknown shape: ${brick.shape}`);
    return [];
  }

  const rotatedCells = rotateShape(shape.cells, brick.rotation);

  return rotatedCells.map(([dx, dy]) => [
    brick.position.x + dx,
    brick.position.y + dy,
  ] as [number, number]);
}

/**
 * Get all cells occupied by all placed bricks
 * Returns a map of "x,y" -> bricks at that position (across all z-levels)
 */
export function getAllOccupiedCells(boardState: BoardState): Map<string, PlacedBrick[]> {
  const cellMap = new Map<string, PlacedBrick[]>();

  for (const brick of boardState.placedBricks) {
    const cells = getBrickCells(brick);
    for (const [x, y] of cells) {
      const key = `${x},${y}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, []);
      }
      cellMap.get(key)!.push(brick);
    }
  }

  return cellMap;
}

/**
 * Get all cells occupied by bricks at a specific z-level
 * Returns a map of "x,y" -> bricks at that position and z-level
 */
export function getOccupiedCellsAtZ(boardState: BoardState, z: number): Map<string, PlacedBrick[]> {
  const cellMap = new Map<string, PlacedBrick[]>();

  for (const brick of boardState.placedBricks) {
    if (brick.z !== z) continue;
    const cells = getBrickCells(brick);
    for (const [x, y] of cells) {
      const key = `${x},${y}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, []);
      }
      cellMap.get(key)!.push(brick);
    }
  }

  return cellMap;
}

// ============================================
// VALIDATION IMPLEMENTATIONS
// ============================================

/**
 * Check if all board squares are covered by bricks
 */
const validateAllBoardSquaresCovered: ValidationFunction = (boardState) => {
  const { dimensions, blockedCells } = boardState;
  const occupiedCells = getAllOccupiedCells(boardState);
  const blockedSet = new Set(blockedCells.map(([x, y]) => `${x},${y}`));

  const uncoveredCells: [number, number][] = [];

  for (let x = 0; x < dimensions.width; x++) {
    for (let y = 0; y < dimensions.height; y++) {
      const key = `${x},${y}`;
      if (!blockedSet.has(key) && !occupiedCells.has(key)) {
        uncoveredCells.push([x, y]);
      }
    }
  }

  if (uncoveredCells.length > 0) {
    return {
      isValid: false,
      rule: 'ALL_BOARD_SQUARES_MUST_BE_COVERED',
      message: `${uncoveredCells.length} cell(s) are not covered`,
      affectedCells: uncoveredCells,
    };
  }

  return {
    isValid: true,
    rule: 'ALL_BOARD_SQUARES_MUST_BE_COVERED',
    message: 'All board squares are covered',
  };
};

/**
 * Check if any bricks overlap at the same z-level
 * Bricks can stack vertically (different z-levels) but cannot overlap at the same level
 */
const validateNoBrickOverlap: ValidationFunction = (boardState) => {
  // Group bricks by z-level and check for overlaps at each level
  const zLevels = new Set(boardState.placedBricks.map(b => b.z));
  const overlappingCells: [number, number][] = [];

  for (const z of zLevels) {
    const cellMap = getOccupiedCellsAtZ(boardState, z);
    for (const [key, bricks] of cellMap.entries()) {
      if (bricks.length > 1) {
        const [x, y] = key.split(',').map(Number);
        overlappingCells.push([x, y]);
      }
    }
  }

  if (overlappingCells.length > 0) {
    return {
      isValid: false,
      rule: 'NO_BRICK_OVERLAP',
      message: `${overlappingCells.length} cell(s) have overlapping bricks at the same level`,
      affectedCells: overlappingCells,
    };
  }

  return {
    isValid: true,
    rule: 'NO_BRICK_OVERLAP',
    message: 'No bricks are overlapping',
  };
};

/**
 * Check if any bricks are placed outside the board boundaries
 */
const validateNoBricksOutOfBounds: ValidationFunction = (boardState) => {
  const { dimensions } = boardState;
  const outOfBoundsCells: [number, number][] = [];

  for (const brick of boardState.placedBricks) {
    const cells = getBrickCells(brick);
    for (const [x, y] of cells) {
      if (x < 0 || x >= dimensions.width || y < 0 || y >= dimensions.height) {
        outOfBoundsCells.push([x, y]);
      }
    }
  }

  if (outOfBoundsCells.length > 0) {
    return {
      isValid: false,
      rule: 'NO_BRICKS_OUT_OF_BOUNDS',
      message: `${outOfBoundsCells.length} cell(s) are outside the board`,
      affectedCells: outOfBoundsCells,
    };
  }

  return {
    isValid: true,
    rule: 'NO_BRICKS_OUT_OF_BOUNDS',
    message: 'All bricks are within bounds',
  };
};

/**
 * Check if bricks are placed on blocked cells
 */
const validateNoBlockedCells: ValidationFunction = (boardState) => {
  const { blockedCells } = boardState;
  const blockedSet = new Set(blockedCells.map(([x, y]) => `${x},${y}`));
  const violatingCells: [number, number][] = [];

  for (const brick of boardState.placedBricks) {
    const cells = getBrickCells(brick);
    for (const [x, y] of cells) {
      if (blockedSet.has(`${x},${y}`)) {
        violatingCells.push([x, y]);
      }
    }
  }

  if (violatingCells.length > 0) {
    return {
      isValid: false,
      rule: 'NO_BLOCKED_CELLS',
      message: `${violatingCells.length} brick cell(s) are on blocked squares`,
      affectedCells: violatingCells,
    };
  }

  return {
    isValid: true,
    rule: 'NO_BLOCKED_CELLS',
    message: 'No bricks on blocked cells',
  };
};

/**
 * Check if any bricks exceed the board depth limit
 * Depth: 1 = no stacking (only z=0), depth: 2 = one layer (z=0,1), etc.
 */
const validateNoBricksExceedDepth: ValidationFunction = (boardState) => {
  const maxAllowedZ = boardState.dimensions.depth - 1;
  const exceedingBricks: PlacedBrick[] = [];

  for (const brick of boardState.placedBricks) {
    if ((brick.z || 0) > maxAllowedZ) {
      exceedingBricks.push(brick);
    }
  }

  if (exceedingBricks.length > 0) {
    const affectedCells: [number, number][] = [];
    for (const brick of exceedingBricks) {
      const cells = getBrickCells(brick);
      affectedCells.push(...cells);
    }

    return {
      isValid: false,
      rule: 'NO_BRICKS_EXCEED_DEPTH',
      message: `${exceedingBricks.length} brick(s) exceed the board depth limit (max z-level: ${maxAllowedZ})`,
      affectedCells,
    };
  }

  return {
    isValid: true,
    rule: 'NO_BRICKS_EXCEED_DEPTH',
    message: 'All bricks are within depth limits',
  };
};

/**
 * Check if all bricks from inventory have been placed on the board
 * Params should contain: { inventory: Array<{ id: string, quantity: number }> }
 */
const validateAllBricksMustBeUsed: ValidationFunction = (boardState, params) => {
  const inventory = params?.inventory as Array<{ id: string; quantity: number }> | undefined;

  if (!inventory) {
    return {
      isValid: false,
      rule: 'ALL_BRICKS_MUST_BE_USED',
      message: 'Inventory not provided for validation',
    };
  }

  // Count placed bricks by ID
  const placedCounts = new Map<string, number>();
  for (const brick of boardState.placedBricks) {
    const count = placedCounts.get(brick.id) ?? 0;
    placedCounts.set(brick.id, count + 1);
  }

  // Check if all inventory bricks are placed
  const missingBricks: string[] = [];
  let totalRequired = 0;
  let totalPlaced = 0;

  for (const item of inventory) {
    const required = item.quantity;
    const placed = placedCounts.get(item.id) ?? 0;
    totalRequired += required;
    totalPlaced += placed;

    if (placed < required) {
      missingBricks.push(`${item.id}: ${placed}/${required}`);
    }
  }

  if (missingBricks.length > 0) {
    return {
      isValid: false,
      rule: 'ALL_BRICKS_MUST_BE_USED',
      message: `${totalPlaced}/${totalRequired} bricks placed. Missing: ${missingBricks.join(', ')}`,
    };
  }

  return {
    isValid: true,
    rule: 'ALL_BRICKS_MUST_BE_USED',
    message: `All ${totalRequired} bricks have been placed`,
  };
};

/**
 * Check if placed pieces match a target pattern (for Binary, RLE, and pattern puzzles)
 * Params should contain: { rows: (number|string)[][], color_mapping: Record<string, string>, allow_empty_cells?: boolean }
 */
const validatePatternMatch: ValidationFunction = (boardState, params) => {
  const rows = params?.rows as (number | string)[][] | undefined;
  const colorMapping = params?.color_mapping as Record<string, string> | undefined;
  const allowEmptyCells = params?.allow_empty_cells as boolean | undefined;

  if (!rows || !colorMapping) {
    return {
      isValid: false,
      rule: 'PATTERN_MATCH',
      message: 'Pattern parameters not provided (rows, color_mapping)',
    };
  }

  // Build a map of cell -> color from placed bricks
  const cellColorMap = new Map<string, string>();

  for (const brick of boardState.placedBricks) {
    // Get cells from brick - check if it has direct cells or uses shape library
    let brickCells: [number, number][];

    if ((brick as any).cells) {
      // Direct cell-based definition (like slider puzzles)
      brickCells = (brick as any).cells;
    } else {
      // Shape-based definition
      brickCells = getBrickCells(brick);
    }

    for (const [x, y] of brickCells) {
      cellColorMap.set(`${x},${y}`, brick.color.toLowerCase());
    }
  }

  // Check each cell in the pattern
  const mismatches: { x: number; y: number; expected: string; actual: string | null }[] = [];
  const affectedCells: [number, number][] = [];

  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const expectedValue = String(rows[y][x]);
      const expectedColor = colorMapping[expectedValue]?.toLowerCase();

      if (!expectedColor) {
        // Value not in color mapping - skip or error
        continue;
      }

      const actualColor = cellColorMap.get(`${x},${y}`);

      if (!actualColor) {
        // Cell is empty
        if (!allowEmptyCells) {
          mismatches.push({ x, y, expected: expectedColor, actual: null });
          affectedCells.push([x, y]);
        }
      } else if (actualColor !== expectedColor) {
        // Wrong color
        mismatches.push({ x, y, expected: expectedColor, actual: actualColor });
        affectedCells.push([x, y]);
      }
    }
  }

  if (mismatches.length > 0) {
    return {
      isValid: false,
      rule: 'PATTERN_MATCH',
      message: 'Pattern does not match - keep trying!',
      affectedCells,
    };
  }

  return {
    isValid: true,
    rule: 'PATTERN_MATCH',
    message: 'Pattern matches perfectly!',
  };
};

/**
 * Check if a target piece has reached the goal (for slider puzzles)
 * Params options:
 *   - { targetPieceId: string, goalCells: [number, number][] } - Single specific piece (Klotski)
 *   - { targetPieceIds: string[], goalCells: [number, number][] } - Any piece from list
 *   - { allowAnyPiece: true, goalCells: [number, number][] } - Any piece on the board
 *   - { requireOtherPiecesStationary: true, initialPositions: [...] } - Other pieces must stay in place
 */
const validateGoalReached: ValidationFunction = (boardState, params) => {
  const targetPieceId = params?.targetPieceId as string | undefined;
  const targetPieceIds = params?.targetPieceIds as string[] | undefined;
  const allowAnyPiece = params?.allowAnyPiece as boolean | undefined;
  const goalCells = params?.goalCells as [number, number][] | undefined;
  const requireOtherPiecesStationary = params?.requireOtherPiecesStationary as boolean | undefined;
  const initialPositions = params?.initialPositions as Array<{ id: string; cells: [number, number][] }> | undefined;

  if (!goalCells || goalCells.length === 0) {
    return {
      isValid: false,
      rule: 'GOAL_REACHED',
      message: 'Goal cells not provided',
    };
  }

  const goalCellSet = new Set(goalCells.map(([x, y]) => `${x},${y}`));

  // Determine which pieces are allowed to move (target pieces)
  const allowedToMoveIds = new Set<string>();
  if (targetPieceIds) {
    targetPieceIds.forEach(id => allowedToMoveIds.add(id));
  }
  if (targetPieceId) {
    allowedToMoveIds.add(targetPieceId);
  }

  // Determine which pieces to check for goal
  let candidatePieces: typeof boardState.placedBricks;

  if (allowAnyPiece) {
    // Check all pieces on the board
    candidatePieces = boardState.placedBricks;
  } else if (targetPieceIds && targetPieceIds.length > 0) {
    // Check specific list of pieces
    candidatePieces = boardState.placedBricks.filter(b => targetPieceIds.includes(b.id));
  } else if (targetPieceId) {
    // Check single specific piece (original behavior)
    candidatePieces = boardState.placedBricks.filter(b => b.id === targetPieceId);
  } else {
    return {
      isValid: false,
      rule: 'GOAL_REACHED',
      message: 'No target piece(s) specified (need targetPieceId, targetPieceIds, or allowAnyPiece)',
    };
  }

  // Check if ANY of the candidate pieces is at the goal
  let goalReached = false;
  for (const piece of candidatePieces) {
    const shapeDef = SHAPE_LIBRARY[piece.shape];
    if (!shapeDef) continue;

    const rotatedCells = rotateShape(shapeDef.cells, piece.rotation || 0);
    const pieceCells = rotatedCells.map(([dx, dy]) => [
      piece.position.x + dx,
      piece.position.y + dy,
    ] as [number, number]);

    const pieceCellSet = new Set(pieceCells.map(([x, y]) => `${x},${y}`));

    // Check if this piece's cells match goal cells exactly
    const isAtGoal = pieceCellSet.size === goalCellSet.size &&
      [...pieceCellSet].every(cell => goalCellSet.has(cell));

    if (isAtGoal) {
      goalReached = true;
      break;
    }
  }

  // If requireOtherPiecesStationary is set, check that non-target pieces haven't moved
  if (goalReached && requireOtherPiecesStationary && initialPositions) {
    for (const initial of initialPositions) {
      // Skip pieces that are allowed to move
      if (allowedToMoveIds.has(initial.id)) continue;

      // Find this piece on the board
      const currentPiece = boardState.placedBricks.find(b => b.id === initial.id);

      if (!currentPiece) {
        // Piece was removed - violation (but show cryptic message)
        return {
          isValid: false,
          rule: 'GOAL_REACHED',
          message: 'Something is not quite right... Think again!',
        };
      }

      // Get current cells from the piece
      const shapeDef = SHAPE_LIBRARY[currentPiece.shape];
      if (!shapeDef) continue;

      const rotatedCells = rotateShape(shapeDef.cells, currentPiece.rotation || 0);
      const currentCells = rotatedCells.map(([dx, dy]) => [
        currentPiece.position.x + dx,
        currentPiece.position.y + dy,
      ] as [number, number]);

      // Check if all cells match (order doesn't matter)
      const initialSet = new Set(initial.cells.map(([x, y]) => `${x},${y}`));
      const currentSet = new Set(currentCells.map(([x, y]) => `${x},${y}`));

      const allMatch = currentSet.size === initialSet.size &&
        [...currentSet].every(cell => initialSet.has(cell));

      if (!allMatch) {
        // Piece moved from original position - show cryptic message
        return {
          isValid: false,
          rule: 'GOAL_REACHED',
          message: 'Something is not quite right... Think again!',
        };
      }
    }
  }

  if (goalReached) {
    return {
      isValid: true,
      rule: 'GOAL_REACHED',
      message: '🎉 Goal reached! Puzzle solved!',
    };
  }

  // No piece at goal - show which cells need to be covered
  const uncoveredGoal = goalCells;

  return {
    isValid: false,
    rule: 'GOAL_REACHED',
    message: allowAnyPiece || targetPieceIds
      ? 'Move a piece to the goal area'
      : 'Move the target piece to the goal area',
    affectedCells: uncoveredGoal,
  };
};

/**
 * Check if the maximum number of moves has been exceeded
 * Params should contain: { maxMoves: number, currentMoves: number }
 */
const validateMaxMoves: ValidationFunction = (_boardState, params) => {
  const maxMoves = params?.maxMoves as number | undefined;
  const currentMoves = params?.currentMoves as number | undefined;

  if (maxMoves === undefined) {
    return {
      isValid: true,
      rule: 'MAX_MOVES',
      message: 'No move limit set',
    };
  }

  const moves = currentMoves ?? 0;

  if (moves > maxMoves) {
    return {
      isValid: false,
      rule: 'MAX_MOVES',
      message: `Exceeded move limit: ${moves}/${maxMoves} moves used`,
    };
  }

  return {
    isValid: true,
    rule: 'MAX_MOVES',
    message: `${moves}/${maxMoves} moves used`,
  };
};


// ============================================
// VALIDATION REGISTRY
// ============================================

class ValidationRegistryClass {
  private validators: Map<string, ValidationFunction> = new Map();

  constructor() {
    // Register default validators
    this.register('ALL_BOARD_SQUARES_MUST_BE_COVERED', validateAllBoardSquaresCovered);
    this.register('ALL_BRICKS_MUST_BE_USED', validateAllBricksMustBeUsed);
    this.register('NO_BRICK_OVERLAP', validateNoBrickOverlap);
    this.register('NO_BRICKS_OUT_OF_BOUNDS', validateNoBricksOutOfBounds);
    this.register('NO_BLOCKED_CELLS', validateNoBlockedCells);
    this.register('NO_BRICKS_EXCEED_DEPTH', validateNoBricksExceedDepth);
    this.register('GOAL_REACHED', validateGoalReached);
    this.register('PATTERN_MATCH', validatePatternMatch);
    this.register('MAX_MOVES', validateMaxMoves);
    // Movement rules (these are constraints, not validations - always pass)
    this.register('SLIDING_ONLY', () => ({
      isValid: true,
      rule: 'SLIDING_ONLY',
      message: 'Sliding movement enabled - click a piece then click to slide it',
    }));
    this.register('NO_ROTATION', () => ({
      isValid: true,
      rule: 'NO_ROTATION',
      message: 'Rotation disabled - pieces cannot be rotated',
    }));
    this.register('FREE_PLACEMENT', () => ({
      isValid: true,
      rule: 'FREE_PLACEMENT',
      message: 'Free placement enabled - place pieces anywhere valid',
    }));
    this.register('NO_BRICK_REMOVAL', () => ({
      isValid: true,
      rule: 'NO_BRICK_REMOVAL',
      message: 'Brick removal disabled',
    }));
  }

  /**
   * Register a new validation function
   */
  register(ruleName: string, validator: ValidationFunction): void {
    this.validators.set(ruleName, validator);
  }

  /**
   * Unregister a validation function
   */
  unregister(ruleName: string): boolean {
    return this.validators.delete(ruleName);
  }

  /**
   * Get a specific validator
   */
  get(ruleName: string): ValidationFunction | undefined {
    return this.validators.get(ruleName);
  }

  /**
   * Check if a validator exists
   */
  has(ruleName: string): boolean {
    return this.validators.has(ruleName);
  }

  /**
   * Get all registered rule names
   */
  getRegisteredRules(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Validate board state against a list of rules
   */
  validate(
    boardState: BoardState,
    rules: { type: string; rule: string; params?: Record<string, unknown> }[]
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const ruleConfig of rules) {
      const validator = this.validators.get(ruleConfig.rule);

      if (validator) {
        const result = validator(boardState, ruleConfig.params);
        results.push(result);
      } else {
        results.push({
          isValid: false,
          rule: ruleConfig.rule,
          message: `Unknown validation rule: ${ruleConfig.rule}`,
        });
      }
    }

    return results;
  }

  /**
   * Check if all validations pass
   */
  isAllValid(results: ValidationResult[]): boolean {
    return results.every(r => r.isValid);
  }
}

// Singleton instance
export const ValidationRegistry = new ValidationRegistryClass();

