import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// DEFAULT PUZZLE (T-Puzzle - Coverage)
// ============================================

export const DEFAULT_PUZZLE: PuzzleDefinition = {
  title: "T-Time",
  description: "Use all 8 'T' shaped bricks to perfectly cover the 8x4 board.",
  viewMode: "3D",
  board: {
    dimensions: { width: 8, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "T-tetromino", color: "#D01012", quantity: 1, id: "t1" },
    { shape: "T-tetromino", color: "#0055BF", quantity: 1, id: "t2" },
    { shape: "T-tetromino", color: "#287F46", quantity: 1, id: "t3" },
    { shape: "T-tetromino", color: "#F5CD2F", quantity: 1, id: "t4" },
    { shape: "T-tetromino", color: "#FE8A18", quantity: 1, id: "t5" },
    { shape: "T-tetromino", color: "#9B5FC0", quantity: 1, id: "t6" },
    { shape: "T-tetromino", color: "#00BCD4", quantity: 1, id: "t7" },
    { shape: "T-tetromino", color: "#E91E63", quantity: 1, id: "t8" }
  ],
  validation_rules: [
    { type: "COVERAGE", rule: "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "medium",
    tags: ["tetromino", "coverage", "classic"]
  }
};

// ============================================
// COLORFUL COVERAGE PUZZLE (10x6 board with varied pieces)
// ============================================

/**
 * Colorful Coverage Puzzle
 *
 * A 10x6 board (60 cells) with 15 different colored pieces.
 * Uses a mix of tetrominoes, squares, and dominoes.
 * Total: 15 pieces x 4 cells = 60 cells (coverage)
 */
export const COLORFUL_COVERAGE_PUZZLE: PuzzleDefinition = {
  title: "Rainbow Bricks",
  description: "Cover the entire board using all the colorful pieces. A challenging mix of different shapes!",
  viewMode: "3D",
  board: {
    dimensions: { width: 10, height: 6, depth: 1 },
    initial_state: []
  },
  inventory: [
    // Building piece by piece
    { shape: "domino", color: "#FE8A18", quantity: 1, id: "piece-1" },     // 2-block I-shape (horizontal) - orange
    { shape: "tromino-I", color: "#FE8A18", quantity: 1, id: "piece-2" },  // 3-block I-shape (horizontal) - orange
    { shape: "unit", color: "#C9C9C9", quantity: 3, id: "piece-3" },       // Single brick - light gray (x3)
    { shape: "tromino-I", color: "#5E5E5E", quantity: 1, id: "piece-4" },  // 3-block I-shape (can rotate to vertical) - gray
    { shape: "domino", color: "#C9C9C9", quantity: 1, id: "piece-5" },     // 2-block I-shape - light gray
    { shape: "domino", color: "#5E5E5E", quantity: 1, id: "piece-6" },     // 2-block I-shape - gray
    { shape: "unit", color: "#A5CA18", quantity: 1, id: "piece-7" },       // Single brick - light green
    { shape: "domino", color: "#A5CA18", quantity: 2, id: "piece-8" },     // 2-block I-shape - light green (x2)
    { shape: "plus", color: "#6B5344", quantity: 1, id: "piece-9" },       // Cross shape - brown
    { shape: "domino", color: "#0055BF", quantity: 2, id: "piece-10" },    // 2-block I-shape - deep blue (x2)
    { shape: "unit", color: "#0055BF", quantity: 1, id: "piece-11" },      // Single brick - deep blue
    { shape: "domino", color: "#E4CD9E", quantity: 2, id: "piece-12" },    // 2-block I-shape - mustard/tan (x2)
    { shape: "unit", color: "#E4CD9E", quantity: 1, id: "piece-13" },      // Single brick - mustard/tan
    { shape: "domino", color: "#FFFFFF", quantity: 2, id: "piece-14" },    // 2-block I-shape - white (x2)
    { shape: "unit", color: "#FFFFFF", quantity: 1, id: "piece-15" },      // Single brick - white
    { shape: "long-L-pentomino", color: "#287F46", quantity: 1, id: "piece-16" }, // Long L-shape (5 cells) - green
    { shape: "corner-pentomino", color: "#F5CD2F", quantity: 1, id: "piece-17" }, // Corner L-shape (5 cells) - yellow
    { shape: "stretched-Z-pentomino", color: "#D01012", quantity: 1, id: "piece-18" }, // Z-shape (5 cells) - red
    { shape: "U-pentomino", color: "#05131D", quantity: 1, id: "piece-19" }, // U-shape (5 cells) - black
  ],
  validation_rules: [
    { type: "COVERAGE", rule: "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "hard",
    tags: ["tetromino", "coverage", "colorful", "mixed"]
  }
};

// ============================================
// 2D SIMPLE GRID PUZZLE
// ============================================

export const GRID_PUZZLE: PuzzleDefinition = {
  title: "Grid Fill",
  description: "Fill the 4x4 grid using the available pieces. A simple 2D puzzle to demonstrate the grid view mode.",
  viewMode: "2D",
  board: {
    dimensions: { width: 4, height: 4, depth: 1 },
    initial_state: []
  },
  inventory: [
    { shape: "T-tetromino", color: "#D01012", quantity: 4, id: "t1" },
    { shape: "L-tetromino", color: "#0055BF", quantity: 1, id: "l1" },
    { shape: "S-tetromino", color: "#287F46", quantity: 1, id: "s1" },
    { shape: "domino", color: "#F5CD2F", quantity: 2, id: "d1" }
  ],
  validation_rules: [
    { type: "COVERAGE", rule: "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["grid", "2D", "coverage"]
  }
};
