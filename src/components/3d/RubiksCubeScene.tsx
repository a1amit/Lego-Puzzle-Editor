import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, RoundedBox, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { usePuzzleStore } from '../../store/puzzleStore';
import type { UsePuzzleEngineReturn } from '../../engine';

/**
 * Renders a 2×2 Rubik's cube (Pocket Cube) in 3D from a puzzle whose state
 * lives on an unfolded 2D cross. Each sticker tile in the puzzle has a 2D
 * (x, y) position; this scene maps that position to (cubie, face) via a
 * fixed lookup and paints a thin colored quad on the matching cubie face.
 *
 * The mapping below assumes the standard Pocket Cube layout:
 *
 *           (2,0) (3,0)
 *           (2,1) (3,1)
 *   (0,2) (1,2) (2,2) (3,2) (4,2) (5,2) (6,2) (7,2)
 *   (0,3) (1,3) (2,3) (3,3) (4,3) (5,3) (6,3) (7,3)
 *           (2,4) (3,4)
 *           (2,5) (3,5)
 *
 * The engine permutations (puzzle.moves[]) shuffle bricks among these
 * positions; this renderer is a pure projection of that state — no engine
 * involvement.
 */

type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

// (unfolded x, unfolded y) → (cubie xyz, face axis)
// Cubie coordinates are in {0, 1}^3 (8 corners of a 2×2 cube).
// xyz convention: +x = R, +y = U, +z = F.
const STICKER_MAP: Record<string, { cubie: [number, number, number]; face: Axis }> = {
  // U face (+y) — viewed from above, B at top of view, F at bottom
  '2,0': { cubie: [0, 1, 0], face: '+y' }, // U-B-L
  '3,0': { cubie: [1, 1, 0], face: '+y' }, // U-B-R
  '2,1': { cubie: [0, 1, 1], face: '+y' }, // U-F-L
  '3,1': { cubie: [1, 1, 1], face: '+y' }, // U-F-R
  // L face (-x) — viewed from the left, U up, B right (since L is unfolded from F's left)
  '0,2': { cubie: [0, 1, 0], face: '-x' }, // U-B-L
  '1,2': { cubie: [0, 1, 1], face: '-x' }, // U-F-L
  '0,3': { cubie: [0, 0, 0], face: '-x' }, // D-B-L
  '1,3': { cubie: [0, 0, 1], face: '-x' }, // D-F-L
  // F face (+z)
  '2,2': { cubie: [0, 1, 1], face: '+z' }, // U-F-L
  '3,2': { cubie: [1, 1, 1], face: '+z' }, // U-F-R
  '2,3': { cubie: [0, 0, 1], face: '+z' }, // D-F-L
  '3,3': { cubie: [1, 0, 1], face: '+z' }, // D-F-R
  // R face (+x) — unfolded after F
  '4,2': { cubie: [1, 1, 1], face: '+x' }, // U-F-R
  '5,2': { cubie: [1, 1, 0], face: '+x' }, // U-B-R
  '4,3': { cubie: [1, 0, 1], face: '+x' }, // D-F-R
  '5,3': { cubie: [1, 0, 0], face: '+x' }, // D-B-R
  // B face (-z) — unfolded after R, so the unfolded-right side is closer to L
  '6,2': { cubie: [1, 1, 0], face: '-z' }, // U-B-R
  '7,2': { cubie: [0, 1, 0], face: '-z' }, // U-B-L
  '6,3': { cubie: [1, 0, 0], face: '-z' }, // D-B-R
  '7,3': { cubie: [0, 0, 0], face: '-z' }, // D-B-L
  // D face (-y)
  '2,4': { cubie: [0, 0, 1], face: '-y' }, // D-F-L
  '3,4': { cubie: [1, 0, 1], face: '-y' }, // D-F-R
  '2,5': { cubie: [0, 0, 0], face: '-y' }, // D-B-L
  '3,5': { cubie: [1, 0, 0], face: '-y' }, // D-B-R
};

const CUBIE_SIZE = 0.96;
const STICKER_SIZE = 0.86;
const STICKER_THICKNESS = 0.02;

