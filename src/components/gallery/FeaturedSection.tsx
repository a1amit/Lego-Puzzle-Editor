import { Sparkles, CheckCircle, Play } from 'lucide-react';
import { Button } from '../ui/shadcn/button';
import { PuzzleThumbnail } from './PuzzleThumbnail';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';

interface FeaturedSectionProps {
  onPuzzleClick: (slug: string) => void;
  solvedSlugs?: Set<string>;
}

export function FeaturedSection({ onPuzzleClick, solvedSlugs }: FeaturedSectionProps) {
  const featuredIds = ['slider', 'pen-challenge', 'nonogram', 'binary'];
  const allPuzzles = PUZZLE_CATEGORIES.flatMap(c => c.puzzles);
  const featured = featuredIds.map(id => allPuzzles.find(p => p.id === id)).filter(Boolean) as typeof allPuzzles;
  const hero = featured[0];
  const rest = featured.slice(1);

  return (
    <div className="relative overflow-hidden">
      {/* Background glow — rich blue like reference */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-[oklch(0.30_0.10_250_/_0.08)]" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-primary/8 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[200px] bg-[oklch(0.40_0.15_280_/_0.06)] rounded-full blur-[80px]" />

      <div className="relative px-4 sm:px-6 py-8 sm:py-10">
        {/* Hero puzzle */}
        {hero && (
          <div
            className="relative rounded-2xl overflow-hidden mb-6 cursor-pointer group border border-primary/15"
            onClick={() => onPuzzleClick(hero.id)}
          >
            {/* Hero background gradient — richer, more saturated */}
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.15_0.06_250)] via-[oklch(0.18_0.07_250)] to-[oklch(0.22_0.10_260)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            {/* Decorative grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
              {/* Left: Puzzle preview */}
              <div className="relative w-32 h-32 sm:w-44 sm:h-44 rounded-xl bg-background/40 flex items-center justify-center overflow-hidden shrink-0 border border-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
                <PuzzleThumbnail
                  dimensions={hero.puzzle.board.dimensions}
                  viewMode={hero.is3D ? '3D' : '2D'}
                  className="opacity-70 group-hover:opacity-90 transition-opacity scale-125"
                />
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-10 w-10 text-primary drop-shadow-lg" />
                </div>
              </div>

              {/* Right: Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold drop-shadow-sm">Featured Puzzle</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow-sm">
                  {hero.label}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {hero.puzzle.board.dimensions.width}x{hero.puzzle.board.dimensions.height} board &middot; {hero.is3D ? '3D' : '2D'} mode
                  {solvedSlugs?.has(hero.id) && (
                    <span className="inline-flex items-center gap-1 ml-2 text-success font-semibold">
                      <CheckCircle className="h-3.5 w-3.5" /> Solved
                    </span>
                  )}
                </p>
                <Button
                  size="sm"
                  className="gap-2 bg-gold text-gold-foreground hover:bg-gold/90 font-semibold"
                  onClick={(e) => { e.stopPropagation(); onPuzzleClick(hero.id); }}
                >
                  <Play className="h-4 w-4" />
                  Play Now
                </Button>
              </div>
            </div>

            {/* Decorative accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-lego-red via-lego-yellow via-lego-green to-lego-blue" />
          </div>
        )}

        {/* Featured grid */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold text-foreground">More Featured</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {rest.map((p) => {
            const isSolved = solvedSlugs?.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => onPuzzleClick(p.id)}
                className={`group relative flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur border transition-all text-left ${
                  isSolved ? 'border-success/30' : 'border-border hover:border-primary/40 hover:bg-card'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                  <PuzzleThumbnail
                    dimensions={p.puzzle.board.dimensions}
                    viewMode={p.is3D ? '3D' : '2D'}
                    className="opacity-60 group-hover:opacity-80 scale-150"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{p.label}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.puzzle.board.dimensions.width}x{p.puzzle.board.dimensions.height}</span>
                    <span>&middot;</span>
                    <span>{p.is3D ? '3D' : '2D'}</span>
                    {isSolved && (
                      <span className="flex items-center gap-0.5 text-success font-semibold ml-auto">
                        <CheckCircle className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
