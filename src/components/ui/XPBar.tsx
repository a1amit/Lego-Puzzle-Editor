import { useUserStore } from '../../store/userStore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './shadcn/tooltip';

export function XPBar({ compact = false }: { compact?: boolean }) {
  const profile = useUserStore((s) => s.profile);
  const levelTitle = useUserStore((s) => s.levelTitle);
  const levelProgress = useUserStore((s) => s.levelProgress);

  if (!profile) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[10px] font-bold text-primary">Lv.{profile.level}</span>
        <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(100, levelProgress * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/50 border border-border cursor-default">
          {/* Level badge */}
          <span className="text-xs font-bold text-primary min-w-[2ch] text-center">
            {profile.level}
          </span>

          {/* Progress bar */}
          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, levelProgress * 100)}%` }}
            />
          </div>

          {/* XP label */}
          <span className="text-[10px] text-muted-foreground font-medium">
            {profile.xp.toLocaleString()}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{levelTitle}</p>
        <p className="text-xs text-muted-foreground">{profile.xp.toLocaleString()} XP &middot; Level {profile.level}</p>
      </TooltipContent>
    </Tooltip>
  );
}
