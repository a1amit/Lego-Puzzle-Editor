/**
 * Renderer2D - 2D Puzzle Renderer
 *
 * Renders puzzles in a 2D view using SVG. This renderer is completely
 * independent of Three.js and works purely with the engine state.
 */

import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import type { UsePuzzleEngineReturn, PlacedPiece, Coordinate2D } from '../../engine';
import { rotateShape, getPieceCells, getValidSlideDestinations } from '../../engine';
import { SHAPE_LIBRARY } from '../../types/puzzle';
import type { NonogramHints } from '../../types/puzzle';
import { SCENE_2D } from '../../config/sceneConfig';

interface Renderer2DProps {
  engine: UsePuzzleEngineReturn;
  className?: string;
}

// ============================================
// CONSTANTS (from centralized config)
// ============================================

const CELL_GAP = SCENE_2D.cellGap;
const PADDING = SCENE_2D.padding;
const STUD_RADIUS = SCENE_2D.studRadius;
const BRICK_OUTER_INSET = SCENE_2D.brickOuterInset;
const SELECTION_Y_OFFSET = SCENE_2D.selectionYOffset;
const C = SCENE_2D.colors;
const SHADOW = SCENE_2D.shadow;

// Nonogram hint display constants
const HINT_CELL_SIZE = SCENE_2D.hintCellSize;
const HINT_FONT_SIZE = SCENE_2D.hintFontSize;
const HINT_GAP = SCENE_2D.hintGap;

// ============================================
// COLOR HELPERS
// ============================================

/** Lighten a hex color by a factor (0-1) */
function lighten(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * factor));
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * factor));
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * factor));
  return `rgb(${r},${g},${b})`;
}

