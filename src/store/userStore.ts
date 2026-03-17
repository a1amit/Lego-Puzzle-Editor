import { create } from 'zustand';
import { getLevelTitle, xpToReachLevel, levelFromXP } from './xpUtils';

export interface UserProfile {
  _id: string;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  xp: number;
  level: number;
  puzzlesCreated: number;
  puzzlesCompleted: number;
  streakDays: number;
  lastSolveDate: string | null;
}

interface UserStore {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  levelTitle: string;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  levelProgress: number;

  // Actions
  fetchProfile: (getToken: () => Promise<string | null>, clerkInfo?: { displayName?: string; avatarUrl?: string }) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addXP: (amount: number) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  levelTitle: 'Brick Beginner',
  xpForCurrentLevel: 0,
  xpForNextLevel: 100,
  levelProgress: 0,

  fetchProfile: async (getToken, clerkInfo) => {
    set({ isLoading: true, error: null });
    try {
      const token = await getToken();
      if (!token) {
        set({ isLoading: false, profile: null });
        return;
      }

      const params = new URLSearchParams();
      if (clerkInfo?.displayName) params.set('displayName', clerkInfo.displayName);
      if (clerkInfo?.avatarUrl) params.set('avatarUrl', clerkInfo.avatarUrl);
      const qs = params.toString();

      const res = await fetch(`/api/users/me${qs ? '?' + qs : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch profile');
      const { user } = await res.json();

      const level = user.level;
      const currentLevelXP = xpToReachLevel(level);
      const nextLevelXP = xpToReachLevel(level + 1);

      set({
        profile: user,
        isLoading: false,
        levelTitle: getLevelTitle(level),
        xpForCurrentLevel: currentLevelXP,
        xpForNextLevel: nextLevelXP,
        levelProgress: nextLevelXP > currentLevelXP
          ? (user.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)
          : 0,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load profile',
      });
    }
  },

  updateProfile: (updates) => {
    const { profile } = get();
    if (!profile) return;
    set({ profile: { ...profile, ...updates } });
  },

  addXP: (amount) => {
    const { profile } = get();
    if (!profile) return;

    const newXP = profile.xp + amount;
    const newLevel = levelFromXP(newXP);
    const currentLevelXP = xpToReachLevel(newLevel);
    const nextLevelXP = xpToReachLevel(newLevel + 1);

    set({
      profile: { ...profile, xp: newXP, level: newLevel },
      levelTitle: getLevelTitle(newLevel),
      xpForCurrentLevel: currentLevelXP,
      xpForNextLevel: nextLevelXP,
      levelProgress: nextLevelXP > currentLevelXP
        ? (newXP - currentLevelXP) / (nextLevelXP - currentLevelXP)
        : 0,
    });
  },

  clearProfile: () => {
    set({ profile: null, isLoading: false, error: null });
  },
}));
