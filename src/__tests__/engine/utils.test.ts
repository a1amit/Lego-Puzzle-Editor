import { describe, it, expect } from 'vitest'
import {
  rotateShape,
  getPieceCells,
  normalizeShape,
  getShapeBounds,
  getAllOccupiedCells,
  getOccupiedCellsAtZ,
  isWithinBounds,
  arePieceCellsWithinBounds,
  calculateZLevel,
  findPiecesStackedOnTop,
  wouldOverlapAtZ,
  containsBlockedCells,
  getSlideDistance,
  getValidSlideDestinations,
  generateInstanceId,
} from '@/engine/utils'
import type { PlacedPiece, EngineBoard, Coordinate2D } from '@/engine/types'

// ============================================
// HELPERS
// ============================================

function makePiece(overrides: Partial<PlacedPiece> = {}): PlacedPiece {
  return {
    id: 'p1',
    instanceId: 'p1-inst-0',
    shape: 'unit',
    color: '#ff0000',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    ...overrides,
  }
}

function makeBoard(overrides: Partial<EngineBoard> = {}): EngineBoard {
  return {
    dimensions: { width: 8, height: 4, depth: 1 },
    placedPieces: [],
    blockedCells: [],
    ...overrides,
  }
}

/** Sort coordinate arrays for deterministic comparisons */
function sortCoords(cells: Coordinate2D[]): Coordinate2D[] {
  return [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

// ============================================
// rotateShape
// ============================================

describe('rotateShape', () => {
  describe('unit cell [[0,0]]', () => {
    const unit: Coordinate2D[] = [[0, 0]]

    it('returns [[0,0]] for 0 degrees', () => {
      expect(rotateShape(unit, 0)).toEqual([[0, 0]])
    })

    it('returns [[0,0]] for 90 degrees', () => {
      expect(rotateShape(unit, 90)).toEqual([[0, 0]])
    })

    it('returns [[0,0]] for 180 degrees', () => {
      expect(rotateShape(unit, 180)).toEqual([[0, 0]])
    })

    it('returns [[0,0]] for 270 degrees', () => {
      expect(rotateShape(unit, 270)).toEqual([[0, 0]])
    })
  })

  describe('domino [[0,0],[1,0]]', () => {
    const domino: Coordinate2D[] = [[0, 0], [1, 0]]

    it('returns same cells for 0 degrees', () => {
      expect(sortCoords(rotateShape(domino, 0))).toEqual(sortCoords([[0, 0], [1, 0]]))
    })

    it('rotates to vertical for 90 degrees', () => {
      // [0,0] -> [0,0]; [1,0] -> [0,1] after rotate+normalize
      const result = sortCoords(rotateShape(domino, 90))
      expect(result).toEqual(sortCoords([[0, 0], [0, 1]]))
    })

    it('rotates back to horizontal for 180 degrees', () => {
      const result = sortCoords(rotateShape(domino, 180))
      expect(result).toEqual(sortCoords([[0, 0], [1, 0]]))
    })

    it('rotates to vertical for 270 degrees', () => {
      const result = sortCoords(rotateShape(domino, 270))
      expect(result).toEqual(sortCoords([[0, 0], [0, 1]]))
    })
  })

  describe('T-tetromino [[0,0],[1,0],[2,0],[1,1]]', () => {
    const tShape: Coordinate2D[] = [[0, 0], [1, 0], [2, 0], [1, 1]]

    it('returns same cells for 0 degrees', () => {
      expect(sortCoords(rotateShape(tShape, 0))).toEqual(
        sortCoords([[0, 0], [1, 0], [2, 0], [1, 1]]),
      )
    })

    it('produces correct 90-degree rotation', () => {
      const result = sortCoords(rotateShape(tShape, 90))
      // 4 unique cells, all non-negative
      expect(result.length).toBe(4)
      result.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
      })
    })

    it('produces correct 180-degree rotation', () => {
      const result = sortCoords(rotateShape(tShape, 180))
      expect(result.length).toBe(4)
      result.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
      })
    })

    it('produces correct 270-degree rotation', () => {
      const result = sortCoords(rotateShape(tShape, 270))
      expect(result.length).toBe(4)
      result.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
      })
    })

    it('full 360-degree rotation returns original shape', () => {
      expect(sortCoords(rotateShape(tShape, 360))).toEqual(sortCoords(tShape))
    })
  })

  describe('L-tetromino [[0,0],[0,1],[0,2],[1,2]]', () => {
    const lShape: Coordinate2D[] = [[0, 0], [0, 1], [0, 2], [1, 2]]

    it('returns same cells for 0 degrees', () => {
      expect(sortCoords(rotateShape(lShape, 0))).toEqual(sortCoords(lShape))
    })

    it('all rotations produce non-negative coordinates', () => {
      for (const deg of [90, 180, 270]) {
        const result = rotateShape(lShape, deg)
        result.forEach(([x, y]) => {
          expect(x).toBeGreaterThanOrEqual(0)
          expect(y).toBeGreaterThanOrEqual(0)
        })
      }
    })

    it('full 360 returns original', () => {
      expect(sortCoords(rotateShape(lShape, 360))).toEqual(sortCoords(lShape))
    })
  })

  it('normalizes negative coordinates to positive', () => {
    // After 90-degree rotation of [0,0],[1,0] -> [0,0],[0,-1] -> normalized [0,0],[0,1]
    const result = rotateShape([[0, 0], [1, 0]], 90)
    result.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
    })
  })
})

