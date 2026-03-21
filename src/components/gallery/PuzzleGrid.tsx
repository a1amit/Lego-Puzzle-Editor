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
    <div role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
