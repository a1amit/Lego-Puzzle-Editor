import { useEffect, useState, useCallback } from 'react';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleTitle?: string;
}

// Confetti particle type
interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle' | 'brick';
}

// LEGO-themed colors
const CONFETTI_COLORS = [
  '#D01012', // Red
  '#0055BF', // Blue
  '#287F46', // Green
  '#F5CD2F', // Yellow
  '#FF6B00', // Orange
  '#8b5cf6', // Purple (accent)
];

// Generate confetti particles
function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 360,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    speedX: (Math.random() - 0.5) * 2,
    speedY: 1.5 + Math.random() * 2,
    rotationSpeed: (Math.random() - 0.5) * 6,
    shape: (['rect', 'circle', 'brick'] as const)[Math.floor(Math.random() * 3)],
  }));
}

// Confetti component
function Confetti({ isActive }: { isActive: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    // Initial burst - smaller amount
    setParticles(generateParticles(30));

    // Stop adding new particles after 5 seconds
    let addNewParticles = true;
    const stopTimer = setTimeout(() => {
      addNewParticles = false;
    }, 5000);

    // Animation loop
    const interval = setInterval(() => {
      setParticles(prev => {
        const updated = prev
          .map(p => ({
            ...p,
            x: p.x + p.speedX,
            y: p.y + p.speedY,
            rotation: p.rotation + p.rotationSpeed,
            speedY: p.speedY + 0.08, // gentler gravity
          }))
          .filter(p => p.y < 120); // Remove off-screen particles

        // Add new particles less frequently, only for first 5 seconds
        if (addNewParticles && updated.length < 15 && Math.random() > 0.85) {
          return [...updated, ...generateParticles(3)];
        }
        return updated;
      });
    }, 60);

    return () => {
      clearInterval(interval);
      clearTimeout(stopTimer);
    };
  }, [isActive]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[60]">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `rotate(${p.rotation}deg)`,
            transition: 'none',
          }}
        >
          {p.shape === 'brick' ? (
            // Mini LEGO brick shape
            <svg width={p.size * 1.5} height={p.size} viewBox="0 0 24 16">
              <rect x="0" y="4" width="24" height="12" rx="1" fill={p.color} />
              <ellipse cx="8" cy="3" rx="4" ry="2" fill={p.color} />
              <ellipse cx="16" cy="3" rx="4" ry="2" fill={p.color} />
            </svg>
          ) : p.shape === 'circle' ? (
            <div
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: '50%',
              }}
            />
          ) : (
            <div
              style={{
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                borderRadius: 2,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Trophy/celebration icon
function TrophyIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Trophy cup */}
      <path
        d="M16 8h32v4c0 12-6 22-16 26-10-4-16-14-16-26V8z"
        fill="url(#gold-gradient)"
        stroke="#B8860B"
        strokeWidth="2"
      />
      {/* Left handle */}
      <path
        d="M16 12H10c-2 0-4 2-4 4v4c0 4 3 8 8 8h2"
        stroke="#FFD700"
        strokeWidth="3"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M48 12h6c2 0 4 2 4 4v4c0 4-3 8-8 8h-2"
        stroke="#FFD700"
        strokeWidth="3"
        fill="none"
      />
      {/* Base */}
      <rect x="24" y="40" width="16" height="4" fill="#FFD700" />
      <rect x="20" y="44" width="24" height="6" rx="1" fill="#B8860B" />
      {/* Star */}
      <path
        d="M32 16l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6-4.9 2.6.9-5.3-4-3.9 5.5-.8z"
        fill="#FFF"
        opacity="0.9"
      />
      {/* Gradient definition */}
      <defs>
        <linearGradient id="gold-gradient" x1="16" y1="8" x2="48" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" />
          <stop offset="0.5" stopColor="#FFA500" />
          <stop offset="1" stopColor="#FFD700" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Lego brick celebration icon
function LegoCelebrationIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      {/* Stacked bricks */}
      <rect x="8" y="28" width="32" height="12" rx="2" fill="#0055BF" />
      <rect x="12" y="18" width="24" height="12" rx="2" fill="#D01012" />
      <rect x="16" y="8" width="16" height="12" rx="2" fill="#287F46" />
      {/* Studs */}
      <ellipse cx="16" cy="26" rx="3" ry="1.5" fill="#0055BF" stroke="rgba(255,255,255,0.5)" />
      <ellipse cx="32" cy="26" rx="3" ry="1.5" fill="#0055BF" stroke="rgba(255,255,255,0.5)" />
      <ellipse cx="24" cy="16" rx="3" ry="1.5" fill="#D01012" stroke="rgba(255,255,255,0.5)" />
      <ellipse cx="24" cy="6" rx="3" ry="1.5" fill="#287F46" stroke="rgba(255,255,255,0.5)" />
      {/* Sparkles */}
      <circle cx="6" cy="12" r="2" fill="#F5CD2F" className="animate-pulse" />
      <circle cx="42" cy="16" r="2" fill="#F5CD2F" className="animate-pulse" />
      <circle cx="44" cy="8" r="1.5" fill="#FFD700" className="animate-pulse" />
    </svg>
  );
}

export function CompletionModal({ isOpen, onClose, puzzleTitle }: CompletionModalProps) {
  const [showContent, setShowContent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Stagger animations
      const timer1 = setTimeout(() => setShowContent(true), 100);
      const timer2 = setTimeout(() => setShowConfetti(true), 200);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setShowContent(false);
      setShowConfetti(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setShowContent(false);
    setShowConfetti(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Confetti layer */}
      <Confetti isActive={showConfetti} />

      {/* Modal backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal content */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className={`relative bg-gradient-to-br from-editor-sidebar via-editor-bg to-editor-sidebar border-2 border-editor-success/50 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 pointer-events-auto transform transition-all duration-500 ${
            showContent
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-8'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-editor-success/10 rounded-2xl blur-xl -z-10" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-editor-border/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Trophy/celebration header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-2xl animate-pulse" />
              <TrophyIcon className="w-20 h-20 relative animate-bounce" />
            </div>

            <h2 className="font-display text-3xl font-bold text-white mb-2">
              Puzzle Complete!
            </h2>

            {puzzleTitle && (
              <p className="text-editor-accent font-medium text-lg">
                {puzzleTitle}
              </p>
            )}
          </div>

          {/* Success message */}
          <div className="bg-editor-success/10 border border-editor-success/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-6 h-6 text-editor-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-editor-success font-medium">All validation rules passed!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Great job! You've successfully solved the puzzle.
                </p>
              </div>
            </div>
          </div>

          {/* Decorative brick stack */}
          <div className="flex justify-center mb-6">
            <LegoCelebrationIcon className="w-16 h-16" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-editor-border/50 hover:bg-editor-border text-white rounded-xl font-display font-medium transition-colors"
            >
              Keep Building
            </button>
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-editor-success hover:bg-editor-success/80 text-white rounded-xl font-display font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Awesome!
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
