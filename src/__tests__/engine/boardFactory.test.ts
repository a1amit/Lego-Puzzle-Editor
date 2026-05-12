import { describe, it, expect } from 'vitest'
import { createInitialBoard, createInitialInventory } from '@/engine/boardFactory'
import { createTestPuzzle as minimalPuzzle } from '../helpers'

// ============================================
// createInitialBoard
// ============================================

describe('createInitialBoard', () => {
  it('returns default empty board for null puzzle', () => {
    const board = createInitialBoard(null)

    expect(board.dimensions).toEqual({ width: 8, height: 4, depth: 1 })
    expect(board.placedPieces).toEqual([])
    expect(board.blockedCells).toEqual([])
  })

  it('returns a new object each time for null (not same reference)', () => {
    const board1 = createInitialBoard(null)
    const board2 = createInitialBoard(null)
    expect(board1).not.toBe(board2)
  })

  it('returns empty board with puzzle dimensions when no initial_state', () => {
    const puzzle = minimalPuzzle({
      board: { dimensions: { width: 6, height: 3, depth: 2 }, initial_state: [], blocked_cells: [] },
    })
    const board = createInitialBoard(puzzle)

    expect(board.dimensions).toEqual({ width: 6, height: 3, depth: 2 })
    expect(board.placedPieces).toEqual([])
  })

  describe('cell-based initial_state', () => {
    it('creates custom shapes and places pieces correctly', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [
            {
              id: 'custom1',
              cells: [[1, 2], [2, 2], [3, 2]] as [number, number][],
              color: '#00ff00',
            },
          ],
          blocked_cells: [],
        },
      })

      const board = createInitialBoard(puzzle)

      expect(board.placedPieces.length).toBe(1)
      const piece = board.placedPieces[0]
      expect(piece.id).toBe('custom1')
      expect(piece.shape).toBe('custom-custom1')
      expect(piece.color).toBe('#00ff00')
      // Position should be the min of cell coords
      expect(piece.position.x).toBe(1)
      expect(piece.position.y).toBe(2)
      expect(piece.position.z).toBe(0)
      expect(piece.rotation).toBe(0)
    })

    it('normalizes cell coordinates in the shape', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 8, height: 8, depth: 1 },
          initial_state: [
            {
              id: 'offset',
              cells: [[3, 5], [4, 5]] as [number, number][],
              color: '#ff0000',
            },
          ],
          blocked_cells: [],
        },
      })

      const board = createInitialBoard(puzzle)
      const piece = board.placedPieces[0]
      // Position should be at the min coords
      expect(piece.position.x).toBe(3)
      expect(piece.position.y).toBe(5)
    })
  })

  describe('shape-based initial_state', () => {
    it('places pieces correctly with shape/color/position', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [
            {
              id: 'piece1',
              shape: 'unit',
              color: '#ff0000',
              position: [2, 3] as [number, number],
              rotation: 0,
            },
          ],
          blocked_cells: [],
        },
      })

      const board = createInitialBoard(puzzle)

      expect(board.placedPieces.length).toBe(1)
      const piece = board.placedPieces[0]
      expect(piece.id).toBe('piece1')
      expect(piece.shape).toBe('unit')
      expect(piece.color).toBe('#ff0000')
      expect(piece.position).toEqual({ x: 2, y: 3, z: 0 })
      expect(piece.rotation).toBe(0)
    })

    it('respects rotation in placement', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [
            {
              id: 'rotated',
              shape: 'domino',
              color: '#0000ff',
              position: [0, 0] as [number, number],
              rotation: 90,
            },
          ],
          blocked_cells: [],
        },
      })

      const board = createInitialBoard(puzzle)
      expect(board.placedPieces[0].rotation).toBe(90)
    })

    it('defaults rotation to 0 when not specified', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [
            {
              id: 'norot',
              shape: 'unit',
              color: '#ff0000',
              position: [0, 0] as [number, number],
              rotation: 0,
            },
          ],
          blocked_cells: [],
        },
      })

      const board = createInitialBoard(puzzle)
      expect(board.placedPieces[0].rotation).toBe(0)
    })
  })

  describe('brickId references', () => {
    it('places pieces referencing inventory bricks', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [
            {
              brickId: 'brick1',
              position: [1, 1] as [number, number],
              rotation: 0,
            },
          ],
          blocked_cells: [],
        },
        inventory: [
          { id: 'brick1', shape: 'T-tetromino', color: '#ff0000', quantity: 2 },
        ],
      })

      const board = createInitialBoard(puzzle)

      expect(board.placedPieces.length).toBe(1)
      const piece = board.placedPieces[0]
      expect(piece.id).toBe('brick1')
      expect(piece.shape).toBe('T-tetromino')
      expect(piece.color).toBe('#ff0000')
      expect(piece.position).toEqual({ x: 1, y: 1, z: 0 })
    })

    it('skips placement when brickId is not found in inventory', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [
            {
              brickId: 'nonexistent',
              position: [0, 0] as [number, number],
              rotation: 0,
            },
          ],
          blocked_cells: [],
        },
        inventory: [],
      })

      const board = createInitialBoard(puzzle)
      expect(board.placedPieces.length).toBe(0)
    })
  })

  describe('blocked_cells', () => {
    it('carries through blocked cells from puzzle', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [],
          blocked_cells: [[0, 0], [1, 1], [2, 2]],
        },
      })

      const board = createInitialBoard(puzzle)
      expect(board.blockedCells).toEqual([[0, 0], [1, 1], [2, 2]])
    })

    it('defaults to empty array when blocked_cells is undefined', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 1 },
          initial_state: [],
        },
      })

      const board = createInitialBoard(puzzle)
      expect(board.blockedCells).toEqual([])
    })
  })

  it('generates unique instanceIds for each piece', () => {
    const puzzle = minimalPuzzle({
      board: {
        dimensions: { width: 8, height: 4, depth: 1 },
        initial_state: [
          { id: 'a', shape: 'unit', color: '#ff0000', position: [0, 0] as [number, number], rotation: 0 },
          { id: 'b', shape: 'unit', color: '#00ff00', position: [1, 0] as [number, number], rotation: 0 },
        ],
        blocked_cells: [],
      },
    })

    const board = createInitialBoard(puzzle)
    const ids = board.placedPieces.map(p => p.instanceId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('auto-z stacking', () => {
    it('stacks overlapping initial pieces in array order', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 3 },
          initial_state: [
            { id: 'bottom', shape: 'unit', color: '#ff0000', position: [0, 0] as [number, number], rotation: 0 },
            { id: 'middle', shape: 'unit', color: '#00ff00', position: [0, 0] as [number, number], rotation: 0 },
            { id: 'top',    shape: 'unit', color: '#0000ff', position: [0, 0] as [number, number], rotation: 0 },
          ],
          blocked_cells: [],
        },
      })

      const board = createInitialBoard(puzzle)
      const byId = Object.fromEntries(board.placedPieces.map(p => [p.id, p]))
      expect(byId['bottom'].position.z).toBe(0)
      expect(byId['middle'].position.z).toBe(1)
      expect(byId['top'].position.z).toBe(2)
    })

    it('keeps z=0 for non-overlapping initial pieces', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 4, height: 4, depth: 2 },
          initial_state: [
            { id: 'a', shape: 'unit', color: '#ff0000', position: [0, 0] as [number, number], rotation: 0 },
            { id: 'b', shape: 'unit', color: '#00ff00', position: [2, 0] as [number, number], rotation: 0 },
          ],
          blocked_cells: [],
        },
      })

      const board = createInitialBoard(puzzle)
      expect(board.placedPieces.every(p => p.position.z === 0)).toBe(true)
    })

    it('stacks cell-based pieces with partial overlap', () => {
      const puzzle = minimalPuzzle({
        board: {
          dimensions: { width: 6, height: 4, depth: 3 },
          initial_state: [
            // 3-wide strip at row 0
            { id: 'wide',   color: '#ff0000', cells: [[0, 0], [1, 0], [2, 0]] as [number, number][] },
            // 1-cell sitting on the leftmost cell of 'wide' — should stack on top.
            { id: 'narrow', color: '#00ff00', cells: [[0, 0]] as [number, number][] },
          ],
          blocked_cells: [],
        },
      })

      const board = createInitialBoard(puzzle)
      const byId = Object.fromEntries(board.placedPieces.map(p => [p.id, p]))
      expect(byId['wide'].position.z).toBe(0)
      expect(byId['narrow'].position.z).toBe(1)
    })
  })
})

