/**
 * Renderer2D - 2D Puzzle Renderer
 * 
 * Renders puzzles in a 2D view using SVG. This renderer is completely
 * independent of Three.js and works purely with the engine state.
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import type { UsePuzzleEngineReturn, PlacedPiece, Coordinate2D } from '../../engine';
import { rotateShape, getPieceCells, getValidSlideDestinations } from '../../engine';
import { SHAPE_LIBRARY } from '../../types/puzzle';

interface Renderer2DProps {
  engine: UsePuzzleEngineReturn;
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const CELL_SIZE = 60;
const CELL_GAP = 2;
const PADDING = 20;
const STUD_RADIUS = 8;
const BRICK_OUTER_INSET = 2; // Inset from cell edges for brick body and borders
const SELECTION_Y_OFFSET = 4; // Vertical lift when brick is selected

// ============================================
// HELPER COMPONENTS
// ============================================

interface GridCellProps {
  x: number;
  y: number;
  cellSize: number;
  isBlocked: boolean;
  isHovered: boolean;
  isInvalid: boolean;
  isValidDestination: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function GridCell({
  x,
  y,
  cellSize,
  isBlocked,
  isHovered,
  isInvalid,
  isValidDestination,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GridCellProps) {
  const baseColor = isBlocked ? '#4a4a4a' : '#5a5a5a';
  const hoverColor = isValidDestination ? '#4a8f4a' : '#4a6fa5';
  const invalidColor = '#8b3a3a';

  const fillColor = isInvalid ? invalidColor : isHovered || isValidDestination ? hoverColor : baseColor;

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: isBlocked ? 'not-allowed' : 'pointer' }}
    >
      {/* Cell background */}
      <rect
        x={x * cellSize + CELL_GAP / 2}
        y={y * cellSize + CELL_GAP / 2}
        width={cellSize - CELL_GAP}
        height={cellSize - CELL_GAP}
        rx={4}
        fill={fillColor}
        stroke={isHovered ? '#58A6FF' : 'none'}
        strokeWidth={isHovered ? 2 : 0}
      />

      {/* Stud */}
      {!isBlocked && (
        <>
          <circle
            cx={x * cellSize + cellSize / 2}
            cy={y * cellSize + cellSize / 2}
            r={STUD_RADIUS}
            fill="#333"
          />
          <circle
            cx={x * cellSize + cellSize / 2 - 2}
            cy={y * cellSize + cellSize / 2 - 2}
            r={STUD_RADIUS * 0.3}
            fill="rgba(255,255,255,0.1)"
          />
        </>
      )}

      {/* Valid destination indicator */}
      {isValidDestination && (
        <circle
          cx={x * cellSize + cellSize / 2}
          cy={y * cellSize + cellSize / 2}
          r={cellSize / 3}
          fill="none"
          stroke="#4ade80"
          strokeWidth={2}
          strokeDasharray="4,4"
          opacity={0.6}
        />
      )}

      {/* Goal area indicator removed - shown in main overlay instead */}
    </g>
  );
}

interface PieceProps {
  piece: PlacedPiece;
  cellSize: number;
  isSelected: boolean;
  isHovered: boolean;
  interactive: boolean;
  isSliderPuzzle: boolean;
  hasValidMoves: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

// Helper function to get outer edge segments for brick border rendering
// Returns an array of line segments that form the outer boundary of the piece
function getOuterEdgeSegments(cells: [number, number][], cellSize: number, yOffset: number = 0, outerInset: number = BRICK_OUTER_INSET): {
  x1: number; y1: number; x2: number; y2: number;
}[] {
  const cellSet = new Set(cells.map(([x, y]) => `${x},${y}`));
  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const [x, y] of cells) {
    const left = x * cellSize + outerInset;
    const right = (x + 1) * cellSize - outerInset;
    const top = y * cellSize + outerInset + yOffset;
    const bottom = (y + 1) * cellSize - outerInset + yOffset;

    // Only draw edges that face outward (no neighbor on that side)
    if (!cellSet.has(`${x},${y - 1}`)) {
      segments.push({ x1: left, y1: top, x2: right, y2: top }); // Top edge
    }
    if (!cellSet.has(`${x},${y + 1}`)) {
      segments.push({ x1: left, y1: bottom, x2: right, y2: bottom }); // Bottom edge
    }
    if (!cellSet.has(`${x - 1},${y}`)) {
      segments.push({ x1: left, y1: top, x2: left, y2: bottom }); // Left edge
    }
    if (!cellSet.has(`${x + 1},${y}`)) {
      segments.push({ x1: right, y1: top, x2: right, y2: bottom }); // Right edge
    }
  }

