import { describe, it, expect } from 'vitest'

/**
 * Calculates the number of UTC days between two timestamps.
 * This is the core logic used for streak calculations.
 */
function daysSinceUTC(previousTimestamp: number, currentTimestamp: number): number {
  const msPerDay = 86_400_000
  const prevDay = Math.floor(previousTimestamp / msPerDay)
  const currDay = Math.floor(currentTimestamp / msPerDay)
  return currDay - prevDay
}

/**
 * Determines the new streak value based on the days elapsed
 * since the last activity.
 */
function computeStreak(currentStreak: number, daysSince: number): number {
  if (daysSince === 0) {
    // Same UTC day — streak stays unchanged
    return currentStreak
  }
  if (daysSince === 1) {
    // Consecutive UTC day — streak increments
    return currentStreak + 1
  }
  // Gap of 2+ days — streak resets
  return 1
}

describe('daysSinceUTC', () => {
  it('returns 0 when both timestamps are on the same UTC day', () => {
    // Both at 2024-01-15, different times
    const t1 = Date.UTC(2024, 0, 15, 8, 0, 0)  // 8:00 AM UTC
    const t2 = Date.UTC(2024, 0, 15, 23, 59, 0) // 11:59 PM UTC
    expect(daysSinceUTC(t1, t2)).toBe(0)
  })

  it('returns 1 for consecutive UTC days', () => {
    const t1 = Date.UTC(2024, 0, 15, 12, 0, 0) // Jan 15 noon
    const t2 = Date.UTC(2024, 0, 16, 12, 0, 0) // Jan 16 noon
    expect(daysSinceUTC(t1, t2)).toBe(1)
  })

  it('returns 2+ for gaps of multiple days', () => {
    const t1 = Date.UTC(2024, 0, 15, 12, 0, 0)
    const t2 = Date.UTC(2024, 0, 17, 12, 0, 0) // 2 days later
    expect(daysSinceUTC(t1, t2)).toBe(2)

    const t3 = Date.UTC(2024, 0, 22, 12, 0, 0) // 7 days later
    expect(daysSinceUTC(t1, t3)).toBe(7)
  })

  it('handles cross-midnight scenario (11pm to 1am next day = 1 day)', () => {
    const t1 = Date.UTC(2024, 0, 15, 23, 0, 0) // 11:00 PM Jan 15
    const t2 = Date.UTC(2024, 0, 16, 1, 0, 0)   // 1:00 AM Jan 16
    expect(daysSinceUTC(t1, t2)).toBe(1)
  })

  it('handles cross-midnight same-day scenario (11pm to 11:30pm = 0 days)', () => {
    const t1 = Date.UTC(2024, 0, 15, 23, 0, 0)  // 11:00 PM
    const t2 = Date.UTC(2024, 0, 15, 23, 30, 0)  // 11:30 PM
    expect(daysSinceUTC(t1, t2)).toBe(0)
  })

  it('handles early morning to late night same day (12:01 AM to 11:59 PM = 0 days)', () => {
    const t1 = Date.UTC(2024, 0, 15, 0, 1, 0)   // 12:01 AM
    const t2 = Date.UTC(2024, 0, 15, 23, 59, 0)  // 11:59 PM
    expect(daysSinceUTC(t1, t2)).toBe(0)
  })

  it('handles month boundaries correctly', () => {
    const t1 = Date.UTC(2024, 0, 31, 23, 0, 0) // Jan 31 11:00 PM
    const t2 = Date.UTC(2024, 1, 1, 1, 0, 0)    // Feb 1 1:00 AM
    expect(daysSinceUTC(t1, t2)).toBe(1)
  })

  it('handles year boundaries correctly', () => {
    const t1 = Date.UTC(2024, 11, 31, 23, 0, 0) // Dec 31 11:00 PM
    const t2 = Date.UTC(2025, 0, 1, 1, 0, 0)     // Jan 1 1:00 AM
    expect(daysSinceUTC(t1, t2)).toBe(1)
  })

  it('returns 0 for identical timestamps', () => {
    const t = Date.UTC(2024, 5, 15, 12, 0, 0)
    expect(daysSinceUTC(t, t)).toBe(0)
  })
})

describe('computeStreak', () => {
  describe('same UTC day (daysSince === 0)', () => {
    it('keeps streak unchanged when solving again same day', () => {
      expect(computeStreak(1, 0)).toBe(1)
      expect(computeStreak(5, 0)).toBe(5)
      expect(computeStreak(100, 0)).toBe(100)
    })
  })

  describe('consecutive UTC days (daysSince === 1)', () => {
    it('increments streak by 1', () => {
      expect(computeStreak(1, 1)).toBe(2)
      expect(computeStreak(5, 1)).toBe(6)
      expect(computeStreak(99, 1)).toBe(100)
    })
  })

  describe('gap of 2+ days (daysSince > 1)', () => {
    it('resets streak to 1', () => {
      expect(computeStreak(5, 2)).toBe(1)
      expect(computeStreak(100, 3)).toBe(1)
      expect(computeStreak(50, 7)).toBe(1)
      expect(computeStreak(1, 30)).toBe(1)
    })
  })
})

describe('streak integration scenarios', () => {
  it('builds a 3-day streak from consecutive activity', () => {
    const day1 = Date.UTC(2024, 0, 15, 10, 0, 0)
    const day2 = Date.UTC(2024, 0, 16, 14, 0, 0)
    const day3 = Date.UTC(2024, 0, 17, 8, 0, 0)

    let streak = 1 // First activity starts at streak 1

    // Day 2 activity
    const days1to2 = daysSinceUTC(day1, day2)
    expect(days1to2).toBe(1)
    streak = computeStreak(streak, days1to2)
    expect(streak).toBe(2)

    // Day 3 activity
    const days2to3 = daysSinceUTC(day2, day3)
    expect(days2to3).toBe(1)
    streak = computeStreak(streak, days2to3)
    expect(streak).toBe(3)
  })

  it('does not change streak for multiple solves on the same day', () => {
    const solve1 = Date.UTC(2024, 0, 15, 10, 0, 0)
    const solve2 = Date.UTC(2024, 0, 15, 14, 0, 0)
    const solve3 = Date.UTC(2024, 0, 15, 20, 0, 0)

    let streak = 3 // Assume existing 3-day streak

    streak = computeStreak(streak, daysSinceUTC(solve1, solve2))
    expect(streak).toBe(3)

    streak = computeStreak(streak, daysSinceUTC(solve2, solve3))
    expect(streak).toBe(3)
  })

  it('resets streak after a 2-day gap, then rebuilds', () => {
    const day1 = Date.UTC(2024, 0, 15, 10, 0, 0)
    const day4 = Date.UTC(2024, 0, 18, 10, 0, 0) // 3 days later
    const day5 = Date.UTC(2024, 0, 19, 10, 0, 0)

    let streak = 5

    // Gap of 3 days — streak resets
    const gap = daysSinceUTC(day1, day4)
    expect(gap).toBe(3)
    streak = computeStreak(streak, gap)
    expect(streak).toBe(1)

    // Next consecutive day — streak increments
    streak = computeStreak(streak, daysSinceUTC(day4, day5))
    expect(streak).toBe(2)
  })
})
