/**
 * GridCell2D - Single board grid cell for the 2D renderer.
 */

import { memo } from 'react';
import { CELL_GAP, STUD_RADIUS, C } from './styles2D';

export interface GridCellProps {
  x: number;
  y: number;
  cellSize: number;
  isBlocked: boolean;
  isHovered: boolean;
  isInvalid: boolean;
  isValidDestination: boolean;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

export const GridCell = memo(function GridCell({
  x,
  y,
  cellSize,
  isBlocked,
  isHovered,
  isInvalid,
  isValidDestination,
  onClick,
  onPointerEnter,
  onPointerLeave,
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
      onPointerDown={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ cursor: isBlocked ? 'not-allowed' : 'pointer', touchAction: 'none' }}
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
          <circle
            cx={centerX}
            cy={centerY}
            r={STUD_RADIUS * 0.85}
            fill="url(#cell-stud-grad)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={0.8}
          />
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
});
