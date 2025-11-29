import { useState, useEffect, useRef } from 'react';
import { ResizablePanels } from './components/layout/ResizablePanels';
import { PuzzleEditor } from './components/editor/PuzzleEditor';
import { PuzzleScene } from './components/3d/PuzzleScene';
import { InventoryPanel } from './components/ui/InventoryPanel';
import { ValidationPanel } from './components/ui/ValidationPanel';
import { InstructionsModal } from './components/ui/InstructionsModal';
import { CompletionModal } from './components/ui/CompletionModal';
import { usePuzzleStore } from './store/puzzleStore';
import { DEFAULT_PUZZLE, FIT_ALL_PUZZLE, BLANK_PUZZLE } from './types/puzzle';

// Lego Brick Icon for header
function LegoBrickIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="12" rx="1" fill={color} stroke={color} strokeWidth="1"/>
      <rect x="8" y="4" width="8" height="6" rx="1" fill={color} stroke={color} strokeWidth="1"/>
      <ellipse cx="12" cy="5" rx="3" ry="1.5" fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
    </svg>
  );
}

function LegoStackIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      {/* Bottom brick - blue */}
      <rect x="2" y="14" width="20" height="8" rx="1" fill="#0055BF"/>
      {/* Top brick - red */}
      <rect x="5" y="6" width="14" height="8" rx="1" fill="#D01012"/>
      {/* Studs */}
      <ellipse cx="8" cy="5" rx="2" ry="1" fill="#D01012" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
      <ellipse cx="16" cy="5" rx="2" ry="1" fill="#D01012" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
    </svg>
  );
}

// 2x2 Lego brick grid logo
function LegoLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      {/* Background rounded square */}
      <rect x="1" y="1" width="30" height="30" rx="4" fill="#1a1a2e"/>
      
      {/* 2x2 Grid of colored bricks */}
      {/* Top-left - Red */}
      <rect x="3" y="3" width="12" height="12" rx="2" fill="#D01012"/>
      <ellipse cx="9" cy="7" rx="3" ry="1.5" fill="#D01012" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
      
      {/* Top-right - Yellow */}
      <rect x="17" y="3" width="12" height="12" rx="2" fill="#F5CD2F"/>
      <ellipse cx="23" cy="7" rx="3" ry="1.5" fill="#F5CD2F" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
      
      {/* Bottom-left - Green */}
      <rect x="3" y="17" width="12" height="12" rx="2" fill="#287F46"/>
      <ellipse cx="9" cy="21" rx="3" ry="1.5" fill="#287F46" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
      
      {/* Bottom-right - Blue */}
      <rect x="17" y="17" width="12" height="12" rx="2" fill="#0055BF"/>
      <ellipse cx="23" cy="21" rx="3" ry="1.5" fill="#0055BF" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
    </svg>
  );
}

const SAMPLE_PUZZLES = [
  { id: 'coverage', label: 'T-Time (Coverage)', puzzle: DEFAULT_PUZZLE },
  { id: 'fit-all', label: 'Tetris Pack (Fit All)', puzzle: FIT_ALL_PUZZLE },
];

type ViewMode = 'split' | 'editor' | 'preview';

