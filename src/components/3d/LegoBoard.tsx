import { useLayoutEffect, useMemo, useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

import { usePuzzleStore } from '../../store/puzzleStore';
import { useHoverStore } from '../../store/hoverStore';
import type { ValidationResult, NonogramHints } from '../../types/puzzle';
import { BOARD_3D, COLORS } from '../../config/sceneConfig';

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
  /** Cell picker highlights — cells selected in the rule builder */
  pickerSelectedCells?: [number, number][];
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

/** Draw a rounded rectangle path on a 2D canvas context. */
function canvasRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}


/** High-quality canvas texture for a hint number with badge background. */
function createHintTexture(num: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Badge background
  const pad = 30;
  canvasRoundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, 26);
  ctx.fillStyle = 'rgba(18, 25, 40, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 195, 220, 0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Number with drop shadow
  ctx.font = `600 ${Math.round(size * 0.44)}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#d0d8e8';
  ctx.fillText(String(num), size / 2, size / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Cache hint textures so identical numbers share a single texture. */
const hintTextureCache = new Map<number, THREE.CanvasTexture>();
function getHintTexture(num: number): THREE.CanvasTexture {
  let tex = hintTextureCache.get(num);
  if (!tex) {
    tex = createHintTexture(num);
    hintTextureCache.set(num, tex);
  }
  return tex;
}

/**
 * Renders nonogram hints in 3D with badge-styled number sprites.
 * Row hints appear on the left (negative X, right-aligned toward board).
 * Column hints appear in front (negative Z, bottom-aligned toward board).
 */
function NonogramHints3D({ hints }: NonogramHints3DProps) {
  const SP = 0.52;       // spacing between hint numbers
  const MG = 0.25;       // margin from board edge to nearest hint
  const SY = 0.25;       // sprite elevation above board
  const SS = 0.44;       // sprite scale

  // Row hint sprites (right-aligned: shorter rows stay close to the board)
  const rowSprites = hints.rows.flatMap((row, ri) =>
    row.map((num, ni) => (
      <sprite
        key={`r${ri}-${ni}`}
        position={[-(row.length - ni) * SP - MG, SY, ri * CELL_SIZE + CELL_SIZE / 2]}
        scale={[SS, SS, 1]}
      >
        <spriteMaterial map={getHintTexture(num)} transparent depthTest={false} />
      </sprite>
    )),
  );

  // Column hint sprites (bottom-aligned: shorter columns stay close to the board)
  const colSprites = hints.columns.flatMap((col, ci) =>
    col.map((num, ni) => (
      <sprite
        key={`c${ci}-${ni}`}
        position={[ci * CELL_SIZE + CELL_SIZE / 2, SY, -(col.length - ni) * SP - MG]}
        scale={[SS, SS, 1]}
      >
        <spriteMaterial map={getHintTexture(num)} transparent depthTest={false} />
      </sprite>
    )),
  );

  return (
    <group>
      {rowSprites}
      {colSprites}
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
  pickerSelectedCells,
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
  const pickerRef = useRef<THREE.InstancedMesh>(null);

  const store = usePuzzleStore();
  const hoverStoreCell = useHoverStore(s => s.hoveredCell);

  // Use override props if provided, otherwise fall back to store
  const hoveredCell = hoveredCellOverride !== undefined ? hoveredCellOverride : hoverStoreCell;
  const validationResults = validationResultsOverride ?? store.validationResults;
  const blockedCellsArray = blockedCellsOverride ?? store.boardState.blockedCells;

  // Cell picker state for rule builder
  // Picker cells come as a prop from PuzzleScene (same pattern as goalCells)
  const pickerCellSet = useMemo(() => {
    if (!pickerSelectedCells || pickerSelectedCells.length === 0) return new Set<string>();
    return new Set(pickerSelectedCells.map(([x, y]) => `${x},${y}`));
  }, [pickerSelectedCells]);

  // Per-cell paint colors from puzzle.board.cell_colors.
  const cellColorMap = useMemo(() => {
    const m = new Map<string, string>();
    const entries = store.puzzle?.board.cell_colors ?? [];
    for (const [x, y, color] of entries) m.set(`${x},${y}`, color);
    return m;
  }, [store.puzzle?.board.cell_colors]);

  // Get cells that need highlighting from validation. Opt-in via
  // puzzle.highlight_failing_cells — when on, every failing rule's
  // affectedCells are painted red (including CUSTOM rules).
  const highlightFailingCells = store.puzzle?.highlight_failing_cells ?? false;
  const invalidCells = useMemo(() => {
    const cells = new Set<string>();
    if (!highlightFailingCells) return cells;
    for (const result of validationResults) {
      if (!result.isValid && result.affectedCells) {
        for (const [x, y] of result.affectedCells) {
          cells.add(`${x},${y}`);
        }
      }
    }
    return cells;
  }, [validationResults, highlightFailingCells]);

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
    const baseColored: HighlightInstance[] = [];
    const studNormal: CellPosition[] = [];
    const studGoal: CellPosition[] = [];
    const highlights: HighlightInstance[] = [];
    const goalRings: CellPosition[] = [];
    const pickerHighlights: CellPosition[] = [];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const key = `${x},${y}`;
        const isBlocked = blockedCells.has(key);
        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
        const isInvalid = invalidCells.has(key);
        const isSlideDestination = slideDestinationCells.has(key);
        const isGoal = goalCellSet.has(key);
        const paintColor = cellColorMap.get(key);
        const highlightColor = isInvalid
          ? COLORS.invalidCell
          : isSlideDestination
            ? COLORS.slideDestination
            : isHovered
              ? COLORS.selection
              : null;

        if (isBlocked) {
          baseBlocked.push([x, y]);
        } else if (paintColor) {
          baseColored.push({ x, y, color: paintColor });
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

        if (pickerCellSet.has(key)) {
          pickerHighlights.push([x, y]);
        }
      }
    }

    return {
      baseNormal,
      baseBlocked,
      baseGoal,
      baseColored,
      studNormal,
      studGoal,
      highlights,
      goalRings,
      pickerHighlights,
    };
  }, [width, height, blockedCells, hoveredCell, invalidCells, slideDestinationCells, goalCellSet, cellColorMap, pickerCellSet]);

  useLayoutEffect(() => {
    const dynamicMeshes = [
      baseNormalRef.current,
      baseBlockedRef.current,
      baseGoalRef.current,
      studNormalRef.current,
      studGoalRef.current,
      highlightRef.current,
      goalRingRef.current,
      pickerRef.current,
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
    applyMatrices(pickerRef.current, instanceData.pickerHighlights, STUD_HEIGHT + 0.05, [-Math.PI / 2, 0, 0]);

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
          color={COLORS.selection}
          transparent
          opacity={BOARD_3D.underGlowOpacity}
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

      {/* Painted cells from puzzle.board.cell_colors. One mesh per cell so
          each gets its own material color; positioned slightly above the
          regular cell tops so the rim doesn't obscure them. */}
      {instanceData.baseColored.map(({ x, y, color }) => (
        <mesh
          key={`painted-${x}-${y}`}
          position={[x + 0.5, -BOARD_DEPTH / 2 + 0.06, y + 0.5]}
          receiveShadow
        >
          <boxGeometry args={[CELL_SIZE - 0.02, BOARD_DEPTH, CELL_SIZE - 0.02]} />
          <meshPhysicalMaterial
            color={color}
            roughness={BOARD_3D.roughness}
            metalness={BOARD_3D.metalness}
            clearcoat={0.45}
            clearcoatRoughness={0.6}
          />
        </mesh>
      ))}

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
          color={COLORS.goalPost}
          transparent
          opacity={0.78}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* Instanced picker cell highlights (same pattern as goal rings) */}
      <instancedMesh ref={pickerRef} args={[undefined, undefined, maxInstances]} renderOrder={999}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.6}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* Nonogram hints (if puzzle has them) */}
      {store.puzzle?.nonogram_hints && (
        <NonogramHints3D hints={store.puzzle.nonogram_hints} />
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

