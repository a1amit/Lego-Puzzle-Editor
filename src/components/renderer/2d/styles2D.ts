/**
 * styles2D - Pure utility functions for 2D SVG rendering.
 *
 * Color helpers, edge-segment calculations, and re-exported constants
 * from the centralized scene config.
 */

import { SCENE_2D } from '../../../config/sceneConfig';

// Re-export frequently used constants so sub-components can import from one place.
export const CELL_GAP = SCENE_2D.cellGap;
export const PADDING = SCENE_2D.padding;
export const STUD_RADIUS = SCENE_2D.studRadius;
export const BRICK_OUTER_INSET = SCENE_2D.brickOuterInset;
export const SELECTION_Y_OFFSET = SCENE_2D.selectionYOffset;
export const C = SCENE_2D.colors;
export const SHADOW = SCENE_2D.shadow;

export const HINT_CELL_SIZE = SCENE_2D.hintCellSize;
export const HINT_FONT_SIZE = SCENE_2D.hintFontSize;
export const HINT_GAP = SCENE_2D.hintGap;

// ============================================
// COLOR HELPERS
// ============================================

/** Lighten a hex color by a factor (0-1) */
export function lighten(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * factor));
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * factor));
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * factor));
  return `rgb(${r},${g},${b})`;
}

/** Darken a hex color by a fixed amount */
export function darken(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, parseInt(h.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(h.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(h.substring(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

// ============================================
// EDGE SEGMENT HELPERS
// ============================================

export interface EdgeSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Get outer-edge line segments for brick border rendering. */
export function getOuterEdgeSegments(
  cells: [number, number][],
  cellSize: number,
  yOffset: number = 0,
  outerInset: number = BRICK_OUTER_INSET,
): EdgeSegment[] {
  const cellSet = new Set(cells.map(([x, y]) => `${x},${y}`));
  const segments: EdgeSegment[] = [];

  for (const [x, y] of cells) {
    const left = x * cellSize + outerInset;
    const right = (x + 1) * cellSize - outerInset;
    const top = y * cellSize + outerInset + yOffset;
    const bottom = (y + 1) * cellSize - outerInset + yOffset;

    if (!cellSet.has(`${x},${y - 1}`)) {
      segments.push({ x1: left, y1: top, x2: right, y2: top });
    }
    if (!cellSet.has(`${x},${y + 1}`)) {
      segments.push({ x1: left, y1: bottom, x2: right, y2: bottom });
    }
    if (!cellSet.has(`${x - 1},${y}`)) {
      segments.push({ x1: left, y1: top, x2: left, y2: bottom });
    }
    if (!cellSet.has(`${x + 1},${y}`)) {
      segments.push({ x1: right, y1: top, x2: right, y2: bottom });
    }
  }

  return segments;
}

/** Get top-edge-only segments (for highlight shine). */
export function getTopEdgeSegments(
  cells: [number, number][],
  cellSize: number,
  yOffset: number = 0,
  outerInset: number = BRICK_OUTER_INSET,
): EdgeSegment[] {
  const cellSet = new Set(cells.map(([x, y]) => `${x},${y}`));
  const segments: EdgeSegment[] = [];

  for (const [x, y] of cells) {
    const left = x * cellSize + outerInset;
    const right = (x + 1) * cellSize - outerInset;
    const top = y * cellSize + outerInset + yOffset;

    if (!cellSet.has(`${x},${y - 1}`)) {
      segments.push({ x1: left + 1, y1: top + 1, x2: right - 1, y2: top + 1 });
    }
  }

  return segments;
}