// ============================================
// createInitialInventory
// ============================================

describe('createInitialInventory', () => {
  it('returns empty Map for null puzzle', () => {
    const inv = createInitialInventory(null)
    expect(inv).toBeInstanceOf(Map)
    expect(inv.size).toBe(0)
  })

  it('returns empty Map when puzzle has no inventory', () => {
    const puzzle = minimalPuzzle({ inventory: [] })
    const inv = createInitialInventory(puzzle)
    expect(inv.size).toBe(0)
  })

  it('returns correct quantities from inventory', () => {
    const puzzle = minimalPuzzle({
      inventory: [
        { id: 'brick1', shape: 'unit', color: '#ff0000', quantity: 3 },
        { id: 'brick2', shape: 'domino', color: '#00ff00', quantity: 1 },
      ],
    })

    const inv = createInitialInventory(puzzle)
    expect(inv.get('brick1')).toBe(3)
    expect(inv.get('brick2')).toBe(1)
  })

  it('subtracts pre-placed brickId pieces from inventory', () => {
    const puzzle = minimalPuzzle({
      board: {
        dimensions: { width: 4, height: 4, depth: 1 },
        initial_state: [
          {
            brickId: 'brick1',
            position: [0, 0] as [number, number],
            rotation: 0,
          },
        ],
        blocked_cells: [],
      },
      inventory: [
        { id: 'brick1', shape: 'unit', color: '#ff0000', quantity: 3 },
      ],
    })

    const inv = createInitialInventory(puzzle)
    expect(inv.get('brick1')).toBe(2)
  })

  it('subtracts multiple brickId placements', () => {
    const puzzle = minimalPuzzle({
      board: {
        dimensions: { width: 8, height: 4, depth: 1 },
        initial_state: [
          { brickId: 'brick1', position: [0, 0] as [number, number], rotation: 0 },
          { brickId: 'brick1', position: [2, 0] as [number, number], rotation: 0 },
        ],
        blocked_cells: [],
      },
      inventory: [
        { id: 'brick1', shape: 'unit', color: '#ff0000', quantity: 5 },
      ],
    })

    const inv = createInitialInventory(puzzle)
    expect(inv.get('brick1')).toBe(3)
  })

  it('does not subtract inline/cell-based placements from inventory', () => {
    const puzzle = minimalPuzzle({
      board: {
        dimensions: { width: 4, height: 4, depth: 1 },
        initial_state: [
          { id: 'inline1', shape: 'unit', color: '#ff0000', position: [0, 0] as [number, number], rotation: 0 },
        ],
        blocked_cells: [],
      },
      inventory: [
        { id: 'brick1', shape: 'unit', color: '#ff0000', quantity: 3 },
      ],
    })

    const inv = createInitialInventory(puzzle)
    expect(inv.get('brick1')).toBe(3)
  })

  it('clamps at 0 when more brickId placements than inventory', () => {
    const puzzle = minimalPuzzle({
      board: {
        dimensions: { width: 8, height: 4, depth: 1 },
        initial_state: [
          { brickId: 'brick1', position: [0, 0] as [number, number], rotation: 0 },
          { brickId: 'brick1', position: [1, 0] as [number, number], rotation: 0 },
          { brickId: 'brick1', position: [2, 0] as [number, number], rotation: 0 },
        ],
        blocked_cells: [],
      },
      inventory: [
        { id: 'brick1', shape: 'unit', color: '#ff0000', quantity: 2 },
      ],
    })

    const inv = createInitialInventory(puzzle)
    expect(inv.get('brick1')).toBe(0)
  })
})
