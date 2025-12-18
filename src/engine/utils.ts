/**
 * Pure Utility Functions for Puzzle Engine
 * 
 * These functions are completely decoupled from any rendering library.
 * They work purely with coordinates and mathematical operations.
 */

import type { Coordinate2D, PlacedPiece, EngineBoard, BoardDimensions } from './types';
import { SHAPE_LIBRARY, type ShapeDefinition } from '../types/puzzle';

// ============================================
// SHAPE TRANSFORMATION UTILITIES
// ============================================

/**
 * Rotate shape cells by given degrees (0, 90, 180, 270)
 * Rotation is clockwise around the origin
 */
export function rotateShape(cells: Coordinate2D[], rotation: number): Coordinate2D[] {
  const steps = Math.floor((rotation % 360) / 90);
  let rotated = [...cells];

  for (let i = 0; i < steps; i++) {
    rotated = rotated.map(([x, y]) => [y, -x] as Coordinate2D);
  }

  // Normalize to positive coordinates
  const minX = Math.min(...rotated.map(([x]) => x));
  const minY = Math.min(...rotated.map(([, y]) => y));

  return rotated.map(([x, y]) => [x - minX, y - minY] as Coordinate2D);
}

/**
 * Get all cells occupied by a placed piece at its current position and rotation
 */
export function getPieceCells(
  piece: PlacedPiece,
  shapeLibrary: Record<string, ShapeDefinition> = SHAPE_LIBRARY
): Coordinate2D[] {
  const shape = shapeLibrary[piece.shape];
  if (!shape) {
    console.warn(`Unknown shape: ${piece.shape}`);
    return [];
  }

  const rotatedCells = rotateShape(shape.cells, piece.rotation);

  return rotatedCells.map(([dx, dy]) => [
    piece.position.x + dx,
    piece.position.y + dy,
  ] as Coordinate2D);
}

/**
 * Normalize shape cells to start from origin (0,0)
 */
export function normalizeShape(cells: Coordinate2D[]): Coordinate2D[] {
  if (cells.length === 0) return [];

  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));

  return cells.map(([x, y]) => [x - minX, y - minY] as Coordinate2D);
}

/**
 * Get shape bounding box
 */
export function getShapeBounds(cells: Coordinate2D[]): { width: number; height: number } {
  if (cells.length === 0) return { width: 0, height: 0 };

  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);

  return {
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
}

// ============================================
// BOARD CELL UTILITIES
// ============================================

/**
 * Get all cells occupied by all placed pieces
 * Returns a map of "x,y" -> pieces at that position (across all z-levels)
 */
export function getAllOccupiedCells(board: EngineBoard): Map<string, PlacedPiece[]> {
  const cellMap = new Map<string, PlacedPiece[]>();

  for (const piece of board.placedPieces) {
    const cells = getPieceCells(piece);
    for (const [x, y] of cells) {
      const key = `${x},${y}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, []);
      }
      cellMap.get(key)!.push(piece);
    }
  }

  return cellMap;
}

/**
 * Get cells occupied at a specific z-level
 */
export function getOccupiedCellsAtZ(board: EngineBoard, z: number): Map<string, PlacedPiece[]> {
  const cellMap = new Map<string, PlacedPiece[]>();

  for (const piece of board.placedPieces) {
    if (piece.position.z !== z) continue;

    const cells = getPieceCells(piece);
    for (const [x, y] of cells) {
      const key = `${x},${y}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, []);
      }
      cellMap.get(key)!.push(piece);
    }
  }

  return cellMap;
}

/**
 * Check if a position is within board bounds
 */
export function isWithinBounds(
  x: number,
  y: number,
  dimensions: BoardDimensions
): boolean {
  return x >= 0 && x < dimensions.width && y >= 0 && y < dimensions.height;
}

/**
 * Check if all piece cells would be within bounds
 */
export function arePieceCellsWithinBounds(
  cells: Coordinate2D[],
  dimensions: BoardDimensions
): boolean {
  return cells.every(([x, y]) => isWithinBounds(x, y, dimensions));
}

// ============================================
// Z-LEVEL (STACKING) UTILITIES
// ============================================

/**
 * Calculate the z-level for placing a piece at given cells
 * Returns the highest existing z-level at those cells + 1
 */
export function calculateZLevel(
  board: EngineBoard,
  cells: Coordinate2D[],
  excludeInstanceId?: string
): number {
  let maxZ = -1;

  for (const piece of board.placedPieces) {
    if (excludeInstanceId && piece.instanceId === excludeInstanceId) continue;

    const pieceCells = getPieceCells(piece);
    const pieceCellSet = new Set(pieceCells.map(([x, y]) => `${x},${y}`));

    for (const [x, y] of cells) {
      if (pieceCellSet.has(`${x},${y}`)) {
        maxZ = Math.max(maxZ, piece.position.z);
      }
    }
  }

  return maxZ + 1;
}

