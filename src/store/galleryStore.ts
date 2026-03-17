import { create } from 'zustand';

export interface GalleryPuzzle {
  _id: string;
  slug: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  tags: string[];
  isLegacy: boolean;
  isFeatured: boolean;
  authorUsername: string;
  stats: {
    plays: number;
    completions: number;
    uniquePlayers: number;
    likes: number;
    completionRate: number;
  };
  definition: {
    title: string;
    description?: string;
    viewMode: '2D' | '3D';
    board: { dimensions: { width: number; height: number; depth: number } };
  };
  createdAt: string;
  publishedAt: string | null;
}

export type SortOption = 'newest' | 'popular' | 'difficulty' | 'likes';

interface GalleryStore {
  // Filters
  search: string;
  category: string | null;
  difficulty: string | null;
  sort: SortOption;

  // Data
  puzzles: GalleryPuzzle[];
  featuredPuzzles: GalleryPuzzle[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;

  // Actions
  setSearch: (search: string) => void;
  setCategory: (category: string | null) => void;
  setDifficulty: (difficulty: string | null) => void;
  setSort: (sort: SortOption) => void;
  fetchPuzzles: () => Promise<void>;
  fetchFeatured: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  search: '',
  category: null,
  difficulty: null,
  sort: 'newest',

  puzzles: [],
  featuredPuzzles: [],
  isLoading: false,
  error: null,
  page: 1,
  totalPages: 1,

  setSearch: (search) => set({ search, page: 1 }),
  setCategory: (category) => set({ category, page: 1 }),
  setDifficulty: (difficulty) => set({ difficulty, page: 1 }),
  setSort: (sort) => set({ sort, page: 1 }),

  fetchPuzzles: async () => {
    const { search, category, difficulty, sort, page } = get();
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (difficulty) params.set('difficulty', difficulty);
      params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/puzzles?${params}`);
      if (!res.ok) throw new Error('Failed to fetch puzzles');

      const data = await res.json();
      set({
        puzzles: page === 1 ? data.puzzles : [...get().puzzles, ...data.puzzles],
        totalPages: data.pagination.totalPages,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load puzzles',
      });
    }
  },

  fetchFeatured: async () => {
    try {
      const res = await fetch('/api/puzzles?featured=true&limit=5');
      if (!res.ok) return;
      const data = await res.json();
      set({ featuredPuzzles: data.puzzles });
    } catch {
      // Non-critical, silently fail
    }
  },

  loadMore: async () => {
    const { page, totalPages } = get();
    if (page >= totalPages) return;
    set({ page: page + 1 });
    await get().fetchPuzzles();
  },

  reset: () => set({
    search: '',
    category: null,
    difficulty: null,
    sort: 'newest',
    puzzles: [],
    page: 1,
    totalPages: 1,
  }),
}));
