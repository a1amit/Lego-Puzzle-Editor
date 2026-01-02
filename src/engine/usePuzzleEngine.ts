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

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ValidationRegistry } from '../validation/ValidationRegistry';
import type { PuzzleDefinition, ValidationRule } from '../types/puzzle';
import { SHAPE_LIBRARY } from '../types/puzzle';

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
}

// ============================================
// DEFAULT STATE CREATORS
// ============================================

function createInitialBoard(puzzle: PuzzleDefinition | null): EngineBoard {
  if (!puzzle) {
    return {
      dimensions: { width: 8, height: 4, depth: 1 },
      placedPieces: [],
      blockedCells: [],
    };
  }

  // Load initial piece placements from puzzle definition (for slider puzzles)
  const placedPieces: PlacedPiece[] = [];

  if (puzzle.board.initial_state && puzzle.board.initial_state.length > 0) {
    for (const placement of puzzle.board.initial_state) {
      // Check which type of placement this is
      if ('cells' in placement && Array.isArray(placement.cells)) {
        // Cell-based piece definition (most explicit)
        // Convert cells to shape + position format for internal use
        const cells = placement.cells as [number, number][];
        const minX = Math.min(...cells.map(c => c[0]));
        const minY = Math.min(...cells.map(c => c[1]));

        // Create a custom shape from the cells (normalized to origin)
        const normalizedCells = cells.map(([x, y]) => [x - minX, y - minY] as [number, number]);
        const shapeName = `custom-${placement.id}`;

        // Register custom shape if not exists
        if (!SHAPE_LIBRARY[shapeName]) {
          SHAPE_LIBRARY[shapeName] = {
            name: shapeName,
            cells: normalizedCells,
          };
        }

        placedPieces.push({
          id: placement.id,
          instanceId: `${placement.id}-initial-${placedPieces.length}`,
          shape: shapeName,
          color: placement.color,
          position: {
            x: minX,
            y: minY,
            z: 0,
          },
          rotation: 0,
        });
      } else if ('shape' in placement && 'color' in placement && 'position' in placement) {
        // Inline piece definition with shape name
        placedPieces.push({
          id: placement.id,
          instanceId: `${placement.id}-initial-${placedPieces.length}`,
          shape: placement.shape,
          color: placement.color,
          position: {
            x: placement.position[0],
            y: placement.position[1],
            z: 0,
          },
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
            position: {
              x: placement.position[0],
              y: placement.position[1],
              z: 0,
            },
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

function createInitialInventory(puzzle: PuzzleDefinition | null): InventoryState {
  const inventory = new Map<string, number>();
  if (puzzle) {
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
        // Inline pieces don't need inventory entries
      }
    }
  }
  return inventory;
}

function deriveConfig(puzzle: PuzzleDefinition | null, viewModeOverride?: ViewMode): EngineConfig {
  // Extract viewMode from puzzle or use override/default
  const viewMode: ViewMode = viewModeOverride ??
    (puzzle as any)?.viewMode ??
    '3D_ISOMETRIC';

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

  // Selection state
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  // Derived configuration
  const config = useMemo(() => deriveConfig(puzzle, viewModeOverride), [puzzle, viewModeOverride]);

  // ============================================
  // VALIDATION (runs automatically via useEffect)
  // ============================================

  // Run validation automatically whenever board changes
  useEffect(() => {
    if (!puzzle) return;

    // Enhance validation rules with additional parameters
    const rulesWithParams: ValidationRule[] = puzzle.validation_rules.map(rule => {
      // Add inventory data for ALL_BRICKS_MUST_BE_USED rule
      if (rule.rule === 'ALL_BRICKS_MUST_BE_USED') {
        return {
          ...rule,
          params: {
            ...rule.params,
            inventory: puzzle.inventory.map(b => ({ id: b.id, quantity: b.quantity })),
          },
        };
      }

      // Add goal cells data for GOAL_REACHED rule (slider puzzles)
      if (rule.rule === 'GOAL_REACHED' && puzzle.goal) {
        return {
          ...rule,
          params: {
            ...rule.params,
            targetPieceId: puzzle.goal.targetPieceId,
            goalCells: puzzle.goal.cells,
          },
        };
      }

      // Add target pattern data for PATTERN_MATCH rule
      if (rule.rule === 'PATTERN_MATCH' && (puzzle as any).target_pattern) {
        const targetPattern = (puzzle as any).target_pattern;
        return {
          ...rule,
          params: {
            ...rule.params,
            rows: targetPattern.rows,
            color_mapping: targetPattern.color_mapping,
            allow_empty_cells: targetPattern.allow_empty_cells,
          },
        };
      }

      return rule;
    });

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
  }, [puzzle, board]); // Re-run whenever puzzle or board changes

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

    // Validation runs automatically via useEffect when board changes

    return true;
  }, [puzzle, inventory, board, config, previewRotation]);

  // ============================================
  // PIECE REMOVAL
  // ============================================

  const removePiece = useCallback((instanceId: string) => {
    // Check if piece removal is disabled
    const hasNoBrickRemovalRule = puzzle?.validation_rules?.some(
      r => r.rule === 'NO_BRICK_REMOVAL'
    ) ?? false;

    if (hasNoBrickRemovalRule) {
      console.log('Brick removal is disabled for this puzzle (NO_BRICK_REMOVAL rule)');
      return;
    }

    const piece = board.placedPieces.find(p => p.instanceId === instanceId);
    if (!piece) return;

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

    // Validation runs automatically via useEffect when board changes
  }, [board, puzzle]);

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

    // Validation runs automatically via useEffect when board changes
    return true;
  }, [board, config]);

  // ============================================
  // PIECE ROTATION
  // ============================================

  const rotatePiece = useCallback((instanceId: string) => {
    // Check if rotation is disabled
    if (!config.rotationEnabled) {
      console.log('Rotation is disabled for this puzzle');
      return;
    }

    setBoard(prev => ({
      ...prev,
      placedPieces: prev.placedPieces.map(p =>
        p.instanceId === instanceId
          ? { ...p, rotation: (p.rotation + 90) % 360 }
          : p
      ),
    }));

    // Validation runs automatically via useEffect when board changes
  }, [config.rotationEnabled]);

  // ============================================
  // SELECTION
  // ============================================

  const selectPiece = useCallback((pieceId: string | null) => {
    if (pieceId !== selectedPieceId) {
      setPreviewRotation(0);
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
  }, [puzzle]);

  const loadPuzzle = useCallback((newPuzzle: PuzzleDefinition) => {
    setPuzzle(newPuzzle);
    setBoard(createInitialBoard(newPuzzle));
    setInventory(createInitialInventory(newPuzzle));
    setValidationResults([]);
    setIsComplete(false);
    setSelectedPieceId(null);
    setPreviewRotation(0);
  }, []);

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
  };
}

export type { UsePuzzleEngineReturn };

