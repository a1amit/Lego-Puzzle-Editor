import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// TOWER OF HANOI (3-disk)
// ============================================

/**
 * Tower of Hanoi
 *
 * Three square disks of side 5, 3, 1 start centered on the leftmost peg.
 * Move them all to the rightmost peg, one at a time. A larger disk may
 * never sit on a smaller one.
 *
 * Layout:
 *   - Pegs are 5-wide sections centered at x = 2 (peg A), x = 8 (peg B),
 *     and x = 14 (peg C). Snap zones make every click inside a section
 *     re-center the brick on that section's peg, regardless of which cell
 *     of the section was clicked. Clicks outside any section are ignored.
 *   - The y axis has a single 5-wide snap zone centered at y = 2 so disks
 *     stay vertically centered too — this is what makes them look square
 *     in the renderer instead of a thin strip.
 *
 * Engine wiring:
 *   - `move_as_stack: false` makes the move/rotate logic refuse to drag a
 *     buried brick — only the topmost disk of a peg can be picked up.
 *   - `snap_zones` snaps clicks to peg centers (see above).
 *   - `depth: 4` permits up to 3 stacked disks (z = 0, 1, 2) plus headroom.
 *   - `NO_ROTATION` keeps the subset-based size check from breaking if a
 *     disk is rotated.
 *   - The custom_code rule combines the disk-size constraint with the win
 *     condition (every disk's footprint covers peg C's center cell).
 */
export const TOWER_OF_HANOI_PUZZLE: PuzzleDefinition = {
  title: "Tower of Hanoi",
  description: "Move all three disks to the rightmost peg, one at a time. A larger disk may never sit on a smaller one.",
  viewMode: "3D",
  move_as_stack: false,
  snap_zones: {
    x: [
      { center: 2, width: 5 },
      { center: 8, width: 5 },
      { center: 14, width: 5 },
    ],
    y: [
      { center: 2, width: 5 },
    ],
  },
  board: {
    dimensions: { width: 17, height: 5, depth: 4 },
    initial_state: [
      // Largest disk (5×5) centered on peg A (x=2, y=2): cells x=0..4, y=0..4
      { id: "disk-large", color: "#0055BF", cells: (() => {
        const cells: [number, number][] = [];
        for (let dx = 0; dx < 5; dx++) for (let dy = 0; dy < 5; dy++) cells.push([dx, dy]);
        return cells;
      })() },
      // Middle disk (3×3) centered on peg A: cells x=1..3, y=1..3
      { id: "disk-mid", color: "#287F46", cells: (() => {
        const cells: [number, number][] = [];
        for (let dx = 1; dx <= 3; dx++) for (let dy = 1; dy <= 3; dy++) cells.push([dx, dy]);
        return cells;
      })() },
      // Smallest disk (1×1) on peg A: cell (2, 2)
      { id: "disk-small", color: "#D01012", cells: [[2, 2]] },
    ],
  },
  // Inventory is empty — all three disks start on the board.
  inventory: [],
  validation_rules: [
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    {
      type: "CUSTOM",
      rule: "CUSTOM_RULE",
      params: {
        label: "Hanoi rules",
        description: "Disks must stack smallest-on-largest, and all disks must reach the rightmost peg.",
        condition: {
          kind: "custom_code",
          code: [
            "const SIDES = { 'disk-large': 5, 'disk-mid': 3, 'disk-small': 1 };",
            "const PEG_C_X = 14;",
            "const BOARD_CENTER_Y = 2;",
            "function sideOf(b) { return SIDES[b.id] || 1; }",
            "function cellsOf(b) {",
            "  const s = sideOf(b);",
            "  const out = [];",
            "  for (let dx = 0; dx < s; dx++) {",
            "    for (let dy = 0; dy < s; dy++) {",
            "      out.push(`${b.x + dx},${b.y + dy}`);",
            "    }",
            "  }",
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
            "const target = `${PEG_C_X},${BOARD_CENTER_Y}`;",
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
