import { useState } from 'react';
import { SplitLayout } from './components/layout/SplitLayout';
import { PuzzleEditor } from './components/editor/PuzzleEditor';
import { PuzzleScene } from './components/3d/PuzzleScene';
import { InventoryPanel } from './components/ui/InventoryPanel';
import { ValidationPanel } from './components/ui/ValidationPanel';
import { usePuzzleStore } from './store/puzzleStore';
import { DEFAULT_PUZZLE, FIT_ALL_PUZZLE } from './types/puzzle';

const SAMPLE_PUZZLES = [
  { id: 'coverage', label: 'T-Time (Coverage)', puzzle: DEFAULT_PUZZLE },
  { id: 'fit-all', label: 'Tetris Pack (Fit All)', puzzle: FIT_ALL_PUZZLE },
];

type ViewMode = 'split' | 'editor' | 'preview';

function Header() {
  const { puzzle, isComplete, setPuzzle, resetPuzzle } = usePuzzleStore();
  const [showPuzzleMenu, setShowPuzzleMenu] = useState(false);
  
  const handlePuzzleSelect = (selectedPuzzle: typeof DEFAULT_PUZZLE) => {
    setPuzzle(selectedPuzzle);
    resetPuzzle();
    setShowPuzzleMenu(false);
  };
  
  return (
    <header className="h-14 bg-editor-sidebar border-b border-editor-border flex items-center px-4 justify-between">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lego-red via-lego-yellow to-lego-blue flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
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
      
      {/* Links */}
      <div className="flex items-center gap-3">
        <a 
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
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
    <div className="h-full flex">
      {/* 3D Scene */}
      <div className="flex-1 bg-editor-bg">
        <PuzzleScene />
      </div>
      
      {/* Side panels */}
      <div className="w-64 flex flex-col bg-editor-sidebar border-l border-editor-border">
        <InventoryPanel className="flex-1 border-b border-editor-border" />
        <ValidationPanel className="h-72" />
      </div>
    </div>
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
          <SplitLayout
            left={<EditorPanel />}
            right={<PreviewPanel />}
            defaultSplit={40}
          />
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

