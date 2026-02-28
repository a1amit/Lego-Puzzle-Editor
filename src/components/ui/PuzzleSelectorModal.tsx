import { useState, useMemo } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './shadcn/dialog';
import { Button } from './shadcn/button';
import { Badge } from './shadcn/badge';
import { PUZZLE_CATEGORIES, BLANK_PUZZLE } from '../../config/puzzleCategories';
import type { PuzzleCategory, PuzzleItem } from '../../config/puzzleCategories';
import { usePuzzleStore } from '../../store/puzzleStore';
import { DEFAULT_PUZZLE } from '../../types/puzzle';
import {
  Search,
  Puzzle,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PuzzleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getDifficultyBadge(puzzleItem: PuzzleItem) {
  const metadata = (puzzleItem.puzzle as { metadata?: { difficulty?: string } }).metadata;
  const difficulty = metadata?.difficulty ?? 'medium';
  const colors: Record<string, string> = {
    easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${colors[difficulty] ?? colors.medium}`}>
      {difficulty}
    </span>
  );
}

function PuzzleCard({
  item,
  categoryColor,
  isActive,
  onSelect,
}: {
  item: PuzzleItem;
  categoryColor: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const inventoryColors = item.puzzle.inventory.slice(0, 4).map(b => b.color);

  return (
    <button
      onClick={onSelect}
      className={`
        group relative flex flex-col gap-2 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer
        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none
        ${isActive
          ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/30'
          : 'bg-[var(--surface-sunken)] border-[var(--border-subtle)] hover:border-primary/30 hover:bg-secondary/50'
        }
      `}
    >
      {/* Color bar thumbnail */}
      <div className="flex items-center gap-1.5 h-3">
        {inventoryColors.length > 0 ? (
          inventoryColors.map((c, i) => (
            <div key={i} className="h-3 flex-1 rounded-sm" style={{ backgroundColor: c }} />
          ))
        ) : (
          <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: categoryColor, opacity: 0.5 }} />
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground truncate">{item.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.puzzle.description?.slice(0, 60) || 'No description'}
          </div>
        </div>
        {isActive && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={item.is3D ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
          {item.is3D ? '3D' : '2D'}
        </Badge>
        {getDifficultyBadge(item)}
        <span className="text-[10px] text-muted-foreground">
          {item.puzzle.board.dimensions.width}x{item.puzzle.board.dimensions.height}
        </span>
      </div>
    </button>
  );
}

function CategorySection({
  category,
  searchQuery,
  onSelect,
  activePuzzleId,
}: {
  category: PuzzleCategory;
  searchQuery: string;
  onSelect: (puzzle: typeof DEFAULT_PUZZLE) => void;
  activePuzzleId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = category.icon;

  const filteredPuzzles = useMemo(() => {
    if (!searchQuery) return category.puzzles;
    const q = searchQuery.toLowerCase();
    return category.puzzles.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.puzzle.description?.toLowerCase().includes(q) ||
      category.category.toLowerCase().includes(q)
    );
  }, [category, searchQuery]);

  if (filteredPuzzles.length === 0) return null;

  return (
    <div>
      <button
        className="w-full flex items-center gap-2 px-1 py-2 text-left cursor-pointer hover:bg-secondary/30 rounded-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Icon className="w-4 h-4 shrink-0" style={{ color: category.color }} />
        <span className="text-sm font-semibold text-foreground flex-1">{category.category}</span>
        <span className="text-xs text-muted-foreground mr-1">({filteredPuzzles.length})</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-3 pt-1">
              {filteredPuzzles.map(item => (
                <PuzzleCard
                  key={item.id}
                  item={item}
                  categoryColor={category.color}
                  isActive={activePuzzleId === item.puzzle.puzzle_id}
                  onSelect={() => onSelect(item.puzzle)}
                />
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PuzzleSelectorModal({ isOpen, onClose }: PuzzleSelectorModalProps) {
  const { puzzle, setPuzzle, resetPuzzle } = usePuzzleStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelect = (selectedPuzzle: typeof DEFAULT_PUZZLE) => {
    setPuzzle(selectedPuzzle);
    resetPuzzle();
    onClose();
  };

  const handleBlankPuzzle = () => {
    setPuzzle(BLANK_PUZZLE);
    resetPuzzle();
    onClose();
  };

  const totalPuzzles = PUZZLE_CATEGORIES.reduce((sum, c) => sum + c.puzzles.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] sm:max-w-2xl max-h-[100vh] sm:max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-lego-red to-lego-red/60 flex items-center justify-center">
              <Puzzle className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Choose a Puzzle</DialogTitle>
              <DialogDescription>{totalPuzzles} puzzles available</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search puzzles..."
              className="w-full h-9 pl-9 pr-3 bg-secondary rounded-lg border border-[var(--border-subtle)] text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </div>

        {/* Puzzle list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-3 space-y-1">
          {/* Blank puzzle card */}
          {(!searchQuery || 'blank'.includes(searchQuery.toLowerCase())) && (
            <div className="mb-3">
              <button
                onClick={handleBlankPuzzle}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Blank Puzzle</div>
                  <div className="text-xs text-muted-foreground">Start from scratch with a 6x4 board</div>
                </div>
              </button>
            </div>
          )}

          {/* Categories */}
          {PUZZLE_CATEGORIES.map(cat => (
            <CategorySection
              key={cat.category}
              category={cat}
              searchQuery={searchQuery}
              onSelect={handleSelect}
              activePuzzleId={puzzle?.puzzle_id}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex-shrink-0 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
