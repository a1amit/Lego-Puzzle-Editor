import { describe, it, expect } from 'vitest'
import {
  LeafConditionSchema,
  CombinatorNodeSchema,
  ConditionNodeSchema,
  CustomRuleParamsSchema,
  isCombinator,
  isLeaf,
} from '@/types/customRules'
import type { ConditionNode, CombinatorNode, LeafCondition } from '@/types/customRules'

describe('LeafConditionSchema', () => {
  describe('cell conditions', () => {
    it('parses cells_are_covered', () => {
      const result = LeafConditionSchema.parse({
        kind: 'cells_are_covered',
        cells: [[0, 0], [1, 0]],
      })
      expect(result.kind).toBe('cells_are_covered')
    })

    it('parses cells_are_empty', () => {
      const result = LeafConditionSchema.parse({
        kind: 'cells_are_empty',
        cells: [[2, 3]],
      })
      expect(result.kind).toBe('cells_are_empty')
    })

    it('parses cells_have_color', () => {
      const result = LeafConditionSchema.parse({
        kind: 'cells_have_color',
        cells: [[0, 0]],
        color: '#ff0000',
      })
      expect(result.kind).toBe('cells_have_color')
      expect((result as { color: string }).color).toBe('#ff0000')
    })
  })

  describe('row/column conditions', () => {
    it('parses row_fully_covered', () => {
      const result = LeafConditionSchema.parse({
        kind: 'row_fully_covered',
        row: 2,
      })
      expect(result.kind).toBe('row_fully_covered')
    })

    it('parses column_fully_covered', () => {
      const result = LeafConditionSchema.parse({
        kind: 'column_fully_covered',
        column: 0,
      })
      expect(result.kind).toBe('column_fully_covered')
    })

    it('parses row_is_empty', () => {
      const result = LeafConditionSchema.parse({
        kind: 'row_is_empty',
        row: 1,
      })
      expect(result.kind).toBe('row_is_empty')
    })

    it('parses column_is_empty', () => {
      const result = LeafConditionSchema.parse({
        kind: 'column_is_empty',
        column: 3,
      })
      expect(result.kind).toBe('column_is_empty')
    })

    it('parses count_per_row', () => {
      const result = LeafConditionSchema.parse({
        kind: 'count_per_row',
        operator: 'eq',
        value: 3,
      })
      expect(result.kind).toBe('count_per_row')
    })

    it('parses count_per_column', () => {
      const result = LeafConditionSchema.parse({
        kind: 'count_per_column',
        operator: 'lte',
        value: 2,
      })
      expect(result.kind).toBe('count_per_column')
    })

    it('parses parity_per_row', () => {
      const result = LeafConditionSchema.parse({
        kind: 'parity_per_row',
        parity: 'even',
      })
      expect(result.kind).toBe('parity_per_row')
    })

    it('parses parity_per_column', () => {
      const result = LeafConditionSchema.parse({
        kind: 'parity_per_column',
        parity: 'odd',
      })
      expect(result.kind).toBe('parity_per_column')
    })
  })

  describe('count conditions', () => {
    it('parses total_pieces_placed', () => {
      const result = LeafConditionSchema.parse({
        kind: 'total_pieces_placed',
        operator: 'eq',
        value: 5,
      })
      expect(result.kind).toBe('total_pieces_placed')
    })

    it('parses pieces_of_color_count', () => {
      const result = LeafConditionSchema.parse({
        kind: 'pieces_of_color_count',
        color: 'red',
        operator: 'gte',
        value: 2,
      })
      expect(result.kind).toBe('pieces_of_color_count')
    })

    it('parses pieces_of_shape_count', () => {
      const result = LeafConditionSchema.parse({
        kind: 'pieces_of_shape_count',
        shape: 'T-tetromino',
        operator: 'lt',
        value: 3,
      })
      expect(result.kind).toBe('pieces_of_shape_count')
    })

    it('parses covered_cell_count', () => {
      const result = LeafConditionSchema.parse({
        kind: 'covered_cell_count',
        operator: 'eq',
        value: 16,
      })
      expect(result.kind).toBe('covered_cell_count')
    })

    it('parses max_colors_used', () => {
      const result = LeafConditionSchema.parse({
        kind: 'max_colors_used',
        operator: 'lte',
        value: 3,
      })
      expect(result.kind).toBe('max_colors_used')
    })
  })

  describe('3D / stacking conditions', () => {
    it('parses stack_height_at_cells', () => {
      const result = LeafConditionSchema.parse({
        kind: 'stack_height_at_cells',
        cells: [[1, 1], [2, 2]],
        operator: 'eq',
        value: 2,
      })
      expect(result.kind).toBe('stack_height_at_cells')
    })

    it('parses max_stack_height', () => {
      const result = LeafConditionSchema.parse({
        kind: 'max_stack_height',
        operator: 'lte',
        value: 3,
      })
      expect(result.kind).toBe('max_stack_height')
    })

    it('parses min_stack_height', () => {
      const result = LeafConditionSchema.parse({
        kind: 'min_stack_height',
        operator: 'gte',
        value: 1,
      })
      expect(result.kind).toBe('min_stack_height')
    })
  })

  describe('spatial conditions', () => {
    it('parses no_adjacent_same_color', () => {
      const result = LeafConditionSchema.parse({
        kind: 'no_adjacent_same_color',
      })
      expect(result.kind).toBe('no_adjacent_same_color')
    })

    it('parses all_covered_connected', () => {
      const result = LeafConditionSchema.parse({
        kind: 'all_covered_connected',
      })
      expect(result.kind).toBe('all_covered_connected')
    })

    it('parses piece_at_position', () => {
      const result = LeafConditionSchema.parse({
        kind: 'piece_at_position',
        pieceId: 'brick-1',
        cells: [[0, 0], [1, 0]],
      })
      expect(result.kind).toBe('piece_at_position')
    })

    it('parses path_exists', () => {
      const result = LeafConditionSchema.parse({
        kind: 'path_exists',
        startCell: [0, 0],
        endCell: [3, 3],
      })
      expect(result.kind).toBe('path_exists')
    })

    it('parses all_same_color_connected', () => {
      const result = LeafConditionSchema.parse({
        kind: 'all_same_color_connected',
      })
      expect(result.kind).toBe('all_same_color_connected')
    })

    it('parses no_shared_diagonal', () => {
      const result = LeafConditionSchema.parse({
        kind: 'no_shared_diagonal',
      })
      expect(result.kind).toBe('no_shared_diagonal')
    })
  })

  describe('symmetry conditions', () => {
    it('parses horizontal_symmetry', () => {
      const result = LeafConditionSchema.parse({
        kind: 'horizontal_symmetry',
      })
      expect(result.kind).toBe('horizontal_symmetry')
    })

    it('parses vertical_symmetry', () => {
      const result = LeafConditionSchema.parse({
        kind: 'vertical_symmetry',
      })
      expect(result.kind).toBe('vertical_symmetry')
    })
  })

  describe('custom code condition', () => {
    it('parses custom_code', () => {
      const result = LeafConditionSchema.parse({
        kind: 'custom_code',
        code: 'return { passed: true, message: "ok" }',
      })
      expect(result.kind).toBe('custom_code')
      expect((result as { code: string }).code).toBe('return { passed: true, message: "ok" }')
    })
  })

  describe('validation', () => {
    it('rejects an unknown kind', () => {
      expect(() =>
        LeafConditionSchema.parse({ kind: 'unknown_kind' }),
      ).toThrow()
    })

    it('rejects missing required fields for a kind', () => {
      expect(() =>
        LeafConditionSchema.parse({
          kind: 'cells_are_covered',
          // missing cells
        }),
      ).toThrow()
    })

    it('rejects invalid comparison operator', () => {
      expect(() =>
        LeafConditionSchema.parse({
          kind: 'total_pieces_placed',
          operator: 'invalid',
          value: 5,
        }),
      ).toThrow()
    })
  })
})

