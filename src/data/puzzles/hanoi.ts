import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// TOWER OF HANOI (3-disk)
// ============================================

/**
 * Tower of Hanoi
 *
 * Three disks of widths 5, 3, 1 start centered on the leftmost peg. Move
 * them all to the rightmost peg, one at a time. A larger disk may never
 * sit on a smaller one.
 *
 * Layout:
 *   - Pegs are at x = 2 (peg A), x = 8 (peg B), x = 14 (peg C). The disk's
 *     left edge sits at peg_x − floor(width / 2).
 *   - To place a disk centered on a peg, click the cell at the disk's
 *     left-edge position — i.e. the small disk lands on click (peg_x, 0),
 *     the medium on (peg_x − 1, 0), the large on (peg_x − 2, 0).
 *
 * Engine wiring:
 *   - `move_as_stack: false` makes the move/rotate logic refuse to drag a
 *     buried brick — only the topmost disk of a peg can be picked up.
 *   - `depth: 4` permits up to 3 stacked disks (z = 0, 1, 2) plus headroom.
 *   - Disks are defined cell-based so each one becomes its own custom shape
 *     of the right width without needing to register entries in
 *     `SHAPE_LIBRARY`.
 *   - The custom_code rule combines the disk-size constraint with the win
 *     condition (every disk's footprint covers the rightmost peg cell).
 */
export const TOWER_OF_HANOI_PUZZLE: PuzzleDefinition = {
  title: "Tower of Hanoi",
  description: "Move all three disks to the rightmost peg, one at a time. A larger disk may never sit on a smaller one.",
  viewMode: "3D",
  move_as_stack: false,
  board: {
    dimensions: { width: 17, height: 1, depth: 4 },
    initial_state: [
      // Largest disk (width 5) centered on peg A (x=2): cells x=0..4
      { id: "disk-large", color: "#0055BF", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
      // Middle disk (width 3) centered on peg A: cells x=1..3
      { id: "disk-mid",   color: "#287F46", cells: [[1, 0], [2, 0], [3, 0]] },
      // Smallest disk (width 1) on peg A: cell x=2
      { id: "disk-small", color: "#D01012", cells: [[2, 0]] },
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
            "const WIDTHS = { 'disk-large': 5, 'disk-mid': 3, 'disk-small': 1 };",
            "const PEG_C_X = 14;",
            "const Y = 0;",
            "function cellsOf(b) {",
            "  const w = WIDTHS[b.id] || 1;",
            "  const out = [];",
            "  for (let dx = 0; dx < w; dx++) out.push(`${b.x + dx},${b.y}`);",
            "  return out;",
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
            "const target = `${PEG_C_X},${Y}`;",
            "const onPegC = board.placedBricks.every(b => cellsOf(b).includes(target));",
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
