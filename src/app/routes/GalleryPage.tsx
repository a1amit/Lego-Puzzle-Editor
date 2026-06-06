import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { Button } from '../../components/ui/shadcn/button';
import { PuzzleGrid, PuzzleGridSkeleton } from '../../components/gallery/PuzzleGrid';
import { GalleryFilters } from '../../components/gallery/GalleryFilters';
import { FeaturedSection } from '../../components/gallery/FeaturedSection';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';
import { useGalleryStore, type SortOption } from '../../store/galleryStore';
import { useInfinitePuzzlesQuery, useLikeMutation } from '../../hooks/queries';
import { useAppAuth } from '../../auth/AuthProvider';
import { toast } from 'sonner';
import type { GalleryPuzzle } from '../../store/galleryStore';

const PAGE_SIZE = 6;

// Map hard-coded puzzles to the gallery format
function getLocalPuzzles(): GalleryPuzzle[] {
  return PUZZLE_CATEGORIES.flatMap(cat =>
    cat.puzzles.map(p => ({
      _id: p.id,
      slug: p.id,
      category: cat.category,
      difficulty: ((p.puzzle as any).metadata?.difficulty || 'medium') as 'easy' | 'medium' | 'hard' | 'expert',
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
      createdAt: '2024-01-01T00:00:00.000Z',
      publishedAt: '2024-01-01T00:00:00.000Z',
    }))
  );
}

const localPuzzles = getLocalPuzzles();