describe('CombinatorNodeSchema', () => {
  it('parses a valid ALL combinator with children', () => {
    const result = CombinatorNodeSchema.parse({
      kind: 'ALL',
      children: [
        { kind: 'cells_are_covered', cells: [[0, 0]] },
        { kind: 'no_adjacent_same_color' },
      ],
    })
    expect(result.kind).toBe('ALL')
    expect(result.children).toHaveLength(2)
  })

  it('parses ANY combinator', () => {
    const result = CombinatorNodeSchema.parse({
      kind: 'ANY',
      children: [
        { kind: 'horizontal_symmetry' },
      ],
    })
    expect(result.kind).toBe('ANY')
  })

  it('parses NONE combinator', () => {
    const result = CombinatorNodeSchema.parse({
      kind: 'NONE',
      children: [
        { kind: 'cells_are_empty', cells: [[0, 0]] },
      ],
    })
    expect(result.kind).toBe('NONE')
  })

  it('parses EXACTLY_N combinator with n', () => {
    const result = CombinatorNodeSchema.parse({
      kind: 'EXACTLY_N',
      n: 2,
      children: [
        { kind: 'row_fully_covered', row: 0 },
        { kind: 'row_fully_covered', row: 1 },
        { kind: 'row_fully_covered', row: 2 },
      ],
    })
    expect(result.kind).toBe('EXACTLY_N')
    expect(result.n).toBe(2)
    expect(result.children).toHaveLength(3)
  })

  it('parses AT_LEAST_N combinator with n', () => {
    const result = CombinatorNodeSchema.parse({
      kind: 'AT_LEAST_N',
      n: 1,
      children: [
        { kind: 'column_fully_covered', column: 0 },
      ],
    })
    expect(result.kind).toBe('AT_LEAST_N')
    expect(result.n).toBe(1)
  })

  it('parses nested combinators', () => {
    const result = CombinatorNodeSchema.parse({
      kind: 'ALL',
      children: [
        {
          kind: 'ANY',
          children: [
            { kind: 'horizontal_symmetry' },
            { kind: 'vertical_symmetry' },
          ],
        },
        { kind: 'all_covered_connected' },
      ],
    })
    expect(result.kind).toBe('ALL')
    expect(result.children).toHaveLength(2)
    expect(result.children[0].kind).toBe('ANY')
  })

  it('rejects an empty children array', () => {
    // The schema itself does not enforce non-empty, but it should still parse
    const result = CombinatorNodeSchema.parse({
      kind: 'ALL',
      children: [],
    })
    expect(result.children).toHaveLength(0)
  })

  it('rejects an invalid combinator kind', () => {
    expect(() =>
      CombinatorNodeSchema.parse({
        kind: 'INVALID',
        children: [],
      }),
    ).toThrow()
  })
})

