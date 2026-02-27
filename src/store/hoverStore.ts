/**
 * Dedicated store for hoveredCell state.
 *
 * Separated from the main puzzleStore to prevent every mouse-move from
 * re-rendering all subscribers of the main store. Only components that
 * actually read hoveredCell will re-render when the cursor moves.
 */
import { create } from 'zustand';

interface HoverStore {
  hoveredCell: { x: number; y: number } | null;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
}

export const useHoverStore = create<HoverStore>((set) => ({
  hoveredCell: null,
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
}));
