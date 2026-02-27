import type { PuzzleDefinition } from '../../types/puzzle';

// ============================================
// 2D SLIDER PUZZLE (Klotski-style)
// ============================================

/**
 * Classic Klotski Slider Puzzle
 *
 * Board layout (4 columns x 5 rows):
 *
 *    Col:  0    1    2    3
 *        +----+----+----+----+
 * Row 0  | V1 |  GOAL   | V2 |
 *        |    |  (red)  |    |
 * Row 1  |    |         |    |
 *        +----+---------+----+
 * Row 2  | V3 |   H1    | V4 |
 *        |    | (orange)|    |
 * Row 3  |    | S1 | S2 |    |
 *        +----+----+----+----+
 * Row 4  |    |  GOAL   |    |  <- Goal area (where red must go)
 *        +----+----+----+----+
 *
 * Pieces defined by EXACTLY which cells they cover!
 */
export const SLIDER_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Slider-01",
  title: "Klotski Classic",
  description: "Slide the blocks to move the RED 2\u00d72 piece to the bottom center exit. Click a piece, then click where to slide it.",
  viewMode: "2D",
  board: {
    dimensions: { width: 4, height: 5, depth: 1 },
    // Cell-based piece definitions - explicitly list which cells each piece covers!
    initial_state: [
      // Red 2x2 goal block - Located in rows 1 and 2, columns 0 and 1
      { id: "goal", cells: [[0, 1], [1, 1], [0, 2], [1, 2]], color: "#D01012" },

      // Blue vertical blocks
      { id: "v1", cells: [[3, 0], [3, 1]], color: "#0055BF" },  // Top Right
      { id: "v2", cells: [[2, 2], [2, 3]], color: "#0055BF" },  // Middle Right (column 2)
      { id: "v3", cells: [[3, 2], [3, 3]], color: "#0055BF" },  // Bottom Right (column 3)

      // Yellow small blocks - Top Row
      { id: "s1", cells: [[0, 0]], color: "#F5C300" },
      { id: "s2", cells: [[1, 0]], color: "#F5C300" },

      // Yellow small blocks - Row 3 (below the Red block)
      { id: "s3", cells: [[0, 3]], color: "#F5C300" },
      { id: "s4", cells: [[1, 3]], color: "#F5C300" },

      // Yellow small blocks - Bottom Row (Row 4 is completely filled)
      { id: "s5", cells: [[0, 4]], color: "#F5C300" },
      { id: "s6", cells: [[1, 4]], color: "#F5C300" },
      { id: "s7", cells: [[2, 4]], color: "#F5C300" },
      { id: "s8", cells: [[3, 4]], color: "#F5C300" },
    ]
  },
  // Empty inventory - all pieces are pre-placed for slider puzzles
  inventory: [],
  // Goal: Red block must cover cells [1,3], [2,3], [1,4], [2,4] (bottom center)
  goal: {
    targetPieceId: "goal",
    cells: [[1, 3], [2, 3], [1, 4], [2, 4]],
  },
  validation_rules: [
    { type: "GOAL", rule: "GOAL_REACHED" },
    { type: "MOVEMENT", rule: "SLIDING_ONLY" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "CONSTRAINT", rule: "NO_BRICK_REMOVAL" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "hard",
    tags: ["slider", "2D", "klotski"]
  }
};

