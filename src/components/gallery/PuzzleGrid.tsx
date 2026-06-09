import { PuzzleCard } from './PuzzleCard';
import type { GalleryPuzzle } from '../../store/galleryStore';

interface PuzzleGridProps {
  puzzles: GalleryPuzzle[];
  onPuzzleClick: (slug: string) => void;
  onPuzzleEdit?: (slug: string) => void;
  onPuzzleLike?: (slug: string) => void;
  ownedSlugs?: Set<string>;
  solvedSlugs?: Set<string>;
  likedSlugs?: Set<string>;
  /** Changes when the user navigates (page/filter/sort) — replays the cascade.
      Data refetches that merely swap list contents must NOT replay it. */
  cascadeKey?: string;
}

export function PuzzleGrid({ puzzles, onPuzzleClick, onPuzzleEdit, onPuzzleLike, ownedSlugs, solvedSlugs, likedSlugs, cascadeKey }: PuzzleGridProps) {
  // The Build-Up: cards stack in one after another, like bricks. CSS-only
  // (compositor) so it can never strand a card invisible.
  return (
    <div role="list" key={cascadeKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {puzzles.map((puzzle, i) => (
        <div
          key={puzzle._id}
          role="listitem"
          className="card-rise"
          style={{ '--i': i } as React.CSSProperties}
        >
          <PuzzleCard
            puzzle={puzzle}
            onClick={onPuzzleClick}
            onEdit={onPuzzleEdit && ownedSlugs?.has(puzzle.slug) ? onPuzzleEdit : undefined}
            onLike={onPuzzleLike && !puzzle.isLegacy ? onPuzzleLike : undefined}
            isSolved={solvedSlugs?.has(puzzle.slug)}
            isLiked={likedSlugs?.has(puzzle.slug)}
          />
        </div>
      ))}
    </div>
  );
}

export function PuzzleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading puzzles" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border overflow-hidden animate-pulse">
          {/* Thumbnail skeleton */}
          <div className="h-40 bg-muted/30 relative">
            <div className="absolute top-2 right-2 h-4 w-8 rounded bg-muted/40" />
          </div>
          {/* Info skeleton */}
          <div className="p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-3/5 rounded bg-muted/40" />
              <div className="h-4 w-12 rounded bg-muted/40" />
            </div>
            <div className="h-3 w-1/3 rounded bg-muted/30" />
            <div className="flex items-center gap-3">
              <div className="h-3 w-8 rounded bg-muted/30" />
              <div className="h-3 w-8 rounded bg-muted/30" />
              <div className="h-3 w-10 rounded bg-muted/30 ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
