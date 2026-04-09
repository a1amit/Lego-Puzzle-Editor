import { describe, it, expect } from 'vitest'
import {
  PuzzleDefinitionSchema,
  BrickSchema,
  BoardDimensionsSchema,
  ValidationRuleSchema,
  GoalPositionSchema,
  TargetPatternSchema,
  ShapeDefinitionSchema,
  InitialPlacementSchema,
} from '@/types/puzzle'

describe('BrickSchema', () => {
  it('parses a valid brick', () => {
    const result = BrickSchema.parse({
      id: 'brick-1',
      shape: 'T-tetromino',
      color: '#ff0000',
      quantity: 3,
    })
    expect(result.id).toBe('brick-1')
    expect(result.shape).toBe('T-tetromino')
    expect(result.color).toBe('#ff0000')
    expect(result.quantity).toBe(3)
  })

  it('defaults quantity to 1 when not provided', () => {
    const result = BrickSchema.parse({
      id: 'brick-2',
      shape: 'unit',
      color: 'blue',
    })
    expect(result.quantity).toBe(1)
  })

  it('rejects an invalid shape name', () => {
    expect(() =>
      BrickSchema.parse({
        id: 'brick-3',
        shape: 'nonexistent-shape',
        color: '#000',
        quantity: 1,
      }),
    ).toThrow()
  })

  it('rejects non-positive quantity', () => {
    expect(() =>
      BrickSchema.parse({
        id: 'brick-4',
        shape: 'unit',
        color: '#fff',
        quantity: 0,
      }),
    ).toThrow()
  })

  it('rejects negative quantity', () => {
    expect(() =>
      BrickSchema.parse({
        id: 'brick-5',
        shape: 'unit',
        color: '#fff',
        quantity: -1,
      }),
    ).toThrow()
  })

  it('rejects non-integer quantity', () => {
    expect(() =>
      BrickSchema.parse({
        id: 'brick-6',
        shape: 'unit',
        color: '#fff',
        quantity: 1.5,
      }),
    ).toThrow()
  })
})

describe('BoardDimensionsSchema', () => {
  it('parses valid dimensions', () => {
    const result = BoardDimensionsSchema.parse({
      width: 8,
      height: 6,
      depth: 2,
    })
    expect(result.width).toBe(8)
    expect(result.height).toBe(6)
    expect(result.depth).toBe(2)
  })

  it('defaults depth to 1 when not provided', () => {
    const result = BoardDimensionsSchema.parse({
      width: 4,
      height: 4,
    })
    expect(result.depth).toBe(1)
  })

  it('rejects negative width', () => {
    expect(() =>
      BoardDimensionsSchema.parse({ width: -1, height: 4 }),
    ).toThrow()
  })

  it('rejects zero height', () => {
    expect(() =>
      BoardDimensionsSchema.parse({ width: 4, height: 0 }),
    ).toThrow()
  })

  it('rejects non-integer dimensions', () => {
    expect(() =>
      BoardDimensionsSchema.parse({ width: 4.5, height: 4 }),
    ).toThrow()
  })
})

describe('ValidationRuleSchema', () => {
  it('parses a valid rule', () => {
    const result = ValidationRuleSchema.parse({
      type: 'COVERAGE',
      rule: 'ALL_CELLS_COVERED',
    })
    expect(result.type).toBe('COVERAGE')
    expect(result.rule).toBe('ALL_CELLS_COVERED')
  })

  it('parses a rule with optional params', () => {
    const result = ValidationRuleSchema.parse({
      type: 'COUNT',
      rule: 'EXACT_PIECE_COUNT',
      params: { count: 5, color: 'red' },
    })
    expect(result.params).toEqual({ count: 5, color: 'red' })
  })

  it('rejects an invalid type', () => {
    expect(() =>
      ValidationRuleSchema.parse({
        type: 'INVALID_TYPE',
        rule: 'some-rule',
      }),
    ).toThrow()
  })

  it('rejects missing rule field', () => {
    expect(() =>
      ValidationRuleSchema.parse({
        type: 'COVERAGE',
      }),
    ).toThrow()
  })

  it('accepts all valid rule types', () => {
    const types = [
      'COVERAGE', 'PLACEMENT', 'COUNT', 'MOVEMENT', 'ROTATION',
      'PATTERN', 'GOAL', 'CONSTRAINT', 'MAX_MOVES', 'CUSTOM',
    ]
    for (const type of types) {
      expect(() =>
        ValidationRuleSchema.parse({ type, rule: 'test-rule' }),
      ).not.toThrow()
    }
  })
})

