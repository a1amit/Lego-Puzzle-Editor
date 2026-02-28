import { useEffect, useState, useMemo } from 'react';
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

export function CongratulationsPopup({
  isVisible,
  onClose,
  onPlayAgain,
  puzzleTitle
}: CongratulationsPopupProps) {
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'visible'>('hidden');

  // Detect reduced-motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Pre-compute random confetti positions so they don't change on re-render
  const confettiPieces = useMemo(() => {
    // No confetti for reduced-motion users
    if (prefersReducedMotion) return [];
    return Array.from({ length: CONFETTI.particleCount + 10 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.8,
      rotation: Math.random() * 360,
      scale: 0.6 + Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 120,
      color: CONFETTI.colors[i % CONFETTI.colors.length],
      isMinifig: i % 8 === 0, // every 8th piece is a minifig head
    }));
  },
    [isVisible, prefersReducedMotion] // eslint-disable-line react-hooks/exhaustive-deps
  );

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
        className="celebration-dialog max-w-sm p-0 gap-0 border-none overflow-visible bg-transparent shadow-none"
        showCloseButton={false}
      >
        {/* ── Full-viewport confetti layer ── */}
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {phase !== 'hidden' && confettiPieces.map((piece, i) =>
            piece.isMinifig ? (
              <MinifigHead
                key={i}
                color={piece.color}
                style={{
                  left: `${piece.left}%`,
                  animationDelay: `${piece.delay}s`,
                  '--drift': `${piece.drift}px`,
                  '--start-rotation': `${piece.rotation}deg`,
                  transform: `scale(${piece.scale})`,
                } as React.CSSProperties}
              />
            ) : (
              <LegoBrick
                key={i}
                color={piece.color}
                style={{
                  left: `${piece.left}%`,
                  animationDelay: `${piece.delay}s`,
                  '--drift': `${piece.drift}px`,
                  '--start-rotation': `${piece.rotation}deg`,
                  transform: `scale(${piece.scale})`,
                } as React.CSSProperties}
              />
            )
          )}
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

            {/* Title with staggered letter animation */}
            <DialogTitle className="celebration-title">
              {prefersReducedMotion ? (
                <span>Puzzle Solved!</span>
              ) : (
                <>
                  <span className="celebration-letter" style={{ animationDelay: '0.3s' }}>P</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.35s' }}>u</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.4s' }}>z</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.45s' }}>z</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.5s' }}>l</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.55s' }}>e</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.6s' }}>&nbsp;</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.65s' }}>S</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.7s' }}>o</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.75s' }}>l</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.8s' }}>v</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.85s' }}>e</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.9s' }}>d</span>
                  <span className="celebration-letter" style={{ animationDelay: '0.95s' }}>!</span>
                </>
              )}
            </DialogTitle>

            {puzzleTitle && (
              <p className="celebration-subtitle">
                You completed <strong>"{puzzleTitle}"</strong>
              </p>
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
                className="celebration-btn-primary"
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
            { pos: '-top-3.5 -left-3.5', color: 'bg-lego-red' },
            { pos: '-top-3.5 -right-3.5', color: 'bg-lego-blue' },
            { pos: '-bottom-3.5 -left-3.5', color: 'bg-lego-yellow' },
            { pos: '-bottom-3.5 -right-3.5', color: 'bg-lego-green' },
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
