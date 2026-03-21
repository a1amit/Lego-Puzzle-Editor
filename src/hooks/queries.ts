import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import type { GalleryPuzzle, SortOption } from '../store/galleryStore';

// --- Query Keys ---
export const queryKeys = {
  puzzles: {
    all: ['puzzles'] as const,
    list: (filters: { search?: string; category?: string | null; difficulty?: string | null; sort?: SortOption; page?: number }) =>
      ['puzzles', 'list', filters] as const,
    featured: () => ['puzzles', 'featured'] as const,
    detail: (slug: string) => ['puzzles', 'detail', slug] as const,
  },
  users: {
    me: () => ['users', 'me'] as const,
    myPuzzles: () => ['users', 'me', 'puzzles'] as const,
    myCompletions: () => ['users', 'me', 'completions'] as const,
    profile: (username: string) => ['users', 'profile', username] as const,
  },
  leaderboard: (window: string) => ['leaderboard', window] as const,
} as const;

// --- Puzzle Queries ---
interface PuzzleListResponse {
  puzzles: GalleryPuzzle[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function usePuzzlesQuery(filters: {
  search?: string;
  category?: string | null;
  difficulty?: string | null;
  sort?: SortOption;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  params.set('sort', filters.sort || 'newest');
  params.set('page', String(filters.page || 1));
  params.set('limit', '20');

  return useQuery({
    queryKey: queryKeys.puzzles.list(filters),
    queryFn: () => apiClient.get<PuzzleListResponse>(`/puzzles?${params}`),
    staleTime: 60_000,
  });
}

export function useFeaturedPuzzlesQuery() {
  return useQuery({
    queryKey: queryKeys.puzzles.featured(),
    queryFn: () => apiClient.get<PuzzleListResponse>('/puzzles?featured=true&limit=5'),
    staleTime: 5 * 60_000,
  });
}

export function usePuzzleDetailQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.puzzles.detail(slug),
    queryFn: () => apiClient.get<{ puzzle: any; isLiked: boolean }>(`/puzzles/${slug}`),
    enabled: !!slug,
  });
}

// --- User Queries ---
export function useMyProfileQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: () => apiClient.get<{ user: any }>('/users/me'),
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useMyPuzzlesQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users.myPuzzles(),
    queryFn: () => apiClient.get<{ puzzles: any[] }>('/users/me/puzzles'),
    enabled,
    staleTime: 60_000,
  });
}

export function useMyCompletionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users.myCompletions(),
    queryFn: () => apiClient.get<{ completions: any[] }>('/users/me/completions'),
    enabled,
    staleTime: 60_000,
  });
}

export function usePublicProfileQuery(username: string) {
  return useQuery({
    queryKey: queryKeys.users.profile(username),
    queryFn: () => apiClient.get<{ user: any; puzzles: any[]; completions: any[] }>(`/users/${username}`),
    enabled: !!username,
  });
}

// --- Leaderboard ---
export function useLeaderboardQuery(window: string) {
  return useQuery({
    queryKey: queryKeys.leaderboard(window),
    queryFn: () => apiClient.get<{ entries: any[]; pagination: any }>(`/leaderboard?window=${window}&limit=50`),
    staleTime: 30_000,
  });
}

// --- Mutations ---
export function useLikeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiClient.post<{ liked: boolean }>(`/puzzles/${slug}/like`),
    onSuccess: (_data, slug) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.puzzles.detail(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.puzzles.all });
    },
  });
}

export function useCompletionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; moveCount: number; timeSeconds: number }) =>
      apiClient.post<{ xpEarned: number; totalXP: number; level: number; levelUp: boolean; streak: number }>(
        `/puzzles/${data.slug}/complete`,
        { moveCount: data.moveCount, timeSeconds: data.timeSeconds }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.myCompletions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard('all') });
    },
  });
}
