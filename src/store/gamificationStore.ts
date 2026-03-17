import { create } from 'zustand';

interface CompletionResult {
  xpEarned: number;
  totalXP: number;
  level: number;
  levelUp: boolean;
  streak: number;
}

interface GamificationStore {
  // Pending completion to report
  pendingCompletion: {
    puzzleSlug: string;
    moveCount: number;
    timeSeconds: number;
  } | null;

  // Latest result
  lastResult: CompletionResult | null;
  showLevelUp: boolean;

  // Offline queue
  offlineQueue: Array<{
    puzzleSlug: string;
    moveCount: number;
    timeSeconds: number;
    timestamp: number;
  }>;

  // Actions
  setPendingCompletion: (data: { puzzleSlug: string; moveCount: number; timeSeconds: number }) => void;
  reportCompletion: (getToken: () => Promise<string | null>) => Promise<CompletionResult | null>;
  dismissLevelUp: () => void;
  processOfflineQueue: (getToken: () => Promise<string | null>) => Promise<void>;
}

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  pendingCompletion: null,
  lastResult: null,
  showLevelUp: false,
  offlineQueue: JSON.parse(localStorage.getItem('lego-offline-completions') || '[]'),

  setPendingCompletion: (data) => set({ pendingCompletion: data }),

  reportCompletion: async (getToken) => {
    const { pendingCompletion } = get();
    if (!pendingCompletion) return null;

    const token = await getToken();
    if (!token) {
      // Queue for later
      const queue = [...get().offlineQueue, { ...pendingCompletion, timestamp: Date.now() }];
      localStorage.setItem('lego-offline-completions', JSON.stringify(queue));
      set({ offlineQueue: queue, pendingCompletion: null });
      return null;
    }

    try {
      const res = await fetch(`/api/puzzles/${pendingCompletion.puzzleSlug}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moveCount: pendingCompletion.moveCount,
          timeSeconds: pendingCompletion.timeSeconds,
        }),
      });

      if (!res.ok) {
        set({ pendingCompletion: null });
        return null;
      }

      const result: CompletionResult = await res.json();
      set({
        pendingCompletion: null,
        lastResult: result,
        showLevelUp: result.levelUp,
      });
      return result;
    } catch {
      // Queue for later
      const queue = [...get().offlineQueue, { ...pendingCompletion, timestamp: Date.now() }];
      localStorage.setItem('lego-offline-completions', JSON.stringify(queue));
      set({ offlineQueue: queue, pendingCompletion: null });
      return null;
    }
  },

  dismissLevelUp: () => set({ showLevelUp: false }),

  processOfflineQueue: async (getToken) => {
    const { offlineQueue } = get();
    if (offlineQueue.length === 0) return;

    const token = await getToken();
    if (!token) return;

    const remaining = [];
    for (const item of offlineQueue) {
      try {
        const res = await fetch(`/api/puzzles/${item.puzzleSlug}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            moveCount: item.moveCount,
            timeSeconds: item.timeSeconds,
          }),
        });
        if (!res.ok) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }

    localStorage.setItem('lego-offline-completions', JSON.stringify(remaining));
    set({ offlineQueue: remaining });
  },
}));
