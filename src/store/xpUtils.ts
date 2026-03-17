// Client-side XP utilities (mirrors api/_lib/xp.ts)

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

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

export interface LevelTier {
  title: string;
  /** Short flavor text shown on the card */
  subtitle: string;
  /** Gradient CSS classes for the card background */
  gradient: string;
  /** Accent color for glow / border */
  accent: string;
  /** Text color class */
  textColor: string;
  /** SVG icon id (rendered inline in the card) */
  icon: 'brick' | 'wall' | 'house' | 'castle' | 'tower' | 'crown' | 'star';
  /** Minimum level for this tier */
  minLevel: number;
}

const TIERS: LevelTier[] = [
  {
    minLevel: 0,
    title: 'Brick Beginner',
    subtitle: 'Every master was once a beginner',
    gradient: 'from-slate-700 to-slate-800',
    accent: '#94a3b8',
    textColor: 'text-slate-300',
    icon: 'brick',
  },
  {
    minLevel: 3,
    title: 'Stud Stacker',
    subtitle: 'Building a solid foundation',
    gradient: 'from-emerald-800 to-emerald-950',
    accent: '#34d399',
    textColor: 'text-emerald-300',
    icon: 'wall',
  },
  {
    minLevel: 5,
    title: 'Builder',
    subtitle: 'Bricks bend to your will',
    gradient: 'from-blue-800 to-blue-950',
    accent: '#60a5fa',
    textColor: 'text-blue-300',
    icon: 'house',
  },
  {
    minLevel: 8,
    title: 'Master Builder',
    subtitle: 'Everything is awesome',
    gradient: 'from-violet-800 to-violet-950',
    accent: '#a78bfa',
    textColor: 'text-violet-300',
    icon: 'castle',
  },
  {
    minLevel: 12,
    title: 'Architect',
    subtitle: 'You see the blueprint in every puzzle',
    gradient: 'from-amber-700 to-amber-900',
    accent: '#fbbf24',
    textColor: 'text-amber-300',
    icon: 'tower',
  },
  {
    minLevel: 18,
    title: 'Grand Architect',
    subtitle: 'Puzzles tremble at your approach',
    gradient: 'from-orange-700 to-red-900',
    accent: '#f97316',
    textColor: 'text-orange-300',
    icon: 'crown',
  },
  {
    minLevel: 25,
    title: 'Brick Legend',
    subtitle: 'Your name echoes through the halls',
    gradient: 'from-rose-700 to-rose-950',
    accent: '#fb7185',
    textColor: 'text-rose-300',
    icon: 'crown',
  },
  {
    minLevel: 35,
    title: 'Puzzle Grandmaster',
    subtitle: 'The bricks choose you',
    gradient: 'from-yellow-500 via-amber-500 to-orange-600',
    accent: '#facc15',
    textColor: 'text-yellow-200',
    icon: 'star',
  },
];

export function getLevelTier(level: number): LevelTier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (level >= TIERS[i].minLevel) return TIERS[i];
  }
  return TIERS[0];
}

export function getLevelTitle(level: number): string {
  return getLevelTier(level).title;
}

export function getAllTiers(): LevelTier[] {
  return TIERS;
}
