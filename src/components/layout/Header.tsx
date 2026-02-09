import { usePuzzleStore } from '../../store/puzzleStore';
import { PUZZLE_CATEGORIES, BLANK_PUZZLE } from '../../config/puzzleCategories';
import type { PuzzleCategory } from '../../config/puzzleCategories';
import { DEFAULT_PUZZLE } from '../../types/puzzle';
import { LegoHelperIcon } from '../ui/ChatPanel';
import { Button } from '../ui/shadcn/button';
import { Badge } from '../ui/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/shadcn/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/shadcn/tooltip';
import {
  ChevronDown,
  Puzzle,
  Plus,
  CheckCircle2,
  Github,
  BookOpen,
  Columns2,
  Code2,
  Eye,
} from 'lucide-react';

// 2x2 Lego brick grid logo
function LegoLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="6" fill="oklch(0.17 0.005 285)" />
      <rect x="3" y="3" width="12" height="12" rx="2.5" fill="#D01012" />
      <ellipse cx="9" cy="7" rx="3" ry="1.5" fill="#D01012" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <rect x="17" y="3" width="12" height="12" rx="2.5" fill="#F5CD2F" />
      <ellipse cx="23" cy="7" rx="3" ry="1.5" fill="#F5CD2F" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <rect x="3" y="17" width="12" height="12" rx="2.5" fill="#287F46" />
      <ellipse cx="9" cy="21" rx="3" ry="1.5" fill="#287F46" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <rect x="17" y="17" width="12" height="12" rx="2.5" fill="#0055BF" />
      <ellipse cx="23" cy="21" rx="3" ry="1.5" fill="#0055BF" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
    </svg>
  );
}

export type ViewMode = 'split' | 'editor' | 'preview';

interface HeaderProps {
  onChatToggle: () => void;
  isChatOpen: boolean;
  onShowInstructions: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function CategorySubMenu({ cat }: { cat: PuzzleCategory }) {
  const { puzzle, setPuzzle, resetPuzzle } = usePuzzleStore();
  const Icon = cat.icon;

  const handleSelect = (selectedPuzzle: typeof DEFAULT_PUZZLE) => {
    setPuzzle(selectedPuzzle);
    resetPuzzle();
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-3 py-2.5">
        <Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} />
        <span className="flex-1">{cat.category}</span>
        <span className="text-xs text-muted-foreground">({cat.puzzles.length})</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-[200px]">
        {cat.puzzles.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => handleSelect(item.puzzle)}
            className="gap-3 py-2"
          >
            <Puzzle className="h-3.5 w-3.5 shrink-0" style={{ color: item.puzzle.inventory[0]?.color || cat.color }} />
            <span className="flex-1">{item.label}</span>
            <Badge variant={item.is3D ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
              {item.is3D ? '3D' : '2D'}
            </Badge>
            {puzzle?.puzzle_id === item.puzzle.puzzle_id && (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function Header({ onChatToggle, isChatOpen, onShowInstructions, viewMode, onViewModeChange }: HeaderProps) {
  const { puzzle, isComplete, setPuzzle, resetPuzzle } = usePuzzleStore();

  const handleBlankPuzzle = () => {
    setPuzzle(BLANK_PUZZLE);
    resetPuzzle();
  };

  return (
    <header className="relative h-14 bg-background/95 backdrop-blur-md border-b border-border/50 flex items-center px-4 justify-between z-40">
      {/* Left: Logo + Puzzle selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <LegoLogo className="w-8 h-8" />
          <span className="font-semibold text-lg text-foreground tracking-tight hidden sm:inline">
            Virtual Lego
          </span>
        </div>

        <div className="h-6 w-px bg-border/50" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-3 h-9">
              <Puzzle className="h-4 w-4 text-lego-red" />
              <span className="text-muted-foreground text-sm">Puzzle:</span>
              <span className="font-medium text-foreground">{puzzle?.title || 'Select'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              {isComplete && (
                <Badge variant="default" className="bg-success text-success-foreground text-[10px] px-1.5 py-0 h-4 animate-pulse">
                  Done
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="text-primary text-xs uppercase tracking-wider">Create New</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleBlankPuzzle} className="gap-3 py-2.5">
              <div className="relative">
                <Puzzle className="h-4 w-4 text-purple-400" />
                <Plus className="h-2.5 w-2.5 text-primary absolute -top-1 -right-1" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Blank Puzzle</div>
                <div className="text-xs text-muted-foreground">6x4 board, 1 piece</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Sample Puzzles</DropdownMenuLabel>
            {PUZZLE_CATEGORIES.map((cat) => (
              <CategorySubMenu key={cat.category} cat={cat} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center: View mode toggle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
        <div className="flex items-center gap-0.5 p-1 bg-secondary/60 rounded-lg border border-border/50">
          <Button
            variant={viewMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => onViewModeChange('split')}
          >
            <Columns2 className="h-3.5 w-3.5" />
            Split
          </Button>
          <Button
            variant={viewMode === 'editor' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => onViewModeChange('editor')}
          >
            <Code2 className="h-3.5 w-3.5" />
            Editor
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => onViewModeChange('preview')}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
      </div>

      {/* Right: Actions */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isChatOpen ? 'default' : 'ghost'}
                size="sm"
                className="gap-2 h-8"
                onClick={onChatToggle}
              >
                <div className="w-5 h-5">
                  <LegoHelperIcon className="w-full h-full" />
                </div>
                <span className="text-xs font-medium hidden sm:inline">Assistant</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Puzzle Assistant</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8" onClick={onShowInstructions}>
                <BookOpen className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Guide</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Puzzle Creator Guide</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href="https://github.com/a1amit/Lego-Puzzle-Editor" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View on GitHub</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
