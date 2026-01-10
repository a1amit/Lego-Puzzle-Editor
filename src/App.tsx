import { useState, useEffect } from 'react';
import { ResizablePanels } from './components/layout/ResizablePanels';
import { PuzzleEditor } from './components/editor/PuzzleEditor';
import { PuzzleScene } from './components/3d/PuzzleScene';
import { PuzzleRenderer, ViewModeIndicator } from './components/renderer';
import { InventoryPanel } from './components/ui/InventoryPanel';
import { ValidationPanel } from './components/ui/ValidationPanel';
import { InstructionsModal } from './components/ui/InstructionsModal';
import { CongratulationsPopup } from './components/ui/CongratulationsPopup';
import { ChatPanel, LegoHelperIcon } from './components/ui/ChatPanel';
import { usePuzzleStore } from './store/puzzleStore';
import { usePuzzleEngine } from './engine';
import { DEFAULT_PUZZLE, FIT_ALL_PUZZLE, BLANK_PUZZLE, SLIDER_PUZZLE, GRID_PUZZLE, BINARY_PUZZLE, BINARY_PUZZLE_SOS, BINARY_PUZZLE_BUILDING_BLOCKS, COLORFUL_COVERAGE_PUZZLE } from './types/puzzle';
import { KLOTSKI_RED_DONKEY, KLOTSKI_CROSSWAY, PEN_CHALLENGE_PUZZLE, NONOGRAM_PUZZLE, NONOGRAM_PUZZLE_2 } from './types/puzzle';

// Lego Brick Icon for header
function LegoBrickIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="12" rx="1" fill={color} stroke={color} strokeWidth="1" />
      <rect x="8" y="4" width="8" height="6" rx="1" fill={color} stroke={color} strokeWidth="1" />
      <ellipse cx="12" cy="5" rx="3" ry="1.5" fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
    </svg>
  );
}

function LegoStackIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      {/* Bottom brick - blue */}
      <rect x="2" y="14" width="20" height="8" rx="1" fill="#0055BF" />
      {/* Top brick - red */}
      <rect x="5" y="6" width="14" height="8" rx="1" fill="#D01012" />
      {/* Studs */}
      <ellipse cx="8" cy="5" rx="2" ry="1" fill="#D01012" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <ellipse cx="16" cy="5" rx="2" ry="1" fill="#D01012" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
    </svg>
  );
}

// 2x2 Lego brick grid logo
function LegoLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      {/* Background rounded square */}
      <rect x="1" y="1" width="30" height="30" rx="4" fill="#1a1a2e" />

      {/* 2x2 Grid of colored bricks */}
      {/* Top-left - Red */}
      <rect x="3" y="3" width="12" height="12" rx="2" fill="#D01012" />
      <ellipse cx="9" cy="7" rx="3" ry="1.5" fill="#D01012" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />

      {/* Top-right - Yellow */}
      <rect x="17" y="3" width="12" height="12" rx="2" fill="#F5CD2F" />
      <ellipse cx="23" cy="7" rx="3" ry="1.5" fill="#F5CD2F" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />

      {/* Bottom-left - Green */}
      <rect x="3" y="17" width="12" height="12" rx="2" fill="#287F46" />
      <ellipse cx="9" cy="21" rx="3" ry="1.5" fill="#287F46" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />

      {/* Bottom-right - Blue */}
      <rect x="17" y="17" width="12" height="12" rx="2" fill="#0055BF" />
      <ellipse cx="23" cy="21" rx="3" ry="1.5" fill="#0055BF" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
    </svg>
  );
}

