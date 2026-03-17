import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useUser } from '@clerk/react';
import { Trophy, Puzzle, Star, Flame, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/shadcn/button';
import { LevelTitleCard, TierRoadmap } from '../../components/ui/LevelTitleCard';
import { useAppAuth } from '../../auth/AuthProvider';
import { useUserStore } from '../../store/userStore';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';

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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [completions, setCompletions] = useState<CompletionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storeUsername = useUserStore((s) => s.profile?.username);
  const isOwnProfile = clerkUser?.id === userId || (!!storeUsername && storeUsername === userId);

  useEffect(() => {
    async function loadOwnProfile() {
      if (!authLoaded) return;
      if (!clerkUser) return;

      setIsLoading(true);
      try {
        const token = await getToken();
        if (token) {
          const [res, compRes] = await Promise.all([
            fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/users/me/completions', { headers: { Authorization: `Bearer ${token}` } }),
          ]);

          if (res.ok) {
            const { user: apiUser } = await res.json();
            setProfile({
              displayName: clerkUser.firstName
                ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
                : apiUser.username || 'User',
              avatarUrl: clerkUser.imageUrl || null,
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              bio: apiUser.bio || '',
              xp: apiUser.xp || 0,
              level: apiUser.level || 0,
              puzzlesCreated: apiUser.puzzlesCreated || 0,
              puzzlesCompleted: apiUser.puzzlesCompleted || 0,
              streakDays: apiUser.streakDays || 0,
              isOwnProfile: true,
            });
          }
          if (compRes.ok) {
            const { completions: apiCompletions } = await compRes.json();
            setCompletions(apiCompletions || []);
          }
        }
      } catch {
        // API not available
      }
      setIsLoading(false);
    }

    async function loadPublicProfile() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const { user: apiUser, completions: apiCompletions } = await res.json();
          setProfile({
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
          });
          setCompletions(apiCompletions || []);
        }
      } catch {
        // API not available
      }
      setIsLoading(false);
    }

    if (!userId) return;

    if (isOwnProfile) {
      loadOwnProfile();
    } else {
      // Public profiles don't need auth — fetch immediately
      loadPublicProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoaded, isOwnProfile]);

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

      {/* Recent completions (from API) */}
      {completions.length === 0 ? (
        <div className="rounded-xl bg-card/50 border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground mb-3">Start solving puzzles to earn XP and level up!</p>
          <Button asChild>
            <Link to="/">Browse Puzzles</Link>
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Recent Completions</h2>
          <div className="space-y-2">
            {completions.slice(0, 20).map((c, i) => (
              <Link
                key={i}
                to={`/puzzle/${c.puzzleSlug}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <Puzzle className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{SLUG_TO_TITLE[c.puzzleSlug] || c.puzzleSlug}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.moveCount} moves &middot; {c.timeSeconds}s &middot; {new Date(c.completedAt).toLocaleDateString()}
                  </p>
                </div>
                {c.xpEarned > 0 && (
                  <span className="text-xs font-bold text-primary shrink-0">+{c.xpEarned} XP</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
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
