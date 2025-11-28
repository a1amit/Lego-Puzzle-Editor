import { useState } from 'react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'overview' | 'shapes' | 'validation' | 'examples';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📖' },
  { id: 'shapes', label: 'Shapes', icon: '🧱' },
  { id: 'validation', label: 'Validation', icon: '✅' },
  { id: 'examples', label: 'Examples', icon: '💡' },
];

function OverviewTab() {
  return (
    <div className="space-y-4">
      {/* Getting Started - Try Sample Puzzles */}
      <div className="bg-gradient-to-r from-editor-accent/20 to-lego-purple/20 border border-editor-accent/40 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-editor-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🎮</span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-display font-bold text-lg mb-2">Try Sample Puzzles First!</h4>
            <p className="text-gray-300 text-sm mb-3">
              Before creating your own puzzle, try the built-in samples to understand how puzzles work.
            </p>
            <div className="bg-black/30 rounded-lg p-3 flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-editor-border/50 rounded-lg border border-editor-border">
                <span className="text-gray-400 text-sm">Puzzle:</span>
                <span className="text-white font-display font-medium">T-Time</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="text-gray-400 text-sm">← Click this dropdown in the header to switch puzzles</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-lg">
                🧩 T-Time — Coverage puzzle (cover all squares)
              </span>
              <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-lg">
                🧩 Tetris Pack — Fit all pieces puzzle
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-300">
        The Virtual Lego Puzzle Editor lets you create custom puzzles using a JSON-based format. 
        Each puzzle defines a board, inventory of bricks, and validation rules.
      </p>
      
      <h4 className="text-white font-display font-semibold mt-6">JSON Structure</h4>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "puzzle_id": "unique-id",
  "title": "Puzzle Name",
  "description": "Instructions for the player",
  "board": {
    "dimensions": { "width": 8, "height": 4, "depth": 1 },
    "initial_state": []
  },
  "inventory": [...],
  "validation_rules": [...],
  "metadata": {
    "author": "Your Name",
    "difficulty": "easy|medium|hard",
    "tags": ["tag1", "tag2"]
  }
}`}
      </pre>

      <h4 className="text-white font-display font-semibold mt-6">Board Configuration</h4>
      <ul className="list-disc list-inside text-gray-300 space-y-1">
        <li><code className="text-editor-accent">width</code> - Number of columns (1-20)</li>
        <li><code className="text-editor-accent">height</code> - Number of rows (1-20)</li>
        <li><code className="text-editor-accent">depth</code> - Height layers (usually 1)</li>
        <li><code className="text-editor-accent">initial_state</code> - Pre-placed bricks (optional)</li>
      </ul>
    </div>
  );
}

function ShapesTab() {
  const shapes = [
    { name: 'T-tetromino', cells: '[[0,0],[1,0],[2,0],[1,1]]', desc: 'T-shaped piece (4 cells)' },
    { name: 'I-tetromino', cells: '[[0,0],[1,0],[2,0],[3,0]]', desc: 'Straight line (4 cells)' },
    { name: 'L-tetromino', cells: '[[0,0],[0,1],[0,2],[1,2]]', desc: 'L-shaped piece (4 cells)' },
    { name: 'J-tetromino', cells: '[[1,0],[1,1],[1,2],[0,2]]', desc: 'Reverse L (4 cells)' },
    { name: 'O-tetromino', cells: '[[0,0],[1,0],[0,1],[1,1]]', desc: 'Square piece (4 cells)' },
    { name: 'S-tetromino', cells: '[[1,0],[2,0],[0,1],[1,1]]', desc: 'S-shaped piece (4 cells)' },
    { name: 'Z-tetromino', cells: '[[0,0],[1,0],[1,1],[2,1]]', desc: 'Z-shaped piece (4 cells)' },
    { name: 'unit', cells: '[[0,0]]', desc: 'Single cell (1 cell)' },
    { name: 'domino', cells: '[[0,0],[1,0]]', desc: 'Two cells horizontal (2 cells)' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-gray-300">
        Available built-in shapes. Each brick in the inventory references a shape by name.
      </p>

      <div className="grid gap-3">
        {shapes.map((shape) => (
          <div key={shape.name} className="bg-black/30 rounded-lg p-3 flex items-start gap-4">
            <div className="flex-1">
              <div className="font-display font-semibold text-white">{shape.name}</div>
              <div className="text-sm text-gray-400">{shape.desc}</div>
              <code className="text-xs text-editor-accent mt-1 block">{shape.cells}</code>
            </div>
          </div>
        ))}
      </div>

      <h4 className="text-white font-display font-semibold mt-6">Inventory Item Format</h4>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "id": "brick-1",      // Unique identifier
  "shape": "T-tetromino", // Shape name from above
  "color": "#D01012",   // Hex color code
  "quantity": 2         // How many of this brick
}`}
      </pre>
    </div>
  );
}