// Category icons as SVG components
function CategoryIcon({ type, color, className = "w-5 h-5" }: { type: string; color: string; className?: string }) {
  switch (type) {
    case 'coverage':
      // 3x3 grid icon
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="5" height="5" rx="1" fill={color} />
          <rect x="9.5" y="3" width="5" height="5" rx="1" fill={color} opacity="0.7" />
          <rect x="16" y="3" width="5" height="5" rx="1" fill={color} />
          <rect x="3" y="9.5" width="5" height="5" rx="1" fill={color} opacity="0.7" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill={color} opacity="0.5" />
          <rect x="16" y="9.5" width="5" height="5" rx="1" fill={color} opacity="0.7" />
          <rect x="3" y="16" width="5" height="5" rx="1" fill={color} />
          <rect x="9.5" y="16" width="5" height="5" rx="1" fill={color} opacity="0.7" />
          <rect x="16" y="16" width="5" height="5" rx="1" fill={color} />
        </svg>
      );
    case 'fit-all':
      // Tetris-like blocks icon
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="1" fill={color} />
          <rect x="13" y="3" width="8" height="8" rx="1" fill={color} opacity="0.7" />
          <rect x="3" y="13" width="8" height="8" rx="1" fill={color} opacity="0.7" />
          <rect x="13" y="13" width="8" height="8" rx="1" fill={color} />
        </svg>
      );
    case 'slider':
      // Sliding blocks icon
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="9" height="9" rx="1" fill={color} />
          <rect x="13" y="2" width="9" height="4" rx="1" fill={color} opacity="0.6" />
          <rect x="13" y="8" width="4" height="6" rx="1" fill={color} opacity="0.7" />
          <rect x="2" y="13" width="4" height="9" rx="1" fill={color} opacity="0.7" />
          <rect x="8" y="13" width="6" height="4" rx="1" fill={color} opacity="0.6" />
          <rect x="8" y="19" width="4" height="3" rx="1" fill={color} opacity="0.5" />
          <rect x="16" y="16" width="6" height="6" rx="1" fill={color} opacity="0.5" />
        </svg>
      );
    case 'binary':
      // Binary 0/1 icon
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="5" height="7" rx="1" fill={color} opacity="0.5" />
          <rect x="9" y="4" width="5" height="7" rx="1" fill={color} />
          <rect x="2" y="13" width="5" height="7" rx="1" fill={color} />
          <rect x="9" y="13" width="5" height="7" rx="1" fill={color} opacity="0.5" />
          <rect x="16" y="4" width="5" height="7" rx="1" fill={color} opacity="0.5" />
          <rect x="16" y="13" width="5" height="7" rx="1" fill={color} />
        </svg>
      );
    case 'brain-teaser':
      // Light bulb/brain teaser icon
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="10" r="6" fill={color} opacity="0.8" />
          <rect x="9" y="16" width="6" height="3" rx="1" fill={color} />
          <rect x="10" y="19" width="4" height="2" rx="0.5" fill={color} opacity="0.7" />
          <path d="M12 2v2M18.5 5.5l-1.5 1.5M20 12h-2M5.5 5.5l1.5 1.5M4 12h2" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return <LegoBrickIcon className={className} color={color} />;
  }
}

// Puzzle item type
interface PuzzleItem {
  id: string;
  label: string;
  puzzle: typeof DEFAULT_PUZZLE;
  is3D: boolean;
}