export default function GalleryPage() {
  const navigate = useNavigate();
  const { search, category, difficulty, sort, setSearch, setCategory, setDifficulty, setSort } = useGalleryStore();

  const { isSignedIn, getToken } = useAppAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  const [currentPage, setCurrentPage] = useState(1);
  const [ownedSlugs, setOwnedSlugs] = useState<Set<string>>(new Set());
  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(new Set());
  const [likedSlugs, setLikedSlugs] = useState<Set<string>>(new Set());
  const [likeCountOverrides, setLikeCountOverrides] = useState<Record<string, number>>({});
  const likeMutation = useLikeMutation();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, difficulty, sort]);

  // Infinite query for API puzzles (fetches pages on demand)
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinitePuzzlesQuery({ search, category, difficulty, sort, limit: PAGE_SIZE });

  // Flatten all loaded API pages
  const apiPuzzles = useMemo(
    () => data?.pages.flatMap(p => p.puzzles) ?? [],
    [data],
  );

  // Total API puzzle count (from first page response)
  const apiTotal = data?.pages[0]?.pagination.total ?? 0;

  // Fetch user's own puzzle slugs, completed slugs, and liked slugs
  useEffect(() => {
    if (!isSignedIn) { setOwnedSlugs(new Set()); setSolvedSlugs(new Set()); setLikedSlugs(new Set()); return; }
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const [puzzlesRes, compRes, likesRes] = await Promise.all([
          fetch('/api/users/me/puzzles', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/users/me/completions', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/users/me/likes', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (puzzlesRes.ok) {
          const { puzzles } = await puzzlesRes.json();
          setOwnedSlugs(new Set((puzzles || []).map((p: any) => p.slug)));
        }
        if (compRes.ok) {
          const { completions } = await compRes.json();
          setSolvedSlugs(new Set((completions || []).map((c: any) => c.puzzleSlug)));
        }
        if (likesRes.ok) {
          const { slugs } = await likesRes.json();
          setLikedSlugs(new Set(slugs || []));
        }
      } catch { /* ignore */ }
    })();
  }, [isSignedIn, getToken]);

  // Merge local (built-in) puzzles with API puzzles, deduplicating by slug, then sort
  const allPuzzles = useMemo(() => {
    const apiSlugs = new Set(apiPuzzles.map(p => p.slug));
    const deduped = localPuzzles.filter(p => !apiSlugs.has(p.slug));
    const merged = [...deduped, ...apiPuzzles];

    const filtered = merged.filter(p => {
      if (p.isLegacy) {
        if (category && p.category !== category) return false;
        if (difficulty && p.difficulty !== difficulty) return false;
        if (search && !p.definition.title.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });

    // Apply client-side sorting to the full merged list
    const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };
    filtered.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
        case 'popular':
          return (b.stats.completions + b.stats.plays) - (a.stats.completions + a.stats.plays);
        case 'likes':
          return b.stats.likes - a.stats.likes;
        case 'difficulty':
          return (DIFF_ORDER[a.difficulty] ?? 2) - (DIFF_ORDER[b.difficulty] ?? 2);
        default:
          return 0;
      }
    });

    return filtered;
  }, [apiPuzzles, category, difficulty, search, sort]);

  // Pagination
  const localFilteredCount = allPuzzles.filter(p => p.isLegacy).length;
  const estimatedTotal = localFilteredCount + apiTotal;
  const totalPages = Math.max(1, Math.ceil(estimatedTotal / PAGE_SIZE));

  const start = (currentPage - 1) * PAGE_SIZE;
  const displayPuzzles = allPuzzles.slice(start, start + PAGE_SIZE).map(p => {
    const override = likeCountOverrides[p.slug];
    if (override !== undefined) {
      return { ...p, stats: { ...p.stats, likes: override } };
    }
    return p;
  });

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const handleNext = () => {
    const nextPage = currentPage + 1;
    const nextStart = nextPage * PAGE_SIZE;
    // Prefetch next API page if we're running low on loaded data
    if (nextStart >= allPuzzles.length && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    setCurrentPage(nextPage);
  };

  const handlePrev = () => {
    setCurrentPage(p => Math.max(1, p - 1));
  };

  const handlePuzzleEdit = useCallback((slug: string) => {
    navigate(`/puzzle/${slug}/edit`, { viewTransition: true });
  }, [navigate]);

  const handlePuzzleClick = useCallback((slug: string) => {
    navigate(`/puzzle/${slug}`, { viewTransition: true });
  }, [navigate]);

  const handlePuzzleLike = useCallback((slug: string) => {
    if (!isSignedIn) {
      toast.error('Sign in to like puzzles');
      return;
    }
    const wasLiked = likedSlugs.has(slug);
    // Optimistic toggle of liked state
    setLikedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
    // Optimistic update of displayed like count
    setLikeCountOverrides(prev => {
      const current = prev[slug];
      const base = current ?? (apiPuzzles.find(p => p.slug === slug)?.stats.likes ?? 0);
      return { ...prev, [slug]: wasLiked ? Math.max(0, base - 1) : base + 1 };
    });
    likeMutation.mutate(slug);
  }, [isSignedIn, likeMutation, likedSlugs, apiPuzzles]);

  const categories = ['All', ...PUZZLE_CATEGORIES.map(c => c.category)];

  return (
    <div className="min-h-full">
      {/* Hero / Featured */}
      <FeaturedSection onPuzzleClick={handlePuzzleClick} solvedSlugs={solvedSlugs} />

      {/* Main content */}
      <div className="px-4 sm:px-6 pb-12">
        {/* Search + Filter bar */}
        <div role="search" className="sticky top-0 z-20 bg-background/90 backdrop-blur-lg py-3 border-b border-border mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search puzzles..."
                aria-label="Search puzzles"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-secondary/80 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9"
              aria-label="Toggle filters"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </Button>

            <select
              value={sort}
              aria-label="Sort puzzles"
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-9 px-3 rounded-lg bg-secondary/80 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 hidden sm:block"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="likes">Most Liked</option>
              <option value="difficulty">Difficulty</option>
            </select>
          </div>

          {showFilters && (
            <GalleryFilters
              categories={categories}
              selectedCategory={category}
              onCategoryChange={setCategory}
              selectedDifficulty={difficulty}
              onDifficultyChange={setDifficulty}
              sort={sort}
              onSortChange={setSort}
            />
          )}
        </div>

        {/* Puzzle grid */}
        {isLoading ? (
          <PuzzleGridSkeleton count={PAGE_SIZE} />
        ) : displayPuzzles.length === 0 && !isFetching ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No puzzles found</p>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Loading overlay while fetching new data (filter change, page change) */}
            <div className="relative">
              {isFetching && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-lg">
                    <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading puzzles...</span>
                  </div>
                </div>
              )}
              <PuzzleGrid puzzles={displayPuzzles} onPuzzleClick={handlePuzzleClick} onPuzzleEdit={handlePuzzleEdit} onPuzzleLike={handlePuzzleLike} ownedSlugs={ownedSlugs} solvedSlugs={solvedSlugs} likedSlugs={likedSlugs} />
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground px-3">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleNext}
                  disabled={!hasNext || isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
