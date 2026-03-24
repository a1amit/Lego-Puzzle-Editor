import { z } from 'zod';

// ============================================
// COMPARISON OPERATORS
// ============================================

export const ComparisonOperatorSchema = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);
export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;

export const COMPARISON_LABELS: Record<ComparisonOperator, string> = {
  eq: '=',
  neq: '\u2260',
  gt: '>',
  gte: '\u2265',
  lt: '<',
  lte: '\u2264',
};

// ============================================
// SHARED FIELD SCHEMAS
// ============================================

const CellArraySchema = z.array(z.tuple([z.number(), z.number()]));
const ComparisonParamsSchema = z.object({
  operator: ComparisonOperatorSchema,
  value: z.number(),
});
export const ParitySchema = z.enum(['even', 'odd']);
export type Parity = z.infer<typeof ParitySchema>;

// ============================================
// LEAF CONDITION KINDS
// ============================================

export const LEAF_KINDS = [
  // Cell
  'cells_are_covered',
  'cells_are_empty',
  'cells_have_color',
  // Row/Column
  'row_fully_covered',
  'column_fully_covered',
  'row_is_empty',
  'column_is_empty',
  // Count
  'total_pieces_placed',
  'pieces_of_color_count',
  'pieces_of_shape_count',
  'covered_cell_count',
  // 3D / Stacking
  'stack_height_at_cells',
  'max_stack_height',
  'min_stack_height',
  // Spatial
  'no_adjacent_same_color',
  'all_covered_connected',
  'piece_at_position',
  'path_exists',
  'all_same_color_connected',
  'no_shared_diagonal',
  // Symmetry
  'horizontal_symmetry',
  'vertical_symmetry',
  // Count (additional)
  'max_colors_used',
  // Row/Column (additional)
  'count_per_row',
  'count_per_column',
  'parity_per_row',
  'parity_per_column',
  // Ultimate — creator writes JavaScript
  'custom_code',
] as const;

export type LeafKind = (typeof LEAF_KINDS)[number];

// ============================================
// LEAF CONDITION SCHEMAS (discriminated union)
// ============================================

// --- Cell conditions ---
const CellsAreCoveredSchema = z.object({
  kind: z.literal('cells_are_covered'),
  cells: CellArraySchema,
});

const CellsAreEmptySchema = z.object({
  kind: z.literal('cells_are_empty'),
  cells: CellArraySchema,
});

const CellsHaveColorSchema = z.object({
  kind: z.literal('cells_have_color'),
  cells: CellArraySchema,
  color: z.string(),
});

// --- Row/Column conditions ---
const RowFullyCoveredSchema = z.object({
  kind: z.literal('row_fully_covered'),
  row: z.number().int().min(0),
});

const ColumnFullyCoveredSchema = z.object({
  kind: z.literal('column_fully_covered'),
  column: z.number().int().min(0),
});

const RowIsEmptySchema = z.object({
  kind: z.literal('row_is_empty'),
  row: z.number().int().min(0),
});

const ColumnIsEmptySchema = z.object({
  kind: z.literal('column_is_empty'),
  column: z.number().int().min(0),
});


// --- Count conditions ---
const TotalPiecesPlacedSchema = z.object({
  kind: z.literal('total_pieces_placed'),
}).merge(ComparisonParamsSchema);

const PiecesOfColorCountSchema = z.object({
  kind: z.literal('pieces_of_color_count'),
  color: z.string(),
}).merge(ComparisonParamsSchema);

const PiecesOfShapeCountSchema = z.object({
  kind: z.literal('pieces_of_shape_count'),
  shape: z.string(),
}).merge(ComparisonParamsSchema);

const CoveredCellCountSchema = z.object({
  kind: z.literal('covered_cell_count'),
}).merge(ComparisonParamsSchema);

// --- 3D / Stacking conditions ---
const StackHeightAtCellsSchema = z.object({
  kind: z.literal('stack_height_at_cells'),
  cells: CellArraySchema,
}).merge(ComparisonParamsSchema);

const MaxStackHeightSchema = z.object({
  kind: z.literal('max_stack_height'),
}).merge(ComparisonParamsSchema);

const MinStackHeightSchema = z.object({
  kind: z.literal('min_stack_height'),
}).merge(ComparisonParamsSchema);

// --- Spatial conditions ---
const NoAdjacentSameColorSchema = z.object({
  kind: z.literal('no_adjacent_same_color'),
});

const AllCoveredConnectedSchema = z.object({
  kind: z.literal('all_covered_connected'),
});

const PieceAtPositionSchema = z.object({
  kind: z.literal('piece_at_position'),
  pieceId: z.string(),
  cells: CellArraySchema,
});

