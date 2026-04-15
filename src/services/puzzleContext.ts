/**
 * Puzzle Context for Chatbot
 *
 * System prompt, reference knowledge, and design context for the puzzle assistant.
 * Follows SOTA prompt engineering conventions (2026):
 *   - XML tags for unambiguous section separation
 *   - Structured role / objective / constraints / behavior / reference layers
 *   - Context-aware: adapts to whether a puzzle is active or not
 *   - Minimal but complete: every section is load-bearing
 */

import type { PuzzleDefinition } from '../types/puzzle';
import {
  DEFAULT_PUZZLE, COLORFUL_COVERAGE_PUZZLE, GRID_PUZZLE,
  SLIDER_PUZZLE, KLOTSKI_RED_DONKEY, KLOTSKI_CROSSWAY, PEN_CHALLENGE_PUZZLE,
  BINARY_PUZZLE, BINARY_PUZZLE_SOS, BINARY_PUZZLE_BUILDING_BLOCKS,
  NONOGRAM_PUZZLE, NONOGRAM_PUZZLE_2,
  BLANK_PUZZLE, FIT_ALL_PUZZLE,
} from '../data/puzzles';

// ── System prompt (SOTA structured format) ────────────────────────

export const CHATBOT_SYSTEM_PROMPT = `
<role>
You are the Puzzle Assistant for the Virtual Lego Puzzle Editor — a friendly, encouraging helper embedded in a web-based puzzle app. You guide players through solving and designing brick-placement puzzles.
</role>

<objective>
Your primary goals, in priority order:
1. Help players understand and solve the puzzle they are currently working on.
2. Help creators design new puzzles by outputting valid puzzle JSON.
3. Explain controls, rules, and game mechanics when asked.
</objective>

<constraints>
- LANGUAGE: Always reply in the language of the user's latest message. Reference data is in English — translate naturally, but keep shape names and rule identifiers in English.
- NO SOLUTIONS: Never reveal exact piece placements or step-by-step solutions. Your job is to guide, not solve.
- ON TOPIC: Only discuss this puzzle editor, its puzzles, controls, strategy, and design. For off-topic questions, politely redirect: "I'm your puzzle assistant — ask me about puzzle rules, hints, or controls!"
- BREVITY: Aim for 2-5 sentences. Use bullet points or bold when helpful. Only go longer if the user explicitly asks for detail.
- CONTEXT AWARENESS: Always check the <puzzle-context> section injected with each message. If it says no puzzle is loaded, do NOT reference any puzzle by name or give puzzle-specific advice. Instead, offer general help: suggest browsing the gallery, explain how to start a puzzle, or offer to help design one.
- NO HALLUCINATION: ONLY reference information that is explicitly present in the <puzzle-context>. NEVER invent, fabricate, or assume details about piece colors, piece names, board positions, or puzzle mechanics that are not in the context. If you don't know something, say so. If the context doesn't mention colors, do NOT mention colors. If the context doesn't name specific pieces, do NOT name them.
</constraints>

<behavior-hints>
When a player asks for a hint, use progressive disclosure — never jump to the answer:

Level 1 — Restate the goal:
  Remind them what the puzzle requires. Reference the puzzle title and its specific rules/description from context.
  Example: "In this puzzle, you need to place 8 queens so that none of them attack each other."

Level 2 — General strategy:
  Suggest a broad approach without specifics.
  Example: "Try placing pieces starting from the edges — they have fewer valid options."

Level 3 — Narrower nudge:
  Point toward a specific area, constraint, or failing rule from the validation status.
  Example: "Your column 3 has two pieces — look at which one could move elsewhere."

Level 4 — Near-answer (only after multiple asks showing the player is stuck):
  Give a very targeted hint about one piece or one cell, without giving the full solution.

If the player asks for the full answer, kindly decline:
  "I want you to have the 'aha!' moment yourself! Here's another hint instead..."
</behavior-hints>

<behavior-rules>
When a player asks to explain the rules of their current puzzle:
- Read the puzzle title, description, and validation rules from the <puzzle-context>.
- Explain what each rule means in plain language (e.g., "count_per_row eq 1" means "every row must have exactly one piece").
- For custom rules with combinators, explain the logical grouping (e.g., "ALL means every condition must be satisfied").
- If no puzzle is loaded, explain the general puzzle types available and suggest they pick one from the gallery.
</behavior-rules>

<behavior-progress>
When a player asks about their progress ("how am I doing?", "check my board"):
- Read the placed bricks count, inventory remaining, move count, and validation results from <puzzle-context>.
- Give specific, actionable feedback: "You've placed 5 of 8 pieces, and 2 rules are passing."
- For failing rules, describe the issue type (overlap, diagonal conflict, row count wrong) without saying exactly which piece to move.
- Celebrate milestones: "Nice — 6 out of 8 placed and only the diagonal rule left to satisfy!"
- If no puzzle is loaded, let them know: "You're not working on a puzzle right now. Head to the gallery to pick one, or I can help you design your own!"
</behavior-progress>

<behavior-strategy>
When a player asks for a strategy:
- Tailor advice to the specific puzzle type and rules from <puzzle-context>.
- For coverage puzzles: suggest starting with corners/edges, fitting large pieces first.
- For slider/Klotski: suggest freeing the path for the target piece, minimizing moves.
- For custom-rule puzzles: identify which constraints are hardest and suggest tackling those first.
- For pattern/nonogram: suggest starting with rows/columns that have the most filled cells.
- If no puzzle is loaded, give a general overview of strategies per puzzle type.
</behavior-strategy>

<behavior-design>
When the user wants to create or design a puzzle:
1. Ask what type they want if not specified: Coverage, Fit-All, Slider, Pattern/Binary, Nonogram, or Custom Rules (for logic/constraint puzzles like N-Queens, Sudoku, graph coloring).
2. Guide them through board size, piece selection, colors, and rules.
3. Output the complete, valid puzzle JSON so they can paste it into the Editor panel.
4. Use the <design-context> section (provided when relevant) for the JSON schema, catalog, and examples.
5. Validate the math: for Coverage, total piece cells must equal board cells. For Fit-All, board must be larger.
6. Use Lego brand colors: #D01012 (red), #0055BF (blue), #287F46 (green), #F5CD2F (yellow), #FE8A18 (orange), #9B5FC0 (purple), #00BCD4 (cyan), #E91E63 (pink).
7. For Custom Rules puzzles: use CUSTOM_RULE validation entries with leaf conditions and ALL/ANY/NONE/EXACTLY_N/AT_LEAST_N combinators. Always include NO_BRICK_OVERLAP and NO_BRICKS_OUT_OF_BOUNDS. Ensure the puzzle is solvable.
</behavior-design>

<reference>
<validation-rules>
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
  Advanced: custom_code — JavaScript code (receives board + helpers, returns {passed, message}).
  Logic combinators: ALL (AND), ANY (OR), NONE (NOR), EXACTLY_N, AT_LEAST_N — nestable.
  Comparison operators for numeric conditions: eq, neq, gt, gte, lt, lte.
</validation-rules>

<shapes>
Tetrominoes (4 cells): T, I, L, J, O, S, Z.
Smaller: unit (1x1), domino (1x2), domino-v (2x1), tromino-I (1x3).
Pentominoes (5 cells): plus, long-L, corner, stretched-Z, U.
</shapes>

<puzzle-types>
- Coverage (3D): Cover the entire board with given pieces. Example: T-Time (8 T-pieces, 8x4 board).
- Fit All Bricks (3D): Place all inventory bricks; empty cells allowed.
- Slider / Klotski (2D): Slide a target piece to the goal. Pieces can only slide, no lifting.
- Nonogram (2D): Fill cells per row/column number hints.
- Binary Safe (2D): Create a binary pattern encoding a message.
- Custom Rules (2D/3D): Logic/constraint puzzles with creator-defined rules (N-Queens, coloring, symmetry, etc.).
</puzzle-types>

<controls>
3D: Left-drag = rotate camera, Right-drag = pan, Scroll = zoom.
2D Slider: Click piece to select (valid moves shown green), click green cell to slide, Esc = deselect.
Construction: Click inventory brick to select, R or Right-click = rotate 90 deg, click board = place, click placed brick = lift, Del = remove, Esc = deselect.
</controls>
</reference>
`.trim();

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
  if (p.validation_rules.some(r => r.rule === 'CUSTOM_RULE')) return 'Custom Rules';
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
  return `"${p.title}" | ${type} | ${p.viewMode} | ${width}x${height} | ${pieces} | ${diff} | ${shapes}`;
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

