import { useMemo, useRef, useState, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { SHAPE_LIBRARY, PlacedBrick, ShapeDefinition, Rotation3D, normalizeCellsTo3D } from '../../types/puzzle';
import { rotateShape3D } from '../../validation/ValidationRegistry';

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

// Individual brick cell with stud - now supports 3D positioning
function BrickCell({
  x,
  y,
  z = 0,
  color,
  isGhost,
  isSelected,
  isHovering,
}: {
  x: number;
  y: number;
  z?: number;
  color: string;
  isGhost?: boolean;
  isSelected?: boolean;
  isHovering?: boolean;
}) {
  // Position in local brick space - x maps to X, y maps to Z, z maps to Y (up)
  return (
    <group position={[x * CELL_SIZE + 0.5, z * BRICK_STACK_HEIGHT, y * CELL_SIZE + 0.5]}>
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
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Get shape definition
  const shape: ShapeDefinition | undefined = SHAPE_LIBRARY[brick.shape];

  // Clear hover state when not interactive
  useEffect(() => {
    if (!interactive) {
      setHovered(false);
    }
  }, [interactive]);

  // Update rigid body position when brick moves or is selected
  useEffect(() => {
    if (rigidBodyRef.current) {
      const brickPosX = brick.position.x - boardOffset.x;
      const brickPosY = brick.position.z * BRICK_STACK_HEIGHT;
      const brickPosZ = brick.position.y - boardOffset.y;

      if (isSelected) {
        // When selected, lift the brick up and make it kinematic
        rigidBodyRef.current.setBodyType(2, true); // 2 = kinematic
        rigidBodyRef.current.setTranslation({ x: brickPosX, y: HOVER_HEIGHT + 1, z: brickPosZ }, true);
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      } else {
        // When not selected, make it dynamic so it falls
        rigidBodyRef.current.setBodyType(0, true); // 0 = dynamic
        // Set initial position based on 3D coordinates
        rigidBodyRef.current.setTranslation({ x: brickPosX, y: brickPosY + 2, z: brickPosZ }, true);
        // Wake up the body to make sure physics applies
        rigidBodyRef.current.wakeUp();
      }
    }
  }, [isSelected, brick.position.x, brick.position.y, brick.position.z, boardOffset.x, boardOffset.y]);

  // Floating animation when selected
  useFrame(() => {
    if (rigidBodyRef.current && isSelected) {
      const posX = brick.position.x - boardOffset.x;
      const posZ = brick.position.y - boardOffset.y;
      const floatY = HOVER_HEIGHT + 1 + Math.sin(Date.now() * 0.003) * 0.1;
      rigidBodyRef.current.setTranslation({ x: posX, y: floatY, z: posZ }, true);
    }
  });

  if (!shape) {
    console.warn(`Unknown shape: ${brick.shape}`);
    return null;
  }

  // Apply 3D rotation to shape cells for rendering
  const rotatedCells = useMemo(() => {
    const cells3D = normalizeCellsTo3D(shape.cells);
    return rotateShape3D(cells3D, brick.rotation);
  }, [shape.cells, brick.rotation]);

  // Render cells - now with 3D coordinates
  const cells = useMemo(() => {
    return rotatedCells.map(([dx, dy, dz], index: number) => (
      <BrickCell
        key={`${dx}-${dy}-${dz}-${index}`}
        x={dx}
        y={dy}
        z={dz}
        color={isValid ? brick.color : '#888888'}
        isGhost={isGhost}
        isSelected={isSelected}
        isHovering={hovered && interactive}
      />
    ));
  }, [rotatedCells, brick.color, isGhost, isSelected, isValid, hovered, interactive]);

  // Generate colliders for each cell - now with 3D positions
  const colliders = useMemo(() => {
    return rotatedCells.map(([dx, dy, dz], index: number) => (
      <CuboidCollider
        key={`collider-${dx}-${dy}-${dz}-${index}`}
        args={[CELL_SIZE / 2 - 0.02, BRICK_HEIGHT / 2, CELL_SIZE / 2 - 0.02]}
        position={[dx * CELL_SIZE + 0.5, dz * BRICK_STACK_HEIGHT + BRICK_HEIGHT / 2, dy * CELL_SIZE + 0.5]}
      />
    ));
  }, [rotatedCells]);

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

  // Calculate actual position - now using 3D position
  const posX = brick.position.x - boardOffset.x;
  const posY = brick.position.z * BRICK_STACK_HEIGHT; // Z position becomes Y in Three.js
  const posZ = brick.position.y - boardOffset.y;

  // Calculate center offset for rotation pivot (now considering 3D cells)
  const centerX = rotatedCells.length > 0
    ? (Math.max(...rotatedCells.map((c: [number, number, number]) => c[0])) + 1) / 2
    : 0.5;
  const centerZ = rotatedCells.length > 0
    ? (Math.max(...rotatedCells.map((c: [number, number, number]) => c[1])) + 1) / 2
    : 0.5;

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[posX, isSelected ? HOVER_HEIGHT + 1 : posY + 2, posZ]}
      type={isSelected ? 'kinematicPosition' : 'dynamic'}
      colliders={false}
      friction={0.8}
      restitution={0.1}
      linearDamping={0.5}
      angularDamping={0.99}
      lockRotations={true} // Prevent tipping over in physics
    >
      <group
        ref={groupRef}
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

        {/* Physics colliders for each cell */}
        {colliders}

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
                  Math.max(...rotatedCells.map((c: [number, number, number]) => c[0])) + 1.5,
                  Math.max(...rotatedCells.map((c: [number, number, number]) => c[1])) + 1.5
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
                  Math.max(...rotatedCells.map((c: [number, number, number]) => c[0])) + 1,
                  Math.max(...rotatedCells.map((c: [number, number, number]) => c[1])) + 1
                ) * 0.6,
                Math.max(
                  Math.max(...rotatedCells.map((c: [number, number, number]) => c[0])) + 1,
                  Math.max(...rotatedCells.map((c: [number, number, number]) => c[1])) + 1
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
    </RigidBody>
  );
}

// Ghost preview brick for drag operations - now supports 3D rotation
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
  rotation: Rotation3D;
  position: { x: number; y: number };
  z?: number;
  isValid: boolean;
}) {
  const shapeDefinition = SHAPE_LIBRARY[shape];
  if (!shapeDefinition) return null;

  const cells3D = normalizeCellsTo3D(shapeDefinition.cells);
  const rotatedCells = rotateShape3D(cells3D, rotation);
  const baseHeight = z * BRICK_STACK_HEIGHT;

  return (
    <group position={[position.x, baseHeight + 0.05, position.y]}>
      {rotatedCells.map(([dx, dy, dz], index: number) => (
        <mesh
          key={index}
          position={[dx + 0.5, dz * BRICK_STACK_HEIGHT + 0.2, dy + 0.5]}
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