function Header() {
  const { puzzle, isComplete, setPuzzle, resetPuzzle } = usePuzzleStore();
  const [showPuzzleMenu, setShowPuzzleMenu] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const wasCompleteRef = useRef(false);

  // Track when puzzle transitions from incomplete to complete
  useEffect(() => {
    if (isComplete && !wasCompleteRef.current) {
      // Puzzle just completed - show celebration!
      setShowCompletionModal(true);
    }
    wasCompleteRef.current = isComplete;
  }, [isComplete]);

  const handlePuzzleSelect = (selectedPuzzle: typeof DEFAULT_PUZZLE) => {
    setPuzzle(selectedPuzzle);
    resetPuzzle();
    setShowPuzzleMenu(false);
    // Reset completion tracking for new puzzle
    wasCompleteRef.current = false;
    setShowCompletionModal(false);
  };
  
  return (
    <header className="h-14 bg-editor-sidebar border-b border-editor-border flex items-center px-4 justify-between">
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
            <div className="absolute top-full left-4 mt-1 w-72 bg-editor-sidebar border border-editor-border rounded-lg shadow-xl z-50 overflow-hidden">
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
                  <div className="text-xs text-gray-400 mt-0.5">
                    Start with a minimal template and build your own puzzle
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-1.5 py-0.5 text-xs rounded bg-purple-500/20 text-purple-300">
                      Template
                    </span>
                    <span className="text-xs text-gray-500">
                      6×4 board • 1 piece
                    </span>
                  </div>
                </div>
              </button>
              
              {/* Sample Puzzles section */}
              <div className="p-2 border-b border-editor-border bg-editor-border/20">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Sample Puzzles</span>
              </div>
              {SAMPLE_PUZZLES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handlePuzzleSelect(item.puzzle)}
                  className={`w-full px-4 py-3 text-left hover:bg-editor-border/30 transition-colors flex items-start gap-3 ${
                    puzzle?.puzzle_id === item.puzzle.puzzle_id ? 'bg-editor-accent/10' : ''
                  }`}
                >
                  {/* Lego brick icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <LegoBrickIcon 
                      className="w-5 h-5" 
                      color={item.puzzle.inventory[0]?.color || '#D01012'} 
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-medium text-white text-sm">
                      {item.puzzle.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.puzzle.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        item.puzzle.validation_rules.some(r => r.rule === 'ALL_BOARD_SQUARES_MUST_BE_COVERED')
                          ? 'bg-lego-blue/20 text-blue-300'
                          : 'bg-lego-green/20 text-green-300'
                      }`}>
                        {item.puzzle.validation_rules.some(r => r.rule === 'ALL_BOARD_SQUARES_MUST_BE_COVERED')
                          ? 'Coverage'
                          : 'Fit All'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.puzzle.inventory.length} pieces • {item.puzzle.board.dimensions.width}×{item.puzzle.board.dimensions.height} board
                      </span>
                    </div>
                  </div>
                  {puzzle?.puzzle_id === item.puzzle.puzzle_id && (
                    <svg className="w-5 h-5 text-editor-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
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

      {/* Completion Celebration Modal */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        puzzleTitle={puzzle?.title}
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
  return (
    <ResizablePanels
      direction="horizontal"
      defaultSize={75}
      minSize={40}
      maxSize={90}
    >
      {/* 3D Scene */}
      <div className="h-full bg-editor-bg">
        <PuzzleScene />
      </div>
      
      {/* Side panels - Inventory & Validation */}
      <div className="h-full bg-editor-sidebar border-l border-editor-border">
        <ResizablePanels
          direction="vertical"
          defaultSize={60}
          minSize={20}
          maxSize={85}
        >
          <InventoryPanel className="h-full" />
          <ValidationPanel className="h-full" />
        </ResizablePanels>
      </div>
    </ResizablePanels>
  );
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-editor-sidebar/50 rounded-lg border border-editor-border">
      <button
        className={`px-3 py-1.5 text-xs font-display rounded transition-all ${
          mode === 'split' 
            ? 'bg-editor-accent text-white' 
            : 'text-gray-400 hover:text-white hover:bg-editor-border/50'
        }`}
        onClick={() => onChange('split')}
      >
        Split
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-display rounded transition-all ${
          mode === 'editor' 
            ? 'bg-editor-accent text-white' 
            : 'text-gray-400 hover:text-white hover:bg-editor-border/50'
        }`}
        onClick={() => onChange('editor')}
      >
        Editor
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-display rounded transition-all ${
          mode === 'preview' 
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
  
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-editor-bg">
      <Header />
      
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
    </div>
  );
}

export default App;