/**
 * Find all pieces stacked on top of a given piece
 */
export function findPiecesStackedOnTop(
  board: EngineBoard,
  targetPiece: PlacedPiece,
  excludeInstanceIds: Set<string> = new Set()
): Set<string> {
  const stackedIds = new Set<string>();
  const targetCells = getPieceCells(targetPiece);
  const targetCellSet = new Set(targetCells.map(([x, y]) => `${x},${y}`));
  const targetZ = targetPiece.position.z;

  for (const piece of board.placedPieces) {
    if (excludeInstanceIds.has(piece.instanceId) || piece.instanceId === targetPiece.instanceId) {
      continue;
    }

    if (piece.position.z <= targetZ) continue;

    const pieceCells = getPieceCells(piece);
    const hasOverlap = pieceCells.some(([x, y]) => targetCellSet.has(`${x},${y}`));

    if (hasOverlap) {
      stackedIds.add(piece.instanceId);

      // Recursively find pieces stacked on this one
      const nestedStacked = findPiecesStackedOnTop(
        board,
        piece,
        new Set([...excludeInstanceIds, ...stackedIds])
      );
      nestedStacked.forEach(id => stackedIds.add(id));
    }
  }

  return stackedIds;
}

// ============================================
// COLLISION DETECTION
// ============================================

/**
 * Check if placing cells at a given z-level would overlap with existing pieces
 */
export function wouldOverlapAtZ(
  board: EngineBoard,
  cells: Coordinate2D[],
  z: number,
  excludeInstanceId?: string
): boolean {
  const occupiedAtZ = getOccupiedCellsAtZ(board, z);

  for (const [x, y] of cells) {
    const key = `${x},${y}`;
    const piecesAtCell = occupiedAtZ.get(key);

    if (piecesAtCell) {
      // Check if any of the pieces are not the excluded one
      if (piecesAtCell.some(p => p.instanceId !== excludeInstanceId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if cells contain any blocked positions
 */
export function containsBlockedCells(
  cells: Coordinate2D[],
  blockedCells: Coordinate2D[]
): boolean {
  const blockedSet = new Set(blockedCells.map(([x, y]) => `${x},${y}`));
  return cells.some(([x, y]) => blockedSet.has(`${x},${y}`));
}

// ============================================
// SLIDING PUZZLE UTILITIES
// ============================================

/**
 * Check if a piece can slide in a direction (for sliding puzzles)
 * Returns the maximum distance it can slide
 */
export function getSlideDistance(
  board: EngineBoard,
  piece: PlacedPiece,
  direction: 'up' | 'down' | 'left' | 'right'
): number {
  const pieceCells = getPieceCells(piece);
  const occupiedCells = getAllOccupiedCells(board);

  // Build set of cells that block movement
  const blockedCellSet = new Set<string>();

  // Add blocked cells from board
  for (const [bx, by] of board.blockedCells) {
    blockedCellSet.add(`${bx},${by}`);
  }

  // Add cells occupied by OTHER pieces (not the current one)
  for (const [key, pieces] of occupiedCells) {
    // Skip cells that are only occupied by the current piece
    const otherPiecesAtCell = pieces.filter(p => p.instanceId !== piece.instanceId);
    if (otherPiecesAtCell.length > 0) {
      blockedCellSet.add(key);
    }
  }

  const { width, height } = board.dimensions;
  let maxDistance = 0;

  const dx = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
  const dy = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;

  // Check each distance increment
  for (let dist = 1; dist <= Math.max(width, height); dist++) {
    const movedCells = pieceCells.map(([x, y]) => [x + dx * dist, y + dy * dist] as Coordinate2D);

    // Check bounds
    if (!arePieceCellsWithinBounds(movedCells, board.dimensions)) {
      break;
    }

    // Check collisions with blocked cells or other pieces
    const collision = movedCells.some(([x, y]) => blockedCellSet.has(`${x},${y}`));
    if (collision) {
      break;
    }

    maxDistance = dist;
  }

  return maxDistance;
}

/**
 * Get all valid slide destinations for a piece
 */
export function getValidSlideDestinations(
  board: EngineBoard,
  piece: PlacedPiece
): Coordinate2D[] {
  const destinations: Coordinate2D[] = [];
  const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];

  for (const dir of directions) {
    const maxDist = getSlideDistance(board, piece, dir);

    for (let dist = 1; dist <= maxDist; dist++) {
      const dx = dir === 'right' ? dist : dir === 'left' ? -dist : 0;
      const dy = dir === 'down' ? dist : dir === 'up' ? -dist : 0;

      destinations.push([piece.position.x + dx, piece.position.y + dy]);
    }
  }

  return destinations;
}

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a unique instance ID for a placed piece
 */
export function generateInstanceId(pieceId: string): string {
  return `${pieceId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

