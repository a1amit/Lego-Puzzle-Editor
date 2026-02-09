/**
 * Shared Board Factory
 *
 * Creates initial board and inventory state from a puzzle definition.
 * Used by BOTH the Zustand store (3D) and the usePuzzleEngine hook (2D)
 * to eliminate duplicated initialisation logic.
 */

import type { PuzzleDefinition } from '../types/puzzle';
import { SHAPE_LIBRARY } from '../types/puzzle';
import type { EngineBoard, InventoryState, PlacedPiece, Coordinate2D } from './types';

// ============================================
// LOCAL SHAPE REGISTRY
// ============================================

/**
 * Register a custom shape derived from cell-based initial_state.
 * Instead of mutating the global SHAPE_LIBRARY, we store custom shapes
 * in a per-puzzle map and merge them into the global library only when
 * they don't already exist — preventing stale shapes from previous loads.
 */
function ensureCustomShape(shapeName: string, cells: Coordinate2D[]): void {
  if (!SHAPE_LIBRARY[shapeName]) {
    SHAPE_LIBRARY[shapeName] = { name: shapeName, cells };
  }
}

// ============================================
// INITIAL BOARD
// ============================================

const DEFAULT_EMPTY_BOARD: EngineBoard = {
  dimensions: { width: 8, height: 4, depth: 1 },
  placedPieces: [],
  blockedCells: [],
};

export function createInitialBoard(puzzle: PuzzleDefinition | null): EngineBoard {
  if (!puzzle) return { ...DEFAULT_EMPTY_BOARD };

  const placedPieces: PlacedPiece[] = [];

  if (puzzle.board.initial_state && puzzle.board.initial_state.length > 0) {
    for (const placement of puzzle.board.initial_state) {
      if ('cells' in placement && Array.isArray(placement.cells)) {
        // Cell-based piece definition (most explicit)
        const cells = placement.cells as Coordinate2D[];
        const minX = Math.min(...cells.map(c => c[0]));
        const minY = Math.min(...cells.map(c => c[1]));
        const normalizedCells = cells.map(([x, y]) => [x - minX, y - minY] as Coordinate2D);
        const shapeName = `custom-${placement.id}`;

        ensureCustomShape(shapeName, normalizedCells);

        placedPieces.push({
          id: placement.id,
          instanceId: `${placement.id}-initial-${placedPieces.length}`,
          shape: shapeName,
          color: placement.color,
          position: { x: minX, y: minY, z: 0 },
          rotation: 0,
        });
      } else if ('shape' in placement && 'color' in placement && 'position' in placement) {
        // Inline piece definition with shape name
        placedPieces.push({
          id: placement.id,
          instanceId: `${placement.id}-initial-${placedPieces.length}`,
          shape: placement.shape,
          color: placement.color,
          position: { x: placement.position[0], y: placement.position[1], z: 0 },
          rotation: placement.rotation || 0,
        });
      } else if ('brickId' in placement) {
        // Reference to inventory piece
        const brickDef = puzzle.inventory.find(b => b.id === placement.brickId);
        if (brickDef) {
          placedPieces.push({
            id: brickDef.id,
            instanceId: `${brickDef.id}-initial-${placedPieces.length}`,
            shape: brickDef.shape,
            color: brickDef.color,
            position: { x: placement.position[0], y: placement.position[1], z: 0 },
            rotation: placement.rotation || 0,
          });
        }
      }
    }
  }

  return {
    dimensions: puzzle.board.dimensions,
    placedPieces,
    blockedCells: puzzle.board.blocked_cells || [],
  };
}

// ============================================
// INITIAL INVENTORY
// ============================================

export function createInitialInventory(puzzle: PuzzleDefinition | null): InventoryState {
  const inventory = new Map<string, number>();
  if (!puzzle) return inventory;

  // Start with full inventory quantities
  for (const brick of puzzle.inventory) {
    inventory.set(brick.id, brick.quantity);
  }

  // Subtract pre-placed pieces that reference inventory (not inline pieces)
  if (puzzle.board.initial_state) {
    for (const placement of puzzle.board.initial_state) {
      if ('brickId' in placement) {
        const current = inventory.get(placement.brickId) ?? 0;
        inventory.set(placement.brickId, Math.max(0, current - 1));
      }
    }
  }

  return inventory;
}