/** Darken a hex color by a fixed amount */
function darken(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, parseInt(h.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(h.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(h.substring(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

// ============================================
// SVG DEFINITIONS COMPONENT
// ============================================

function SvgDefs({ pieces, inventoryColors, cellSize }: { pieces: PlacedPiece[]; inventoryColors: string[]; cellSize: number }) {
  // Collect unique piece colors for gradient definitions (placed + inventory)
  const uniqueColors = useMemo(() => {
    const colorSet = new Set([...pieces.map(p => p.color), ...inventoryColors]);
    return Array.from(colorSet);
  }, [pieces, inventoryColors]);

  return (
    <defs>
      {/* Background radial gradient */}
      <radialGradient id="bg-gradient" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stopColor={C.background} />
        <stop offset="100%" stopColor={C.backgroundEdge} />
      </radialGradient>

      {/* Board surface gradient */}
      <radialGradient id="board-gradient" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stopColor={C.boardSurface} />
        <stop offset="100%" stopColor={C.boardSurfaceEdge} />
      </radialGradient>

      {/* Board inset shadow filter */}
      <filter id="board-shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
      </filter>

      {/* Piece drop shadow - subtle, always on */}
      <filter id="piece-shadow" x="-10%" y="-10%" width="130%" height="140%">
        <feDropShadow dx="0" dy={SHADOW.offsetY} stdDeviation={SHADOW.blur} floodColor="#000" floodOpacity={SHADOW.opacity} />
      </filter>

      {/* Piece drop shadow - selected (stronger) */}
      <filter id="piece-shadow-selected" x="-15%" y="-15%" width="140%" height="160%">
        <feDropShadow dx="0" dy={SHADOW.selectedOffsetY} stdDeviation={SHADOW.selectedBlur} floodColor="#000" floodOpacity={SHADOW.selectedOpacity} />
      </filter>

      {/* Selection glow */}
      <filter id="selection-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feFlood floodColor={C.selectionGlow} floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Hover glow */}
      <filter id="hover-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        <feFlood floodColor="#ffffff" floodOpacity="0.2" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Valid destination pulse glow */}
      <filter id="dest-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feFlood floodColor={C.validDestGlow} floodOpacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Cell stud gradient (board studs) */}
      <radialGradient id="cell-stud-grad" cx="40%" cy="35%" r="55%">
        <stop offset="0%" stopColor={C.cellStudHighlight} />
        <stop offset="50%" stopColor={C.cellStud} />
        <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
      </radialGradient>

      {/* Cell base gradient */}
      <linearGradient id="cell-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.cellBaseLight} />
        <stop offset="100%" stopColor={C.cellBase} />
      </linearGradient>

      {/* Blocked cell gradient */}
      <linearGradient id="cell-blocked-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.cellBlockedLight} />
        <stop offset="100%" stopColor={C.cellBlocked} />
      </linearGradient>

      {/* Per-piece color gradients */}
      {uniqueColors.map(color => {
        const id = `piece-grad-${color.replace('#', '')}`;
        const studId = `stud-grad-${color.replace('#', '')}`;
        return (
          <g key={color}>
            {/* Piece body gradient - top-lit */}
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lighten(color, 0.12)} />
              <stop offset="50%" stopColor={color} />
              <stop offset="100%" stopColor={darken(color, 35)} />
            </linearGradient>
            {/* Stud radial gradient */}
            <radialGradient id={studId} cx="38%" cy="35%" r="58%">
              <stop offset="0%" stopColor={lighten(color, 0.22)} />
              <stop offset="55%" stopColor={color} />
              <stop offset="100%" stopColor={darken(color, 40)} />
            </radialGradient>
          </g>
        );
      })}

      {/* Stud inner shadow (concavity ring) */}
      <filter id="stud-inset" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
        <feOffset dx="0" dy="0.8" result="offsetBlur" />
        <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
      </filter>

      {/* CSS animation for pulsing destination circles */}
      <style>{`
        @keyframes pulse-dest {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes dash-march {
          to { stroke-dashoffset: -16; }
        }
        .dest-pulse { animation: pulse-dest 1.5s ease-in-out infinite; }
        .dash-march { animation: dash-march 0.6s linear infinite; }
      `}</style>

      {/* Grid pattern */}
      <pattern id="grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
        <rect width={cellSize} height={cellSize} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      </pattern>
    </defs>
  );
}

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
  const cx = x * cellSize + CELL_GAP / 2;
  const cy = y * cellSize + CELL_GAP / 2;
  const size = cellSize - CELL_GAP;
  const centerX = x * cellSize + cellSize / 2;
  const centerY = y * cellSize + cellSize / 2;

  const fill = isInvalid
    ? C.invalidCell
    : isHovered
      ? C.hoverCell
      : isValidDestination
        ? C.validDest
        : isBlocked
          ? 'url(#cell-blocked-grad)'
          : 'url(#cell-grad)';

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: isBlocked ? 'not-allowed' : 'pointer' }}
    >
      {/* Cell background with gradient */}
      <rect
        x={cx}
        y={cy}
        width={size}
        height={size}
        rx={3}
        fill={fill}
      />

      {/* Subtle top highlight on cell */}
      {!isBlocked && !isInvalid && !isHovered && !isValidDestination && (
        <rect
          x={cx + 2}
          y={cy}
          width={size - 4}
          height={2}
          rx={1}
          fill="rgba(255,255,255,0.06)"
        />
      )}

      {/* Hover border glow */}
      {isHovered && (
        <rect
          x={cx}
          y={cy}
          width={size}
          height={size}
          rx={3}
          fill="none"
          stroke={C.selectionGlow}
          strokeWidth={2}
          opacity={0.7}
        />
      )}

      {/* Stud on non-blocked cells */}
      {!isBlocked && (
        <g>
          {/* Stud body with gradient */}
          <circle
            cx={centerX}
            cy={centerY}
            r={STUD_RADIUS * 0.85}
            fill="url(#cell-stud-grad)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={0.8}
          />
          {/* Stud specular highlight */}
          <circle
            cx={centerX - STUD_RADIUS * 0.2}
            cy={centerY - STUD_RADIUS * 0.25}
            r={STUD_RADIUS * 0.3}
            fill="rgba(255,255,255,0.1)"
          />
        </g>
      )}

      {/* Valid destination glow indicator */}
      {isValidDestination && (
        <g className="dest-pulse">
          <circle
            cx={centerX}
            cy={centerY}
            r={cellSize / 3}
            fill="none"
            stroke={C.validDestGlow}
            strokeWidth={2.5}
            strokeDasharray="5,3"
            filter="url(#dest-glow)"
          />
        </g>
      )}
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

    if (!cellSet.has(`${x},${y - 1}`)) {
      segments.push({ x1: left, y1: top, x2: right, y2: top });
    }
    if (!cellSet.has(`${x},${y + 1}`)) {
      segments.push({ x1: left, y1: bottom, x2: right, y2: bottom });
    }
    if (!cellSet.has(`${x - 1},${y}`)) {
      segments.push({ x1: left, y1: top, x2: left, y2: bottom });
    }
    if (!cellSet.has(`${x + 1},${y}`)) {
      segments.push({ x1: right, y1: top, x2: right, y2: bottom });
    }
  }

  return segments;
}

