import { PuzzleCard } from './PuzzleCard';
import type { GalleryPuzzle } from '../../store/galleryStore';

interface PuzzleGridProps {
  puzzles: GalleryPuzzle[];
  onPuzzleClick: (slug: string) => void;
}

export function PuzzleGrid({ puzzles, onPuzzleClick }: PuzzleGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {puzzles.map((puzzle) => (
        <PuzzleCard key={puzzle._id} puzzle={puzzle} onClick={onPuzzleClick} />
      ))}
    </div>
  );
}
