import { Suspense, useCallback, useEffect, useMemo } from 'react';
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
  
  // Check if ghost position is valid for inventory brick placement
  const isGhostValid = useMemo(() => {
    if (!selectedInventoryBrick || !hoveredCell) return false;
    
    const shape = SHAPE_LIBRARY[selectedInventoryBrick.shape];
    if (!shape) return false;
    
    // Use previewRotation for inventory bricks
    const rotatedCells = rotateShape(shape.cells, previewRotation);
    
    // Check if all cells are within bounds
    for (const [dx, dy] of rotatedCells) {
      const x = hoveredCell.x + dx;
      const y = hoveredCell.y + dy;
      
      if (x < 0 || x >= width || y < 0 || y >= height) {
        return false;
      }
      
      // Check for overlap with other placed bricks
      for (const placed of boardState.placedBricks) {
        const placedCells = getBrickCells(placed);
        for (const [px, py] of placedCells) {
          if (px === x && py === y) {
            return false;
          }
        }
      }
    }
    
    return true;
  }, [selectedInventoryBrick, hoveredCell, boardState, width, height, previewRotation]);
  
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
        // - No inventory brick is selected (we're not in placement mode)
        // - OR this specific brick is currently selected (so it can be deselected)
        const isThisBrickSelected = selectedBrickId === brick.instanceId;
        const isInteractive = !selectedInventoryBrick || isThisBrickSelected;
        
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
          isValid={isGhostValid}
        />
      )}
      
      {/* Ghost preview when repositioning a placed brick */}
      {selectedPlacedBrick && hoveredCell && (
        <GhostBrick
          shape={selectedPlacedBrick.shape}
          color={selectedPlacedBrick.color}
          rotation={selectedPlacedBrick.rotation}
          position={{ x: hoveredCell.x - boardOffset.x, y: hoveredCell.y - boardOffset.y }}
          isValid={true}
        />
      )}
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