// World-position offset for a sticker on a cubie's given face. Sits just
// outside the cubie surface so it doesn't z-fight with the cubie body.
function stickerOffset(face: Axis): [number, number, number] {
  const out = CUBIE_SIZE / 2 + STICKER_THICKNESS / 2;
  switch (face) {
    case '+x': return [out, 0, 0];
    case '-x': return [-out, 0, 0];
    case '+y': return [0, out, 0];
    case '-y': return [0, -out, 0];
    case '+z': return [0, 0, out];
    case '-z': return [0, 0, -out];
  }
}

function stickerDimensions(face: Axis): [number, number, number] {
  switch (face) {
    case '+x':
    case '-x': return [STICKER_THICKNESS, STICKER_SIZE, STICKER_SIZE];
    case '+y':
    case '-y': return [STICKER_SIZE, STICKER_THICKNESS, STICKER_SIZE];
    case '+z':
    case '-z': return [STICKER_SIZE, STICKER_SIZE, STICKER_THICKNESS];
  }
}

// Center the 2×2 cubie cluster on the origin: cubie indices {0,1} → world
// positions {-0.5, +0.5} (so the cube spans x,y,z ∈ [-1, 1]).
function cubieWorldPosition(cubie: [number, number, number]): [number, number, number] {
  return [cubie[0] - 0.5, cubie[1] - 0.5, cubie[2] - 0.5];
}

interface RubiksCubeSceneProps {
  /** Optional engine source. When present, sticker positions are read from
   * `engine.board.placedPieces`; otherwise we fall back to the global
   * puzzle store. Mirrors the dual-source pattern used by MovesPanel. */
  engine?: UsePuzzleEngineReturn;
}

function CubieBody({ position }: { position: [number, number, number] }) {
  return (
    <RoundedBox
      args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]}
      radius={0.04}
      smoothness={3}
      position={position}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial color="#1a1a1a" roughness={0.4} metalness={0.05} />
    </RoundedBox>
  );
}

function Sticker({
  cubieWorld,
  face,
  color,
}: {
  cubieWorld: [number, number, number];
  face: Axis;
  color: string;
}) {
  const off = stickerOffset(face);
  const pos: [number, number, number] = [
    cubieWorld[0] + off[0],
    cubieWorld[1] + off[1],
    cubieWorld[2] + off[2],
  ];
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={stickerDimensions(face)} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.35}
        metalness={0.05}
        clearcoat={0.7}
        clearcoatRoughness={0.25}
      />
    </mesh>
  );
}

function CubeContent({ engine }: { engine?: UsePuzzleEngineReturn }) {
  // Same dual-source pattern as MovesPanel — preview pane in the editor
  // feeds an engine; the gallery uses the store.
  const storeBricks = usePuzzleStore(s => s.boardState.placedBricks);
  const bricks = engine?.board.placedPieces ?? storeBricks;

  // 8 cubie positions in {0,1}^3.
  const cubies: [number, number, number][] = [];
  for (let cx = 0; cx <= 1; cx++)
    for (let cy = 0; cy <= 1; cy++)
      for (let cz = 0; cz <= 1; cz++)
        cubies.push([cx, cy, cz]);

  return (
    <>
      {cubies.map((c, i) => (
        <CubieBody key={`cubie-${i}`} position={cubieWorldPosition(c)} />
      ))}
      {bricks.map(brick => {
        const key = `${brick.position.x},${brick.position.y}`;
        const slot = STICKER_MAP[key];
        if (!slot) return null;
        return (
          <Sticker
            key={brick.instanceId}
            cubieWorld={cubieWorldPosition(slot.cubie)}
            face={slot.face}
            color={brick.color}
          />
        );
      })}
    </>
  );
}

export function RubiksCubeScene({ engine }: RubiksCubeSceneProps) {
  return (
    <div className="w-full h-full" style={{ backgroundColor: '#0f1520' }}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          scene.background = new THREE.Color('#0f1520');
        }}
      >
        <PerspectiveCamera makeDefault position={[3, 2.5, 3.5]} fov={40} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.5}
          maxDistance={8}
          target={[0, 0, 0]}
        />

        <ambientLight intensity={0.5} />
        <hemisphereLight intensity={0.4} color="#ffffff" groundColor="#404040" />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <directionalLight position={[-4, 3, -4]} intensity={0.4} />

        <Suspense fallback={null}>
          <CubeContent engine={engine} />
          <ContactShadows
            position={[0, -1.2, 0]}
            opacity={0.5}
            scale={6}
            blur={2.4}
            far={4}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
