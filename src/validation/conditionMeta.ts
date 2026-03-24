import type { LeafKind, LeafCondition, ConditionNode } from '../types/customRules';

// ============================================
// CONDITION CATEGORIES
// ============================================

export type ConditionCategory =
  | 'Cell'
  | 'Row/Column'
  | 'Count'
  | 'Stacking'
  | 'Spatial'
  | 'Symmetry';

// ============================================
// CONDITION METADATA
// ============================================

export interface ConditionMeta {
  label: string;
  description: string;
  category: ConditionCategory;
  needsCells: boolean;
  needsColor: boolean;
  needsShape: boolean;
  needsComparison: boolean;
  needsRowCol: 'row' | 'column' | null;
  needsPieceId: boolean;
  is3DOnly: boolean;
  defaultParams: () => LeafCondition;
}

export const CONDITION_META: Record<LeafKind, ConditionMeta> = {
  // --- Cell ---
  cells_are_covered: {
    label: 'Cells are covered',
    description: 'Specific cells must have bricks on them',
    category: 'Cell',
    needsCells: true,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'cells_are_covered', cells: [] }),
  },
  cells_are_empty: {
    label: 'Cells are empty',
    description: 'Specific cells must not have any bricks',
    category: 'Cell',
    needsCells: true,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'cells_are_empty', cells: [] }),
  },
  cells_have_color: {
    label: 'Cells have color',
    description: 'Specific cells must be covered by a brick of a given color',
    category: 'Cell',
    needsCells: true,
    needsColor: true,
    needsShape: false,
    needsComparison: false,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'cells_have_color', cells: [], color: '#D01012' }),
  },

  // --- Row/Column ---
  row_fully_covered: {
    label: 'Row fully covered',
    description: 'Every cell in a row must have a brick',
    category: 'Row/Column',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: 'row',
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'row_fully_covered', row: 0 }),
  },
  column_fully_covered: {
    label: 'Column fully covered',
    description: 'Every cell in a column must have a brick',
    category: 'Row/Column',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: 'column',
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'column_fully_covered', column: 0 }),
  },
  row_is_empty: {
    label: 'Row is empty',
    description: 'No cells in a row may have bricks',
    category: 'Row/Column',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: 'row',
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'row_is_empty', row: 0 }),
  },
  column_is_empty: {
    label: 'Column is empty',
    description: 'No cells in a column may have bricks',
    category: 'Row/Column',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: 'column',
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'column_is_empty', column: 0 }),
  },

  // --- Count ---
  total_pieces_placed: {
    label: 'Total pieces placed',
    description: 'The total number of pieces on the board',
    category: 'Count',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: true,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'total_pieces_placed', operator: 'eq', value: 1 }),
  },
  pieces_of_color_count: {
    label: 'Pieces of color count',
    description: 'Number of placed pieces with a specific color',
    category: 'Count',
    needsCells: false,
    needsColor: true,
    needsShape: false,
    needsComparison: true,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'pieces_of_color_count', color: '#D01012', operator: 'eq', value: 1 }),
  },
  pieces_of_shape_count: {
    label: 'Pieces of shape count',
    description: 'Number of placed pieces with a specific shape',
    category: 'Count',
    needsCells: false,
    needsColor: false,
    needsShape: true,
    needsComparison: true,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'pieces_of_shape_count', shape: 'T-tetromino', operator: 'eq', value: 1 }),
  },
  covered_cell_count: {
    label: 'Covered cell count',
    description: 'Total number of cells covered by bricks',
    category: 'Count',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: true,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'covered_cell_count', operator: 'eq', value: 1 }),
  },

  // --- 3D / Stacking ---
  stack_height_at_cells: {
    label: 'Stack height at cells',
    description: 'The vertical stack height at specific cells',
    category: 'Stacking',
    needsCells: true,
    needsColor: false,
    needsShape: false,
    needsComparison: true,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: true,
    defaultParams: () => ({ kind: 'stack_height_at_cells', cells: [], operator: 'gte', value: 2 }),
  },
  max_stack_height: {
    label: 'Max stack height',
    description: 'The tallest stack on the board',
    category: 'Stacking',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: true,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: true,
    defaultParams: () => ({ kind: 'max_stack_height', operator: 'gte', value: 3 }),
  },
  min_stack_height: {
    label: 'Min stack height',
    description: 'The shortest non-empty stack on the board',
    category: 'Stacking',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: true,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: true,
    defaultParams: () => ({ kind: 'min_stack_height', operator: 'gte', value: 1 }),
  },

  // --- Spatial ---
  no_adjacent_same_color: {
    label: 'No adjacent same color',
    description: 'No two horizontally or vertically adjacent cells share a color',
    category: 'Spatial',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'no_adjacent_same_color' }),
  },
  all_covered_connected: {
    label: 'All covered cells connected',
    description: 'All covered cells must form one connected group',
    category: 'Spatial',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'all_covered_connected' }),
  },
  piece_at_position: {
    label: 'Piece at position',
    description: 'A specific piece must cover exactly these cells',
    category: 'Spatial',
    needsCells: true,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: null,
    needsPieceId: true,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'piece_at_position', pieceId: '', cells: [] }),
  },

  // --- Symmetry ---
  horizontal_symmetry: {
    label: 'Horizontal symmetry',
    description: 'The board must be symmetric left-to-right (coverage and colors)',
    category: 'Symmetry',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'horizontal_symmetry' }),
  },
  vertical_symmetry: {
    label: 'Vertical symmetry',
    description: 'The board must be symmetric top-to-bottom (coverage and colors)',
    category: 'Symmetry',
    needsCells: false,
    needsColor: false,
    needsShape: false,
    needsComparison: false,
    needsRowCol: null,
    needsPieceId: false,
    is3DOnly: false,
    defaultParams: () => ({ kind: 'vertical_symmetry' }),
  },
};

// ============================================
// CATEGORY HELPERS
// ============================================

export const CONDITION_CATEGORIES: ConditionCategory[] = [
  'Cell',
  'Row/Column',
  'Count',
  'Stacking',
  'Spatial',
  'Symmetry',
];

export function getConditionsByCategory(category: ConditionCategory): LeafKind[] {
  return (Object.entries(CONDITION_META) as [LeafKind, ConditionMeta][])
    .filter(([, meta]) => meta.category === category)
    .map(([kind]) => kind);
}

export function createDefaultLeaf(kind: LeafKind): LeafCondition {
  return CONDITION_META[kind].defaultParams();
}

export function createDefaultCombinator(): ConditionNode {
  return { kind: 'ALL', children: [] };
}