  return segments;
}


function Piece2D({
  piece,
  cellSize,
  isSelected,
  isHovered,
  interactive,
  isSliderPuzzle,
  hasValidMoves,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PieceProps) {
  const cells = useMemo(() => getPieceCells(piece), [piece]);
  const cellSet = useMemo(() => new Set(cells.map(([x, y]) => `${x},${y}`)), [cells]);

  const glowColor = isSelected ? '#58A6FF' : '#ffffff';
  const glowOpacity = isSelected ? 0.5 : isHovered ? 0.3 : 0;

  // Get outer edge segments for border rendering
  const outerEdges = useMemo(() => {
    return getOuterEdgeSegments(cells, cellSize, isSelected ? -SELECTION_Y_OFFSET : 0, BRICK_OUTER_INSET);
  }, [cells, cellSize, isSelected]);

  // Darker border color based on piece color for strong 3D effect
  const borderColor = useMemo(() => {
    const hex = piece.color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 80);
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 80);
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 80);
    return `rgb(${r},${g},${b})`;
  }, [piece.color]);

  // When not interactive, let mouse events pass through to the grid cells beneath
  const shouldPassThrough = !interactive;

  // Check if a cell has a neighbor in a direction
  const hasNeighbor = (x: number, y: number, dx: number, dy: number) => {
    return cellSet.has(`${x + dx},${y + dy}`);
  };

  return (
    <g
      onClick={interactive ? onClick : undefined}
      onMouseEnter={interactive ? onMouseEnter : undefined}
      onMouseLeave={interactive ? onMouseLeave : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
      pointerEvents={shouldPassThrough ? 'none' : undefined}
    >
      {/* Shadow when selected - draw shadow rectangles for each cell */}
      {isSelected && cells.map(([x, y], i) => {
        const hasLeft = hasNeighbor(x, y, -1, 0);
        const hasRight = hasNeighbor(x, y, 1, 0);
        const hasTop = hasNeighbor(x, y, 0, -1);
        const hasBottom = hasNeighbor(x, y, 0, 1);
        const inset = BRICK_OUTER_INSET;
        const left = hasLeft ? x * cellSize : x * cellSize + inset;
        const right = hasRight ? (x + 1) * cellSize : (x + 1) * cellSize - inset;
        const top = hasTop ? y * cellSize + SELECTION_Y_OFFSET : y * cellSize + inset + SELECTION_Y_OFFSET;
        const bottom = hasBottom ? (y + 1) * cellSize + SELECTION_Y_OFFSET : (y + 1) * cellSize - inset + SELECTION_Y_OFFSET;
        return (
          <rect
            key={`shadow-${i}`}
            x={left}
            y={top}
            width={right - left}
            height={bottom - top}
            fill="rgba(0,0,0,0.3)"
          />
        );
      })}

      {/* Connected brick body - fills cells seamlessly with neighbors */}
      {cells.map(([x, y], i) => {
        const yOff = isSelected ? -SELECTION_Y_OFFSET : 0;
        // Calculate rectangle that extends to meet neighbors (no gap between same-brick cells)
        const hasLeft = hasNeighbor(x, y, -1, 0);
        const hasRight = hasNeighbor(x, y, 1, 0);
        const hasTop = hasNeighbor(x, y, 0, -1);
        const hasBottom = hasNeighbor(x, y, 0, 1);

        // Extend towards neighbors to fill gaps
        const inset = BRICK_OUTER_INSET; // Small inset for outer edges
        const left = hasLeft ? x * cellSize : x * cellSize + inset;
        const right = hasRight ? (x + 1) * cellSize : (x + 1) * cellSize - inset;
        const top = hasTop ? y * cellSize + yOff : y * cellSize + inset + yOff;
        const bottom = hasBottom ? (y + 1) * cellSize + yOff : (y + 1) * cellSize - inset + yOff;

        return (
          <rect
            key={`body-${i}`}
            x={left}
            y={top}
            width={right - left}
            height={bottom - top}
            fill={piece.color}
            filter={isSelected ? 'url(#glow)' : undefined}
          />
        );
      })}

      {/* Strong outline around the entire brick shape - using individual line segments */}
      <g pointerEvents="none">
        {outerEdges.map((edge, i) => (
          <line
            key={`edge-${i}`}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke={isSelected || isHovered ? glowColor : borderColor}
            strokeWidth={isSelected || isHovered ? 4 : 3}
            strokeLinecap="square"
            opacity={isSelected || isHovered ? glowOpacity + 0.6 : 1}
          />
        ))}
      </g>

      {/* Studs on each cell */}
      {cells.map(([x, y], i) => (
        <g key={`stud-${i}`}>
          <circle
            cx={x * cellSize + cellSize / 2}
            cy={y * cellSize + cellSize / 2 - (isSelected ? SELECTION_Y_OFFSET : 0)}
            r={STUD_RADIUS}
            fill={piece.color}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
          />

          {/* Stud highlight */}
          <circle
            cx={x * cellSize + cellSize / 2 - 2}
            cy={y * cellSize + cellSize / 2 - 2 - (isSelected ? 4 : 0)}
            r={STUD_RADIUS * 0.4}
            fill="rgba(255,255,255,0.2)"
          />
        </g>
      ))}


      {/* Selection indicator */}
      {isSelected && (
        <g>
          {/* Piece ID label - prominently displayed for puzzle designers */}
          <text
            x={cells[0][0] * cellSize + cellSize / 2}
            y={cells[0][1] * cellSize - 22}
            textAnchor="middle"
            fill="#fbbf24"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ID: {piece.id}
          </text>
          {/* Hint text */}
          <text
            x={cells[0][0] * cellSize + cellSize / 2}
            y={cells[0][1] * cellSize - 8}
            textAnchor="middle"
            fill={isSliderPuzzle && !hasValidMoves ? '#ef4444' : '#58A6FF'}
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isSliderPuzzle
              ? (hasValidMoves ? 'Click destination' : 'No valid moves!')
              : 'Click to move'
            }
          </text>
        </g>
      )}
    </g>
  );
}

