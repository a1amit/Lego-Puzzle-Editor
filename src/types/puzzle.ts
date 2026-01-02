import { z } from 'zod';

// ============================================
// VIEW MODES & MOVEMENT RULES
// ============================================

/**
 * View modes determine how the puzzle is rendered
 * - 3D: Full 3D with stacking support (default)
 * - 2D: 2D grid view
 */
export const ViewModeSchema = z.enum(['3D', '2D']);
export type ViewMode = z.infer<typeof ViewModeSchema>;

/**
 * Movement rules determine how pieces can be moved
 * - FREE_PLACEMENT: Can place pieces anywhere (default)
 * - SLIDING_ONLY: Pieces can only slide in cardinal directions
 * - ADJACENT_ONLY: Pieces must be placed adjacent to existing pieces
 */
export const MovementRuleSchema = z.enum(['FREE_PLACEMENT', 'SLIDING_ONLY', 'ADJACENT_ONLY']);
export type MovementRule = z.infer<typeof MovementRuleSchema>;

// ============================================
// SHAPE DEFINITIONS
// ============================================

/**
 * A shape is defined as a list of [x, y] coordinate offsets from origin (0,0)
 * This allows us to define ANY polyomino shape generically
 */
export const ShapeDefinitionSchema = z.object({
  name: z.string(),
  /** Coordinates representing the shape, relative to origin [0,0] */
  cells: z.array(z.tuple([z.number(), z.number()])),
  /** Color for visualization */
  color: z.string().optional(),
});

export type ShapeDefinition = z.infer<typeof ShapeDefinitionSchema>;

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
  // Vertical domino (1x2)
  'domino-v': {
    name: 'domino-v',
    cells: [[0, 0], [0, 1]],
  },
  // Domino (2x1)
  'domino': {
    name: 'domino',
    cells: [[0, 0], [1, 0]],
  },
  // Tromino-I (3x1 horizontal)
  'tromino-I': {
    name: 'tromino-I',
    cells: [[0, 0], [1, 0], [2, 0]],
  },
  // Cross/Plus Pentomino (height 3, width 3)
  'plus': {
    name: 'plus',
    cells: [[1, 0], [1, 1], [1, 2], [0, 1], [2, 1]],
  },
  // Long L Pentomino (4 long + 1 tip)
  'long-L-pentomino': {
    name: 'long-L-pentomino',
    cells: [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0]],
  },
  // Corner Pentomino (3x3 L-shape)
  'corner-pentomino': {
    name: 'corner-pentomino',
    cells: [[0, 2], [1, 2], [2, 2], [2, 1], [2, 0]],
  },
  // Stretched Z Pentomino (5 cells)
  'stretched-Z-pentomino': {
    name: 'stretched-Z-pentomino',
    cells: [[1, 2], [2, 2], [1, 1], [0, 0], [1, 0]],
  },
  // U Pentomino (5 cells)
  'U-pentomino': {
    name: 'U-pentomino',
    cells: [[0, 0], [1, 0], [1, 1], [0, 2], [1, 2]],
  },
  // Vertical I-tetromino (1x4 vertical piece - for pen challenge)
  'I-tetromino-v': {
    name: 'I-tetromino-v',
    cells: [[0, 0], [0, 1], [0, 2], [0, 3]],
  },
};



// ============================================
// BRICK DEFINITIONS
// ============================================

// Create an enum of all available shape names from SHAPE_LIBRARY
export const ShapeNameSchema = z.enum([
  'T-tetromino',
  'I-tetromino',
  'L-tetromino',
  'O-tetromino',
  'S-tetromino',
  'Z-tetromino',
  'J-tetromino',
  'unit',
  'domino',
  'domino-v',
  'tromino-I',
  'plus',
  'long-L-pentomino',
  'corner-pentomino',
  'stretched-Z-pentomino',
  'U-pentomino',
  'I-tetromino-v',
] as const);

export type ShapeName = z.infer<typeof ShapeNameSchema>;

