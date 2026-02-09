/**
 * Centralized Scene & Rendering Configuration
 *
 * All magic numbers for 3D rendering, 2D rendering, and animation
 * are collected here so they can be tuned from a single location.
 */

// ============================================
// 3D SCENE CONFIG
// ============================================

export const SCENE_3D = {
  camera: {
    position: [8, 12, 12] as const,
    fov: 45,
    minZoom: 5,
    maxZoom: 30,
    maxPolarAngle: Math.PI / 2.1,
    target: [0, 0, 0] as const,
  },

  lighting: {
    ambient: { intensity: 0.4 },
    main: { intensity: 1.0, position: [10, 15, 10] as const },
    fill: { intensity: 0.3, position: [-5, 10, -5] as const },
    point: { intensity: 0.2, position: [0, 5, 0] as const },
  },

  fog: { color: '#0a0a0a', near: 20, far: 50 },

  shadow: {
    mapSize: 1024 as number,
    cameraFar: 50,
    cameraExtent: 15,
  },

  contactShadow: {
    position: [0, -0.49, 0] as const,
    opacity: 0.4,
    scale: 30,
    blur: 2,
    far: 10,
  },

  background: { color: '#0a0a0a', roughness: 0.9, metalness: 0 },
} as const;

// ============================================
// BRICK DIMENSIONS (3D)
// ============================================

export const BRICK_3D = {
  cellSize: 1,
  cellGap: 0.04,       // Gap between adjacent cells (visual seam)
  height: 0.4,
  studRadius: 0.25,
  studHeight: 0.15,
  studSegments: 16,
  stackHeight: 0.55,   // height + studHeight
  roughness: 0.4,
  metalness: 0.1,
  studRoughness: 0.35,
  studMetalness: 0.15,
  reflectionRadius: 0.1,  // studRadius * 0.4
  reflectionOpacity: 0.15,
  emissiveIntensity: 0.3,
} as const;

// ============================================
// BOARD DIMENSIONS (3D)
// ============================================

export const BOARD_3D = {
  cellSize: 1,
  studRadius: 0.3,
  studHeight: 0.2,
  studSegments: 16,
  depth: 0.3,
  cellGap: 0.02,
  roughness: 0.7,
  metalness: 0.1,
  studRoughness: 0.6,
  studMetalness: 0.2,
  basePlateOffset: 0.1,
  rimOverhang: 0.3,
  colors: {
    normal: '#FFFFFF',
    blocked: '#4a4a4a',
    goal: '#5d5020',
    goalStud: '#6d6030',
    stud: '#E0E0E0',
    basePlate: '#1a1a1a',
    rim: '#222222',
  },
} as const;

// ============================================
// ANIMATION PARAMETERS (3D)
// ============================================

export const ANIMATION_3D = {
  liftHeight: 1.5,
  /** Exponential decay rate for height interpolation (frame-rate independent) */
  heightDecayRate: 8,
  /** Exponential decay rate for rotation interpolation */
  rotationDecayRate: 10,
  /** Convergence threshold (units) */
  convergenceThreshold: 0.01,
  /** Floating bob speed (radians per ms) */
  floatSpeed: 0.003,
  /** Floating bob amplitude (units) */
  floatAmplitude: 0.05,
} as const;

// ============================================
// VISUAL FEEDBACK COLORS
// ============================================

export const COLORS = {
  selection: '#58A6FF',
  selectionOpacity: 0.6,
  hover: '#FFFFFF',
  hoverOpacity: 0.3,
  invalidGhost: '#ff4444',
  goalPost: '#F5C300',
  goalFrame: '#3FB950',
  slideDestination: '#3FB950',
  invalidCell: '#F85149',
  background: '#0a0a0a',
} as const;

// ============================================
// GOAL AREA INDICATOR (3D)
// ============================================

export const GOAL_INDICATOR_3D = {
  postHeight: 1.5,
  postRadius: 0.05,
  frameHeight: 1.2,
  cornerInset: 0.1,
  lineWidth: 3,
  dashSize: 0.15,
  gapSize: 0.1,
} as const;

// ============================================
// 2D RENDERER CONFIG
// ============================================

export const SCENE_2D = {
  /** Base cell size in pixels — used as the maximum when auto-sizing */
  maxCellSize: 80,
  /** Minimum cell size to keep things usable */
  minCellSize: 30,
  /** Default cell size when container dimensions are unknown */
  defaultCellSize: 60,
  cellGap: 2,
  padding: 20,
  studRadius: 8,
  brickOuterInset: 2,
  selectionYOffset: 4,
  hintCellSize: 24,
  hintFontSize: 14,
  hintGap: 4,
} as const;

// ============================================
// CONFETTI (Congratulations Popup)
// ============================================

export const CONFETTI = {
  particleCount: 30,
  colors: ['#D01012', '#0055BF', '#F5CD2F', '#287F46', '#FE8A18', '#9B5FC0'],
} as const;
