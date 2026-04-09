/**
 * Shared test helpers & fixtures
 *
 * Provides factory functions used across multiple test suites to reduce
 * duplication and keep test files focused on assertions.
 */

import type { BoardState, PlacedBrick, PuzzleDefinition } from '@/types/puzzle'
import type { PlacedPiece, EngineBoard } from '@/engine/types'

// ============================================
// Validation-layer factories (BoardState / PlacedBrick)
// ============================================

/** Create a BoardState with sensible defaults. */
export function createBoardState(overrides?: Partial<BoardState>): BoardState {
  return {
    dimensions: { width: 4, height: 4, depth: 1 },
    placedBricks: [],
    blockedCells: [],
    ...overrides,
  }
}

/** Create a PlacedBrick with sensible defaults. */
export function createPlacedBrick(overrides?: Partial<PlacedBrick>): PlacedBrick {
  return {
    id: 'test-brick',
    instanceId: 'test-instance-1',
    shape: 'unit',
    color: '#ff0000',
    position: { x: 0, y: 0 },
    rotation: 0,
    z: 0,
    ...overrides,
  }
}

// ============================================
// Engine-layer factories (EngineBoard / PlacedPiece)
// ============================================

/** Create an EngineBoard with sensible defaults. */
export function createEngineBoard(overrides?: Partial<EngineBoard>): EngineBoard {
  return {
    dimensions: { width: 4, height: 4, depth: 1 },
    placedPieces: [],
    blockedCells: [],
    ...overrides,
  }
}

/** Create a PlacedPiece (engine layer) with sensible defaults. */
export function createPlacedPiece(overrides?: Partial<PlacedPiece>): PlacedPiece {
  return {
    id: 'test-piece',
    instanceId: 'test-instance-1',
    shape: 'unit',
    color: '#ff0000',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    ...overrides,
  }
}

// ============================================
// Puzzle definition factory
// ============================================

/** Create a minimal PuzzleDefinition with sensible defaults. */
export function createTestPuzzle(overrides: Partial<PuzzleDefinition> = {}): PuzzleDefinition {
  return {
    title: 'Test Puzzle',
    description: 'A test puzzle',
    viewMode: '3D',
    board: {
      dimensions: { width: 4, height: 4, depth: 1 },
      initial_state: [],
      blocked_cells: [],
    },
    inventory: [],
    validation_rules: [],
    ...overrides,
  } as PuzzleDefinition
}