function ValidationTab() {
  const rules = [
    {
      name: 'ALL_BOARD_SQUARES_MUST_BE_COVERED',
      type: 'COVERAGE',
      desc: 'Every cell on the board must be covered by a brick. Used for classic coverage puzzles.',
    },
    {
      name: 'ALL_BRICKS_MUST_BE_USED',
      type: 'COUNT',
      desc: 'All bricks from the inventory must be placed on the board. Board can have empty cells.',
    },
    {
      name: 'NO_BRICK_OVERLAP',
      type: 'PLACEMENT',
      desc: 'Bricks cannot overlap each other. Usually required for all puzzles.',
    },
    {
      name: 'NO_BRICKS_OUT_OF_BOUNDS',
      type: 'PLACEMENT',
      desc: 'All bricks must be fully within the board boundaries.',
    },
    {
      name: 'NO_BLOCKED_CELLS',
      type: 'PLACEMENT',
      desc: 'Bricks cannot be placed on blocked/obstacle cells.',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-gray-300">
        Validation rules determine when a puzzle is "solved". Combine multiple rules for complex puzzles.
      </p>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.name} className="bg-black/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs rounded ${
                rule.type === 'COVERAGE' ? 'bg-blue-500/20 text-blue-300' :
                rule.type === 'COUNT' ? 'bg-green-500/20 text-green-300' :
                'bg-yellow-500/20 text-yellow-300'
              }`}>
                {rule.type}
              </span>
            </div>
            <code className="text-editor-accent font-display text-sm">{rule.name}</code>
            <p className="text-gray-400 text-sm mt-1">{rule.desc}</p>
          </div>
        ))}
      </div>

      <h4 className="text-white font-display font-semibold mt-6">Rule Format</h4>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`"validation_rules": [
  { "type": "COVERAGE", "rule": "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
  { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
  { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
]`}
      </pre>
    </div>
  );
}

function ExamplesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-white font-display font-semibold mb-2">Coverage Puzzle</h4>
        <p className="text-gray-400 text-sm mb-3">
          Player must cover every cell on an 8×4 board using 4 T-tetrominoes.
        </p>
        <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "puzzle_id": "t-puzzle",
  "title": "T-Time",
  "description": "Cover the entire board with T pieces",
  "board": {
    "dimensions": { "width": 8, "height": 4, "depth": 1 },
    "initial_state": []
  },
  "inventory": [
    { "id": "t1", "shape": "T-tetromino", "color": "#D01012", "quantity": 1 },
    { "id": "t2", "shape": "T-tetromino", "color": "#0055BF", "quantity": 1 },
    { "id": "t3", "shape": "T-tetromino", "color": "#287F46", "quantity": 1 },
    { "id": "t4", "shape": "T-tetromino", "color": "#F5CD2F", "quantity": 1 }
  ],
  "validation_rules": [
    { "type": "COVERAGE", "rule": "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ]
}`}
        </pre>
      </div>

      <div>
        <h4 className="text-white font-display font-semibold mb-2">Fit All Bricks Puzzle</h4>
        <p className="text-gray-400 text-sm mb-3">
          Player must place all bricks on a larger board. Empty cells allowed.
        </p>
        <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "puzzle_id": "tetris-pack",
  "title": "Tetris Pack",
  "description": "Fit all 7 pieces onto the board",
  "board": {
    "dimensions": { "width": 10, "height": 4, "depth": 1 },
    "initial_state": []
  },
  "inventory": [
    { "id": "t", "shape": "T-tetromino", "color": "#9B5FC0", "quantity": 1 },
    { "id": "i", "shape": "I-tetromino", "color": "#00BCD4", "quantity": 1 },
    { "id": "l", "shape": "L-tetromino", "color": "#FE8A18", "quantity": 1 },
    { "id": "j", "shape": "J-tetromino", "color": "#0055BF", "quantity": 1 },
    { "id": "o", "shape": "O-tetromino", "color": "#F5CD2F", "quantity": 1 },
    { "id": "s", "shape": "S-tetromino", "color": "#287F46", "quantity": 1 },
    { "id": "z", "shape": "Z-tetromino", "color": "#D01012", "quantity": 1 }
  ],
  "validation_rules": [
    { "type": "COUNT", "rule": "ALL_BRICKS_MUST_BE_USED" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ]
}`}
        </pre>
      </div>

      {/* Quick Start */}
      <div className="bg-gradient-to-r from-lego-green/20 to-editor-success/20 border border-lego-green/40 rounded-lg p-4">
        <h4 className="text-lego-green font-display font-semibold mb-2">🚀 Quick Start</h4>
        <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
          <li>Click <strong>"Puzzle: T-Time"</strong> in the header to see sample puzzles</li>
          <li>Select a sample to load it into the editor</li>
          <li>Play with the puzzle to understand how it works</li>
          <li>Modify the JSON in the editor to create your own variation</li>
        </ol>
      </div>

      <div className="bg-editor-accent/10 border border-editor-accent/30 rounded-lg p-4">
        <h4 className="text-editor-accent font-display font-semibold mb-2">💡 Tips</h4>
        <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
          <li>Use the <strong>Format</strong> button to auto-format your JSON</li>
          <li>Changes are applied live when JSON is valid</li>
          <li>Each brick ID must be unique in the inventory</li>
          <li>Colors can be any valid CSS hex color</li>
          <li>Bricks can be rotated 90° by pressing <kbd className="px-1 bg-editor-border rounded">R</kbd></li>
          <li>All panels are resizable — drag the borders to adjust!</li>
        </ul>
      </div>
    </div>
  );
}

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-editor-sidebar border border-editor-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-editor-border bg-editor-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-editor-accent to-lego-purple flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">Puzzle Creator Guide</h2>
              <p className="text-sm text-gray-400">Learn how to create custom puzzles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-editor-border/50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-editor-border bg-editor-bg/30">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-display transition-all ${
                activeTab === tab.id
                  ? 'bg-editor-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-editor-border/50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'shapes' && <ShapesTab />}
          {activeTab === 'validation' && <ValidationTab />}
          {activeTab === 'examples' && <ExamplesTab />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-editor-border bg-editor-bg/50 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-editor-border rounded text-gray-400">Esc</kbd> to close
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-display text-sm transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

