import { Heart, Users, Play, Pencil } from 'lucide-react';
import { Badge } from '../ui/shadcn/badge';
import { PuzzleThumbnail } from './PuzzleThumbnail';
import type { GalleryPuzzle } from '../../store/galleryStore';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  expert: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface PuzzleCardProps {
  puzzle: GalleryPuzzle;
  onClick: (slug: string) => void;
  onEdit?: (slug: string) => void;
}

export function PuzzleCard({ puzzle, onClick, onEdit }: PuzzleCardProps) {
  const def = puzzle.definition ?? {} as Record<string, any>;
  const dimensions = def.board?.dimensions ?? { width: 8, height: 4 };
  const viewMode = def.viewMode ?? '3D';
  const title = def.title ?? puzzle.slug;

  return (
    <button
      onClick={() => onClick(puzzle.slug)}
      className="group text-left w-full rounded-xl bg-card border border-border hover:border-primary/40 transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      {/* Thumbnail */}
      <div className="relative h-36 bg-gradient-to-br from-card to-background flex items-center justify-center overflow-hidden">
        <PuzzleThumbnail
          dimensions={dimensions}
          viewMode={viewMode}
          className="opacity-60 group-hover:opacity-80 transition-opacity"
        />

        {/* View mode badge */}
        <Badge className="absolute top-2 right-2 text-[10px] px-1.5 py-0 h-4 bg-background/80 text-foreground border-border">
          {viewMode}
        </Badge>

        {/* Legacy badge */}
        {puzzle.isLegacy && (
          <Badge className="absolute top-2 left-2 text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-primary/30">
            Classic
          </Badge>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="h-8 w-8 text-primary/60" />
        </div>

        {/* Edit button for owned puzzles */}
        {onEdit && (
          <div
            role="button"
            tabIndex={0}
            className="absolute bottom-2 right-2 z-10 w-7 h-7 rounded-lg bg-background/90 border border-border hover:border-primary/50 hover:bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Edit puzzle"
            onClick={(e) => { e.stopPropagation(); onEdit(puzzle.slug); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEdit(puzzle.slug); } }}
          >
            <Pencil className="h-3.5 w-3.5 text-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-medium text-sm text-foreground truncate">
            {title}
          </h3>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 capitalize ${DIFFICULTY_COLORS[puzzle.difficulty] || ''}`}>
            {puzzle.difficulty}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          by {puzzle.authorUsername}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {puzzle.stats.completions}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {puzzle.stats.likes}
          </span>
          <span className="ml-auto text-[10px]">
            {dimensions.width}x{dimensions.height}
          </span>
        </div>
      </div>
    </button>
  );
}
