import { useMemo, useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { usePuzzleStore } from '../../store/puzzleStore';
import type { ValidationResult } from '../../types/puzzle';

interface LegoBoardProps {
  width: number;
  height: number;
  depth?: number;
  onCellClick?: (x: number, y: number) => void;
  onCellHover?: (x: number, y: number | null) => void;
  /** External blocked cells - if provided, overrides store */
  blockedCellsOverride?: [number, number][];
  /** External hovered cell - if provided, overrides store */
  hoveredCellOverride?: { x: number; y: number } | null;
  /** External validation results - if provided, overrides store */
  validationResultsOverride?: ValidationResult[];
  /** Valid slide destinations - shown with green highlight */
  slideDestinations?: [number, number][];
  /** Goal cells - shown with target/goal indicator */
  goalCells?: [number, number][];
}

const CELL_SIZE = 1;
const STUD_RADIUS = 0.3;
const STUD_HEIGHT = 0.2;
const BOARD_DEPTH = 0.3;

// Board cell component with stud
function BoardCell({
  x,
  y,
  isBlocked,
  isHighlighted,
  highlightColor,
  isGoal,
}: {
  x: number;
  y: number;
  isBlocked: boolean;
  isHighlighted: boolean;
  highlightColor?: string;
  isGoal?: boolean;
}) {
  const baseColor = isBlocked ? '#4a4a4a' : isGoal ? '#5d5020' : '#FFFFFF';
  const studColor = isBlocked ? '#4a4a4a' : isGoal ? '#6d6030' : '#E0E0E0';

  return (
    <group position={[x * CELL_SIZE, 0, y * CELL_SIZE]}>
      {/* Cell base */}
      <mesh position={[0.5, -BOARD_DEPTH / 2, 0.5]} receiveShadow>
        <boxGeometry args={[CELL_SIZE - 0.02, BOARD_DEPTH, CELL_SIZE - 0.02]} />
        <meshStandardMaterial
          color={isHighlighted ? (highlightColor || '#4a6fa5') : baseColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Stud */}
      {!isBlocked && (
        <mesh position={[0.5, STUD_HEIGHT / 2, 0.5]} castShadow>
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
          <meshStandardMaterial
            color={studColor}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      )}

      {/* Highlight overlay when cell is active */}
      {isHighlighted && (
        <mesh position={[0.5, 0.01, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CELL_SIZE - 0.05, CELL_SIZE - 0.05]} />
          <meshBasicMaterial
            color={highlightColor || '#58A6FF'}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Goal indicator - golden diamond outline */}
      {isGoal && !isHighlighted && (
        <mesh position={[0.5, 0.015, 0.5]} rotation={[-Math.PI / 2, Math.PI / 4, 0]}>
          <ringGeometry args={[0.32, 0.4, 4]} />
          <meshBasicMaterial
            color="#F5C300"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

export function LegoBoard({
  width,
  height,
  onCellClick,
  onCellHover,
  blockedCellsOverride,
  hoveredCellOverride,
  validationResultsOverride,
  slideDestinations,
  goalCells,
}: LegoBoardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const store = usePuzzleStore();

  // Use override props if provided, otherwise fall back to store
  const hoveredCell = hoveredCellOverride !== undefined ? hoveredCellOverride : store.hoveredCell;
  const validationResults = validationResultsOverride ?? store.validationResults;
  const blockedCellsArray = blockedCellsOverride ?? store.boardState.blockedCells;

  // Get cells that need highlighting from validation
  const invalidCells = useMemo(() => {
    const cells = new Set<string>();
    for (const result of validationResults) {
      if (!result.isValid && result.affectedCells) {
        for (const [x, y] of result.affectedCells) {
          cells.add(`${x},${y}`);
        }
      }
    }
    return cells;
  }, [validationResults]);

  // Create blocked cells set
  const blockedCells = useMemo(() => {
    return new Set(blockedCellsArray.map(([x, y]) => `${x},${y}`));
  }, [blockedCellsArray]);

  // Create slide destinations set
  const slideDestinationCells = useMemo(() => {
    if (!slideDestinations) return new Set<string>();
    return new Set(slideDestinations.map(([x, y]) => `${x},${y}`));
  }, [slideDestinations]);

  // Create goal cells set
  const goalCellSet = useMemo(() => {
    // Check if we should hide the goal (from store if available)
    if (store.puzzle?.goal?.hideGoalVisualization) {
      return new Set<string>();
    }

    // Use prop if provided, otherwise fallback to store puzzle goal
    const cells = goalCells ?? store.puzzle?.goal?.cells;

    if (!cells) return new Set<string>();
    return new Set(cells.map(([x, y]) => `${x},${y}`));
  }, [goalCells, store.puzzle]);

  // Generate cells
  const cells = useMemo(() => {
    const cellElements = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const key = `${x},${y}`;
        const isBlocked = blockedCells.has(key);
        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
        const isInvalid = invalidCells.has(key);
        const isSlideDestination = slideDestinationCells.has(key);
        const isGoal = goalCellSet.has(key);

        cellElements.push(
          <BoardCell
            key={key}
            x={x}
            y={y}
            isBlocked={isBlocked}
            isHighlighted={isHovered || isInvalid || isSlideDestination}
            highlightColor={
              isInvalid ? '#F85149' :
                isSlideDestination ? '#3FB950' : // Green for valid slides
                  isHovered ? '#58A6FF' :
                    undefined
            }
            isGoal={isGoal}
          />
        );
      }
    }
    return cellElements;
  }, [width, height, blockedCells, hoveredCell, invalidCells, slideDestinationCells, goalCellSet]);

  // Handle pointer events
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    if (!groupRef.current) return;

    // Get intersection point in local coordinates
    const localPoint = groupRef.current.worldToLocal(event.point.clone());
    const cellX = Math.floor(localPoint.x / CELL_SIZE);
    const cellY = Math.floor(localPoint.z / CELL_SIZE);

    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      onCellHover?.(cellX, cellY);
    }
  };

  const handlePointerLeave = () => {
    onCellHover?.(0, null as any); // Signal to clear hover
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    if (!groupRef.current) return;

    const localPoint = groupRef.current.worldToLocal(event.point.clone());
    const cellX = Math.floor(localPoint.x / CELL_SIZE);
    const cellY = Math.floor(localPoint.z / CELL_SIZE);

    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      onCellClick?.(cellX, cellY);
    }
  };

  // Center the board
  const offsetX = -width / 2;
  const offsetY = -height / 2;

  return (
    <group
      ref={groupRef}
      position={[offsetX, 0, offsetY]}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Board base plate */}
      <mesh
        position={[width / 2, -BOARD_DEPTH - 0.1, height / 2]}
        receiveShadow
      >
        <boxGeometry args={[width + 0.2, 0.2, height + 0.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Board rim */}
      <mesh position={[width / 2, -BOARD_DEPTH / 2, height / 2]}>
        <boxGeometry args={[width + 0.3, BOARD_DEPTH + 0.1, height + 0.3]} />
        <meshStandardMaterial color="#222222" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Individual cells */}
      {cells}

      {/* Invisible interaction plane - rotated to face up for proper raycasting */}
      <mesh
        position={[width / 2, 0.1, height / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

