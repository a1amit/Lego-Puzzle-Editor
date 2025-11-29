import { useMemo, useRef, useState, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHAPE_LIBRARY, PlacedBrick, ShapeDefinition } from '../../types/puzzle';
import { rotateShape } from '../../validation/ValidationRegistry';

interface PolyominoBrickProps {
  brick: PlacedBrick;
  isSelected?: boolean;
  isGhost?: boolean;
  isValid?: boolean;
  interactive?: boolean; // Whether the brick responds to clicks
  onSelect?: () => void;
  onDeselect?: () => void;
  onRotate?: () => void;
  onRemove?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  boardOffset?: { x: number; y: number };
}

const CELL_SIZE = 1;
const BRICK_HEIGHT = 0.4;
const STUD_RADIUS = 0.25;
const STUD_HEIGHT = 0.15;
const HOVER_HEIGHT = 1.5; // Height when brick is lifted
const BRICK_STACK_HEIGHT = BRICK_HEIGHT + STUD_HEIGHT; // Total height of one brick layer

// Individual brick cell with stud
function BrickCell({ 
  x, 
  y, 
  color,
  isGhost,
  isSelected,
  isHovering,
}: { 
  x: number; 
  y: number; 
  color: string;
  isGhost?: boolean;
  isSelected?: boolean;
  isHovering?: boolean;
}) {
  return (
    <group position={[x * CELL_SIZE + 0.5, 0, y * CELL_SIZE + 0.5]}>
      {/* Brick body */}
      <mesh 
        position={[0, BRICK_HEIGHT / 2, 0]} 
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[CELL_SIZE - 0.04, BRICK_HEIGHT, CELL_SIZE - 0.04]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.4}
          metalness={0.1}
          transparent={isGhost}
          opacity={isGhost ? 0.5 : 1}
          emissive={isSelected || isHovering ? color : '#000000'}
          emissiveIntensity={isSelected || isHovering ? 0.3 : 0}
        />
      </mesh>
      
      {/* Stud on top */}
      <mesh 
        position={[0, BRICK_HEIGHT + STUD_HEIGHT / 2, 0]} 
        castShadow
      >
        <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.35}
          metalness={0.15}
          transparent={isGhost}
          opacity={isGhost ? 0.5 : 1}
          emissive={isSelected || isHovering ? color : '#000000'}
          emissiveIntensity={isSelected || isHovering ? 0.3 : 0}
        />
      </mesh>
      
      {/* Light reflection on stud */}
      {!isGhost && (
        <mesh position={[0.08, BRICK_HEIGHT + STUD_HEIGHT + 0.001, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[STUD_RADIUS * 0.4, 16]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

export function PolyominoBrick({
  brick,
  isSelected = false,
  isGhost = false,
  isValid = true,
  interactive = true, // Default to interactive
  onSelect,
  onDeselect,
  onRotate,
  onRemove,
  onDragEnd: _onDragEnd,
  boardOffset = { x: 0, y: 0 },
}: PolyominoBrickProps) {
  // Note: _onDragEnd is available for future drag-and-drop functionality
  void _onDragEnd;
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const targetHeight = useRef(0);
  const targetRotation = useRef(0);
  
  // Get shape definition
  const shape: ShapeDefinition | undefined = SHAPE_LIBRARY[brick.shape];
  
  // Calculate base height from z-level (stacking)
  const baseHeight = (brick.z || 0) * BRICK_STACK_HEIGHT;
  
  // Update target height based on selection
  useEffect(() => {
    targetHeight.current = isSelected ? baseHeight + HOVER_HEIGHT : baseHeight;
  }, [isSelected, baseHeight]);
  
  // Update rotation when brick.rotation changes
  useEffect(() => {
    targetRotation.current = (brick.rotation * Math.PI) / 180;
  }, [brick.rotation]);
  
  // Clear hover state when not interactive
  useEffect(() => {
    if (!interactive) {
      setHovered(false);
    }
  }, [interactive]);
  
  // Smooth animation for height and rotation
  useFrame((_, delta) => {
    // Animate height
    const heightDiff = targetHeight.current - currentHeight;
    if (Math.abs(heightDiff) > 0.01) {
      setCurrentHeight(prev => prev + heightDiff * Math.min(delta * 8, 1));
    }
    
    // Animate rotation
    const rotDiff = targetRotation.current - rotationAngle;
    if (Math.abs(rotDiff) > 0.01) {
      setRotationAngle(prev => prev + rotDiff * Math.min(delta * 10, 1));
    }
    
    // Gentle floating animation when selected
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = currentHeight + Math.sin(Date.now() * 0.003) * 0.05;
    } else if (groupRef.current) {
      groupRef.current.position.y = currentHeight;
    }
  });
  
  if (!shape) {
    console.warn(`Unknown shape: ${brick.shape}`);
    return null;
  }
  
  // Apply rotation to shape cells for rendering
  const rotatedCells = useMemo(() => {
    return rotateShape(shape.cells, brick.rotation);
  }, [shape.cells, brick.rotation]);
  
  // Render cells
  const cells = useMemo(() => {
    return rotatedCells.map(([dx, dy], index) => (
      <BrickCell
        key={`${dx}-${dy}-${index}`}
        x={dx}
        y={dy}
        color={isValid ? brick.color : '#888888'}
        isGhost={isGhost}
        isSelected={isSelected}
        isHovering={hovered && interactive}
      />
    ));
  }, [rotatedCells, brick.color, isGhost, isSelected, isValid, hovered, interactive]);
  
  // Handle click - toggle selection (only if interactive)
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return; // Let click pass through to board
    
    event.stopPropagation();
    
    if (isSelected) {
      // If already selected, clicking again places it back down
      onDeselect?.();
    } else {
      onSelect?.();
    }
  };
  
  // Handle right-click to rotate (only if interactive)
  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    
    event.stopPropagation();
    // Prevent browser context menu
    event.nativeEvent.preventDefault();
    onRotate?.();
  };
  
  // Handle double-click to remove (only if interactive)
  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    
    event.stopPropagation();
    onRemove?.();
  };
  
  const handlePointerEnter = () => {
    if (interactive) setHovered(true);
  };
  
  const handlePointerLeave = () => setHovered(false);
  
  // Calculate actual position
  const posX = brick.position.x - boardOffset.x;
  const posZ = brick.position.y - boardOffset.y;
  
  // Calculate center offset for rotation pivot
  const centerX = rotatedCells.length > 0 
    ? (Math.max(...rotatedCells.map(c => c[0])) + 1) / 2 
    : 0.5;
  const centerZ = rotatedCells.length > 0 
    ? (Math.max(...rotatedCells.map(c => c[1])) + 1) / 2 
    : 0.5;
  
  return (
    <group
      ref={groupRef}
      position={[posX, 0, posZ]}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Brick cells */}
      <group>
        {cells}
      </group>
      
      {/* Selection/hover glow effect - only show when interactive */}
      {(isSelected || (hovered && interactive)) && !isGhost && (
        <>
          {/* Ground shadow when hovering */}
          {isSelected && (
            <mesh 
              position={[centerX, 0.01, centerZ]} 
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[
                Math.max(...rotatedCells.map(c => c[0])) + 1.5,
                Math.max(...rotatedCells.map(c => c[1])) + 1.5
              ]} />
              <meshBasicMaterial 
                color="#000000"
                transparent
                opacity={0.3}
              />
            </mesh>
          )}
          
          {/* Selection ring */}
          <mesh position={[centerX, 0.02, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[
              Math.max(
                Math.max(...rotatedCells.map(c => c[0])) + 1,
                Math.max(...rotatedCells.map(c => c[1])) + 1
              ) * 0.6,
              Math.max(
                Math.max(...rotatedCells.map(c => c[0])) + 1,
                Math.max(...rotatedCells.map(c => c[1])) + 1
              ) * 0.7,
              32
            ]} />
            <meshBasicMaterial 
              color={isSelected ? '#58A6FF' : '#ffffff'}
              transparent
              opacity={isSelected ? 0.6 : 0.3}
            />
          </mesh>
        </>
      )}
      
      {/* Rotation indicator when selected */}
      {isSelected && (
        <group position={[centerX, BRICK_HEIGHT + 0.8, centerZ]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.4, 0.05, 8, 32, Math.PI * 1.5]} />
            <meshBasicMaterial color="#58A6FF" transparent opacity={0.8} />
          </mesh>
          {/* Arrow head */}
          <mesh position={[0.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.1, 0.2, 8]} />
            <meshBasicMaterial color="#58A6FF" />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Ghost preview brick for drag operations
export function GhostBrick({
  shape,
  color,
  rotation,
  position,
  z = 0,
  isValid,
}: {
  shape: string;
  color: string;
  rotation: number;
  position: { x: number; y: number };
  z?: number;
  isValid: boolean;
}) {
  const shapeDefinition = SHAPE_LIBRARY[shape];
  if (!shapeDefinition) return null;
  
  const rotatedCells = rotateShape(shapeDefinition.cells, rotation);
  const baseHeight = z * BRICK_STACK_HEIGHT;
  
  return (
    <group position={[position.x, baseHeight + 0.05, position.y]}>
      {rotatedCells.map(([dx, dy], index) => (
        <mesh
          key={index}
          position={[dx + 0.5, 0.2, dy + 0.5]}
        >
          <boxGeometry args={[0.9, 0.4, 0.9]} />
          <meshBasicMaterial
            color={isValid ? color : '#ff4444'}
            transparent
            opacity={0.4}
            wireframe={!isValid}
          />
        </mesh>
      ))}
    </group>
  );
}
