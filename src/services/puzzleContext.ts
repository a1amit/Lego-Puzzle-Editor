/**
 * Puzzle Context for Chatbot
 *
 * System prompt, reference knowledge, and design context for the puzzle assistant.
 */

import type { PuzzleDefinition } from '../types/puzzle';
import {
  DEFAULT_PUZZLE, COLORFUL_COVERAGE_PUZZLE, GRID_PUZZLE,
  SLIDER_PUZZLE, KLOTSKI_RED_DONKEY, KLOTSKI_CROSSWAY, PEN_CHALLENGE_PUZZLE,
  BINARY_PUZZLE, BINARY_PUZZLE_SOS, BINARY_PUZZLE_BUILDING_BLOCKS,
  NONOGRAM_PUZZLE, NONOGRAM_PUZZLE_2,
  BLANK_PUZZLE, FIT_ALL_PUZZLE,
} from '../data/puzzles';

// ── Reference knowledge (compact) ──────────────────────────────────

const REFERENCE = `
<rules>
Coverage: ALL_BOARD_SQUARES_MUST_BE_COVERED (every cell covered), ALL_BRICKS_MUST_BE_USED (all inventory placed, empty cells OK).
Placement: NO_BRICK_OVERLAP, NO_BRICKS_OUT_OF_BOUNDS, NO_BLOCKED_CELLS.
Movement: SLIDING_ONLY (slide H/V only, Klotski-style), FREE_PLACEMENT (default), NO_ROTATION, NO_BRICK_REMOVAL.
Pattern: PATTERN_MATCH (match a target pattern — nonograms, binary, pixel art).
Goal: GOAL_REACHED (target piece reaches goal cells — slider win condition).
Limit: MAX_MOVES.
Custom: CUSTOM_RULE — creator-defined rules using a recursive condition tree. 28 condition types in 7 categories:
  Cell: cells_are_covered, cells_are_empty, cells_have_color.
  Row/Column: row_fully_covered, column_fully_covered, row_is_empty, column_is_empty, count_per_row, count_per_column, parity_per_row, parity_per_column.
  Count: total_pieces_placed, pieces_of_color_count, pieces_of_shape_count, covered_cell_count, max_colors_used.
  Stacking (3D only): stack_height_at_cells, max_stack_height, min_stack_height.
  Spatial: no_adjacent_same_color, all_covered_connected, piece_at_position, path_exists, all_same_color_connected, no_shared_diagonal.
  Symmetry: horizontal_symmetry, vertical_symmetry.
  Advanced: custom_code — write JavaScript code (receives board + helpers, returns {passed, message}). Ultimate flexibility for any rule.
  Logic combinators: ALL (AND), ANY (OR), NONE (NOR), EXACTLY_N, AT_LEAST_N — nestable.
  Comparison operators for numeric conditions: eq, neq, gt, gte, lt, lte.
</rules>

<shapes>
Tetrominoes (4 cells): T, I, L, J, O, S, Z.
Smaller: unit (1x1), domino (1x2), domino-v (2x1), tromino-I (1x3).
Pentominoes (5 cells): plus, long-L, corner, stretched-Z, U.
</shapes>

<puzzle-types>
- Coverage (3D): Cover the entire board with given pieces. Example: T-Time (8 T-pieces, 8x4 board).
- Fit All Bricks (3D): Place all inventory bricks; empty cells allowed. Example: Tetris Pack.
- Slider / Klotski (2D): Slide a target piece to the goal. Pieces can only slide, no lifting. Example: Red Donkey (81 moves optimal).
- Nonogram (2D): Fill cells per row/column number hints. Black = filled, red = marked empty.
- Binary Safe (2D): Create a binary pattern encoding a message. Example: SOS in binary.
- Monogram (2D): Match a specific color pattern on the grid using unit bricks.
</puzzle-types>

<controls>
3D: Left-drag = rotate camera, Right-drag = pan, Scroll = zoom.
2D Slider: Click piece to select (valid moves shown green), click green cell to slide, Esc = deselect.
Construction: Click inventory brick to select, R or Right-click = rotate 90 deg, click board = place, click placed brick = lift, Del = remove, Esc = deselect.
</controls>
`;

