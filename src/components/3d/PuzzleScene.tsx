import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Line } from '@react-three/drei';
import * as THREE from 'three';
import { LegoBoard } from './LegoBoard';
import { PolyominoBrick, GhostBrick } from './PolyominoBrick';
import { CinematicEffects } from './CinematicEffects';
import { usePuzzleStore } from '../../store/puzzleStore';
import { useHoverStore } from '../../store/hoverStore';
import { useRuleBuilderStore } from '../editor/ruleBuilder/useRuleBuilderStore';
import { SHAPE_LIBRARY } from '../../types/puzzle';
import { getBrickCells, rotateShape } from '../../validation/ValidationRegistry';
import { applySnapZones, getFootprintExtent } from '../../engine/utils';
import { SCENE_3D, GOAL_INDICATOR_3D, COLORS } from '../../config/sceneConfig';
import { useIsTouch, useIsMobile } from '../../hooks/useMediaQuery';
import { RotateCw, Trash2, Check } from 'lucide-react';

// Error boundary to catch Three.js / WebGL crashes gracefully
class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-background/80 text-muted-foreground text-sm p-4 text-center">
          <div>
            <p className="mb-2 font-medium text-foreground">3D scene failed to load</p>
            <p className="text-xs opacity-70">{this.state.error}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Floating Goal Area Indicator - renders a visible frame above bricks
