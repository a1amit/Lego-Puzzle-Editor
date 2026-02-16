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
    position: [9, 13, 11] as const,
    fov: 42,
    minZoom: 5.5,
    maxZoom: 28,
    maxPolarAngle: Math.PI / 2.1,
    target: [0, 0, 0] as const,
  },

  renderer: {
    dpr: [1, 2] as const,
    toneMappingExposure: 1.04,
  },

  postprocessing: {
    bloom: {
      intensity: 0.08,
      luminanceThreshold: 0.62,
      luminanceSmoothing: 0.92,
    },
    vignette: {
      offset: 0.19,
      darkness: 0.28,
    },
  },

  lighting: {
    ambient: { intensity: 0.44 },
    hemisphere: {
      intensity: 0.36,
      skyColor: '#e3ecff',
      groundColor: '#1c2637',
    },
    main: { intensity: 1.26, position: [11, 18, 9] as const },
    fill: { intensity: 0.32, position: [-8, 10, -6] as const },
    rim: { intensity: 0.2, position: [0, 8, -14] as const },
    point: { intensity: 0.18, position: [0, 6, 0] as const },
  },

  fog: { color: '#0f1520', near: 30, far: 78 },

  shadow: {
    mapSize: 2048 as number,
    cameraFar: 50,
    cameraExtent: 16,
    bias: -0.00012,
    normalBias: 0.02,
  },

  contactShadow: {
    position: [0, -0.49, 0] as const,
    opacity: 0.46,
    scale: 34,
    blur: 2.8,
    far: 14,
  },

  background: { color: '#0f1520', roughness: 0.95, metalness: 0.05 },
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
  roughness: 0.32,
  metalness: 0.06,
  clearcoat: 0.8,
  clearcoatRoughness: 0.26,
  studRoughness: 0.26,
  studMetalness: 0.08,
  studClearcoat: 0.9,
  studClearcoatRoughness: 0.2,
  reflectionRadius: 0.1,  // studRadius * 0.4
  reflectionOpacity: 0.2,
  emissiveIntensity: 0.25,
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
  roughness: 0.52,
  metalness: 0.05,
  studRoughness: 0.45,
  studMetalness: 0.08,
  basePlateOffset: 0.1,
  rimOverhang: 0.3,
  colors: {
    normal: '#f4f6fa',
    blocked: '#2f384a',
    goal: '#73611f',
    goalStud: '#8d7a33',
    stud: '#d7deec',
    basePlate: '#121724',
    rim: '#1e2636',
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
  selection: '#6EC1FF',
  selectionOpacity: 0.6,
  hover: '#D9ECFF',
  hoverOpacity: 0.34,
  invalidGhost: '#ff4444',
  goalPost: '#F5C300',
  goalFrame: '#52C477',
  slideDestination: '#3FB950',
  invalidCell: '#F85149',
  background: '#0b101d',
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

  colors: {
    background: '#0b101d',
    backgroundEdge: '#060a12',
    boardSurface: '#1a2233',
    boardSurfaceEdge: '#0f1520',
    boardBorder: '#2a3548',
    cellBase: '#3a4255',
    cellBaseLight: '#454e63',
    cellBlocked: '#252a35',
    cellBlockedLight: '#2d3240',
    cellStud: '#2d3344',
    cellStudHighlight: 'rgba(255,255,255,0.12)',
    hoverCell: '#4a6fa5',
    validDest: '#2d6b3f',
    validDestGlow: '#4ade80',
    invalidCell: '#6b2a2a',
    selectionGlow: '#58A6FF',
    hintBg: '#141b2a',
    hintText: '#c8d0e0',
    goalStroke: '#22c55e',
  },

  shadow: {
    offsetY: 3,
    blur: 4,
    opacity: 0.35,
    selectedOffsetY: 6,
    selectedBlur: 8,
    selectedOpacity: 0.5,
  },
} as const;

// ============================================
// CONFETTI (Congratulations Popup)
// ============================================

export const CONFETTI = {
  particleCount: 30,
  colors: ['#D01012', '#0055BF', '#F5CD2F', '#287F46', '#FE8A18', '#9B5FC0'],
} as const;
