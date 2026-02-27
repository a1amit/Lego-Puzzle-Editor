import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// BINARY SAFE PUZZLE (Pattern Matching)
// ============================================

/**
 * Binary Safe Puzzle - Decode ASCII from binary
 *
 * The player must place black (0) and white (1) bricks
 * to spell out "HI" in ASCII:
 *
 * Row 0: 01001000 = 'H' (72)
 * Row 1: 01001001 = 'I' (73)
 */
export const BINARY_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Binary-01",
  title: "Binary Safe",
  description: "Crack the code! Place black (0) and white (1) bricks to spell the secret password in binary ASCII. Hint: The password is a 2-letter greeting.",
  viewMode: "2D",
  board: {
    dimensions: { width: 8, height: 2, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "unit", color: "#1a1a1a", quantity: 11, id: "bit-0" },  // Black = 0
    { shape: "unit", color: "#ffffff", quantity: 5, id: "bit-1" },   // White = 1
  ],
  target_pattern: {
    // 'H' = 01001000, 'I' = 01001001
    rows: [
      [0, 1, 0, 0, 1, 0, 0, 0],  // H = 72
      [0, 1, 0, 0, 1, 0, 0, 1],  // I = 73
    ],
    color_mapping: {
      "0": "#1a1a1a",  // Black
      "1": "#ffffff",  // White
    },
  },
  validation_rules: [
    { type: "PATTERN", rule: "PATTERN_MATCH" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "medium",
    tags: ["binary", "2D", "ASCII", "pattern", "encoding"]
  }
};

