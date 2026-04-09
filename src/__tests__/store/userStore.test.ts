import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserStore, type UserProfile } from '@/store/userStore';
import { getLevelTitle, xpToReachLevel, levelFromXP } from '@/store/xpUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleUser: UserProfile = {
  _id: 'u1',
  clerkId: 'clerk_1',
  username: 'TestBuilder',
  avatarUrl: 'https://example.com/avatar.png',
  bio: 'I build puzzles',
  role: 'user',
  isBanned: false,
  xp: 0,
  level: 0,
  puzzlesCreated: 2,
  puzzlesCompleted: 5,
  streakDays: 3,
  lastSolveDate: '2026-04-01',
};

/** Create a mock getToken function */
function mockGetToken(token: string | null = 'test-token') {
  return vi.fn(async () => token);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  useUserStore.getState().clearProfile();
  vi.mocked(globalThis.fetch).mockReset();
});

// ===========================================================================
// 1. Initial state
// ===========================================================================

describe('Initial state', () => {
  it('profile is null', () => {
    expect(useUserStore.getState().profile).toBeNull();
  });

  it('isLoading is false', () => {
    expect(useUserStore.getState().isLoading).toBe(false);
  });

  it('error is null', () => {
    expect(useUserStore.getState().error).toBeNull();
  });

  it('has default level values', () => {
    const s = useUserStore.getState();
    expect(s.levelTitle).toBe('Brick Beginner');
    expect(s.xpForCurrentLevel).toBe(0);
    expect(s.xpForNextLevel).toBe(100);
    expect(s.levelProgress).toBe(0);
  });
});

// ===========================================================================
// 2. updateProfile
// ===========================================================================

describe('updateProfile', () => {
  it('updates profile fields when profile exists', () => {
    // Seed a profile first
    useUserStore.setState({ profile: { ...sampleUser } });

    useUserStore.getState().updateProfile({ username: 'NewName', bio: 'Updated bio' });

    const p = useUserStore.getState().profile!;
    expect(p.username).toBe('NewName');
    expect(p.bio).toBe('Updated bio');
    // Other fields remain unchanged
    expect(p.xp).toBe(sampleUser.xp);
    expect(p.clerkId).toBe(sampleUser.clerkId);
  });

  it('is a no-op when profile is null', () => {
    useUserStore.getState().updateProfile({ username: 'Ghost' });

    expect(useUserStore.getState().profile).toBeNull();
  });
});

// ===========================================================================
// 3. addXP
// ===========================================================================

describe('addXP', () => {
  beforeEach(() => {
    useUserStore.setState({ profile: { ...sampleUser, xp: 0, level: 0 } });
  });

  it('increases XP and recalculates level/title/progress', () => {
    useUserStore.getState().addXP(50);

    const s = useUserStore.getState();
    expect(s.profile!.xp).toBe(50);
    // Level should be recalculated
    const expectedLevel = levelFromXP(50);
    expect(s.profile!.level).toBe(expectedLevel);
    expect(s.levelTitle).toBe(getLevelTitle(expectedLevel));
  });

  it('level-up when crossing XP threshold', () => {
    // xpToReachLevel(1) should be the threshold for level 1
    const threshold = xpToReachLevel(1);
    useUserStore.getState().addXP(threshold);

    const s = useUserStore.getState();
    expect(s.profile!.xp).toBe(threshold);
    expect(s.profile!.level).toBeGreaterThanOrEqual(1);
  });

  it('calculates levelProgress correctly', () => {
    // Give enough XP to be partway through a level
    const level2Xp = xpToReachLevel(2);
    const level3Xp = xpToReachLevel(3);
    const midpoint = Math.floor((level2Xp + level3Xp) / 2);
    useUserStore.getState().addXP(midpoint);

    const s = useUserStore.getState();
    expect(s.levelProgress).toBeGreaterThan(0);
    expect(s.levelProgress).toBeLessThan(1);
  });

  it('is a no-op when profile is null', () => {
    useUserStore.setState({ profile: null });
    useUserStore.getState().addXP(100);

    expect(useUserStore.getState().profile).toBeNull();
  });

  it('XP accumulates across multiple calls', () => {
    useUserStore.getState().addXP(10);
    useUserStore.getState().addXP(20);
    useUserStore.getState().addXP(30);

    expect(useUserStore.getState().profile!.xp).toBe(60);
  });
});

