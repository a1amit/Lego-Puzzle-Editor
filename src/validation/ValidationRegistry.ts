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