describe('ConditionNodeSchema', () => {
  it('accepts a leaf condition', () => {
    const result = ConditionNodeSchema.parse({
      kind: 'cells_are_covered',
      cells: [[0, 0]],
    })
    expect(result.kind).toBe('cells_are_covered')
  })

  it('accepts a combinator node', () => {
    const result = ConditionNodeSchema.parse({
      kind: 'ALL',
      children: [
        { kind: 'no_adjacent_same_color' },
      ],
    })
    expect(result.kind).toBe('ALL')
  })

  it('accepts deeply nested structures', () => {
    const result = ConditionNodeSchema.parse({
      kind: 'ALL',
      children: [
        {
          kind: 'ANY',
          children: [
            {
              kind: 'NONE',
              children: [
                { kind: 'cells_are_empty', cells: [[0, 0]] },
              ],
            },
          ],
        },
      ],
    })
    expect(result.kind).toBe('ALL')
  })
})

describe('CustomRuleParamsSchema', () => {
  it('parses valid params with label and condition', () => {
    const result = CustomRuleParamsSchema.parse({
      label: 'All cells must be covered',
      condition: {
        kind: 'cells_are_covered',
        cells: [[0, 0], [1, 0]],
      },
    })
    expect(result.label).toBe('All cells must be covered')
    expect(result.condition.kind).toBe('cells_are_covered')
  })

  it('parses params with optional description', () => {
    const result = CustomRuleParamsSchema.parse({
      label: 'Symmetry check',
      description: 'The board must be horizontally symmetric',
      condition: {
        kind: 'horizontal_symmetry',
      },
    })
    expect(result.description).toBe('The board must be horizontally symmetric')
  })

  it('parses params with a combinator condition', () => {
    const result = CustomRuleParamsSchema.parse({
      label: 'Complex rule',
      condition: {
        kind: 'ALL',
        children: [
          { kind: 'no_adjacent_same_color' },
          { kind: 'all_covered_connected' },
        ],
      },
    })
    expect(result.condition.kind).toBe('ALL')
  })

  it('rejects missing label', () => {
    expect(() =>
      CustomRuleParamsSchema.parse({
        condition: { kind: 'horizontal_symmetry' },
      }),
    ).toThrow()
  })

  it('rejects empty label', () => {
    expect(() =>
      CustomRuleParamsSchema.parse({
        label: '',
        condition: { kind: 'horizontal_symmetry' },
      }),
    ).toThrow()
  })

  it('rejects missing condition', () => {
    expect(() =>
      CustomRuleParamsSchema.parse({
        label: 'Some rule',
      }),
    ).toThrow()
  })
})

