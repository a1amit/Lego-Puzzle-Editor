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

// ============================================
// BRICK DEFINITIONS
// ============================================

// Re-export shape library and schema from their new module
export { SHAPE_LIBRARY, ShapeNameSchema } from './shapeLibrary';
export type { ShapeName } from './shapeLibrary';

// Import ShapeNameSchema for use in BrickSchema
import { ShapeNameSchema as _ShapeNameSchema } from './shapeLibrary';

export const BrickSchema = z.object({
  id: z.string(),
  shape: _ShapeNameSchema, // References SHAPE_LIBRARY shapes
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
  /**
   * If true, all pieces NOT in targetPieceId/targetPieceIds must remain in their
   * original positions for the goal to be considered reached.
   * Useful for puzzles where only one specific piece should be moved.
   */
  requireOtherPiecesStationary: z.boolean().optional(),
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

// ============================================
// NONOGRAM HINTS (for Nonogram/Picross puzzles)
// ============================================

/**
 * Defines the row and column hints for Nonogram puzzles.
 * Numbers indicate consecutive groups of filled cells.
 */
export const NonogramHintsSchema = z.object({
  /**
   * Row hints - array of arrays, each inner array contains
   * consecutive group sizes for that row (displayed on left side).
   * Example: [[1,1,1], [4], [1,1]] for 3 rows
   */
  rows: z.array(z.array(z.number())),
  /**
   * Column hints - array of arrays, each inner array contains
   * consecutive group sizes for that column (displayed on top).
   * Example: [[1], [1,1], [2,2]] for 3 columns
   */
  columns: z.array(z.array(z.number())),
});

export type NonogramHints = z.infer<typeof NonogramHintsSchema>;

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
  /** Nonogram hints for Nonogram/Picross puzzles */
  nonogram_hints: NonogramHintsSchema.optional(),
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
// BACKWARD COMPATIBILITY RE-EXPORTS
// Puzzle data constants are now in src/data/puzzles/
// ============================================

export { DEFAULT_PUZZLE, COLORFUL_COVERAGE_PUZZLE, GRID_PUZZLE } from '../data/puzzles/coverage';
export { SLIDER_PUZZLE, KLOTSKI_RED_DONKEY, KLOTSKI_CROSSWAY, PEN_CHALLENGE_PUZZLE } from '../data/puzzles/slider';
export { BINARY_PUZZLE, BINARY_PUZZLE_SOS, BINARY_PUZZLE_BUILDING_BLOCKS, NONOGRAM_PUZZLE, NONOGRAM_PUZZLE_2 } from '../data/puzzles/pattern';
export { BLANK_PUZZLE, FIT_ALL_PUZZLE } from '../data/puzzles/templates';