// ── System prompt ──────────────────────────────────────────────────

export const CHATBOT_SYSTEM_PROMPT = `You are the Puzzle Assistant for the Virtual Lego Puzzle Editor — a friendly, encouraging helper that guides players without spoiling the fun.

# Core rules

1. **Reply in the user's language.** Match the language of the user's latest message exactly. The reference data below is in English — translate as needed, keeping shape/rule names in English.
2. **Never reveal solutions.** Do not tell the player exactly where to place pieces or give step-by-step solutions.
3. **Stay on topic.** Only discuss the puzzle editor, its puzzles, controls, and related strategy. For off-topic questions, say something like: "I'm your puzzle assistant! Ask me about puzzle rules, hints, or controls."
4. **Keep responses short.** Aim for 2-5 sentences unless the user asks for a detailed explanation. Use bullet points or bold for structure when helpful.

# How to give hints (progressive strategy)

When a player asks for help, give hints in increasing specificity — never jump to the answer:

**Level 1 — Restate the goal:** Remind them what the puzzle is asking (e.g. "You need to cover every cell on the board").
**Level 2 — General strategy:** Suggest an approach without specifics (e.g. "Try starting from the corners — they're the hardest to fill later").
**Level 3 — Narrower nudge:** Point toward an area or constraint (e.g. "Look at the bottom-right corner — which piece shapes could fit there?").
**Level 4 — Near-answer (only if they're clearly stuck after multiple asks):** Give a very targeted hint about a single piece without stating the full solution.

If the player asks for the full answer, kindly decline: "I want you to have the 'aha!' moment yourself! Here's another hint instead..."

# How to assess progress

When the player asks how they're doing, use the CURRENT PUZZLE CONTEXT (provided with each message) to give specific, actionable feedback:
- Mention how many pieces they've placed vs. total available.
- If rules are being violated, point out what type of issue it is (overlap, out of bounds, etc.) without telling them exactly which piece to move.
- Celebrate milestones ("Nice — you've placed 6 out of 8 pieces!").

# How to help design puzzles

When the user wants to create or design a puzzle:
1. Ask what type they want (Coverage, Fit-All, Slider, Pattern/Binary, Nonogram) if not specified.
2. Guide them through board size, piece selection, and rules.
3. Output the **complete puzzle JSON** so they can paste it into the **Editor panel** (they should switch to "Editor" view mode).
4. Use the DESIGN CONTEXT (provided when relevant) for the JSON schema, existing puzzle catalog, and examples.
5. Ensure the math works: for Coverage, board cells must equal total piece cells. For Fit-All, board must be larger.
6. Use Lego brand colors: #D01012 (red), #0055BF (blue), #287F46 (green), #F5CD2F (yellow), #FE8A18 (orange), #9B5FC0 (purple), #00BCD4 (cyan), #E91E63 (pink).

# Reference knowledge
${REFERENCE}
`;

// ── Design context (injected only for design-related conversations) ──

const DESIGN_KEYWORDS = /\b(design|create|build|make|write|generate|compose|craft|new puzzle|custom puzzle|my own puzzle|puzzle json|from scratch|puzzle idea)\b/i;

/** Detect whether a message is about designing/creating a puzzle */
export function isDesignIntent(message: string): boolean {
  return DESIGN_KEYWORDS.test(message);
}

/** Classify a puzzle by its validation rules and special fields */
function classifyPuzzle(p: PuzzleDefinition): string {
  if (p.validation_rules.some(r => r.rule === 'GOAL_REACHED')) return 'Slider';
  if (p.nonogram_hints) return 'Nonogram';
  if (p.target_pattern) return 'Pattern';
  if (p.validation_rules.some(r => r.rule === 'ALL_BOARD_SQUARES_MUST_BE_COVERED')) return 'Coverage';
  return 'Fit-All';
}