// ============================================
// getPieceCells
// ============================================

describe('getPieceCells', () => {
  it('returns correct cells for unit shape at origin', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    expect(getPieceCells(piece)).toEqual([[0, 0]])
  })

  it('returns cells offset by piece position', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 3, y: 2, z: 0 } })
    expect(getPieceCells(piece)).toEqual([[3, 2]])
  })

  it('returns correct cells for T-tetromino at origin', () => {
    const piece = makePiece({ shape: 'T-tetromino', position: { x: 0, y: 0, z: 0 } })
    const cells = sortCoords(getPieceCells(piece))
    expect(cells).toEqual(sortCoords([[0, 0], [1, 0], [2, 0], [1, 1]]))
  })

  it('returns correct cells for I-tetromino offset', () => {
    const piece = makePiece({ shape: 'I-tetromino', position: { x: 2, y: 1, z: 0 } })
    const cells = sortCoords(getPieceCells(piece))
    expect(cells).toEqual(sortCoords([[2, 1], [3, 1], [4, 1], [5, 1]]))
  })

  it('returns correct cells for O-tetromino', () => {
    const piece = makePiece({ shape: 'O-tetromino', position: { x: 1, y: 1, z: 0 } })
    const cells = sortCoords(getPieceCells(piece))
    expect(cells).toEqual(sortCoords([[1, 1], [2, 1], [1, 2], [2, 2]]))
  })

  it('applies rotation correctly', () => {
    // domino at (0,0) rotated 90 should be vertical
    const piece = makePiece({ shape: 'domino', position: { x: 1, y: 1, z: 0 }, rotation: 90 })
    const cells = sortCoords(getPieceCells(piece))
    expect(cells).toEqual(sortCoords([[1, 1], [1, 2]]))
  })

  it('returns empty array for unknown shape', () => {
    const piece = makePiece({ shape: 'nonexistent-shape' })
    expect(getPieceCells(piece)).toEqual([])
  })
})

// ============================================
// normalizeShape
// ============================================

describe('normalizeShape', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeShape([])).toEqual([])
  })

  it('returns same cells when already normalized', () => {
    const cells: Coordinate2D[] = [[0, 0], [1, 0], [2, 0]]
    expect(normalizeShape(cells)).toEqual([[0, 0], [1, 0], [2, 0]])
  })

  it('shifts cells to start from (0,0)', () => {
    const cells: Coordinate2D[] = [[3, 5], [4, 5], [5, 5]]
    expect(normalizeShape(cells)).toEqual([[0, 0], [1, 0], [2, 0]])
  })

  it('handles negative coordinates', () => {
    const cells: Coordinate2D[] = [[-2, -3], [-1, -3], [-2, -2]]
    const result = sortCoords(normalizeShape(cells))
    expect(result).toEqual(sortCoords([[0, 0], [1, 0], [0, 1]]))
  })

  it('handles mixed positive and negative coordinates', () => {
    const cells: Coordinate2D[] = [[-1, 1], [0, 1], [1, 1]]
    expect(normalizeShape(cells)).toEqual([[0, 0], [1, 0], [2, 0]])
  })
})

// ============================================
// getShapeBounds
// ============================================

