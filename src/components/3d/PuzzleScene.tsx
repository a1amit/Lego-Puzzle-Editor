import { Suspense, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Line } from '@react-three/drei';
import * as THREE from 'three';
import { LegoBoard } from './LegoBoard';
import { PolyominoBrick, GhostBrick } from './PolyominoBrick';
import { usePuzzleStore } from '../../store/puzzleStore';
import { SHAPE_LIBRARY } from '../../types/puzzle';
import { getBrickCells, rotateShape } from '../../validation/ValidationRegistry';

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

  const postHeight = 1.5; // Height of corner posts
  const frameHeight = 1.2; // Height of the floating frame
  const cornerInset = 0.1; // Slight inset from cell edges

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
          <cylinderGeometry args={[0.05, 0.05, postHeight, 8]} />
          <meshStandardMaterial
            color="#F5C300"
            emissive="#F5C300"
            emissiveIntensity={0.3}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* Floating dashed frame line */}
      <Line
        points={framePoints}
        color="#3FB950"
        lineWidth={3}
        dashed
        dashSize={0.15}
        gapSize={0.1}
      />

      {/* "GOAL" label - small floating text indicator */}
      <mesh position={[(x1 + x2) / 2, frameHeight + 0.15, (z1 + z2) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.25]} />
        <meshBasicMaterial color="#3FB950" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// Floating 3D Preview Brick - follows mouse cursor in 3D space when not hovering the board
function FloatingPreviewBrick({
  shape,
  color,
  rotation,
}: {
  shape: string;
  color: string;
  rotation: number;
}) {
  const { camera, raycaster, pointer } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [worldPosition, setWorldPosition] = useState<THREE.Vector3 | null>(null);

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

  // Update position on each frame based on mouse
  useFrame(() => {
    // Only update if pointer is valid (inside canvas)
    if (pointer.x < -1 || pointer.x > 1 || pointer.y < -1 || pointer.y > 1) {
      setWorldPosition(null);
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const target = new THREE.Vector3();
    const result = raycaster.ray.intersectPlane(boardPlane, target);

    if (result) {
      setWorldPosition(target.clone());
    } else {
      setWorldPosition(null);
    }
  });

  if (!shapeDefinition || !worldPosition) return null;

  // Position centered on cursor
  const posX = worldPosition.x - centerOffset.x;
  const posZ = worldPosition.z - centerOffset.z;

  return (
    <group ref={groupRef} position={[posX, 0.5, posZ]}>
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
          <meshBasicMaterial color="#58A6FF" transparent opacity={0.9} />
        </mesh>
        {/* Arrow head */}
        <mesh position={[0.35, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.08, 0.16, 6]} />
          <meshBasicMaterial color="#58A6FF" />
        </mesh>
      </group>

      {/* "Press R" hint - small indicator */}
      <mesh position={[centerOffset.x, 1.1, centerOffset.z]} rotation={[-Math.PI / 4, 0, 0]}>
        <planeGeometry args={[0.6, 0.25]} />
        <meshBasicMaterial color="#58A6FF" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// Drag and drop manager component
function DragDropManager() {
  const {
    puzzle,
    boardState,
    selectedBrickId,
    previewRotation,
    hoveredCell,
    setHoveredCell,
    placeBrick,
    moveBrick,
    removeBrick,
    rotateBrick,
    rotatePreview,
    selectBrick,
    isSlidingPuzzle,
    getValidSlideDestinationsFor,
  } = usePuzzleStore();

  const { width, height } = boardState.dimensions;
  const boardOffset = { x: width / 2, y: height / 2 };

  // Find if selectedBrickId is a placed brick (instanceId) or inventory brick (id)
  const selectedPlacedBrick = useMemo(() => {
    return boardState.placedBricks.find(b => b.instanceId === selectedBrickId);
  }, [boardState.placedBricks, selectedBrickId]);

  const selectedInventoryBrick = useMemo(() => {
    if (selectedPlacedBrick) return null;
    return puzzle?.inventory.find(b => b.id === selectedBrickId);
  }, [puzzle, selectedBrickId, selectedPlacedBrick]);

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

  // Handle keyboard events for rotation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Use event.code for physical key position (works with any keyboard layout)
      // Rotate placed brick that is selected
      if (selectedPlacedBrick) {
        if (event.code === 'KeyR') {
          rotateBrick(selectedPlacedBrick.instanceId);
        } else if (event.code === 'Escape' || event.key === 'Escape') {
          selectBrick(null);
        } else if (event.code === 'Delete' || event.code === 'Backspace') {
          // removeBrick will check for NO_BRICK_REMOVAL rule and block if needed
          removeBrick(selectedPlacedBrick.instanceId);
          selectBrick(null);
        }
        return;
      }

      // Rotate inventory brick preview
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

  // Handle board cell hover
  const handleCellHover = useCallback((x: number, y: number | null) => {
    if (y === null) {
      setHoveredCell(null);
    } else {
      setHoveredCell({ x, y });
    }
  }, [setHoveredCell]);

  // Handle board cell click
  const handleCellClick = useCallback((x: number, y: number) => {
    // If we have a placed brick selected (hovering), place it at new position
    if (selectedPlacedBrick) {
      // Check if clicking on the same position - if so, just deselect
      if (selectedPlacedBrick.position.x === x && selectedPlacedBrick.position.y === y) {
        selectBrick(null);
        return;
      }

      moveBrick(selectedPlacedBrick.instanceId, { x, y });
      selectBrick(null);
      return;
    }

    // If we have an inventory brick selected, place it with the preview rotation
    if (selectedInventoryBrick) {
      placeBrick({
        id: selectedInventoryBrick.id,
        instanceId: '',
        shape: selectedInventoryBrick.shape,
        color: selectedInventoryBrick.color,
        position: { x, y },
        rotation: previewRotation, // Use the preview rotation!
        z: 0, // Will be recalculated in placeBrick, but required by type
      });
      selectBrick(null);
    }
  }, [selectedPlacedBrick, selectedInventoryBrick, previewRotation, moveBrick, placeBrick, selectBrick]);

  // Handle right-click on canvas to rotate preview
  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();

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

  if (!puzzle) return null;

  // Get slide destinations for the currently selected placed piece (if sliding puzzle)
  const slideDestinations = selectedPlacedBrick && isSlidingPuzzle()
    ? getValidSlideDestinationsFor(selectedPlacedBrick.instanceId)
    : undefined;

  // Get goal cells from puzzle definition (for slider puzzles)
  const goalCells = puzzle?.goal?.cells as [number, number][] | undefined;

  return (
    <group onContextMenu={handleCanvasContextMenu as any}>
      {/* The board */}
      <LegoBoard
        width={width}
        height={height}
        onCellClick={handleCellClick}
        onCellHover={handleCellHover}
        slideDestinations={slideDestinations}
        goalCells={goalCells}
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
        const isThisBrickSelected = selectedBrickId === brick.instanceId;
        const isInteractive = !selectedInventoryBrick && !selectedPlacedBrick;

        return (
          <PolyominoBrick
            key={brick.instanceId}
            brick={brick}
            isSelected={isThisBrickSelected}
            interactive={isInteractive}
            boardOffset={boardOffset}
            onSelect={() => handleBrickSelect(brick.instanceId)}
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
      {selectedInventoryBrick && hoveredCell && (
        <GhostBrick
          shape={selectedInventoryBrick.shape}
          color={selectedInventoryBrick.color}
          rotation={previewRotation}
          position={{ x: hoveredCell.x - boardOffset.x, y: hoveredCell.y - boardOffset.y }}
          z={ghostZLevel}
          isValid={isGhostValid}
        />
      )}

      {/* Ghost preview when repositioning a placed brick */}
      {selectedPlacedBrick && hoveredCell && (() => {
        // Calculate z-level for moved brick
        const shape = SHAPE_LIBRARY[selectedPlacedBrick.shape];
        if (!shape) return null;

        const rotatedCells = rotateShape(shape.cells, selectedPlacedBrick.rotation || 0);
        const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
          hoveredCell.x + dx,
          hoveredCell.y + dy,
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
            position={{ x: hoveredCell.x - boardOffset.x, y: hoveredCell.y - boardOffset.y }}
            z={movedZLevel}
            isValid={isValidMove}
          />
        );
      })()}
    </group>
  );
}

// Scene lighting and environment
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight
        position={[-5, 10, -5]}
        intensity={0.3}
      />
      <pointLight position={[0, 5, 0]} intensity={0.2} />
    </>
  );
}

// Background grid
function BackgroundGrid() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        color="#0a0a0a"
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
}

