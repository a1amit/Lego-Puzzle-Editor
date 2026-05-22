import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// POCKET CUBE — 2×2 Rubik's, unfolded 2D layout
// ============================================
//
// Layout (8 wide × 6 tall, 24 sticker cells + 24 blocked):
//
//          U U . . . .
//          U U . . . .
//   L L F F R R B B
//   L L F F R R B B
//          D D . . . .
//          D D . . . .
//
// Each sticker is a 1×1 single-color tile. Each face turn is one
// `permute` transform: one 4-cycle for the face's own stickers + two
// 4-cycles for the 8 side stickers that ride along the turn.
//
// Sticker ↔ cubie mapping (positions of each cubie's 3 stickers):
//   U-F-L: U₂=(2,1), F₀=(2,2), L₁=(1,2)
//   U-F-R: U₃=(3,1), F₁=(3,2), R₀=(4,2)
//   U-B-L: U₀=(2,0), B₁=(7,2), L₀=(0,2)
//   U-B-R: U₁=(3,0), B₀=(6,2), R₁=(5,2)
//   D-F-L: D₀=(2,4), F₂=(2,3), L₃=(1,3)
//   D-F-R: D₁=(3,4), F₃=(3,3), R₂=(4,3)
//   D-B-L: D₂=(2,5), B₃=(7,3), L₂=(0,3)
//   D-B-R: D₃=(3,5), B₂=(6,3), R₃=(5,3)
//
// Colors (standard Western/WCA scheme):
//   U = white, D = yellow, F = green, B = blue, R = red, L = orange.
//
// Initial state is one R-turn away from solved — three more R presses
// solves it. Just enough scramble to prove all 6 face turns end up
// producing a uniform-face state, without making manual testing tedious.

const WHITE  = '#FFFFFF';
const YELLOW = '#FFD500';
const GREEN  = '#009E60';
const BLUE   = '#3D81F6';
const RED    = '#C41E3A';
const ORANGE = '#FF5800';

