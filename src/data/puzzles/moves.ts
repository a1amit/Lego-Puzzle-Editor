import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// 4-TILE ROTATION — minimal proof of moves[] + permute
// ============================================
//
// 2×2 board, 4 colored sticker tiles, two buttons that rotate the four
// tiles CW or CCW around the center. The puzzle is solved when each tile
// is at its target cell (a 1-move-from-solved scramble is shipped).
//
// This is the smallest puzzle that exercises the generic moves engine:
// a single permute cycle of four positions, with locked pieces (so the
// player can't shortcut by dragging tiles around).
//
export const FOUR_TILE_ROTATION_PUZZLE: PuzzleDefinition = {
  title: '4-Tile Rotation',
  description:
    'Rotate the four colored tiles into their target positions. Pieces are locked — your only tools are the CW and CCW buttons.',
  viewMode: '2D',
  lock_pieces: true,
  board: {
    dimensions: { width: 2, height: 2, depth: 1 },
    // Scrambled by one CW step from the solved arrangement, so a single
    // CCW press solves it.
    initial_state: [
      { id: 'yellow', cells: [[0, 0]], color: '#FBB02D' },
      { id: 'red', cells: [[1, 0]], color: '#D01012' },
      { id: 'blue', cells: [[1, 1]], color: '#3066BE' },
      { id: 'green', cells: [[0, 1]], color: '#287F46' },
    ],
  },
  inventory: [],
  validation_rules: [
    {
      type: 'CUSTOM',
      rule: 'CUSTOM_RULE',
      params: {
        label: 'Tiles in target positions',
        condition: {
          kind: 'ALL',
          children: [
            { kind: 'cells_have_color', cells: [[0, 0]], color: '#D01012' },
            { kind: 'cells_have_color', cells: [[1, 0]], color: '#3066BE' },
            { kind: 'cells_have_color', cells: [[1, 1]], color: '#287F46' },
            { kind: 'cells_have_color', cells: [[0, 1]], color: '#FBB02D' },
          ],
        },
      },
    },
  ],
  moves: [
    {
      id: 'cw',
      trigger: { kind: 'button', label: 'CW ↻', color: '#3066BE' },
      transform: {
        kind: 'permute',
        // The brick at (0,0) → (1,0) → (1,1) → (0,1) → (0,0)
        cycles: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
      },
    },
    {
      id: 'ccw',
      trigger: { kind: 'button', label: 'CCW ↺', color: '#287F46' },
      transform: {
        kind: 'permute',
        // Inverse cycle.
        cycles: [[[0, 0], [0, 1], [1, 1], [1, 0]]],
      },
    },
  ],
  metadata: {
    author: 'engine demo',
    difficulty: 'easy',
    tags: ['moves', 'permutation', 'demo'],
  },
};
