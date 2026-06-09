import { m } from 'framer-motion';
import { Sparkles, CheckCircle, Play } from 'lucide-react';
import { Button } from '../ui/shadcn/button';
import { PuzzleThumbnail } from './PuzzleThumbnail';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';

interface FeaturedSectionProps {
  onPuzzleClick: (slug: string) => void;
  solvedSlugs?: Set<string>;
}

/* The Build-Up: masthead words drop in one by one, like bricks snapping down */
const masthead = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const wordDrop = {
  hidden: { opacity: 0, y: -34, rotate: -4 },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { type: 'spring' as const, visualDuration: 0.5, bounce: 0.45 },
  },
};
const riseIn = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, visualDuration: 0.45, bounce: 0.2 } },
};

export function FeaturedSection({ onPuzzleClick, solvedSlugs }: FeaturedSectionProps) {
  const featuredIds = ['slider', 'pen-challenge', 'nonogram', 'binary'];
  const allPuzzles = PUZZLE_CATEGORIES.flatMap(c => c.puzzles);
  const featured = featuredIds.map(id => allPuzzles.find(p => p.id === id)).filter(Boolean) as typeof allPuzzles;
  const hero = featured[0];
  const rest = featured.slice(1);

  return (
    <div className="relative overflow-hidden">
      <div className="relative px-4 sm:px-6 pt-10 sm:pt-14 pb-8">
        {/* Masthead — the brand moment */}
        <m.div variants={masthead} initial="hidden" animate="show" className="mb-8 sm:mb-10">
          <h1 className="font-display font-extrabold tracking-tight leading-[0.95] text-[clamp(2.6rem,6vw,4.6rem)] text-white">
            {['Build.', 'Solve.', 'Share.'].map((word) => (
              <m.span key={word} variants={wordDrop} className="inline-block mr-[0.33em]">
                {word.slice(0, -1)}
                <span className="text-primary">.</span>
              </m.span>
            ))}
          </h1>
          <m.p variants={riseIn} className="mt-3 max-w-xl text-sm sm:text-base text-muted-foreground">
            Community brick puzzles — built, solved and shared one stud at a time.
          </m.p>
          <m.div variants={riseIn} className="brick-marquee mt-5 w-40 sm:w-56" />
        </m.div>

        {/* Hero puzzle */}
        {hero && (
          <m.div
            variants={riseIn}
            initial="hidden"
            animate="show"
            className="relative rounded-2xl overflow-hidden mb-6 cursor-pointer group border border-[var(--border-default)] hover:border-primary/40 transition-colors"
            onClick={() => onPuzzleClick(hero.id)}
          >
            {/* Quiet night-panel backdrop — the thumbnail carries the color */}
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.14_0.025_250)] via-[oklch(0.16_0.027_250)] to-[oklch(0.19_0.03_252)]" />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
              {/* Left: Puzzle preview */}
              <div className="relative w-32 h-32 sm:w-44 sm:h-44 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg shadow-black/30">
                <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.07]">
                  <PuzzleThumbnail
                    dimensions={hero.puzzle.board.dimensions}
                    viewMode={hero.is3D ? '3D' : '2D'}
                    engine={hero.puzzle.engine}
                    seedKey={hero.id}
                  />
                </div>
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
              </div>

              {/* Right: Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                    Featured Puzzle
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
                  {hero.label}
                </h2>
                <p className="text-sm text-muted-foreground mb-4 font-mono">
                  {hero.puzzle.board.dimensions.width}×{hero.puzzle.board.dimensions.height} board · {hero.is3D ? '3D' : '2D'}
                  {solvedSlugs?.has(hero.id) && (
                    <span className="inline-flex items-center gap-1 ml-2 text-success font-semibold">
                      <CheckCircle className="h-3.5 w-3.5" /> Solved
                    </span>
                  )}
                </p>
                <Button
                  size="sm"
                  className="brick-btn gap-2 bg-gold text-gold-foreground hover:bg-gold font-bold"
                  onClick={(e) => { e.stopPropagation(); onPuzzleClick(hero.id); }}
                >
                  <Play className="h-4 w-4" />
                  Play Now
                </Button>
              </div>
            </div>

            {/* Brick accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-lego-red via-lego-yellow via-lego-green to-lego-blue opacity-80" />
          </m.div>
        )}

        {/* Featured grid */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-foreground">More featured</h3>
        </div>
        <m.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {rest.map((p) => {
            const isSolved = solvedSlugs?.has(p.id);
            return (
              <m.button
                key={p.id}
                variants={riseIn}
                onClick={() => onPuzzleClick(p.id)}
                className={`group relative flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur border transition-all text-left active:scale-[0.98] ${
                  isSolved ? 'border-success/30' : 'border-border hover:border-primary/40 hover:bg-card'
                }`}
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border/50">
                  <PuzzleThumbnail
                    dimensions={p.puzzle.board.dimensions}
                    viewMode={p.is3D ? '3D' : '2D'}
                    engine={p.puzzle.engine}
                    seedKey={p.id}
                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{p.label}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span>{p.puzzle.board.dimensions.width}×{p.puzzle.board.dimensions.height}</span>
                    <span>·</span>
                    <span>{p.is3D ? '3D' : '2D'}</span>
                    {isSolved && (
                      <span className="flex items-center gap-0.5 text-success font-semibold ml-auto">
                        <CheckCircle className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </m.button>
            );
          })}
        </m.div>
      </div>
    </div>
  );
}