export const POCKET_CUBE_PUZZLE: PuzzleDefinition = {
  title: 'Pocket Cube',
  description:
    "2×2 Rubik's cube unfolded. Each button rotates one face 90° clockwise — click three times for an inverse turn. Solve by aligning each face to a single color.",
  viewMode: '2D',
  lock_pieces: true,
  board: {
    dimensions: { width: 8, height: 6, depth: 1 },
    blocked_cells: [
      [0, 0], [1, 0], [4, 0], [5, 0], [6, 0], [7, 0],
      [0, 1], [1, 1], [4, 1], [5, 1], [6, 1], [7, 1],
      [0, 4], [1, 4], [4, 4], [5, 4], [6, 4], [7, 4],
      [0, 5], [1, 5], [4, 5], [5, 5], [6, 5], [7, 5],
    ],
    // One R-turn away from solved.
    // R-turn side rings (CW from outside R):
    //   ring1: (3,1) → (6,2) → (3,5) → (3,3) → (3,1)
    //   ring2: (3,2) → (3,0) → (6,3) → (3,4) → (3,2)
    // So after one R-turn applied to solved:
    //   (3,1)=green (was F), (3,3)=yellow (was D), (3,5)=blue (was B),
    //   (6,2)=white (was U), (3,2)=yellow (was D), (3,4)=blue (was B),
    //   (6,3)=white (was U), (3,0)=green (was F).
    initial_state: [
      // U face — 2 swapped with green
      { id: 'U0', cells: [[2, 0]], color: WHITE },
      { id: 'U1', cells: [[3, 0]], color: GREEN  },
      { id: 'U2', cells: [[2, 1]], color: WHITE },
      { id: 'U3', cells: [[3, 1]], color: GREEN  },
      // L face — untouched by R, all orange
      { id: 'L0', cells: [[0, 2]], color: ORANGE },
      { id: 'L1', cells: [[1, 2]], color: ORANGE },
      { id: 'L2', cells: [[0, 3]], color: ORANGE },
      { id: 'L3', cells: [[1, 3]], color: ORANGE },
      // F face — right column swapped with yellow
      { id: 'F0', cells: [[2, 2]], color: GREEN  },
      { id: 'F1', cells: [[3, 2]], color: YELLOW },
      { id: 'F2', cells: [[2, 3]], color: GREEN  },
      { id: 'F3', cells: [[3, 3]], color: YELLOW },
      // R face — still all red after its own turn
      { id: 'R0', cells: [[4, 2]], color: RED },
      { id: 'R1', cells: [[5, 2]], color: RED },
      { id: 'R2', cells: [[4, 3]], color: RED },
      { id: 'R3', cells: [[5, 3]], color: RED },
      // B face — left column swapped with white
      { id: 'B0', cells: [[6, 2]], color: WHITE },
      { id: 'B1', cells: [[7, 2]], color: BLUE  },
      { id: 'B2', cells: [[6, 3]], color: WHITE },
      { id: 'B3', cells: [[7, 3]], color: BLUE  },
      // D face — right column swapped with blue
      { id: 'D0', cells: [[2, 4]], color: YELLOW },
      { id: 'D1', cells: [[3, 4]], color: BLUE   },
      { id: 'D2', cells: [[2, 5]], color: YELLOW },
      { id: 'D3', cells: [[3, 5]], color: BLUE   },
    ],
    // Paint the empty surround so the cross silhouette reads clearly.
    cell_colors: [],
  },
  inventory: [],
  validation_rules: [
    {
      type: 'CUSTOM',
      rule: 'CUSTOM_RULE',
      params: {
        label: 'Each face is a single color',
        condition: {
          kind: 'ALL',
          children: [
            { kind: 'cells_have_color', cells: [[2, 0], [3, 0], [2, 1], [3, 1]], color: WHITE  },
            { kind: 'cells_have_color', cells: [[2, 4], [3, 4], [2, 5], [3, 5]], color: YELLOW },
            { kind: 'cells_have_color', cells: [[2, 2], [3, 2], [2, 3], [3, 3]], color: GREEN  },
            { kind: 'cells_have_color', cells: [[6, 2], [7, 2], [6, 3], [7, 3]], color: BLUE   },
            { kind: 'cells_have_color', cells: [[4, 2], [5, 2], [4, 3], [5, 3]], color: RED    },
            { kind: 'cells_have_color', cells: [[0, 2], [1, 2], [0, 3], [1, 3]], color: ORANGE },
          ],
        },
      },
    },
  ],
  // Each face turn is derived geometrically (R_axis(±90°) on the layer's
  // 4 cubies + sticker direction rotation). The 3 cycles per move are:
  // (a) the face's own stickers, (b) two rings of 4 side stickers.
  moves: [
    {
      id: 'U',
      trigger: { kind: 'button', label: 'U', color: WHITE },
      transform: {
        kind: 'permute',
        cycles: [
          [[2, 1], [2, 0], [3, 0], [3, 1]],
          [[2, 2], [0, 2], [6, 2], [4, 2]],
          [[1, 2], [7, 2], [5, 2], [3, 2]],
        ],
      },
    },
    {
      id: 'D',
      trigger: { kind: 'button', label: 'D', color: YELLOW },
      transform: {
        kind: 'permute',
        cycles: [
          [[2, 4], [3, 4], [3, 5], [2, 5]],
          [[2, 3], [4, 3], [6, 3], [0, 3]],
          [[1, 3], [3, 3], [5, 3], [7, 3]],
        ],
      },
    },
    {
      id: 'F',
      trigger: { kind: 'button', label: 'F', color: GREEN },
      transform: {
        kind: 'permute',
        cycles: [
          [[2, 2], [3, 2], [3, 3], [2, 3]],
          [[2, 1], [4, 2], [3, 4], [1, 3]],
          [[1, 2], [3, 1], [4, 3], [2, 4]],
        ],
      },
    },
    {
      id: 'B',
      trigger: { kind: 'button', label: 'B', color: BLUE },
      transform: {
        kind: 'permute',
        cycles: [
          [[7, 2], [7, 3], [6, 3], [6, 2]],
          [[2, 0], [0, 3], [3, 5], [5, 2]],
          [[0, 2], [2, 5], [5, 3], [3, 0]],
        ],
      },
    },
    {
      id: 'R',
      trigger: { kind: 'button', label: 'R', color: RED },
      transform: {
        kind: 'permute',
        cycles: [
          [[4, 2], [5, 2], [5, 3], [4, 3]],
          [[3, 1], [6, 2], [3, 5], [3, 3]],
          [[3, 2], [3, 0], [6, 3], [3, 4]],
        ],
      },
    },
    {
      id: 'L',
      trigger: { kind: 'button', label: 'L', color: ORANGE },
      transform: {
        kind: 'permute',
        cycles: [
          [[1, 2], [1, 3], [0, 3], [0, 2]],
          [[2, 1], [2, 3], [2, 5], [7, 2]],
          [[2, 2], [2, 4], [7, 3], [2, 0]],
        ],
      },
    },
  ],
  metadata: {
    author: 'engine demo',
    difficulty: 'easy',
    tags: ['rubiks', 'permutation', 'moves'],
  },
};
