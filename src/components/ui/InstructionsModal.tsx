import { useState, ReactNode } from 'react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Lego Brick Icon Components
function LegoBrick1x1({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="12" rx="1" fill={color} stroke={color} strokeWidth="1"/>
      <rect x="8" y="4" width="8" height="6" rx="1" fill={color} stroke={color} strokeWidth="1"/>
      <ellipse cx="12" cy="5" rx="3" ry="1.5" fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
    </svg>
  );
}

function LegoBrick2x1({ className = "w-5 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 24" fill="none">
      <rect x="2" y="8" width="28" height="14" rx="1" fill={color} stroke={color} strokeWidth="1"/>
      <ellipse cx="10" cy="5" rx="3" ry="1.5" fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
      <ellipse cx="22" cy="5" rx="3" ry="1.5" fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
      <rect x="6" y="2" width="8" height="8" rx="1" fill={color}/>
      <rect x="18" y="2" width="8" height="8" rx="1" fill={color}/>
    </svg>
  );
}

function LegoTBrick({ className = "w-5 h-5", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      {/* T-shape body */}
      <rect x="2" y="4" width="20" height="8" rx="1" fill={color}/>
      <rect x="8" y="10" width="8" height="10" rx="1" fill={color}/>
      {/* Studs */}
      <ellipse cx="6" cy="3" rx="2" ry="1" fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
      <ellipse cx="12" cy="3" rx="2" ry="1" fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
      <ellipse cx="18" cy="3" rx="2" ry="1" fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
      <ellipse cx="12" cy="16" rx="2" ry="1" fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
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

function LegoCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="12" rx="1" fill="#287F46"/>
      <rect x="7" y="4" width="10" height="6" rx="1" fill="#287F46"/>
      <ellipse cx="12" cy="5" rx="3" ry="1.5" fill="#287F46" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
      {/* Checkmark */}
      <path d="M8 14l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function LegoLightbulbIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="10" rx="1" fill="#F5CD2F"/>
      <rect x="8" y="6" width="8" height="6" rx="1" fill="#F5CD2F"/>
      <ellipse cx="12" cy="7" rx="3" ry="1.5" fill="#F5CD2F" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
      {/* Light rays */}
      <path d="M12 2v2M18 4l-1.5 1.5M6 4l1.5 1.5" stroke="#F5CD2F" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function LegoRocketIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      {/* Rocket body - brick style */}
      <rect x="8" y="6" width="8" height="14" rx="1" fill="#D01012"/>
      {/* Nose cone */}
      <path d="M8 6L12 2L16 6" fill="#D01012"/>
      {/* Fins */}
      <path d="M8 16L4 20V16" fill="#0055BF"/>
      <path d="M16 16L20 20V16" fill="#0055BF"/>
      {/* Window/stud */}
      <ellipse cx="12" cy="10" rx="2" ry="1.5" fill="#D01012" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
      {/* Flame */}
      <path d="M10 20L12 24L14 20" fill="#F5CD2F"/>
    </svg>
  );
}

type TabId = 'overview' | 'shapes' | 'validation' | 'examples';

interface TabDef {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: <LegoStackIcon className="w-4 h-4" /> },
  { id: 'shapes', label: 'Shapes', icon: <LegoTBrick className="w-4 h-4" color="#D01012" /> },
  { id: 'validation', label: 'Validation', icon: <LegoCheckIcon className="w-4 h-4" /> },
  { id: 'examples', label: 'Examples', icon: <LegoLightbulbIcon className="w-4 h-4" /> },
];

function OverviewTab() {
  return (
    <div className="space-y-4">
      {/* Getting Started - Try Sample Puzzles */}
      <div className="bg-gradient-to-r from-editor-accent/20 to-lego-purple/20 border border-editor-accent/40 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-editor-accent/30 flex items-center justify-center flex-shrink-0">
            <LegoStackIcon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-display font-bold text-lg mb-2">Try Sample Puzzles First!</h4>
            <p className="text-gray-300 text-sm mb-3">
              Before creating your own puzzle, try the built-in samples to understand how puzzles work.
            </p>
            <div className="bg-black/30 rounded-lg p-3 flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-editor-border/50 rounded-lg border border-editor-border">
                <LegoBrick1x1 className="w-4 h-4" color="#D01012" />
                <span className="text-gray-400 text-sm">Puzzle:</span>
                <span className="text-white font-display font-medium">T-Time</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="text-gray-400 text-sm">← Click this dropdown in the header to switch puzzles</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-lg flex items-center gap-1.5">
                <LegoBrick1x1 className="w-3 h-3" color="#60A5FA" />
                T-Time — Coverage puzzle
              </span>
              <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-lg flex items-center gap-1.5">
                <LegoBrick2x1 className="w-4 h-3" color="#4ADE80" />
                Tetris Pack — Fit all pieces
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
          Player must cover every cell on an 8×4 board (32 cells) using 8 T-tetrominoes (4 cells each).
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
    { "id": "t4", "shape": "T-tetromino", "color": "#F5CD2F", "quantity": 1 },
    { "id": "t5", "shape": "T-tetromino", "color": "#FE8A18", "quantity": 1 },
    { "id": "t6", "shape": "T-tetromino", "color": "#9B5FC0", "quantity": 1 },
    { "id": "t7", "shape": "T-tetromino", "color": "#00BCD4", "quantity": 1 },
    { "id": "t8", "shape": "T-tetromino", "color": "#E91E63", "quantity": 1 }
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
        <h4 className="text-lego-green font-display font-semibold mb-2 flex items-center gap-2">
          <LegoRocketIcon className="w-5 h-5" />
          Quick Start
        </h4>
        <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
          <li>Click <strong>"Puzzle: T-Time"</strong> in the header to see sample puzzles</li>
          <li>Select a sample to load it into the editor</li>
          <li>Play with the puzzle to understand how it works</li>
          <li>Modify the JSON in the editor to create your own variation</li>
        </ol>
      </div>

      <div className="bg-editor-accent/10 border border-editor-accent/30 rounded-lg p-4">
        <h4 className="text-editor-accent font-display font-semibold mb-2 flex items-center gap-2">
          <LegoLightbulbIcon className="w-5 h-5" />
          Tips
        </h4>
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
              <LegoStackIcon className="w-7 h-7" />
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
              className={`px-4 py-2 rounded-lg text-sm font-display transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-editor-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-editor-border/50'
              }`}
            >
              {tab.icon}
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