describe('GoalPositionSchema', () => {
  it('parses a valid goal with cells', () => {
    const result = GoalPositionSchema.parse({
      cells: [[1, 3], [2, 3], [1, 4], [2, 4]],
    })
    expect(result.cells).toEqual([[1, 3], [2, 3], [1, 4], [2, 4]])
  })

  it('parses a goal with targetPieceId', () => {
    const result = GoalPositionSchema.parse({
      targetPieceId: 'red-block',
      cells: [[0, 0], [1, 0]],
    })
    expect(result.targetPieceId).toBe('red-block')
  })

  it('parses a goal with targetPieceIds', () => {
    const result = GoalPositionSchema.parse({
      targetPieceIds: ['a', 'b'],
      cells: [[0, 0]],
    })
    expect(result.targetPieceIds).toEqual(['a', 'b'])
  })

  it('parses a goal with allowAnyPiece', () => {
    const result = GoalPositionSchema.parse({
      allowAnyPiece: true,
      cells: [[2, 2]],
    })
    expect(result.allowAnyPiece).toBe(true)
  })

  it('parses a goal with hideGoalVisualization', () => {
    const result = GoalPositionSchema.parse({
      cells: [[0, 0]],
      hideGoalVisualization: true,
    })
    expect(result.hideGoalVisualization).toBe(true)
  })

  it('parses a goal with requireOtherPiecesStationary', () => {
    const result = GoalPositionSchema.parse({
      targetPieceId: 'main',
      cells: [[0, 0]],
      requireOtherPiecesStationary: true,
    })
    expect(result.requireOtherPiecesStationary).toBe(true)
  })

  it('rejects a goal without cells', () => {
    expect(() =>
      GoalPositionSchema.parse({ targetPieceId: 'piece-1' }),
    ).toThrow()
  })
})

describe('TargetPatternSchema', () => {
  it('parses a valid pattern with rows and color_mapping', () => {
    const result = TargetPatternSchema.parse({
      rows: [[0, 1, 0], [1, 0, 1]],
      color_mapping: { '0': '#000000', '1': '#ffffff' },
    })
    expect(result.rows).toEqual([[0, 1, 0], [1, 0, 1]])
    expect(result.color_mapping).toEqual({ '0': '#000000', '1': '#ffffff' })
  })

  it('accepts string values in rows', () => {
    const result = TargetPatternSchema.parse({
      rows: [['R', 'G', 'B'], ['B', 'G', 'R']],
      color_mapping: { R: '#ff0000', G: '#00ff00', B: '#0000ff' },
    })
    expect(result.rows[0]).toEqual(['R', 'G', 'B'])
  })

  it('parses a pattern with allow_empty_cells', () => {
    const result = TargetPatternSchema.parse({
      rows: [[1, 0]],
      color_mapping: { '0': '#000', '1': '#fff' },
      allow_empty_cells: true,
    })
    expect(result.allow_empty_cells).toBe(true)
  })

  it('rejects missing rows', () => {
    expect(() =>
      TargetPatternSchema.parse({
        color_mapping: { '0': '#000' },
      }),
    ).toThrow()
  })

  it('rejects missing color_mapping', () => {
    expect(() =>
      TargetPatternSchema.parse({
        rows: [[0, 1]],
      }),
    ).toThrow()
  })
})

describe('InitialPlacementSchema', () => {
  it('parses a brick reference placement (variant 1)', () => {
    const result = InitialPlacementSchema.parse({
      brickId: 'brick-1',
      position: [2, 3],
      rotation: 90,
    })
    expect(result).toEqual({
      brickId: 'brick-1',
      position: [2, 3],
      rotation: 90,
    })
  })

  it('defaults rotation to 0 for brick reference placement', () => {
    const result = InitialPlacementSchema.parse({
      brickId: 'brick-1',
      position: [0, 0],
    })
    expect(result).toMatchObject({ brickId: 'brick-1', rotation: 0 })
  })

  it('parses an inline piece definition (variant 2)', () => {
    const result = InitialPlacementSchema.parse({
      id: 'piece-A',
      shape: 'T-tetromino',
      color: '#ff0000',
      position: [1, 1],
      rotation: 180,
    })
    expect(result).toMatchObject({
      id: 'piece-A',
      shape: 'T-tetromino',
      color: '#ff0000',
    })
  })

  it('parses a cell-based piece definition (variant 3)', () => {
    const result = InitialPlacementSchema.parse({
      id: 'cell-piece',
      cells: [[0, 0], [1, 0], [1, 1]],
      color: 'blue',
    })
    expect(result).toEqual({
      id: 'cell-piece',
      cells: [[0, 0], [1, 0], [1, 1]],
      color: 'blue',
    })
  })
})

