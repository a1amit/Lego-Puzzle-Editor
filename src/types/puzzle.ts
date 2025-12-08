import { z } from 'zod';

// ============================================
// VIEW MODES & MOVEMENT RULES
// ============================================

/**
 * View modes determine how the puzzle is rendered
 * - 3D_ISOMETRIC: Full 3D with stacking support (default)
 * - 2D_TOP_DOWN: 2D flat view, top-down
 * - 2D_GRID: Simple grid view
 */
export const ViewModeSchema = z.enum(['3D_ISOMETRIC', '2D_TOP_DOWN', '2D_GRID']);
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
  'MOVEMENT',
  'ROTATION',
  'GOAL',
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
  /** ID of the piece that must reach the goal */
  targetPieceId: z.string(),
  /** 
   * Exactly which cells the piece must cover to win.
   * Example: [[1,3], [2,3], [1,4], [2,4]] means cover those 4 cells
   */
  cells: z.array(z.tuple([z.number(), z.number()])),
});

export type GoalPosition = z.infer<typeof GoalPositionSchema>;

export const PuzzleDefinitionSchema = z.object({
  puzzle_id: z.string(),
  title: z.string(),
  description: z.string(),
  /** View mode determines how the puzzle is rendered (3D or 2D) */
  viewMode: ViewModeSchema.default('3D_ISOMETRIC'),
  board: BoardSchema,
  inventory: z.array(BrickSchema),
  /** Goal position for slider puzzles */
  goal: GoalPositionSchema.optional(),
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
  viewMode: "3D_ISOMETRIC",
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
  viewMode: "3D_ISOMETRIC",
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
  viewMode: "3D_ISOMETRIC",
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
  viewMode: "2D_TOP_DOWN",
  board: {
    dimensions: { width: 4, height: 5, depth: 1 },
    // Cell-based piece definitions - explicitly list which cells each piece covers!
    initial_state: [
      // Red 2x2 goal block - Located in rows 1 and 2, columns 0 and 1
      { id: "goal", cells: [[0,1], [1,1], [0,2], [1,2]], color: "#D01012" },
  
      // Blue vertical blocks
      { id: "v1", cells: [[3,0], [3,1]], color: "#0055BF" },  // Top Right
      { id: "v2", cells: [[2,2], [2,3]], color: "#0055BF" },  // Middle Right (column 2)
      { id: "v3", cells: [[3,2], [3,3]], color: "#0055BF" },  // Bottom Right (column 3)
  
      // Yellow small blocks - Top Row
      { id: "s1", cells: [[0,0]], color: "#F5C300" },
      { id: "s2", cells: [[1,0]], color: "#F5C300" },
  
      // Yellow small blocks - Row 3 (below the Red block)
      { id: "s3", cells: [[0,3]], color: "#F5C300" },
      { id: "s4", cells: [[1,3]], color: "#F5C300" },
  
      // Yellow small blocks - Bottom Row (Row 4 is completely filled)
      { id: "s5", cells: [[0,4]], color: "#F5C300" },
      { id: "s6", cells: [[1,4]], color: "#F5C300" },
      { id: "s7", cells: [[2,4]], color: "#F5C300" },
      { id: "s8", cells: [[3,4]], color: "#F5C300" },
    ]
  },
  // Empty inventory - all pieces are pre-placed for slider puzzles
  inventory: [],
  // Goal: Red block must cover cells [1,3], [2,3], [1,4], [2,4] (bottom center)
  goal: {
    targetPieceId: "goal",
    cells: [[1,3], [2,3], [1,4], [2,4]],
  },
  validation_rules: [
    { type: "GOAL", rule: "GOAL_REACHED" },
    { type: "MOVEMENT", rule: "SLIDING_ONLY" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "hard",
    tags: ["slider", "2D", "klotski"]
  }
};

// ============================================
// 2D SIMPLE GRID PUZZLE
// ============================================

export const GRID_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Grid-01",
  title: "Grid Fill",
  description: "Fill the 4x4 grid using the available pieces. A simple 2D puzzle to demonstrate the grid view mode.",
  viewMode: "2D_GRID",
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

