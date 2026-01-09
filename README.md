# Virtual Lego Puzzle Editor

A **sustainable platform** for CS Escape Room puzzles built with React, Three.js, and TypeScript. The system is fully data-driven - puzzles are defined via JSON and rendered dynamically.

![Virtual Lego Puzzle Editor](https://img.shields.io/badge/React-19.2-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.159-green)

## 🎮 Features

### Solving Environment (3D Frontend)
- **Dynamic 3D Board**: Renders boards of any dimension based on JSON configuration
- **Polyomino Bricks**: Generic brick component supporting T, I, L, O, S, Z, J tetrominoes and more
- **Interactive Controls**: Click-to-select, drag-to-place, right-click-to-rotate
- **Grid Snapping**: Bricks automatically snap to integer board coordinates
- **Real-time Validation**: Visual feedback for valid/invalid placements
- **2D/3D Views**: Switch between 2D grid view and 3D perspective

### Creator IDE
- **Monaco Editor**: Full VS Code editing experience with JSON syntax highlighting
- **Live Preview**: Hot-reload updates when JSON changes
- **Schema Validation**: Zod-powered validation with red squiggly error indicators
- **Split-Screen Layout**: Adjustable editor/preview split with resize handle

### Validation Engine
- **Strategy Pattern**: Extensible `ValidationRegistry` for custom rules
- **Built-in Rules**:
  - `ALL_BOARD_SQUARES_MUST_BE_COVERED` - Coverage puzzles
  - `NO_BRICK_OVERLAP` - Prevent overlapping pieces
  - `NO_BRICKS_OUT_OF_BOUNDS` - Keep pieces on board
  - `NO_BLOCKED_CELLS` - Respect blocked areas
  - `GOAL_REACHED` - Slider/Klotski puzzles
  - `PATTERN_MATCH` - Binary Safe & Nonogram puzzles
  - `MAX_MOVES` - Move-limited puzzles

### Puzzle Types
- **Coverage**: Fill the entire board with pieces
- **Slider/Klotski**: Slide pieces to reach a goal position
- **Binary Safe**: Create binary ASCII patterns
- **Nonogram/Picross**: Fill cells according to row/column number hints

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📐 Puzzle Definition Schema

Puzzles are defined in JSON format:

```json
{
  "puzzle_id": "T-Puzzle-01",
  "title": "T-Time",
  "description": "Use the 4 'T' shaped bricks to perfectly cover the 8x4 board.",
  "board": {
    "dimensions": { "width": 8, "height": 4, "depth": 1 },
    "initial_state": [],
    "blocked_cells": []
  },
  "inventory": [
{
      "shape": "T-tetromino",
      "color": "#D01012",
      "quantity": 1,
      "id": "t1"
    },
    {
      "shape": "T-tetromino",
      "color": "#0055BF",
      "quantity": 1,
      "id": "t2"
    },
    {
      "shape": "T-tetromino",
      "color": "#287F46",
      "quantity": 1,
      "id": "t3"
    },
    {
      "shape": "T-tetromino",
      "color": "#F5CD2F",
      "quantity": 1,
      "id": "t4"
    },
    {
      "shape": "T-tetromino",
      "color": "#FE8A18",
      "quantity": 1,
      "id": "t5"
    },
    {
      "shape": "T-tetromino",
      "color": "#9B5FC0",
      "quantity": 1,
      "id": "t6"
    },
    {
      "shape": "T-tetromino",
      "color": "#00BCD4",
      "quantity": 1,
      "id": "t7"
    },
    {
      "shape": "T-tetromino",
      "color": "#E91E63",
      "quantity": 1,
      "id": "t8"
    }
  ],
  "validation_rules": [
    { "type": "COVERAGE", "rule": "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ],
  "metadata": {
    "author": "CS Escape Room",
    "difficulty": "medium",
    "tags": ["tetromino", "coverage"]
  }
}
```

## 🧩 Available Shapes

| Shape | Name | Cells |
|-------|------|-------|
| T | T-tetromino | `[[0,0], [1,0], [2,0], [1,1]]` |
| I | I-tetromino | `[[0,0], [1,0], [2,0], [3,0]]` |
| L | L-tetromino | `[[0,0], [0,1], [0,2], [1,2]]` |
| O | O-tetromino | `[[0,0], [1,0], [0,1], [1,1]]` |
| S | S-tetromino | `[[1,0], [2,0], [0,1], [1,1]]` |
| Z | Z-tetromino | `[[0,0], [1,0], [1,1], [2,1]]` |
| J | J-tetromino | `[[1,0], [1,1], [0,2], [1,2]]` |
| 1 | unit | `[[0,0]]` |
| 2 | domino | `[[0,0], [1,0]]` |
| 2v | domino-v | `[[0,0], [0,1]]` |
| 3 | tromino-I | `[[0,0], [1,0], [2,0]]` |
| + | plus | `[[1,0], [1,1], [1,2], [0,1], [2,1]]` |
| 5L | long-L-pentomino | `[[0,1], [1,1], [2,1], [3,1], [0,0]]` |
| 5C | corner-pentomino | `[[0,2], [1,2], [2,2], [2,1], [2,0]]` |
| 5Z | stretched-Z-pentomino | `[[1,2], [2,2], [1,1], [0,0], [1,0]]` |
| 5U | U-pentomino | `[[0,0], [1,0], [1,1], [0,2], [1,2]]` |

## 🏗️ Architecture

```
src/
├── components/
│   ├── 3d/
│   │   ├── LegoBoard.tsx      # Dynamic 3D board component
│   │   ├── PolyominoBrick.tsx # Generic polyomino brick renderer
│   │   └── PuzzleScene.tsx    # Three.js scene with controls
│   ├── editor/
│   │   └── PuzzleEditor.tsx   # Monaco editor with Zod validation
│   ├── layout/
│   │   └── SplitLayout.tsx    # Resizable split-screen layout
│   └── ui/
│       ├── InventoryPanel.tsx # Brick selection inventory
│       └── ValidationPanel.tsx # Validation status display
├── store/
│   └── puzzleStore.ts         # Zustand state management
├── types/
│   └── puzzle.ts              # TypeScript interfaces & Zod schemas
├── validation/
│   └── ValidationRegistry.ts  # Strategy pattern validation engine
└── App.tsx                    # Main application component
```

## 🔧 Extending the Platform

### Adding a New Shape

```typescript
// In src/types/puzzle.ts
SHAPE_LIBRARY['pentomino-F'] = {
  name: 'pentomino-F',
  cells: [[1,0], [2,0], [0,1], [1,1], [1,2]],
};
```

### Adding a Custom Validation Rule

```typescript
// In src/validation/ValidationRegistry.ts
ValidationRegistry.register('MAX_BRICK_COUNT', (boardState, params) => {
  const maxCount = params?.maxCount ?? 10;
  const isValid = boardState.placedBricks.length <= maxCount;
  
  return {
    isValid,
    rule: 'MAX_BRICK_COUNT',
    message: isValid 
      ? `Using ${boardState.placedBricks.length}/${maxCount} bricks`
      : `Too many bricks! Max: ${maxCount}`,
  };
});
```

## 🎨 Tech Stack

- **Frontend**: React 18 + TypeScript
- **3D Engine**: Three.js with @react-three/fiber & @react-three/drei
- **State Management**: Zustand
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Schema Validation**: Zod
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## 📄 License

MIT License - Built for CS Escape Room puzzles