/** All real puzzles (excluding blank template) */
const ALL_PUZZLES: PuzzleDefinition[] = [
  DEFAULT_PUZZLE, COLORFUL_COVERAGE_PUZZLE, GRID_PUZZLE,
  FIT_ALL_PUZZLE,
  SLIDER_PUZZLE, KLOTSKI_RED_DONKEY, KLOTSKI_CROSSWAY, PEN_CHALLENGE_PUZZLE,
  BINARY_PUZZLE, BINARY_PUZZLE_SOS, BINARY_PUZZLE_BUILDING_BLOCKS,
  NONOGRAM_PUZZLE, NONOGRAM_PUZZLE_2,
];

/** Build compact catalog line for one puzzle */
function catalogLine(p: PuzzleDefinition): string {
  const { width, height } = p.board.dimensions;
  const totalInv = p.inventory.reduce((s, b) => s + b.quantity, 0);
  const prePlaced = p.board.initial_state.length;
  const pieces = totalInv > 0 ? `${totalInv} inventory` : `${prePlaced} pre-placed`;
  const shapes = [...new Set(p.inventory.map(b => b.shape))].join(', ') || 'pre-placed pieces';
  const type = classifyPuzzle(p);
  const diff = p.metadata?.difficulty || '?';
  return `"${p.title}" | ${type} | ${p.viewMode} | ${width}×${height} | ${pieces} | ${diff} | ${shapes}`;
}

/** Pre-built catalog string */
const PUZZLE_CATALOG = ALL_PUZZLES.map(p => `- ${catalogLine(p)}`).join('\n');

/** Type-specific schema snippets (compact, no full JSON) */
const TYPE_SNIPPETS = `
COVERAGE / FIT-ALL (3D construction):
  viewMode: "3D", inventory: [{id, shape, color, quantity}], board.initial_state: []
  Rules: Coverage adds ALL_BOARD_SQUARES_MUST_BE_COVERED. Fit-All adds ALL_BRICKS_MUST_BE_USED.

SLIDER / KLOTSKI (2D movement):
  viewMode: "2D", inventory: [] (empty!), board.initial_state: [{id, cells: [[x,y],...], color}]
  goal: { targetPieceId: "id-of-piece-to-move", cells: [[x,y],...] }
  Rules: GOAL_REACHED, SLIDING_ONLY, NO_ROTATION, NO_BRICK_REMOVAL, NO_BRICK_OVERLAP, NO_BRICKS_OUT_OF_BOUNDS

BINARY / PATTERN (2D pattern matching):
  viewMode: "2D", inventory: [{shape:"unit", color:"#1a1a1a", quantity:N, id:"bit-0"}, {shape:"unit", color:"#ffffff", quantity:N, id:"bit-1"}]
  target_pattern: { rows: [[0,1,0,...], ...], color_mapping: {"0":"#1a1a1a", "1":"#ffffff"} }
  Rules: PATTERN_MATCH, NO_ROTATION

NONOGRAM (2D logic grid):
  Same as Pattern but add: nonogram_hints: { rows: [[n,...]], columns: [[n,...]] }
  Rules: PATTERN_MATCH with params: {reject_unmapped_target_colors: true}, NO_ROTATION
`.trim();

/**
 * Build design context string — only call when design intent is detected.
 * Returns ~300-400 tokens of compact reference material.
 */
export function getDesignContext(): string {
  return `
DESIGN CONTEXT:

EXISTING PUZZLES (use as inspiration):
${PUZZLE_CATALOG}

JSON SCHEMA BY TYPE:
${TYPE_SNIPPETS}

BASE TEMPLATE (minimal working puzzle — paste into Editor panel):
${JSON.stringify(BLANK_PUZZLE, null, 2)}

AVAILABLE SHAPES: unit, domino, domino-v, tromino-I, T-tetromino, I-tetromino, L-tetromino, J-tetromino, O-tetromino, S-tetromino, Z-tetromino, plus, long-L-pentomino, corner-pentomino, stretched-Z-pentomino, U-pentomino
`.trim();
}
