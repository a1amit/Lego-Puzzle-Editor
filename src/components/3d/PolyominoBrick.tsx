import { useMemo, useRef, useState, useEffect } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { SHAPE_LIBRARY, PlacedBrick, ShapeDefinition } from '../../types/puzzle';
import { rotateShape } from '../../validation/ValidationRegistry';
import { BRICK_3D, ANIMATION_3D, COLORS } from '../../config/sceneConfig';

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

const CELL_SIZE = BRICK_3D.cellSize;
const BRICK_HEIGHT = BRICK_3D.height;
const STUD_RADIUS = BRICK_3D.studRadius;
const STUD_HEIGHT = BRICK_3D.studHeight;
const HOVER_HEIGHT = ANIMATION_3D.liftHeight;
const BRICK_STACK_HEIGHT = BRICK_3D.stackHeight;

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
  const baseColor = useMemo(() => new THREE.Color(color), [color]);
  const edgeTint = useMemo(() => baseColor.clone().offsetHSL(0, 0.01, -0.08).getStyle(), [baseColor]);
  const highlightTint = useMemo(() => baseColor.clone().offsetHSL(0, 0.02, 0.14).getStyle(), [baseColor]);

  return (
    <group position={[x * CELL_SIZE + 0.5, 0, y * CELL_SIZE + 0.5]}>
      {/* Brick body (rounded edges for a molded plastic look) */}
      <RoundedBox
        args={[CELL_SIZE - 0.05, BRICK_HEIGHT, CELL_SIZE - 0.05]}
        radius={0.06}
        smoothness={4}
        position={[0, BRICK_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={color}
          roughness={BRICK_3D.roughness}
          metalness={BRICK_3D.metalness}
          clearcoat={BRICK_3D.clearcoat}
          clearcoatRoughness={BRICK_3D.clearcoatRoughness}
          transparent={isGhost}
          opacity={isGhost ? 0.56 : 1}
          emissive={isSelected || isHovering ? color : '#000000'}
          emissiveIntensity={isSelected || isHovering ? BRICK_3D.emissiveIntensity : 0}
        />
      </RoundedBox>

      {/* Bottom edge tint adds depth against the board */}
      <mesh position={[0, BRICK_HEIGHT * 0.2, 0]} castShadow>
        <boxGeometry args={[CELL_SIZE - 0.08, BRICK_HEIGHT * 0.32, CELL_SIZE - 0.08]} />
        <meshStandardMaterial color={edgeTint} roughness={0.7} metalness={0.02} transparent opacity={isGhost ? 0.3 : 0.44} />
      </mesh>

      {/* Stud on top */}
      <mesh
        position={[0, BRICK_HEIGHT + STUD_HEIGHT / 2, 0]}
        castShadow
      >
        <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
        <meshPhysicalMaterial
          color={color}
          roughness={BRICK_3D.studRoughness}
          metalness={BRICK_3D.studMetalness}
          clearcoat={BRICK_3D.studClearcoat}
          clearcoatRoughness={BRICK_3D.studClearcoatRoughness}
          transparent={isGhost}
          opacity={isGhost ? 0.56 : 1}
          emissive={isSelected || isHovering ? color : '#000000'}
          emissiveIntensity={isSelected || isHovering ? BRICK_3D.emissiveIntensity : 0}
        />
      </mesh>

      {/* Light reflection on stud */}
      {!isGhost && (
        <mesh position={[0.08, BRICK_HEIGHT + STUD_HEIGHT + 0.001, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[STUD_RADIUS * 0.4, 16]} />
          <meshBasicMaterial
            color={highlightTint}
            transparent
            opacity={BRICK_3D.reflectionOpacity}
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
  const { invalidate } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const currentHeightRef = useRef(0);
  const targetHeightRef = useRef(0);

  // Snap animation refs: scale bounce on placement/move
  const currentScaleRef = useRef(1);
  const prevPositionRef = useRef<string>(`${brick.position.x},${brick.position.y}`);

  // Rotation tween refs: offset-based approach
  // When rotation changes, we set an offset that counteracts the instant cell layout change,
  // then decay the offset to 0 for a smooth visual transition.
  const rotationOffsetRef = useRef(0);
  const prevRotationRef = useRef(brick.rotation || 0);

  // Get shape definition
  const shape: ShapeDefinition | undefined = SHAPE_LIBRARY[brick.shape];

  // Calculate base height from z-level (stacking)
  const baseHeight = (brick.z || 0) * BRICK_STACK_HEIGHT;

  // Update target height based on selection
  useEffect(() => {
    targetHeightRef.current = isSelected ? baseHeight + HOVER_HEIGHT : baseHeight;
  }, [isSelected, baseHeight]);

  // Keep internal animated height aligned when the stacked z-level changes.
  useEffect(() => {
    currentHeightRef.current = baseHeight;
    targetHeightRef.current = isSelected ? baseHeight + HOVER_HEIGHT : baseHeight;
  }, [baseHeight, isSelected]);

  // Detect position changes to trigger snap bounce
  useEffect(() => {
    const posKey = `${brick.position.x},${brick.position.y}`;
    if (prevPositionRef.current !== posKey) {
      prevPositionRef.current = posKey;
      currentScaleRef.current = 1.08; // Start bounce from enlarged
    }
  }, [brick.position.x, brick.position.y]);

  // When rotation changes, set a visual offset to animate from old to new rotation
  useEffect(() => {
    const newRot = brick.rotation || 0;
    const oldRot = prevRotationRef.current;
    if (newRot !== oldRot) {
      // Calculate shortest-path delta in degrees
      let delta = newRot - oldRot;
      // Normalize to [-180, 180]
      delta = delta - Math.round(delta / 360) * 360;
      // Set offset to counteract the instant layout change (negative of the delta)
      rotationOffsetRef.current -= delta * (Math.PI / 180);
      prevRotationRef.current = newRot;
    }
  }, [brick.rotation]);

  // Clear hover state when not interactive
  useEffect(() => {
    if (!interactive) {
      setHovered(false);
    }
  }, [interactive]);

  // Smooth lift, scale bounce, and rotation animation (frame-rate independent exponential decay)
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Animate height using exponential decay: lerp factor = 1 - e^(-rate * dt)
    const heightDiff = targetHeightRef.current - currentHeightRef.current;
    if (Math.abs(heightDiff) > ANIMATION_3D.convergenceThreshold) {
      const heightAlpha = 1 - Math.exp(-ANIMATION_3D.heightDecayRate * delta);
      currentHeightRef.current += heightDiff * heightAlpha;
    } else {
      currentHeightRef.current = targetHeightRef.current;
    }

    // Gentle floating animation when selected.
    const bobOffset = isSelected
      ? Math.sin(state.clock.elapsedTime * ANIMATION_3D.floatSpeed * 1000) * ANIMATION_3D.floatAmplitude
      : 0;
    groupRef.current.position.y = currentHeightRef.current + bobOffset;

    // Scale bounce animation (snap on placement): 1.08 -> 1.0
    const scaleDiff = 1.0 - currentScaleRef.current;
    if (Math.abs(scaleDiff) > ANIMATION_3D.convergenceThreshold) {
      const scaleAlpha = 1 - Math.exp(-ANIMATION_3D.heightDecayRate * delta);
      currentScaleRef.current += scaleDiff * scaleAlpha;
      groupRef.current.scale.setScalar(currentScaleRef.current);
    } else if (currentScaleRef.current !== 1) {
      currentScaleRef.current = 1;
      groupRef.current.scale.setScalar(1);
    }

    // Smooth rotation offset decay (visual tween around brick center)
    if (pivotRef.current) {
      if (Math.abs(rotationOffsetRef.current) > ANIMATION_3D.convergenceThreshold) {
        const rotAlpha = 1 - Math.exp(-ANIMATION_3D.rotationDecayRate * delta);
        rotationOffsetRef.current *= (1 - rotAlpha);
        pivotRef.current.rotation.y = rotationOffsetRef.current;
      } else if (rotationOffsetRef.current !== 0) {
        rotationOffsetRef.current = 0;
        pivotRef.current.rotation.y = 0;
      }
    }

    // Request next frame if any animation is still active (demand mode)
    const hasActiveAnimation = isSelected
      || Math.abs(targetHeightRef.current - currentHeightRef.current) > ANIMATION_3D.convergenceThreshold
      || Math.abs(1 - currentScaleRef.current) > ANIMATION_3D.convergenceThreshold
      || Math.abs(rotationOffsetRef.current) > ANIMATION_3D.convergenceThreshold;
    if (hasActiveAnimation) {
      invalidate();
    }
  });

  // Apply rotation to shape cells for rendering
  const rotatedCells = useMemo(() => {
    if (!shape) return [];
    return rotateShape(shape.cells, brick.rotation);
  }, [shape, brick.rotation]);

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

  if (!shape) {
    console.warn(`Unknown shape: ${brick.shape}`);
    return null;
  }

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

  // Handle right-click to rotate (only if interactive AND brick is selected)
  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;

    event.stopPropagation();
    // Prevent browser context menu
    event.nativeEvent.preventDefault();

    // Only rotate if the brick is already selected (lifted)
    if (isSelected) {
      onRotate?.();
    }
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
      {/* Rotation pivot centered on the brick */}
      <group ref={pivotRef} position={[centerX, 0, centerZ]}>
      <group position={[-centerX, 0, -centerZ]}>
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
                opacity={0.22}
              />
            </mesh>
          )}

          {/* Outer soft glow */}
          <mesh position={[centerX, 0.018, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[
              Math.max(
                Math.max(...rotatedCells.map(c => c[0])) + 1,
                Math.max(...rotatedCells.map(c => c[1])) + 1
              ) * 0.68,
              Math.max(
                Math.max(...rotatedCells.map(c => c[0])) + 1,
                Math.max(...rotatedCells.map(c => c[1])) + 1
              ) * 0.95,
              48
            ]} />
            <meshBasicMaterial
              color={isSelected ? COLORS.selection : '#ffffff'}
              transparent
              opacity={isSelected ? 0.18 : 0.1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Selection ring */}
          <mesh position={[centerX, 0.022, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
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
              color={isSelected ? COLORS.selection : '#ffffff'}
              transparent
              opacity={isSelected ? 0.72 : 0.36}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* Rotation indicator when selected */}
      {isSelected && (
        <group position={[centerX, BRICK_HEIGHT + 0.8, centerZ]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.4, 0.05, 8, 32, Math.PI * 1.5]} />
            <meshBasicMaterial color={COLORS.selection} transparent opacity={0.8} />
          </mesh>
          {/* Arrow head */}
          <mesh position={[0.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.1, 0.2, 8]} />
            <meshBasicMaterial color={COLORS.selection} />
          </mesh>
        </group>
      )}
      </group>{/* end offset */}
      </group>{/* end rotation pivot */}
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
          castShadow
        >
          <boxGeometry args={[0.9, 0.38, 0.9]} />
          <meshStandardMaterial
            color={isValid ? color : '#ff4444'}
            transparent
            opacity={isValid ? 0.45 : 0.5}
            wireframe={!isValid}
            emissive={isValid ? color : '#ff4444'}
            emissiveIntensity={isValid ? 0.12 : 0.2}
            roughness={0.45}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}
