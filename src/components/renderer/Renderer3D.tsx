/**
 * Renderer3D - 3D Puzzle Renderer
 * 
 * Bridges the headless puzzle engine with the Three.js rendering components.
 * This component consumes the engine state and passes it to the 3D scene.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { UsePuzzleEngineReturn } from '../../engine';
import { rotateShape, getPieceCells } from '../../engine';
import { SHAPE_LIBRARY } from '../../types/puzzle';
import { LegoBoard } from '../3d/LegoBoard';
import { PolyominoBrick, GhostBrick } from '../3d/PolyominoBrick';
import { CinematicEffects } from '../3d/CinematicEffects';
import { SCENE_3D } from '../../config/sceneConfig';

interface Renderer3DProps {
  engine: UsePuzzleEngineReturn;
  className?: string;
}

// ============================================
// DRAG DROP MANAGER (3D)
// ============================================

interface DragDropManager3DProps {
  engine: UsePuzzleEngineReturn;
}

function DragDropManager3D({ engine }: DragDropManager3DProps) {
  const {
    puzzle,
    board,
    selectedPieceId,
    previewRotation,
    hoveredCell,
    placePiece,
    removePiece,
    movePiece,
    rotatePiece,
    selectPiece,
    rotatePreview,
    setHoveredCell,
  } = engine;
  
  const { width, height } = board.dimensions;
  const boardOffset = { x: width / 2, y: height / 2 };
  
  // Find if selectedPieceId is a placed piece or inventory piece
  const selectedPlacedPiece = useMemo(() => {
    return board.placedPieces.find(p => p.instanceId === selectedPieceId);
  }, [board.placedPieces, selectedPieceId]);
  
  const selectedInventoryPiece = useMemo(() => {
    if (selectedPlacedPiece) return null;
    return puzzle?.inventory.find(p => p.id === selectedPieceId);
  }, [puzzle, selectedPieceId, selectedPlacedPiece]);
  
  // Calculate z-level for ghost preview
  const ghostZLevel = useMemo(() => {
    if (!selectedInventoryPiece || !hoveredCell) return 0;
    
    const shape = SHAPE_LIBRARY[selectedInventoryPiece.shape];
    if (!shape) return 0;
    
    const rotatedCells = rotateShape(shape.cells, previewRotation);
    const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
      hoveredCell.x + dx,
      hoveredCell.y + dy,
    ]);
    
    let maxZ = -1;
    for (const piece of board.placedPieces) {
      const pieceCells = getPieceCells(piece);
      const pieceCellSet = new Set(pieceCells.map(([x, y]) => `${x},${y}`));
      
      for (const [x, y] of cells) {
        if (pieceCellSet.has(`${x},${y}`)) {
          maxZ = Math.max(maxZ, piece.position.z);
        }
      }
    }
    
    return maxZ + 1;
  }, [selectedInventoryPiece, hoveredCell, board.placedPieces, previewRotation]);
  
  // Check if ghost position is valid
  const isGhostValid = useMemo(() => {
    if (!selectedInventoryPiece || !hoveredCell) return false;
    
    const shape = SHAPE_LIBRARY[selectedInventoryPiece.shape];
    if (!shape) return false;
    
    const maxAllowedZ = board.dimensions.depth - 1;
    if (ghostZLevel > maxAllowedZ) return false;
    
    const rotatedCells = rotateShape(shape.cells, previewRotation);
    
    for (const [dx, dy] of rotatedCells) {
      const x = hoveredCell.x + dx;
      const y = hoveredCell.y + dy;
      
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      
      for (const placed of board.placedPieces) {
        if (placed.position.z !== ghostZLevel) continue;
        const placedCells = getPieceCells(placed);
        for (const [px, py] of placedCells) {
          if (px === x && py === y) return false;
        }
      }
    }
    
    return true;
  }, [selectedInventoryPiece, hoveredCell, board, width, height, previewRotation, ghostZLevel]);
  
  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (selectedPlacedPiece) {
        if (event.code === 'KeyR') {
          rotatePiece(selectedPlacedPiece.instanceId);
        } else if (event.code === 'Escape') {
          selectPiece(null);
        } else if (event.code === 'Delete' || event.code === 'Backspace') {
          removePiece(selectedPlacedPiece.instanceId);
          selectPiece(null);
        }
        return;
      }
      
      if (selectedInventoryPiece) {
        if (event.code === 'KeyR') {
          rotatePreview();
        } else if (event.code === 'Escape') {
          selectPiece(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlacedPiece, selectedInventoryPiece, rotatePiece, rotatePreview, selectPiece, removePiece]);
  
  // Cell hover handler
  const handleCellHover = useCallback((x: number, y: number | null) => {
    if (y === null) {
      setHoveredCell(null);
    } else {
      setHoveredCell({ x, y });
    }
  }, [setHoveredCell]);
  
  // Cell click handler
  const handleCellClick = useCallback((x: number, y: number) => {
    if (selectedPlacedPiece) {
      if (selectedPlacedPiece.position.x === x && selectedPlacedPiece.position.y === y) {
        selectPiece(null);
        return;
      }
      movePiece(selectedPlacedPiece.instanceId, { x, y, z: 0 });
      selectPiece(null);
      return;
    }
    
    if (selectedInventoryPiece) {
      placePiece(selectedInventoryPiece.id, { x, y, z: 0 }, previewRotation);
      selectPiece(null);
    }
  }, [selectedPlacedPiece, selectedInventoryPiece, previewRotation, movePiece, placePiece, selectPiece]);
  
  // Piece handlers
  const handlePieceSelect = useCallback((instanceId: string) => {
    selectPiece(instanceId);
  }, [selectPiece]);
  
  const handlePieceDeselect = useCallback(() => {
    selectPiece(null);
  }, [selectPiece]);
  
  const handlePieceRotate = useCallback((instanceId: string) => {
    rotatePiece(instanceId);
  }, [rotatePiece]);
  
  const handlePieceRemove = useCallback((instanceId: string) => {
    removePiece(instanceId);
    selectPiece(null);
  }, [removePiece, selectPiece]);

  // Convert engine pieces to the format expected by 3D components
  const placedBricks = useMemo(() => {
    if (!puzzle) return [];
    return board.placedPieces.map(p => ({
      id: p.id,
      instanceId: p.instanceId,
      shape: p.shape,
      color: p.color,
      position: { x: p.position.x, y: p.position.y },
      rotation: p.rotation,
      z: p.position.z,
    }));
  }, [puzzle, board.placedPieces]);

  if (!puzzle) return null;

  return (
    <group>
      {/* The board */}
      <LegoBoard
        width={width}
        height={height}
        onCellClick={handleCellClick}
        onCellHover={handleCellHover}
      />
      
      {/* Placed bricks */}
      {placedBricks.map((brick) => {
        const isThisBrickSelected = selectedPieceId === brick.instanceId;
        const isInteractive = !selectedInventoryPiece && !selectedPlacedPiece;
        
        return (
          <PolyominoBrick
            key={brick.instanceId}
            brick={brick}
            isSelected={isThisBrickSelected}
            interactive={isInteractive}
            boardOffset={boardOffset}
            onSelect={() => handlePieceSelect(brick.instanceId)}
            onDeselect={handlePieceDeselect}
            onRotate={() => handlePieceRotate(brick.instanceId)}
            onRemove={() => handlePieceRemove(brick.instanceId)}
            onDragEnd={(pos) => {
              movePiece(brick.instanceId, { ...pos, z: 0 });
              selectPiece(null);
            }}
          />
        );
      })}
      
      {/* Ghost preview for inventory placement */}
      {selectedInventoryPiece && hoveredCell && (
        <GhostBrick
          shape={selectedInventoryPiece.shape}
          color={selectedInventoryPiece.color}
          rotation={previewRotation}
          position={{ x: hoveredCell.x - boardOffset.x, y: hoveredCell.y - boardOffset.y }}
          z={ghostZLevel}
          isValid={isGhostValid}
        />
      )}
      
      {/* Ghost preview for moving placed brick */}
      {selectedPlacedPiece && hoveredCell && (() => {
        const shape = SHAPE_LIBRARY[selectedPlacedPiece.shape];
        if (!shape) return null;
        
        const rotatedCells = rotateShape(shape.cells, selectedPlacedPiece.rotation);
        const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
          hoveredCell.x + dx,
          hoveredCell.y + dy,
        ]);
        
        const otherPieces = board.placedPieces.filter(p => p.instanceId !== selectedPlacedPiece.instanceId);
        let maxZ = -1;
        for (const piece of otherPieces) {
          const pieceCells = getPieceCells(piece);
          const pieceCellSet = new Set(pieceCells.map(([x, y]) => `${x},${y}`));
          for (const [x, y] of cells) {
            if (pieceCellSet.has(`${x},${y}`)) {
              maxZ = Math.max(maxZ, piece.position.z);
            }
          }
        }
        const movedZLevel = maxZ + 1;
        
        const maxAllowedZ = board.dimensions.depth - 1;
        const isValidMove = movedZLevel <= maxAllowedZ;
        
        return (
          <GhostBrick
            shape={selectedPlacedPiece.shape}
            color={selectedPlacedPiece.color}
            rotation={selectedPlacedPiece.rotation}
            position={{ x: hoveredCell.x - boardOffset.x, y: hoveredCell.y - boardOffset.y }}
            z={movedZLevel}
            isValid={isValidMove}
          />
        );
      })()}
    </group>
  );
}

