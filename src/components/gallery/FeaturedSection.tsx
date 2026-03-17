import { Sparkles } from 'lucide-react';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';

interface FeaturedSectionProps {
  onPuzzleClick: (slug: string) => void;
}

export function FeaturedSection({ onPuzzleClick }: FeaturedSectionProps) {
  // Pick a few highlights from local puzzles for the hero
  const featured = PUZZLE_CATEGORIES.flatMap(c => c.puzzles).slice(0, 4);

  return (
    <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Featured Puzzles</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Try these hand-picked challenges
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {featured.map((p) => (
            <button
              key={p.id}
              onClick={() => onPuzzleClick(p.id)}
              className="group p-4 rounded-xl bg-card/50 backdrop-blur border border-border hover:border-primary/40 transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                {p.puzzle.inventory?.[0]?.color && (
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.puzzle.inventory[0].color }} />
                )}
                <span className="text-sm font-medium text-foreground truncate">{p.label}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {p.puzzle.board.dimensions.width}x{p.puzzle.board.dimensions.height} &middot; {p.is3D ? '3D' : '2D'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
