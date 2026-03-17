import { Sparkles, CheckCircle } from 'lucide-react';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';

interface FeaturedSectionProps {
  onPuzzleClick: (slug: string) => void;
  solvedSlugs?: Set<string>;
}

export function FeaturedSection({ onPuzzleClick, solvedSlugs }: FeaturedSectionProps) {
  // Hand-picked featured puzzles
  const featuredIds = ['slider', 'pen-challenge', 'nonogram', 'binary'];
  const allPuzzles = PUZZLE_CATEGORIES.flatMap(c => c.puzzles);
  const featured = featuredIds.map(id => allPuzzles.find(p => p.id === id)).filter(Boolean) as typeof allPuzzles;

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
          {featured.map((p) => {
            const isSolved = solvedSlugs?.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => onPuzzleClick(p.id)}
                className={`group relative p-4 rounded-xl bg-card/50 backdrop-blur border transition-all text-left ${
                  isSolved ? 'border-success/30' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {p.puzzle.inventory?.[0]?.color && (
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.puzzle.inventory[0].color }} />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{p.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {p.puzzle.board.dimensions.width}x{p.puzzle.board.dimensions.height} &middot; {p.is3D ? '3D' : '2D'}
                  </span>
                  {isSolved && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                      <CheckCircle className="h-3 w-3" />Solved
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
