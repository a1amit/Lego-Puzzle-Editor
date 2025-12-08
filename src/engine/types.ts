/**
 * View-Agnostic Puzzle Engine Types
 * 
 * These types are used by the puzzle engine and are completely decoupled
 * from any rendering library (Three.js, DOM, etc.).
 * 
 * Coordinates are always 3D {x, y, z} - for 2D puzzles, z is simply locked to 0.
 */

// ============================================
// COORDINATE SYSTEM
// ============================================

/** 3D coordinate - for 2D puzzles, z is locked to 0 */
export interface Coordinate3D {
  x: number;
  y: number;
  z: number;
}

/** 2D coordinate (convenience type for shapes) */
export type Coordinate2D = [number, number];

// ============================================
// VIEW MODES
// ============================================

export const ViewModes = [
  '3D_ISOMETRIC',    // Full 3D with stacking support
  '2D_TOP_DOWN',     // 2D flat view, top-down
  '2D_GRID',         // Simple grid view
] as const;

export type ViewMode = typeof ViewModes[number];

// ============================================
// MOVEMENT RULES
// ============================================

export const MovementRules = [
  'FREE_PLACEMENT',  // Can place pieces anywhere on the board
  'SLIDING_ONLY',    // Pieces can only slide (must touch other pieces or edge)
  'ADJACENT_ONLY',   // Pieces must be placed adjacent to existing pieces
] as const;

export type MovementRule = typeof MovementRules[number];

// ============================================
// ENGINE STATE TYPES
// ============================================

/** A piece in the puzzle (from inventory definition) */
export interface PuzzlePiece {
  id: string;
  shape: string;
  color: string;
  initialPosition?: Coordinate3D;
}

/** A piece that has been placed on the board */
export interface PlacedPiece {
  id: string;           // Reference to inventory piece ID
  instanceId: string;   // Unique instance identifier
  shape: string;
  color: string;
  position: Coordinate3D;
  rotation: number;     // 0, 90, 180, 270 degrees
}

/** Board dimensions */
export interface BoardDimensions {
  width: number;
  height: number;
  depth: number;  // For 2D puzzles, depth is 1
}

/** Current state of the board */
export interface EngineBoard {
  dimensions: BoardDimensions;
  placedPieces: PlacedPiece[];
  blockedCells: Coordinate2D[];
}

/** Inventory state - tracks remaining pieces */
export type InventoryState = Map<string, number>;

/** Engine validation result */
export interface EngineValidationResult {
  isValid: boolean;
  rule: string;
  message: string;
  affectedCells?: Coordinate2D[];
}

/** Complete engine state */
export interface EngineState {
  board: EngineBoard;
  inventory: InventoryState;
  selectedPieceId: string | null;
  previewRotation: number;
  hoveredCell: { x: number; y: number } | null;
  validationResults: EngineValidationResult[];
  isComplete: boolean;
}

// ============================================
// ENGINE ACTIONS
// ============================================

export interface EngineActions {
  // Piece manipulation
  placePiece: (pieceId: string, position: Coordinate3D, rotation?: number) => boolean;
  removePiece: (instanceId: string) => void;
  movePiece: (instanceId: string, destination: Coordinate3D) => boolean;
  rotatePiece: (instanceId: string) => void;
  
  // Selection
  selectPiece: (pieceId: string | null) => void;
  rotatePreview: () => void;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  
  // Validation
  validateBoard: () => EngineValidationResult[];
  
  // Reset
  resetBoard: () => void;
}

// ============================================
// ENGINE CONFIGURATION
// ============================================

export interface EngineConfig {
  viewMode: ViewMode;
  movementRule: MovementRule;
  allowStacking: boolean;  // Derived from depth > 1
  rotationEnabled: boolean;  // Derived from NO_ROTATION rule
}

// ============================================
// SHAPE UTILITIES (Pure functions)
// ============================================

export interface ShapeUtils {
  rotateShape: (cells: Coordinate2D[], rotation: number) => Coordinate2D[];
  getPieceCells: (piece: PlacedPiece) => Coordinate2D[];
  normalizeShape: (cells: Coordinate2D[]) => Coordinate2D[];
}

