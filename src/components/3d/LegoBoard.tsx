import { useLayoutEffect, useMemo, useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { usePuzzleStore } from '../../store/puzzleStore';
import type { ValidationResult, NonogramHints } from '../../types/puzzle';
import { BOARD_3D } from '../../config/sceneConfig';

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

const CELL_SIZE = BOARD_3D.cellSize;
const STUD_RADIUS = BOARD_3D.studRadius;
const STUD_HEIGHT = BOARD_3D.studHeight;
const BOARD_DEPTH = BOARD_3D.depth;

type CellPosition = [number, number];
type HighlightInstance = { x: number; y: number; color: string };

const INSTANCE_DUMMY = new THREE.Object3D();
const INSTANCE_COLOR = new THREE.Color();

function applyMatrices(
  mesh: THREE.InstancedMesh | null,
  cells: CellPosition[],
  y: number,
  rotation: [number, number, number] = [0, 0, 0],
) {
  if (!mesh) return;

  mesh.count = cells.length;
  INSTANCE_DUMMY.rotation.set(rotation[0], rotation[1], rotation[2]);

  for (let i = 0; i < cells.length; i++) {
    const [x, z] = cells[i];
    INSTANCE_DUMMY.position.set(x + 0.5, y, z + 0.5);
    INSTANCE_DUMMY.updateMatrix();
    mesh.setMatrixAt(i, INSTANCE_DUMMY.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function applyHighlights(mesh: THREE.InstancedMesh | null, highlights: HighlightInstance[]) {
  if (!mesh) return;

  mesh.count = highlights.length;
  INSTANCE_DUMMY.rotation.set(-Math.PI / 2, 0, 0);

  for (let i = 0; i < highlights.length; i++) {
    const { x, y, color } = highlights[i];
    INSTANCE_DUMMY.position.set(x + 0.5, 0.012, y + 0.5);
    INSTANCE_DUMMY.updateMatrix();
    mesh.setMatrixAt(i, INSTANCE_DUMMY.matrix);
    INSTANCE_COLOR.set(color);
    mesh.setColorAt(i, INSTANCE_COLOR);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.computeBoundingSphere();
}

// ============================================
// NONOGRAM HINTS 3D COMPONENT
// ============================================

interface NonogramHints3DProps {
  hints: NonogramHints;
}

/**
 * Renders Nonogram hints in 3D using Text components.
 * Row hints appear on the left side (negative X), column hints on the front (negative Z).
 */
function NonogramHints3D({ hints }: NonogramHints3DProps) {
  const HINT_SPACING = 0.5; // Space between hint numbers
  const HINT_HEIGHT = 0.3; // Height above the board
  const TEXT_SIZE = 0.4;

  // Calculate max hints for proper spacing
  const maxRowHints = Math.max(...hints.rows.map(r => r.length), 1);
  const maxColHints = Math.max(...hints.columns.map(c => c.length), 1);

  // Render row hints (left side of board, along Z axis)
  const rowHintElements = hints.rows.map((row, rowIndex) => {
    return row.map((num, numIndex) => {
      // Position from right to left (closer numbers are closer to board)
      const xOffset = -(maxRowHints - row.length + numIndex + 1) * HINT_SPACING - 0.3;
      const zPosition = rowIndex * CELL_SIZE + CELL_SIZE / 2;

      return (
        <Text
          key={`row-${rowIndex}-${numIndex}`}
          position={[xOffset, HINT_HEIGHT, zPosition]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={TEXT_SIZE}
          color="#ecf2ff"
          outlineWidth={0.03}
          outlineColor="#0d1523"
          anchorX="center"
          anchorY="middle"
        >
          {num}
        </Text>
      );
    });
  });

  // Render column hints (front of board, along X axis)
  const colHintElements = hints.columns.map((col, colIndex) => {
    return col.map((num, numIndex) => {
      // Position from bottom to top (closer numbers are closer to board)
      const zOffset = -(maxColHints - col.length + numIndex + 1) * HINT_SPACING - 0.3;
      const xPosition = colIndex * CELL_SIZE + CELL_SIZE / 2;

      return (
        <Text
          key={`col-${colIndex}-${numIndex}`}
          position={[xPosition, HINT_HEIGHT, zOffset]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={TEXT_SIZE}
          color="#ecf2ff"
          outlineWidth={0.03}
          outlineColor="#0d1523"
          anchorX="center"
          anchorY="middle"
        >
          {num}
        </Text>
      );
    });
  });

  return (
    <group>
      {rowHintElements.flat()}
      {colHintElements.flat()}
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
  const lastHoveredCellKeyRef = useRef<string | null>(null);

  const baseNormalRef = useRef<THREE.InstancedMesh>(null);
  const baseBlockedRef = useRef<THREE.InstancedMesh>(null);
  const baseGoalRef = useRef<THREE.InstancedMesh>(null);
  const studNormalRef = useRef<THREE.InstancedMesh>(null);
  const studGoalRef = useRef<THREE.InstancedMesh>(null);
  const highlightRef = useRef<THREE.InstancedMesh>(null);
  const goalRingRef = useRef<THREE.InstancedMesh>(null);

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

  const instanceData = useMemo(() => {
    const baseNormal: CellPosition[] = [];
    const baseBlocked: CellPosition[] = [];
    const baseGoal: CellPosition[] = [];
    const studNormal: CellPosition[] = [];
    const studGoal: CellPosition[] = [];
    const highlights: HighlightInstance[] = [];
    const goalRings: CellPosition[] = [];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const key = `${x},${y}`;
        const isBlocked = blockedCells.has(key);
        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
        const isInvalid = invalidCells.has(key);
        const isSlideDestination = slideDestinationCells.has(key);
        const isGoal = goalCellSet.has(key);

        const highlightColor = isInvalid
          ? '#F85149'
          : isSlideDestination
            ? '#3FB950'
            : isHovered
              ? '#58A6FF'
              : null;

        if (isBlocked) {
          baseBlocked.push([x, y]);
        } else if (isGoal) {
          baseGoal.push([x, y]);
        } else {
          baseNormal.push([x, y]);
        }

        if (!isBlocked) {
          if (isGoal) {
            studGoal.push([x, y]);
          } else {
            studNormal.push([x, y]);
          }
        }

        if (highlightColor) {
          highlights.push({ x, y, color: highlightColor });
        } else if (isGoal) {
          goalRings.push([x, y]);
        }
      }
    }

    return {
      baseNormal,
      baseBlocked,
      baseGoal,
      studNormal,
      studGoal,
      highlights,
      goalRings,
    };
  }, [width, height, blockedCells, hoveredCell, invalidCells, slideDestinationCells, goalCellSet]);

  useLayoutEffect(() => {
    const dynamicMeshes = [
      baseNormalRef.current,
      baseBlockedRef.current,
      baseGoalRef.current,
      studNormalRef.current,
      studGoalRef.current,
      highlightRef.current,
      goalRingRef.current,
    ];

    for (const mesh of dynamicMeshes) {
      if (mesh) {
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      }
    }

    applyMatrices(baseNormalRef.current, instanceData.baseNormal, -BOARD_DEPTH / 2);
    applyMatrices(baseBlockedRef.current, instanceData.baseBlocked, -BOARD_DEPTH / 2);
    applyMatrices(baseGoalRef.current, instanceData.baseGoal, -BOARD_DEPTH / 2);

    applyMatrices(studNormalRef.current, instanceData.studNormal, STUD_HEIGHT / 2);
    applyMatrices(studGoalRef.current, instanceData.studGoal, STUD_HEIGHT / 2);

    applyHighlights(highlightRef.current, instanceData.highlights);
    applyMatrices(goalRingRef.current, instanceData.goalRings, 0.015, [-Math.PI / 2, Math.PI / 4, 0]);
  }, [instanceData]);

  // Handle pointer events
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    if (!groupRef.current) return;

    // Get intersection point in local coordinates
    const localPoint = groupRef.current.worldToLocal(event.point.clone());
    const cellX = Math.floor(localPoint.x / CELL_SIZE);
    const cellY = Math.floor(localPoint.z / CELL_SIZE);

    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      const nextKey = `${cellX},${cellY}`;
      if (lastHoveredCellKeyRef.current !== nextKey) {
        lastHoveredCellKeyRef.current = nextKey;
        onCellHover?.(cellX, cellY);
      }
    } else if (lastHoveredCellKeyRef.current !== null) {
      lastHoveredCellKeyRef.current = null;
      onCellHover?.(0, null);
    }
  };

  const handlePointerLeave = () => {
    if (lastHoveredCellKeyRef.current !== null) {
      lastHoveredCellKeyRef.current = null;
      onCellHover?.(0, null); // Signal to clear hover
    }
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
  const maxInstances = width * height;

  return (
    <group
      ref={groupRef}
      position={[offsetX, 0, offsetY]}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Board under-glow for scene separation */}
      <mesh position={[width / 2, -BOARD_DEPTH - 0.25, height / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(width, height) * 0.45, Math.max(width, height) * 0.72, 64]} />
        <meshBasicMaterial
          color="#73b6ff"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Board base plate */}
      <mesh
        position={[width / 2, -BOARD_DEPTH - 0.1, height / 2]}
        receiveShadow
      >
        <boxGeometry args={[width + 0.2, 0.2, height + 0.2]} />
        <meshPhysicalMaterial color={BOARD_3D.colors.basePlate} roughness={0.7} metalness={0.06} clearcoat={0.3} clearcoatRoughness={0.7} />
      </mesh>

      {/* Board rim */}
      <mesh position={[width / 2, -BOARD_DEPTH / 2, height / 2]}>
        <boxGeometry args={[width + 0.3, BOARD_DEPTH + 0.1, height + 0.3]} />
        <meshPhysicalMaterial color={BOARD_3D.colors.rim} roughness={0.55} metalness={0.12} clearcoat={0.45} clearcoatRoughness={0.58} />
      </mesh>

      {/* Instanced board cells */}
      <instancedMesh ref={baseNormalRef} args={[undefined, undefined, maxInstances]} receiveShadow>
        <boxGeometry args={[CELL_SIZE - 0.02, BOARD_DEPTH, CELL_SIZE - 0.02]} />
        <meshPhysicalMaterial
          color={BOARD_3D.colors.normal}
          roughness={BOARD_3D.roughness}
          metalness={BOARD_3D.metalness}
          clearcoat={0.45}
          clearcoatRoughness={0.6}
        />
      </instancedMesh>

      <instancedMesh ref={baseBlockedRef} args={[undefined, undefined, maxInstances]} receiveShadow>
        <boxGeometry args={[CELL_SIZE - 0.02, BOARD_DEPTH, CELL_SIZE - 0.02]} />
        <meshPhysicalMaterial
          color={BOARD_3D.colors.blocked}
          roughness={BOARD_3D.roughness}
          metalness={BOARD_3D.metalness}
          clearcoat={0.45}
          clearcoatRoughness={0.6}
        />
      </instancedMesh>

      <instancedMesh ref={baseGoalRef} args={[undefined, undefined, maxInstances]} receiveShadow>
        <boxGeometry args={[CELL_SIZE - 0.02, BOARD_DEPTH, CELL_SIZE - 0.02]} />
        <meshPhysicalMaterial
          color={BOARD_3D.colors.goal}
          roughness={BOARD_3D.roughness}
          metalness={BOARD_3D.metalness}
          clearcoat={0.45}
          clearcoatRoughness={0.6}
        />
      </instancedMesh>

      {/* Instanced studs */}
      <instancedMesh ref={studNormalRef} args={[undefined, undefined, maxInstances]} castShadow>
        <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
        <meshPhysicalMaterial
          color={BOARD_3D.colors.stud}
          roughness={BOARD_3D.studRoughness}
          metalness={BOARD_3D.studMetalness}
          clearcoat={0.6}
          clearcoatRoughness={0.45}
        />
      </instancedMesh>

      <instancedMesh ref={studGoalRef} args={[undefined, undefined, maxInstances]} castShadow>
        <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
        <meshPhysicalMaterial
          color={BOARD_3D.colors.goalStud}
          roughness={BOARD_3D.studRoughness}
          metalness={BOARD_3D.studMetalness}
          clearcoat={0.6}
          clearcoatRoughness={0.45}
        />
      </instancedMesh>

      {/* Instanced highlights */}
      <instancedMesh ref={highlightRef} args={[undefined, undefined, maxInstances]}>
        <ringGeometry args={[0.2, 0.48, 24]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* Instanced goal diamonds for non-highlighted goal cells */}
      <instancedMesh ref={goalRingRef} args={[undefined, undefined, maxInstances]}>
        <ringGeometry args={[0.32, 0.4, 4]} />
        <meshBasicMaterial
          color="#F5C300"
          transparent
          opacity={0.78}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* Nonogram hints (if puzzle has them) */}
      {store.puzzle?.nonogram_hints && (
        <NonogramHints3D
          hints={store.puzzle.nonogram_hints}
        />
      )}

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

