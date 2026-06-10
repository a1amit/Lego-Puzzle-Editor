import { useEffect, useState, useMemo } from 'react';
import { m } from 'framer-motion';
import { CONFETTI } from '../../config/sceneConfig';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../ui/shadcn/dialog';
import { Button } from '../ui/shadcn/button';
import { RotateCw, X } from 'lucide-react';

interface CongratulationsPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  puzzleTitle?: string;
  xpEarned?: number;
}

/* ── Lego brick SVG confetti piece ── */
function LegoBrick({ color, style }: { color: string; style: React.CSSProperties }) {
  return (
    <svg
      className="confetti-brick"
      style={style}
      width="20"
      height="16"
      viewBox="0 0 20 16"
      fill="none"
    >
      {/* Brick body */}
      <rect x="0" y="4" width="20" height="12" rx="1.5" fill={color} />
      {/* Studs */}
      <ellipse cx="6" cy="4" rx="3.5" ry="2.5" fill={color} />
      <ellipse cx="14" cy="4" rx="3.5" ry="2.5" fill={color} />
      {/* Stud highlights */}
      <ellipse cx="6" cy="3.2" rx="2" ry="1.2" fill="white" opacity="0.25" />
      <ellipse cx="14" cy="3.2" rx="2" ry="1.2" fill="white" opacity="0.25" />
      {/* Brick highlight */}
      <rect x="0" y="4" width="20" height="3" rx="1" fill="white" opacity="0.15" />
    </svg>
  );
}

