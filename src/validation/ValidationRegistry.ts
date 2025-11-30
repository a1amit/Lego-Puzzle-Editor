import { BoardState, ValidationResult, SHAPE_LIBRARY, ShapeDefinition, PlacedBrick, Rotation3D, Cell3D, Cell2D, normalizeCellsTo3D } from '../types/puzzle';

// ============================================
// VALIDATION FUNCTION TYPE
// ============================================

export type ValidationFunction = (
  boardState: BoardState,
  params?: Record<string, unknown>
) => ValidationResult;

// ============================================
// 3D ROTATION MATH HELPERS
// ============================================

/**
 * Apply a single 90-degree rotation around the X axis to a 3D point.
 * Rotation formula: [x, y, z] -> [x, -z, y]
 */
function rotateAroundX(cell: Cell3D): Cell3D {
  const [x, y, z] = cell;
  return [x, -z, y];
}

/**
 * Apply a single 90-degree rotation around the Y axis to a 3D point.
 * Rotation formula: [x, y, z] -> [z, y, -x]
 */
function rotateAroundY(cell: Cell3D): Cell3D {
  const [x, y, z] = cell;
  return [z, y, -x];
}

/**
 * Apply a single 90-degree rotation around the Z axis to a 3D point.
 * Rotation formula: [x, y, z] -> [-y, x, z]
 */
function rotateAroundZ(cell: Cell3D): Cell3D {
  const [x, y, z] = cell;
  return [-y, x, z];
}

/**
 * Apply N 90-degree rotations around a specific axis
 */
function applyAxisRotation(cell: Cell3D, axis: 'x' | 'y' | 'z', steps: number): Cell3D {
  const normalizedSteps = ((steps % 4) + 4) % 4; // Normalize to 0-3
  let result = cell;

  for (let i = 0; i < normalizedSteps; i++) {
    switch (axis) {
      case 'x':
        result = rotateAroundX(result);
        break;
      case 'y':
        result = rotateAroundY(result);
        break;
      case 'z':
        result = rotateAroundZ(result);
        break;
    }
  }

  return result;
}

/**
 * Apply a full 3D rotation (Euler angles in 90-degree steps) to a cell.
 * Rotation order: Z first, then X, then Y (common convention)
 */
function applyRotation3D(cell: Cell3D, rotation: Rotation3D): Cell3D {
  let result = cell;
  // Apply rotations in order: Z -> X -> Y
  result = applyAxisRotation(result, 'z', rotation.z);
  result = applyAxisRotation(result, 'x', rotation.x);
  result = applyAxisRotation(result, 'y', rotation.y);
  return result;
}

/**
 * Normalize cells so minimum coordinates are at origin (0, 0, 0)
 */
function normalizeCellsToOrigin(cells: Cell3D[]): Cell3D[] {
  if (cells.length === 0) return cells;

  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const minZ = Math.min(...cells.map(([, , z]) => z));

  return cells.map(([x, y, z]) => [x - minX, y - minY, z - minZ]);
}

// ============================================
// PUBLIC ROTATION FUNCTIONS
// ============================================

/**
 * Rotate 3D shape cells by the given Rotation3D.
 * This applies rotations around Z, then X, then Y axes (in that order).
 * Returns cells normalized to positive coordinates starting at origin.
 */
export function rotateShape3D(cells: Cell3D[], rotation: Rotation3D): Cell3D[] {
  const rotated = cells.map(cell => applyRotation3D(cell, rotation));
  return normalizeCellsToOrigin(rotated);
}

/**
 * Legacy 2D rotation function for backward compatibility.
 * Converts to 3D, rotates around Z axis, and returns 2D cells.
 * @deprecated Use rotateShape3D instead
 */
export function rotateShape(cells: (Cell2D | Cell3D)[], rotation: number | Rotation3D): Cell3D[] {
  // Normalize to 3D cells
  const cells3D = normalizeCellsTo3D(cells);

  // Handle legacy numeric rotation (Z-axis only)
  if (typeof rotation === 'number') {
    const steps = Math.floor((rotation % 360) / 90);
    return rotateShape3D(cells3D, { x: 0, y: 0, z: steps });
  }

  // Handle full 3D rotation
  return rotateShape3D(cells3D, rotation);
}

/**
 * Increment rotation by 90 degrees on a specific axis
 */
