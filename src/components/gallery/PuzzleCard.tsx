import { Heart, Users, Play, Pencil, CheckCircle } from 'lucide-react';
import { Badge } from '../ui/shadcn/badge';
import { PuzzleThumbnail } from './PuzzleThumbnail';
import type { GalleryPuzzle } from '../../store/galleryStore';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  expert: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const DIFFICULTY_GLOW: Record<string, string> = {
  easy: 'group-hover:shadow-green-500/10',
  medium: 'group-hover:shadow-yellow-500/10',
  hard: 'group-hover:shadow-orange-500/10',
  expert: 'group-hover:shadow-red-500/10',
};

interface PuzzleCardProps {
  puzzle: GalleryPuzzle;
  onClick: (slug: string) => void;
  onEdit?: (slug: string) => void;
  onLike?: (slug: string) => void;
  isSolved?: boolean;
  isLiked?: boolean;
}

export function PuzzleCard({ puzzle, onClick, onEdit, onLike, isSolved, isLiked }: PuzzleCardProps) {
  const def = puzzle.definition ?? {} as Record<string, any>;
  const dimensions = def.board?.dimensions ?? { width: 8, height: 4 };
  const viewMode = def.viewMode ?? '3D';
  const title = def.title ?? puzzle.slug;

  return (
    <button
      onClick={() => onClick(puzzle.slug)}
      className={`group text-left w-full rounded-xl bg-card border border-border hover:border-primary/40 transition-all duration-200 overflow-hidden hover:shadow-xl ${DIFFICULTY_GLOW[puzzle.difficulty] || 'group-hover:shadow-primary/5'} focus:outline-none focus:ring-2 focus:ring-primary/50`}
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-background via-card to-background flex items-center justify-center overflow-hidden">
        <PuzzleThumbnail
          dimensions={dimensions}
          viewMode={viewMode}
          className="opacity-50 group-hover:opacity-75 transition-opacity duration-300 scale-110 group-hover:scale-125"
        />

        {/* Top badges row */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {puzzle.isLegacy && (
              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-gold/20 text-gold border-gold/30 font-semibold">
                Classic
              </Badge>
            )}
            <Badge className="text-[10px] px-1.5 py-0 h-5 bg-background/80 text-foreground/80 border-border backdrop-blur-sm">
              {viewMode}
            </Badge>
          </div>
          {isSolved && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/15 px-1.5 py-0.5 rounded-full border border-success/20">
              <CheckCircle className="h-3 w-3" />Solved
            </span>
          )}
        </div>

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
            <Play className="h-5 w-5 text-primary ml-0.5" />
          </div>
        </div>

        {/* Edit button for owned puzzles.
            Hover-reveal on mouse devices; always visible (and a larger tap
            target) on touch devices where there is no hover. */}
        {onEdit && (
          <div
            role="button"
            tabIndex={0}
            className="absolute bottom-2.5 right-2.5 z-10 w-8 h-8 [@media(hover:none)]:w-10 [@media(hover:none)]:h-10 rounded-lg bg-background/90 border border-border hover:border-primary/50 hover:bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-all cursor-pointer backdrop-blur-sm"
            title="Edit puzzle"
            aria-label="Edit puzzle"
            onClick={(e) => { e.stopPropagation(); onEdit(puzzle.slug); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEdit(puzzle.slug); } }}
          >
            <Pencil className="h-3.5 w-3.5 text-foreground" />
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {title}
          </h3>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 capitalize font-semibold ${DIFFICULTY_COLORS[puzzle.difficulty] || ''}`}>
            {puzzle.difficulty}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          by {puzzle.authorUsername}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {puzzle.stats.completions}
          </span>
          {onLike ? (
            <span
              role="button"
              tabIndex={0}
              className={`flex items-center gap-1 transition-colors ${
                isLiked
                  ? 'text-red-400 hover:text-red-300'
                  : 'hover:text-red-400'
              }`}
              title={isLiked ? 'Unlike' : 'Like'}
              onClick={(e) => { e.stopPropagation(); onLike(puzzle.slug); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onLike(puzzle.slug); } }}
            >
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
              {puzzle.stats.likes}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {puzzle.stats.likes}
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/70">
            {dimensions.width}x{dimensions.height}
          </span>
        </div>
      </div>
    </button>
  );
}
