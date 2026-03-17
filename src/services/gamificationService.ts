/**
 * Gamification service — bridges puzzle completion with the API.
 */

import { apiClient } from './apiClient';
import { useGamificationStore } from '../store/gamificationStore';
import { useUserStore } from '../store/userStore';

export interface CompletionPayload {
  puzzleSlug: string;
  moveCount: number;
  timeSeconds: number;
}

export interface CompletionResponse {
  xpEarned: number;
  totalXP: number;
  level: number;
  levelUp: boolean;
  streak: number;
}

export async function reportPuzzleCompletion(payload: CompletionPayload): Promise<CompletionResponse | null> {
  try {
    const result = await apiClient.post<CompletionResponse>(
      `/puzzles/${payload.puzzleSlug}/complete`,
      { moveCount: payload.moveCount, timeSeconds: payload.timeSeconds }
    );

    // Update local stores
    if (result.xpEarned > 0) {
      useUserStore.getState().addXP(result.xpEarned);
    }

    if (result.levelUp) {
      useGamificationStore.getState().dismissLevelUp(); // reset first
      useGamificationStore.setState({ showLevelUp: true, lastResult: result });
    }

    return result;
  } catch {
    return null;
  }
}

export async function togglePuzzleLike(slug: string): Promise<boolean | null> {
  try {
    const result = await apiClient.post<{ liked: boolean }>(`/puzzles/${slug}/like`);
    return result.liked;
  } catch {
    return null;
  }
}
