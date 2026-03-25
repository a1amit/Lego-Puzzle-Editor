import { useState } from 'react';
import { getLevelTier, getAllTiers, xpToReachLevel, type LevelTier } from '../../store/xpUtils';

// ── Inline SVG icons for each tier ──────────────────────────────────

function TierIcon({ icon, size = 32 }: { icon: LevelTier['icon']; size?: number }) {
  const s = size;
  switch (icon) {
    case 'brick':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="2" y="10" width="28" height="18" rx="3" fill="currentColor" opacity="0.9" />
          <ellipse cx="10" cy="10" rx="5" ry="3.5" fill="currentColor" />
          <ellipse cx="22" cy="10" rx="5" ry="3.5" fill="currentColor" />
          <ellipse cx="10" cy="8.5" rx="3" ry="1.5" fill="white" opacity="0.25" />
          <ellipse cx="22" cy="8.5" rx="3" ry="1.5" fill="white" opacity="0.25" />
          <rect x="2" y="10" width="28" height="4" rx="2" fill="white" opacity="0.12" />
        </svg>
      );
    case 'wall':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="2" y="18" width="12" height="10" rx="2" fill="currentColor" opacity="0.8" />
          <rect x="18" y="18" width="12" height="10" rx="2" fill="currentColor" opacity="0.8" />
          <rect x="8" y="8" width="16" height="12" rx="2" fill="currentColor" />
          <ellipse cx="13" cy="8" rx="3" ry="2" fill="currentColor" />
          <ellipse cx="19" cy="8" rx="3" ry="2" fill="currentColor" />
          <rect x="8" y="8" width="16" height="3" rx="1.5" fill="white" opacity="0.15" />
        </svg>
      );
    case 'house':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 4L3 16H7V28H25V16H29L16 4Z" fill="currentColor" />
          <rect x="12" y="18" width="8" height="10" rx="1" fill="white" opacity="0.2" />
          <path d="M16 4L3 16H7L16 7.5L25 16H29L16 4Z" fill="white" opacity="0.15" />
        </svg>
      );
    case 'castle':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="4" y="14" width="24" height="16" rx="2" fill="currentColor" />
          <rect x="4" y="8" width="5" height="8" rx="1" fill="currentColor" />
          <rect x="23" y="8" width="5" height="8" rx="1" fill="currentColor" />
          <rect x="12" y="4" width="8" height="12" rx="1" fill="currentColor" />
          <rect x="13" y="20" width="6" height="10" rx="3" fill="white" opacity="0.2" />
          <circle cx="5" cy="8" r="1.5" fill="white" opacity="0.3" />
          <circle cx="27" cy="8" r="1.5" fill="white" opacity="0.3" />
          <circle cx="16" cy="4" r="1.5" fill="white" opacity="0.3" />
          <rect x="4" y="14" width="24" height="3" rx="1" fill="white" opacity="0.1" />
        </svg>
      );
    case 'tower':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="10" y="10" width="12" height="20" rx="2" fill="currentColor" />
          <rect x="8" y="4" width="16" height="8" rx="2" fill="currentColor" />
          <polygon points="16,0 8,4 24,4" fill="currentColor" />
          <rect x="13" y="20" width="6" height="10" rx="3" fill="white" opacity="0.2" />
          <circle cx="16" cy="14" r="2" fill="white" opacity="0.25" />
          <rect x="8" y="4" width="16" height="2" rx="1" fill="white" opacity="0.15" />
        </svg>
      );
    case 'crown':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M4 24L2 10L10 16L16 6L22 16L30 10L28 24Z" fill="currentColor" />
          <rect x="4" y="24" width="24" height="4" rx="2" fill="currentColor" />
          <circle cx="10" cy="22" r="1.5" fill="white" opacity="0.4" />
          <circle cx="16" cy="21" r="2" fill="white" opacity="0.4" />
          <circle cx="22" cy="22" r="1.5" fill="white" opacity="0.4" />
          <path d="M4 24L2 10L10 16L16 6L22 16L30 10L28 24Z" fill="white" opacity="0.08" />
        </svg>
      );
    case 'star':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 2L20.09 10.36L29.27 11.64L22.63 18.1L24.18 27.24L16 22.94L7.82 27.24L9.37 18.1L2.73 11.64L11.91 10.36L16 2Z" fill="currentColor" />
          <path d="M16 2L20.09 10.36L29.27 11.64L22.63 18.1L24.18 27.24L16 22.94L7.82 27.24L9.37 18.1L2.73 11.64L11.91 10.36L16 2Z" fill="white" opacity="0.15" />
          <path d="M16 6L19 12L26 13L21 17.5L22.2 24L16 20.7L9.8 24L11 17.5L6 13L13 12L16 6Z" fill="white" opacity="0.1" />
        </svg>
      );
  }
}

// ── Single title card (current rank) ────────────────────────────────

interface LevelTitleCardProps {
  level: number;
  xp: number;
  /** Override the displayed tier (for selected banner) */
  overrideTier?: string | null;
  className?: string;
}

