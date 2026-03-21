import { describe, it, expect } from 'vitest'
import {
  xpToReachLevel,
  levelFromXP,
  getLevelTitle,
  getLevelTier,
} from './xpUtils'

describe('xpToReachLevel', () => {
  it('returns 0 XP for level 0', () => {
    expect(xpToReachLevel(0)).toBe(0)
  })

  it('returns 50 XP for level 1', () => {
    // 50 * 1^1.5 = 50
    expect(xpToReachLevel(1)).toBe(50)
  })

  it('returns floor(50 * n^1.5) for arbitrary levels', () => {
    expect(xpToReachLevel(2)).toBe(Math.floor(50 * Math.pow(2, 1.5)))
    expect(xpToReachLevel(4)).toBe(Math.floor(50 * Math.pow(4, 1.5)))
    expect(xpToReachLevel(10)).toBe(Math.floor(50 * Math.pow(10, 1.5)))
    expect(xpToReachLevel(25)).toBe(Math.floor(50 * Math.pow(25, 1.5)))
  })

  it('always returns an integer', () => {
    for (let n = 0; n <= 50; n++) {
      expect(Number.isInteger(xpToReachLevel(n))).toBe(true)
    }
  })

  it('is monotonically increasing', () => {
    for (let n = 1; n <= 50; n++) {
      expect(xpToReachLevel(n)).toBeGreaterThan(xpToReachLevel(n - 1))
    }
  })
})

describe('levelFromXP', () => {
  it('returns 0 for 0 XP', () => {
    expect(levelFromXP(0)).toBe(0)
  })

  it('returns 0 for XP below the level-1 threshold', () => {
    expect(levelFromXP(49)).toBe(0)
  })

  it('returns 1 when XP exactly equals the level-1 threshold', () => {
    expect(levelFromXP(50)).toBe(1)
  })

  it('returns the correct level at exact thresholds', () => {
    // level 2 requires floor(50 * 2^1.5) = 141
    expect(levelFromXP(141)).toBe(2)
    // level 3 requires floor(50 * 3^1.5) = 259
    expect(levelFromXP(259)).toBe(3)
  })

  it('returns the lower level when XP is between thresholds', () => {
    // Between level 1 (50) and level 2 (141)
    expect(levelFromXP(100)).toBe(1)
    // Between level 2 (141) and level 3 (259)
    expect(levelFromXP(200)).toBe(2)
  })

  it('handles large XP values', () => {
    const level = levelFromXP(100000)
    expect(level).toBeGreaterThan(0)
    // Verify the computed level is consistent:
    // xpToReachLevel(level) <= 100000 < xpToReachLevel(level+1)
    expect(xpToReachLevel(level)).toBeLessThanOrEqual(100000)
    expect(xpToReachLevel(level + 1)).toBeGreaterThan(100000)
  })

  it('returns 0 for negative XP', () => {
    expect(levelFromXP(-10)).toBe(0)
  })
})

describe('getLevelTitle', () => {
  it('returns "Brick Beginner" for levels 0-2', () => {
    expect(getLevelTitle(0)).toBe('Brick Beginner')
    expect(getLevelTitle(1)).toBe('Brick Beginner')
    expect(getLevelTitle(2)).toBe('Brick Beginner')
  })

  it('returns "Stud Stacker" for levels 3-4', () => {
    expect(getLevelTitle(3)).toBe('Stud Stacker')
    expect(getLevelTitle(4)).toBe('Stud Stacker')
  })

  it('returns "Builder" for levels 5-7', () => {
    expect(getLevelTitle(5)).toBe('Builder')
    expect(getLevelTitle(6)).toBe('Builder')
    expect(getLevelTitle(7)).toBe('Builder')
  })

  it('returns "Master Builder" for levels 8-11', () => {
    expect(getLevelTitle(8)).toBe('Master Builder')
    expect(getLevelTitle(9)).toBe('Master Builder')
    expect(getLevelTitle(11)).toBe('Master Builder')
  })

  it('returns "Architect" for levels 12-17', () => {
    expect(getLevelTitle(12)).toBe('Architect')
    expect(getLevelTitle(15)).toBe('Architect')
    expect(getLevelTitle(17)).toBe('Architect')
  })

  it('returns "Grand Architect" for levels 18-24', () => {
    expect(getLevelTitle(18)).toBe('Grand Architect')
    expect(getLevelTitle(20)).toBe('Grand Architect')
    expect(getLevelTitle(24)).toBe('Grand Architect')
  })

  it('returns "Brick Legend" for levels 25-34', () => {
    expect(getLevelTitle(25)).toBe('Brick Legend')
    expect(getLevelTitle(30)).toBe('Brick Legend')
    expect(getLevelTitle(34)).toBe('Brick Legend')
  })

  it('returns "Puzzle Grandmaster" for levels 35+', () => {
    expect(getLevelTitle(35)).toBe('Puzzle Grandmaster')
    expect(getLevelTitle(50)).toBe('Puzzle Grandmaster')
    expect(getLevelTitle(100)).toBe('Puzzle Grandmaster')
  })
})

describe('getLevelTier', () => {
  it('returns the full tier object with all expected properties', () => {
    const tier = getLevelTier(0)
    expect(tier).toHaveProperty('title')
    expect(tier).toHaveProperty('subtitle')
    expect(tier).toHaveProperty('gradient')
    expect(tier).toHaveProperty('accent')
    expect(tier).toHaveProperty('textColor')
    expect(tier).toHaveProperty('icon')
    expect(tier).toHaveProperty('minLevel')
  })

  it('returns correct tier for level 0 (Brick Beginner)', () => {
    const tier = getLevelTier(0)
    expect(tier.title).toBe('Brick Beginner')
    expect(tier.minLevel).toBe(0)
    expect(tier.icon).toBe('brick')
  })

  it('returns correct tier for level 5 (Builder)', () => {
    const tier = getLevelTier(5)
    expect(tier.title).toBe('Builder')
    expect(tier.minLevel).toBe(5)
    expect(tier.icon).toBe('house')
  })

  it('returns correct tier for level 35 (Puzzle Grandmaster)', () => {
    const tier = getLevelTier(35)
    expect(tier.title).toBe('Puzzle Grandmaster')
    expect(tier.minLevel).toBe(35)
    expect(tier.icon).toBe('star')
  })

  it('returns the highest matching tier at boundary levels', () => {
    // At level 3, should return Stud Stacker (minLevel: 3), not Brick Beginner (minLevel: 0)
    const tier = getLevelTier(3)
    expect(tier.title).toBe('Stud Stacker')
    expect(tier.minLevel).toBe(3)
  })

  it('returns matching tier object consistently with getLevelTitle', () => {
    for (let level = 0; level <= 50; level++) {
      expect(getLevelTier(level).title).toBe(getLevelTitle(level))
    }
  })
})
