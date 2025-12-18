/**
 * View-Agnostic Puzzle Engine
 * 
 * This module provides a complete puzzle engine that is decoupled from
 * any rendering library. It can drive 2D, 3D, or text-based puzzle UIs.
 */

// Types
export type {
  Coordinate2D,
  Coordinate3D,
  ViewMode,
  MovementRule,
  PuzzlePiece,
  PlacedPiece,
  BoardDimensions,
  EngineBoard,
  InventoryState,
  EngineValidationResult,
  EngineState,
  EngineActions,
  EngineConfig,
  ShapeUtils,
} from './types';

export { ViewModes, MovementRules } from './types';

// Utilities
export {
  rotateShape,
  getPieceCells,
  normalizeShape,
  getShapeBounds,
  getAllOccupiedCells,
  getOccupiedCellsAtZ,
  isWithinBounds,
  arePieceCellsWithinBounds,
  calculateZLevel,
  findPiecesStackedOnTop,
  wouldOverlapAtZ,
  containsBlockedCells,
  getSlideDistance,
  getValidSlideDestinations,
  generateInstanceId,
} from './utils';

// Hook
export { usePuzzleEngine } from './usePuzzleEngine';
export type { UsePuzzleEngineReturn } from './usePuzzleEngine';

