/**
 * Renderer2D - 2D Puzzle Renderer (Orchestrator)
 *
 * Renders puzzles in a 2D view using SVG. This renderer is completely
 * independent of Three.js and works purely with the engine state.
 *
 * Sub-components live in ./2d/ and are composed here.
 */

import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import type { UsePuzzleEngineReturn } from '../../engine';
import { getValidSlideDestinations, findPiecesStackedOnTop, getPieceCells } from '../../engine';
import { SCENE_2D } from '../../config/sceneConfig';
import { useRuleBuilderStore } from '../editor/ruleBuilder/useRuleBuilderStore';

import {
  SvgDefs,
  GridCell,
  Piece2D,
  GhostPiece2D,
  NonogramHintsDisplay,
  GoalOverlay2D,
  useInteractions2D,
  PADDING,
  HINT_CELL_SIZE,
  C,
} from './2d';

interface Renderer2DProps {
  engine: UsePuzzleEngineReturn;
  className?: string;
}

export function Renderer2D({ engine, className = '' }: Renderer2DProps) {
  const {
    puzzle,
    config,
    board,
    selectedPieceId,
    previewRotation,
    hoveredCell,
    setHoveredCell,
  } = engine;

  // Cell picker state (subscribed for reactivity)
  const isPickerActive = useRuleBuilderStore(s => s.cellPickerTarget !== null);
  const pickerCells = useRuleBuilderStore(s => s.cellPickerCells);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);

  // Observe container size for dynamic cell sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: cw, height: ch } = entry.contentRect;
      setContainerSize({ w: cw, h: ch });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height } = board.dimensions;

  // Dynamic cell size
  const cellSize = useMemo(() => {
    if (!containerSize) return SCENE_2D.defaultCellSize;
    const nonHints = puzzle?.nonogram_hints;
    const maxRow = nonHints ? Math.max(...nonHints.rows.map(r => r.length), 1) : 0;
    const maxCol = nonHints ? Math.max(...nonHints.columns.map(c => c.length), 1) : 0;
    const hintLeftPx = maxRow * HINT_CELL_SIZE;
    const hintTopPx = maxCol * HINT_CELL_SIZE;
    const availW = containerSize.w - PADDING * 2 - hintLeftPx;
    const availH = containerSize.h - PADDING * 2 - hintTopPx;
    const fitW = availW / width;
    const fitH = availH / height;
    return Math.max(SCENE_2D.minCellSize, Math.min(SCENE_2D.maxCellSize, Math.floor(Math.min(fitW, fitH))));
  }, [containerSize, width, height, puzzle?.nonogram_hints]);

  // Nonogram hint area dimensions
  const nonogramHints = puzzle?.nonogram_hints;
  const maxRowHints = nonogramHints ? Math.max(...nonogramHints.rows.map(r => r.length), 1) : 0;
  const maxColHints = nonogramHints ? Math.max(...nonogramHints.columns.map(c => c.length), 1) : 0;
  const hintsLeftWidth = maxRowHints * HINT_CELL_SIZE;
  const hintsTopHeight = maxColHints * HINT_CELL_SIZE;

  const svgWidth = hintsLeftWidth + width * cellSize + PADDING * 2;
  const svgHeight = hintsTopHeight + height * cellSize + PADDING * 2;

  // Blocked cells
  const blockedCells = useMemo(
    () => new Set(board.blockedCells.map(([x, y]) => `${x},${y}`)),
    [board.blockedCells],
  );

  // Per-cell paint colors from puzzle.board.cell_colors.
  const cellColorMap = useMemo(() => {
    const m = new Map<string, string>();
    const entries = puzzle?.board.cell_colors ?? [];
    for (const [x, y, color] of entries) m.set(`${x},${y}`, color);
    return m;
  }, [puzzle?.board.cell_colors]);

  // All interaction state and handlers
  const {
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
  } = useInteractions2D({ engine, blockedCells });

  // Drag-and-drop tracking: only commit on pointer-up if the pointer actually
  // moved past a small threshold since pointer-down. This distinguishes a
  // real drag from a stationary tap (where pointerup should not commit).
  const dragStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  // True only when the most recent press selected a placed piece via Piece2D.
  // The tap-vs-drag threshold is then applied so the selecting press doesn't
  // also fire a no-op move. For follow-up presses (e.g. pressing a cell while
  // an inventory tile or piece is already selected), this stays false and a
  // plain click commits.
  const pressSelectedRef = useRef(false);
  const DRAG_THRESHOLD_PX = 5;

  // Continuous drag visual: while a selected placed piece is being dragged
  // in dragNdrop mode, the piece's <g> is translated by the live pointer
  // delta (in SVG user units) so it follows the cursor smoothly. Cleared
  // on pointer-up, before commit, so the piece snaps directly to its new
  // cell without a slide-from-original animation.
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);

  const getSvgScale = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const rect = svg.getBoundingClientRect();
    const vbW = svg.viewBox.baseVal.width;
    return vbW > 0 && rect.width > 0 ? rect.width / vbW : 1;
  }, []);

  // Clear drag visual on any pointer release anywhere — even outside the
  // SVG — so the piece doesn't get stuck mid-translate if the user
  // releases off-board.
  useEffect(() => {
    if (!dragNdrop) return;
    const cancel = () => {
      setDragOffset(null);
    };
    window.addEventListener('pointerup', cancel);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointerup', cancel);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [dragNdrop]);

  // The whole stack lifts together: selected piece + everything stacked above it.
  const selectedStackIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedPlacedPiece) return ids;
    ids.add(selectedPlacedPiece.instanceId);
    findPiecesStackedOnTop(board, selectedPlacedPiece).forEach(id => ids.add(id));
    return ids;
  }, [selectedPlacedPiece, board]);

  // Pieces whose cells overlap any failing rule's affectedCells, when
  // puzzle.highlight_failing_cells is on. Drawn with a red outline so the
  // failure is visible even when a piece covers the affected cell.
  const invalidPieceIds = useMemo(() => {
    const ids = new Set<string>();
    if (!puzzle?.highlight_failing_cells) return ids;
    const invalidCellSet = new Set<string>();
    for (const r of engine.validationResults) {
      if (r.isValid || !r.affectedCells) continue;
      for (const [x, y] of r.affectedCells) invalidCellSet.add(`${x},${y}`);
    }
    if (invalidCellSet.size === 0) return ids;
    for (const p of board.placedPieces) {
      const cells = getPieceCells(p);
      if (cells.some(([x, y]) => invalidCellSet.has(`${x},${y}`))) {
        ids.add(p.instanceId);
      }
    }
    return ids;
  }, [puzzle?.highlight_failing_cells, engine.validationResults, board.placedPieces]);

  // Stable cell-level callbacks via useCallback to keep GridCell memo effective.
  // We pass x/y through closures created at render time which is fine because
  // GridCell already receives primitive props for memo comparison.
  const onCellPointerEnter = useCallback(
    (x: number, y: number) => setHoveredCell({ x, y }),
    [setHoveredCell],
  );
  const onCellPointerLeave = useCallback(
    () => setHoveredCell(null),
    [setHoveredCell],
  );

  // Whether this puzzle is a slider type (has goal)
  const isSliderPuzzle = config.movementRule === 'SLIDING_ONLY';

  // Show rotate button when an inventory piece is selected (for mobile users)
  const showRotateButton = !!selectedInventoryPiece || !!selectedPlacedPiece;

  if (!puzzle) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-editor-bg">
        <span className="text-gray-400">No puzzle loaded</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full h-full flex items-center justify-center ${className}`} style={{ background: C.background }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: svgWidth, maxHeight: svgHeight, touchAction: 'none' }}
        role="grid"
        aria-label={`${puzzle.title ?? 'Puzzle'} board, ${width} columns by ${height} rows`}
        tabIndex={0}
      >
        {/* SVG Definitions - filters, gradients, patterns */}
        <SvgDefs pieces={board.placedPieces} inventoryColors={puzzle.inventory.map(p => p.color)} cellSize={cellSize} />

        {/* Background with radial gradient */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="url(#bg-gradient)" />

        {/* Vignette overlay */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="url(#bg-gradient)" opacity="0.3" />

        {/* Nonogram hints */}
        {nonogramHints && (
          <g transform={`translate(${PADDING}, ${PADDING})`}>
            <NonogramHintsDisplay
              hints={nonogramHints}
              cellSize={cellSize}
              boardWidth={width}
              boardHeight={height}
              hintsLeftWidth={hintsLeftWidth}
              hintsTopHeight={hintsTopHeight}
            />
          </g>
        )}

        {/* Main board area */}
        <g
          transform={`translate(${PADDING + hintsLeftWidth}, ${PADDING + hintsTopHeight})`}
          onPointerDown={dragNdrop ? (e) => {
            dragStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
          } : undefined}
          onPointerMove={dragNdrop ? (e) => {
            const start = dragStartRef.current;
            if (!start || start.pointerId !== e.pointerId) return;
            // dragOffset is applied to whichever placed piece is the
            // current selection (via isInSelectedStack on the piece). If no
            // piece is selected yet (e.g. the selection from pointer-down
            // hasn't propagated), the offset just isn't used yet — it
            // takes effect as soon as the selected piece renders.
            const scale = getSvgScale();
            setDragOffset({
              dx: (e.clientX - start.x) / scale,
              dy: (e.clientY - start.y) / scale,
            });
          } : undefined}
          onPointerUp={dragNdrop ? (e) => {
            const start = dragStartRef.current;
            const wasPressSelect = pressSelectedRef.current;
            dragStartRef.current = null;
            pressSelectedRef.current = false;
            // Clear drag translation before committing so the piece snaps to
            // its new cell on the next render instead of sliding from the
            // original cell to the new one.
            setDragOffset(null);
            // The tap-vs-drag threshold only applies when this press is the
            // one that selected a piece — otherwise a follow-up click on a
            // cell (e.g. after clicking an inventory tile) would be rejected
            // as "just a tap" and never commit the placement. If pointer-down
            // was outside the SVG entirely (inventory HTML → SVG drop),
            // `start` is null and we commit unconditionally as before.
            if (start && wasPressSelect && start.pointerId === e.pointerId) {
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              const moved = Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD_PX;
              if (!moved) return; // simple tap — selection only, no commit
            }
            if (!hoveredCell) return; // released off-board
            handleCellPointerUp(hoveredCell.x, hoveredCell.y);
          } : undefined}
        >
          {/* Board background with gradient and shadow */}
          <rect
            x={-6}
            y={-6}
            width={width * cellSize + 12}
            height={height * cellSize + 12}
            rx={10}
            fill="url(#board-gradient)"
            filter="url(#board-shadow)"
          />

          {/* Board border accent */}
          <rect
            x={-6}
            y={-6}
            width={width * cellSize + 12}
            height={height * cellSize + 12}
            rx={10}
            fill="none"
            stroke={C.boardBorder}
            strokeWidth={1}
            opacity={0.5}
          />

          {/* Grid cells */}
          {Array.from({ length: width }, (_, x) =>
            Array.from({ length: height }, (_, y) => {
              const key = `${x},${y}`;
              const isBlocked = blockedCells.has(key);
              const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
              const isInvalid = invalidCells.has(key);
              const isValidDest = validDestinations.has(key);
              const isPickerSel = isPickerActive && pickerCells.has(key);

              return (
                <GridCell
                  key={key}
                  x={x}
                  y={y}
                  cellSize={cellSize}
                  isBlocked={isBlocked}
                  isHovered={isHovered && !selectedPlacedPiece}
                  isInvalid={isInvalid}
                  isValidDestination={isValidDest}
                  isPickerSelected={isPickerSel}
                  paintColor={cellColorMap.get(key)}
                  onClick={() => handleCellClick(x, y)}
                  onPointerEnter={() => onCellPointerEnter(x, y)}
                  onPointerLeave={onCellPointerLeave}
                />
              );
            })
          )}

          {/* Placed pieces */}
          {board.placedPieces.map(piece => {
            const isClickedPiece = selectedPieceId === piece.instanceId;
            const isInSelectedStack = selectedStackIds.has(piece.instanceId);
            const isHovered = hoveredPieceId === piece.instanceId;
            // lock_pieces disables direct user interaction with pieces — the
            // board can only be changed via puzzle.moves[] in that mode.
            // In dragNdrop mode, only the selected stack passes pointer
            // events through so cells underneath can track hover during the
            // drag; other pieces stay interactive so pressing a different
            // one switches selection.
            const piecesLocked = puzzle?.lock_pieces ?? false;
            const isInteractive = !piecesLocked && (dragNdrop
              ? !isInSelectedStack
              : !selectedInventoryPiece && !selectedPlacedPiece);
            const isPieceInvalid = invalidPieceIds.has(piece.instanceId);

            const pieceValidMoves = isClickedPiece && config.movementRule === 'SLIDING_ONLY'
              ? getValidSlideDestinations(board, piece)
              : [];

            return (
              <Piece2D
                key={piece.instanceId}
                piece={piece}
                cellSize={cellSize}
                isSelected={isInSelectedStack}
                isInvalid={isPieceInvalid}
                isHovered={isHovered}
                interactive={isInteractive}
                isSliderPuzzle={isSliderPuzzle}
                hasValidMoves={pieceValidMoves.length > 0}
                dragOffset={isInSelectedStack ? dragOffset : null}
                disableSlideAnim={dragNdrop}
                onClick={() => {
                  // Piece2D wires its onPointerDown to this callback. Mark
                  // the gesture as "press-selected" so the scene-group's
                  // pointer-up applies the tap-vs-drag threshold (no spurious
                  // move from the selecting press).
                  if (dragNdrop) pressSelectedRef.current = true;
                  handlePieceClick(piece);
                }}
                onPointerEnter={() => setHoveredPieceId(piece.instanceId)}
                onPointerLeave={() => setHoveredPieceId(null)}
              />
            );
          })}

          {/* Ghost preview for inventory placement */}
          {selectedInventoryPiece && hoveredCell && (
            <GhostPiece2D
              shape={selectedInventoryPiece.shape}
              color={selectedInventoryPiece.color}
              rotation={previewRotation}
              position={hoveredCell}
              cellSize={cellSize}
              isValid={isGhostValid}
            />
          )}

          {/* Goal area overlay */}
          {puzzle.goal && !puzzle.goal.hideGoalVisualization && goalAreaCells.size > 0 && (
            <GoalOverlay2D
              goalCells={goalAreaCells}
              cellSize={cellSize}
              allCells={puzzle.goal.cells ?? []}
            />
          )}

          {/* On-screen rotate button (for mobile users) */}
          {showRotateButton && (
            <g
              transform={`translate(${width * cellSize - 36}, ${height * cellSize - 36})`}
              onPointerDown={(e) => { e.stopPropagation(); handleRotate(); }}
              style={{ cursor: 'pointer', touchAction: 'none' }}
            >
              <circle cx="16" cy="16" r="16" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              {/* Rotation arrow icon */}
              <path
                d="M16 8 A8 8 0 1 1 8 16"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <polygon points="16,6 18,10 14,10" fill="white" />
              <text x="16" y="28" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="monospace">R</text>
            </g>
          )}

          {/* Move counter for slider puzzles */}
          {isSliderPuzzle && (
            <g transform={`translate(${width * cellSize - 80}, 4)`}>
              <rect x="0" y="0" width="76" height="20" rx="4" fill="rgba(0,0,0,0.5)" />
              <text x="38" y="14" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="11" fontFamily="monospace" fontWeight="bold">
                Moves: {engine.moveCount}
              </text>
            </g>
          )}
        </g>

        {/* View mode indicator */}
        <text
          x={PADDING}
          y={svgHeight - 8}
          fill="rgba(255,255,255,0.25)"
          fontSize="10"
          fontFamily="monospace"
        >
          2D View
          {puzzle.goal && ' \u2022 Slider Puzzle'}
        </text>
      </svg>
    </div>
  );
}
