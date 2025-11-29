import { useMemo, useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { usePuzzleStore } from '../../store/puzzleStore';

interface LegoBoardProps {
  width: number;
  height: number;
  depth?: number;
  onCellClick?: (x: number, y: number) => void;
  onCellHover?: (x: number, y: number | null) => void;
}

const CELL_SIZE = 1;
const STUD_RADIUS = 0.3;
const STUD_HEIGHT = 0.2;
const BOARD_DEPTH = 0.3;

// Board cell component with stud
function BoardCell({ 
  x, 
  y, 
  isBlocked,
  isHighlighted,
  highlightColor,
}: { 
  x: number; 
  y: number; 
  isBlocked: boolean;
  isHighlighted: boolean;
  highlightColor?: string;
}) {
  const baseColor = isBlocked ? '#4a4a4a' : '#2a2a2a';
  const studColor = isBlocked ? '#3a3a3a' : '#333333';
  
  return (
    <group position={[x * CELL_SIZE, 0, y * CELL_SIZE]}>
      {/* Cell base */}
      <mesh position={[0.5, -BOARD_DEPTH / 2, 0.5]} receiveShadow>
        <boxGeometry args={[CELL_SIZE - 0.02, BOARD_DEPTH, CELL_SIZE - 0.02]} />
        <meshStandardMaterial 
          color={isHighlighted ? (highlightColor || '#4a6fa5') : baseColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* Stud */}
      {!isBlocked && (
        <mesh position={[0.5, STUD_HEIGHT / 2, 0.5]} castShadow>
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
          <meshStandardMaterial 
            color={studColor}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      )}
      
      {/* Highlight overlay when cell is active */}
      {isHighlighted && (
        <mesh position={[0.5, 0.01, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CELL_SIZE - 0.05, CELL_SIZE - 0.05]} />
          <meshBasicMaterial 
            color={highlightColor || '#58A6FF'} 
            transparent 
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

export function LegoBoard({ 
  width, 
  height, 
  onCellClick,
  onCellHover,
}: LegoBoardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { boardState, hoveredCell, validationResults } = usePuzzleStore();
  
  // Get cells that need highlighting from validation
  const invalidCells = useMemo(() => {
    const cells = new Set<string>();
    for (const result of validationResults) {
      if (!result.isValid && result.affectedCells) {
        for (const [x, y] of result.affectedCells) {
          cells.add(`${x},${y}`);
        }
      }
    }
    return cells;
  }, [validationResults]);
  
  // Create blocked cells set
  const blockedCells = useMemo(() => {
    return new Set(boardState.blockedCells.map(([x, y]) => `${x},${y}`));
  }, [boardState.blockedCells]);
  
  // Generate cells
  const cells = useMemo(() => {
    const cellElements = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const key = `${x},${y}`;
        const isBlocked = blockedCells.has(key);
        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
        const isInvalid = invalidCells.has(key);
        
        cellElements.push(
          <BoardCell
            key={key}
            x={x}
            y={y}
            isBlocked={isBlocked}
            isHighlighted={isHovered || isInvalid}
            highlightColor={isInvalid ? '#F85149' : isHovered ? '#58A6FF' : undefined}
          />
        );
      }
    }
    return cellElements;
  }, [width, height, blockedCells, hoveredCell, invalidCells]);
  
  // Handle pointer events
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    
    if (!groupRef.current) return;
    
    // Get intersection point in local coordinates
    const localPoint = groupRef.current.worldToLocal(event.point.clone());
    const cellX = Math.floor(localPoint.x / CELL_SIZE);
    const cellY = Math.floor(localPoint.z / CELL_SIZE);
    
    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      onCellHover?.(cellX, cellY);
    }
  };
  
  const handlePointerLeave = () => {
    onCellHover?.(0, null as any); // Signal to clear hover
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
  
  return (
    <group 
      ref={groupRef}
      position={[offsetX, 0, offsetY]}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Board base plate */}
      <mesh 
        position={[width / 2, -BOARD_DEPTH - 0.1, height / 2]} 
        receiveShadow
      >
        <boxGeometry args={[width + 0.2, 0.2, height + 0.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.1} />
      </mesh>
      
      {/* Board rim */}
      <mesh position={[width / 2, -BOARD_DEPTH / 2, height / 2]}>
        <boxGeometry args={[width + 0.3, BOARD_DEPTH + 0.1, height + 0.3]} />
        <meshStandardMaterial color="#222222" roughness={0.7} metalness={0.2} />
      </mesh>
      
      {/* Individual cells */}
      {cells}
      
      {/* Invisible interaction plane - rotated to face up for proper raycasting */}
      <mesh
        position={[width / 2, 0.1, height / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Physics ground collider - static rigid body for bricks to land on */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[width / 2 + 1, 0.1, height / 2 + 1]}
          position={[width / 2, -0.1, height / 2]}
        />
      </RigidBody>
    </group>
  );
}