// Wrapper component to render floating preview when needed
// This must be inside Canvas to use useThree hooks
function FloatingPreviewWrapper() {
  const { selectedBrickId, boardState, hoveredCell, puzzle, previewRotation } = usePuzzleStore();

  // Check if we have an inventory brick selected (not a placed brick)
  const hasInventorySelection = selectedBrickId &&
    !boardState.placedBricks.find(b => b.instanceId === selectedBrickId);

  // Get the selected inventory brick info
  const selectedInventoryBrick = useMemo(() => {
    if (!hasInventorySelection) return null;
    return puzzle?.inventory.find(b => b.id === selectedBrickId) ?? null;
  }, [puzzle, selectedBrickId, hasInventorySelection]);

  // Only show when we have an inventory brick selected AND not hovering over the board
  if (!selectedInventoryBrick || hoveredCell) return null;

  return (
    <FloatingPreviewBrick
      shape={selectedInventoryBrick.shape}
      color={selectedInventoryBrick.color}
      rotation={previewRotation}
    />
  );
}

export function PuzzleScene() {
  const { selectedBrickId, boardState, rotatePreview } = usePuzzleStore();

  // Check if we have an inventory brick selected (not a placed brick)
  const hasInventorySelection = selectedBrickId &&
    !boardState.placedBricks.find(b => b.instanceId === selectedBrickId);

  // Check if we have a placed brick selected (hovering/moving)
  const hasPlacedBrickSelection = selectedBrickId &&
    boardState.placedBricks.find(b => b.instanceId === selectedBrickId);

  // Hide cursor when any brick is selected for placement/movement
  const shouldHideCursor = hasInventorySelection || hasPlacedBrickSelection;

  return (
    <div
      className="w-full h-full"
      style={{ cursor: shouldHideCursor ? 'none' : 'auto' }}
      onContextMenu={(e) => {
        if (hasInventorySelection) {
          e.preventDefault();
          rotatePreview();
        }
      }}
    >
      <Canvas
        shadows
        style={{ cursor: shouldHideCursor ? 'none' : 'auto' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <PerspectiveCamera
          makeDefault
          position={[8, 12, 12]}
          fov={45}
        />

        <OrbitControls
          makeDefault
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />

        <SceneLighting />

        <Suspense fallback={null}>
          <DragDropManager />
          <FloatingPreviewWrapper />
          <BackgroundGrid />
          <ContactShadows
            position={[0, -0.49, 0]}
            opacity={0.4}
            scale={30}
            blur={2}
            far={10}
          />
        </Suspense>

        {/* Subtle fog for depth */}
        <fog attach="fog" args={['#0a0a0a', 20, 50]} />
      </Canvas>
    </div>
  );
}
