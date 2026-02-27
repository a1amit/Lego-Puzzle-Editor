/**
 * Headless Puzzle Engine Hook
 * 
 * This hook manages the entire state of a puzzle and is COMPLETELY DECOUPLED
 * from any rendering library. It works purely with coordinates and IDs.
 * 
 * ❌ Does NOT import: three, @react-three/fiber, @react-three/drei, or any DOM APIs
 * ✅ Works with: Pure TypeScript types, coordinates {x, y, z}, and string IDs
 * 
 * This enables the same logic to drive:
 * - 3D isometric view (Three.js)
 * - 2D top-down view (SVG/CSS)
 * - Text-only/accessibility mode
 * - Server-side validation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Coordinate2D,
  Coordinate3D,
  PlacedPiece,
  EngineBoard,
  InventoryState,
  EngineValidationResult,
  EngineState,
  EngineActions,
  EngineConfig,
  ViewMode,
  MovementRule,
} from './types';
import { SoundManager } from '../services/SoundManager';
import { haptics } from '../services/haptics';
import {
  rotateShape,
  calculateZLevel,
  findPiecesStackedOnTop,
  arePieceCellsWithinBounds,
  wouldOverlapAtZ,
  containsBlockedCells,
  getValidSlideDestinations,
  generateInstanceId,
  getPieceCells,
} from './utils';
import { createInitialBoard, createInitialInventory } from './boardFactory';
import { enrichValidationRules, hasNoBrickRemovalRule } from './validationHelpers';
import { ValidationRegistry } from '../validation/ValidationRegistry';
import type { PuzzleDefinition } from '../types/puzzle';
import { SHAPE_LIBRARY } from '../types/puzzle';

// ============================================
// UNDO / REDO SNAPSHOT
// ============================================

interface EngineSnapshot {
  board: EngineBoard;
  inventory: InventoryState;
  moveCount: number;
}

const MAX_UNDO_HISTORY = 50;

// ============================================
// HOOK CONFIGURATION
// ============================================

interface UsePuzzleEngineOptions {
  puzzle: PuzzleDefinition | null;
  /** Override view mode from puzzle definition */
  viewModeOverride?: ViewMode;
}

interface UsePuzzleEngineReturn extends EngineState, EngineActions {
  /** The current puzzle definition */
  puzzle: PuzzleDefinition | null;
  /** Engine configuration derived from puzzle */
  config: EngineConfig;
  /** Load a new puzzle */
  loadPuzzle: (puzzle: PuzzleDefinition) => void;
  /** Undo the last action */
  undo: () => void;
  /** Redo the last undone action */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

// ============================================
// DEFAULT STATE CREATORS
// ============================================

function deriveConfig(puzzle: PuzzleDefinition | null, viewModeOverride?: ViewMode): EngineConfig {
  // Extract viewMode from puzzle or use override/default
  const viewMode: ViewMode = viewModeOverride ??
    (puzzle as any)?.viewMode ??
    '3D';

  // Extract movement rule from validation_rules
  const movementRule: MovementRule = puzzle?.validation_rules?.find(
    r => r.type === 'MOVEMENT'
  )?.rule as MovementRule ?? 'FREE_PLACEMENT';

  // Determine if stacking is allowed based on depth
  const allowStacking = (puzzle?.board.dimensions.depth ?? 1) > 1;

  // Check if rotation is disabled (NO_ROTATION rule present)
  const hasNoRotationRule = puzzle?.validation_rules?.some(
    r => r.type === 'ROTATION' && r.rule === 'NO_ROTATION'
  ) ?? false;
  const rotationEnabled = !hasNoRotationRule;

  return {
    viewMode,
    movementRule,
    allowStacking,
    rotationEnabled,
  };
}

// ============================================
// THE HOOK
// ============================================

export function usePuzzleEngine(options: UsePuzzleEngineOptions): UsePuzzleEngineReturn {
  const { puzzle: initialPuzzle, viewModeOverride } = options;

  // Core state
  const [puzzle, setPuzzle] = useState<PuzzleDefinition | null>(initialPuzzle);
  const [board, setBoard] = useState<EngineBoard>(() => createInitialBoard(initialPuzzle));
  const [inventory, setInventory] = useState<InventoryState>(() => createInitialInventory(initialPuzzle));
  const [validationResults, setValidationResults] = useState<EngineValidationResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  // Selection state
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  // Undo / Redo stacks (using refs to avoid stale closures in callbacks)
  const undoStackRef = useRef<EngineSnapshot[]>([]);
  const redoStackRef = useRef<EngineSnapshot[]>([]);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);