// ===========================================================================
// 4. clearProfile
// ===========================================================================

describe('clearProfile', () => {
  it('resets all to null/defaults', () => {
    // Seed with data
    useUserStore.setState({
      profile: { ...sampleUser },
      isLoading: true,
      error: 'some error',
    });

    useUserStore.getState().clearProfile();

    const s = useUserStore.getState();
    expect(s.profile).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
  });
});

// ===========================================================================
// 5. fetchProfile
// ===========================================================================

describe('fetchProfile', () => {
  it('fetches user data and sets profile with computed values', async () => {
    const serverUser: UserProfile = {
      ...sampleUser,
      xp: 200,
      level: 2,
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: serverUser }), { status: 200 }),
    );

    await useUserStore.getState().fetchProfile(mockGetToken());

    const s = useUserStore.getState();
    expect(s.profile).toEqual(serverUser);
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.levelTitle).toBe(getLevelTitle(2));
    expect(s.xpForCurrentLevel).toBe(xpToReachLevel(2));
    expect(s.xpForNextLevel).toBe(xpToReachLevel(3));
  });

  it('sends Authorization header with token', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: sampleUser }), { status: 200 }),
    );

    await useUserStore.getState().fetchProfile(mockGetToken('my-jwt'));

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toContain('/api/users/me');
    expect((options as RequestInit).headers).toEqual({ Authorization: 'Bearer my-jwt' });
  });

  it('passes clerkInfo as query params', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: sampleUser }), { status: 200 }),
    );

    await useUserStore.getState().fetchProfile(mockGetToken(), {
      displayName: 'Bob',
      avatarUrl: 'https://img.example.com/bob.png',
    });

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    const urlStr = String(url);
    expect(urlStr).toContain('displayName=Bob');
    expect(urlStr).toContain('avatarUrl=');
  });

  it('sets error on fetch failure (non-ok response)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    await useUserStore.getState().fetchProfile(mockGetToken());

    const s = useUserStore.getState();
    expect(s.isLoading).toBe(false);
    expect(s.error).toBe('Failed to fetch profile');
    expect(s.profile).toBeNull();
  });

  it('sets error on network failure', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'));

    await useUserStore.getState().fetchProfile(mockGetToken());

    const s = useUserStore.getState();
    expect(s.isLoading).toBe(false);
    expect(s.error).toBe('Network error');
  });

  it('handles no token gracefully (sets profile to null)', async () => {
    await useUserStore.getState().fetchProfile(mockGetToken(null));

    const s = useUserStore.getState();
    expect(s.isLoading).toBe(false);
    expect(s.profile).toBeNull();
    expect(s.error).toBeNull();
    // Should NOT have called fetch at all
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('sets isLoading during fetch', async () => {
    let resolvePromise: (value: Response) => void;
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(globalThis.fetch).mockReturnValueOnce(pendingPromise as Promise<Response>);

    const fetchPromise = useUserStore.getState().fetchProfile(mockGetToken());

    // isLoading should be true while fetch is pending
    expect(useUserStore.getState().isLoading).toBe(true);

    // Resolve the fetch
    resolvePromise!(new Response(JSON.stringify({ user: sampleUser }), { status: 200 }));
    await fetchPromise;

    expect(useUserStore.getState().isLoading).toBe(false);
  });

  it('calculates levelProgress as 0 when at level boundary', async () => {
    const level = 5;
    const userAtBoundary: UserProfile = {
      ...sampleUser,
      xp: xpToReachLevel(level),
      level,
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: userAtBoundary }), { status: 200 }),
    );

    await useUserStore.getState().fetchProfile(mockGetToken());

    const s = useUserStore.getState();
    expect(s.levelProgress).toBe(0);
  });
});
