/**
 * NonogramHints2D - Nonogram hint number rendering for the 2D renderer.
 */

import type { NonogramHints } from '../../../types/puzzle';
import { C, HINT_CELL_SIZE, HINT_FONT_SIZE, HINT_GAP } from './styles2D';

export interface NonogramHintsProps {
  hints: NonogramHints;
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
  hintsLeftWidth: number;
  hintsTopHeight: number;
}

export function NonogramHintsDisplay({
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
