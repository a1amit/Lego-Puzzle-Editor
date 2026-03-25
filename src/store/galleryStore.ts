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
  search: string;
  category: string | null;
  difficulty: string | null;
  sort: SortOption;

  setSearch: (search: string) => void;
  setCategory: (category: string | null) => void;
  setDifficulty: (difficulty: string | null) => void;
  setSort: (sort: SortOption) => void;
  reset: () => void;
}

export const useGalleryStore = create<GalleryStore>((set) => ({
  search: '',
  category: null,
  difficulty: null,
  sort: 'newest',

  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ search: '', category: null, difficulty: null, sort: 'newest' }),
}));
