import { useState, useCallback } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Button } from './shadcn/button';
import { ChevronRight, ChevronLeft, Puzzle, Package, MousePointerClick, X } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  target: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Choose a Puzzle',
    description: 'Click the puzzle dropdown in the header to pick from built-in samples or create your own.',
    icon: <Puzzle className="w-6 h-6 text-lego-red" />,
    target: 'puzzle-selector',
  },
  {
    title: 'Select a Brick',
    description: 'Pick a brick from the inventory panel on the right. Press R to rotate it before placing.',
    icon: <Package className="w-6 h-6 text-lego-blue" />,
    target: 'inventory',
  },
  {
    title: 'Place on the Board',
    description: 'Click on the board to place your brick. Match all validation rules to solve the puzzle!',
    icon: <MousePointerClick className="w-6 h-6 text-lego-green" />,
    target: 'board',
  },
];

interface OnboardingOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function OnboardingOverlay({ isVisible, onDismiss }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      onDismiss();
    }
  }, [step, onDismiss]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  }, [step]);

  const handleSkip = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  if (!isVisible) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

          {/* Card */}
          <m.div
            className="relative z-10 w-[90vw] max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 z-10 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              aria-label="Skip onboarding"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Step indicator dots */}
            <div className="flex items-center justify-center gap-2 pt-4 pb-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Content with AnimatePresence for step transitions */}
            <div className="px-6 pb-2 pt-2 min-h-[180px] flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <m.div
                  key={step}
                  className="flex flex-col items-center text-center"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    {currentStep.icon}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {currentStep.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                    {currentStep.description}
                  </p>
                </m.div>
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handlePrev}
                disabled={step === 0}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>

              <span className="text-xs text-muted-foreground tabular-nums">
                {step + 1} / {STEPS.length}
              </span>

              <Button
                size="sm"
                className="text-xs gap-1"
                onClick={handleNext}
              >
                {isLast ? 'Get Started' : 'Next'}
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