  const pushSnapshot = useCallback(() => {
    const snapshot: EngineSnapshot = {
      board: { ...board, placedPieces: [...board.placedPieces] },
      inventory: new Map(inventory),
      moveCount,
    };
    undoStackRef.current = [...undoStackRef.current.slice(-(MAX_UNDO_HISTORY - 1)), snapshot];
    redoStackRef.current = [];
    setUndoLen(undoStackRef.current.length);
    setRedoLen(0);
  }, [board, inventory, moveCount]);

  // Derived configuration
  const config = useMemo(() => deriveConfig(puzzle, viewModeOverride), [puzzle, viewModeOverride]);

  // ============================================
  // VALIDATION (runs automatically via useEffect)
  // ============================================

  // Run validation automatically whenever board changes
  useEffect(() => {
    if (!puzzle) return;

    // Enrich validation rules with runtime parameters (shared helper)
    const rulesWithParams = enrichValidationRules(puzzle, moveCount);

    // Convert engine board to validation board format
    const validationBoard = {
      dimensions: board.dimensions,
      placedBricks: board.placedPieces.map(p => ({
        id: p.id,
        instanceId: p.instanceId,
        shape: p.shape,
        color: p.color,
        position: { x: p.position.x, y: p.position.y },
        rotation: p.rotation,
        z: p.position.z,
      })),
      blockedCells: board.blockedCells,
    };

    const results = ValidationRegistry.validate(validationBoard, rulesWithParams);
    setValidationResults(results);
    setIsComplete(ValidationRegistry.isAllValid(results));
  }, [puzzle, board, moveCount]); // Re-run whenever puzzle, board, or moveCount changes

  // ============================================
  // PIECE PLACEMENT
  // ============================================

  const placePiece = useCallback((
    pieceId: string,
    position: Coordinate3D,
    rotation: number = previewRotation
  ): boolean => {
    if (!puzzle) return false;

    // Find the piece definition in inventory
    const pieceDefinition = puzzle.inventory.find(p => p.id === pieceId);
    if (!pieceDefinition) return false;

    // Check inventory availability
    const remaining = inventory.get(pieceId) ?? 0;
    if (remaining <= 0) return false;

    // Get shape and calculate cells
    const shape = SHAPE_LIBRARY[pieceDefinition.shape];
    if (!shape) return false;

    const rotatedCells = rotateShape(shape.cells, rotation);
    const targetCells: Coordinate2D[] = rotatedCells.map(([dx, dy]) => [
      position.x + dx,
      position.y + dy,
    ]);

    // Validate bounds
    if (!arePieceCellsWithinBounds(targetCells, board.dimensions)) {
      return false;
    }

    // Check blocked cells
    if (containsBlockedCells(targetCells, board.blockedCells)) {
      return false;
    }

    // Calculate z-level for stacking
    let targetZ = position.z;
    if (config.allowStacking) {
      targetZ = calculateZLevel(board, targetCells);
    }

    // Check depth limit
    const maxAllowedZ = board.dimensions.depth - 1;
    if (targetZ > maxAllowedZ) {
      return false;
    }

    // Check for overlap at target z-level
    if (wouldOverlapAtZ(board, targetCells, targetZ)) {
      return false;
    }

    // Save snapshot for undo
    pushSnapshot();

    // Create new placed piece
    const placedPiece: PlacedPiece = {
      id: pieceId,
      instanceId: generateInstanceId(pieceId),
      shape: pieceDefinition.shape,
      color: pieceDefinition.color,
      position: { x: position.x, y: position.y, z: targetZ },
      rotation,
    };

    // Update state
    setBoard(prev => ({
      ...prev,
      placedPieces: [...prev.placedPieces, placedPiece],
    }));

    setInventory(prev => {
      const newInventory = new Map(prev);
      newInventory.set(pieceId, remaining - 1);
      return newInventory;
    });

    setPreviewRotation(0);
    SoundManager.getInstance().play('snap');
    haptics.medium();

    return true;
  }, [puzzle, inventory, board, config, previewRotation, pushSnapshot]);

  // ============================================
  // PIECE REMOVAL
  // ============================================

