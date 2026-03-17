import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from './shadcn/button';
import { useGamificationStore } from '../../store/gamificationStore';
import { getLevelTitle } from '../../store/xpUtils';

interface LevelUpPopupProps {
  onDismiss: () => void;
}

export function LevelUpPopup({ onDismiss }: LevelUpPopupProps) {
  const lastResult = useGamificationStore((s) => s.lastResult);
  const [phase, setPhase] = useState<'enter' | 'visible'>('enter');

  useEffect(() => {
    const timer = setTimeout(() => setPhase('visible'), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!lastResult) return null;

  const title = getLevelTitle(lastResult.level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`relative bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl transition-all duration-300 ${
          phase === 'enter' ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Stars decoration */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Star className="h-16 w-16 text-yellow-400 fill-yellow-400" />
            <div className="absolute -top-2 -right-2">
              <Star className="h-6 w-6 text-yellow-300 fill-yellow-300 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -left-3">
              <Star className="h-5 w-5 text-yellow-200 fill-yellow-200 animate-pulse delay-100" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-1">Level Up!</h2>
        <p className="text-3xl font-black text-primary mb-2">Level {lastResult.level}</p>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-6">
          +{lastResult.xpEarned} XP earned &middot; {lastResult.totalXP.toLocaleString()} total
        </p>

        {/* Unlock message */}
        {lastResult.level === 3 && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
            Puzzle Creator unlocked! You can now create and publish puzzles.
          </div>
        )}

        <Button onClick={onDismiss} className="w-full">
          Awesome!
        </Button>
      </div>
    </div>
  );
}