interface GhostPieceProps {
  shape: string;
  color: string;
  rotation: number;
  position: { x: number; y: number };
  cellSize: number;
  isValid: boolean;
}

function GhostPiece2D({
  shape,
  color,
  rotation,
  position,
  cellSize,
  isValid,
}: GhostPieceProps) {
  const shapeDef = SHAPE_LIBRARY[shape];
  if (!shapeDef) return null;

  const cells = useMemo(() => {
    const rotated = rotateShape(shapeDef.cells, rotation);
    return rotated.map(([dx, dy]) => [position.x + dx, position.y + dy] as Coordinate2D);
  }, [shapeDef, rotation, position]);

  return (
    <g opacity={0.6} pointerEvents="none">
      {cells.map(([x, y], i) => (
        <rect
          key={i}
          x={x * cellSize + CELL_GAP}
          y={y * cellSize + CELL_GAP}
          width={cellSize - CELL_GAP * 2}
          height={cellSize - CELL_GAP * 2}
          rx={4}
          fill={isValid ? color : '#ff4444'}
          stroke={isValid ? 'rgba(255,255,255,0.3)' : '#ff0000'}
          strokeWidth={2}
          strokeDasharray={isValid ? 'none' : '4,4'}
        />
      ))}
    </g>
  );
}

// ============================================
// MAIN RENDERER
// ============================================