function GoalAreaIndicator({
  goalCells,
  boardOffset,
}: {
  goalCells: [number, number][];
  boardOffset: { x: number; y: number };
}) {
  // Calculate bounding box of goal area
  const bounds = useMemo(() => {
    if (!goalCells || goalCells.length === 0) return null;

    const xs = goalCells.map(([x]) => x);
    const ys = goalCells.map(([, y]) => y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [goalCells]);

  if (!bounds) return null;

  // Calculate world positions (cells are 1x1 units, need +1 to get far edge)
  const x1 = bounds.minX - boardOffset.x;
  const x2 = bounds.maxX + 1 - boardOffset.x;
  const z1 = bounds.minY - boardOffset.y;
  const z2 = bounds.maxY + 1 - boardOffset.y;

  const postHeight = GOAL_INDICATOR_3D.postHeight;
  const frameHeight = GOAL_INDICATOR_3D.frameHeight;
  const cornerInset = GOAL_INDICATOR_3D.cornerInset;

  // Corner positions
  const corners = [
    [x1 + cornerInset, z1 + cornerInset],
    [x2 - cornerInset, z1 + cornerInset],
    [x2 - cornerInset, z2 - cornerInset],
    [x1 + cornerInset, z2 - cornerInset],
  ];

  // Frame line points (closed loop)
  const framePoints: [number, number, number][] = [
    [x1 + cornerInset, frameHeight, z1 + cornerInset],
    [x2 - cornerInset, frameHeight, z1 + cornerInset],
    [x2 - cornerInset, frameHeight, z2 - cornerInset],
    [x1 + cornerInset, frameHeight, z2 - cornerInset],
    [x1 + cornerInset, frameHeight, z1 + cornerInset], // Close the loop
  ];

  return (
    <group>
      {/* Corner posts - vertical cylinders */}
      {corners.map(([cx, cz], i) => (
        <mesh key={`post-${i}`} position={[cx, postHeight / 2, cz]}>
          <cylinderGeometry args={[GOAL_INDICATOR_3D.postRadius, GOAL_INDICATOR_3D.postRadius, postHeight, 8]} />
          <meshStandardMaterial
            color={COLORS.goalPost}
            emissive={COLORS.goalPost}
            emissiveIntensity={0.3}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* Floating dashed frame line */}
      <Line
        points={framePoints}
        color={COLORS.goalFrame}
        lineWidth={GOAL_INDICATOR_3D.lineWidth}
        dashed
        dashSize={GOAL_INDICATOR_3D.dashSize}
        gapSize={GOAL_INDICATOR_3D.gapSize}
      />

      {/* "GOAL" label - small floating text indicator */}
      <mesh position={[(x1 + x2) / 2, frameHeight + 0.15, (z1 + z2) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.25]} />
        <meshBasicMaterial color={COLORS.goalFrame} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

/**
 * Floating 3D Preview Brick - renders a translucent brick that follows the mouse cursor
 * in 3D space. Uses raycasting to project the 2D mouse position onto a horizontal plane
 * at board level.
 * 
 * This component is displayed when:
 * - An inventory brick is selected for placement
 * - The mouse cursor is NOT hovering over the board (when hovering, GhostBrick is shown instead)
 * 
 * Features:
 * - Shows the brick shape and color with transparency
 * - Displays a rotation indicator arrow to show the user they can rotate with R key
 * - Follows the mouse cursor smoothly in 3D space
 * 
 * @param shape - The shape identifier from SHAPE_LIBRARY
 * @param color - The brick color
 * @param rotation - Current rotation in degrees (0, 90, 180, 270)
 */
function FloatingPreviewBrick({
  shape,
  color,
  rotation,
}: {
  shape: string;
  color: string;
  rotation: number;
}) {
  const { camera, raycaster, pointer, invalidate, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Refs for performance optimization - avoid recalculating when pointer hasn't moved
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const raycastTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // In demand mode, pointer moves over empty background don't trigger frames.
  // Listen on the canvas DOM element to force invalidation while this preview is mounted.
  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = () => invalidate();
    canvas.addEventListener('pointermove', onMove);
    return () => canvas.removeEventListener('pointermove', onMove);
  }, [gl, invalidate]);

  // Create a horizontal plane at board level (y=0.5 to float slightly above)
  const boardPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5), []);

  // Get shape definition
  const shapeDefinition = SHAPE_LIBRARY[shape];
  const rotatedCells = useMemo(() => {
    if (!shapeDefinition) return [];
    return rotateShape(shapeDefinition.cells, rotation);
  }, [shapeDefinition, rotation]);

  // Calculate center offset for the shape
  const centerOffset = useMemo(() => {
    if (rotatedCells.length === 0) return { x: 0, z: 0 };
    const maxX = Math.max(...rotatedCells.map(c => c[0])) + 1;
    const maxZ = Math.max(...rotatedCells.map(c => c[1])) + 1;
    return { x: maxX / 2, z: maxZ / 2 };
  }, [rotatedCells]);

  // Cache center offset in a ref so useFrame always has the latest value
  const centerOffsetRef = useRef(centerOffset);
  centerOffsetRef.current = centerOffset;

  // Update position on each frame via ref (no React state updates)
  useFrame(() => {
    // Skip expensive work if pointer position hasn't changed
    if (
      lastPointerRef.current &&
      lastPointerRef.current.x === pointer.x &&
      lastPointerRef.current.y === pointer.y
    ) {
      return;
    }
    lastPointerRef.current = { x: pointer.x, y: pointer.y };

    // Only update if pointer is valid (inside canvas)
    if (pointer.x < -1 || pointer.x > 1 || pointer.y < -1 || pointer.y > 1) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const target = raycastTargetRef.current;
    const result = raycaster.ray.intersectPlane(boardPlane, target);

    if (result && groupRef.current) {
      const co = centerOffsetRef.current;
      groupRef.current.position.set(target.x - co.x, 0.5, target.z - co.z);
      groupRef.current.visible = true;
      invalidate();
    } else if (groupRef.current) {
      groupRef.current.visible = false;
      invalidate();
    }
  });

  if (!shapeDefinition) return null;

  return (
    <group ref={groupRef} visible={false}>
      {/* Brick cells */}
      {rotatedCells.map(([dx, dy], index) => (
        <mesh
          key={index}
          position={[dx + 0.5, 0.2, dy + 0.5]}
        >
          <boxGeometry args={[0.9, 0.4, 0.9]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.7}
            emissive={color}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Studs on each cell */}
      {rotatedCells.map(([dx, dy], index) => (
        <mesh
          key={`stud-${index}`}
          position={[dx + 0.5, 0.45, dy + 0.5]}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.1, 12]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.7}
            emissive={color}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Rotation indicator arrow */}
      <group position={[centerOffset.x, 0.8, centerOffset.z]}>
        {/* Circular arc */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.35, 0.04, 8, 24, Math.PI * 1.5]} />
          <meshBasicMaterial color={COLORS.selection} transparent opacity={0.9} />
        </mesh>
        {/* Arrow head */}
        <mesh position={[0.35, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.08, 0.16, 6]} />
          <meshBasicMaterial color={COLORS.selection} />
        </mesh>
      </group>

      {/* "Press R" hint - small indicator */}
      <mesh position={[centerOffset.x, 1.1, centerOffset.z]} rotation={[-Math.PI / 4, 0, 0]}>
        <planeGeometry args={[0.6, 0.25]} />
        <meshBasicMaterial color={COLORS.selection} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// Drag and drop manager component
function DragDropManager({ setOrbitEnabled }: { setOrbitEnabled: (enabled: boolean) => void }) {
  const {
    puzzle,
    boardState,
    selectedBrickId,
    previewRotation,
    placeBrick,
    moveBrick,
    removeBrick,
    rotateBrick,
    rotatePreview,
    selectBrick,
    isSlidingPuzzle,
    getValidSlideDestinationsFor,
  } = usePuzzleStore();
  const hoveredCell = useHoverStore(s => s.hoveredCell);
  const setHoveredCell = useHoverStore(s => s.setHoveredCell);

  const { width, height } = boardState.dimensions;
  const boardOffset = { x: width / 2, y: height / 2 };

  // Resolve a board cell directly from a pointer event's world intersection
  // point. Used as a fallback on touch where a tap may not produce a
  // pointermove, so `hoveredCell` (set only on raycasted move) can be stale.
  const cellFromEvent = (event: any): { x: number; y: number } | null => {
    const p = event?.point;
    if (!p) return null;
    const cx = Math.floor(p.x + boardOffset.x);
    const cy = Math.floor(p.z + boardOffset.y);
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) return null;
    return { x: cx, y: cy };
  };

  // Default-on: puzzles without an explicit dragNdrop setting use the
  // press-drag-release flow. Opt out by setting `dragNdrop: false`.
  const dragNdrop = puzzle?.dragNdrop ?? true;

  // Find if selectedBrickId is a placed brick (instanceId) or inventory brick (id)
  const selectedPlacedBrick = useMemo(() => {
    return boardState.placedBricks.find(b => b.instanceId === selectedBrickId);
  }, [boardState.placedBricks, selectedBrickId]);

  const selectedInventoryBrick = useMemo(() => {
    if (selectedPlacedBrick) return null;
    return puzzle?.inventory.find(b => b.id === selectedBrickId);
  }, [puzzle, selectedBrickId, selectedPlacedBrick]);

  // The whole stack lifts together: selected brick + everything stacked above it.
  // This mirrors what move/rotate apply to.
  const selectedStackIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedPlacedBrick) return ids;
    ids.add(selectedPlacedBrick.instanceId);

    const visit = (target: typeof selectedPlacedBrick) => {
      const targetCells = getBrickCells(target);
      const targetSet = new Set(targetCells.map(([x, y]) => `${x},${y}`));
      const targetZ = target.z || 0;
      for (const b of boardState.placedBricks) {
        if (ids.has(b.instanceId)) continue;
        if ((b.z || 0) <= targetZ) continue;
        const cells = getBrickCells(b);
        if (cells.some(([x, y]) => targetSet.has(`${x},${y}`))) {
          ids.add(b.instanceId);
          visit(b);
        }
      }
    };
    visit(selectedPlacedBrick);
    return ids;
  }, [selectedPlacedBrick, boardState.placedBricks]);

  // Bricks whose cells overlap any failing rule's affectedCells, when
  // puzzle.highlight_failing_cells is on. Tints the offending bricks red so
  // the failure is visible even though the floor highlight is hidden by them.
  const validationResults = usePuzzleStore(s => s.validationResults);
  const invalidBrickIds = useMemo(() => {
    const ids = new Set<string>();
    if (!puzzle?.highlight_failing_cells) return ids;
    const invalidCellSet = new Set<string>();
    for (const r of validationResults) {
      if (r.isValid || !r.affectedCells) continue;
      for (const [x, y] of r.affectedCells) invalidCellSet.add(`${x},${y}`);
    }
    if (invalidCellSet.size === 0) return ids;
    for (const b of boardState.placedBricks) {
      const cells = getBrickCells(b);
      if (cells.some(([x, y]) => invalidCellSet.has(`${x},${y}`))) {
        ids.add(b.instanceId);
      }
    }
    return ids;
  }, [puzzle?.highlight_failing_cells, validationResults, boardState.placedBricks]);

  // Calculate z-level for ghost preview (for stacking)
  const ghostZLevel = useMemo(() => {
    if (!selectedInventoryBrick || !hoveredCell) return 0;

    const shape = SHAPE_LIBRARY[selectedInventoryBrick.shape];
    if (!shape) return 0;

    const rotatedCells = rotateShape(shape.cells, previewRotation);
    const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
      hoveredCell.x + dx,
      hoveredCell.y + dy,
    ]);

    // Find the highest z-level at these cells
    let maxZ = -1;
    for (const brick of boardState.placedBricks) {
      const brickCells = getBrickCells(brick);
      const brickCellSet = new Set(brickCells.map(([x, y]) => `${x},${y}`));

      for (const [x, y] of cells) {
        if (brickCellSet.has(`${x},${y}`)) {
          maxZ = Math.max(maxZ, brick.z || 0);
        }
      }
    }

    return maxZ + 1;
  }, [selectedInventoryBrick, hoveredCell, boardState, previewRotation]);

  // Check if ghost position is valid for inventory brick placement
  const isGhostValid = useMemo(() => {
    if (!selectedInventoryBrick || !hoveredCell) return false;

    const shape = SHAPE_LIBRARY[selectedInventoryBrick.shape];
    if (!shape) return false;

    // Check if z-level exceeds board depth (depth: 1 = no stacking, depth: 2 = one layer, etc.)
    const maxAllowedZ = boardState.dimensions.depth - 1;
    if (ghostZLevel > maxAllowedZ) {
      return false; // Stacking would exceed depth limit
    }

    // Use previewRotation for inventory bricks
    const rotatedCells = rotateShape(shape.cells, previewRotation);

    // Check if all cells are within bounds
    for (const [dx, dy] of rotatedCells) {
      const x = hoveredCell.x + dx;
      const y = hoveredCell.y + dy;

      if (x < 0 || x >= width || y < 0 || y >= height) {
        return false;
      }

      // Check for overlap with other placed bricks at the same z-level
      // Stacking is allowed (different z-levels), but same-level overlap is not
      for (const placed of boardState.placedBricks) {
        if ((placed.z || 0) !== ghostZLevel) continue; // Only check same z-level
        const placedCells = getBrickCells(placed);
        for (const [px, py] of placedCells) {
          if (px === x && py === y) {
            return false;
          }
        }
      }
    }

    return true;
  }, [selectedInventoryBrick, hoveredCell, boardState, width, height, previewRotation, ghostZLevel]);

  // Keyboard handling moved to PuzzleSceneInner (outside R3F Canvas)
  // to avoid React Three Fiber reconciler issues with StrictMode
  // that can leak duplicate window-level event listeners.

  // Handle board cell hover
  const handleCellHover = useCallback((x: number, y: number | null) => {
    if (y === null) {
      setHoveredCell(null);
    } else {
      setHoveredCell({ x, y });
    }
  }, [setHoveredCell]);

  // Place a selected inventory brick at the given cell. Shared by cell-click
  // (legacy flow) and cell-pointer-up (dragNdrop flow).
  const placeInventoryAt = useCallback((x: number, y: number) => {
    if (!selectedInventoryBrick) return;
    const shape = SHAPE_LIBRARY[selectedInventoryBrick.shape];
    const footprint = shape
      ? getFootprintExtent(shape.cells, previewRotation)
      : { width: 1, height: 1 };
    const target = applySnapZones({ x, y }, footprint, puzzle?.snap_zones);
    if (!target) return;

    const remainingCount = usePuzzleStore.getState().inventoryState.get(selectedInventoryBrick.id) ?? 0;
    const keepSelected = remainingCount > 1;

    placeBrick({
      id: selectedInventoryBrick.id,
      instanceId: '',
      shape: selectedInventoryBrick.shape,
      color: selectedInventoryBrick.color,
      position: target,
      rotation: previewRotation,
      z: 0,
    });

    if (!keepSelected) {
      selectBrick(null);
    }
  }, [selectedInventoryBrick, previewRotation, puzzle?.snap_zones, placeBrick, selectBrick]);

  // Handle board cell click
  const handleCellClick = useCallback((x: number, y: number) => {
    // Single-cell picker mode (path_exists start/end)
    const singleTarget = useRuleBuilderStore.getState().singleCellPickerTarget;
    if (singleTarget) {
      useRuleBuilderStore.getState().pickSingleCell(x, y);
      return;
    }

    // Multi-cell picker mode: intercept clicks for the rule builder
    const pickerTarget = useRuleBuilderStore.getState().cellPickerTarget;
    if (pickerTarget) {
      useRuleBuilderStore.getState().toggleCell(x, y);
      return;
    }

    // If we have a placed brick selected (hovering), place it at new position.
    // In dragNdrop mode, placed-brick moves commit on pointer-up via
    // handleScenePointerUp, not on cell click — so this branch is skipped.
    if (selectedPlacedBrick && !dragNdrop) {
      const shape = SHAPE_LIBRARY[selectedPlacedBrick.shape];
      const footprint = shape
        ? getFootprintExtent(shape.cells, selectedPlacedBrick.rotation || 0)
        : { width: 1, height: 1 };
      const target = applySnapZones({ x, y }, footprint, puzzle?.snap_zones);
      if (!target) return; // click outside any snap zone — ignore

      // Check if clicking on the same position - if so, just deselect
      if (selectedPlacedBrick.position.x === target.x && selectedPlacedBrick.position.y === target.y) {
        selectBrick(null);
        return;
      }

      moveBrick(selectedPlacedBrick.instanceId, target);
      selectBrick(null);
      return;
    }

    // If we have an inventory brick selected, place it with the preview rotation.
    // In dragNdrop mode, placement is deferred to pointer-up so the press-drag-
    // release gesture (e.g. from the inventory panel onto the board) commits
    // exactly once.
    if (selectedInventoryBrick && !dragNdrop) {
      placeInventoryAt(x, y);
    }
  }, [selectedPlacedBrick, selectedInventoryBrick, puzzle?.snap_zones, dragNdrop, moveBrick, selectBrick, placeInventoryAt]);

  // Drag-tracking: distinguishes a real drag from a stationary tap, mirroring
  // the 2D renderer. A tap on a placed brick should just keep the selection;
  // only a press-drag-release commits a move.
  const dragStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  // True only when the most recent press is the one that selected the brick —
  // i.e. PolyominoBrick.onSelect fired during this gesture. Follow-up presses
  // (after a failed drag that left the brick selected) leave this false, so
  // a plain click on a cell can commit the move instead of being rejected by
  // the tap-vs-drag threshold.
  const pressSelectedRef = useRef(false);
  const DRAG_THRESHOLD_PX = 5;

  // OrbitControls is toggled off during a placed-brick drag so pressing a
  // brick doesn't also rotate the camera. The enabled flag is owned by
  // PuzzleSceneInner (it lives outside DragDropManager so the prop change
  // can reach OrbitControls' JSX), and is set via the prop passed in.

  // Re-enable OrbitControls on any global pointer release, even if the
  // gesture ended off-canvas. Safe to call when controls weren't disabled.
  useEffect(() => {
    if (!dragNdrop) return;
    const reenable = () => setOrbitEnabled(true);
    window.addEventListener('pointerup', reenable);
    window.addEventListener('pointercancel', reenable);
    return () => {
      window.removeEventListener('pointerup', reenable);
      window.removeEventListener('pointercancel', reenable);
    };
  }, [dragNdrop, setOrbitEnabled]);

  // Scene-group onPointerDown: record where the gesture began. Both placed
  // bricks (via onPointerDown without stopPropagation) and empty cells bubble
  // their pointerdown up to this handler. PolyominoBrick's pointerdown runs
  // first (R3F dispatches inside-out and brick.handlePointerDown updates the
  // store synchronously), so by the time we read here, selectedBrickId
  // reflects whether the press landed on a placed brick.
  const handleScenePointerDown = useCallback((event: any) => {
    if (!dragNdrop) return;
    const ne = event.nativeEvent ?? event;
    if (typeof ne?.clientX !== 'number') return;
    dragStartRef.current = {
      x: ne.clientX,
      y: ne.clientY,
      pointerId: ne.pointerId,
    };

    // If this press selected a placed brick, freeze OrbitControls for the
    // duration of the drag — otherwise the same press starts a camera
    // rotation in parallel with the piece drag.
    const state = usePuzzleStore.getState();
    const sel = state.selectedBrickId;
    if (sel && state.boardState.placedBricks.some(b => b.instanceId === sel)) {
      setOrbitEnabled(false);
    }
  }, [dragNdrop, setOrbitEnabled]);

  // Pointer-up at the scene-group level. In dragNdrop mode, this commits:
  //   - an inventory placement when an inventory tile is selected, or
  //   - a placed-brick move when a placed brick is selected (and the pointer
  //     actually moved past the drag threshold — a stationary tap is ignored).
  const handleScenePointerUp = useCallback((event: any) => {
    if (!dragNdrop) return;

    const start = dragStartRef.current;
    dragStartRef.current = null;

    // R3F dispatches pointerup to every intersected mesh in the raycast — the
    // parent group's handler would otherwise fire once per intersected mesh
    // (cell + any brick the ray also hits). Stop propagation so a single
    // release commits exactly one action.
    if (selectedInventoryBrick) {
      event.stopPropagation?.();
      const current = useHoverStore.getState().hoveredCell ?? cellFromEvent(event);
      if (!current) return;
      placeInventoryAt(current.x, current.y);
      return;
    }

    if (selectedPlacedBrick) {
      event.stopPropagation?.();

      // Only the very first press (the one that selected the brick) needs to
      // distinguish a stationary tap from a real drag — without that guard,
      // pressing a brick at its anchor and releasing would immediately fire a
      // no-op move. For any follow-up gesture (the brick is already selected
      // from a previous attempt), a release over a cell commits regardless of
      // distance, so a plain click on a target cell still works.
      const wasInitialPress = pressSelectedRef.current;
      pressSelectedRef.current = false;

      if (wasInitialPress && start) {
        const ne = event.nativeEvent ?? event;
        if (typeof ne?.clientX === 'number') {
          const dx = ne.clientX - start.x;
          const dy = ne.clientY - start.y;
          // Fingers jitter more than a mouse — use a larger threshold for touch
          // so a tap-to-select isn't misread as a (no-op) drag-move.
          const threshold = ne.pointerType === 'touch' ? 12 : DRAG_THRESHOLD_PX;
          const moved = Math.sqrt(dx * dx + dy * dy) >= threshold;
          if (!moved) return;
        }
      }

      const current = useHoverStore.getState().hoveredCell ?? cellFromEvent(event);
      if (!current) return; // released off-board

      const shape = SHAPE_LIBRARY[selectedPlacedBrick.shape];
      const footprint = shape
        ? getFootprintExtent(shape.cells, selectedPlacedBrick.rotation || 0)
        : { width: 1, height: 1 };
      const target = applySnapZones({ x: current.x, y: current.y }, footprint, puzzle?.snap_zones);
      if (!target) return;

      // Released on the brick's own anchor — treat as cancel/deselect.
      if (selectedPlacedBrick.position.x === target.x && selectedPlacedBrick.position.y === target.y) {
        selectBrick(null);
        return;
      }

      moveBrick(selectedPlacedBrick.instanceId, target);
      selectBrick(null);
    }
  }, [dragNdrop, puzzle?.snap_zones, selectedInventoryBrick, selectedPlacedBrick, placeInventoryAt, moveBrick, selectBrick]);

  // Handle right-click on canvas to rotate preview
  const handleCanvasContextMenu = useCallback((event: any) => {
    // R3F passes a ThreeEvent, not a DOM MouseEvent — use nativeEvent for preventDefault
    (event.nativeEvent ?? event)?.preventDefault?.();

    if (selectedInventoryBrick) {
      rotatePreview();
    }
  }, [selectedInventoryBrick, rotatePreview]);

  // Handle brick selection (lift it up)
  const handleBrickSelect = useCallback((instanceId: string) => {
    selectBrick(instanceId);
  }, [selectBrick]);

  // Handle brick deselection (put it back down)
  const handleBrickDeselect = useCallback(() => {
    selectBrick(null);
  }, [selectBrick]);

  // Handle brick rotation
  const handleBrickRotate = useCallback((instanceId: string) => {
    rotateBrick(instanceId);
  }, [rotateBrick]);

  // Handle brick removal
  const handleBrickRemove = useCallback((instanceId: string) => {
    removeBrick(instanceId);
    selectBrick(null);
  }, [removeBrick, selectBrick]);

  // Get picker cells from rule builder store (must be before early return — Rules of Hooks)
  const pickerTarget = useRuleBuilderStore(s => s.cellPickerTarget);
  const pickerCellsSet = useRuleBuilderStore(s => s.cellPickerCells);
  const pickerSelectedCells = useMemo<[number, number][] | undefined>(() => {
    if (!pickerTarget || pickerCellsSet.size === 0) return undefined;
    return Array.from(pickerCellsSet).map(k => {
      const [x, y] = k.split(',').map(Number);
      return [x, y] as [number, number];
    });
  }, [pickerTarget, pickerCellsSet]);

  if (!puzzle) return null;

  // Get slide destinations for the currently selected placed piece (if sliding puzzle)
  const slideDestinations = selectedPlacedBrick && isSlidingPuzzle()
    ? getValidSlideDestinationsFor(selectedPlacedBrick.instanceId)
    : undefined;

  // Get goal cells from puzzle definition (for slider puzzles)
  const goalCells = (puzzle?.goal?.hideGoalVisualization ? undefined : puzzle?.goal?.cells) as [number, number][] | undefined;

  return (
    <group
      onContextMenu={handleCanvasContextMenu as any}
      onPointerDown={handleScenePointerDown as any}
      onPointerUp={handleScenePointerUp as any}
    >
      {/* The board */}
      <LegoBoard
        width={width}
        height={height}
        onCellClick={handleCellClick}
        onCellHover={handleCellHover}
        slideDestinations={slideDestinations}
        goalCells={goalCells}
        pickerSelectedCells={pickerSelectedCells}
      />

      {/* Floating goal area indicator - visible above bricks */}
      {goalCells && <GoalAreaIndicator goalCells={goalCells} boardOffset={boardOffset} />}

      {/* Placed bricks */}
      {boardState.placedBricks.map((brick) => {
        // Bricks are interactive when:
        // - No inventory brick is selected (we're not in placement mode), AND
        // - No placed brick is selected (normal state - can select any brick)
        // When a placed brick is selected for moving, ALL bricks (including the selected one) 
        // become non-interactive so clicks pass through to the board for movement
        const isThisBrickInSelectedStack = selectedStackIds.has(brick.instanceId);
        // In dragNdrop mode, pressing any unselected placed brick should be
        // able to start a new drag — so non-selected bricks stay interactive
        // even when another brick is currently selected. The selected stack
        // itself stays non-interactive so pointer events fall through to the
        // cells beneath during the drag.
        const isInteractive = dragNdrop
          ? !selectedInventoryBrick && !isThisBrickInSelectedStack
          : !selectedInventoryBrick && !selectedPlacedBrick;
        const isThisBrickInvalid = invalidBrickIds.has(brick.instanceId);

        return (
          <PolyominoBrick
            key={brick.instanceId}
            brick={brick}
            isSelected={isThisBrickInSelectedStack}
            isInvalid={isThisBrickInvalid}
            interactive={isInteractive}
            dragNdrop={dragNdrop}
            boardOffset={boardOffset}
            onSelect={() => {
              // Mark that the current gesture's press is what selected this
              // brick — handleScenePointerUp uses this to apply the tap-vs-
              // drag threshold only on the initial press.
              if (dragNdrop) pressSelectedRef.current = true;
              handleBrickSelect(brick.instanceId);
            }}
            onDeselect={handleBrickDeselect}
            onRotate={() => handleBrickRotate(brick.instanceId)}
            onRemove={() => handleBrickRemove(brick.instanceId)}
            onDragEnd={(pos) => {
              moveBrick(brick.instanceId, pos);
              selectBrick(null);
            }}
          />
        );
      })}

      {/* Ghost preview when placing from inventory - with rotation */}
      {selectedInventoryBrick && hoveredCell && (() => {
        const shape = SHAPE_LIBRARY[selectedInventoryBrick.shape];
        const footprint = shape
          ? getFootprintExtent(shape.cells, previewRotation)
          : { width: 1, height: 1 };
        const snapped = applySnapZones(hoveredCell, footprint, puzzle?.snap_zones);
        if (!snapped) return null;
        return (
          <GhostBrick
            shape={selectedInventoryBrick.shape}
            color={selectedInventoryBrick.color}
            rotation={previewRotation}
            position={{ x: snapped.x - boardOffset.x, y: snapped.y - boardOffset.y }}
            z={ghostZLevel}
            isValid={isGhostValid}
          />
        );
      })()}

      {/* Ghost preview when repositioning a placed brick */}
      {selectedPlacedBrick && hoveredCell && (() => {
        // Calculate z-level for moved brick
        const shape = SHAPE_LIBRARY[selectedPlacedBrick.shape];
        if (!shape) return null;

        const footprint = getFootprintExtent(shape.cells, selectedPlacedBrick.rotation || 0);
        const snapped = applySnapZones(hoveredCell, footprint, puzzle?.snap_zones);
        if (!snapped) return null;

        const rotatedCells = rotateShape(shape.cells, selectedPlacedBrick.rotation || 0);
        const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
          snapped.x + dx,
          snapped.y + dy,
        ]);

        // Exclude the current brick from z-level calculation
        const otherBricks = boardState.placedBricks.filter(b => b.instanceId !== selectedPlacedBrick.instanceId);
        let maxZ = -1;
        for (const brick of otherBricks) {
          const brickCells = getBrickCells(brick);
          const brickCellSet = new Set(brickCells.map(([x, y]) => `${x},${y}`));

          for (const [x, y] of cells) {
            if (brickCellSet.has(`${x},${y}`)) {
              maxZ = Math.max(maxZ, brick.z || 0);
            }
          }
        }
        const movedZLevel = maxZ + 1;

        // Check if z-level exceeds board depth
        const maxAllowedZ = boardState.dimensions.depth - 1;
        const isValidMove = movedZLevel <= maxAllowedZ;

        return (
          <GhostBrick
            shape={selectedPlacedBrick.shape}
            color={selectedPlacedBrick.color}
            rotation={selectedPlacedBrick.rotation}
            position={{ x: snapped.x - boardOffset.x, y: snapped.y - boardOffset.y }}
            z={movedZLevel}
            isValid={isValidMove}
          />
        );
      })()}
    </group>
  );
}

