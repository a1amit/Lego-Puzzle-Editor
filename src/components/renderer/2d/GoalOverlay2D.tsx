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
      {/* Crosshair icon + GOAL label */}
      <g transform={`translate(${labelX - 30}, ${labelY - 12})`}>
        {/* SVG crosshair/target icon */}
        <circle cx="8" cy="6" r="5" fill="none" stroke={C.goalStroke} strokeWidth="1.5" />
        <circle cx="8" cy="6" r="2" fill={C.goalStroke} />
        <line x1="8" y1="0" x2="8" y2="2" stroke={C.goalStroke} strokeWidth="1.2" />
        <line x1="8" y1="10" x2="8" y2="12" stroke={C.goalStroke} strokeWidth="1.2" />
        <line x1="2" y1="6" x2="0" y2="6" stroke={C.goalStroke} strokeWidth="1.2" />
        <line x1="14" y1="6" x2="16" y2="6" stroke={C.goalStroke} strokeWidth="1.2" />
        <text
          x="20"
          y="10"
          fill={C.goalStroke}
          fontSize="12"
          fontFamily="monospace"
          fontWeight="bold"
        >
          GOAL
        </text>
      </g>
    </g>
  );
}