// --- Spatial (additional) ---
const PathExistsSchema = z.object({
  kind: z.literal('path_exists'),
  startCell: z.tuple([z.number(), z.number()]),
  endCell: z.tuple([z.number(), z.number()]),
});

const AllSameColorConnectedSchema = z.object({
  kind: z.literal('all_same_color_connected'),
});

// --- Count (additional) ---
const MaxColorsUsedSchema = z.object({
  kind: z.literal('max_colors_used'),
}).merge(ComparisonParamsSchema);

// --- Row/Column (additional) ---
const CountPerRowSchema = z.object({
  kind: z.literal('count_per_row'),
}).merge(ComparisonParamsSchema);

const CountPerColumnSchema = z.object({
  kind: z.literal('count_per_column'),
}).merge(ComparisonParamsSchema);

const ParityPerRowSchema = z.object({
  kind: z.literal('parity_per_row'),
  parity: ParitySchema,
});

const ParityPerColumnSchema = z.object({
  kind: z.literal('parity_per_column'),
  parity: ParitySchema,
});

const NoSharedDiagonalSchema = z.object({
  kind: z.literal('no_shared_diagonal'),
});

const CustomCodeSchema = z.object({
  kind: z.literal('custom_code'),
  /** JavaScript function body. Receives `board` and `helpers` as arguments.
   *  Must return { passed: boolean, message: string } */
  code: z.string(),
});

// --- Symmetry conditions ---
const HorizontalSymmetrySchema = z.object({
  kind: z.literal('horizontal_symmetry'),
});

const VerticalSymmetrySchema = z.object({
  kind: z.literal('vertical_symmetry'),
});

// ============================================
// LEAF CONDITION UNION
// ============================================

export const LeafConditionSchema = z.discriminatedUnion('kind', [
  CellsAreCoveredSchema,
  CellsAreEmptySchema,
  CellsHaveColorSchema,
  RowFullyCoveredSchema,
  ColumnFullyCoveredSchema,
  RowIsEmptySchema,
  ColumnIsEmptySchema,
  TotalPiecesPlacedSchema,
  PiecesOfColorCountSchema,
  PiecesOfShapeCountSchema,
  CoveredCellCountSchema,
  StackHeightAtCellsSchema,
  MaxStackHeightSchema,
  MinStackHeightSchema,
  NoAdjacentSameColorSchema,
  AllCoveredConnectedSchema,
  PieceAtPositionSchema,
  PathExistsSchema,
  AllSameColorConnectedSchema,
  NoSharedDiagonalSchema,
  MaxColorsUsedSchema,
  CountPerRowSchema,
  CountPerColumnSchema,
  ParityPerRowSchema,
  ParityPerColumnSchema,
  HorizontalSymmetrySchema,
  VerticalSymmetrySchema,
  CustomCodeSchema,
]);

export type LeafCondition = z.infer<typeof LeafConditionSchema>;

// ============================================
// COMBINATOR KINDS
// ============================================

export const COMBINATOR_KINDS = ['ALL', 'ANY', 'NONE', 'EXACTLY_N', 'AT_LEAST_N'] as const;
export type CombinatorKind = (typeof COMBINATOR_KINDS)[number];

// ============================================
// CONDITION NODE (recursive)
// ============================================

export type CombinatorNode = {
  kind: CombinatorKind;
  n?: number;
  children: ConditionNode[];
};

export type ConditionNode = LeafCondition | CombinatorNode;

// Runtime schema using z.lazy for recursion
export const CombinatorNodeSchema: z.ZodType<CombinatorNode> = z.object({
  kind: z.enum(COMBINATOR_KINDS),
  n: z.number().int().positive().optional(),
  children: z.lazy(() => z.array(ConditionNodeSchema)),
});

export const ConditionNodeSchema: z.ZodType<ConditionNode> = z.union([
  LeafConditionSchema,
  CombinatorNodeSchema,
]);

// ============================================
// CUSTOM RULE PARAMS (stored in validation_rules)
// ============================================

export const CustomRuleParamsSchema = z.object({
  label: z.string().min(1),
  /** Free-text hint shown to the player when the rule fails */
  description: z.string().optional(),
  condition: ConditionNodeSchema,
});

export type CustomRuleParams = z.infer<typeof CustomRuleParamsSchema>;

// ============================================
// HELPERS
// ============================================

export function isCombinator(node: ConditionNode): node is CombinatorNode {
  return COMBINATOR_KINDS.includes(node.kind as CombinatorKind);
}

export function isLeaf(node: ConditionNode): node is LeafCondition {
  return !isCombinator(node);
}
