/**
 * GoalOverlay2D - Goal area visualization overlay for the 2D renderer.
 */

import { C } from './styles2D';

export interface GoalOverlay2DProps {
  goalCells: Set<string>;
  cellSize: number;
  allCells: [number, number][];
}

export function GoalOverlay2D({ goalCells, cellSize, allCells }: GoalOverlay2DProps) {
  if (allCells.length === 0) return null;

  const xs = allCells.map(c => c[0]);
  const ys = allCells.map(c => c[1]);
  const labelX = (Math.min(...xs) + Math.max(...xs) + 1) / 2 * cellSize;
  const labelY = Math.min(...ys) * cellSize - 8;

  return (
    <g>
      {Array.from(goalCells).map((key) => {
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
      <text
        x={labelX}
        y={labelY}
        fill={C.goalStroke}
        fontSize="12"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        {'\uD83C\uDFAF'} GOAL
      </text>
    </g>
  );
}