// Helper: get top-edge-only segments (for highlight shine)
function getTopEdgeSegments(cells: [number, number][], cellSize: number, yOffset: number = 0, outerInset: number = BRICK_OUTER_INSET): {
  x1: number; y1: number; x2: number; y2: number;
}[] {
  const cellSet = new Set(cells.map(([x, y]) => `${x},${y}`));
  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const [x, y] of cells) {
    const left = x * cellSize + outerInset;
    const right = (x + 1) * cellSize - outerInset;
    const top = y * cellSize + outerInset + yOffset;

    // Top edge only where no neighbor above
    if (!cellSet.has(`${x},${y - 1}`)) {
      segments.push({ x1: left + 1, y1: top + 1, x2: right - 1, y2: top + 1 });
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

  const yOff = isSelected ? -SELECTION_Y_OFFSET : 0;
  const gradId = `url(#piece-grad-${piece.color.replace('#', '')})`;
  const studGradId = `url(#stud-grad-${piece.color.replace('#', '')})`;

  // Get outer edge segments for border rendering
  const outerEdges = useMemo(() => {
    return getOuterEdgeSegments(cells, cellSize, yOff, BRICK_OUTER_INSET);
  }, [cells, cellSize, yOff]);

  // Get top highlight edges
  const topEdges = useMemo(() => {
    return getTopEdgeSegments(cells, cellSize, yOff, BRICK_OUTER_INSET);
  }, [cells, cellSize, yOff]);

  // Border color
  const borderColor = useMemo(() => darken(piece.color, 70), [piece.color]);

  const hasNeighbor = (x: number, y: number, dx: number, dy: number) => {
    return cellSet.has(`${x + dx},${y + dy}`);
  };

  // Choose filter
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
            {/* Stud body with radial gradient */}
            <circle
              cx={centerX}
              cy={centerY}
              r={STUD_RADIUS}
              fill={studGradId}
              stroke={darken(piece.color, 50)}
              strokeWidth={1.2}
            />
            {/* Inner ring for depth */}
            <circle
              cx={centerX}
              cy={centerY}
              r={STUD_RADIUS * 0.72}
              fill="none"
              stroke="rgba(0,0,0,0.12)"
              strokeWidth={0.8}
            />
            {/* Specular highlight - top-left */}
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
          {/* Ghost stud */}
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
}

// ============================================
// NONOGRAM HINTS COMPONENT
// ============================================

interface NonogramHintsProps {
  hints: NonogramHints;
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
  hintsLeftWidth: number;
  hintsTopHeight: number;
}

function NonogramHintsDisplay({
  hints,
  cellSize,
  boardWidth,
  boardHeight,
  hintsLeftWidth,
  hintsTopHeight,
}: NonogramHintsProps) {
  const rowHints = hints.rows.map((row, rowIndex) => {
    const y = hintsTopHeight + rowIndex * cellSize + cellSize / 2;

    return (
      <g key={`row-${rowIndex}`}>
        {row.map((num, numIndex) => {
          const x = hintsLeftWidth - (row.length - numIndex) * HINT_CELL_SIZE + HINT_CELL_SIZE / 2;
          return (
            <text
              key={`row-${rowIndex}-${numIndex}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={C.hintText}
              fontSize={HINT_FONT_SIZE}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {num}
            </text>
          );
        })}
      </g>
    );
  });

  const colHints = hints.columns.map((col, colIndex) => {
    const x = hintsLeftWidth + colIndex * cellSize + cellSize / 2;

    return (
      <g key={`col-${colIndex}`}>
        {col.map((num, numIndex) => {
          const y = hintsTopHeight - (col.length - numIndex) * HINT_CELL_SIZE + HINT_CELL_SIZE / 2;
          return (
            <text
              key={`col-${colIndex}-${numIndex}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={C.hintText}
              fontSize={HINT_FONT_SIZE}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {num}
            </text>
          );
        })}
      </g>
    );
  });

  return (
    <g>
      {/* Background for hints area */}
      <rect
        x={0}
        y={hintsTopHeight}
        width={hintsLeftWidth - HINT_GAP}
        height={boardHeight * cellSize}
        fill={C.hintBg}
        rx={4}
      />
      <rect
        x={hintsLeftWidth}
        y={0}
        width={boardWidth * cellSize}
        height={hintsTopHeight - HINT_GAP}
        fill={C.hintBg}
        rx={4}
      />
      {rowHints}
      {colHints}
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

  // Calculate Nonogram hint area dimensions
  const nonogramHints = puzzle?.nonogram_hints;
  const maxRowHints = nonogramHints
    ? Math.max(...nonogramHints.rows.map(r => r.length), 1)
    : 0;
  const maxColHints = nonogramHints
    ? Math.max(...nonogramHints.columns.map(c => c.length), 1)
    : 0;
  const hintsLeftWidth = maxRowHints * HINT_CELL_SIZE;
  const hintsTopHeight = maxColHints * HINT_CELL_SIZE;

  const svgWidth = hintsLeftWidth + width * cellSize + PADDING * 2;
  const svgHeight = hintsTopHeight + height * cellSize + PADDING * 2;

  // Get invalid cells from validation
  const invalidCells = useMemo(() => {
    const cells = new Set<string>();
    for (const result of validationResults) {
      if (result.rule === 'GOAL_REACHED') continue;
      if (result.rule === 'ALL_BOARD_SQUARES_MUST_BE_COVERED') continue;
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

  // Find selected piece
  const selectedPlacedPiece = useMemo(() => {
    return board.placedPieces.find(p => p.instanceId === selectedPieceId);
  }, [board.placedPieces, selectedPieceId]);

  const selectedInventoryPiece = useMemo(() => {
    if (selectedPlacedPiece) return null;
    return puzzle?.inventory.find(p => p.id === selectedPieceId);
  }, [puzzle, selectedPieceId, selectedPlacedPiece]);

  // Get valid slide destinations
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

    if (selectedPlacedPiece) {
      const currentCells = getPieceCells(selectedPlacedPiece);
      const clickedOnSelf = currentCells.some(([cx, cy]) => cx === x && cy === y);
      if (clickedOnSelf) {
        console.log('[Renderer2D] Clicked on self, deselecting');
        selectPiece(null);
        return;
      }

      if (config.movementRule === 'SLIDING_ONLY') {
        console.log('[Renderer2D] Slider mode - checking valid destinations');
        const validDests = getValidSlideDestinations(board, selectedPlacedPiece);
        const shapeDef = SHAPE_LIBRARY[selectedPlacedPiece.shape];

        if (shapeDef) {
          const rotatedCells = rotateShape(shapeDef.cells, selectedPlacedPiece.rotation);

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

          console.log('[Renderer2D] Free placement mode - moving piece to anchor:', { x: anchorX, y: anchorY, clickedCell: { x, y } });
          const success = movePiece(selectedPlacedPiece.instanceId, { x: anchorX, y: anchorY, z: 0 });
          console.log('[Renderer2D] Move result:', success);
          if (!success) {
            console.log('[Renderer2D] Move failed - possibly overlap or out of bounds');
          }
        } else {
          console.log('[Renderer2D] Free placement mode - moving piece to:', { x, y });
          movePiece(selectedPlacedPiece.instanceId, { x, y, z: 0 });
        }
        selectPiece(null);
      }
      return;
    }

    if (selectedInventoryPiece) {
      console.log('[Renderer2D] Placing inventory piece');
      const remainingCount = engine.inventory.get(selectedInventoryPiece.id) ?? 0;
      const keepSelected = remainingCount > 1;

      placePiece(selectedInventoryPiece.id, { x, y, z: 0 }, previewRotation);

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
    const maxDepth = board.dimensions.depth ?? 1;
    const allowStacking = maxDepth > 1;

    for (const [dx, dy] of rotatedCells) {
      const x = hoveredCell.x + dx;
      const y = hoveredCell.y + dy;

      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      if (blockedCells.has(`${x},${y}`)) return false;

      if (!allowStacking) {
        // No stacking: any overlap is invalid
        for (const placed of board.placedPieces) {
          const placedCells = getPieceCells(placed);
          if (placedCells.some(([px, py]) => px === x && py === y)) {
            return false;
          }
        }
      }
    }

    // When stacking is allowed, check that the auto-calculated z won't exceed depth
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

  // Goal area cells
  const goalAreaCells = useMemo(() => {
    if (!puzzle?.goal?.cells) return new Set<string>();
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
    <div ref={containerRef} className={`w-full h-full flex items-center justify-center ${className}`} style={{ background: C.background }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: svgWidth, maxHeight: svgHeight }}
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
        <g transform={`translate(${PADDING + hintsLeftWidth}, ${PADDING + hintsTopHeight})`}>
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

          {/* Placed pieces */}
          {board.placedPieces.map(piece => {
            const isSelected = selectedPieceId === piece.instanceId;
            const isHovered = hoveredPieceId === piece.instanceId;
            const isInteractive = !selectedInventoryPiece && !selectedPlacedPiece;

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

          {/* Goal area overlay */}
          {puzzle.goal && !puzzle.goal.hideGoalVisualization && (
            <g>
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
                    stroke={C.goalStroke}
                    strokeWidth={3}
                    strokeDasharray="8,4"
                    opacity={0.7}
                    pointerEvents="none"
                  />
                );
              })}
              {puzzle.goal.cells && puzzle.goal.cells.length > 0 && (
                <text
                  x={(Math.min(...puzzle.goal.cells.map(c => c[0])) + Math.max(...puzzle.goal.cells.map(c => c[0])) + 1) / 2 * cellSize}
                  y={Math.min(...puzzle.goal.cells.map(c => c[1])) * cellSize - 8}
                  fill={C.goalStroke}
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
          fill="rgba(255,255,255,0.25)"
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