export const BrickSchema = z.object({
  id: z.string(),
  shape: ShapeNameSchema, // References SHAPE_LIBRARY shapes
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
  'MOVEMENT',
  'ROTATION',
  'PATTERN',
  'GOAL',
  'CONSTRAINT',
  'MAX_MOVES',
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

/**
 * Initial piece placement - can be:
 * 1. Reference to inventory piece: { brickId: "...", position, rotation }
 * 2. Inline piece with shape: { id, shape, color, position, rotation }
 * 3. Cell-based piece (most explicit): { id, cells: [[x,y],...], color }
 */
export const InitialPlacementSchema = z.union([
  // Reference to inventory piece
  z.object({
    brickId: z.string(),
    position: z.tuple([z.number(), z.number()]),
    rotation: z.number().default(0),
  }),
  // Inline piece definition with shape name
  z.object({
    id: z.string(),
    shape: z.string(),
    color: z.string(),
    position: z.tuple([z.number(), z.number()]),
    rotation: z.number().default(0),
  }),
  // Cell-based piece definition (most explicit - defines exactly which cells are covered)
  z.object({
    id: z.string(),
    cells: z.array(z.tuple([z.number(), z.number()])),
    color: z.string(),
  }),
]);

export type InitialPlacement = z.infer<typeof InitialPlacementSchema>;

export const BoardSchema = z.object({
  dimensions: BoardDimensionsSchema,
  /** Optional initial brick placements on the board */
  initial_state: z.array(InitialPlacementSchema).default([]),
  /** Optional blocked cells that cannot be used */
  blocked_cells: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export type Board = z.infer<typeof BoardSchema>;

// ============================================
// PUZZLE DEFINITION (MAIN CONTRACT)
// ============================================

/** Goal for slider puzzles - defines exactly which cells the target piece must cover */
export const GoalPositionSchema = z.object({
  /** ID of a single piece that must reach the goal (for Klotski) */
  targetPieceId: z.string().optional(),
  /** IDs of pieces that can reach the goal (any one of them) */
  targetPieceIds: z.array(z.string()).optional(),
  /** If true, any piece on the board can reach the goal */
  allowAnyPiece: z.boolean().optional(),
  /** 
   * Exactly which cells the piece must cover to win.
   * Example: [[1,3], [2,3], [1,4], [2,4]] means cover those 4 cells
   */
  cells: z.array(z.tuple([z.number(), z.number()])),
  /** If true, the goal area will not be rendered (useful for "secret" goals) */
  hideGoalVisualization: z.boolean().optional(),
});

export type GoalPosition = z.infer<typeof GoalPositionSchema>;

// ============================================
// TARGET PATTERN (for pattern matching puzzles)
// ============================================

/**
 * Defines a target pattern that must be matched.
 * Used for Binary encoding puzzles, RLE art, etc.
 */
export const TargetPatternSchema = z.object({
  /** 
   * 2D grid of expected values. rows[y][x] = value
   * Value is typically a number (0, 1) or string that maps to colors
   */
  rows: z.array(z.array(z.union([z.number(), z.string()]))),
  /**
   * Maps pattern values to expected colors
   * Example: { "0": "#1a1a1a", "1": "#ffffff" }
   */
  color_mapping: z.record(z.string(), z.string()),
  /**
   * Optional: Allow partial matches (some cells can be empty)
   */
  allow_empty_cells: z.boolean().optional(),
});

export type TargetPattern = z.infer<typeof TargetPatternSchema>;

export const PuzzleDefinitionSchema = z.object({
  puzzle_id: z.string(),
  title: z.string(),
  description: z.string(),
  /** View mode determines how the puzzle is rendered (3D or 2D) */
  viewMode: ViewModeSchema.default('3D'),
  board: BoardSchema,
  inventory: z.array(BrickSchema),
  /** Goal position for slider puzzles */
  goal: GoalPositionSchema.optional(),
  /** Target pattern for pattern-matching puzzles (Binary, RLE, etc.) */
  target_pattern: TargetPatternSchema.optional(),
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
  position: { x: number; y: number };
  rotation: number; // 0, 90, 180, 270 degrees
  z: number; // Vertical layer/height (0 = ground level, 1 = one brick high, etc.)
}

/** Current state of the board */
export interface BoardState {
  dimensions: BoardDimensions;
  placedBricks: PlacedBrick[];
  blockedCells: [number, number][];
}

/** Validation result */
export interface ValidationResult {
  isValid: boolean;
  rule: string;
  message: string;
  affectedCells?: [number, number][];
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
  viewMode: "3D",
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
// COLORFUL COVERAGE PUZZLE (10x6 board with varied pieces)
// ============================================

/**
 * Colorful Coverage Puzzle
 * 
 * A 10x6 board (60 cells) with 15 different colored pieces.
 * Uses a mix of tetrominoes, squares, and dominoes.
 * Total: 15 pieces × 4 cells = 60 cells (coverage)
 */
export const COLORFUL_COVERAGE_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Colorful-Coverage-01",
  title: "Rainbow Bricks",
  description: "Cover the entire board using all the colorful pieces. A challenging mix of different shapes!",
  viewMode: "3D",
  board: {
    dimensions: { width: 10, height: 6, depth: 1 },
    initial_state: []
  },
  inventory: [
    // Building piece by piece
    { shape: "domino", color: "#FE8A18", quantity: 1, id: "piece-1" },     // 2-block I-shape (horizontal) - orange
    { shape: "tromino-I", color: "#FE8A18", quantity: 1, id: "piece-2" },  // 3-block I-shape (horizontal) - orange
    { shape: "unit", color: "#C9C9C9", quantity: 3, id: "piece-3" },       // Single brick - light gray (x3)
    { shape: "tromino-I", color: "#5E5E5E", quantity: 1, id: "piece-4" },  // 3-block I-shape (can rotate to vertical) - gray
    { shape: "domino", color: "#C9C9C9", quantity: 1, id: "piece-5" },     // 2-block I-shape - light gray
    { shape: "domino", color: "#5E5E5E", quantity: 1, id: "piece-6" },     // 2-block I-shape - gray
    { shape: "unit", color: "#A5CA18", quantity: 1, id: "piece-7" },       // Single brick - light green
    { shape: "domino", color: "#A5CA18", quantity: 2, id: "piece-8" },     // 2-block I-shape - light green (x2)
    { shape: "plus", color: "#6B5344", quantity: 1, id: "piece-9" },       // Cross shape - brown
    { shape: "domino", color: "#0055BF", quantity: 2, id: "piece-10" },    // 2-block I-shape - deep blue (x2)
    { shape: "unit", color: "#0055BF", quantity: 1, id: "piece-11" },      // Single brick - deep blue
    { shape: "domino", color: "#E4CD9E", quantity: 2, id: "piece-12" },    // 2-block I-shape - mustard/tan (x2)
    { shape: "unit", color: "#E4CD9E", quantity: 1, id: "piece-13" },      // Single brick - mustard/tan
    { shape: "domino", color: "#FFFFFF", quantity: 2, id: "piece-14" },    // 2-block I-shape - white (x2)
    { shape: "unit", color: "#FFFFFF", quantity: 1, id: "piece-15" },      // Single brick - white
    { shape: "long-L-pentomino", color: "#287F46", quantity: 1, id: "piece-16" }, // Long L-shape (5 cells) - green
    { shape: "corner-pentomino", color: "#F5CD2F", quantity: 1, id: "piece-17" }, // Corner L-shape (5 cells) - yellow
    { shape: "stretched-Z-pentomino", color: "#D01012", quantity: 1, id: "piece-18" }, // Z-shape (5 cells) - red
    { shape: "U-pentomino", color: "#05131D", quantity: 1, id: "piece-19" }, // U-shape (5 cells) - black
  ],
  validation_rules: [
    { type: "COVERAGE", rule: "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "hard",
    tags: ["tetromino", "coverage", "colorful", "mixed"]
  }
};

// ============================================
// BLANK PUZZLE TEMPLATE (For creating from scratch)
// ============================================

export const BLANK_PUZZLE: PuzzleDefinition = {
  puzzle_id: "new-puzzle",
  title: "My New Puzzle",
  description: "Describe your puzzle here",
  viewMode: "3D",
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
  viewMode: "3D",
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

// ============================================
// 2D SLIDER PUZZLE (Klotski-style)
// ============================================

/**
 * Classic Klotski Slider Puzzle
 * 
 * Board layout (4 columns x 5 rows):
 * 
 *    Col:  0    1    2    3
 *        +----+----+----+----+
 * Row 0  | V1 |  GOAL   | V2 |
 *        |    |  (red)  |    |
 * Row 1  |    |         |    |
 *        +----+---------+----+
 * Row 2  | V3 |   H1    | V4 |
 *        |    | (orange)|    |
 * Row 3  |    | S1 | S2 |    |
 *        +----+----+----+----+
 * Row 4  |    |  GOAL   |    |  <- Goal area (where red must go)
 *        +----+----+----+----+
 * 
 * Pieces defined by EXACTLY which cells they cover!
 */
export const SLIDER_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Slider-01",
  title: "Klotski Classic",
  description: "Slide the blocks to move the RED 2×2 piece to the bottom center exit. Click a piece, then click where to slide it.",
  viewMode: "2D",
  board: {
    dimensions: { width: 4, height: 5, depth: 1 },
    // Cell-based piece definitions - explicitly list which cells each piece covers!
    initial_state: [
      // Red 2x2 goal block - Located in rows 1 and 2, columns 0 and 1
      { id: "goal", cells: [[0, 1], [1, 1], [0, 2], [1, 2]], color: "#D01012" },

      // Blue vertical blocks
      { id: "v1", cells: [[3, 0], [3, 1]], color: "#0055BF" },  // Top Right
      { id: "v2", cells: [[2, 2], [2, 3]], color: "#0055BF" },  // Middle Right (column 2)
      { id: "v3", cells: [[3, 2], [3, 3]], color: "#0055BF" },  // Bottom Right (column 3)

      // Yellow small blocks - Top Row
      { id: "s1", cells: [[0, 0]], color: "#F5C300" },
      { id: "s2", cells: [[1, 0]], color: "#F5C300" },

      // Yellow small blocks - Row 3 (below the Red block)
      { id: "s3", cells: [[0, 3]], color: "#F5C300" },
      { id: "s4", cells: [[1, 3]], color: "#F5C300" },

      // Yellow small blocks - Bottom Row (Row 4 is completely filled)
      { id: "s5", cells: [[0, 4]], color: "#F5C300" },
      { id: "s6", cells: [[1, 4]], color: "#F5C300" },
      { id: "s7", cells: [[2, 4]], color: "#F5C300" },
      { id: "s8", cells: [[3, 4]], color: "#F5C300" },
    ]
  },
  // Empty inventory - all pieces are pre-placed for slider puzzles
  inventory: [],
  // Goal: Red block must cover cells [1,3], [2,3], [1,4], [2,4] (bottom center)
  goal: {
    targetPieceId: "goal",
    cells: [[1, 3], [2, 3], [1, 4], [2, 4]],
  },
  validation_rules: [
    { type: "GOAL", rule: "GOAL_REACHED" },
    { type: "MOVEMENT", rule: "SLIDING_ONLY" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "CONSTRAINT", rule: "NO_BRICK_REMOVAL" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "hard",
    tags: ["slider", "2D", "klotski"]
  }
};
//klotski-red-donkey
export const KLOTSKI_RED_DONKEY: PuzzleDefinition = {
  "puzzle_id": "klotski-red-donkey",
  "title": "Klotski: Red Donkey",
  "description": "The classic configuration (Huarong Dao). Help Cao Cao (Red Block) escape through the bottom exit!",
  "viewMode": "2D",

  "board": {
    "dimensions": { "width": 4, "height": 5, "depth": 1 },
    "initial_state": [
      { "id": "cao-cao", "cells": [[1, 0], [2, 0], [1, 1], [2, 1]], "color": "#D01012" },
      { "id": "v1", "cells": [[0, 0], [0, 1]], "color": "#0055BF" },
      { "id": "v2", "cells": [[3, 0], [3, 1]], "color": "#0055BF" },
      { "id": "v3", "cells": [[0, 2], [0, 3]], "color": "#0055BF" },
      { "id": "v4", "cells": [[3, 2], [3, 3]], "color": "#0055BF" },
      { "id": "h1", "cells": [[1, 2], [2, 2]], "color": "#0055BF" },
      { "id": "s1", "cells": [[1, 3]], "color": "#F5C300" },
      { "id": "s2", "cells": [[2, 3]], "color": "#F5C300" },
      { "id": "s3", "cells": [[0, 4]], "color": "#F5C300" },
      { "id": "s4", "cells": [[3, 4]], "color": "#F5C300" }
    ]
  },

  "inventory": [],

  "goal": {
    "targetPieceId": "cao-cao",
    "cells": [[1, 3], [2, 3], [1, 4], [2, 4]]
  },

  "validation_rules": [
    { "type": "GOAL", "rule": "GOAL_REACHED" },
    { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
    { "type": "ROTATION", "rule": "NO_ROTATION" },
    { "type": "CONSTRAINT", "rule": "NO_BRICK_REMOVAL" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ],

  "metadata": {
    "author": "Traditional",
    "difficulty": "expert",
    "tags": ["slider", "2D", "klotski", "classic"]
  }
};

export const KLOTSKI_CROSSWAY: PuzzleDefinition =
{
  "puzzle_id": "klotski-crossway",
  "title": "Klotski: Crossway",
  "description": "A tricky variation. Navigate the crossway of blocks.",
  "viewMode": "2D",

  "board": {
    "dimensions": { "width": 4, "height": 5, "depth": 1 },
    "initial_state": [
      { "id": "b1", "cells": [[1, 0], [2, 0], [1, 1], [2, 1]], "color": "#D01012" },
      { "id": "v1", "cells": [[0, 0], [0, 1]], "color": "#0055BF" },
      { "id": "v2", "cells": [[3, 0], [3, 1]], "color": "#0055BF" },
      { "id": "h1", "cells": [[0, 2], [1, 2]], "color": "#0055BF" },
      { "id": "h2", "cells": [[2, 2], [3, 2]], "color": "#0055BF" },
      { "id": "s1", "cells": [[0, 3]], "color": "#F5C300" },
      { "id": "s2", "cells": [[1, 3]], "color": "#F5C300" },
      { "id": "s3", "cells": [[2, 3]], "color": "#F5C300" },
      { "id": "s4", "cells": [[3, 3]], "color": "#F5C300" },
      { "id": "s5", "cells": [[0, 4]], "color": "#F5C300" },
      { "id": "s6", "cells": [[3, 4]], "color": "#F5C300" }
    ]
  },

  "inventory": [],

  "goal": {
    "targetPieceId": "b1",
    "cells": [[1, 3], [2, 3], [1, 4], [2, 4]]
  },

  "validation_rules": [
    { "type": "GOAL", "rule": "GOAL_REACHED" },
    { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
    { "type": "ROTATION", "rule": "NO_ROTATION" },
    { "type": "CONSTRAINT", "rule": "NO_BRICK_REMOVAL" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ],

  "metadata": {
    "author": "Variant",
    "difficulty": "medium",
    "tags": ["slider", "2D", "klotski"]
  }
};

// ============================================
// 2D SIMPLE GRID PUZZLE
// ============================================

export const GRID_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Grid-01",
  title: "Grid Fill",
  description: "Fill the 4x4 grid using the available pieces. A simple 2D puzzle to demonstrate the grid view mode.",
  viewMode: "2D",
  board: {
    dimensions: { width: 4, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "T-tetromino", color: "#D01012", quantity: 4, id: "t1" },
    { shape: "L-tetromino", color: "#0055BF", quantity: 1, id: "l1" },
    { shape: "S-tetromino", color: "#287F46", quantity: 1, id: "s1" },
    { shape: "domino", color: "#F5CD2F", quantity: 2, id: "d1" }
  ],
  validation_rules: [
    { type: "COVERAGE", rule: "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["grid", "2D", "coverage"]
  }
};

// ============================================
// BINARY SAFE PUZZLE (Pattern Matching)
// ============================================

/**
 * Binary Safe Puzzle - Decode ASCII from binary
 * 
 * The player must place black (0) and white (1) bricks
 * to spell out "HI" in ASCII:
 * 
 * Row 0: 01001000 = 'H' (72)
 * Row 1: 01001001 = 'I' (73)
 */
export const BINARY_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Binary-01",
  title: "Binary Safe",
  description: "Crack the code! Place black (0) and white (1) bricks to spell the secret password in binary ASCII. Hint: The password is a 2-letter greeting.",
  viewMode: "2D",
  board: {
    dimensions: { width: 8, height: 2, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "unit", color: "#1a1a1a", quantity: 11, id: "bit-0" },  // Black = 0
    { shape: "unit", color: "#ffffff", quantity: 5, id: "bit-1" },   // White = 1
  ],
  target_pattern: {
    // 'H' = 01001000, 'I' = 01001001
    rows: [
      [0, 1, 0, 0, 1, 0, 0, 0],  // H = 72
      [0, 1, 0, 0, 1, 0, 0, 1],  // I = 73
    ],
    color_mapping: {
      "0": "#1a1a1a",  // Black
      "1": "#ffffff",  // White
    },
  },
  validation_rules: [
    { type: "PATTERN", rule: "PATTERN_MATCH" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "medium",
    tags: ["binary", "2D", "ASCII", "pattern", "encoding"]
  }
};

export const BINARY_PUZZLE_SOS: PuzzleDefinition = {
  puzzle_id: "Binary-Deserted-Island-01",
  title: "Binary Safe: Deserted Island",
  description: "You're stranded on a deserted island and need to call for help! A rescue plane that only understands binary is flying overhead — spell out your distress signal!",
  viewMode: "2D",
  board: {
    dimensions: { width: 8, height: 3, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "unit", color: "#1a1a1a", quantity: 11, id: "bit-0" },  // Black = 0
    { shape: "unit", color: "#ffffff", quantity: 13, id: "bit-1" },  // White = 1
  ],
  target_pattern: {
    // 'S' = 01010011 (83)
    // 'O' = 01001111 (79)
    rows: [
      [0, 1, 0, 1, 0, 0, 1, 1],  // S
      [0, 1, 0, 0, 1, 1, 1, 1],  // O
      [0, 1, 0, 1, 0, 0, 1, 1],  // S
    ],
    color_mapping: {
      "0": "#1a1a1a",  // Black
      "1": "#ffffff",  // White
    },
  },
  validation_rules: [
    { type: "PATTERN", rule: "PATTERN_MATCH" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["binary", "2D", "ASCII", "pattern"]
  }
};

export const BINARY_PUZZLE_BUILDING_BLOCKS: PuzzleDefinition = {
  puzzle_id: "Binary-Building-Blocks-01",
  title: "Binary Safe: Building Blocks",
  description: "Countless pieces that snap into place, creating anything imagination allows. We break apart yet never truly break. Spell our name in binary to unlock the safe!",
  viewMode: "2D",
  board: {
    dimensions: { width: 8, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "unit", color: "#1a1a1a", quantity: 17, id: "bit-0" },  // Black = 0
    { shape: "unit", color: "#ffffff", quantity: 15, id: "bit-1" },  // White = 1
  ],
  target_pattern: {
    // 'L' = 01001100 (76)
    // 'E' = 01000101 (69)
    // 'G' = 01000111 (71)
    // 'O' = 01001111 (79)
    rows: [
      [0, 1, 0, 0, 1, 1, 0, 0],  // L
      [0, 1, 0, 0, 0, 1, 0, 1],  // E
      [0, 1, 0, 0, 0, 1, 1, 1],  // G
      [0, 1, 0, 0, 1, 1, 1, 1],  // O
    ],
    color_mapping: {
      "0": "#1a1a1a",  // Black
      "1": "#ffffff",  // White
    },
  },
  validation_rules: [
    { type: "PATTERN", rule: "PATTERN_MATCH" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "medium",
    tags: ["binary", "2D", "ASCII", "pattern"]
  }
};

/**
 * Pen Challenge Puzzle
 * 
 * The classic brain teaser: Pens (vertical I-shaped bricks) are arranged
 * in groups of 1, 2, 3, 4 (left to right). Move exactly ONE pen (blue) to 
 * the empty space next to the pink pen, creating the reversed order 4-3-2-1.
 * 
 * Layout: Pink(1) | gap | Orange(2) | gap | Green(3) | gap | Blue(4)
 * Goal: Move one blue pen to column 1 (next to pink)
 * 
 * Uses MAX_MOVES validation with params.maxMoves = 1
 */
export const PEN_CHALLENGE_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Pen-Challenge-01",
  title: "Pen Challenge",
  description: "The pens show 1-2-3-4. Move exactly ONE pen to reverse the order to 4-3-2-1! Move the blue pen next to the pink pen.",
  viewMode: "2D",
  board: {
    dimensions: { width: 13, height: 4, depth: 1 },
    initial_state: [
      // Group "1": 1 pink pen (column 0)
      { id: "pen-1", cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: "#E91E63" },

      // Column 1 is EMPTY - this is the goal position for one blue pen!

      // Group "2": 2 orange pens (columns 2-3, shifted left by 1)
      { id: "pen-2", cells: [[2, 0], [2, 1], [2, 2], [2, 3]], color: "#FF9800" },
      { id: "pen-3", cells: [[3, 0], [3, 1], [3, 2], [3, 3]], color: "#FF9800" },

      // Column 4 is empty (gap)

      // Group "3": 3 green pens (columns 5-7, shifted left by 1)
      { id: "pen-4", cells: [[5, 0], [5, 1], [5, 2], [5, 3]], color: "#4CAF50" },
      { id: "pen-5", cells: [[6, 0], [6, 1], [6, 2], [6, 3]], color: "#4CAF50" },
      { id: "pen-6", cells: [[7, 0], [7, 1], [7, 2], [7, 3]], color: "#4CAF50" },

      // Column 8 is empty (gap)

      // Group "4": 4 blue pens (columns 9-12, shifted left by 1)
      { id: "pen-7", cells: [[9, 0], [9, 1], [9, 2], [9, 3]], color: "#2196F3" },
      { id: "pen-8", cells: [[10, 0], [10, 1], [10, 2], [10, 3]], color: "#2196F3" },
      { id: "pen-9", cells: [[11, 0], [11, 1], [11, 2], [11, 3]], color: "#2196F3" },
      { id: "pen-10", cells: [[12, 0], [12, 1], [12, 2], [12, 3]], color: "#2196F3" },
    ]
  },
  inventory: [],
  // Goal: Only pen-9 can be placed at column 1 (next to pink) to win
  // This uses targetPieceIds to specify exactly which piece(s) can complete the goal
  goal: {
    targetPieceIds: ["pen-9"], // Only pen-9 can complete the goal
    cells: [[1, 0], [1, 1], [1, 2], [1, 3]], // Column 1, all 4 rows
    hideGoalVisualization: true,
  },
  validation_rules: [
    { type: "MAX_MOVES", rule: "MAX_MOVES", params: { maxMoves: 1 } },
    { type: "GOAL", rule: "GOAL_REACHED" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "CONSTRAINT", rule: "NO_BRICK_REMOVAL" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["brain-teaser", "2D", "visual-puzzle", "pen-challenge"]
  }
};