/* ── Single Lego stud for the background pattern ── */
function LegoStud({ delay }: { delay: number }) {
  return (
    <div
      className="celebration-stud"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/* ── Lego minifig head (used as a special confetti piece) ── */
function MinifigHead({ color, style }: { color: string; style: React.CSSProperties }) {
  return (
    <svg
      className="confetti-brick"
      style={style}
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
    >
      {/* Head */}
      <rect x="1" y="6" width="14" height="14" rx="2" fill={color} />
      {/* Stud on top */}
      <rect x="5" y="0" width="6" height="7" rx="3" fill={color} />
      {/* Eyes */}
      <circle cx="5.5" cy="12" r="1.5" fill="#1B1B1B" />
      <circle cx="10.5" cy="12" r="1.5" fill="#1B1B1B" />
      {/* Smile */}
      <path d="M5 15.5C5 15.5 8 17.5 11 15.5" stroke="#1B1B1B" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Highlight */}
      <rect x="1" y="6" width="14" height="3" rx="1" fill="white" opacity="0.15" />
    </svg>
  );
}

/** Deterministic pseudo-random (same trick as PuzzleThumbnail) — pure during
 *  render, so the confetti memo stays side-effect free. */
function rand(seed: number) { return ((Math.sin(seed * 9301 + 49297) % 1) + 1) % 1; }

export function CongratulationsPopup({
  isVisible,
  onClose,
  onPlayAgain,
  puzzleTitle,
  xpEarned,
}: CongratulationsPopupProps) {
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'visible'>('hidden');

  // Detect reduced-motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Seeded per-index confetti layout: stable across re-renders and pure
  // during render (no Math.random), with the same varied look every burst.
  const confettiPieces = useMemo(() => {
    // No confetti for reduced-motion users
    if (prefersReducedMotion) return [];
    return Array.from({ length: CONFETTI.particleCount + 10 }).map((_, i) => ({
      left: rand(i * 7 + 1) * 100,
      delay: rand(i * 13 + 2) * 1.8,
      duration: 2.8 + rand(i * 17 + 3) * 1.6, // varied fall speeds = denser-feeling rain
      rotation: rand(i * 19 + 4) * 360,
      scale: 0.55 + rand(i * 23 + 5) * 0.95,
      drift: (rand(i * 29 + 6) - 0.5) * 160,
      color: CONFETTI.colors[i % CONFETTI.colors.length],
      isMinifig: i % 8 === 0, // every 8th piece is a minifig head
    }));
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (isVisible) {
      setPhase('enter');
      const timer = setTimeout(() => setPhase('visible'), 50);
      return () => clearTimeout(timer);
    } else {
      setPhase('hidden');
    }
  }, [isVisible]);

  return (
    <Dialog open={isVisible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="celebration-dialog mx-4 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm p-0 gap-0 border-none overflow-visible bg-transparent shadow-none"
        showCloseButton={false}
      >
        {/* ── Full-viewport confetti layer ── */}
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {phase !== 'hidden' && confettiPieces.map((piece, i) => {
            // NOTE: scale must travel through --scale (read by the brick-fall
            // keyframes) — an inline `transform` would be overridden by the
            // animation and every piece would render at 1x.
            const style = {
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              '--drift': `${piece.drift}px`,
              '--start-rotation': `${piece.rotation}deg`,
              '--scale': piece.scale,
            } as React.CSSProperties;
            return piece.isMinifig ? (
              <MinifigHead key={i} color={piece.color} style={style} />
            ) : (
              <LegoBrick key={i} color={piece.color} style={style} />
            );
          })}
        </div>

        {/* ── Main card ── */}
        <div className={`celebration-card ${phase !== 'hidden' ? 'celebration-card-enter' : ''} ${prefersReducedMotion ? 'motion-reduce' : ''}`}>
          {/* Stud pattern background */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none opacity-[0.06]">
            <div className="grid grid-cols-8 gap-3 p-3">
              {Array.from({ length: 40 }).map((_, i) => (
                <LegoStud key={i} delay={i * 0.04} />
              ))}
            </div>
          </div>

          {/* Top accent bar */}
          <div className="celebration-top-bar">
            <div className="flex-1 h-full bg-lego-red" />
            <div className="flex-1 h-full bg-lego-yellow" />
            <div className="flex-1 h-full bg-lego-green" />
            <div className="flex-1 h-full bg-lego-blue" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <X className="w-3.5 h-3.5 text-foreground/70" />
          </button>

          {/* ── Content ── */}
          <div className="relative z-10 text-center px-8 pt-10 pb-8">
            {/* Animated Lego trophy brick */}
            <div className={prefersReducedMotion ? '' : 'celebration-trophy'}>
              <svg width="64" height="56" viewBox="0 0 64 56" fill="none" className="drop-shadow-lg">
                {/* Main brick body */}
                <rect x="4" y="16" width="56" height="36" rx="4" fill="#F5CD2F" />
                {/* Brick shadow */}
                <rect x="4" y="40" width="56" height="12" rx="4" fill="#D4A800" opacity="0.4" />
                {/* Studs row */}
                <ellipse cx="16" cy="16" rx="7" ry="5" fill="#F5CD2F" />
                <ellipse cx="32" cy="16" rx="7" ry="5" fill="#F5CD2F" />
                <ellipse cx="48" cy="16" rx="7" ry="5" fill="#F5CD2F" />
                {/* Stud highlights */}
                <ellipse cx="16" cy="14" rx="4.5" ry="2.5" fill="white" opacity="0.3" />
                <ellipse cx="32" cy="14" rx="4.5" ry="2.5" fill="white" opacity="0.3" />
                <ellipse cx="48" cy="14" rx="4.5" ry="2.5" fill="white" opacity="0.3" />
                {/* Star on front */}
                <path d="M32 26L35.09 32.18L42 33.18L37 38.04L38.18 45L32 41.68L25.82 45L27 38.04L22 33.18L28.91 32.18L32 26Z" fill="#D01012" opacity="0.9" />
                {/* Top highlight */}
                <rect x="4" y="16" width="56" height="6" rx="3" fill="white" opacity="0.15" />
              </svg>
            </div>

            {/* Title — the SOLVED stamp: slams in oversized and springs to rest.
                MotionConfig reducedMotion="user" strips the transforms (keeps
                the opacity fade) for reduced-motion users automatically. */}
            <DialogTitle className="celebration-title font-display font-extrabold">
              <m.span
                className="inline-block will-change-transform"
                initial={{ opacity: 0, scale: 1.15, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', visualDuration: 0.4, bounce: 0.4, delay: 0.35 }}
              >
                Puzzle <span className="text-primary">Solved!</span>
              </m.span>
            </DialogTitle>

            {puzzleTitle && (
              <p className="celebration-subtitle">
                You completed <strong>"{puzzleTitle}"</strong>
              </p>
            )}

            {/* XP earned — measured value, so mono; the number pops 1 → 1.25 → 1 */}
            {xpEarned != null && xpEarned > 0 && (
              <m.div
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/15 border border-primary/25"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.35, delay: 0.75 }}
              >
                <m.span
                  className="inline-block font-mono text-sm font-bold text-primary tabular-nums"
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ duration: 0.5, times: [0, 0.5, 1], ease: [0.34, 1.56, 0.64, 1], delay: 0.9 }}
                >
                  +{xpEarned} XP
                </m.span>
              </m.div>
            )}

            {/* Divider with studs */}
            <div className="flex items-center justify-center gap-2 my-5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-foreground/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-lego-red shadow-sm" />
              <div className="w-2.5 h-2.5 rounded-full bg-lego-yellow shadow-sm" />
              <div className="w-2.5 h-2.5 rounded-full bg-lego-green shadow-sm" />
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-foreground/10" />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={onPlayAgain}
                className="brick-btn bg-gold text-gold-foreground hover:bg-gold font-bold gap-2 px-5"
              >
                <RotateCw className="w-4 h-4" />
                Play Again
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="celebration-btn-secondary"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Corner Lego studs (bigger, with inner ring for realism) */}
          {[
            // Smaller negative offsets at <sm so the studs don't clip past the
            // viewport edge on narrow phones; full pop-out on sm+.
            { pos: 'top-0 left-0 sm:-top-3.5 sm:-left-3.5', color: 'bg-lego-red' },
            { pos: 'top-0 right-0 sm:-top-3.5 sm:-right-3.5', color: 'bg-lego-blue' },
            { pos: 'bottom-0 left-0 sm:-bottom-3.5 sm:-left-3.5', color: 'bg-lego-yellow' },
            { pos: 'bottom-0 right-0 sm:-bottom-3.5 sm:-right-3.5', color: 'bg-lego-green' },
          ].map(({ pos, color }, i) => (
            <div key={i} className={`absolute ${pos} w-8 h-8 ${color} rounded-full border-2 border-background shadow-lg ${prefersReducedMotion ? '' : 'celebration-corner-stud'}`} style={prefersReducedMotion ? undefined : { animationDelay: `${0.6 + i * 0.1}s` }}>
              <div className="absolute inset-1.5 rounded-full border border-white/20" />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