export function incrementRotation(currentRotation: Rotation3D, axis: 'x' | 'y' | 'z'): Rotation3D {
  return {
    ...currentRotation,
    [axis]: (currentRotation[axis] + 1) % 4,
  };
}

/**
 * Convert Rotation3D to Euler angles in radians for Three.js
 */
export function rotation3DToEuler(rotation: Rotation3D): [number, number, number] {
  const toRadians = (steps: number) => (steps * Math.PI) / 2;
  return [
    toRadians(rotation.x),
    toRadians(rotation.y),
    toRadians(rotation.z),
  ];
}

// ============================================
// BRICK CELL CALCULATION (3D)
// ============================================

/**
 * Get all 3D cells (voxels) occupied by a placed brick in world space.
 * Takes into account the brick's position and rotation.
 */
export function getBrickCells3D(
  brick: PlacedBrick,
  shapeLibrary: Record<string, ShapeDefinition> = SHAPE_LIBRARY
): Cell3D[] {
  const shape = shapeLibrary[brick.shape];
  if (!shape) {
    console.warn(`Unknown shape: ${brick.shape}`);
    return [];
  }

  // Normalize shape cells to 3D
  const cells3D = normalizeCellsTo3D(shape.cells);

  // Apply rotation
  const rotatedCells = rotateShape3D(cells3D, brick.rotation);

  // Translate to world position
  return rotatedCells.map(([dx, dy, dz]) => [
    brick.position.x + dx,
    brick.position.y + dy,
    brick.position.z + dz,
  ] as Cell3D);
}

/**
 * Legacy function - returns 2D cells for backward compatibility
 * @deprecated Use getBrickCells3D instead
 */
export function getBrickCells(
  brick: PlacedBrick,
  shapeLibrary: Record<string, ShapeDefinition> = SHAPE_LIBRARY
): Cell3D[] {
  return getBrickCells3D(brick, shapeLibrary);
}

/**
 * Get the 3D bounding box of a brick after rotation
 */
export function getBrickBoundingBox(
  brick: PlacedBrick,
  shapeLibrary: Record<string, ShapeDefinition> = SHAPE_LIBRARY
): { min: Cell3D; max: Cell3D; size: Cell3D } {
  const cells = getBrickCells3D(brick, shapeLibrary);

  if (cells.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      size: [0, 0, 0],
    };
  }

  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const minZ = Math.min(...cells.map(([, , z]) => z));
  const maxX = Math.max(...cells.map(([x]) => x));
  const maxY = Math.max(...cells.map(([, y]) => y));
  const maxZ = Math.max(...cells.map(([, , z]) => z));

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    size: [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1],
  };
}

// ============================================
// 3D OCCUPIED CELLS TRACKING
// ============================================

/**
 * Get all 3D cells occupied by all placed bricks.
 * Returns a map of "x,y,z" -> bricks at that voxel position.
 */
