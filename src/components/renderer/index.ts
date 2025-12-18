/**
 * Puzzle Renderer Components
 * 
 * This module provides view-agnostic rendering for puzzles.
 * The main component is PuzzleRenderer which automatically selects
 * the appropriate renderer based on the puzzle's viewMode.
 */

export { PuzzleRenderer, ViewModeIndicator } from './PuzzleRenderer';
export type { RendererProps } from './PuzzleRenderer';

// Individual renderers can be imported directly if needed
export { Renderer2D } from './Renderer2D';
export { Renderer3D } from './Renderer3D';

