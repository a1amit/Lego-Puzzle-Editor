import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { LegoBoard } from './LegoBoard';
import { PolyominoBrick, GhostBrick } from './PolyominoBrick';
import { usePuzzleStore } from '../../store/puzzleStore';
import { SHAPE_LIBRARY, normalizeCellsTo3D } from '../../types/puzzle';
import { rotateShape3D, getOccupiedCellSet } from '../../validation/ValidationRegistry';

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
  
  // Calculate z-level for ghost preview (for stacking) - now uses 3D collision detection
  const ghostZLevel = useMemo(() => {
    if (!selectedInventoryBrick || !hoveredCell) return 0;

    const shape = SHAPE_LIBRARY[selectedInventoryBrick.shape];
    if (!shape) return 0;

    const cells3D = normalizeCellsTo3D(shape.cells);
    const rotatedCells = rotateShape3D(cells3D, previewRotation);
    const occupiedSet = getOccupiedCellSet(boardState);

    // Find the lowest Z where we can place without collision
    const maxDepth = boardState.dimensions.depth;
    for (let baseZ = 0; baseZ < maxDepth; baseZ++) {
      let canPlace = true;
      for (const [dx, dy, dz] of rotatedCells) {
        const worldX = hoveredCell.x + dx;
        const worldY = hoveredCell.y + dy;
        const worldZ = baseZ + dz;

        if (worldZ >= maxDepth || occupiedSet.has(`${worldX},${worldY},${worldZ}`)) {
          canPlace = false;
          break;
        }
      }
      if (canPlace) return baseZ;
    }

    return maxDepth; // No valid position found (will be marked invalid)
  }, [selectedInventoryBrick, hoveredCell, boardState, previewRotation]);
  
  // Check if ghost position is valid for inventory brick placement - now uses 3D collision
  const isGhostValid = useMemo(() => {
    if (!selectedInventoryBrick || !hoveredCell) return false;

    const shape = SHAPE_LIBRARY[selectedInventoryBrick.shape];
    if (!shape) return false;

    const maxDepth = boardState.dimensions.depth;

    // Check if z-level exceeds board depth
    if (ghostZLevel >= maxDepth) {
      return false;
    }

    const cells3D = normalizeCellsTo3D(shape.cells);
    const rotatedCells = rotateShape3D(cells3D, previewRotation);
    const occupiedSet = getOccupiedCellSet(boardState);

    // Check if all cells are within bounds and not colliding
    for (const [dx, dy, dz] of rotatedCells) {
      const x = hoveredCell.x + dx;
      const y = hoveredCell.y + dy;
      const z = ghostZLevel + dz;

      // Check bounds
      if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= maxDepth) {
        return false;
      }

      // Check for collision with placed bricks
      if (occupiedSet.has(`${x},${y},${z}`)) {
        return false;
      }
    }

    return true;
  }, [selectedInventoryBrick, hoveredCell, boardState, width, height, previewRotation, ghostZLevel]);
  
  // Handle keyboard events for 3D rotation
  // Controls: Q/E for Z-axis, W/S for X-axis, A/D for Y-axis
  // Uses event.key.toLowerCase() for keyboard layout independence
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Rotate placed brick that is selected
      if (selectedPlacedBrick) {
        // Z-axis rotation (Q/E or R for legacy)
        if (key === 'q' || key === 'r') {
          rotateBrick(selectedPlacedBrick.instanceId, 'z');
        } else if (key === 'e') {
          // Rotate opposite direction on Z (rotate 3 times = -90)
          rotateBrick(selectedPlacedBrick.instanceId, 'z');
          rotateBrick(selectedPlacedBrick.instanceId, 'z');
          rotateBrick(selectedPlacedBrick.instanceId, 'z');
        }
        // X-axis rotation (W/S)
        else if (key === 'w') {
          rotateBrick(selectedPlacedBrick.instanceId, 'x');
        } else if (key === 's') {
          rotateBrick(selectedPlacedBrick.instanceId, 'x');
          rotateBrick(selectedPlacedBrick.instanceId, 'x');
          rotateBrick(selectedPlacedBrick.instanceId, 'x');
        }
        // Y-axis rotation (A/D)
        else if (key === 'a') {
          rotateBrick(selectedPlacedBrick.instanceId, 'y');
        } else if (key === 'd') {
          rotateBrick(selectedPlacedBrick.instanceId, 'y');
          rotateBrick(selectedPlacedBrick.instanceId, 'y');
          rotateBrick(selectedPlacedBrick.instanceId, 'y');
        }
        // Escape to deselect
        else if (key === 'escape') {
          selectBrick(null);
        }
        // Delete/Backspace to remove
        else if (key === 'delete' || key === 'backspace') {
          removeBrick(selectedPlacedBrick.instanceId);
          selectBrick(null);
        }
        return;
      }

      // Rotate inventory brick preview
      if (selectedInventoryBrick) {
        // Z-axis rotation (Q/E or R for legacy)
        if (key === 'q' || key === 'r') {
          rotatePreview('z');
        } else if (key === 'e') {
          rotatePreview('z');
          rotatePreview('z');
          rotatePreview('z');
        }
        // X-axis rotation (W/S)
        else if (key === 'w') {
          rotatePreview('x');
        } else if (key === 's') {
          rotatePreview('x');
          rotatePreview('x');
          rotatePreview('x');
        }
        // Y-axis rotation (A/D)
        else if (key === 'a') {
          rotatePreview('y');
        } else if (key === 'd') {
          rotatePreview('y');
          rotatePreview('y');
          rotatePreview('y');
        }
        // Escape to deselect
        else if (key === 'escape') {
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
        position: { x, y, z: 0 }, // z will be recalculated in placeBrick
        rotation: previewRotation, // Use the 3D preview rotation!
      });
      selectBrick(null);
    }
  }, [selectedPlacedBrick, selectedInventoryBrick, previewRotation, moveBrick, placeBrick, selectBrick]);
  
  // Handle right-click on canvas to rotate preview (Z-axis by default)
  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();

    if (selectedInventoryBrick) {
      rotatePreview('z');
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
  
  // Handle brick rotation (Z-axis by default for click-based rotation)
  const handleBrickRotate = useCallback((instanceId: string) => {
    rotateBrick(instanceId, 'z');
  }, [rotateBrick]);
  
  // Handle brick removal
  const handleBrickRemove = useCallback((instanceId: string) => {
    removeBrick(instanceId);
    selectBrick(null);
  }, [removeBrick, selectBrick]);
  
  if (!puzzle) return null;
  
  return (
    <group onContextMenu={handleCanvasContextMenu as any}>
      {/* The board */}
      <LegoBoard
        width={width}
        height={height}
        onCellClick={handleCellClick}
        onCellHover={handleCellHover}
      />
      
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
        // Calculate z-level for moved brick using 3D collision detection
        const shape = SHAPE_LIBRARY[selectedPlacedBrick.shape];
        if (!shape) return null;

        const cells3D = normalizeCellsTo3D(shape.cells);
        const rotatedCells = rotateShape3D(cells3D, selectedPlacedBrick.rotation);
        const occupiedSet = getOccupiedCellSet(boardState, selectedPlacedBrick.instanceId);
        const maxDepth = boardState.dimensions.depth;

        // Find the lowest Z where we can place
        let movedZLevel = 0;
        let isValidMove = false;

        for (let baseZ = 0; baseZ < maxDepth; baseZ++) {
          let canPlace = true;
          for (const [dx, dy, dz] of rotatedCells) {
            const worldX = hoveredCell.x + dx;
            const worldY = hoveredCell.y + dy;
            const worldZ = baseZ + dz;

            if (worldZ >= maxDepth || worldZ < 0 ||
                worldX < 0 || worldX >= boardState.dimensions.width ||
                worldY < 0 || worldY >= boardState.dimensions.height ||
                occupiedSet.has(`${worldX},${worldY},${worldZ}`)) {
              canPlace = false;
              break;
            }
          }
          if (canPlace) {
            movedZLevel = baseZ;
            isValidMove = true;
            break;
          }
        }

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

export function PuzzleScene() {
  const { selectedBrickId, boardState, rotatePreview, hoveredCell, puzzle, previewRotation } = usePuzzleStore();
  
  // Check if we have an inventory brick selected (not a placed brick)
  const hasInventorySelection = selectedBrickId && 
    !boardState.placedBricks.find(b => b.instanceId === selectedBrickId);
  
  // Check if we have a placed brick selected (hovering/moving)
  const selectedPlacedBrick = useMemo(() => {
    if (!selectedBrickId) return null;
    return boardState.placedBricks.find(b => b.instanceId === selectedBrickId) ?? null;
  }, [selectedBrickId, boardState.placedBricks]);

  const hasPlacedBrickSelection = !!selectedPlacedBrick;

  // Hide cursor when any brick is selected for placement/movement
  const shouldHideCursor = hasInventorySelection || hasPlacedBrickSelection;

  // Cursor position for drag preview overlay
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Get the selected inventory brick info (if any)
  const selectedInventoryBrick = useMemo(() => {
    if (!hasInventorySelection) return null;
    return puzzle?.inventory.find(b => b.id === selectedBrickId) ?? null;
  }, [puzzle, selectedBrickId, hasInventorySelection]);

  // Listen for pointer movements when any brick is selected
  useEffect(() => {
    if (!hasInventorySelection && !hasPlacedBrickSelection) return;

    const onPointerMove = (e: PointerEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [hasInventorySelection, hasPlacedBrickSelection]);
  
  return (
    <div 
      className="w-full h-full"
      style={{ cursor: shouldHideCursor ? 'none' : 'auto' }}
      onContextMenu={(e) => {
        if (hasInventorySelection) {
          e.preventDefault();
          rotatePreview('z');
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
          <Physics gravity={[0, -9.81, 0]} colliders={false}>
            <DragDropManager />
            <BackgroundGrid />
          </Physics>
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

      {/* Drag preview overlay: shows a 2D preview of the selected inventory brick following the pointer
          This appears only while an inventory brick is selected and the pointer is not hovering over the board */}
      {hasInventorySelection && !hoveredCell && selectedInventoryBrick && (
        <div
          style={{
            position: 'absolute',
            left: cursorPos.x,
            top: cursorPos.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1200,
          }}
        >
          <div className="p-2 bg-editor-sidebar/80 rounded-lg shadow-lg border border-editor-border/40">
            <svg width={72} height={72} viewBox={`0 0 72 72`}>
              {(() => {
                // Render cells as a small 2D preview - now using 3D rotation
                const shapeDef = SHAPE_LIBRARY[selectedInventoryBrick.shape];
                if (!shapeDef) return null;

                const cells3D = normalizeCellsTo3D(shapeDef.cells);
                const cells = rotateShape3D(cells3D, previewRotation);
                // Project 3D cells to 2D (x, y) for preview
                const maxX = Math.max(...cells.map((c: [number, number, number]) => c[0])) + 1;
                const maxY = Math.max(...cells.map((c: [number, number, number]) => c[1])) + 1;
                const size = 64;
                const cellSize = Math.min(size / maxX, size / maxY) * 0.75;
                const offsetX = (size - maxX * cellSize) / 2;
                const offsetY = (size - maxY * cellSize) / 2;

                return cells.map(([x, y]: [number, number, number], i: number) => (
                  <g key={i}>
                    <rect
                      x={offsetX + x * cellSize + 1}
                      y={offsetY + y * cellSize + 1}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      fill={selectedInventoryBrick.color}
                      rx={3}
                    />
                    <circle
                      cx={offsetX + x * cellSize + cellSize / 2}
                      cy={offsetY + y * cellSize + cellSize / 2}
                      r={cellSize * 0.24}
                      fill={selectedInventoryBrick.color}
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth={1}
                    />
                  </g>
                ));
              })()}
            </svg>
            {/* Rotation values for inventory brick */}
            <div className="flex justify-center gap-1.5 text-[9px] font-mono mt-1">
              <span className="px-1 py-0.5 bg-red-500/20 text-red-400 rounded">
                X:{previewRotation.x}
              </span>
              <span className="px-1 py-0.5 bg-green-500/20 text-green-400 rounded">
                Y:{previewRotation.y}
              </span>
              <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                Z:{previewRotation.z}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected placed brick info overlay - shows rotation state when moving/rotating a placed brick */}
      {hasPlacedBrickSelection && selectedPlacedBrick && (
        <div
          style={{
            position: 'absolute',
            left: cursorPos.x + 20,
            top: cursorPos.y - 60,
            pointerEvents: 'none',
            zIndex: 1200,
          }}
        >
          <div className="p-2 bg-editor-sidebar/90 rounded-lg shadow-lg border border-editor-accent/50">
            {/* Shape preview with current rotation */}
            <div className="flex items-center gap-2 mb-1">
              <svg width={48} height={48} viewBox="0 0 48 48">
                {(() => {
                  const shapeDef = SHAPE_LIBRARY[selectedPlacedBrick.shape];
                  if (!shapeDef) return null;

                  const cells3D = normalizeCellsTo3D(shapeDef.cells);
                  const cells = rotateShape3D(cells3D, selectedPlacedBrick.rotation);
                  const maxX = Math.max(...cells.map((c: [number, number, number]) => c[0])) + 1;
                  const maxY = Math.max(...cells.map((c: [number, number, number]) => c[1])) + 1;
                  const size = 44;
                  const cellSize = Math.min(size / maxX, size / maxY) * 0.8;
                  const offsetX = (size - maxX * cellSize) / 2;
                  const offsetY = (size - maxY * cellSize) / 2;

                  return cells.map(([x, y]: [number, number, number], i: number) => (
                    <g key={i}>
                      <rect
                        x={offsetX + x * cellSize + 1}
                        y={offsetY + y * cellSize + 1}
                        width={cellSize - 2}
                        height={cellSize - 2}
                        fill={selectedPlacedBrick.color}
                        rx={2}
                      />
                      <circle
                        cx={offsetX + x * cellSize + cellSize / 2}
                        cy={offsetY + y * cellSize + cellSize / 2}
                        r={cellSize * 0.2}
                        fill={selectedPlacedBrick.color}
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth={1}
                      />
                    </g>
                  ));
                })()}
              </svg>
              <div className="text-xs">
                <div className="text-gray-400 font-display">{selectedPlacedBrick.shape}</div>
                <div className="text-white font-bold">Selected</div>
              </div>
            </div>
            {/* Rotation values */}
            <div className="flex gap-2 text-[10px] font-mono">
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                X:{selectedPlacedBrick.rotation.x}
              </span>
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                Y:{selectedPlacedBrick.rotation.y}
              </span>
              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                Z:{selectedPlacedBrick.rotation.z}
              </span>
            </div>
            {/* Controls hint */}
            <div className="mt-1 text-[9px] text-gray-500">
              W/S: X-rot | A/D: Y-rot | Q/E: Z-rot
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
