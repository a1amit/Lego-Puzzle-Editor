/**
 * useInteractions2D - Custom hooks for 2D renderer interaction handling.
 *
 * Keyboard shortcuts, cell click logic, piece click logic, and
 * ghost-piece validity checks.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UsePuzzleEngineReturn, PlacedPiece } from '../../../engine';
import { rotateShape, getPieceCells, getValidSlideDestinations } from '../../../engine';
import { SHAPE_LIBRARY } from '../../../types/puzzle';
import { useRuleBuilderStore } from '../../editor/ruleBuilder/useRuleBuilderStore';

interface UseInteractions2DOptions {
  engine: UsePuzzleEngineReturn;
  blockedCells: Set<string>;
}

export function useInteractions2D({ engine, blockedCells }: UseInteractions2DOptions) {
  const {
    board,
    config,
    puzzle,
    selectedPieceId,
    previewRotation,
    hoveredCell,
    placePiece,
    removePiece,
    movePiece,
    rotatePiece,
    selectPiece,
    rotatePreview,
  } = engine;

  const { width, height } = board.dimensions;
  const dragNdrop = puzzle?.dragNdrop ?? false;

  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);

  // ---- derived selections ----

  const selectedPlacedPiece = useMemo(
    () => board.placedPieces.find(p => p.instanceId === selectedPieceId),
    [board.placedPieces, selectedPieceId],
  );

  const selectedInventoryPiece = useMemo(() => {
    if (selectedPlacedPiece) return null;
    return puzzle?.inventory.find(p => p.id === selectedPieceId);
  }, [puzzle, selectedPieceId, selectedPlacedPiece]);

  // ---- valid slide destinations ----

  const validDestinations = useMemo(() => {
    if (!selectedPlacedPiece || config.movementRule !== 'SLIDING_ONLY') {
      return new Set<string>();
    }

    const destinations = getValidSlideDestinations(board, selectedPlacedPiece);
    const shapeDef = SHAPE_LIBRARY[selectedPlacedPiece.shape];

    if (!shapeDef) {
      return new Set(destinations.map(([x, y]) => `${x},${y}`));
    }

    const allValidCells = new Set<string>();
    const rotatedCells = rotateShape(shapeDef.cells, selectedPlacedPiece.rotation);

    for (const [destX, destY] of destinations) {
      for (const [dx, dy] of rotatedCells) {
        allValidCells.add(`${destX + dx},${destY + dy}`);
      }
    }

    return allValidCells;
  }, [selectedPlacedPiece, board, config.movementRule]);

  // ---- rotation handler (shared by keyboard R key and on-screen button) ----

  const handleRotate = useCallback(() => {
    if (selectedPlacedPiece) {
      rotatePiece(selectedPlacedPiece.instanceId);
    } else if (selectedInventoryPiece) {
      rotatePreview();
    }
  }, [selectedPlacedPiece, selectedInventoryPiece, rotatePiece, rotatePreview]);

  // ---- keyboard handler ----

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyR') {
        handleRotate();
      } else if (e.code === 'Escape') {
        selectPiece(null);
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && selectedPlacedPiece) {
        removePiece(selectedPlacedPiece.instanceId);
        selectPiece(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRotate, selectedPlacedPiece, selectPiece, removePiece]);

  // ---- place / move commit (used by click in legacy mode, pointerup in dragNdrop) ----

  const commitPlaceOrMove = useCallback((x: number, y: number) => {
    if (blockedCells.has(`${x},${y}`)) return;

    if (selectedPlacedPiece) {
      const currentCells = getPieceCells(selectedPlacedPiece);
      const clickedOnSelf = currentCells.some(([cx, cy]) => cx === x && cy === y);
      if (clickedOnSelf) {
        selectPiece(null);
        return;
      }

      if (config.movementRule === 'SLIDING_ONLY') {
        const validDests = getValidSlideDestinations(board, selectedPlacedPiece);
        const shapeDef = SHAPE_LIBRARY[selectedPlacedPiece.shape];

        if (shapeDef) {
          const rotatedCells = rotateShape(shapeDef.cells, selectedPlacedPiece.rotation);

          const matchingDest = validDests.find(([destX, destY]) =>
            rotatedCells.some(([dx, dy]) => destX + dx === x && destY + dy === y),
          );

          if (matchingDest) {
            movePiece(selectedPlacedPiece.instanceId, { x: matchingDest[0], y: matchingDest[1], z: 0 });
            selectPiece(null);
            return;
          }
        }
      } else {
        const shapeDef = SHAPE_LIBRARY[selectedPlacedPiece.shape];
        if (shapeDef) {
          const rotatedCells = rotateShape(shapeDef.cells, selectedPlacedPiece.rotation);

          const minDx = Math.min(...rotatedCells.map(([dx]) => dx));
          const maxDx = Math.max(...rotatedCells.map(([dx]) => dx));
          const minDy = Math.min(...rotatedCells.map(([, dy]) => dy));
          const maxDy = Math.max(...rotatedCells.map(([, dy]) => dy));

          let anchorX = x - minDx;
          let anchorY = y - minDy;

          anchorX = Math.max(-minDx, Math.min(anchorX, board.dimensions.width - 1 - maxDx));
          anchorY = Math.max(-minDy, Math.min(anchorY, board.dimensions.height - 1 - maxDy));

          movePiece(selectedPlacedPiece.instanceId, { x: anchorX, y: anchorY, z: 0 });
        } else {
          movePiece(selectedPlacedPiece.instanceId, { x, y, z: 0 });
        }
        selectPiece(null);
      }
      return;
    }

    if (selectedInventoryPiece) {
      const remainingCount = engine.inventory.get(selectedInventoryPiece.id) ?? 0;
      const keepSelected = remainingCount > 1;

      placePiece(selectedInventoryPiece.id, { x, y, z: 0 }, previewRotation);

      if (!keepSelected) {
        selectPiece(null);
      }
    }
  }, [selectedPlacedPiece, selectedInventoryPiece, previewRotation, placePiece, movePiece, selectPiece, blockedCells, config.movementRule, board, engine.inventory]);

  // ---- cell click (pointer-down on cell) ----

  const handleCellClick = useCallback((x: number, y: number) => {
    // Single-cell picker mode (path_exists start/end)
    const singleTarget = useRuleBuilderStore.getState().singleCellPickerTarget;
    if (singleTarget) {
      useRuleBuilderStore.getState().pickSingleCell(x, y);
      return;
    }

    // Multi-cell picker mode: intercept clicks for the rule builder
    const pickerTarget = useRuleBuilderStore.getState().cellPickerTarget;
    if (pickerTarget) {
      useRuleBuilderStore.getState().toggleCell(x, y);
      return;
    }

    // In dragNdrop mode, pointer-down on a cell does NOT commit a move or
    // placement — commit happens on pointer-up via handleCellPointerUp.
    // This prevents double-firing when a tap fires both pointerdown and
    // pointerup on the same cell.
    if (dragNdrop) return;

    commitPlaceOrMove(x, y);
  }, [dragNdrop, commitPlaceOrMove]);

  // ---- cell pointer-up (used in dragNdrop mode to commit drag) ----

  const handleCellPointerUp = useCallback((x: number, y: number) => {
    if (!dragNdrop) return;
    // Skip rule-builder picker modes on pointer-up — those are click-based.
    if (useRuleBuilderStore.getState().singleCellPickerTarget) return;
    if (useRuleBuilderStore.getState().cellPickerTarget) return;
    commitPlaceOrMove(x, y);
  }, [dragNdrop, commitPlaceOrMove]);

  // ---- piece click ----

  const handlePieceClick = useCallback((piece: PlacedPiece) => {
    // In dragNdrop mode, pressing a piece always selects it (no toggle).
    // Deselect happens when the drag is released on the piece's own cells,
    // when the Escape key is pressed, or when another piece is pressed.
    if (dragNdrop) {
      selectPiece(piece.instanceId);
      return;
    }
    if (selectedPieceId === piece.instanceId) {
      selectPiece(null);
    } else {
      selectPiece(piece.instanceId);
    }
  }, [selectedPieceId, selectPiece, dragNdrop]);

  // ---- ghost validity ----

  const isGhostValid = useMemo(() => {
    if (!selectedInventoryPiece || !hoveredCell) return false;

    const shapeDef = SHAPE_LIBRARY[selectedInventoryPiece.shape];
    if (!shapeDef) return false;

    const rotatedCells = rotateShape(shapeDef.cells, previewRotation);
    const maxDepth = board.dimensions.depth ?? 1;
    const allowStacking = maxDepth > 1;

    for (const [dx, dy] of rotatedCells) {
      const cx = hoveredCell.x + dx;
      const cy = hoveredCell.y + dy;

      if (cx < 0 || cx >= width || cy < 0 || cy >= height) return false;
      if (blockedCells.has(`${cx},${cy}`)) return false;

      if (!allowStacking) {
        for (const placed of board.placedPieces) {
          const placedCells = getPieceCells(placed);
          if (placedCells.some(([px, py]) => px === cx && py === cy)) {
            return false;
          }
        }
      }
    }

    if (allowStacking) {
      const targetCells = rotatedCells.map(([dx, dy]) => [hoveredCell.x + dx, hoveredCell.y + dy] as [number, number]);
      let maxZ = -1;
      for (const placed of board.placedPieces) {
        const placedCells = getPieceCells(placed);
        const placedCellSet = new Set(placedCells.map(([px, py]) => `${px},${py}`));
        for (const [tx, ty] of targetCells) {
          if (placedCellSet.has(`${tx},${ty}`)) {
            maxZ = Math.max(maxZ, placed.position.z);
          }
        }
      }
      if (maxZ + 1 > maxDepth - 1) return false;
    }

    return true;
  }, [selectedInventoryPiece, hoveredCell, previewRotation, width, height, blockedCells, board.placedPieces, board.dimensions.depth]);

  // ---- invalid cells ----

  // Opt-in via puzzle.highlight_failing_cells — when on, every failing
  // rule's affectedCells are painted red (including CUSTOM rules).
  const highlightFailingCells = puzzle?.highlight_failing_cells ?? false;
  const invalidCells = useMemo(() => {
    const cells = new Set<string>();
    if (!highlightFailingCells) return cells;
    for (const result of engine.validationResults) {
      if (!result.isValid && result.affectedCells) {
        for (const [x, y] of result.affectedCells) {
          cells.add(`${x},${y}`);
        }
      }
    }
    return cells;
  }, [engine.validationResults, highlightFailingCells]);

  // ---- goal area ----

  const goalAreaCells = useMemo(() => {
    if (!puzzle?.goal?.cells) return new Set<string>();
    return new Set(puzzle.goal.cells.map(([x, y]) => `${x},${y}`));
  }, [puzzle]);

  return {
    hoveredPieceId,
    setHoveredPieceId,
    selectedPlacedPiece,
    selectedInventoryPiece,
    validDestinations,
    invalidCells,
    goalAreaCells,
    isGhostValid,
    dragNdrop,
    handleCellClick,
    handleCellPointerUp,
    handlePieceClick,
    handleRotate,
  };
}