export function LevelTitleCard({ level, xp, overrideTier, className = '' }: LevelTitleCardProps) {
  const actualTier = getLevelTier(level);
  const allTiers = getAllTiers();
  const displayTier = overrideTier
    ? allTiers.find(t => t.title === overrideTier) ?? actualTier
    : actualTier;

  const currentLevelXP = xpToReachLevel(level);
  const nextLevelXP = xpToReachLevel(level + 1);
  const rawProgress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;
  const progress = xp > 0 ? Math.max(3, rawProgress) : 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${displayTier.gradient} p-5 ${className}`}>
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }} />

      {/* Glow effect */}
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: displayTier.accent }}
      />

      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: displayTier.accent + '20', color: displayTier.accent }}
        >
          <TierIcon icon={displayTier.icon} size={32} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className={`text-lg font-bold ${displayTier.textColor}`}>{displayTier.title}</h3>
            <span className="text-xs text-white/40">Lv.{level}</span>
          </div>
          <p className="text-xs text-white/50 italic mt-0.5">{displayTier.subtitle}</p>

          {/* XP progress bar */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] text-white/40 mb-1">
              <span>{xp.toLocaleString()} XP</span>
              <span>{nextLevelXP.toLocaleString()} XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, progress)}%`,
                  backgroundColor: displayTier.accent,
                  boxShadow: `0 0 8px ${displayTier.accent}60`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── All tiers roadmap ───────────────────────────────────────────────

interface TierRoadmapProps {
  currentLevel: number;
  /** Currently selected tier title (persisted choice) */
  selectedTier?: string | null;
  /** Called when user picks a tier as their banner */
  onSelectTier?: (tierTitle: string | null) => void | Promise<void>;
  /** Is this the user's own profile (show set button) */
  isOwnProfile?: boolean;
  className?: string;
}

export function TierRoadmap({ currentLevel, selectedTier, onSelectTier, isOwnProfile, className = '' }: TierRoadmapProps) {
  const tiers = getAllTiers();
  const [previewTier, setPreviewTier] = useState<LevelTier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className={className}>
      <h2 className="text-lg font-semibold text-foreground mb-3">Rank Roadmap</h2>

      {/* Preview banner */}
      {previewTier && (
        <div className="mb-3 space-y-2">
          <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${previewTier.gradient} p-4`}>
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: previewTier.accent }}
            />
            <div className="relative flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: previewTier.accent + '20', color: previewTier.accent }}
              >
                <TierIcon icon={previewTier.icon} size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-bold ${previewTier.textColor}`}>{previewTier.title}</h3>
                <p className="text-xs text-white/50 italic">{previewTier.subtitle}</p>
              </div>
              {isOwnProfile && onSelectTier && (
                <button
                  disabled={isSaving || selectedTier === previewTier.title}
                  onClick={async () => {
                    setIsSaving(true);
                    await onSelectTier(previewTier.title);
                    setIsSaving(false);
                    setPreviewTier(null);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                    selectedTier === previewTier.title
                      ? 'bg-white/10 text-white/50 cursor-default'
                      : 'bg-white/15 text-white/80 hover:bg-white/25'
                  }`}
                >
                  {isSaving ? 'Saving...' : selectedTier === previewTier.title ? 'Current banner' : 'Set as banner'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tiers.map((tier, i) => {
          const isReached = currentLevel >= tier.minLevel;
          const isCurrent = currentLevel >= tier.minLevel &&
            (i === tiers.length - 1 || currentLevel < tiers[i + 1].minLevel);
          const xpNeeded = xpToReachLevel(tier.minLevel);
          const isSelected = selectedTier === tier.title;
          const isPreviewing = previewTier?.title === tier.title;

          return (
            <div
              key={tier.title}
              onClick={() => isReached && setPreviewTier(isPreviewing ? null : tier)}
              className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isReached ? 'cursor-pointer' : ''
              } ${
                isPreviewing
                  ? `bg-gradient-to-r ${tier.gradient} border-transparent ring-2`
                  : isCurrent
                    ? `bg-gradient-to-r ${tier.gradient} border-transparent ring-1`
                    : isReached
                      ? 'bg-card/80 border-border hover:border-primary/30'
                      : 'bg-card/30 border-border/50 opacity-60'
              }`}
              style={isPreviewing || isCurrent ? { '--tw-ring-color': tier.accent + '40' } as React.CSSProperties : undefined}
            >
              {/* Icon */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isReached ? '' : 'grayscale opacity-50'
                }`}
                style={{ color: tier.accent }}
              >
                <TierIcon icon={tier.icon} size={24} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isPreviewing || isCurrent ? tier.textColor : isReached ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {tier.title}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white/70">Current</span>
                  )}
                  {isSelected && !isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">Banner</span>
                  )}
                  {isReached && !isCurrent && !isSelected && (
                    <span className="text-[10px] text-muted-foreground">Reached</span>
                  )}
                </div>
                <p className={`text-xs ${isPreviewing || isCurrent ? 'text-white/50' : 'text-muted-foreground'}`}>
                  Level {tier.minLevel}+ &middot; {xpNeeded.toLocaleString()} XP
                </p>
              </div>

              {/* Checkmark or lock */}
              <div className="shrink-0">
                {isReached ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill={tier.accent} opacity="0.2" />
                    <path d="M5 8L7 10L11 6" stroke={tier.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground/40">
                    <rect x="5" y="3" width="6" height="6" rx="3" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    <rect x="4" y="7" width="8" height="7" rx="1.5" fill="currentColor" opacity="0.3" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
