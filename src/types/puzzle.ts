import { z } from 'zod';

// ============================================
// SHAPE DEFINITIONS
// ============================================

/**
 * 3D Rotation represented as Euler angles in 90-degree steps.
 * Each axis value should be 0, 1, 2, or 3 (representing 0°, 90°, 180°, 270°)
 */
export interface Rotation3D {
  x: number; // 0-3 (90° increments around X axis)
  y: number; // 0-3 (90° increments around Y axis)
  z: number; // 0-3 (90° increments around Z axis)
}

/** Helper to create a default (no rotation) Rotation3D */
export const DEFAULT_ROTATION: Rotation3D = { x: 0, y: 0, z: 0 };

/** 3D coordinate tuple [x, y, z] */
export type Cell3D = [number, number, number];

/** 2D coordinate tuple [x, y] - for backward compatibility */
export type Cell2D = [number, number];

/**
 * A shape is defined as a list of [x, y, z] coordinate offsets from origin (0,0,0)
 * This allows us to define ANY 3D voxel shape generically.
 * For legacy 2D shapes, z defaults to 0.
 */
export const ShapeDefinitionSchema = z.object({
  name: z.string(),
  /** Coordinates representing the shape, relative to origin [0,0,0] */
  cells: z.array(z.union([
    z.tuple([z.number(), z.number(), z.number()]), // 3D cells [x, y, z]
    z.tuple([z.number(), z.number()]), // Legacy 2D cells [x, y] - will default z to 0
  ])),
  /** Color for visualization */
  color: z.string().optional(),
  /** Height of this brick in units (default: 1) - used for stacking calculations */
  height: z.number().positive().default(1).optional(),
});

export type ShapeDefinition = z.infer<typeof ShapeDefinitionSchema>;

/**
 * Normalize cells to always be 3D - converts 2D cells to 3D with z=0
 */
export function normalizeCellsTo3D(cells: (Cell2D | Cell3D)[]): Cell3D[] {
  return cells.map(cell => {
    if (cell.length === 2) {
      return [cell[0], cell[1], 0] as Cell3D;
    }
    return cell as Cell3D;
  });
}

// Predefined shapes library - extensible
export const SHAPE_LIBRARY: Record<string, ShapeDefinition> = {
  'T-tetromino': {
    name: 'T-tetromino',
    cells: [[0, 0], [1, 0], [2, 0], [1, 1]],
  },
  'I-tetromino': {
    name: 'I-tetromino',
    cells: [[0, 0], [1, 0], [2, 0], [3, 0]],
  },
  'L-tetromino': {
    name: 'L-tetromino',
    cells: [[0, 0], [0, 1], [0, 2], [1, 2]],
  },
  'O-tetromino': {
    name: 'O-tetromino',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
  },
  'S-tetromino': {
    name: 'S-tetromino',
    cells: [[1, 0], [2, 0], [0, 1], [1, 1]],
  },
  'Z-tetromino': {
    name: 'Z-tetromino',
    cells: [[0, 0], [1, 0], [1, 1], [2, 1]],
  },
  'J-tetromino': {
    name: 'J-tetromino',
    cells: [[1, 0], [1, 1], [0, 2], [1, 2]],
  },
  // Single unit brick
  'unit': {
    name: 'unit',
    cells: [[0, 0]],
  },
  // Domino (2x1)
  'domino': {
    name: 'domino',
    cells: [[0, 0], [1, 0]],
  },
};

// ============================================
// BRICK DEFINITIONS
// ============================================

export const BrickSchema = z.object({
  id: z.string(),
  shape: z.string(), // References SHAPE_LIBRARY or custom shape
  color: z.string(),
  quantity: z.number().int().positive().default(1),
});

export type Brick = z.infer<typeof BrickSchema>;

// ============================================
// VALIDATION RULES
// ============================================

export const ValidationRuleTypes = [
  'COVERAGE',
  'PLACEMENT',
  'COUNT',
  'CUSTOM',
] as const;

export const ValidationRuleSchema = z.object({
  type: z.enum(ValidationRuleTypes),
  rule: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

// ============================================
// BOARD DEFINITION
// ============================================

export const BoardDimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  depth: z.number().int().positive().default(1),
});

export type BoardDimensions = z.infer<typeof BoardDimensionsSchema>;

