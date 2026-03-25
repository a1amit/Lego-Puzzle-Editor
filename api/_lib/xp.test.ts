import { describe, it, expect } from 'vitest'
import {
  calculateXP,
  xpToReachLevel,
  levelFromXP,
  getLevelTitle,
  PUZZLE_PUBLISH_XP,
  SOLVER_MILESTONE_10_XP,
  SOLVER_MILESTONE_50_XP,
  type Difficulty,
} from './xp'

describe('XP constants', () => {
  it('has correct puzzle publish XP', () => {
    expect(PUZZLE_PUBLISH_XP).toBe(50)
  })

  it('has correct solver milestone XP values', () => {
    expect(SOLVER_MILESTONE_10_XP).toBe(25)
    expect(SOLVER_MILESTONE_50_XP).toBe(75)
  })
})

describe('calculateXP', () => {
  describe('first solve awards', () => {
    it('awards 50 XP for easy difficulty on first solve', () => {
      expect(calculateXP({ difficulty: 'easy', isFirstSolve: true })).toBe(50)
    })

    it('awards 100 XP for medium difficulty on first solve', () => {
      expect(calculateXP({ difficulty: 'medium', isFirstSolve: true })).toBe(100)
    })

    it('awards 200 XP for hard difficulty on first solve', () => {
      expect(calculateXP({ difficulty: 'hard', isFirstSolve: true })).toBe(200)
    })

    it('awards 400 XP for expert difficulty on first solve', () => {
      expect(calculateXP({ difficulty: 'expert', isFirstSolve: true })).toBe(400)
    })
  })

  describe('non-first solve', () => {
    it('awards 0 XP when not first solve, regardless of difficulty', () => {
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert']
      for (const difficulty of difficulties) {
        expect(calculateXP({ difficulty, isFirstSolve: false })).toBe(0)
      }
    })
  })

  describe('XP scaling by difficulty', () => {
    it('awards more XP for harder difficulties', () => {
      const easyXP = calculateXP({ difficulty: 'easy', isFirstSolve: true })
      const mediumXP = calculateXP({ difficulty: 'medium', isFirstSolve: true })
      const hardXP = calculateXP({ difficulty: 'hard', isFirstSolve: true })
      const expertXP = calculateXP({ difficulty: 'expert', isFirstSolve: true })

      expect(mediumXP).toBeGreaterThan(easyXP)
      expect(hardXP).toBeGreaterThan(mediumXP)
      expect(expertXP).toBeGreaterThan(hardXP)
    })

    it('each difficulty doubles the previous', () => {
      const easyXP = calculateXP({ difficulty: 'easy', isFirstSolve: true })
      const mediumXP = calculateXP({ difficulty: 'medium', isFirstSolve: true })
      const hardXP = calculateXP({ difficulty: 'hard', isFirstSolve: true })
      const expertXP = calculateXP({ difficulty: 'expert', isFirstSolve: true })

      expect(mediumXP).toBe(easyXP * 2)
      expect(hardXP).toBe(mediumXP * 2)
      expect(expertXP).toBe(hardXP * 2)
    })
  })
})

describe('xpToReachLevel (API)', () => {
  it('returns 0 for level 0', () => {
    expect(xpToReachLevel(0)).toBe(0)
  })

  it('returns 50 for level 1', () => {
    expect(xpToReachLevel(1)).toBe(50)
  })

  it('uses floor(50 * n^1.5) formula', () => {
    for (const n of [2, 5, 10, 20]) {
      expect(xpToReachLevel(n)).toBe(Math.floor(50 * Math.pow(n, 1.5)))
    }
  })
})

describe('levelFromXP (API)', () => {
  it('returns 0 for 0 XP', () => {
    expect(levelFromXP(0)).toBe(0)
  })

  it('returns 0 for XP just below level 1', () => {
    expect(levelFromXP(49)).toBe(0)
  })

  it('returns 1 at exactly 50 XP', () => {
    expect(levelFromXP(50)).toBe(1)
  })

  it('correctly determines level from XP', () => {
    // After one easy puzzle (50 XP) → level 1
    expect(levelFromXP(50)).toBe(1)
    // After one medium puzzle (100 XP) → level 1 (need 141 for level 2)
    expect(levelFromXP(100)).toBe(1)
    // After one hard puzzle (200 XP) → level 2
    expect(levelFromXP(200)).toBe(2)
    // After one expert puzzle (400 XP) → level 4 (xpToReachLevel(4) = 400 exactly)
    expect(levelFromXP(400)).toBe(4)
  })
})

describe('getLevelTitle (API)', () => {
  it('returns "Brick Beginner" for low levels', () => {
    expect(getLevelTitle(0)).toBe('Brick Beginner')
    expect(getLevelTitle(4)).toBe('Brick Beginner')
  })

  it('returns "Builder" for level 5+', () => {
    expect(getLevelTitle(5)).toBe('Builder')
    expect(getLevelTitle(9)).toBe('Builder')
  })

  it('returns "Master Builder" for level 10+', () => {
    expect(getLevelTitle(10)).toBe('Master Builder')
    expect(getLevelTitle(14)).toBe('Master Builder')
  })

  it('returns "Architect" for level 15+', () => {
    expect(getLevelTitle(15)).toBe('Architect')
    expect(getLevelTitle(19)).toBe('Architect')
  })

  it('returns "Grand Architect" for level 20+', () => {
    expect(getLevelTitle(20)).toBe('Grand Architect')
    expect(getLevelTitle(29)).toBe('Grand Architect')
  })

  it('returns "Brick Legend" for level 30+', () => {
    expect(getLevelTitle(30)).toBe('Brick Legend')
    expect(getLevelTitle(49)).toBe('Brick Legend')
  })

  it('returns "Puzzle Grandmaster" for level 50+', () => {
    expect(getLevelTitle(50)).toBe('Puzzle Grandmaster')
    expect(getLevelTitle(100)).toBe('Puzzle Grandmaster')
  })
})