// Invalidates the demand-mode render loop when store or hover state changes
function StoreInvalidator() {
  const { invalidate } = useThree();
  const boardState = usePuzzleStore(s => s.boardState);
  const selectedBrickId = usePuzzleStore(s => s.selectedBrickId);
  const previewRotation = usePuzzleStore(s => s.previewRotation);
  const validationResults = usePuzzleStore(s => s.validationResults);
  const hoveredCell = useHoverStore(s => s.hoveredCell);
  // Cell picker — watch both version (number, guaranteed to trigger) and cells Set
  const cellPickerVersion = useRuleBuilderStore(s => s.cellPickerVersion);
  const cellPickerCells = useRuleBuilderStore(s => s.cellPickerCells);

  useEffect(() => {
    invalidate();
  }, [boardState, selectedBrickId, previewRotation, validationResults, hoveredCell, cellPickerVersion, cellPickerCells, invalidate]);

  return null;
}

// Scene lighting and environment
function SceneLighting() {
  const { lighting, shadow } = SCENE_3D;
  return (
    <>
      <ambientLight intensity={lighting.ambient.intensity} />
      <hemisphereLight
        intensity={lighting.hemisphere.intensity}
        color={lighting.hemisphere.skyColor}
        groundColor={lighting.hemisphere.groundColor}
      />
      <directionalLight
        position={lighting.main.position as unknown as [number, number, number]}
        intensity={lighting.main.intensity}
        castShadow
        shadow-mapSize={[shadow.mapSize, shadow.mapSize]}
        shadow-camera-far={shadow.cameraFar}
        shadow-camera-left={-shadow.cameraExtent}
        shadow-camera-right={shadow.cameraExtent}
        shadow-camera-top={shadow.cameraExtent}
        shadow-camera-bottom={-shadow.cameraExtent}
        shadow-bias={shadow.bias}
        shadow-normalBias={shadow.normalBias}
      />
      <directionalLight
        position={lighting.fill.position as unknown as [number, number, number]}
        intensity={lighting.fill.intensity}
      />
      <directionalLight
        position={lighting.rim.position as unknown as [number, number, number]}
        intensity={lighting.rim.intensity}
        color="#8cb9ff"
      />
      <pointLight position={lighting.point.position as unknown as [number, number, number]} intensity={lighting.point.intensity} />
    </>
  );
}