export const BINARY_PUZZLE_SOS: PuzzleDefinition = {
  puzzle_id: "Binary-Deserted-Island-01",
  title: "Binary Safe: Deserted Island",
  description: "You're stranded on a deserted island and need to call for help! A rescue plane that only understands binary is flying overhead \u2014 spell out your distress signal!",
  viewMode: "2D",
  board: {
    dimensions: { width: 8, height: 3, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "unit", color: "#1a1a1a", quantity: 11, id: "bit-0" },  // Black = 0
    { shape: "unit", color: "#ffffff", quantity: 13, id: "bit-1" },  // White = 1
  ],
  target_pattern: {
    // 'S' = 01010011 (83)
    // 'O' = 01001111 (79)
    rows: [
      [0, 1, 0, 1, 0, 0, 1, 1],  // S
      [0, 1, 0, 0, 1, 1, 1, 1],  // O
      [0, 1, 0, 1, 0, 0, 1, 1],  // S
    ],
    color_mapping: {
      "0": "#1a1a1a",  // Black
      "1": "#ffffff",  // White
    },
  },
  validation_rules: [
    { type: "PATTERN", rule: "PATTERN_MATCH" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["binary", "2D", "ASCII", "pattern"]
  }
};

export const BINARY_PUZZLE_BUILDING_BLOCKS: PuzzleDefinition = {
  puzzle_id: "Binary-Building-Blocks-01",
  title: "Binary Safe: Building Blocks",
  description: "Countless pieces that snap into place, creating anything imagination allows. We break apart yet never truly break. Spell our name in binary to unlock the safe!",
  viewMode: "2D",
  board: {
    dimensions: { width: 8, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "unit", color: "#1a1a1a", quantity: 17, id: "bit-0" },  // Black = 0
    { shape: "unit", color: "#ffffff", quantity: 15, id: "bit-1" },  // White = 1
  ],
  target_pattern: {
    // 'L' = 01001100 (76)
    // 'E' = 01000101 (69)
    // 'G' = 01000111 (71)
    // 'O' = 01001111 (79)
    rows: [
      [0, 1, 0, 0, 1, 1, 0, 0],  // L
      [0, 1, 0, 0, 0, 1, 0, 1],  // E
      [0, 1, 0, 0, 0, 1, 1, 1],  // G
      [0, 1, 0, 0, 1, 1, 1, 1],  // O
    ],
    color_mapping: {
      "0": "#1a1a1a",  // Black
      "1": "#ffffff",  // White
    },
  },
  validation_rules: [
    { type: "PATTERN", rule: "PATTERN_MATCH" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "medium",
    tags: ["binary", "2D", "ASCII", "pattern"]
  }
};

// ============================================
// NONOGRAM PUZZLE (Picross-style logic puzzle)
// ============================================

/**
 * Nonogram Puzzle - Fill in the grid based on number clues
 *
 * A 5x5 grid with row hints on the left and column hints on top.
 * Players place black unit bricks on filled cells and optionally
 * red unit bricks to mark cells that should remain empty.
 *
 * The pattern forms a cross/diamond shape.
 */
export const NONOGRAM_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Nonogram-01",
  title: "Nonogram: Cross",
  description: "Fill in the black squares according to the number clues. Numbers indicate consecutive filled cells in each row/column. Use red bricks to mark cells that should stay empty.",
  viewMode: "2D",
  board: {
    dimensions: { width: 5, height: 5, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "unit", color: "#05131D", quantity: 25, id: "filled" },
    { shape: "unit", color: "#D01012", quantity: 25, id: "marked" },
  ],
  nonogram_hints: {
    rows: [
      [4],
      [1, 1],
      [2, 1],
      [3],
      [1, 2],
    ],
    columns: [
      [1, 1],
      [1, 2],
      [5],
      [1, 2],
      [2],
    ],
  },
  target_pattern: {
    rows: [
      [1, 1, 1, 1, 0],
      [0, 0, 1, 0, 1],
      [0, 1, 1, 0, 1],
      [0, 1, 1, 1, 0],
      [1, 0, 1, 1, 0],
    ],
    color_mapping: {
      "1": "#05131D",
    },
  },
  validation_rules: [
    { type: "PATTERN", rule: "PATTERN_MATCH", params: { reject_unmapped_target_colors: true } },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["nonogram", "2D", "logic", "picross"]
  }
};

// ============================================
// NONOGRAM PUZZLE 2 (Picross-style logic puzzle)
// ============================================
export const NONOGRAM_PUZZLE_2: PuzzleDefinition = {
  "puzzle_id": "Nonogram-02",
  "title": "Nonogram: Cross",
  "description": "Fill in the black squares according to the number clues. Numbers indicate consecutive filled cells in each row/column. Use red bricks to mark cells that should stay empty.",
  "viewMode": "2D",
  "board": {
    "dimensions": {
      "width": 10,
      "height": 10,
      "depth": 1
    },
    "initial_state": []
  },
  "inventory": [
    {
      "shape": "unit",
      "color": "#05131D",
      "quantity": 100,
      "id": "filled"
    },
    {
      "shape": "unit",
      "color": "#D01012",
      "quantity": 100,
      "id": "marked"
    }
  ],
  "nonogram_hints": {
    "rows": [
      [1, 3, 1, 1],
      [2, 3, 1],
      [1, 2, 4],
      [5],
      [1, 2, 1],
      [3, 1, 3],
      [2, 7],
      [2, 1, 2],
      [6, 1],
      [1, 2, 1]
    ],
    "columns": [
      [3, 1, 1, 2],
      [1, 4],
      [1, 1, 1, 2],
      [7, 1],
      [5, 4],
      [1, 1, 2, 2],
      [1, 2, 1],
      [1, 5],
      [1, 1, 3, 1],
      [2, 2]
    ]
  },
  "target_pattern": {
    "rows": [
      [1,0,1,1,1,0,1,0,1,0],
      [1,1,0,1,1,1,0,0,0,1],
      [1,0,0,1,1,0,1,1,1,1],
      [0,0,1,1,1,1,1,0,0,0],
      [1,0,0,1,1,0,0,1,0,0],
      [0,1,1,1,0,1,0,1,1,1],
      [1,1,0,1,1,1,1,1,1,1],
      [0,1,1,0,1,0,0,1,1,0],
      [1,1,1,1,1,1,0,1,0,0],
      [1,0,0,0,1,1,0,0,1,0]
    ],
    "color_mapping": {
      "1": "#05131D"
    }
  },
  "validation_rules": [
    {
      "type": "PATTERN",
      "rule": "PATTERN_MATCH",
      "params": {
        "reject_unmapped_target_colors": true
      }
    },
    {
      "type": "ROTATION",
      "rule": "NO_ROTATION"
    },
    {
      "type": "PLACEMENT",
      "rule": "NO_BRICK_OVERLAP"
    },
    {
      "type": "PLACEMENT",
      "rule": "NO_BRICKS_OUT_OF_BOUNDS"
    }
  ],
  "metadata": {
    "author": "CS Escape Room",
    "difficulty": "medium",
    "tags": [
      "nonogram",
      "2D",
      "logic",
      "picross"
    ]
  }
};
