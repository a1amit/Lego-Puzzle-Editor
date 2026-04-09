import { describe, it, expect } from 'vitest'
import { enrichValidationRules, hasSlidingOnlyRule, hasNoBrickRemovalRule } from '@/engine/validationHelpers'
import type { ValidationRule } from '@/types/puzzle'
import { createTestPuzzle as minimalPuzzle } from '../helpers'

// ============================================
// enrichValidationRules
// ============================================

describe('enrichValidationRules', () => {
  describe('ALL_BRICKS_MUST_BE_USED', () => {
    it('adds inventory params to the rule', () => {
      const puzzle = minimalPuzzle({
        inventory: [
          { id: 'b1', shape: 'unit', color: '#ff0000', quantity: 3 },
          { id: 'b2', shape: 'domino', color: '#00ff00', quantity: 1 },
        ],
        validation_rules: [
          { type: 'COVERAGE', rule: 'ALL_BRICKS_MUST_BE_USED' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result.length).toBe(1)
      expect(result[0].params).toBeDefined()
      expect(result[0].params!.inventory).toEqual([
        { id: 'b1', quantity: 3 },
        { id: 'b2', quantity: 1 },
      ])
    })

    it('preserves existing params and adds inventory', () => {
      const puzzle = minimalPuzzle({
        inventory: [{ id: 'b1', shape: 'unit', color: '#ff0000', quantity: 1 }],
        validation_rules: [
          { type: 'COVERAGE', rule: 'ALL_BRICKS_MUST_BE_USED', params: { custom: 'value' } },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0].params!.custom).toBe('value')
      expect(result[0].params!.inventory).toBeDefined()
    })
  })

  describe('GOAL_REACHED', () => {
    it('adds goalCells, targetPieceId, and other goal params', () => {
      const puzzle = minimalPuzzle({
        goal: {
          targetPieceId: 'hero',
          cells: [[1, 3], [2, 3]] as [number, number][],
        },
        validation_rules: [
          { type: 'GOAL', rule: 'GOAL_REACHED' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0].params!.targetPieceId).toBe('hero')
      expect(result[0].params!.goalCells).toEqual([[1, 3], [2, 3]])
    })

    it('adds targetPieceIds when provided', () => {
      const puzzle = minimalPuzzle({
        goal: {
          targetPieceIds: ['a', 'b'],
          cells: [[0, 0]] as [number, number][],
        },
        validation_rules: [
          { type: 'GOAL', rule: 'GOAL_REACHED' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0].params!.targetPieceIds).toEqual(['a', 'b'])
    })

    it('adds allowAnyPiece when provided', () => {
      const puzzle = minimalPuzzle({
        goal: {
          allowAnyPiece: true,
          cells: [[0, 0]] as [number, number][],
        },
        validation_rules: [
          { type: 'GOAL', rule: 'GOAL_REACHED' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0].params!.allowAnyPiece).toBe(true)
    })

    it('adds requireOtherPiecesStationary and initialPositions', () => {
      const puzzle = minimalPuzzle({
        goal: {
          targetPieceId: 'hero',
          cells: [[0, 0]] as [number, number][],
          requireOtherPiecesStationary: true,
        },
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [
            {
              id: 'blocker',
              cells: [[1, 1], [2, 1]] as [number, number][],
              color: '#00ff00',
            },
          ],
          blocked_cells: [],
        },
        validation_rules: [
          { type: 'GOAL', rule: 'GOAL_REACHED' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0].params!.requireOtherPiecesStationary).toBe(true)
      expect(result[0].params!.initialPositions).toEqual([
        { id: 'blocker', cells: [[1, 1], [2, 1]] },
      ])
    })

    it('does not add goal params when puzzle has no goal', () => {
      const puzzle = minimalPuzzle({
        validation_rules: [
          { type: 'GOAL', rule: 'GOAL_REACHED' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      // Without puzzle.goal, the rule passes through unchanged
      expect(result[0].params).toBeUndefined()
    })
  })

  describe('PATTERN_MATCH', () => {
    it('adds rows and color_mapping from target_pattern', () => {
      const puzzle = minimalPuzzle({
        target_pattern: {
          rows: [[0, 1], [1, 0]],
          color_mapping: { '0': '#000000', '1': '#ffffff' },
        },
        validation_rules: [
          { type: 'PATTERN', rule: 'PATTERN_MATCH' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0].params!.rows).toEqual([[0, 1], [1, 0]])
      expect(result[0].params!.color_mapping).toEqual({ '0': '#000000', '1': '#ffffff' })
    })

    it('adds allow_empty_cells when provided', () => {
      const puzzle = minimalPuzzle({
        target_pattern: {
          rows: [[1]],
          color_mapping: { '1': '#fff' },
          allow_empty_cells: true,
        },
        validation_rules: [
          { type: 'PATTERN', rule: 'PATTERN_MATCH' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0].params!.allow_empty_cells).toBe(true)
    })

    it('does not add pattern params when no target_pattern exists', () => {
      const puzzle = minimalPuzzle({
        validation_rules: [
          { type: 'PATTERN', rule: 'PATTERN_MATCH' },
        ],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0].params).toBeUndefined()
    })
  })

  describe('CUSTOM_RULE', () => {
    it('passes through unchanged', () => {
      const customRule: ValidationRule = {
        type: 'CUSTOM',
        rule: 'CUSTOM_RULE',
        params: { condition: { type: 'AND', conditions: [] } },
      }
      const puzzle = minimalPuzzle({
        validation_rules: [customRule],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0]).toEqual(customRule)
    })
  })

  describe('MAX_MOVES', () => {
    it('adds currentMoves from moveCount parameter', () => {
      const puzzle = minimalPuzzle({
        validation_rules: [
          { type: 'MAX_MOVES', rule: 'MAX_MOVES', params: { maxMoves: 10 } },
        ],
      })

      const result = enrichValidationRules(puzzle, 5)
      expect(result[0].params!.currentMoves).toBe(5)
      expect(result[0].params!.maxMoves).toBe(10)
    })

    it('preserves existing params', () => {
      const puzzle = minimalPuzzle({
        validation_rules: [
          { type: 'MAX_MOVES', rule: 'MAX_MOVES', params: { maxMoves: 20, custom: 'data' } },
        ],
      })

      const result = enrichValidationRules(puzzle, 7)
      expect(result[0].params!.custom).toBe('data')
      expect(result[0].params!.currentMoves).toBe(7)
    })
  })

  describe('other rules', () => {
    it('passes through unrecognized rules unchanged', () => {
      const rule: ValidationRule = {
        type: 'PLACEMENT',
        rule: 'NO_OVERLAP',
        params: { strict: true },
      }
      const puzzle = minimalPuzzle({
        validation_rules: [rule],
      })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0]).toEqual(rule)
    })

    it('handles SLIDING_ONLY rule as pass-through', () => {
      const rule: ValidationRule = { type: 'MOVEMENT', rule: 'SLIDING_ONLY' }
      const puzzle = minimalPuzzle({ validation_rules: [rule] })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0]).toEqual(rule)
    })

    it('handles NO_BRICK_REMOVAL as pass-through', () => {
      const rule: ValidationRule = { type: 'CONSTRAINT', rule: 'NO_BRICK_REMOVAL' }
      const puzzle = minimalPuzzle({ validation_rules: [rule] })

      const result = enrichValidationRules(puzzle, 0)
      expect(result[0]).toEqual(rule)
    })
  })

  it('enriches multiple rules in one puzzle', () => {
    const puzzle = minimalPuzzle({
      inventory: [{ id: 'b1', shape: 'unit', color: '#f00', quantity: 1 }],
      validation_rules: [
        { type: 'COVERAGE', rule: 'ALL_BRICKS_MUST_BE_USED' },
        { type: 'MAX_MOVES', rule: 'MAX_MOVES', params: { maxMoves: 5 } },
        { type: 'PLACEMENT', rule: 'NO_OVERLAP' },
      ],
    })

    const result = enrichValidationRules(puzzle, 3)
    expect(result.length).toBe(3)
    expect(result[0].params!.inventory).toBeDefined()
    expect(result[1].params!.currentMoves).toBe(3)
    expect(result[2].rule).toBe('NO_OVERLAP')
  })
})

// ============================================
// hasSlidingOnlyRule
// ============================================

describe('hasSlidingOnlyRule', () => {
  it('returns false for null puzzle', () => {
    expect(hasSlidingOnlyRule(null)).toBe(false)
  })

  it('returns false when no SLIDING_ONLY rule is present', () => {
    const puzzle = minimalPuzzle({
      validation_rules: [
        { type: 'COVERAGE', rule: 'ALL_BRICKS_MUST_BE_USED' },
        { type: 'PLACEMENT', rule: 'NO_OVERLAP' },
      ],
    })
    expect(hasSlidingOnlyRule(puzzle)).toBe(false)
  })

  it('returns true when SLIDING_ONLY rule is present', () => {
    const puzzle = minimalPuzzle({
      validation_rules: [
        { type: 'MOVEMENT', rule: 'SLIDING_ONLY' },
      ],
    })
    expect(hasSlidingOnlyRule(puzzle)).toBe(true)
  })

  it('returns true when SLIDING_ONLY is among other rules', () => {
    const puzzle = minimalPuzzle({
      validation_rules: [
        { type: 'COVERAGE', rule: 'ALL_BRICKS_MUST_BE_USED' },
        { type: 'MOVEMENT', rule: 'SLIDING_ONLY' },
        { type: 'PLACEMENT', rule: 'NO_OVERLAP' },
      ],
    })
    expect(hasSlidingOnlyRule(puzzle)).toBe(true)
  })

  it('returns false when rule is SLIDING_ONLY but type is wrong', () => {
    const puzzle = minimalPuzzle({
      validation_rules: [
        { type: 'PLACEMENT', rule: 'SLIDING_ONLY' },
      ],
    })
    expect(hasSlidingOnlyRule(puzzle)).toBe(false)
  })
})

// ============================================
// hasNoBrickRemovalRule
// ============================================

describe('hasNoBrickRemovalRule', () => {
  it('returns false for null puzzle', () => {
    expect(hasNoBrickRemovalRule(null)).toBe(false)
  })

  it('returns false when NO_BRICK_REMOVAL is not present', () => {
    const puzzle = minimalPuzzle({
      validation_rules: [
        { type: 'COVERAGE', rule: 'ALL_BRICKS_MUST_BE_USED' },
      ],
    })
    expect(hasNoBrickRemovalRule(puzzle)).toBe(false)
  })

  it('returns true when NO_BRICK_REMOVAL is present', () => {
    const puzzle = minimalPuzzle({
      validation_rules: [
        { type: 'CONSTRAINT', rule: 'NO_BRICK_REMOVAL' },
      ],
    })
    expect(hasNoBrickRemovalRule(puzzle)).toBe(true)
  })

  it('returns true when NO_BRICK_REMOVAL is among other rules', () => {
    const puzzle = minimalPuzzle({
      validation_rules: [
        { type: 'MOVEMENT', rule: 'SLIDING_ONLY' },
        { type: 'CONSTRAINT', rule: 'NO_BRICK_REMOVAL' },
        { type: 'COVERAGE', rule: 'ALL_BRICKS_MUST_BE_USED' },
      ],
    })
    expect(hasNoBrickRemovalRule(puzzle)).toBe(true)
  })

  it('returns true regardless of type field value', () => {
    // hasNoBrickRemovalRule only checks r.rule, not r.type
    const puzzle = minimalPuzzle({
      validation_rules: [
        { type: 'MOVEMENT', rule: 'NO_BRICK_REMOVAL' },
      ],
    })
    expect(hasNoBrickRemovalRule(puzzle)).toBe(true)
  })
})
