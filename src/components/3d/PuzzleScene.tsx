import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import { LegoBoard } from './LegoBoard';
import { PolyominoBrick, GhostBrick } from './PolyominoBrick';
import { usePuzzleStore } from '../../store/puzzleStore';
import { SHAPE_LIBRARY } from '../../types/puzzle';
import { getBrickCells, rotateShape } from '../../validation/ValidationRegistry';

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

export function PuzzleScene() {
  const { selectedBrickId, boardState, rotatePreview, hoveredCell, puzzle, previewRotation } = usePuzzleStore();
  
  // Check if we have an inventory brick selected (not a placed brick)
  const hasInventorySelection = selectedBrickId && 
    !boardState.placedBricks.find(b => b.instanceId === selectedBrickId);
  
  // Check if we have a placed brick selected (hovering/moving)
  const hasPlacedBrickSelection = selectedBrickId && 
    boardState.placedBricks.find(b => b.instanceId === selectedBrickId);
  
  // Hide cursor when any brick is selected for placement/movement
  const shouldHideCursor = hasInventorySelection || hasPlacedBrickSelection;

  // Cursor position for drag preview overlay
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Get the selected inventory brick info (if any)
  const selectedInventoryBrick = useMemo(() => {
    if (!hasInventorySelection) return null;
    return puzzle?.inventory.find(b => b.id === selectedBrickId) ?? null;
  }, [puzzle, selectedBrickId, hasInventorySelection]);

  // Listen for pointer movements only when an inventory brick is selected
  useEffect(() => {
    if (!hasInventorySelection) return;

    const onPointerMove = (e: PointerEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [hasInventorySelection]);
  
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
          <div className="p-1 bg-editor-sidebar/60 rounded shadow-lg border border-editor-border/40">
            <svg width={72} height={72} viewBox={`0 0 72 72`}>
              {(() => {
                // Render cells as a small 2D preview - keep consistent with Inventory ShapePreview
                const shapeDef = SHAPE_LIBRARY[selectedInventoryBrick.shape];
                if (!shapeDef) return null;

                const cells = rotateShape(shapeDef.cells, previewRotation);
                const maxX = Math.max(...cells.map(([x]) => x)) + 1;
                const maxY = Math.max(...cells.map(([, y]) => y)) + 1;
                const size = 64;
                const cellSize = Math.min(size / maxX, size / maxY) * 0.75;
                const offsetX = (size - maxX * cellSize) / 2;
                const offsetY = (size - maxY * cellSize) / 2;

                return cells.map(([x, y], i) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