//klotski-red-donkey
export const KLOTSKI_RED_DONKEY: PuzzleDefinition = {
  "puzzle_id": "klotski-red-donkey",
  "title": "Klotski: Red Donkey",
  "description": "The classic configuration (Huarong Dao). Help Cao Cao (Red Block) escape through the bottom exit!",
  "viewMode": "2D",

  "board": {
    "dimensions": { "width": 4, "height": 5, "depth": 1 },
    "initial_state": [
      { "id": "cao-cao", "cells": [[1, 0], [2, 0], [1, 1], [2, 1]], "color": "#D01012" },
      { "id": "v1", "cells": [[0, 0], [0, 1]], "color": "#0055BF" },
      { "id": "v2", "cells": [[3, 0], [3, 1]], "color": "#0055BF" },
      { "id": "v3", "cells": [[0, 2], [0, 3]], "color": "#0055BF" },
      { "id": "v4", "cells": [[3, 2], [3, 3]], "color": "#0055BF" },
      { "id": "h1", "cells": [[1, 2], [2, 2]], "color": "#0055BF" },
      { "id": "s1", "cells": [[1, 3]], "color": "#F5C300" },
      { "id": "s2", "cells": [[2, 3]], "color": "#F5C300" },
      { "id": "s3", "cells": [[0, 4]], "color": "#F5C300" },
      { "id": "s4", "cells": [[3, 4]], "color": "#F5C300" }
    ]
  },

  "inventory": [],

  "goal": {
    "targetPieceId": "cao-cao",
    "cells": [[1, 3], [2, 3], [1, 4], [2, 4]]
  },

  "validation_rules": [
    { "type": "GOAL", "rule": "GOAL_REACHED" },
    { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
    { "type": "ROTATION", "rule": "NO_ROTATION" },
    { "type": "CONSTRAINT", "rule": "NO_BRICK_REMOVAL" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ],

  "metadata": {
    "author": "Traditional",
    "difficulty": "expert",
    "tags": ["slider", "2D", "klotski", "classic"]
  }
};

export const KLOTSKI_CROSSWAY: PuzzleDefinition =
{
  "puzzle_id": "klotski-crossway",
  "title": "Klotski: Crossway",
  "description": "A tricky variation. Navigate the crossway of blocks.",
  "viewMode": "2D",

  "board": {
    "dimensions": { "width": 4, "height": 5, "depth": 1 },
    "initial_state": [
      { "id": "b1", "cells": [[1, 0], [2, 0], [1, 1], [2, 1]], "color": "#D01012" },
      { "id": "v1", "cells": [[0, 0], [0, 1]], "color": "#0055BF" },
      { "id": "v2", "cells": [[3, 0], [3, 1]], "color": "#0055BF" },
      { "id": "h1", "cells": [[0, 2], [1, 2]], "color": "#0055BF" },
      { "id": "h2", "cells": [[2, 2], [3, 2]], "color": "#0055BF" },
      { "id": "s1", "cells": [[0, 3]], "color": "#F5C300" },
      { "id": "s2", "cells": [[1, 3]], "color": "#F5C300" },
      { "id": "s3", "cells": [[2, 3]], "color": "#F5C300" },
      { "id": "s4", "cells": [[3, 3]], "color": "#F5C300" },
      { "id": "s5", "cells": [[0, 4]], "color": "#F5C300" },
      { "id": "s6", "cells": [[3, 4]], "color": "#F5C300" }
    ]
  },

  "inventory": [],

  "goal": {
    "targetPieceId": "b1",
    "cells": [[1, 3], [2, 3], [1, 4], [2, 4]]
  },

  "validation_rules": [
    { "type": "GOAL", "rule": "GOAL_REACHED" },
    { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
    { "type": "ROTATION", "rule": "NO_ROTATION" },
    { "type": "CONSTRAINT", "rule": "NO_BRICK_REMOVAL" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ],

  "metadata": {
    "author": "Variant",
    "difficulty": "medium",
    "tags": ["slider", "2D", "klotski"]
  }
};

/**
 * Pen Challenge Puzzle
 *
 * The classic brain teaser: Pens (vertical I-shaped bricks) are arranged
 * in groups of 1, 2, 3, 4 (left to right). Move exactly ONE pen (blue) to
 * the empty space next to the pink pen, creating the reversed order 4-3-2-1.
 *
 * Layout: Pink(1) | gap | Orange(2) | gap | Green(3) | gap | Blue(4)
 * Goal: Move one blue pen to column 1 (next to pink)
 *
 * Uses MAX_MOVES validation with params.maxMoves = 1
 */
export const PEN_CHALLENGE_PUZZLE: PuzzleDefinition = {
  puzzle_id: "Pen-Challenge-01",
  title: "Pen Challenge",
  description: "The pens show 1-2-3-4. Move exactly ONE pen to reverse the order to 4-3-2-1! Move the blue pen next to the pink pen.",
  viewMode: "2D",
  board: {
    dimensions: { width: 13, height: 4, depth: 1 },
    initial_state: [
      // Group "1": 1 pen (column 0)
      { id: "pen-1", cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: "#8B4513" },

      // Column 1 is EMPTY - this is the goal position for one pen!

      // Group "2": 2 pens (columns 2-3, shifted left by 1)
      { id: "pen-2", cells: [[2, 0], [2, 1], [2, 2], [2, 3]], color: "#8B4513" },
      { id: "pen-3", cells: [[3, 0], [3, 1], [3, 2], [3, 3]], color: "#8B4513" },

      // Column 4 is empty (gap)

      // Group "3": 3 pens (columns 5-7, shifted left by 1)
      { id: "pen-4", cells: [[5, 0], [5, 1], [5, 2], [5, 3]], color: "#8B4513" },
      { id: "pen-5", cells: [[6, 0], [6, 1], [6, 2], [6, 3]], color: "#8B4513" },
      { id: "pen-6", cells: [[7, 0], [7, 1], [7, 2], [7, 3]], color: "#8B4513" },

      // Column 8 is empty (gap)

      // Group "4": 4 pens (columns 9-12, shifted left by 1)
      { id: "pen-7", cells: [[9, 0], [9, 1], [9, 2], [9, 3]], color: "#8B4513" },
      { id: "pen-8", cells: [[10, 0], [10, 1], [10, 2], [10, 3]], color: "#8B4513" },
      { id: "pen-9", cells: [[11, 0], [11, 1], [11, 2], [11, 3]], color: "#8B4513" },
      { id: "pen-10", cells: [[12, 0], [12, 1], [12, 2], [12, 3]], color: "#8B4513" },
    ]
  },
  inventory: [],
  // Goal: Only pen-9 can be placed at column 1 (next to pink) to win
  // This uses targetPieceIds to specify exactly which piece(s) can complete the goal
  goal: {
    targetPieceIds: ["pen-9"], // Only pen-9 can complete the goal
    cells: [[1, 0], [1, 1], [1, 2], [1, 3]], // Column 1, all 4 rows
    hideGoalVisualization: true,
    requireOtherPiecesStationary: true, // All other pens must stay in their original positions
  },
  validation_rules: [
    { type: "MAX_MOVES", rule: "MAX_MOVES", params: { maxMoves: 1 } },
    { type: "GOAL", rule: "GOAL_REACHED" },
    { type: "ROTATION", rule: "NO_ROTATION" },
    { type: "CONSTRAINT", rule: "NO_BRICK_REMOVAL" },
    { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
    { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  metadata: {
    author: "CS Escape Room",
    difficulty: "easy",
    tags: ["brain-teaser", "2D", "visual-puzzle", "pen-challenge"]
  }
};
