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
  computeRigidStackRotation,
  computeRigidStackTranslation,
  type StackPieceInput,
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
  /** Apply a `puzzle.moves[]` move by id. No-op if the move id is unknown
   * or the transform leaves all positions unchanged. */
  applyMove: (moveId: string) => void;
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

  const moveAsStack = puzzle?.move_as_stack ?? true;

  return {
    viewMode,
    movementRule,
    allowStacking,
    rotationEnabled,
    moveAsStack,
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

    // Hanoi-style: top brick must fit within the supporting brick's footprint.
    if (puzzle.subset_stacking && targetZ > 0) {
      const targetSet = new Set(targetCells.map(([x, y]) => `${x},${y}`));
      const supporting = board.placedPieces.find(p => {
        if (p.position.z !== targetZ - 1) return false;
        return getPieceCells(p).some(([x, y]) => targetSet.has(`${x},${y}`));
      });
      if (!supporting) return false;
      const supportSet = new Set(getPieceCells(supporting).map(([x, y]) => `${x},${y}`));
      if (!targetCells.every(([x, y]) => supportSet.has(`${x},${y}`))) return false;
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

    if (piece.position.x === destination.x && piece.position.y === destination.y) {
      return true;
    }

    if (config.movementRule === 'SLIDING_ONLY') {
      const validDestinations = getValidSlideDestinations(board, piece);
      const isValidSlide = validDestinations.some(
        ([x, y]) => x === destination.x && y === destination.y
      );
      if (!isValidSlide) return false;
    }

    // Build stack: bottom piece + everything above it (sorted by z asc).
    const stackedIds = findPiecesStackedOnTop(board, piece);

    if (!config.moveAsStack && stackedIds.size > 0) return false;

    const stackPieces: PlacedPiece[] = [
      piece,
      ...board.placedPieces
        .filter(p => stackedIds.has(p.instanceId))
        .sort((a, b) => a.position.z - b.position.z),
    ];

    const dx = destination.x - piece.position.x;
    const dy = destination.y - piece.position.y;
    const stackInputs: StackPieceInput[] = stackPieces.map(p => ({
      position: [p.position.x, p.position.y],
      shape: p.shape,
      rotation: p.rotation,
    }));
    const transformed = computeRigidStackTranslation(stackInputs, dx, dy);
    if (!transformed) return false;

    for (const placement of transformed) {
      if (!arePieceCellsWithinBounds(placement.cells, board.dimensions)) {
        return false;
      }
      if (containsBlockedCells(placement.cells, board.blockedCells)) {
        return false;
      }
    }

    const stackIdSet = new Set(stackPieces.map(p => p.instanceId));
    const otherPieces = board.placedPieces.filter(p => !stackIdSet.has(p.instanceId));
    const boardWithoutStack: EngineBoard = { ...board, placedPieces: otherPieces };

    let zDelta: number;
    if (config.allowStacking) {
      zDelta = calculateZLevel(boardWithoutStack, transformed[0].cells) - piece.position.z;
    } else {
      // No stacking allowed → bottom (and everything in stack — which should be just the
      // bottom in this configuration) sits at z=0.
      const targetCellSet = new Set(transformed[0].cells.map(([x, y]) => `${x},${y}`));
      for (const other of otherPieces) {
        const otherCells = getPieceCells(other);
        for (const [ox, oy] of otherCells) {
          if (targetCellSet.has(`${ox},${oy}`)) return false;
        }
      }
      zDelta = -piece.position.z;
    }

    const newZByIndex = stackPieces.map(p => p.position.z + zDelta);
    const maxAllowedZ = board.dimensions.depth - 1;
    for (const z of newZByIndex) {
      if (z < 0 || z > maxAllowedZ) return false;
    }

    const otherCellSet = new Set<string>();
    for (const other of otherPieces) {
      const cells = getPieceCells(other);
      for (const [ox, oy] of cells) {
        otherCellSet.add(`${ox},${oy},${other.position.z}`);
      }
    }
    for (let i = 0; i < transformed.length; i++) {
      const z = newZByIndex[i];
      for (const [x, y] of transformed[i].cells) {
        if (otherCellSet.has(`${x},${y},${z}`)) return false;
      }
    }

    if (puzzle?.subset_stacking) {
      const newBottomZ = newZByIndex[0];
      if (newBottomZ > 0) {
        const bottomCells = transformed[0].cells;
        const bottomSet = new Set(bottomCells.map(([x, y]) => `${x},${y}`));
        const supporting = otherPieces.find(p => {
          if (p.position.z !== newBottomZ - 1) return false;
          return getPieceCells(p).some(([x, y]) => bottomSet.has(`${x},${y}`));
        });
        if (!supporting) return false;
        const supportSet = new Set(getPieceCells(supporting).map(([x, y]) => `${x},${y}`));
        if (!bottomCells.every(([x, y]) => supportSet.has(`${x},${y}`))) return false;
      }
    }

    pushSnapshot();

    setBoard(prev => ({
      ...prev,
      placedPieces: prev.placedPieces.map(p => {
        const idx = stackPieces.findIndex(sp => sp.instanceId === p.instanceId);
        if (idx === -1) return p;
        const t = transformed[idx];
        return {
          ...p,
          position: { x: t.position[0], y: t.position[1], z: newZByIndex[idx] },
        };
      }),
    }));

    setMoveCount(prev => prev + 1);
    SoundManager.getInstance().play('slide');
    haptics.light();

    return true;
  }, [board, config, puzzle, pushSnapshot]);

  // ============================================
  // PIECE ROTATION
  // ============================================

  const rotatePiece = useCallback((instanceId: string) => {
    if (!config.rotationEnabled) return;

    const piece = board.placedPieces.find(p => p.instanceId === instanceId);
    if (!piece) return;

    const stackedIds = findPiecesStackedOnTop(board, piece);

    if (!config.moveAsStack && stackedIds.size > 0) return;

    const stackPieces: PlacedPiece[] = [
      piece,
      ...board.placedPieces
        .filter(p => stackedIds.has(p.instanceId))
        .sort((a, b) => a.position.z - b.position.z),
    ];

    const stackInputs: StackPieceInput[] = stackPieces.map(p => ({
      position: [p.position.x, p.position.y],
      shape: p.shape,
      rotation: p.rotation,
    }));
    const transformed = computeRigidStackRotation(stackInputs);
    if (!transformed) return;

    // Note: rotation is allowed to swing cells off the board; only blocked cells
    // and on-board collisions with non-stack pieces reject the rotation.
    for (const placement of transformed) {
      if (containsBlockedCells(placement.cells, board.blockedCells)) return;
    }

    const stackIdSet = new Set(stackPieces.map(p => p.instanceId));
    const otherCellSet = new Set<string>();
    for (const other of board.placedPieces) {
      if (stackIdSet.has(other.instanceId)) continue;
      const cells = getPieceCells(other);
      for (const [ox, oy] of cells) {
        otherCellSet.add(`${ox},${oy},${other.position.z}`);
      }
    }
    for (let i = 0; i < transformed.length; i++) {
      const z = stackPieces[i].position.z;
      for (const [x, y] of transformed[i].cells) {
        if (otherCellSet.has(`${x},${y},${z}`)) return;
      }
    }

    pushSnapshot();

    setBoard(prev => ({
      ...prev,
      placedPieces: prev.placedPieces.map(p => {
        const idx = stackPieces.findIndex(sp => sp.instanceId === p.instanceId);
        if (idx === -1) return p;
        const t = transformed[idx];
        return {
          ...p,
          position: { x: t.position[0], y: t.position[1], z: p.position.z },
          rotation: t.rotation,
        };
      }),
    }));

    SoundManager.getInstance().play('rotate');
    haptics.light();
  }, [config, board, pushSnapshot]);

  // ============================================
  // GENERIC MOVES (puzzle.moves[])
  // ============================================

  const applyMove = useCallback((moveId: string) => {
    const move = puzzle?.moves?.find(m => m.id === moveId);
    if (!move) return;

    // Pure transform application — matches puzzleStore.applyTransform but
    // operates on EngineBoard / PlacedPiece (engine's domain) instead of
    // BoardState / PlacedBrick (store's domain).
    type Tx = { kind: 'permute'; cycles: [number, number][][] } | { kind: 'sequence'; steps: Tx[] };
    const applyTx = (pieces: PlacedPiece[], tx: Tx): PlacedPiece[] => {
      if (tx.kind === 'sequence') {
        let r = pieces;
        for (const step of tx.steps) r = applyTx(r, step);
        return r;
      }
      const moved = new Map<string, { x: number; y: number }>();
      const occupied = new Set(pieces.map(p => `${p.position.x},${p.position.y}`));
      for (const cycle of tx.cycles) {
        if (cycle.length < 2) continue;
        for (let i = 0; i < cycle.length; i++) {
          const fromKey = `${cycle[i][0]},${cycle[i][1]}`;
          const to = cycle[(i + 1) % cycle.length];
          if (occupied.has(fromKey)) moved.set(fromKey, { x: to[0], y: to[1] });
        }
      }
      return pieces.map(p => {
        const key = `${p.position.x},${p.position.y}`;
        const dest = moved.get(key);
        return dest ? { ...p, position: { x: dest.x, y: dest.y, z: p.position.z } } : p;
      });
    };

    const nextPieces = applyTx(board.placedPieces, move.transform as Tx);
    // No-op early-out if nothing actually moved.
    let changed = false;
    for (let i = 0; i < nextPieces.length; i++) {
      const a = nextPieces[i];
      const b = board.placedPieces[i];
      if (a.position.x !== b.position.x || a.position.y !== b.position.y) {
        changed = true;
        break;
      }
    }
    if (!changed) return;

    // Push undo snapshot.
    const snapshot: EngineSnapshot = {
      board: { ...board, placedPieces: [...board.placedPieces] },
      inventory: new Map(inventory),
      moveCount,
    };
    undoStackRef.current = [...undoStackRef.current.slice(-(MAX_UNDO_HISTORY - 1)), snapshot];
    redoStackRef.current = [];
    setUndoLen(undoStackRef.current.length);
    setRedoLen(0);

    setBoard({ ...board, placedPieces: nextPieces });
    setMoveCount(moveCount + 1);
    SoundManager.getInstance().play('slide');
    haptics.light();
  }, [puzzle, board, inventory, moveCount]);

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
    applyMove,

    // Undo / Redo
    undo,
    redo,
    canUndo: undoLen > 0,
    canRedo: redoLen > 0,
  };
}

export type { UsePuzzleEngineReturn };

