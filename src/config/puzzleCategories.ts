import { DEFAULT_PUZZLE, FIT_ALL_PUZZLE, BLANK_PUZZLE, SLIDER_PUZZLE, GRID_PUZZLE, BINARY_PUZZLE, BINARY_PUZZLE_SOS, BINARY_PUZZLE_BUILDING_BLOCKS, COLORFUL_COVERAGE_PUZZLE } from '../types/puzzle';
import { KLOTSKI_RED_DONKEY, KLOTSKI_CROSSWAY, PEN_CHALLENGE_PUZZLE, NONOGRAM_PUZZLE, NONOGRAM_PUZZLE_2 } from '../types/puzzle';
import type { LucideIcon } from 'lucide-react';
import { Grid3x3, LayoutGrid, Move, Binary, Lightbulb, Brain } from 'lucide-react';

export interface PuzzleItem {
  id: string;
  label: string;
  puzzle: typeof DEFAULT_PUZZLE;
  is3D: boolean;
}

export interface PuzzleCategory {
  category: string;
  color: string;
  icon: LucideIcon;
  puzzles: PuzzleItem[];
}

export const PUZZLE_CATEGORIES: PuzzleCategory[] = [
  {
    category: 'Coverage',
    color: '#D01012',
    icon: Grid3x3,
    puzzles: [
      { id: 'coverage', label: 'T-Time', puzzle: DEFAULT_PUZZLE, is3D: true },
      { id: 'rainbow', label: 'Rainbow Bricks', puzzle: COLORFUL_COVERAGE_PUZZLE, is3D: true },
      { id: 'grid', label: 'Grid Fill', puzzle: GRID_PUZZLE, is3D: false },
    ],
  },
  {
    category: 'Fit All',
    color: '#287F46',
    icon: LayoutGrid,
    puzzles: [
      { id: 'fit-all', label: 'Tetris Pack', puzzle: FIT_ALL_PUZZLE, is3D: true },
    ],
  },
  {
    category: 'Slider / Klotski',
    color: '#FE8A18',
    icon: Move,
    puzzles: [
      { id: 'slider', label: 'Klotski Classic', puzzle: SLIDER_PUZZLE, is3D: false },
      { id: 'klotski-red-donkey', label: 'Red Donkey', puzzle: KLOTSKI_RED_DONKEY, is3D: false },
      { id: 'klotski-crossway', label: 'Crossway', puzzle: KLOTSKI_CROSSWAY, is3D: false },
    ],
  },
  {
    category: 'Binary Safe',
    color: '#00BCD4',
    icon: Binary,
    puzzles: [
      { id: 'binary', label: 'Greeting', puzzle: BINARY_PUZZLE, is3D: false },
      { id: 'binary-deserted-island', label: 'Deserted Island', puzzle: BINARY_PUZZLE_SOS, is3D: false },
      { id: 'binary-building-blocks', label: 'Building Blocks', puzzle: BINARY_PUZZLE_BUILDING_BLOCKS, is3D: false },
    ],
  },
  {
    category: 'Brain Teasers',
    color: '#9C27B0',
    icon: Lightbulb,
    puzzles: [
      { id: 'pen-challenge', label: 'Pen Challenge', puzzle: PEN_CHALLENGE_PUZZLE, is3D: false },
    ],
  },
  {
    category: 'Logic Puzzles',
    color: '#10B981',
    icon: Brain,
    puzzles: [
      { id: 'nonogram', label: 'Nonogram: Cross', puzzle: NONOGRAM_PUZZLE, is3D: false },
      { id: 'nonogram-2', label: 'Nonogram: Cross', puzzle: NONOGRAM_PUZZLE_2, is3D: false },
    ],
  },
];

export { BLANK_PUZZLE };
