/**
 * Reports puzzle completions to the API.
 * All data is stored in MongoDB — no localStorage.
 */

export async function recordCompletion(params: {
  puzzleSlug: string;
  puzzleTitle: string;
  moveCount: number;
  timeSeconds: number;
  getToken: () => Promise<string | null>;
}): Promise<{ xpEarned: number; totalXP: number; level: number; levelUp: boolean } | null> {
  const { puzzleSlug, moveCount, timeSeconds, getToken } = params;

  try {
    const token = await getToken();
    if (!token) return null;

    const res = await fetch(`/api/puzzles/${puzzleSlug}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ moveCount, timeSeconds }),
    });

    if (res.ok) {
      return await res.json();
    } else {
      const errBody = await res.text();
      console.warn('[completion] API error:', res.status, errBody);
    }
  } catch (err) {
    console.warn('[completion] fetch failed:', err);
  }

  return null;
}
