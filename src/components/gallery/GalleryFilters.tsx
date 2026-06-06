import { Button } from '../ui/shadcn/button';
import type { SortOption } from '../../store/galleryStore';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'likes', label: 'Most Liked' },
  { value: 'difficulty', label: 'Difficulty' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  expert: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface GalleryFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  selectedDifficulty: string | null;
  onDifficultyChange: (difficulty: string | null) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function GalleryFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedDifficulty,
  onDifficultyChange,
  sort,
  onSortChange,
}: GalleryFiltersProps) {
  return (
    <div className="mt-3 space-y-3">
      {/* Sort (mobile only — desktop has the inline sort select) */}
      <div className="sm:hidden">
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Sort</label>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={sort === opt.value ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3 text-xs"
              onClick={() => onSortChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={(cat === 'All' ? !selectedCategory : selectedCategory === cat) ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => onCategoryChange(cat === 'All' ? null : cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Difficulty</label>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={!selectedDifficulty ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => onDifficultyChange(null)}
          >
            All
          </Button>
          {DIFFICULTIES.map(d => (
            <Button
              key={d}
              variant={selectedDifficulty === d ? 'default' : 'outline'}
              size="sm"
              className={`h-7 px-3 text-xs capitalize ${selectedDifficulty === d ? '' : DIFFICULTY_COLORS[d]}`}
              onClick={() => onDifficultyChange(d)}
            >
              {d}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