// Grouped puzzle categories for the dropdown menu
const PUZZLE_CATEGORIES: { category: string; color: string; iconType: string; puzzles: PuzzleItem[] }[] = [
  {
    category: 'Coverage',
    color: '#D01012',
    iconType: 'coverage',
    puzzles: [
      { id: 'coverage', label: 'T-Time', puzzle: DEFAULT_PUZZLE, is3D: true },
      { id: 'rainbow', label: 'Rainbow Bricks', puzzle: COLORFUL_COVERAGE_PUZZLE, is3D: true },
      { id: 'grid', label: 'Grid Fill', puzzle: GRID_PUZZLE, is3D: false },
    ],
  },
  {
    category: 'Fit All',
    color: '#287F46',
    iconType: 'fit-all',
    puzzles: [
      { id: 'fit-all', label: 'Tetris Pack', puzzle: FIT_ALL_PUZZLE, is3D: true },
    ],
  },
  {
    category: 'Slider / Klotski',
    color: '#FE8A18',
    iconType: 'slider',
    puzzles: [
      { id: 'slider', label: 'Klotski Classic', puzzle: SLIDER_PUZZLE, is3D: false },
      { id: 'klotski-red-donkey', label: 'Red Donkey', puzzle: KLOTSKI_RED_DONKEY, is3D: false },
      { id: 'klotski-crossway', label: 'Crossway', puzzle: KLOTSKI_CROSSWAY, is3D: false },
    ],
  },
  {
    category: 'Binary Safe',
    color: '#00BCD4',
    iconType: 'binary',
    puzzles: [
      { id: 'binary', label: 'Greeting', puzzle: BINARY_PUZZLE, is3D: false },
      { id: 'binary-deserted-island', label: 'Deserted Island', puzzle: BINARY_PUZZLE_SOS, is3D: false },
      { id: 'binary-building-blocks', label: 'Building Blocks', puzzle: BINARY_PUZZLE_BUILDING_BLOCKS, is3D: false },
    ],
  },
  {
    category: 'Brain Teasers',
    color: '#9C27B0',
    iconType: 'brain-teaser',
    puzzles: [
      { id: 'pen-challenge', label: 'Pen Challenge', puzzle: PEN_CHALLENGE_PUZZLE, is3D: false },
    ],
  },
  {
    category: 'Logic Puzzles',
    color: '#10B981',
    iconType: 'coverage',
    puzzles: [
      { id: 'nonogram', label: 'Nonogram: Cross', puzzle: NONOGRAM_PUZZLE, is3D: false },
      { id: 'nonogram-2', label: 'Nonogram2: Cross', puzzle: NONOGRAM_PUZZLE_2, is3D: false },
    ],
  },
];

type ViewMode = 'split' | 'editor' | 'preview';