export function getAllOccupiedCells3D(boardState: BoardState): Map<string, PlacedBrick[]> {
  const cellMap = new Map<string, PlacedBrick[]>();

  for (const brick of boardState.placedBricks) {
    const cells = getBrickCells3D(brick);
    for (const [x, y, z] of cells) {
      const key = `${x},${y},${z}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, []);
      }
      cellMap.get(key)!.push(brick);
    }
  }

  return cellMap;
}

/**
 * Legacy function - for 2D projection compatibility
 * Returns a map of "x,y" -> bricks (ignoring Z)
 */
export function getAllOccupiedCells(boardState: BoardState): Map<string, PlacedBrick[]> {
  const cellMap = new Map<string, PlacedBrick[]>();

  for (const brick of boardState.placedBricks) {
    const cells = getBrickCells3D(brick);
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
 * Check if a specific 3D cell is occupied
 */
export function isCellOccupied(
  boardState: BoardState,
  x: number,
  y: number,
  z: number,
  excludeBrickId?: string
): boolean {
  for (const brick of boardState.placedBricks) {
    if (excludeBrickId && brick.instanceId === excludeBrickId) continue;

    const cells = getBrickCells3D(brick);
    for (const [cx, cy, cz] of cells) {
      if (cx === x && cy === y && cz === z) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get all occupied voxel keys as a Set for fast lookup
 */
export function getOccupiedCellSet(
  boardState: BoardState,
  excludeBrickId?: string
): Set<string> {
  const occupied = new Set<string>();

  for (const brick of boardState.placedBricks) {
    if (excludeBrickId && brick.instanceId === excludeBrickId) continue;

    const cells = getBrickCells3D(brick);
    for (const [x, y, z] of cells) {
      occupied.add(`${x},${y},${z}`);
    }
  }

  return occupied;
}

// ============================================
// VALIDATION IMPLEMENTATIONS
// ============================================

/**
 * Check if all board squares are covered by bricks at ground level (z=0)
 * For 3D puzzles, this checks the base layer coverage
 */
const validateAllBoardSquaresCovered: ValidationFunction = (boardState) => {
  const { dimensions, blockedCells } = boardState;
  const occupiedCells = getAllOccupiedCells3D(boardState);

  // Create set of blocked cells (only considering x,y for ground level)
  const blockedSet = new Set(blockedCells.map(([x, y]) => `${x},${y}`));

  // Track which ground-level cells (z=0) are covered
  const coveredGroundCells = new Set<string>();
  for (const [key] of occupiedCells.entries()) {
    const [x, y, z] = key.split(',').map(Number);
    if (z === 0) {
      coveredGroundCells.add(`${x},${y}`);
    }
  }

  const uncoveredCells: Cell3D[] = [];

  for (let x = 0; x < dimensions.width; x++) {
    for (let y = 0; y < dimensions.height; y++) {
      const key = `${x},${y}`;
      if (!blockedSet.has(key) && !coveredGroundCells.has(key)) {
        uncoveredCells.push([x, y, 0]);
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
 * Check if any bricks overlap in 3D space.
 * Two bricks cannot occupy the same voxel (x, y, z).
 */
const validateNoBrickOverlap: ValidationFunction = (boardState) => {
  const cellMap = getAllOccupiedCells3D(boardState);
  const overlappingCells: Cell3D[] = [];

  for (const [key, bricks] of cellMap.entries()) {
    if (bricks.length > 1) {
      const [x, y, z] = key.split(',').map(Number);
      overlappingCells.push([x, y, z]);
    }
  }

  if (overlappingCells.length > 0) {
    return {
      isValid: false,
      rule: 'NO_BRICK_OVERLAP',
      message: `${overlappingCells.length} voxel(s) have overlapping bricks`,
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
 * Check if any bricks are placed outside the board boundaries (3D)
 */
const validateNoBricksOutOfBounds: ValidationFunction = (boardState) => {
  const { dimensions } = boardState;
  const outOfBoundsCells: Cell3D[] = [];

  for (const brick of boardState.placedBricks) {
    const cells = getBrickCells3D(brick);
    for (const [x, y, z] of cells) {
      if (
        x < 0 || x >= dimensions.width ||
        y < 0 || y >= dimensions.height ||
        z < 0 || z >= dimensions.depth
      ) {
        outOfBoundsCells.push([x, y, z]);
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
 * Check if bricks are placed on blocked cells (3D)
 */
const validateNoBlockedCells: ValidationFunction = (boardState) => {
  const { blockedCells } = boardState;
  const blockedSet = new Set(blockedCells.map(([x, y, z]) => `${x},${y},${z}`));
  const violatingCells: Cell3D[] = [];

  for (const brick of boardState.placedBricks) {
    const cells = getBrickCells3D(brick);
    for (const [x, y, z] of cells) {
      if (blockedSet.has(`${x},${y},${z}`)) {
        violatingCells.push([x, y, z]);
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
 * Check if any bricks exceed the board depth limit (3D)
 */
const validateNoBricksExceedDepth: ValidationFunction = (boardState) => {
  const maxAllowedZ = boardState.dimensions.depth - 1;
  const affectedCells: Cell3D[] = [];

  for (const brick of boardState.placedBricks) {
    const cells = getBrickCells3D(brick);
    for (const [x, y, z] of cells) {
      if (z > maxAllowedZ) {
        affectedCells.push([x, y, z]);
      }
    }
  }

  if (affectedCells.length > 0) {
    return {
      isValid: false,
      rule: 'NO_BRICKS_EXCEED_DEPTH',
      message: `${affectedCells.length} cell(s) exceed the board depth limit (max z-level: ${maxAllowedZ})`,
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

