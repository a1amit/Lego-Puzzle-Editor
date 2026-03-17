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
}): number {
  // XP is only awarded on first solve
  if (!params.isFirstSolve) return 0;
  return BASE_XP[params.difficulty];
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