describe('getShapeBounds', () => {
  it('returns {width: 0, height: 0} for empty cells', () => {
    expect(getShapeBounds([])).toEqual({ width: 0, height: 0 })
  })

  it('returns {width: 1, height: 1} for single cell', () => {
    expect(getShapeBounds([[0, 0]])).toEqual({ width: 1, height: 1 })
  })

  it('returns correct bounds for horizontal line', () => {
    const cells: Coordinate2D[] = [[0, 0], [1, 0], [2, 0], [3, 0]]
    expect(getShapeBounds(cells)).toEqual({ width: 4, height: 1 })
  })

  it('returns correct bounds for L-shape', () => {
    const cells: Coordinate2D[] = [[0, 0], [0, 1], [0, 2], [1, 2]]
    expect(getShapeBounds(cells)).toEqual({ width: 2, height: 3 })
  })

  it('returns correct bounds for T-tetromino', () => {
    const cells: Coordinate2D[] = [[0, 0], [1, 0], [2, 0], [1, 1]]
    expect(getShapeBounds(cells)).toEqual({ width: 3, height: 2 })
  })
})

// ============================================
// getAllOccupiedCells
// ============================================

describe('getAllOccupiedCells', () => {
  it('returns empty map for empty board', () => {
    const board = makeBoard()
    const result = getAllOccupiedCells(board)
    expect(result.size).toBe(0)
  })

  it('returns correct cells for single piece', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 2, y: 3, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    const result = getAllOccupiedCells(board)

    expect(result.size).toBe(1)
    expect(result.has('2,3')).toBe(true)
    expect(result.get('2,3')).toEqual([piece])
  })

  it('returns correct cells for multiple pieces', () => {
    const piece1 = makePiece({ id: 'p1', instanceId: 'p1-0', shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const piece2 = makePiece({ id: 'p2', instanceId: 'p2-0', shape: 'unit', position: { x: 1, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece1, piece2] })
    const result = getAllOccupiedCells(board)

    expect(result.size).toBe(2)
    expect(result.has('0,0')).toBe(true)
    expect(result.has('1,0')).toBe(true)
  })

  it('groups pieces sharing same x,y at different z-levels', () => {
    const piece1 = makePiece({ id: 'p1', instanceId: 'p1-0', shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const piece2 = makePiece({ id: 'p2', instanceId: 'p2-0', shape: 'unit', position: { x: 0, y: 0, z: 1 } })
    const board = makeBoard({ placedPieces: [piece1, piece2] })
    const result = getAllOccupiedCells(board)

    expect(result.size).toBe(1)
    expect(result.get('0,0')!.length).toBe(2)
  })
})

// ============================================
// getOccupiedCellsAtZ
// ============================================

describe('getOccupiedCellsAtZ', () => {
  it('returns empty map when no pieces at given z-level', () => {
    const piece = makePiece({ position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    const result = getOccupiedCellsAtZ(board, 1)
    expect(result.size).toBe(0)
  })

  it('returns only pieces at the specified z-level', () => {
    const pieceZ0 = makePiece({ id: 'p1', instanceId: 'p1-0', shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const pieceZ1 = makePiece({ id: 'p2', instanceId: 'p2-0', shape: 'unit', position: { x: 0, y: 0, z: 1 } })
    const board = makeBoard({ placedPieces: [pieceZ0, pieceZ1] })

    const resultZ0 = getOccupiedCellsAtZ(board, 0)
    expect(resultZ0.size).toBe(1)
    expect(resultZ0.get('0,0')![0].instanceId).toBe('p1-0')

    const resultZ1 = getOccupiedCellsAtZ(board, 1)
    expect(resultZ1.size).toBe(1)
    expect(resultZ1.get('0,0')![0].instanceId).toBe('p2-0')
  })

  it('returns multi-cell shapes at the correct z', () => {
    const piece = makePiece({ shape: 'domino', position: { x: 1, y: 2, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })

    const result = getOccupiedCellsAtZ(board, 0)
    expect(result.size).toBe(2)
    expect(result.has('1,2')).toBe(true)
    expect(result.has('2,2')).toBe(true)
  })
})

// ============================================
// isWithinBounds
// ============================================

describe('isWithinBounds', () => {
  const dims = { width: 8, height: 4, depth: 1 }

  it('returns true for cell inside the board', () => {
    expect(isWithinBounds(3, 2, dims)).toBe(true)
  })

  it('returns true for top-left corner (0,0)', () => {
    expect(isWithinBounds(0, 0, dims)).toBe(true)
  })

  it('returns true for bottom-right corner (width-1, height-1)', () => {
    expect(isWithinBounds(7, 3, dims)).toBe(true)
  })

  it('returns false for x < 0', () => {
    expect(isWithinBounds(-1, 0, dims)).toBe(false)
  })

  it('returns false for y < 0', () => {
    expect(isWithinBounds(0, -1, dims)).toBe(false)
  })

  it('returns false for x >= width', () => {
    expect(isWithinBounds(8, 0, dims)).toBe(false)
  })

  it('returns false for y >= height', () => {
    expect(isWithinBounds(0, 4, dims)).toBe(false)
  })
})

// ============================================
// arePieceCellsWithinBounds
// ============================================

describe('arePieceCellsWithinBounds', () => {
  const dims = { width: 4, height: 4, depth: 1 }

  it('returns true when all cells are within bounds', () => {
    const cells: Coordinate2D[] = [[0, 0], [1, 0], [2, 0]]
    expect(arePieceCellsWithinBounds(cells, dims)).toBe(true)
  })

  it('returns false when some cells are outside bounds', () => {
    const cells: Coordinate2D[] = [[0, 0], [1, 0], [4, 0]]
    expect(arePieceCellsWithinBounds(cells, dims)).toBe(false)
  })

  it('returns false when a cell has negative x', () => {
    const cells: Coordinate2D[] = [[-1, 0], [0, 0]]
    expect(arePieceCellsWithinBounds(cells, dims)).toBe(false)
  })

  it('returns true for empty cells', () => {
    expect(arePieceCellsWithinBounds([], dims)).toBe(true)
  })
})

// ============================================
// calculateZLevel
// ============================================

describe('calculateZLevel', () => {
  it('returns 0 for empty board', () => {
    const board = makeBoard()
    expect(calculateZLevel(board, [[0, 0]])).toBe(0)
  })

  it('returns 1 when one piece exists below at same x,y', () => {
    const piece = makePiece({ position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    expect(calculateZLevel(board, [[0, 0]])).toBe(1)
  })

  it('returns 0 when no pieces overlap the target cells', () => {
    const piece = makePiece({ position: { x: 5, y: 5, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    expect(calculateZLevel(board, [[0, 0]])).toBe(0)
  })

  it('returns correct level for multiple stacked pieces', () => {
    const piece0 = makePiece({ id: 'p0', instanceId: 'p0-0', position: { x: 0, y: 0, z: 0 } })
    const piece1 = makePiece({ id: 'p1', instanceId: 'p1-0', position: { x: 0, y: 0, z: 1 } })
    const board = makeBoard({ placedPieces: [piece0, piece1] })
    expect(calculateZLevel(board, [[0, 0]])).toBe(2)
  })

  it('excludes piece with excludeInstanceId', () => {
    const piece = makePiece({ instanceId: 'exclude-me', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    expect(calculateZLevel(board, [[0, 0]], 'exclude-me')).toBe(0)
  })

  it('considers only the highest z among overlapping pieces', () => {
    const piece0 = makePiece({ id: 'a', instanceId: 'a-0', shape: 'domino', position: { x: 0, y: 0, z: 0 } })
    const piece1 = makePiece({ id: 'b', instanceId: 'b-0', shape: 'unit', position: { x: 0, y: 0, z: 2 } })
    const board = makeBoard({ placedPieces: [piece0, piece1] })
    // domino covers [0,0],[1,0]; unit covers [0,0]; querying [0,0] => max z=2 => return 3
    expect(calculateZLevel(board, [[0, 0]])).toBe(3)
    // querying [1,0] => only domino at z=0 => return 1
    expect(calculateZLevel(board, [[1, 0]])).toBe(1)
  })
})

// ============================================
// findPiecesStackedOnTop
// ============================================

describe('findPiecesStackedOnTop', () => {
  it('returns empty set when no pieces are above', () => {
    const piece = makePiece({ position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    const result = findPiecesStackedOnTop(board, piece)
    expect(result.size).toBe(0)
  })

  it('finds one piece directly above', () => {
    const bottom = makePiece({ id: 'bottom', instanceId: 'bottom-0', shape: 'domino', position: { x: 0, y: 0, z: 0 } })
    const top = makePiece({ id: 'top', instanceId: 'top-0', shape: 'unit', position: { x: 0, y: 0, z: 1 } })
    const board = makeBoard({ placedPieces: [bottom, top] })

    const result = findPiecesStackedOnTop(board, bottom)
    expect(result.size).toBe(1)
    expect(result.has('top-0')).toBe(true)
  })

  it('finds chain of stacked pieces', () => {
    const bottom = makePiece({ id: 'a', instanceId: 'a-0', shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const middle = makePiece({ id: 'b', instanceId: 'b-0', shape: 'unit', position: { x: 0, y: 0, z: 1 } })
    const top = makePiece({ id: 'c', instanceId: 'c-0', shape: 'unit', position: { x: 0, y: 0, z: 2 } })
    const board = makeBoard({ placedPieces: [bottom, middle, top] })

    const result = findPiecesStackedOnTop(board, bottom)
    expect(result.size).toBe(2)
    expect(result.has('b-0')).toBe(true)
    expect(result.has('c-0')).toBe(true)
  })

  it('does not include pieces that do not overlap x,y with target', () => {
    const bottom = makePiece({ id: 'a', instanceId: 'a-0', shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const unrelated = makePiece({ id: 'b', instanceId: 'b-0', shape: 'unit', position: { x: 5, y: 5, z: 1 } })
    const board = makeBoard({ placedPieces: [bottom, unrelated] })

    const result = findPiecesStackedOnTop(board, bottom)
    expect(result.size).toBe(0)
  })

  it('does not include pieces at or below the target z', () => {
    const piece0 = makePiece({ id: 'a', instanceId: 'a-0', shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const piece1 = makePiece({ id: 'b', instanceId: 'b-0', shape: 'unit', position: { x: 0, y: 0, z: 1 } })
    const board = makeBoard({ placedPieces: [piece0, piece1] })

    // Looking from piece1's perspective, piece0 is below - should not be found
    const result = findPiecesStackedOnTop(board, piece1)
    expect(result.size).toBe(0)
  })
})

// ============================================
// wouldOverlapAtZ
// ============================================

describe('wouldOverlapAtZ', () => {
  it('returns false when no pieces at that z', () => {
    const board = makeBoard()
    expect(wouldOverlapAtZ(board, [[0, 0]], 0)).toBe(false)
  })

  it('returns true when overlap exists', () => {
    const piece = makePiece({ position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    expect(wouldOverlapAtZ(board, [[0, 0]], 0)).toBe(true)
  })

  it('returns false when cells do not overlap existing pieces', () => {
    const piece = makePiece({ position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    expect(wouldOverlapAtZ(board, [[1, 1]], 0)).toBe(false)
  })

  it('returns false at a different z-level', () => {
    const piece = makePiece({ position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    expect(wouldOverlapAtZ(board, [[0, 0]], 1)).toBe(false)
  })

  it('excludes piece with excludeInstanceId', () => {
    const piece = makePiece({ instanceId: 'exclude-me', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece] })
    expect(wouldOverlapAtZ(board, [[0, 0]], 0, 'exclude-me')).toBe(false)
  })

  it('still detects overlap when excluded piece is not the only one', () => {
    const piece1 = makePiece({ id: 'a', instanceId: 'a-0', position: { x: 0, y: 0, z: 0 } })
    const piece2 = makePiece({ id: 'b', instanceId: 'b-0', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ placedPieces: [piece1, piece2] })
    expect(wouldOverlapAtZ(board, [[0, 0]], 0, 'a-0')).toBe(true)
  })
})

// ============================================
// containsBlockedCells
// ============================================

describe('containsBlockedCells', () => {
  it('returns false when no blocked cells are hit', () => {
    const cells: Coordinate2D[] = [[0, 0], [1, 0]]
    const blocked: Coordinate2D[] = [[5, 5], [6, 6]]
    expect(containsBlockedCells(cells, blocked)).toBe(false)
  })

  it('returns true when a blocked cell is hit', () => {
    const cells: Coordinate2D[] = [[0, 0], [1, 0]]
    const blocked: Coordinate2D[] = [[1, 0], [2, 2]]
    expect(containsBlockedCells(cells, blocked)).toBe(true)
  })

  it('returns false when blocked cells list is empty', () => {
    const cells: Coordinate2D[] = [[0, 0]]
    expect(containsBlockedCells(cells, [])).toBe(false)
  })

  it('returns false when cells list is empty', () => {
    const blocked: Coordinate2D[] = [[0, 0]]
    expect(containsBlockedCells([], blocked)).toBe(false)
  })
})

// ============================================
// getSlideDistance
// ============================================

describe('getSlideDistance', () => {
  it('returns 0 when piece is against the right wall', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 3, y: 0, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece] })
    expect(getSlideDistance(board, piece, 'right')).toBe(0)
  })

  it('returns 0 when piece is against the left wall', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece] })
    expect(getSlideDistance(board, piece, 'left')).toBe(0)
  })

  it('returns 0 when piece is against the top wall', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece] })
    expect(getSlideDistance(board, piece, 'up')).toBe(0)
  })

  it('returns 0 when piece is against the bottom wall', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 0, y: 3, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece] })
    expect(getSlideDistance(board, piece, 'down')).toBe(0)
  })

  it('returns full distance to right wall on empty board', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece] })
    expect(getSlideDistance(board, piece, 'right')).toBe(3)
  })

  it('returns full distance to bottom wall on empty board', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece] })
    expect(getSlideDistance(board, piece, 'down')).toBe(3)
  })

  it('is blocked by another piece', () => {
    const piece = makePiece({ id: 'a', instanceId: 'a-0', shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const blocker = makePiece({ id: 'b', instanceId: 'b-0', shape: 'unit', position: { x: 2, y: 0, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece, blocker] })
    expect(getSlideDistance(board, piece, 'right')).toBe(1)
  })

  it('is blocked by a blocked cell', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({
      dimensions: { width: 4, height: 4, depth: 1 },
      placedPieces: [piece],
      blockedCells: [[2, 0]],
    })
    expect(getSlideDistance(board, piece, 'right')).toBe(1)
  })

  it('handles multi-cell pieces correctly', () => {
    // domino at (0,0) occupies [0,0],[1,0]
    const piece = makePiece({ shape: 'domino', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece] })
    // Can slide right by 2 (to [2,0],[3,0])
    expect(getSlideDistance(board, piece, 'right')).toBe(2)
  })
})

// ============================================
// getValidSlideDestinations
// ============================================

describe('getValidSlideDestinations', () => {
  it('returns all valid destinations for unit piece in center of 4x4 board', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 2, y: 2, z: 0 } })
    const board = makeBoard({ dimensions: { width: 4, height: 4, depth: 1 }, placedPieces: [piece] })

    const destinations = getValidSlideDestinations(board, piece)

    // up: y=2 can go to y=1, y=0 (2 positions)
    // down: y=2 can go to y=3 (1 position)
    // left: x=2 can go to x=1, x=0 (2 positions)
    // right: x=2 can go to x=3 (1 position)
    expect(destinations.length).toBe(6)
  })

  it('returns empty array when piece is completely boxed in', () => {
    // unit at (1,1) surrounded by pieces on all sides
    const piece = makePiece({ id: 'center', instanceId: 'center-0', shape: 'unit', position: { x: 1, y: 1, z: 0 } })
    const left = makePiece({ id: 'l', instanceId: 'l-0', shape: 'unit', position: { x: 0, y: 1, z: 0 } })
    const right = makePiece({ id: 'r', instanceId: 'r-0', shape: 'unit', position: { x: 2, y: 1, z: 0 } })
    const up = makePiece({ id: 'u', instanceId: 'u-0', shape: 'unit', position: { x: 1, y: 0, z: 0 } })
    const down = makePiece({ id: 'd', instanceId: 'd-0', shape: 'unit', position: { x: 1, y: 2, z: 0 } })
    const board = makeBoard({
      dimensions: { width: 3, height: 3, depth: 1 },
      placedPieces: [piece, left, right, up, down],
    })

    const destinations = getValidSlideDestinations(board, piece)
    expect(destinations.length).toBe(0)
  })

  it('returns destinations combining all 4 directions', () => {
    const piece = makePiece({ shape: 'unit', position: { x: 0, y: 0, z: 0 } })
    const board = makeBoard({ dimensions: { width: 3, height: 3, depth: 1 }, placedPieces: [piece] })

    const destinations = sortCoords(getValidSlideDestinations(board, piece))
    // right: (1,0), (2,0)
    // down: (0,1), (0,2)
    // up: 0, left: 0
    expect(destinations).toEqual(sortCoords([[1, 0], [2, 0], [0, 1], [0, 2]]))
  })
})

// ============================================
// generateInstanceId
// ============================================

describe('generateInstanceId', () => {
  it('returns a string containing the pieceId', () => {
    const id = generateInstanceId('myPiece')
    expect(id).toContain('myPiece')
  })

  it('returns unique values on successive calls', () => {
    const id1 = generateInstanceId('piece')
    const id2 = generateInstanceId('piece')
    expect(id1).not.toBe(id2)
  })

  it('returns a string', () => {
    expect(typeof generateInstanceId('test')).toBe('string')
  })

  it('contains a dash separator', () => {
    const id = generateInstanceId('brick')
    expect(id.startsWith('brick-')).toBe(true)
  })
})