  const removePiece = useCallback((instanceId: string) => {
    if (hasNoBrickRemovalRule(puzzle)) {
      return;
    }

    const piece = board.placedPieces.find(p => p.instanceId === instanceId);
    if (!piece) return;

    // Save snapshot for undo
    pushSnapshot();

    // Find all pieces stacked on top
    const stackedIds = findPiecesStackedOnTop(board, piece);
    const allIdsToRemove = new Set([instanceId, ...stackedIds]);

    // Get all pieces being removed to return to inventory
    const piecesToRemove = board.placedPieces.filter(p => allIdsToRemove.has(p.instanceId));

    // Update board
    setBoard(prev => ({
      ...prev,
      placedPieces: prev.placedPieces.filter(p => !allIdsToRemove.has(p.instanceId)),
    }));

    // Return pieces to inventory
    setInventory(prev => {
      const newInventory = new Map(prev);
      for (const removedPiece of piecesToRemove) {
        const current = newInventory.get(removedPiece.id) ?? 0;
        newInventory.set(removedPiece.id, current + 1);
      }
      return newInventory;
    });

    SoundManager.getInstance().play('undo');
    haptics.light();
  }, [board, puzzle, pushSnapshot]);

  // ============================================
  // PIECE MOVEMENT
  // ============================================

  const movePiece = useCallback((instanceId: string, destination: Coordinate3D): boolean => {
    const piece = board.placedPieces.find(p => p.instanceId === instanceId);
    if (!piece) return false;

    // Check if position is actually changing
    if (piece.position.x === destination.x && piece.position.y === destination.y) {
      return true; // No change needed
    }

    // Save snapshot for undo before mutation
    pushSnapshot();

    // For sliding puzzles, validate the move
    if (config.movementRule === 'SLIDING_ONLY') {
      const validDestinations = getValidSlideDestinations(board, piece);
      const isValidSlide = validDestinations.some(
        ([x, y]) => x === destination.x && y === destination.y
      );
      if (!isValidSlide) return false;
    }

    // Get shape and calculate new cells
    const shape = SHAPE_LIBRARY[piece.shape];
    if (!shape) return false;

    const rotatedCells = rotateShape(shape.cells, piece.rotation);
    const targetCells: Coordinate2D[] = rotatedCells.map(([dx, dy]) => [
      destination.x + dx,
      destination.y + dy,
    ]);

    // Validate bounds
    if (!arePieceCellsWithinBounds(targetCells, board.dimensions)) {
      return false;
    }

    // Find and remove stacked pieces
    const stackedIds = findPiecesStackedOnTop(board, piece);
    const stackedPieces = board.placedPieces.filter(p => stackedIds.has(p.instanceId));

    // Calculate new z-level
    let targetZ = destination.z;

    // Check for overlaps with other pieces (excluding self and stacked pieces)
    const boardWithoutMovingPiece = {
      ...board,
      placedPieces: board.placedPieces.filter(
        p => !stackedIds.has(p.instanceId) && p.instanceId !== instanceId
      ),
    };

    if (config.allowStacking) {
      // With stacking allowed, calculate the appropriate z-level
      targetZ = calculateZLevel(boardWithoutMovingPiece, targetCells, instanceId);
    } else {
      // Without stacking, check if any target cells are already occupied
      const targetCellSet = new Set(targetCells.map(([x, y]) => `${x},${y}`));

      for (const otherPiece of boardWithoutMovingPiece.placedPieces) {
        const otherCells = getPieceCells(otherPiece);
        for (const [ox, oy] of otherCells) {
          if (targetCellSet.has(`${ox},${oy}`)) {
            // Cell already occupied and stacking not allowed - block the move
            return false;
          }
        }
      }
      targetZ = 0;
    }

    // Check depth limit
    const maxAllowedZ = board.dimensions.depth - 1;
    if (targetZ > maxAllowedZ) {
      return false;
    }

    // Update board: remove stacked pieces and move target piece
    setBoard(prev => ({
      ...prev,
      placedPieces: prev.placedPieces
        .filter(p => !stackedIds.has(p.instanceId))
        .map(p => p.instanceId === instanceId
          ? { ...p, position: { ...destination, z: targetZ } }
          : p
        ),
    }));

    // Return stacked pieces to inventory
    if (stackedPieces.length > 0) {
      setInventory(prev => {
        const newInventory = new Map(prev);
        for (const stackedPiece of stackedPieces) {
          const current = newInventory.get(stackedPiece.id) ?? 0;
          newInventory.set(stackedPiece.id, current + 1);
        }
        return newInventory;
      });
    }
    // Increment move count for successful moves
    setMoveCount(prev => prev + 1);
    SoundManager.getInstance().play('slide');
    haptics.light();

    return true;
  }, [board, config, pushSnapshot]);

