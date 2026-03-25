import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../../auth/AuthProvider';
import { Trophy, Puzzle, Star, Flame, ArrowLeft, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/shadcn/button';
import { LevelTitleCard, TierRoadmap } from '../../components/ui/LevelTitleCard';
import { useAppAuth } from '../../auth/AuthProvider';
import { useUserStore } from '../../store/userStore';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';
import { usePublicProfileQuery } from '../../hooks/queries';

const SLUG_TO_TITLE: Record<string, string> = {};
for (const cat of PUZZLE_CATEGORIES) {
  for (const p of cat.puzzles) {
    SLUG_TO_TITLE[p.id] = p.label;
  }
}

interface ProfileData {
  displayName: string;
  avatarUrl: string | null;
  email: string;
  bio: string;
  xp: number;
  level: number;
  puzzlesCreated: number;
  puzzlesCompleted: number;
  streakDays: number;
  isOwnProfile: boolean;
}

interface CompletionEntry {
  puzzleSlug: string;
  moveCount: number;
  timeSeconds: number;
  xpEarned: number;
  completedAt: string;
}

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: clerkUser } = useUser();
  const { getToken, isLoaded: authLoaded } = useAppAuth();

  const storeUsername = useUserStore((s) => s.profile?.username);
  const isOwnProfile = clerkUser?.id === userId || (!!storeUsername && storeUsername === userId);

  // Own profile: fetch /users/me + /users/me/completions (needs auth token)
  const ownProfileQuery = useQuery({
    queryKey: ['users', 'me', 'full'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const [res, compRes] = await Promise.all([
        fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users/me/completions', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!res.ok) return null;
      const { user: apiUser } = await res.json();
      const completions = compRes.ok ? (await compRes.json()).completions : [];
      return { apiUser, completions };
    },
    enabled: isOwnProfile && authLoaded && !!clerkUser,
    staleTime: 2 * 60_000,
  });

  // Public profile: fetch /users/:username (no auth needed)
  const publicProfileQuery = usePublicProfileQuery(!isOwnProfile ? (userId || '') : '');

  // Derive profile and completions from the active query
  const isLoading = isOwnProfile
    ? ownProfileQuery.isLoading
    : publicProfileQuery.isLoading;

  let profile: ProfileData | null = null;
  let completions: CompletionEntry[] = [];

  if (isOwnProfile && ownProfileQuery.data) {
    const { apiUser, completions: apiCompletions } = ownProfileQuery.data;
    profile = {
      displayName: clerkUser?.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
        : apiUser.username || 'User',
      avatarUrl: clerkUser?.imageUrl || null,
      email: clerkUser?.primaryEmailAddress?.emailAddress || '',
      bio: apiUser.bio || '',
      xp: apiUser.xp || 0,
      level: apiUser.level || 0,
      puzzlesCreated: apiUser.puzzlesCreated || 0,
      puzzlesCompleted: apiUser.puzzlesCompleted || 0,
      streakDays: apiUser.streakDays || 0,
      isOwnProfile: true,
    };
    completions = apiCompletions || [];
  } else if (!isOwnProfile && publicProfileQuery.data) {
    const { user: apiUser, completions: apiCompletions } = publicProfileQuery.data;
    profile = {
      displayName: apiUser.displayName || apiUser.username || 'User',
      avatarUrl: apiUser.avatarUrl || null,
      email: '',
      bio: apiUser.bio || '',
      xp: apiUser.xp || 0,
      level: apiUser.level || 0,
      puzzlesCreated: apiUser.puzzlesCreated || 0,
      puzzlesCompleted: apiUser.puzzlesCompleted || 0,
      streakDays: apiUser.streakDays || 0,
      isOwnProfile: false,
    };
    completions = apiCompletions || [];
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-32 rounded-xl bg-card border border-border" />
          <div className="h-64 rounded-xl bg-card border border-border" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">User not found</h2>
        <p className="text-muted-foreground mt-2">This profile doesn't exist.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to Gallery</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Gallery</Link>
      </Button>

      {/* Profile header with avatar */}
      <div className="rounded-xl bg-card border border-border p-6 mb-4">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {profile.displayName[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{profile.displayName}</h1>
            {profile.bio && <p className="text-sm text-foreground/80 mt-1">{profile.bio}</p>}
          </div>
        </div>
      </div>

      {/* My Puzzles link (own profile only) */}
      {profile.isOwnProfile && (
        <Button asChild variant="outline" className="w-full mb-4 gap-2">
          <Link to="/my-puzzles"><Puzzle className="h-4 w-4" />Manage My Puzzles</Link>
        </Button>
      )}

      {/* Level title card with XP bar */}
      <LevelTitleCard level={profile.level} xp={profile.xp} className="mb-6" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Puzzle className="h-5 w-5 text-lego-blue" />} label="Puzzles Solved" value={profile.puzzlesCompleted} />
        <StatCard icon={<Star className="h-5 w-5 text-lego-yellow" />} label="Puzzles Created" value={profile.puzzlesCreated} />
        <StatCard icon={<Trophy className="h-5 w-5 text-lego-red" />} label="Total XP" value={profile.xp.toLocaleString()} />
        <StatCard icon={<Flame className="h-5 w-5 text-orange-500" />} label="Day Streak" value={profile.streakDays} />
      </div>

      {/* Rank roadmap */}
      <TierRoadmap currentLevel={profile.level} className="mb-6" />

      {/* Solved puzzles */}
      {completions.length === 0 ? (
        <div className="rounded-xl bg-card/50 border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground mb-3">Start solving puzzles to earn XP and level up!</p>
          <Button asChild>
            <Link to="/">Browse Puzzles</Link>
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            <CheckCircle2 className="h-5 w-5 inline-block mr-1.5 -mt-0.5 text-green-400" />
            Puzzles Solved
          </h2>
          <div className="space-y-2">
            <GroupedCompletions completions={completions} />
          </div>
        </div>
      )}
    </div>
  );
}

interface GroupedPuzzle {
  slug: string;
  title: string;
  totalXp: number;
  bestMoves: number;
  bestTime: number;
  solveCount: number;
  latestDate: string;
  solves: { moveCount: number; timeSeconds: number; xpEarned: number; completedAt: string }[];
}

function groupCompletions(completions: CompletionEntry[]): GroupedPuzzle[] {
  const map = new Map<string, GroupedPuzzle>();
  for (const c of completions) {
    let group = map.get(c.puzzleSlug);
    if (!group) {
      group = {
        slug: c.puzzleSlug,
        title: SLUG_TO_TITLE[c.puzzleSlug] || c.puzzleSlug,
        totalXp: 0,
        bestMoves: c.moveCount,
        bestTime: c.timeSeconds,
        solveCount: 0,
        latestDate: c.completedAt,
        solves: [],
      };
      map.set(c.puzzleSlug, group);
    }
    group.solveCount++;
    group.totalXp += c.xpEarned;
    if (c.moveCount < group.bestMoves) group.bestMoves = c.moveCount;
    if (c.timeSeconds < group.bestTime) group.bestTime = c.timeSeconds;
    if (c.completedAt > group.latestDate) group.latestDate = c.completedAt;
    group.solves.push({ moveCount: c.moveCount, timeSeconds: c.timeSeconds, xpEarned: c.xpEarned, completedAt: c.completedAt });
  }
  // Sort: most recently solved first
  return Array.from(map.values()).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

function GroupedCompletions({ completions }: { completions: CompletionEntry[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = groupCompletions(completions);

  const toggle = (slug: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  return (
    <>
      {groups.map(g => {
        const isOpen = expanded.has(g.slug);
        return (
          <div key={g.slug} className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggle(g.slug)}>
              <Puzzle className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <Link to={`/puzzle/${g.slug}`} className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
                  {g.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Best: {g.bestMoves} moves &middot; {g.bestTime}s &middot; Solved {g.solveCount}{g.solveCount === 1 ? ' time' : ' times'}
                </p>
              </div>
              {g.totalXp > 0 && (
                <span className="text-xs font-bold text-primary shrink-0">+{g.totalXp} XP</span>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
              <div className="border-t border-border bg-muted/10 px-3 py-2 space-y-1">
                {g.solves.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground py-1">
                    <span className="w-24 shrink-0">{new Date(s.completedAt).toLocaleDateString()}</span>
                    <span>{s.moveCount} moves</span>
                    <span>&middot;</span>
                    <span>{s.timeSeconds}s</span>
                    {s.xpEarned > 0 && <span className="ml-auto text-primary font-medium">+{s.xpEarned} XP</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 flex flex-col items-center text-center gap-2">
      {icon}
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