describe('ShapeDefinitionSchema', () => {
  it('parses a valid shape with name and cells', () => {
    const result = ShapeDefinitionSchema.parse({
      name: 'custom-L',
      cells: [[0, 0], [0, 1], [1, 1]],
    })
    expect(result.name).toBe('custom-L')
    expect(result.cells).toEqual([[0, 0], [0, 1], [1, 1]])
  })

  it('parses a shape with optional color', () => {
    const result = ShapeDefinitionSchema.parse({
      name: 'colored-block',
      cells: [[0, 0]],
      color: '#abcdef',
    })
    expect(result.color).toBe('#abcdef')
  })

  it('rejects missing name', () => {
    expect(() =>
      ShapeDefinitionSchema.parse({
        cells: [[0, 0]],
      }),
    ).toThrow()
  })

  it('rejects missing cells', () => {
    expect(() =>
      ShapeDefinitionSchema.parse({
        name: 'no-cells',
      }),
    ).toThrow()
  })

  it('rejects invalid cell format', () => {
    expect(() =>
      ShapeDefinitionSchema.parse({
        name: 'bad-cells',
        cells: [[0, 0, 0]], // tuples must be exactly [number, number]
      }),
    ).toThrow()
  })
})

describe('PuzzleDefinitionSchema', () => {
  const minimalPuzzle = {
    title: 'Test Puzzle',
    description: 'A test puzzle',
    board: {
      dimensions: { width: 4, height: 4 },
    },
    inventory: [
      { id: 'b1', shape: 'unit', color: '#ff0000' },
    ],
    validation_rules: [
      { type: 'COVERAGE', rule: 'ALL_CELLS_COVERED' },
    ],
  }

  it('parses a valid minimal puzzle', () => {
    const result = PuzzleDefinitionSchema.parse(minimalPuzzle)
    expect(result.title).toBe('Test Puzzle')
    expect(result.description).toBe('A test puzzle')
    expect(result.board.dimensions.width).toBe(4)
    expect(result.board.dimensions.height).toBe(4)
    expect(result.inventory).toHaveLength(1)
    expect(result.validation_rules).toHaveLength(1)
  })

  it('applies default values', () => {
    const result = PuzzleDefinitionSchema.parse(minimalPuzzle)
    expect(result.viewMode).toBe('3D')
    expect(result.board.dimensions.depth).toBe(1)
    expect(result.board.initial_state).toEqual([])
    expect(result.inventory[0].quantity).toBe(1)
  })

  it('rejects missing required title', () => {
    const { title, ...noTitle } = minimalPuzzle
    expect(() => PuzzleDefinitionSchema.parse(noTitle)).toThrow()
  })

  it('rejects missing required description', () => {
    const { description, ...noDesc } = minimalPuzzle
    expect(() => PuzzleDefinitionSchema.parse(noDesc)).toThrow()
  })

  it('rejects missing required board', () => {
    const { board, ...noBoard } = minimalPuzzle
    expect(() => PuzzleDefinitionSchema.parse(noBoard)).toThrow()
  })

  it('rejects missing required inventory', () => {
    const { inventory, ...noInventory } = minimalPuzzle
    expect(() => PuzzleDefinitionSchema.parse(noInventory)).toThrow()
  })

  it('rejects missing required validation_rules', () => {
    const { validation_rules, ...noRules } = minimalPuzzle
    expect(() => PuzzleDefinitionSchema.parse(noRules)).toThrow()
  })

  it('parses a puzzle with all optional fields', () => {
    const fullPuzzle = {
      ...minimalPuzzle,
      puzzle_id: 'puzzle-123',
      viewMode: '2D',
      goal: {
        targetPieceId: 'target',
        cells: [[0, 0], [1, 0]],
      },
      target_pattern: {
        rows: [[0, 1], [1, 0]],
        color_mapping: { '0': '#000', '1': '#fff' },
      },
      nonogram_hints: {
        rows: [[1, 1], [2]],
        columns: [[1], [1, 1]],
      },
      custom_shapes: {
        'my-shape': {
          name: 'my-shape',
          cells: [[0, 0], [1, 0]],
        },
      },
      metadata: {
        author: 'Test Author',
        difficulty: 'hard',
        tags: ['test', 'demo'],
        version: '1.0',
      },
    }

    const result = PuzzleDefinitionSchema.parse(fullPuzzle)
    expect(result.puzzle_id).toBe('puzzle-123')
    expect(result.viewMode).toBe('2D')
    expect(result.goal).toBeDefined()
    expect(result.target_pattern).toBeDefined()
    expect(result.nonogram_hints).toBeDefined()
    expect(result.custom_shapes).toBeDefined()
    expect(result.metadata?.author).toBe('Test Author')
    expect(result.metadata?.difficulty).toBe('hard')
    expect(result.metadata?.tags).toEqual(['test', 'demo'])
  })

  it('parses a puzzle with board initial_state and blocked_cells', () => {
    const result = PuzzleDefinitionSchema.parse({
      ...minimalPuzzle,
      board: {
        dimensions: { width: 4, height: 4 },
        initial_state: [
          { brickId: 'b1', position: [0, 0], rotation: 0 },
        ],
        blocked_cells: [[3, 3]],
      },
    })
    expect(result.board.initial_state).toHaveLength(1)
    expect(result.board.blocked_cells).toEqual([[3, 3]])
  })
})