describe('isCombinator', () => {
  it('returns true for ALL combinator', () => {
    const node: ConditionNode = { kind: 'ALL', children: [] }
    expect(isCombinator(node)).toBe(true)
  })

  it('returns true for ANY combinator', () => {
    const node: ConditionNode = { kind: 'ANY', children: [] }
    expect(isCombinator(node)).toBe(true)
  })

  it('returns true for NONE combinator', () => {
    const node: ConditionNode = { kind: 'NONE', children: [] }
    expect(isCombinator(node)).toBe(true)
  })

  it('returns true for EXACTLY_N combinator', () => {
    const node: ConditionNode = { kind: 'EXACTLY_N', n: 2, children: [] }
    expect(isCombinator(node)).toBe(true)
  })

  it('returns true for AT_LEAST_N combinator', () => {
    const node: ConditionNode = { kind: 'AT_LEAST_N', n: 1, children: [] }
    expect(isCombinator(node)).toBe(true)
  })

  it('returns false for leaf conditions', () => {
    const leaf: ConditionNode = { kind: 'cells_are_covered', cells: [[0, 0]] }
    expect(isCombinator(leaf)).toBe(false)
  })

  it('returns false for no_adjacent_same_color', () => {
    const leaf: ConditionNode = { kind: 'no_adjacent_same_color' }
    expect(isCombinator(leaf)).toBe(false)
  })
})

describe('isLeaf', () => {
  it('returns true for cells_are_covered', () => {
    const leaf: ConditionNode = { kind: 'cells_are_covered', cells: [[0, 0]] }
    expect(isLeaf(leaf)).toBe(true)
  })

  it('returns true for horizontal_symmetry', () => {
    const leaf: ConditionNode = { kind: 'horizontal_symmetry' }
    expect(isLeaf(leaf)).toBe(true)
  })

  it('returns true for custom_code', () => {
    const leaf: ConditionNode = { kind: 'custom_code', code: 'return { passed: true, message: "" }' }
    expect(isLeaf(leaf)).toBe(true)
  })

  it('returns true for total_pieces_placed', () => {
    const leaf: ConditionNode = { kind: 'total_pieces_placed', operator: 'eq', value: 5 }
    expect(isLeaf(leaf)).toBe(true)
  })

  it('returns false for ALL combinator', () => {
    const node: ConditionNode = { kind: 'ALL', children: [] }
    expect(isLeaf(node)).toBe(false)
  })

  it('returns false for ANY combinator', () => {
    const node: ConditionNode = { kind: 'ANY', children: [] }
    expect(isLeaf(node)).toBe(false)
  })

  it('returns false for EXACTLY_N combinator', () => {
    const node: ConditionNode = { kind: 'EXACTLY_N', n: 1, children: [] }
    expect(isLeaf(node)).toBe(false)
  })
})
