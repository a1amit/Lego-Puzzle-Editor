import { useState } from 'react';
import { Link } from 'react-router';
import { Trophy, Medal, Award, Flame, Crown } from 'lucide-react';
import { Button } from '../../components/ui/shadcn/button';
import { getLevelTitle } from '../../store/xpUtils';
import { useLeaderboardQuery } from '../../hooks/queries';

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

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground tabular-nums">#{rank}</span>;
}

export default function LeaderboardPage() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
  const { data, isLoading } = useLeaderboardQuery(timeWindow);
  const entries = (data?.entries || []).map((e: Record<string, unknown>) => ({
    ...e,
    displayName: (e.displayName as string) || (e.username as string),
    isCurrentUser: false,
  })) as LeaderboardEntry[];

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gold/15 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-gold" />
            </div>
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Top puzzle solvers ranked by XP</p>
        </div>

        <div role="tablist" aria-label="Leaderboard time window" className="flex items-center gap-1 p-1 bg-secondary/80 rounded-lg border border-border">
          {(['all', 'monthly', 'weekly'] as TimeWindow[]).map(w => (
            <Button
              key={w}
              role="tab"
              aria-selected={timeWindow === w}
              variant={timeWindow === w ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-4 text-xs capitalize"
              onClick={() => setTimeWindow(w)}
            >
              {w === 'all' ? 'All Time' : w}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[72px] rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card/50 border border-dashed border-border">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-lg font-medium">No rankings yet</p>
          <p className="text-muted-foreground text-sm mt-1">Complete puzzles to earn XP and appear here!</p>
          <Button asChild className="mt-4">
            <Link to="/">Browse Puzzles</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[3rem_1fr_8rem_6rem_6rem_5rem] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">XP</span>
            <span className="text-right">Solved</span>
            <span className="text-right">Level</span>
            <span className="text-right">Streak</span>
          </div>

          {/* Entries */}
          <div role="list" aria-label="Leaderboard entries" className="space-y-1.5">
            {entries.map((entry, index) => (
              <Link
                key={entry._id}
                to={`/profile/${entry.username}`}
                className={`group grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_8rem_6rem_6rem_5rem] gap-3 items-center p-3 sm:p-4 rounded-xl border transition-all ${
                  index < 3
                    ? 'bg-gradient-to-r from-card to-gold/[0.03] border-gold/15 hover:border-gold/30'
                    : entry.isCurrentUser
                      ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                      : 'bg-card border-border hover:border-primary/30'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  <RankIcon rank={entry.rank} />
                </div>

                {/* Player */}
                <div className="flex items-center gap-3 min-w-0">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt="" className={`w-9 h-9 rounded-full shrink-0 ${index < 3 ? 'ring-2 ring-gold/30' : ''}`} />
                  ) : (
                    <div className={`w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 ${index < 3 ? 'ring-2 ring-gold/30' : ''}`}>
                      {entry.displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {entry.displayName}
                      {entry.isCurrentUser && <span className="text-xs text-primary ml-1.5">(you)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                      {getLevelTitle(entry.level)}
                    </p>
                  </div>
                </div>

                {/* Mobile: compact XP + streak */}
                <div className="sm:hidden text-right">
                  <p className="text-sm font-bold text-foreground">{entry.xp.toLocaleString()} XP</p>
                  {entry.streakDays > 0 && (
                    <p className="text-[11px] text-orange-400 flex items-center gap-1 justify-end">
                      <Flame className="h-3 w-3" />{entry.streakDays}d
                    </p>
                  )}
                </div>

                {/* Desktop columns */}
                <p className="hidden sm:block text-sm font-bold text-foreground text-right tabular-nums">
                  {entry.xp.toLocaleString()}
                </p>
                <p className="hidden sm:block text-sm text-muted-foreground text-right tabular-nums">
                  {entry.puzzlesCompleted}
                </p>
                <p className="hidden sm:block text-sm text-muted-foreground text-right tabular-nums">
                  Lv.{entry.level}
                </p>
                <div className="hidden sm:flex items-center justify-end">
                  {entry.streakDays > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-orange-400 font-medium">
                      <Flame className="h-3 w-3" />{entry.streakDays}d
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
