import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// TOWER OF HANOI (3-disk)
// ============================================

/**
 * Tower of Hanoi
 *
 * Three disks of different widths start stacked on the leftmost "peg".
 * Move them all to the rightmost peg, one at a time. A larger disk may
 * never sit on a smaller one.
 *
 * Layout:
 *   - All three disks are anchored at the same x of their current peg, so the
 *     smaller disk's footprint is a strict subset of the larger one's. That
 *     keeps the disk-size rule a clean subset check.
 *   - Pegs are at columns x = 0, x = 4, x = 8. The disk's `position.x` selects
 *     which peg it's on. Click on cell (peg_x, 4) to move the selected disk.
 *
 * Engine wiring:
 *   - `move_as_stack: false` makes our move/rotate logic refuse to drag a
 *     buried brick — only the topmost disk of a peg can be picked up.
 *   - `depth: 4` permits up to 3 stacked disks (z = 0, 1, 2) plus headroom.
 *   - The custom_code rule combines the disk-size constraint with the win
 *     condition (all disks anchored at the rightmost peg).
 */
export const TOWER_OF_HANOI_PUZZLE: PuzzleDefinition = {
  title: "Tower of Hanoi",
  description: "Move all three disks to the rightmost peg, one at a time. A larger disk may never sit on a smaller one.",
  viewMode: "3D",
  move_as_stack: false,
  board: {
    dimensions: { width: 11, height: 5, depth: 4 },
    initial_state: [
      // All anchored at x=0 so smaller ⊂ larger.
      { id: "disk-large", shape: "tromino-I", color: "#0055BF", position: [0, 4], rotation: 0 },
      { id: "disk-mid",   shape: "domino",    color: "#287F46", position: [0, 4], rotation: 0 },
      { id: "disk-small", shape: "unit",      color: "#D01012", position: [0, 4], rotation: 0 },
    ],
  },
  // Inventory is empty — all three disks start on the board.
  inventory: [],
  validation_rules: [
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" },
    {
      type: "CUSTOM",
      rule: "CUSTOM_RULE",
      params: {
        label: "Hanoi rules",
        description: "Disks must stack smallest-on-largest, and all disks must reach the rightmost peg.",
        condition: {
          kind: "custom_code",
          code: [
            "const SHAPES = {",
            "  'unit': [[0, 0]],",
            "  'domino': [[0, 0], [1, 0]],",
            "  'tromino-I': [[0, 0], [1, 0], [2, 0]],",
            "};",
            "const PEG_C_X = 8;",
            "function cellsOf(b) {",
            "  const cells = SHAPES[b.shape] || [[0, 0]];",
            "  return cells.map(([dx, dy]) => `${b.x + dx},${b.y + dy}`);",
            "}",
            "for (const upper of board.placedBricks) {",
            "  for (const lower of board.placedBricks) {",
            "    if (upper.instanceId === lower.instanceId) continue;",
            "    if (upper.z <= lower.z) continue;",
            "    const upperCells = cellsOf(upper);",
            "    const lowerCells = new Set(cellsOf(lower));",
            "    if (!upperCells.some(c => lowerCells.has(c))) continue;",
            "    if (!upperCells.every(c => lowerCells.has(c))) {",
            "      return { passed: false, message: 'A larger disk cannot rest on a smaller one' };",
            "    }",
            "  }",
            "}",
            "const onPegC = board.placedBricks.every(b => b.x === PEG_C_X);",
            "if (!onPegC) return { passed: false, message: 'Move all disks to the rightmost peg' };",
            "return { passed: true, message: 'Tower moved!' };",
          ].join("\n"),
        },
      },
    },
  ],
  metadata: {
    author: "Lego Puzzle Editor",
    difficulty: "medium",
    tags: ["hanoi", "stacking", "classic"],
  },
};
