import { m } from 'framer-motion';
import { Star } from 'lucide-react';
import { Button } from './shadcn/button';
import { useGamificationStore } from '../../store/gamificationStore';
import { getLevelTitle } from '../../store/xpUtils';

interface LevelUpPopupProps {
  onDismiss: () => void;
}

/** Spring used for every pop-in (transforms are stripped automatically for
 *  reduced-motion users via the root MotionConfig reducedMotion="user"). */
const POP = { type: 'spring', visualDuration: 0.45, bounce: 0.45 } as const;

export function LevelUpPopup({ onDismiss }: LevelUpPopupProps) {
  const lastResult = useGamificationStore((s) => s.lastResult);

  if (!lastResult) return null;

  const title = getLevelTitle(lastResult.level);

  return (
    <m.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Glass card — night-dark chrome with a subtle gold glow ring */}
      <m.div
        className="relative bg-[var(--surface-raised)]/90 backdrop-blur-xl border border-border ring-1 ring-gold/20 rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
        style={{
          boxShadow:
            '0 24px 64px -16px rgba(0,0,0,0.6), 0 0 56px -16px color-mix(in oklab, var(--gold) 45%, transparent)',
        }}
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', visualDuration: 0.45, bounce: 0.35 }}
      >
        {/* Stars — staggered spring pops, gold accent only */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <m.div
              className="will-change-transform"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...POP, delay: 0.15 }}
            >
              <Star className="h-16 w-16 text-gold fill-gold drop-shadow-[0_0_18px_color-mix(in_oklab,var(--gold)_45%,transparent)]" />
            </m.div>
            <m.div
              className="absolute -top-2 -right-3 will-change-transform"
              initial={{ scale: 0, rotate: 30 }}
              animate={{ scale: 1, rotate: 12 }}
              transition={{ ...POP, delay: 0.32 }}
            >
              <Star className="h-6 w-6 text-gold/90 fill-gold/90" />
            </m.div>
            <m.div
              className="absolute -bottom-1 -left-4 will-change-transform"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: -12 }}
              transition={{ ...POP, delay: 0.44 }}
            >
              <Star className="h-5 w-5 text-gold/70 fill-gold/70" />
            </m.div>
          </div>
        </div>

        <m.h2
          className="font-display text-2xl font-extrabold tracking-tight text-foreground mb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', visualDuration: 0.4, bounce: 0.3, delay: 0.2 }}
        >
          Level Up!
        </m.h2>

        {/* The measured value — mono, primary, pops in with overshoot */}
        <m.p
          className="font-mono text-4xl font-black text-primary tabular-nums mb-2 will-change-transform"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...POP, delay: 0.3 }}
        >
          Level {lastResult.level}
        </m.p>

        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="font-mono tabular-nums text-xs text-muted-foreground mb-6">
          +{lastResult.xpEarned} XP earned &middot; {lastResult.totalXP.toLocaleString()} total
        </p>

        {/* Unlock message */}
        {lastResult.level === 3 && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
            Puzzle Creator unlocked! You can now create and publish puzzles.
          </div>
        )}

        <Button
          onClick={onDismiss}
          className="w-full brick-btn bg-gold text-gold-foreground hover:bg-gold font-bold"
        >
          Awesome!
        </Button>
      </m.div>
    </m.div>
  );
}