function Header({ onChatToggle }: { onChatToggle: () => void }) {
  const { puzzle, isComplete, setPuzzle, resetPuzzle } = usePuzzleStore();
  const [showPuzzleMenu, setShowPuzzleMenu] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handlePuzzleSelect = (selectedPuzzle: typeof DEFAULT_PUZZLE) => {
    setPuzzle(selectedPuzzle);
    resetPuzzle();
    setShowPuzzleMenu(false);
    setExpandedCategories(new Set());
  };

  // Check if current puzzle is in a category
  const getCurrentCategory = () => {
    for (const cat of PUZZLE_CATEGORIES) {
      if (cat.puzzles.some(p => p.puzzle.puzzle_id === puzzle?.puzzle_id)) {
        return cat.category;
      }
    }
    return null;
  };

  return (
    <header className="relative h-14 bg-editor-sidebar border-b border-editor-border flex items-center px-4 justify-between">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <LegoLogo className="w-8 h-8" />
          <span className="font-display font-bold text-lg text-white tracking-tight">
            Virtual Lego
          </span>
        </div>

        {/* Puzzle selector */}
        <div className="relative pl-4 border-l border-editor-border">
          <button
            onClick={() => setShowPuzzleMenu(!showPuzzleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-editor-border/30 hover:bg-editor-border/50 transition-colors"
          >
            <LegoBrickIcon className="w-4 h-4" color="#D01012" />
            <span className="text-gray-400 text-sm">Puzzle:</span>
            <span className="font-display font-medium text-white">{puzzle?.title || 'Select'}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isComplete && (
              <span className="px-2 py-0.5 text-xs bg-editor-success/20 text-editor-success rounded-full animate-pulse">
                ✓
              </span>
            )}
          </button>

          {/* Dropdown menu */}
          {showPuzzleMenu && (
            <div className="absolute top-full left-4 mt-1 w-80 max-h-[70vh] overflow-y-auto bg-editor-sidebar border border-editor-border rounded-lg shadow-xl z-50">
              {/* New Puzzle section */}
              <div className="p-2 border-b border-editor-border bg-editor-accent/10">
                <span className="text-xs text-editor-accent uppercase tracking-wide font-semibold">Create New</span>
              </div>
              <button
                onClick={() => handlePuzzleSelect(BLANK_PUZZLE)}
                className="w-full px-4 py-3 text-left hover:bg-editor-border/30 transition-colors flex items-start gap-3 border-b border-editor-border"
              >
                {/* Plus icon in a brick */}
                <div className="flex-shrink-0 mt-0.5 relative">
                  <LegoBrickIcon className="w-5 h-5" color="#8b5cf6" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-editor-accent rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-display font-medium text-white text-sm">
                    Blank Puzzle
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    6×4 board • 1 piece
                  </div>
                </div>
              </button>

              {/* Sample Puzzles by Category */}
              <div className="p-2 border-b border-editor-border bg-editor-border/20">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Sample Puzzles</span>
              </div>

              {PUZZLE_CATEGORIES.map((cat) => {
                const isCurrentCategory = getCurrentCategory() === cat.category;
                const isExpanded = expandedCategories.has(cat.category);

                return (
                  <div key={cat.category}>
                    {/* Category header - click to expand */}
                    <button
                      onClick={() => toggleCategory(cat.category)}
                      className={`w-full px-4 py-3.5 text-left flex items-center gap-4 transition-colors ${isExpanded ? 'bg-editor-border/40' : isCurrentCategory ? 'bg-editor-accent/10' : 'hover:bg-editor-border/20'
                        }`}
                    >
                      <CategoryIcon type={cat.iconType} color={cat.color} className="w-6 h-6" />
                      <div className="flex-1">
                        <div className="font-display font-medium text-white text-sm flex items-center gap-2">
                          {cat.category}
                          <span className="text-xs text-gray-500">({cat.puzzles.length})</span>
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Expanded puzzles list */}
                    {isExpanded && (
                      <div className="bg-editor-bg/50 border-l-2 ml-4" style={{ borderColor: cat.color }}>
                        {cat.puzzles.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handlePuzzleSelect(item.puzzle)}
                            className={`w-full px-4 py-2.5 text-left hover:bg-editor-border/30 transition-colors flex items-start gap-3 ${puzzle?.puzzle_id === item.puzzle.puzzle_id ? 'bg-editor-accent/10' : ''
                              }`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <LegoBrickIcon
                                className="w-4 h-4"
                                color={item.puzzle.inventory[0]?.color || cat.color}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-medium text-white text-sm flex items-center gap-2">
                                <span className="truncate">{item.label}</span>
                                <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded ${item.is3D ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'
                                  }`}>
                                  {item.is3D ? '3D' : '2D'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {item.puzzle.board.dimensions.width}×{item.puzzle.board.dimensions.height} board
                              </div>
                            </div>
                            {puzzle?.puzzle_id === item.puzzle.puzzle_id && (
                              <svg className="w-4 h-4 text-editor-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Centered Assistant Button */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          onClick={onChatToggle}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors group"
          title="Puzzle Assistant"
        >
          <div className="w-6 h-6 transform transition-transform group-hover:scale-110">
            <LegoHelperIcon className="w-full h-full" />
          </div>
          <span className="text-sm font-display font-medium">Assistant</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Instructions button */}
        <button
          onClick={() => setShowInstructions(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-editor-accent/20 hover:bg-editor-accent/30 text-editor-accent transition-colors"
        >
          <LegoStackIcon className="w-5 h-5" />
          <span className="text-sm font-display">Guide</span>
        </button>



        {/* GitHub link */}
        <a
          href="https://github.com/a1amit/Lego-Puzzle-Editor"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-editor-border/30"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        </a>
      </div>

      {/* Instructions Modal */}
      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </header>
  );
}

function EditorPanel() {
  return (
    <div className="h-full flex flex-col bg-editor-bg">
      <PuzzleEditor className="flex-1" />
    </div>
  );
}

function PreviewPanel() {
  const { puzzle, isComplete: storeIsComplete, resetPuzzle } = usePuzzleStore();
  const viewMode = puzzle?.viewMode ?? '3D';
  const is2D = viewMode === '2D';

  // Use the engine hook for 2D puzzles (view-agnostic architecture)
  const engine = usePuzzleEngine({ puzzle: null }); // Start empty

  // Sync engine with store's puzzle when it changes (for 2D puzzles)
  useEffect(() => {
    if (puzzle && is2D) {
      engine.loadPuzzle(puzzle);
    }
  }, [puzzle, is2D]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track completion state - use engine for 2D, store for 3D
  const isComplete = is2D ? engine.isComplete : storeIsComplete;

  // State for showing congratulations popup
  const [showCongrats, setShowCongrats] = useState(false);
  const [prevComplete, setPrevComplete] = useState(false);

  // Detect transition from incomplete to complete
  useEffect(() => {
    if (isComplete && !prevComplete) {
      // Puzzle just became complete - show congratulations!
      setShowCongrats(true);
    }
    setPrevComplete(isComplete);
  }, [isComplete, prevComplete]);

  const handlePlayAgain = () => {
    setShowCongrats(false);
    if (is2D) {
      engine.resetBoard();
    } else {
      resetPuzzle();
    }
  };

  const handleCloseCongrats = () => {
    setShowCongrats(false);
  };

  return (
    <>
      <ResizablePanels
        direction="horizontal"
        defaultSize={75}
        minSize={40}
        maxSize={90}
      >
        {/* Puzzle Scene - switches between 2D and 3D */}
        <div className="h-full bg-editor-bg relative">
          {is2D ? (
            // 2D puzzles use the new view-agnostic PuzzleRenderer
            <PuzzleRenderer engine={engine} />
          ) : (
            // 3D puzzles use the existing PuzzleScene (with store)
            <PuzzleScene />
          )}

          {/* View mode badge */}
          <div className="absolute top-3 right-3 z-10">
            <ViewModeIndicator viewMode={viewMode} />
          </div>
        </div>

        {/* Side panels - Inventory & Validation */}
        <div className="h-full bg-editor-sidebar border-l border-editor-border">
          <ResizablePanels
            direction="vertical"
            defaultSize={60}
            minSize={20}
            maxSize={85}
          >
            <InventoryPanel className="h-full" engine={is2D ? engine : undefined} />
            <ValidationPanel className="h-full" engine={is2D ? engine : undefined} />
          </ResizablePanels>
        </div>
      </ResizablePanels>

      {/* Congratulations popup - only in preview panel */}
      <CongratulationsPopup
        isVisible={showCongrats}
        onClose={handleCloseCongrats}
        onPlayAgain={handlePlayAgain}
        puzzleTitle={puzzle?.title}
      />
    </>
  );
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-editor-sidebar/50 rounded-lg border border-editor-border">
      <button
        className={`px-3 py-1.5 text-xs font-display rounded transition-all ${mode === 'split'
          ? 'bg-editor-accent text-white'
          : 'text-gray-400 hover:text-white hover:bg-editor-border/50'
          }`}
        onClick={() => onChange('split')}
      >
        Split
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-display rounded transition-all ${mode === 'editor'
          ? 'bg-editor-accent text-white'
          : 'text-gray-400 hover:text-white hover:bg-editor-border/50'
          }`}
        onClick={() => onChange('editor')}
      >
        Editor
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-display rounded transition-all ${mode === 'preview'
          ? 'bg-editor-accent text-white'
          : 'text-gray-400 hover:text-white hover:bg-editor-border/50'
          }`}
        onClick={() => onChange('preview')}
      >
        Preview
      </button>
    </div>
  );
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-editor-bg">
      <Header onChatToggle={() => setShowChat(true)} />

      {/* View toggle bar */}
      <div className="h-10 bg-editor-sidebar/30 border-b border-editor-border flex items-center justify-center">
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'split' && (
          <ResizablePanels
            direction="horizontal"
            defaultSize={40}
            minSize={20}
            maxSize={70}
          >
            <EditorPanel />
            <PreviewPanel />
          </ResizablePanels>
        )}
        {viewMode === 'editor' && <EditorPanel />}
        {viewMode === 'preview' && <PreviewPanel />}
      </main>

      {/* Status bar */}
      <footer className="h-6 bg-editor-sidebar border-t border-editor-border flex items-center px-4 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Virtual Lego Puzzle Editor v0.1.0</span>
          <span className="text-editor-accent">●</span>
          <span>TypeScript • React • Three.js</span>
        </div>
      </footer>

      {/* Puzzle Assistant Chatbot */}
      <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}

export default App;

