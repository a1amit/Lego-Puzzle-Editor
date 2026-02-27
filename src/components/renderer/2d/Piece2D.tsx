/**
 * Piece2D - Placed piece and ghost-preview rendering for the 2D renderer.
 */

import { memo, useMemo } from 'react';
import type { PlacedPiece, Coordinate2D } from '../../../engine';
import { rotateShape, getPieceCells } from '../../../engine';
import { SHAPE_LIBRARY } from '../../../types/puzzle';
import {
  darken,
  STUD_RADIUS,
  BRICK_OUTER_INSET,
  SELECTION_Y_OFFSET,
  CELL_GAP,
  C,
  getOuterEdgeSegments,
  getTopEdgeSegments,
} from './styles2D';

// ============================================
// Piece2D (placed piece on the board)
// ============================================

export interface PieceProps {
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

export const Piece2D = memo(function Piece2D({
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

  const yOff = isSelected ? -SELECTION_Y_OFFSET : 0;
  const gradId = `url(#piece-grad-${piece.color.replace('#', '')})`;
  const studGradId = `url(#stud-grad-${piece.color.replace('#', '')})`;

  const outerEdges = useMemo(
    () => getOuterEdgeSegments(cells, cellSize, yOff, BRICK_OUTER_INSET),
    [cells, cellSize, yOff],
  );

  const topEdges = useMemo(
    () => getTopEdgeSegments(cells, cellSize, yOff, BRICK_OUTER_INSET),
    [cells, cellSize, yOff],
  );

  const borderColor = useMemo(() => darken(piece.color, 70), [piece.color]);

  const hasNeighbor = (x: number, y: number, dx: number, dy: number) =>
    cellSet.has(`${x + dx},${y + dy}`);

  const filter = isSelected
    ? 'url(#piece-shadow-selected)'
    : isHovered
      ? 'url(#hover-glow)'
      : 'url(#piece-shadow)';

  const shouldPassThrough = !interactive;

  return (
    <g
      onClick={interactive ? onClick : undefined}
      onMouseEnter={interactive ? onMouseEnter : undefined}
      onMouseLeave={interactive ? onMouseLeave : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
      pointerEvents={shouldPassThrough ? 'none' : undefined}
      filter={filter}
    >
      {/* Connected brick body with gradient fill */}
      {cells.map(([x, y], i) => {
        const hasLeft = hasNeighbor(x, y, -1, 0);
        const hasRight = hasNeighbor(x, y, 1, 0);
        const hasTop = hasNeighbor(x, y, 0, -1);
        const hasBottom = hasNeighbor(x, y, 0, 1);

        const inset = BRICK_OUTER_INSET;
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
            fill={gradId}
          />
        );
      })}

      {/* Dark border around the entire brick shape */}
      <g pointerEvents="none">
        {outerEdges.map((edge, i) => (
          <line
            key={`edge-${i}`}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke={isSelected ? C.selectionGlow : borderColor}
            strokeWidth={isSelected ? 3.5 : isHovered ? 3 : 2.5}
            strokeLinecap="square"
            opacity={isSelected ? 0.9 : 1}
          />
        ))}
      </g>

      {/* Top-edge highlight shine */}
      <g pointerEvents="none">
        {topEdges.map((edge, i) => (
          <line
            key={`shine-${i}`}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* Studs on each cell */}
      {cells.map(([x, y], i) => {
        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2 + yOff;
        return (
          <g key={`stud-${i}`}>
            <circle
              cx={centerX}
              cy={centerY}
              r={STUD_RADIUS}
              fill={studGradId}
              stroke={darken(piece.color, 50)}
              strokeWidth={1.2}
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={STUD_RADIUS * 0.72}
              fill="none"
              stroke="rgba(0,0,0,0.12)"
              strokeWidth={0.8}
            />
            <ellipse
              cx={centerX - STUD_RADIUS * 0.22}
              cy={centerY - STUD_RADIUS * 0.25}
              rx={STUD_RADIUS * 0.35}
              ry={STUD_RADIUS * 0.28}
              fill="rgba(255,255,255,0.3)"
            />
          </g>
        );
      })}

      {/* Selection glow outline */}
      {isSelected && (
        <g pointerEvents="none" filter="url(#selection-glow)">
          {outerEdges.map((edge, i) => (
            <line
              key={`glow-${i}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke={C.selectionGlow}
              strokeWidth={2}
              strokeLinecap="square"
              opacity={0.5}
            />
          ))}
        </g>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <g>
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
          <text
            x={cells[0][0] * cellSize + cellSize / 2}
            y={cells[0][1] * cellSize - 8}
            textAnchor="middle"
            fill={isSliderPuzzle && !hasValidMoves ? '#ef4444' : C.selectionGlow}
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
});

// ============================================
// GhostPiece2D (preview for inventory placement)
// ============================================

export interface GhostPieceProps {
  shape: string;
  color: string;
  rotation: number;
  position: { x: number; y: number };
  cellSize: number;
  isValid: boolean;
}

export const GhostPiece2D = memo(function GhostPiece2D({
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

  const gradId = `url(#piece-grad-${color.replace('#', '')})`;

  return (
    <g opacity={0.55} pointerEvents="none">
      {cells.map(([x, y], i) => (
        <g key={i}>
          <rect
            x={x * cellSize + CELL_GAP}
            y={y * cellSize + CELL_GAP}
            width={cellSize - CELL_GAP * 2}
            height={cellSize - CELL_GAP * 2}
            rx={3}
            fill={isValid ? gradId : C.invalidCell}
            stroke={isValid ? 'rgba(255,255,255,0.35)' : '#ff3333'}
            strokeWidth={2}
            strokeDasharray={isValid ? 'none' : '6,4'}
            className={isValid ? undefined : 'dash-march'}
          />
          {isValid && (
            <circle
              cx={x * cellSize + cellSize / 2}
              cy={y * cellSize + cellSize / 2}
              r={STUD_RADIUS * 0.7}
              fill="rgba(255,255,255,0.15)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={0.8}
            />
          )}
        </g>
      ))}
    </g>
  );
});