// Background grid
function BackgroundGrid() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        color={SCENE_3D.background.color}
        roughness={SCENE_3D.background.roughness}
        metalness={SCENE_3D.background.metalness}
      />
    </mesh>
  );
}

// Wrapper component to render floating preview when needed
// This must be inside Canvas to use useThree hooks
function FloatingPreviewWrapper() {
  const { selectedBrickId, boardState, puzzle, previewRotation } = usePuzzleStore();
  const hoveredCell = useHoverStore(s => s.hoveredCell);

  // The preview is shown only when the cursor has left the board — over the
  // board, the GhostBrick at hoveredCell handles the snap visualization.
  const placedBrick = useMemo(() => {
    if (!selectedBrickId) return null;
    return boardState.placedBricks.find(b => b.instanceId === selectedBrickId) ?? null;
  }, [boardState.placedBricks, selectedBrickId]);

  const inventoryBrick = useMemo(() => {
    if (!selectedBrickId || placedBrick) return null;
    return puzzle?.inventory.find(b => b.id === selectedBrickId) ?? null;
  }, [puzzle, selectedBrickId, placedBrick]);

  if (hoveredCell) return null;

  // Inventory selection → preview the tile being placed.
  if (inventoryBrick) {
    return (
      <FloatingPreviewBrick
        shape={inventoryBrick.shape}
        color={inventoryBrick.color}
        rotation={previewRotation}
      />
    );
  }

  // dragNdrop placed-brick drag → preview the brick being moved so it
  // visually follows the cursor when dragged off the board, instead of
  // leaving the user with no visual feedback during the drag.
  if (placedBrick && (puzzle?.dragNdrop ?? true)) {
    return (
      <FloatingPreviewBrick
        shape={placedBrick.shape}
        color={placedBrick.color}
        rotation={placedBrick.rotation || 0}
      />
    );
  }

  return null;
}

