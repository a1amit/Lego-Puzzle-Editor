import { PuzzleCard } from './PuzzleCard';
import type { GalleryPuzzle } from '../../store/galleryStore';

interface PuzzleGridProps {
  puzzles: GalleryPuzzle[];
  onPuzzleClick: (slug: string) => void;
  onPuzzleEdit?: (slug: string) => void;
  ownedSlugs?: Set<string>;
  solvedSlugs?: Set<string>;
}

export function PuzzleGrid({ puzzles, onPuzzleClick, onPuzzleEdit, ownedSlugs, solvedSlugs }: PuzzleGridProps) {
  return (
    <div role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {puzzles.map((puzzle) => (
        <div key={puzzle._id} role="listitem">
          <PuzzleCard
            puzzle={puzzle}
            onClick={onPuzzleClick}
            onEdit={onPuzzleEdit && ownedSlugs?.has(puzzle.slug) ? onPuzzleEdit : undefined}
            isSolved={solvedSlugs?.has(puzzle.slug)}
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
          <div className="h-36 bg-muted/30 relative">
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
