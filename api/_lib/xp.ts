export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const BASE_XP: Record<Difficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 200,
  expert: 400,
};

export function calculateXP(params: {
  difficulty: Difficulty;
  isFirstSolve: boolean;
  moveCount: number;
  parMoves?: number;
  streakDays: number;
}): number {
  const { difficulty, isFirstSolve, moveCount, parMoves, streakDays } = params;

  const base = BASE_XP[difficulty];
  const firstSolveMultiplier = isFirstSolve ? 2.0 : 1.0;

  // Efficiency bonus: 1.0–1.5 based on moves vs par
  let efficiencyBonus = 1.0;
  if (parMoves && parMoves > 0 && moveCount <= parMoves) {
    efficiencyBonus = 1.0 + 0.5 * (1 - moveCount / parMoves);
  }

  // Streak multiplier: 1.0 + min(streakDays, 5) * 0.05
  const streakMultiplier = 1.0 + Math.min(streakDays, 5) * 0.05;

  return Math.floor(base * firstSolveMultiplier * efficiencyBonus * streakMultiplier);
}

export function xpToReachLevel(n: number): number {
  return Math.floor(50 * Math.pow(n, 1.5));
}

export function levelFromXP(xp: number): number {
  let level = 0;
  while (xpToReachLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

export function getLevelTitle(level: number): string {
  if (level >= 50) return 'Puzzle Grandmaster';
  if (level >= 30) return 'Brick Legend';
  if (level >= 20) return 'Grand Architect';
  if (level >= 15) return 'Architect';
  if (level >= 10) return 'Master Builder';
  if (level >= 5) return 'Builder';
  return 'Brick Beginner';
}

export const PUZZLE_PUBLISH_XP = 50;
export const SOLVER_MILESTONE_10_XP = 25;
export const SOLVER_MILESTONE_50_XP = 75;
