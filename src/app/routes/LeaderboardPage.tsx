import { useState } from 'react';
import { Link } from 'react-router';
import { m } from 'framer-motion';
import { Trophy, Flame, Crown } from 'lucide-react';
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

/* Medal treatments for the podium: gold / light gray / muted bronze. */
const MEDALS: Record<
  1 | 2 | 3,
  {
    pedestal: string;
    border: string;
    text: string;
    ring: string;
    stud: string;
    delay: number;
    bounce: number;
  }
> = {
  1: {
    pedestal: 'h-28 sm:h-36 bg-gradient-to-b from-gold/15 to-gold/[0.03]',
    border: 'border-gold/40 group-hover:border-gold/70',
    text: 'text-gold',
    ring: 'ring-gold/60',
    stud: 'bg-gold/25',
    delay: 0.26,
    bounce: 0.45,
  },
  2: {
    pedestal: 'h-20 sm:h-28 bg-gradient-to-b from-gray-300/10 to-gray-300/[0.02]',
    border: 'border-gray-300/30 group-hover:border-gray-300/60',
    text: 'text-gray-300',
    ring: 'ring-gray-300/50',
    stud: 'bg-gray-300/20',
    delay: 0.13,
    bounce: 0.3,
  },
  3: {
    pedestal: 'h-16 sm:h-24 bg-gradient-to-b from-[#b08d57]/15 to-[#b08d57]/[0.03]',
    border: 'border-[#b08d57]/40 group-hover:border-[#b08d57]/70',
    text: 'text-[#b08d57]',
    ring: 'ring-[#b08d57]/50',
    stud: 'bg-[#b08d57]/25',
    delay: 0,
    bounce: 0.3,
  },
};

/* One pedestal of the podium: brick-like block (rounded top, hard darker
   bottom edge like molded plastic, stud dots on top) that springs up into
   place — 3rd first, 1st last with the most bounce. */
function PodiumSlot({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const medal = MEDALS[place];
  return (
    <m.div
      className="flex-1 max-w-[11rem] min-w-0"
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        visualDuration: place === 1 ? 0.5 : 0.4,
        bounce: medal.bounce,
        delay: medal.delay,
      }}
    >
      <Link to={`/profile/${entry.username}`} className="group flex flex-col items-center">
        {place === 1 && <Crown className="h-6 w-6 text-gold mb-1.5" aria-label="First place" />}
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt=""
            className={`rounded-full shrink-0 ring-2 ${medal.ring} ${place === 1 ? 'w-16 h-16' : 'w-12 h-12'}`}
          />
        ) : (
          <div
            className={`rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0 ring-2 ${medal.ring} ${
              place === 1 ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-sm'
            }`}
          >
            {entry.displayName[0]?.toUpperCase()}
          </div>
        )}
        <p className="mt-2 w-full px-1 text-center font-display font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {entry.displayName}
          {entry.isCurrentUser && <span className="text-xs text-primary ml-1">(you)</span>}
        </p>
        <p className="w-full px-1 text-center text-[10px] text-muted-foreground truncate">
          {getLevelTitle(entry.level)}
        </p>
        <p className={`mt-0.5 font-mono text-xs font-bold ${medal.text}`}>
          {entry.xp.toLocaleString()} XP
        </p>

        {/* Pedestal */}
        <div
          className={`mt-3 w-full rounded-t-xl border ${medal.border} ${medal.pedestal} shadow-[0_5px_0_0_rgba(0,0,0,0.45)] flex flex-col items-center transition-colors`}
        >
          <div className="flex gap-2 pt-2.5" aria-hidden="true">
            <span className={`h-2 w-2 rounded-full ${medal.stud}`} />
            <span className={`h-2 w-2 rounded-full ${medal.stud}`} />
          </div>
          <span className={`flex-1 flex items-center font-mono font-bold text-2xl ${medal.text}`}>
            {entry.rank}
          </span>
        </div>
      </Link>
    </m.div>
  );
}

