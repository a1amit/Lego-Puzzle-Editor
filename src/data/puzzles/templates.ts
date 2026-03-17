import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// BLANK PUZZLE TEMPLATE (For creating from scratch)
// ============================================

export const BLANK_PUZZLE: PuzzleDefinition = {
  title: "My New Puzzle",
  description: "Describe your puzzle here",
  viewMode: "3D",
  board: {
    dimensions: { width: 6, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "T-tetromino", color: "#D01012", quantity: 1, id: "piece1" }
  ],
  validation_rules: [
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "Your Name",
    difficulty: "easy",
    tags: ["custom"]
  }
};

// ============================================
// FIT ALL BRICKS PUZZLE (No coverage requirement)
// ============================================

export const FIT_ALL_PUZZLE: PuzzleDefinition = {
  title: "Tetris Pack",
  description: "Fit all 7 tetromino pieces onto the 10x4 board. No overlapping allowed!",
  viewMode: "3D",
  board: {
    dimensions: { width: 10, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "T-tetromino", color: "#9B5FC0", quantity: 1, id: "t" },
    { shape: "I-tetromino", color: "#00BCD4", quantity: 1, id: "i" },
    { shape: "L-tetromino", color: "#FE8A18", quantity: 1, id: "l" },
    { shape: "J-tetromino", color: "#0055BF", quantity: 1, id: "j" },
    { shape: "O-tetromino", color: "#F5CD2F", quantity: 1, id: "o" },
    { shape: "S-tetromino", color: "#287F46", quantity: 1, id: "s" },
    { shape: "Z-tetromino", color: "#D01012", quantity: 1, id: "z" }
  ],
  validation_rules: [
    { type: "COUNT", rule: "ALL_BRICKS_MUST_BE_USED" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["tetromino", "fit-all", "tetris"]
  }
};
