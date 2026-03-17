import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { Button } from '../../components/ui/shadcn/button';
import { PuzzleGrid } from '../../components/gallery/PuzzleGrid';
import { GalleryFilters } from '../../components/gallery/GalleryFilters';
import { FeaturedSection } from '../../components/gallery/FeaturedSection';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';
import { useGalleryStore, type SortOption } from '../../store/galleryStore';

// Map hard-coded puzzles to the gallery format for offline/fallback
function getLocalPuzzles() {
  return PUZZLE_CATEGORIES.flatMap(cat =>
    cat.puzzles.map(p => ({
      _id: p.id,
      slug: p.id,
      category: cat.category,
      difficulty: 'medium' as const,
      tags: [],
      isLegacy: true,
      isFeatured: false,
      authorUsername: 'Built-in',
      stats: { plays: 0, completions: 0, uniquePlayers: 0, likes: 0, completionRate: 0 },
      definition: {
        title: p.label,
        viewMode: (p.is3D ? '3D' : '2D') as '2D' | '3D',
        board: { dimensions: p.puzzle.board.dimensions },
      },
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    }))
  );
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const {
    search, category, difficulty, sort,
    puzzles: apiPuzzles, isLoading,
    setSearch, setCategory, setDifficulty, setSort,
    fetchPuzzles,
  } = useGalleryStore();

  const [showFilters, setShowFilters] = useState(false);
  const [localPuzzles] = useState(getLocalPuzzles);
  const [searchInput, setSearchInput] = useState(search);

  // Fetch from API on mount (falls back to local puzzles)
  useEffect(() => {
    fetchPuzzles();
  }, [fetchPuzzles, search, category, difficulty, sort]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  // Use API puzzles if available, else local
  const displayPuzzles = apiPuzzles.length > 0 ? apiPuzzles : localPuzzles;

  // Apply client-side filters to local puzzles
  const filteredPuzzles = displayPuzzles.filter(p => {
    if (category && p.category !== category) return false;
    if (difficulty && p.difficulty !== difficulty) return false;
    if (search && !p.definition.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handlePuzzleClick = useCallback((slug: string) => {
    navigate(`/puzzle/${slug}`);
  }, [navigate]);

  const categories = ['All', ...PUZZLE_CATEGORIES.map(c => c.category)];

  return (
    <div className="min-h-full bg-background">
      {/* Hero / Featured */}
      <FeaturedSection onPuzzleClick={handlePuzzleClick} />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Search + Filter bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md py-4 border-b border-border mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search puzzles..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </Button>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-9 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="likes">Most Liked</option>
              <option value="difficulty">Difficulty</option>
            </select>

            <Button
              variant="default"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => navigate('/create')}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create Puzzle</span>
            </Button>
          </div>

          {showFilters && (
            <GalleryFilters
              categories={categories}
              selectedCategory={category}
              onCategoryChange={setCategory}
              selectedDifficulty={difficulty}
              onDifficultyChange={setDifficulty}
            />
          )}
        </div>

        {/* Puzzle grid */}
        {isLoading && filteredPuzzles.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredPuzzles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No puzzles found</p>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <PuzzleGrid puzzles={filteredPuzzles} onPuzzleClick={handlePuzzleClick} />
        )}
      </div>
    </div>
  );
}