function PuzzleSceneInner() {
  const {
    selectedBrickId,
    boardState,
    rotateBrick,
    rotatePreview,
    selectBrick,
    removeBrick,
  } = usePuzzleStore();
  const [sceneReady, setSceneReady] = useState(false);
  // Orbit controls are toggled off while a placed brick is being dragged in
  // dragNdrop mode so the press doesn't also start a camera rotation.
  // DragDropManager calls setOrbitEnabled(false) on press and (true) on any
  // global pointer release.
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  // Check if we have an inventory brick selected (not a placed brick)
  const hasInventorySelection = selectedBrickId &&
    !boardState.placedBricks.find(b => b.instanceId === selectedBrickId);

  // Check if we have a placed brick selected (hovering/moving)
  const hasPlacedBrickSelection = selectedBrickId &&
    boardState.placedBricks.find(b => b.instanceId === selectedBrickId);

  // Keyboard handler — lives outside the R3F Canvas so React DOM's
  // StrictMode cleanup works correctly (R3F's reconciler can leak listeners).
  const selectedPlacedBrick = useMemo(
    () => boardState.placedBricks.find(b => b.instanceId === selectedBrickId),
    [boardState.placedBricks, selectedBrickId],
  );
  const selectedInventoryBrick = useMemo(() => {
    if (selectedPlacedBrick) return null;
    const puzzle = usePuzzleStore.getState().puzzle;
    return puzzle?.inventory.find(b => b.id === selectedBrickId) ?? null;
  }, [selectedBrickId, selectedPlacedBrick]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (selectedPlacedBrick) {
        if (event.code === 'KeyR') {
          rotateBrick(selectedPlacedBrick.instanceId);
        } else if (event.code === 'Escape' || event.key === 'Escape') {
          selectBrick(null);
        } else if (event.code === 'Delete' || event.code === 'Backspace') {
          removeBrick(selectedPlacedBrick.instanceId);
          selectBrick(null);
        }
        return;
      }
      if (selectedInventoryBrick) {
        if (event.code === 'KeyR') {
          rotatePreview();
        } else if (event.code === 'Escape' || event.key === 'Escape') {
          selectBrick(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlacedBrick, selectedInventoryBrick, rotateBrick, rotatePreview, selectBrick, removeBrick]);

  const isTouch = useIsTouch();
  const isMobile = useIsMobile();
  // Compact = touch device OR phone-width: show on-screen rotate/remove/done.
  const compact = isTouch || isMobile;

  // Hide cursor when any brick is selected for placement/movement (mouse only)
  const shouldHideCursor = !isTouch && (hasInventorySelection || hasPlacedBrickSelection);
  const boardCellCount = boardState.dimensions.width * boardState.dimensions.height;
  const isLargeBoard = boardCellCount >= 400;
  const effectiveDpr = isLargeBoard
    ? ([1, 1.5] as [number, number])
    : (SCENE_3D.renderer.dpr as unknown as [number, number]);

  // Camera framing: pull back on phones and for large boards, and raise the
  // zoom-out limit so the whole board can be framed by pinch on a narrow
  // portrait viewport (the user can always pinch back in to maxZoom).
  const maxDim = Math.max(boardState.dimensions.width, boardState.dimensions.height);
  const camFactor = (isMobile ? 1.35 : 1) * Math.max(1, maxDim / 8);
  const cameraPosition = (SCENE_3D.camera.position as readonly number[]).map(
    (c) => c * camFactor,
  ) as unknown as [number, number, number];
  const maxDistance = Math.max(SCENE_3D.camera.maxZoom, maxDim * 3.2);

  // Context actions for the touch control bar.
  const handleTouchRotate = () => {
    if (selectedPlacedBrick) rotateBrick(selectedPlacedBrick.instanceId);
    else if (selectedInventoryBrick) rotatePreview();
  };

  return (
    <div
      className={`w-full h-full relative transition-opacity duration-300 ${sceneReady ? 'opacity-100' : 'opacity-0'}`}
      style={{ cursor: shouldHideCursor ? 'none' : 'auto', backgroundColor: '#0f1520', touchAction: 'none' }}
      onContextMenu={(e) => {
        if (hasInventorySelection) {
          e.preventDefault();
          rotatePreview();
        }
      }}
    >
      <Canvas
        shadows
        frameloop="demand"
        dpr={effectiveDpr}
        gl={{
          antialias: !isLargeBoard,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl, scene, invalidate }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = SCENE_3D.renderer.toneMappingExposure;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = isLargeBoard ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
          scene.background = new THREE.Color(SCENE_3D.background.color);
          // Force a render, then fade in after the first frame paints
          invalidate();
          requestAnimationFrame(() => requestAnimationFrame(() => setSceneReady(true)));
        }}
        style={{ cursor: shouldHideCursor ? 'none' : 'auto' }}
        onPointerMove={() => { /* demand mode: r3f auto-invalidates on pointer events */ }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <PerspectiveCamera
          makeDefault
          position={cameraPosition}
          fov={SCENE_3D.camera.fov}
        />

        <OrbitControls
          makeDefault
          enabled={orbitEnabled}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          enableDamping
          dampingFactor={0.08}
          minDistance={SCENE_3D.camera.minZoom}
          maxDistance={maxDistance}
          maxPolarAngle={SCENE_3D.camera.maxPolarAngle}
          target={SCENE_3D.camera.target as unknown as [number, number, number]}
        />

        <StoreInvalidator />
        <SceneLighting />

        <Suspense fallback={null}>
          <DragDropManager setOrbitEnabled={setOrbitEnabled} />
          <FloatingPreviewWrapper />
          <BackgroundGrid />
          {!isLargeBoard && (
            <ContactShadows
              position={SCENE_3D.contactShadow.position as unknown as [number, number, number]}
              opacity={SCENE_3D.contactShadow.opacity}
              scale={SCENE_3D.contactShadow.scale}
              blur={SCENE_3D.contactShadow.blur}
              far={SCENE_3D.contactShadow.far}
            />
          )}
        </Suspense>

        {!isLargeBoard && <CinematicEffects />}

        {/* Subtle fog for depth */}
        <fog attach="fog" args={[SCENE_3D.fog.color, SCENE_3D.fog.near, SCENE_3D.fog.far]} />
      </Canvas>

      {/* Touch control bar — rotate/remove/deselect replace the keyboard R,
          right-click and double-click which are unavailable on a phone. */}
      {compact && (selectedPlacedBrick || selectedInventoryBrick) && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 flex items-center gap-2 px-2 py-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/15 shadow-lg">
          <button
            type="button"
            aria-label="Rotate brick"
            className="h-11 px-3 inline-flex items-center gap-1.5 rounded-full text-white/90 text-xs font-medium active:scale-95 transition-transform"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleTouchRotate(); }}
          >
            <RotateCw className="w-5 h-5" /> Rotate
          </button>
          {selectedPlacedBrick && (
            <button
              type="button"
              aria-label="Remove brick"
              className="h-11 px-3 inline-flex items-center gap-1.5 rounded-full text-red-300 text-xs font-medium active:scale-95 transition-transform"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeBrick(selectedPlacedBrick.instanceId);
                selectBrick(null);
              }}
            >
              <Trash2 className="w-5 h-5" /> Remove
            </button>
          )}
          <button
            type="button"
            aria-label="Done"
            className="h-11 px-3 inline-flex items-center gap-1.5 rounded-full text-white/90 text-xs font-medium active:scale-95 transition-transform"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); selectBrick(null); }}
          >
            <Check className="w-5 h-5" /> Done
          </button>
        </div>
      )}
    </div>
  );
}

export function PuzzleScene() {
  return (
    <SceneErrorBoundary>
      <PuzzleSceneInner />
    </SceneErrorBoundary>
  );
}