  // ============================================
  // PIECE ROTATION
  // ============================================

  const rotatePiece = useCallback((instanceId: string) => {
    // Check if rotation is disabled
    if (!config.rotationEnabled) {
      return;
    }

    pushSnapshot();

    setBoard(prev => ({
      ...prev,
      placedPieces: prev.placedPieces.map(p =>
        p.instanceId === instanceId
          ? { ...p, rotation: (p.rotation + 90) % 360 }
          : p
      ),
    }));

    SoundManager.getInstance().play('rotate');
    haptics.light();
  }, [config.rotationEnabled, pushSnapshot]);

  // ============================================
  // SELECTION
  // ============================================

  const selectPiece = useCallback((pieceId: string | null) => {
    if (pieceId !== selectedPieceId) {
      setPreviewRotation(0);
      if (pieceId) SoundManager.getInstance().play('select');
    }
    setSelectedPieceId(pieceId);
  }, [selectedPieceId]);

  const rotatePreview = useCallback(() => {
    // Check if rotation is disabled
    if (!config.rotationEnabled) {
      return;
    }
    setPreviewRotation(prev => (prev + 90) % 360);
  }, [config.rotationEnabled]);

  const setHoveredCellFn = useCallback((cell: { x: number; y: number } | null) => {
    setHoveredCell(cell);
  }, []);

  // ============================================
  // VALIDATE BOARD (manual trigger - for external use)
  // ============================================

  const validateBoard = useCallback((): EngineValidationResult[] => {
    // Return the current validation results
    // Note: Validation runs automatically via useEffect when board changes
    return validationResults;
  }, [validationResults]);

  // ============================================
  // RESET & LOAD
  // ============================================

  const resetBoard = useCallback(() => {
    setBoard(createInitialBoard(puzzle));
    setInventory(createInitialInventory(puzzle));
    setValidationResults([]);
    setIsComplete(false);
    setSelectedPieceId(null);
    setPreviewRotation(0);
    setMoveCount(0);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoLen(0);
    setRedoLen(0);
  }, [puzzle]);

  const loadPuzzle = useCallback((newPuzzle: PuzzleDefinition) => {
    setPuzzle(newPuzzle);
    setBoard(createInitialBoard(newPuzzle));
    setInventory(createInitialInventory(newPuzzle));
    setValidationResults([]);
    setIsComplete(false);
    setSelectedPieceId(null);
    setPreviewRotation(0);
    setMoveCount(0);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoLen(0);
    setRedoLen(0);
  }, []);

  // ============================================
  // UNDO / REDO
  // ============================================

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;

    const currentSnapshot: EngineSnapshot = {
      board: { ...board, placedPieces: [...board.placedPieces] },
      inventory: new Map(inventory),
      moveCount,
    };

    const prev = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, currentSnapshot];
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);

    setBoard(prev.board);
    setInventory(prev.inventory);
    setMoveCount(prev.moveCount);
    setSelectedPieceId(null);
    setPreviewRotation(0);

    SoundManager.getInstance().play('undo');
    haptics.light();
  }, [board, inventory, moveCount]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;

    const currentSnapshot: EngineSnapshot = {
      board: { ...board, placedPieces: [...board.placedPieces] },
      inventory: new Map(inventory),
      moveCount,
    };

    const next = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, currentSnapshot];
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);

    setBoard(next.board);
    setInventory(next.inventory);
    setMoveCount(next.moveCount);
    setSelectedPieceId(null);
    setPreviewRotation(0);

    SoundManager.getInstance().play('undo');
    haptics.light();
  }, [board, inventory, moveCount]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    puzzle,
    config,
    board,
    inventory,
    selectedPieceId,
    previewRotation,
    hoveredCell,
    validationResults,
    isComplete,
    moveCount,

    // Actions
    placePiece,
    removePiece,
    movePiece,
    rotatePiece,
    selectPiece,
    rotatePreview,
    setHoveredCell: setHoveredCellFn,
    validateBoard,
    resetBoard,
    loadPuzzle,

    // Undo / Redo
    undo,
    redo,
    canUndo: undoLen > 0,
    canRedo: redoLen > 0,
  };
}

export type { UsePuzzleEngineReturn };

