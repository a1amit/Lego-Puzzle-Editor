import { useEffect, useState } from 'react';
import { CONFETTI } from '../../config/sceneConfig';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../ui/shadcn/dialog';
import { Button } from '../ui/shadcn/button';
import { Trophy, RotateCw } from 'lucide-react';

interface CongratulationsPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  puzzleTitle?: string;
}

export function CongratulationsPopup({
  isVisible,
  onClose,
  onPlayAgain,
  puzzleTitle
}: CongratulationsPopupProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(isVisible);
  }, [isVisible]);

  return (
    <Dialog open={isVisible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 border-2 border-success/50 overflow-visible bg-gradient-to-br from-card to-background">
        {/* Confetti particles */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
            {Array.from({ length: CONFETTI.particleCount }).map((_, i) => (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: CONFETTI.colors[i % CONFETTI.colors.length],
                }}
              />
            ))}
          </div>
        )}

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-lg bg-success/10 animate-celebration-glow pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center p-8">
          {/* Trophy */}
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center animate-float">
            <Trophy className="w-10 h-10 text-success" />
          </div>

          <DialogTitle className="text-3xl font-bold text-foreground mb-2">
            Congratulations!
          </DialogTitle>

          <p className="text-success text-lg mb-2">
            Puzzle Complete!
          </p>

          {puzzleTitle && (
            <p className="text-muted-foreground text-sm mb-6">
              You solved "{puzzleTitle}"
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <Button onClick={onPlayAgain} className="bg-success hover:bg-success/80 text-success-foreground gap-2">
              <RotateCw className="w-4 h-4" />
              Play Again
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Corner decorations - Lego studs */}
        <div className="absolute -top-3 -left-3 w-7 h-7 bg-lego-red rounded-full border-2 border-background shadow-lg" />
        <div className="absolute -top-3 -right-3 w-7 h-7 bg-lego-blue rounded-full border-2 border-background shadow-lg" />
        <div className="absolute -bottom-3 -left-3 w-7 h-7 bg-lego-yellow rounded-full border-2 border-background shadow-lg" />
        <div className="absolute -bottom-3 -right-3 w-7 h-7 bg-lego-green rounded-full border-2 border-background shadow-lg" />
      </DialogContent>
    </Dialog>
  );
}