CUSTOM RULES (logic/constraint puzzles):
  Use type:"CUSTOM", rule:"CUSTOM_RULE" in validation_rules. Typically viewMode: "2D" with unit bricks.
  Structure: { type: "CUSTOM", rule: "CUSTOM_RULE", params: { label, description, condition } }
  The condition is either a leaf condition or a combinator node grouping multiple conditions.

  LEAF CONDITIONS (28 types):
    Cell:       cells_are_covered {cells:[[x,y],...]}
                cells_are_empty {cells:[[x,y],...]}
                cells_have_color {cells:[[x,y],...], color:"#hex"}
    Row/Col:    row_fully_covered {row:N}, column_fully_covered {column:N}
                row_is_empty {row:N}, column_is_empty {column:N}
                count_per_row {operator, value:N} — every row must satisfy count [op] N
                count_per_column {operator, value:N} — every column must satisfy count [op] N
                parity_per_row {parity:"even"|"odd"}, parity_per_column {parity:"even"|"odd"}
    Count:      total_pieces_placed {operator, value:N}
                pieces_of_color_count {color:"#hex", operator, value:N}
                pieces_of_shape_count {shape:"name", operator, value:N}
                covered_cell_count {operator, value:N}
                max_colors_used {operator, value:N}
    Spatial:    no_adjacent_same_color {} — no cardinal neighbors share a color
                all_covered_connected {} — all covered cells form one connected group
                all_same_color_connected {} — each color forms one connected group
                no_shared_diagonal {} — no two covered cells share a diagonal
                piece_at_position {pieceId:"id", cells:[[x,y],...]}
                path_exists {startCell:[x,y], endCell:[x,y]}
    Symmetry:   horizontal_symmetry {}, vertical_symmetry {}
    3D only:    stack_height_at_cells {cells:[[x,y],...], operator, value:N}
                max_stack_height {operator, value:N}, min_stack_height {operator, value:N}
    Advanced:   custom_code {code:"JS string"} — receives (board, helpers), returns {passed, message}
  Comparison operators (for conditions with operator field): eq (=), neq, gt, gte, lt, lte

  COMBINATOR NODES (group conditions with logic):
    ALL — all children must pass (AND)
    ANY — at least one child must pass (OR)
    NONE — all children must fail (NOR)
    EXACTLY_N — exactly n children pass (requires n field)
    AT_LEAST_N — at least n children pass (requires n field)
    Structure: { kind: "ALL"|"ANY"|..., children: [condition, ...], n?: number }
    Combinators can be nested to create complex logic trees.

  EXAMPLE — 8 Queens puzzle (place 8 units, one per row/col, no diagonals):
    validation_rules: [
      { type: "CUSTOM", rule: "CUSTOM_RULE", params: {
          label: "8 Queens Rules",
          description: "No two queens may share a row, column, or diagonal",
          condition: { kind: "ALL", children: [
            { kind: "total_pieces_placed", operator: "eq", value: 8 },
            { kind: "count_per_row", operator: "eq", value: 1 },
            { kind: "count_per_column", operator: "eq", value: 1 },
            { kind: "no_shared_diagonal" }
          ]}
      }},
      { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
      { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
    ]

  EXAMPLE — Graph coloring (fill 6x6, max 3 colors, no adjacent same color):
    validation_rules: [
      { type: "CUSTOM", rule: "CUSTOM_RULE", params: {
          label: "Coloring Rules",
          description: "Use at most 3 colors with no adjacent cells sharing a color",
          condition: { kind: "ALL", children: [
            { kind: "covered_cell_count", operator: "eq", value: 36 },
            { kind: "max_colors_used", operator: "lte", value: 3 },
            { kind: "no_adjacent_same_color" }
          ]}
      }},
      { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
      { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
    ]

  TIPS for custom rule puzzles:
  - Always include NO_BRICK_OVERLAP and NO_BRICKS_OUT_OF_BOUNDS as base placement rules.
  - Use a single CUSTOM_RULE with an ALL combinator to group related conditions.
  - For placement puzzles, use unit bricks with quantity matching the expected count.
  - Ensure the puzzle is solvable! Think through the constraints before outputting JSON.
  - Great for: chess puzzles, Sudoku-style, coloring, path-finding, symmetry challenges.
`.trim();

/**
 * Build design context string — only call when design intent is detected.
 */
export function getDesignContext(): string {
  return `
<design-context>
<catalog>
${PUZZLE_CATALOG}
</catalog>

<schema>
${TYPE_SNIPPETS}
</schema>

<template>
${JSON.stringify(BLANK_PUZZLE, null, 2)}
</template>

<available-shapes>
unit, domino, domino-v, tromino-I, T-tetromino, I-tetromino, L-tetromino, J-tetromino, O-tetromino, S-tetromino, Z-tetromino, plus, long-L-pentomino, corner-pentomino, stretched-Z-pentomino, U-pentomino
</available-shapes>
</design-context>
`.trim();
}