export const BoardSchema = z.object({
  dimensions: BoardDimensionsSchema,
  /** Optional initial brick placements on the board */
  initial_state: z.array(z.object({
    brickId: z.string(),
    position: z.tuple([z.number(), z.number()]),
    rotation: z.number().default(0),
  })).default([]),
  /** Optional blocked cells that cannot be used */
  blocked_cells: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export type Board = z.infer<typeof BoardSchema>;

// ============================================
// PUZZLE DEFINITION (MAIN CONTRACT)
// ============================================

export const PuzzleDefinitionSchema = z.object({
  puzzle_id: z.string(),
  title: z.string(),
  description: z.string(),
  board: BoardSchema,
  inventory: z.array(BrickSchema),
  validation_rules: z.array(ValidationRuleSchema),
  /** Optional custom shape definitions */
  custom_shapes: z.record(z.string(), ShapeDefinitionSchema).optional(),
  /** Metadata */
  metadata: z.object({
    author: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    tags: z.array(z.string()).optional(),
    version: z.string().optional(),
  }).optional(),
});

export type PuzzleDefinition = z.infer<typeof PuzzleDefinitionSchema>;

// ============================================
// RUNTIME STATE TYPES
// ============================================

/** A placed brick on the board */
export interface PlacedBrick {
  id: string;
  instanceId: string; // Unique instance ID for this specific placement
  shape: string;
  color: string;
  position: { x: number; y: number; z: number }; // 3D position in world space
  rotation: Rotation3D; // 3D rotation (Euler angles in 90° steps)
}

/** Current state of the board */
export interface BoardState {
  dimensions: BoardDimensions;
  placedBricks: PlacedBrick[];
  blockedCells: Cell3D[]; // 3D blocked cells [x, y, z]
}

/** Validation result */
export interface ValidationResult {
  isValid: boolean;
  rule: string;
  message: string;
  affectedCells?: Cell3D[]; // 3D coordinates of affected cells
}

/** Overall puzzle state */
export interface PuzzleState {
  puzzle: PuzzleDefinition | null;
  boardState: BoardState;
  inventoryState: Map<string, number>; // brickId -> remaining count
  validationResults: ValidationResult[];
  isComplete: boolean;
  selectedBrickId: string | null;
}

// ============================================
// DEFAULT PUZZLE (T-Puzzle - Coverage)
// ============================================

export const DEFAULT_PUZZLE: PuzzleDefinition = {
  puzzle_id: "T-Puzzle-01",
  title: "T-Time",
  description: "Use all 8 'T' shaped bricks to perfectly cover the 8x4 board.",
  board: {
    dimensions: { width: 8, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "T-tetromino", color: "#D01012", quantity: 1, id: "t1" },
    { shape: "T-tetromino", color: "#0055BF", quantity: 1, id: "t2" },
    { shape: "T-tetromino", color: "#287F46", quantity: 1, id: "t3" },
    { shape: "T-tetromino", color: "#F5CD2F", quantity: 1, id: "t4" },
    { shape: "T-tetromino", color: "#FE8A18", quantity: 1, id: "t5" },
    { shape: "T-tetromino", color: "#9B5FC0", quantity: 1, id: "t6" },
    { shape: "T-tetromino", color: "#00BCD4", quantity: 1, id: "t7" },
    { shape: "T-tetromino", color: "#E91E63", quantity: 1, id: "t8" }
  ],
  validation_rules: [
    { type: "COVERAGE", rule: "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "medium",
    tags: ["tetromino", "coverage", "classic"]
  }
};

// ============================================
// BLANK PUZZLE TEMPLATE (For creating from scratch)
// ============================================

export const BLANK_PUZZLE: PuzzleDefinition = {
  puzzle_id: "new-puzzle",
  title: "My New Puzzle",
  description: "Describe your puzzle here",
  board: {
    dimensions: { width: 6, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "T-tetromino", color: "#D01012", quantity: 1, id: "piece1" }
  ],
  validation_rules: [
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "Your Name",
    difficulty: "easy",
    tags: ["custom"]
  }
};

// ============================================
// FIT ALL BRICKS PUZZLE (No coverage requirement)
// ============================================

export const FIT_ALL_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Fit-All-01",
  title: "Tetris Pack",
  description: "Fit all 7 tetromino pieces onto the 10x4 board. No overlapping allowed!",
  board: {
    dimensions: { width: 10, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "T-tetromino", color: "#9B5FC0", quantity: 1, id: "t" },
    { shape: "I-tetromino", color: "#00BCD4", quantity: 1, id: "i" },
    { shape: "L-tetromino", color: "#FE8A18", quantity: 1, id: "l" },
    { shape: "J-tetromino", color: "#0055BF", quantity: 1, id: "j" },
    { shape: "O-tetromino", color: "#F5CD2F", quantity: 1, id: "o" },
    { shape: "S-tetromino", color: "#287F46", quantity: 1, id: "s" },
    { shape: "Z-tetromino", color: "#D01012", quantity: 1, id: "z" }
  ],
  validation_rules: [
    { type: "COUNT", rule: "ALL_BRICKS_MUST_BE_USED" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["tetromino", "fit-all", "tetris"]
  }
};

