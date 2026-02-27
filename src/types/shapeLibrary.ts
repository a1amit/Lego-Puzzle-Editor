import { z } from 'zod';
import type { ShapeDefinition } from './puzzle';

// Predefined shapes library - extensible
export const SHAPE_LIBRARY: Record<string, ShapeDefinition> = {
  'T-tetromino': {
    name: 'T-tetromino',
    cells: [[0, 0], [1, 0], [2, 0], [1, 1]],
  },
  'I-tetromino': {
    name: 'I-tetromino',
    cells: [[0, 0], [1, 0], [2, 0], [3, 0]],
  },
  'L-tetromino': {
    name: 'L-tetromino',
    cells: [[0, 0], [0, 1], [0, 2], [1, 2]],
  },
  'O-tetromino': {
    name: 'O-tetromino',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
  },
  'S-tetromino': {
    name: 'S-tetromino',
    cells: [[1, 0], [2, 0], [0, 1], [1, 1]],
  },
  'Z-tetromino': {
    name: 'Z-tetromino',
    cells: [[0, 0], [1, 0], [1, 1], [2, 1]],
  },
  'J-tetromino': {
    name: 'J-tetromino',
    cells: [[1, 0], [1, 1], [0, 2], [1, 2]],
  },
  // Single unit brick
  'unit': {
    name: 'unit',
    cells: [[0, 0]],
  },
  // Vertical domino (1x2)
  'domino-v': {
    name: 'domino-v',
    cells: [[0, 0], [0, 1]],
  },
  // Domino (2x1)
  'domino': {
    name: 'domino',
    cells: [[0, 0], [1, 0]],
  },
  // Tromino-I (3x1 horizontal)
  'tromino-I': {
    name: 'tromino-I',
    cells: [[0, 0], [1, 0], [2, 0]],
  },
  // Cross/Plus Pentomino (height 3, width 3)
  'plus': {
    name: 'plus',
    cells: [[1, 0], [1, 1], [1, 2], [0, 1], [2, 1]],
  },
  // Long L Pentomino (4 long + 1 tip)
  'long-L-pentomino': {
    name: 'long-L-pentomino',
    cells: [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0]],
  },
  // Corner Pentomino (3x3 L-shape)
  'corner-pentomino': {
    name: 'corner-pentomino',
    cells: [[0, 2], [1, 2], [2, 2], [2, 1], [2, 0]],
  },
  // Stretched Z Pentomino (5 cells)
  'stretched-Z-pentomino': {
    name: 'stretched-Z-pentomino',
    cells: [[1, 2], [2, 2], [1, 1], [0, 0], [1, 0]],
  },
  // U Pentomino (5 cells)
  'U-pentomino': {
    name: 'U-pentomino',
    cells: [[0, 0], [1, 0], [1, 1], [0, 2], [1, 2]],
  },
  // Vertical I-tetromino (1x4 vertical piece - for pen challenge)
  'I-tetromino-v': {
    name: 'I-tetromino-v',
    cells: [[0, 0], [0, 1], [0, 2], [0, 3]],
  },
};

// Create an enum of all available shape names from SHAPE_LIBRARY
export const ShapeNameSchema = z.enum([
  'T-tetromino',
  'I-tetromino',
  'L-tetromino',
  'O-tetromino',
  'S-tetromino',
  'Z-tetromino',
  'J-tetromino',
  'unit',
  'domino',
  'domino-v',
  'tromino-I',
  'plus',
  'long-L-pentomino',
  'corner-pentomino',
  'stretched-Z-pentomino',
  'U-pentomino',
  'I-tetromino-v',
] as const);

export type ShapeName = z.infer<typeof ShapeNameSchema>;