export default function LeaderboardPage() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
  const { data, isLoading } = useLeaderboardQuery(timeWindow);
  const entries = (data?.entries || []).map((e: Record<string, unknown>) => ({
    ...e,
    displayName: (e.displayName as string) || (e.username as string),
    isCurrentUser: false,
  })) as LeaderboardEntry[];

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  // 2nd | 1st | 3rd arrangement; gracefully drops missing slots.
  const podiumOrder = [
    { entry: podium[1], place: 2 as const },
    { entry: podium[0], place: 1 as const },
    { entry: podium[2], place: 3 as const },
  ].filter((slot): slot is { entry: LeaderboardEntry; place: 1 | 2 | 3 } => Boolean(slot.entry));

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gold/15 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-gold" />
            </div>
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Top puzzle solvers ranked by XP</p>
        </div>

        {/* Time-window pills */}
        <div role="tablist" aria-label="Leaderboard time window" className="flex items-center gap-1.5">
          {(['all', 'monthly', 'weekly'] as TimeWindow[]).map(w => (
            <button
              key={w}
              role="tab"
              aria-selected={timeWindow === w}
              onClick={() => setTimeWindow(w)}
              className={`h-7 px-3.5 rounded-full font-mono text-[11px] uppercase tracking-wider transition-colors ${
                timeWindow === w
                  ? 'bg-gold text-gold-foreground font-bold'
                  : 'border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              }`}
            >
              {w === 'all' ? 'All Time' : w}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Loading leaderboard">
          <div className="flex items-end justify-center gap-3 sm:gap-6 mb-10 px-2">
            <div className="flex-1 max-w-[11rem] h-40 rounded-t-xl bg-card border border-border animate-pulse" />
            <div className="flex-1 max-w-[11rem] h-52 rounded-t-xl bg-card border border-border animate-pulse" />
            <div className="flex-1 max-w-[11rem] h-32 rounded-t-xl bg-card border border-border animate-pulse" />
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[64px] rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-[var(--surface-raised)]/70 backdrop-blur-xl border border-dashed border-border">
          <Trophy className="h-12 w-12 text-gold/40 mx-auto mb-4" />
          <p className="font-display text-xl font-bold text-foreground">No rankings yet</p>
          <p className="text-sm text-muted-foreground mt-1">Complete puzzles to earn XP and appear here!</p>
          <Button asChild className="brick-btn mt-6 bg-gold text-gold-foreground hover:bg-gold font-bold">
            <Link to="/">Browse Puzzles</Link>
          </Button>
        </div>
      ) : (
        // Keyed by timeWindow so the podium springs and list cascade replay
        // when the filter changes.
        <div key={timeWindow}>
          {/* Podium — top 3 */}
          {podiumOrder.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-6 mb-10 px-2">
              {podiumOrder.map(({ entry, place }) => (
                <PodiumSlot key={entry._id} entry={entry} place={place} />
              ))}
            </div>
          )}

          {/* Ranks 4+ */}
          {rest.length > 0 && (
            <div className="bg-[var(--surface-raised)]/70 backdrop-blur-xl border border-border rounded-xl p-2 sm:p-3">
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
                {rest.map((entry, index) => (
                  <Link
                    key={entry._id}
                    to={`/profile/${entry.username}`}
                    role="listitem"
                    className={`card-rise group grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_8rem_6rem_6rem_5rem] gap-3 items-center p-3 sm:p-4 rounded-xl border transition-all ${
                      entry.isCurrentUser
                        ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                    style={{ '--i': index } as React.CSSProperties}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center">
                      <span className="font-mono text-sm font-bold text-muted-foreground">#{entry.rank}</span>
                    </div>

                    {/* Player */}
                    <div className="flex items-center gap-3 min-w-0">
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
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

                    {/* Mobile: compact XP + solved/level + streak */}
                    <div className="sm:hidden text-right">
                      <p className="font-mono text-sm font-bold text-foreground">{entry.xp.toLocaleString()} XP</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {entry.puzzlesCompleted} solved &middot; Lv.{entry.level}
                      </p>
                      {entry.streakDays > 0 && (
                        <p className="font-mono text-[11px] text-orange-400 flex items-center gap-1 justify-end">
                          <Flame className="h-3 w-3" />{entry.streakDays}d
                        </p>
                      )}
                    </div>

                    {/* Desktop columns */}
                    <p className="hidden sm:block font-mono text-sm font-bold text-foreground text-right">
                      {entry.xp.toLocaleString()}
                    </p>
                    <p className="hidden sm:block font-mono text-sm text-muted-foreground text-right">
                      {entry.puzzlesCompleted}
                    </p>
                    <p className="hidden sm:block font-mono text-sm text-muted-foreground text-right">
                      Lv.{entry.level}
                    </p>
                    <div className="hidden sm:flex items-center justify-end">
                      {entry.streakDays > 0 ? (
                        <span className="flex items-center gap-1 font-mono text-xs text-orange-400 font-medium">
                          <Flame className="h-3 w-3" />{entry.streakDays}d
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