export function Renderer2D({ engine, className = '' }: Renderer2DProps) {
  const {
    puzzle,
    config,
    board,
    selectedPieceId,
    previewRotation,
    hoveredCell,
    validationResults,
    placePiece,
    removePiece,
    movePiece,
    rotatePiece,
    selectPiece,
    rotatePreview,
    setHoveredCell,
  } = engine;

  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);

  const { width, height } = board.dimensions;
  const cellSize = CELL_SIZE;
  const svgWidth = width * cellSize + PADDING * 2;
  const svgHeight = height * cellSize + PADDING * 2;

  // Get invalid cells from validation (skip certain rules that shouldn't show as red errors)
  const invalidCells = useMemo(() => {
    const cells = new Set<string>();
    for (const result of validationResults) {
      // Skip GOAL_REACHED - goal area is shown with dotted border, not red background
      if (result.rule === 'GOAL_REACHED') continue;
      // Skip ALL_BOARD_SQUARES_MUST_BE_COVERED - uncovered cells are not "errors", 
      // they're just cells that need to be filled. Showing all cells as red is confusing.
      if (result.rule === 'ALL_BOARD_SQUARES_MUST_BE_COVERED') continue;
      // Skip PATTERN_MATCH - cells that need the correct color aren't errors, just incomplete
      if (result.rule === 'PATTERN_MATCH') continue;

      if (!result.isValid && result.affectedCells) {
        for (const [x, y] of result.affectedCells) {
          cells.add(`${x},${y}`);
        }
      }
    }
    return cells;
  }, [validationResults]);


  // Get blocked cells
  const blockedCells = useMemo(() => {
    return new Set(board.blockedCells.map(([x, y]) => `${x},${y}`));
  }, [board.blockedCells]);

  // Find selected piece (placed or inventory)
  const selectedPlacedPiece = useMemo(() => {
    return board.placedPieces.find(p => p.instanceId === selectedPieceId);
  }, [board.placedPieces, selectedPieceId]);

  const selectedInventoryPiece = useMemo(() => {
    if (selectedPlacedPiece) return null;
    return puzzle?.inventory.find(p => p.id === selectedPieceId);
  }, [puzzle, selectedPieceId, selectedPlacedPiece]);

  // Get valid slide destinations for selected placed piece
  // Shows ALL cells that would be covered by valid slide positions
  const validDestinations = useMemo(() => {
    if (!selectedPlacedPiece || config.movementRule !== 'SLIDING_ONLY') {
      return new Set<string>();
    }

    const destinations = getValidSlideDestinations(board, selectedPlacedPiece);
    const shapeDef = SHAPE_LIBRARY[selectedPlacedPiece.shape];

    if (!shapeDef) {
      return new Set(destinations.map(([x, y]) => `${x},${y}`));
    }

    // Get all cells that would be covered by ANY valid destination
    const allValidCells = new Set<string>();
    const rotatedCells = rotateShape(shapeDef.cells, selectedPlacedPiece.rotation);

    for (const [destX, destY] of destinations) {
      for (const [dx, dy] of rotatedCells) {
        allValidCells.add(`${destX + dx},${destY + dy}`);
      }
    }

    return allValidCells;
  }, [selectedPlacedPiece, board, config.movementRule]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        if (selectedPlacedPiece) {
          rotatePiece(selectedPlacedPiece.instanceId);
        } else if (selectedInventoryPiece) {
          rotatePreview();
        }
      } else if (e.code === 'Escape') {
        selectPiece(null);
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && selectedPlacedPiece) {
        removePiece(selectedPlacedPiece.instanceId);
        selectPiece(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlacedPiece, selectedInventoryPiece, rotatePiece, rotatePreview, selectPiece, removePiece]);

  // Cell click handler
  const handleCellClick = useCallback((x: number, y: number) => {
    console.log('[Renderer2D] Cell clicked:', { x, y, selectedPlacedPiece: selectedPlacedPiece?.instanceId, movementRule: config.movementRule });

    if (blockedCells.has(`${x},${y}`)) {
      console.log('[Renderer2D] Cell is blocked');
      return;
    }

    // If we have a placed piece selected, try to move it
    if (selectedPlacedPiece) {
      // Clicking on the piece's current position deselects it
      const currentCells = getPieceCells(selectedPlacedPiece);
      const clickedOnSelf = currentCells.some(([cx, cy]) => cx === x && cy === y);
      if (clickedOnSelf) {
        console.log('[Renderer2D] Clicked on self, deselecting');
        selectPiece(null);
        return;
      }

      // For slider puzzles, find which valid destination would cover the clicked cell
      if (config.movementRule === 'SLIDING_ONLY') {
        console.log('[Renderer2D] Slider mode - checking valid destinations');
        const validDests = getValidSlideDestinations(board, selectedPlacedPiece);
        const shapeDef = SHAPE_LIBRARY[selectedPlacedPiece.shape];

        if (shapeDef) {
          const rotatedCells = rotateShape(shapeDef.cells, selectedPlacedPiece.rotation);

          // Find a valid destination where the piece would cover the clicked cell
          const matchingDest = validDests.find(([destX, destY]) => {
            return rotatedCells.some(([dx, dy]) =>
              destX + dx === x && destY + dy === y
            );
          });

          if (matchingDest) {
            console.log('[Renderer2D] Moving piece to valid destination:', matchingDest);
            movePiece(selectedPlacedPiece.instanceId, { x: matchingDest[0], y: matchingDest[1], z: 0 });
            selectPiece(null);
            return;
          }
        }
      } else {
        // Free placement mode - move to clicked column
        // For pieces with height, we need to position at y=0 of the target column
        // to ensure the piece fits within bounds
        const shapeDef = SHAPE_LIBRARY[selectedPlacedPiece.shape];
        if (shapeDef) {
          // Calculate the piece's shape bounds
          const rotatedCells = rotateShape(shapeDef.cells, selectedPlacedPiece.rotation);
          const minY = Math.min(...rotatedCells.map(([, dy]) => dy));

          // Adjust y position so the piece starts at row 0 regardless of where clicked
          const adjustedY = 0 - minY;

          console.log('[Renderer2D] Free placement mode - moving piece to column:', x, 'at y:', adjustedY);
          const success = movePiece(selectedPlacedPiece.instanceId, { x, y: adjustedY, z: 0 });
          console.log('[Renderer2D] Move result:', success);
          if (!success) {
            // If move failed, deselect anyway to give feedback
            console.log('[Renderer2D] Move failed - possibly overlap or out of bounds');
          }
        } else {
          // Fallback for pieces without shapes
          console.log('[Renderer2D] Free placement mode - moving piece to:', { x, y });
          const success = movePiece(selectedPlacedPiece.instanceId, { x, y, z: 0 });
          console.log('[Renderer2D] Move result:', success);
        }
        selectPiece(null);
      }
      return;
    }

    // If we have an inventory piece selected, place it
    if (selectedInventoryPiece) {
      console.log('[Renderer2D] Placing inventory piece');
      // Check remaining count BEFORE placing - if more than 1 remains, keep selected for continuous placement
      const remainingCount = engine.inventory.get(selectedInventoryPiece.id) ?? 0;
      const keepSelected = remainingCount > 1;

      placePiece(selectedInventoryPiece.id, { x, y, z: 0 }, previewRotation);

      // Only deselect if this was the last brick of this type
      if (!keepSelected) {
        selectPiece(null);
      }
    }
  }, [selectedPlacedPiece, selectedInventoryPiece, previewRotation, placePiece, movePiece, selectPiece, blockedCells, config.movementRule, board]);

  // Piece click handler
  const handlePieceClick = useCallback((piece: PlacedPiece) => {
    console.log('[Renderer2D] Piece clicked:', piece.instanceId, 'current selection:', selectedPieceId);
    if (selectedPieceId === piece.instanceId) {
      selectPiece(null);
    } else {
      selectPiece(piece.instanceId);
    }
  }, [selectedPieceId, selectPiece]);

  // Check if ghost is valid
  const isGhostValid = useMemo(() => {
    if (!selectedInventoryPiece || !hoveredCell) return false;

    const shapeDef = SHAPE_LIBRARY[selectedInventoryPiece.shape];
    if (!shapeDef) return false;

    const rotatedCells = rotateShape(shapeDef.cells, previewRotation);

    for (const [dx, dy] of rotatedCells) {
      const x = hoveredCell.x + dx;
      const y = hoveredCell.y + dy;

      // Check bounds
      if (x < 0 || x >= width || y < 0 || y >= height) return false;

      // Check blocked
      if (blockedCells.has(`${x},${y}`)) return false;

      // Check overlap with placed pieces
      for (const placed of board.placedPieces) {
        const placedCells = getPieceCells(placed);
        if (placedCells.some(([px, py]) => px === x && py === y)) {
          return false;
        }
      }
    }

    return true;
  }, [selectedInventoryPiece, hoveredCell, previewRotation, width, height, blockedCells, board.placedPieces]);

  // Calculate goal area cells (for slider puzzles)
  const goalAreaCells = useMemo(() => {
    if (!puzzle?.goal?.cells) return new Set<string>();

    // Goal cells are now explicitly defined
    return new Set(puzzle.goal.cells.map(([x, y]) => `${x},${y}`));
  }, [puzzle]);

  if (!puzzle) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-editor-bg">
        <span className="text-gray-400">No puzzle loaded</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center bg-editor-bg ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: svgWidth, maxHeight: svgHeight }}
      >
        {/* Definitions */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <rect width={cellSize} height={cellSize} fill="none" stroke="#333" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#0a0a0a" />

        {/* Main board area */}
        <g transform={`translate(${PADDING}, ${PADDING})`}>
          {/* Board background */}
          <rect
            x={-4}
            y={-4}
            width={width * cellSize + 8}
            height={height * cellSize + 8}
            rx={8}
            fill="#1a1a1a"
          />

          {/* Grid cells */}
          {Array.from({ length: width }, (_, x) =>
            Array.from({ length: height }, (_, y) => {
              const key = `${x},${y}`;
              const isBlocked = blockedCells.has(key);
              const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
              const isInvalid = invalidCells.has(key);
              const isValidDest = validDestinations.has(key);

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
                  onClick={() => handleCellClick(x, y)}
                  onMouseEnter={() => setHoveredCell({ x, y })}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              );
            })
          )}

          {board.placedPieces.map(piece => {
            const isSelected = selectedPieceId === piece.instanceId;
            const isHovered = hoveredPieceId === piece.instanceId;
            // Pieces are only interactive when NO piece is selected (so we can click to select one)
            // Once a piece is selected, all pieces become non-interactive so grid cells receive clicks
            const isInteractive = !selectedInventoryPiece && !selectedPlacedPiece;

            // Calculate if this piece has valid moves (for slider puzzles)
            const pieceValidMoves = isSelected && config.movementRule === 'SLIDING_ONLY'
              ? getValidSlideDestinations(board, piece)
              : [];

            return (
              <Piece2D
                key={piece.instanceId}
                piece={piece}
                cellSize={cellSize}
                isSelected={isSelected}
                isHovered={isHovered}
                interactive={isInteractive}
                isSliderPuzzle={config.movementRule === 'SLIDING_ONLY'}
                hasValidMoves={pieceValidMoves.length > 0}
                onClick={() => handlePieceClick(piece)}
                onMouseEnter={() => setHoveredPieceId(piece.instanceId)}
                onMouseLeave={() => setHoveredPieceId(null)}
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

          {/* Goal area overlay (for slider puzzles) */}
          {puzzle.goal && !puzzle.goal.hideGoalVisualization && (
            <g>
              {/* Goal position indicator */}
              {Array.from(goalAreaCells).map((key) => {
                const [x, y] = key.split(',').map(Number);
                return (
                  <rect
                    key={`goal-${key}`}
                    x={x * cellSize + 2}
                    y={y * cellSize + 2}
                    width={cellSize - 4}
                    height={cellSize - 4}
                    rx={4}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={3}
                    strokeDasharray="8,4"
                    opacity={0.7}
                    pointerEvents="none"
                  />
                );
              })}
              {/* Goal label - position at center of goal area */}
              {puzzle.goal.cells && puzzle.goal.cells.length > 0 && (
                <text
                  x={(Math.min(...puzzle.goal.cells.map(c => c[0])) + Math.max(...puzzle.goal.cells.map(c => c[0])) + 1) / 2 * cellSize}
                  y={Math.min(...puzzle.goal.cells.map(c => c[1])) * cellSize - 8}
                  fill="#22c55e"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  🎯 GOAL
                </text>
              )}
            </g>
          )}
        </g>

        {/* View mode indicator */}
        <text
          x={PADDING}
          y={svgHeight - 8}
          fill="#666"
          fontSize="10"
          fontFamily="monospace"
        >
          2D View
          {puzzle.goal && ' • Slider Puzzle'}
        </text>
      </svg>
    </div>
  );
}

