import { useEffect, useState } from 'react';

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
        if (isVisible) {
            setShowConfetti(true);
            // Auto-dismiss after 10 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 10000);
            return () => clearTimeout(timer);
        } else {
            setShowConfetti(false);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Confetti particles */}
            {showConfetti && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <div
                            key={i}
                            className="confetti-particle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                backgroundColor: ['#D01012', '#0055BF', '#F5CD2F', '#287F46', '#FE8A18', '#9B5FC0'][i % 6],
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Popup card */}
            <div
                className="relative bg-gradient-to-br from-editor-sidebar to-editor-bg border-2 border-editor-success rounded-2xl p-8 max-w-md mx-4 animate-popup-bounce shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-editor-success/20 animate-celebration-glow" />

                {/* Content */}
                <div className="relative z-10 text-center">
                    {/* Trophy icon */}
                    <div className="text-6xl mb-4 animate-float">🏆</div>

                    {/* Title */}
                    <h2 className="font-display text-3xl font-bold text-white mb-2">
                        Congratulations!
                    </h2>

                    {/* Subtitle */}
                    <p className="text-editor-success text-lg mb-2">
                        Puzzle Complete!
                    </p>

                    {puzzleTitle && (
                        <p className="text-gray-400 text-sm mb-6">
                            You solved "{puzzleTitle}"
                        </p>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onPlayAgain}
                            className="px-6 py-3 bg-editor-success hover:bg-editor-success/80 text-white font-display font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                        >
                            🔄 Play Again
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-editor-border hover:bg-editor-border/80 text-gray-300 font-display rounded-lg transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Corner decorations - Lego studs */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-lego-red rounded-full border-2 border-white/30 shadow-lg" />
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-lego-blue rounded-full border-2 border-white/30 shadow-lg" />
                <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-lego-yellow rounded-full border-2 border-white/30 shadow-lg" />
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-lego-green rounded-full border-2 border-white/30 shadow-lg" />
            </div>
        </div>
    );
}