// ============================================
// SCENE COMPONENTS
// ============================================

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

// ============================================
// MAIN 3D RENDERER
// ============================================

export function Renderer3D({ engine, className = '' }: Renderer3DProps) {
  const { selectedPieceId, board, rotatePreview, hoveredCell, puzzle, previewRotation } = engine;
  
  // Check if we have an inventory piece selected
  const hasInventorySelection = selectedPieceId && 
    !board.placedPieces.find(p => p.instanceId === selectedPieceId);
  
  // Check if we have a placed piece selected
  const hasPlacedPieceSelection = selectedPieceId && 
    board.placedPieces.find(p => p.instanceId === selectedPieceId);
  
  const shouldHideCursor = hasInventorySelection || hasPlacedPieceSelection;
  const boardCellCount = board.dimensions.width * board.dimensions.height;
  const isLargeBoard = boardCellCount >= 400;
  const effectiveDpr = isLargeBoard
    ? ([1, 1.5] as [number, number])
    : (SCENE_3D.renderer.dpr as unknown as [number, number]);
  
  // Cursor position for drag preview overlay
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  
  // Get selected inventory piece
  const selectedInventoryPiece = useMemo(() => {
    if (!hasInventorySelection) return null;
    return puzzle?.inventory.find(p => p.id === selectedPieceId) ?? null;
  }, [puzzle, selectedPieceId, hasInventorySelection]);
  
  // Track cursor for preview
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
      className={`w-full h-full ${className}`}
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
        dpr={effectiveDpr}
        gl={{
          antialias: !isLargeBoard,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = SCENE_3D.renderer.toneMappingExposure;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = isLargeBoard ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
          scene.background = new THREE.Color(SCENE_3D.background.color);
        }}
        style={{ cursor: shouldHideCursor ? 'none' : 'auto' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <PerspectiveCamera
          makeDefault
          position={SCENE_3D.camera.position as unknown as [number, number, number]}
          fov={SCENE_3D.camera.fov}
        />
        
        <OrbitControls
          makeDefault
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          enableDamping
          dampingFactor={0.08}
          minDistance={SCENE_3D.camera.minZoom}
          maxDistance={SCENE_3D.camera.maxZoom}
          maxPolarAngle={SCENE_3D.camera.maxPolarAngle}
          target={SCENE_3D.camera.target as unknown as [number, number, number]}
        />
        
        <SceneLighting />
        
        <Suspense fallback={null}>
          <DragDropManager3D engine={engine} />
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
        
        <fog attach="fog" args={[SCENE_3D.fog.color, SCENE_3D.fog.near, SCENE_3D.fog.far]} />
      </Canvas>
      
      {/* Drag preview overlay */}
      {hasInventorySelection && !hoveredCell && selectedInventoryPiece && (
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
          <div className="p-1.5 bg-[var(--surface-raised)]/90 rounded-xl shadow-2xl border border-[var(--border-subtle)] backdrop-blur-md">
            <svg width={72} height={72} viewBox="0 0 72 72">
              {(() => {
                const shapeDef = SHAPE_LIBRARY[selectedInventoryPiece.shape];
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
                      fill={selectedInventoryPiece.color}
                      rx={3}
                    />
                    <circle
                      cx={offsetX + x * cellSize + cellSize / 2}
                      cy={offsetY + y * cellSize + cellSize / 2}
                      r={cellSize * 0.24}
                      fill={selectedInventoryPiece.color}
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

