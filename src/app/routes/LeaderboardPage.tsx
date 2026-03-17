import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useUser } from '@clerk/react';
import { Trophy, Medal, Award, ArrowLeft, Flame } from 'lucide-react';
import { Button } from '../../components/ui/shadcn/button';
import { getLevelTitle } from '../../store/xpUtils';

type TimeWindow = 'all' | 'monthly' | 'weekly';

interface LeaderboardEntry {
  rank: number;
  _id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  puzzlesCompleted: number;
  streakDays: number;
  isCurrentUser: boolean;
}

export default function LeaderboardPage() {
  const { user: clerkUser } = useUser();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);

      // Try API first
      try {
        const res = await fetch(`/api/leaderboard?window=${timeWindow}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          if (data.entries?.length > 0) {
            setEntries(data.entries.map((e: Record<string, unknown>) => ({
              ...e,
              displayName: (e.displayName as string) || (e.username as string),
              isCurrentUser: false,
            })));
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // API not available
      }

      setEntries([]);
      setIsLoading(false);
    }
    load();
  }, [timeWindow]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Gallery</Link>
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-lego-yellow" />
          Leaderboard
        </h1>

        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg border border-border">
          {(['all', 'monthly', 'weekly'] as TimeWindow[]).map(w => (
            <Button
              key={w}
              variant={timeWindow === w ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs capitalize"
              onClick={() => setTimeWindow(w)}
            >
              {w === 'all' ? 'All Time' : w}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-lg">No rankings yet</p>
          <p className="text-muted-foreground text-sm mt-1">Complete puzzles to earn XP and appear here!</p>
          <Button asChild className="mt-4">
            <Link to="/">Browse Puzzles</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link
              key={entry._id}
              to={`/profile/${entry.username}`}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                entry.isCurrentUser
                  ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                  : 'bg-card border-border hover:border-primary/30'
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center shrink-0">
                {entry.rank === 1 ? <Trophy className="h-5 w-5 text-yellow-500 mx-auto" /> :
                 entry.rank === 2 ? <Medal className="h-5 w-5 text-gray-400 mx-auto" /> :
                 entry.rank === 3 ? <Award className="h-5 w-5 text-amber-600 mx-auto" /> :
                 <span className="text-sm font-medium text-muted-foreground">#{entry.rank}</span>}
              </div>

              {/* Avatar */}
              {entry.avatarUrl ? (
                <img src={entry.avatarUrl} alt="" className="w-10 h-10 rounded-full shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {entry.displayName[0]?.toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {entry.displayName}
                  {entry.isCurrentUser && <span className="text-xs text-primary ml-1.5">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getLevelTitle(entry.level)} &middot; Level {entry.level} &middot; {entry.puzzlesCompleted} solved
                </p>
              </div>

              {/* XP + Streak */}
              <div className="text-right shrink-0">
                <p className="font-bold text-foreground">{entry.xp.toLocaleString()} XP</p>
                {entry.streakDays > 0 && (
                  <p className="text-xs text-orange-500 flex items-center gap-1 justify-end">
                    <Flame className="h-3 w-3" /> {entry.streakDays}d
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
