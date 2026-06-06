import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUser } from '../../auth/AuthProvider';
import { Puzzle, Star, Flame, ChevronDown, CircleCheck, Play, FolderOpen, Zap } from 'lucide-react';
import { getLevelTitle, xpToReachLevel } from '../../store/xpUtils';
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
  selectedTier: string | null;
  isOwnProfile: boolean;
}

interface CompletionEntry {
  puzzleSlug: string;
  puzzleTitle?: string;
  moveCount: number;
  timeSeconds: number;
  xpEarned: number;
  completedAt: string;
}

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: clerkUser } = useUser();
  const { getToken, isLoaded: authLoaded } = useAppAuth();

  const queryClient = useQueryClient();
  const storeUsername = useUserStore((s) => s.profile?.username);
  const isOwnProfile = clerkUser?.id === userId || (!!storeUsername && storeUsername === userId);

  const handleSelectTier = async (tierTitle: string | null) => {
    // Optimistic update — reflect immediately in the UI
    queryClient.setQueryData(['users', 'me', 'full'], (old: any) => {
      if (!old) return old;
      return { ...old, apiUser: { ...old.apiUser, selectedTier: tierTitle } };
    });

    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ selectedTier: tierTitle }),
    });
    if (res.ok) {
      toast.success(`Banner set to ${tierTitle}`);
    } else {
      toast.error('Failed to update banner');
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    }
  };

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
      selectedTier: apiUser.selectedTier || null,
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
      selectedTier: apiUser.selectedTier || null,
      isOwnProfile: false,
    };
    completions = apiCompletions || [];
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-40 rounded-xl bg-card border border-border" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-card border border-border" />)}
          </div>
          <div className="h-64 rounded-xl bg-card border border-border" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 sm:px-6 py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">User not found</h2>
        <p className="text-muted-foreground mt-2">This profile doesn't exist.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Back to Gallery</Link>
        </Button>
      </div>
    );
  }

  // XP progress for the ring
  const currentLevelXp = xpToReachLevel(profile.level);
  const nextLevelXp = xpToReachLevel(profile.level + 1);
  const xpProgress = nextLevelXp > currentLevelXp
    ? (profile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)
    : 1;
  const levelTitle = getLevelTitle(profile.level);

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* === Top row: Profile card + Stat cards === */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 mb-5">
        {/* Profile card (left) */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-lego-red via-lego-yellow via-lego-green to-lego-blue" />
          <div className="p-5 flex flex-col items-center text-center">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className="w-20 h-20 rounded-full ring-3 ring-primary/20 mb-3" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary ring-3 ring-primary/20 mb-3">
                {profile.displayName[0]?.toUpperCase()}
              </div>
            )}
            <h1 className="text-lg font-bold text-foreground">{profile.displayName}</h1>
            {profile.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>}

            {/* Level badge */}
            <div className="mt-3 w-full px-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 border border-border">
                <Zap className="h-4 w-4 text-gold shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate">{levelTitle}</span>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">Lv.{profile.level}</span>
              </div>
            </div>

            {profile.isOwnProfile && (
              <Button asChild variant="outline" size="sm" className="mt-3 w-full gap-1.5">
                <Link to="/my-puzzles"><FolderOpen className="h-3.5 w-3.5" />My Puzzles</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats row (right) — 4 cards like reference */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* XP Score with circular ring */}
          <div className="rounded-xl bg-card border border-border p-4 flex flex-col items-center text-center gap-1 hover:border-gold/30 transition-colors">
            <div className="relative w-16 h-16 mb-1">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke="var(--gold)" strokeWidth="2.5"
                  strokeDasharray={`${xpProgress * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                {profile.level}
              </span>
            </div>
            <span className="text-xs font-semibold text-foreground">{profile.xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
            <span className="text-[10px] text-muted-foreground">{(nextLevelXp - profile.xp).toLocaleString()} XP to Level {profile.level + 1}</span>
          </div>

          {/* Puzzles Solved */}
          <StatCard
            icon={<div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center"><Puzzle className="h-5 w-5 text-primary" /></div>}
            value={profile.puzzlesCompleted}
            label="Puzzles Solved"
            sub={`${completions.length} total solves`}
          />

          {/* Puzzles Created */}
          <StatCard
            icon={<div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center"><Star className="h-5 w-5 text-gold" /></div>}
            value={profile.puzzlesCreated}
            label="Puzzles Created"
          />

          {/* Day Streak */}
          <StatCard
            icon={<div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center"><Flame className="h-5 w-5 text-orange-400" /></div>}
            value={profile.streakDays}
            label="Day Streak"
            sub={profile.streakDays > 0 ? 'Keep it going!' : 'Solve a puzzle!'}
          />
        </div>
      </div>

      {/* === Middle row: Tier Roadmap + Level Card === */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 mb-5">
        {/* Level title card */}
        <LevelTitleCard level={profile.level} xp={profile.xp} overrideTier={profile.selectedTier} />

        {/* Tier roadmap */}
        <TierRoadmap
          currentLevel={profile.level}
          selectedTier={profile.selectedTier}
          onSelectTier={profile.isOwnProfile ? handleSelectTier : undefined}
          isOwnProfile={profile.isOwnProfile}
        />
      </div>

      {/* === Bottom: Solve History === */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <CircleCheck className="h-4 w-4 text-success" />
          <h2 className="text-sm font-semibold text-foreground">Solve History</h2>
          <span className="text-[10px] text-muted-foreground ml-1">({completions.length} solves)</span>
        </div>

        {completions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-3">Start solving puzzles to earn XP and level up!</p>
            <Button asChild size="sm">
              <Link to="/">Browse Puzzles</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <GroupedCompletions completions={completions} />
          </div>
        )}
      </div>
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
        title: c.puzzleTitle || SLUG_TO_TITLE[c.puzzleSlug] || c.puzzleSlug,
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
          <div key={g.slug}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => toggle(g.slug)}>
              <Puzzle className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-[8rem]">
                <p className="text-sm font-medium text-foreground truncate">{g.title}</p>
                <p className="text-xs text-muted-foreground">
                  Best: {g.bestMoves} moves &middot; {g.bestTime}s &middot; Solved {g.solveCount}{g.solveCount === 1 ? ' time' : ' times'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-auto">
                {g.totalXp > 0 && (
                  <span className="text-xs font-bold text-primary shrink-0">+{g.totalXp} XP</span>
                )}
                <Link
                  to={`/puzzle/${g.slug}`}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <Play className="h-3 w-3" />
                  Play
                </Link>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {isOpen && (
              <div className="border-t border-border bg-muted/10 px-4 py-2 space-y-1">
                {g.solves.map((s, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground py-1">
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

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 flex flex-col items-center text-center gap-1.5 hover:border-primary/20 transition-colors">
      {icon}
      <span className="text-2xl font-bold text-foreground tabular-nums">{value}</span>
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}
