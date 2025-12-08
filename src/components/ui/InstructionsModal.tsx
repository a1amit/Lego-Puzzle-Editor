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

type TabId = 'overview' | 'shapes' | 'validation' | 'slider' | 'examples';

interface TabDef {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: <LegoStackIcon className="w-4 h-4" /> },
  { id: 'shapes', label: 'Shapes', icon: <LegoTBrick className="w-4 h-4" color="#D01012" /> },
  { id: 'validation', label: 'Validation', icon: <LegoCheckIcon className="w-4 h-4" /> },
  { id: 'slider', label: 'Slider Puzzles', icon: <LegoBrick2x1 className="w-4 h-3" color="#D01012" /> },
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
                T-Time — 3D Coverage puzzle
              </span>
              <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-lg flex items-center gap-1.5">
                <LegoBrick2x1 className="w-4 h-3" color="#4ADE80" />
                Tetris Pack — 3D Fit all pieces
              </span>
              <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-lg flex items-center gap-1.5">
                <LegoBrick2x1 className="w-4 h-3" color="#F87171" />
                Klotski Classic — 2D Slider puzzle
              </span>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-lg flex items-center gap-1.5">
                <LegoBrick1x1 className="w-3 h-3" color="#A78BFA" />
                Grid Fill — 2D Coverage puzzle
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-300">
        The Virtual Lego Puzzle Editor lets you create custom puzzles using a JSON-based format. 
        Each puzzle defines a board, inventory of bricks, and validation rules.
      </p>

      {/* View Modes Section */}
      <h4 className="text-white font-display font-semibold mt-6 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        View Modes
      </h4>
      <div className="bg-black/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-blue-500/30 rounded text-blue-300 font-mono text-xs">3D_ISOMETRIC</span>
          <span className="text-gray-400">Interactive 3D view with rotation & zoom (default)</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-green-500/30 rounded text-green-300 font-mono text-xs">2D_TOP_DOWN</span>
          <span className="text-gray-400">Flat 2D grid view for slider & grid puzzles</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-purple-500/30 rounded text-purple-300 font-mono text-xs">2D_GRID</span>
          <span className="text-gray-400">Alternative 2D grid view</span>
        </div>
      </div>

      {/* 3D Controls Section */}
      <h4 className="text-white font-display font-semibold mt-6 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        3D View Controls
      </h4>
      <div className="bg-black/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Left-click + Drag</span>
          <span className="text-gray-400">Rotate the camera view</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Right-click + Drag</span>
          <span className="text-gray-400">Pan the camera view</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Scroll Wheel</span>
          <span className="text-gray-400">Zoom in/out</span>
        </div>
      </div>

      {/* 2D Controls Section */}
      <h4 className="text-white font-display font-semibold mt-6 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        2D View Controls (Slider Puzzles)
      </h4>
      <div className="bg-black/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Click piece</span>
          <span className="text-gray-400">Select a piece (shows valid moves as green)</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Click green cell</span>
          <span className="text-gray-400">Slide the selected piece to that position</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Esc</span>
          <span className="text-gray-400">Deselect current piece</span>
        </div>
      </div>

      <h4 className="text-white font-display font-semibold mt-6 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
        Brick Controls
      </h4>
      <div className="bg-black/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Click inventory brick</span>
          <span className="text-gray-400">Select a brick to place</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">R / Right-click</span>
          <span className="text-gray-400">Rotate selected brick 90°</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Click on board</span>
          <span className="text-gray-400">Place the selected brick</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Click placed brick</span>
          <span className="text-gray-400">Lift and reposition</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Del</span>
          <span className="text-gray-400">Remove brick from board</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-editor-border rounded text-gray-300 font-mono text-xs">Esc</span>
          <span className="text-gray-400">Deselect current brick</span>
        </div>
      </div>
      
      <h4 className="text-white font-display font-semibold mt-6">JSON Structure</h4>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "puzzle_id": "unique-id",
  "title": "Puzzle Name",
  "description": "Instructions for the player",
  "viewMode": "3D_ISOMETRIC",  // or "2D_TOP_DOWN"
  "board": {
    "dimensions": { "width": 8, "height": 4, "depth": 1 },
    "initial_state": [],        // Pre-placed pieces
    "blocked_cells": []         // Obstacle cells
  },
  "inventory": [...],
  "validation_rules": [...],
  "goal": { ... },              // Optional: for slider puzzles
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
        <li><code className="text-editor-accent">initial_state</code> - Pre-placed pieces for slider puzzles</li>
        <li><code className="text-editor-accent">blocked_cells</code> - Cells where pieces cannot be placed</li>
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
    { name: 'domino-v', cells: '[[0,0],[0,1]]', desc: 'Two cells vertical (2 cells)' },
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

      <h4 className="text-white font-display font-semibold mt-6">Inventory Item Format (for 3D puzzles)</h4>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "id": "brick-1",        // Unique identifier
  "shape": "T-tetromino", // Shape name from above
  "color": "#D01012",     // Hex color code
  "quantity": 2           // How many of this brick
}`}
      </pre>

      <h4 className="text-white font-display font-semibold mt-6">Cell-Based Piece Definition (for Slider Puzzles)</h4>
      <p className="text-gray-400 text-sm mb-3">
        For slider puzzles, pieces are defined by the exact cells they cover in <code className="text-editor-accent">initial_state</code>:
      </p>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`"initial_state": [
  {
    "id": "red-block",
    "cells": [[1,0], [2,0], [1,1], [2,1]],  // 2x2 block
    "color": "#D01012"
  },
  {
    "id": "blue-v1",
    "cells": [[0,0], [0,1]],                // Vertical domino
    "color": "#0055BF"
  }
]`}
      </pre>
      <p className="text-gray-400 text-sm mt-2">
        Each cell is <code className="text-editor-accent">[x, y]</code> — the exact grid positions the piece covers.
      </p>
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
    {
      name: 'SLIDING_ONLY',
      type: 'MOVEMENT',
      desc: 'Pieces can only slide horizontally or vertically — no lifting or free placement. Used for Klotski-style puzzles.',
    },
    {
      name: 'FREE_PLACEMENT',
      type: 'MOVEMENT',
      desc: 'Pieces can be placed freely anywhere on the board (default behavior).',
    },
    {
      name: 'GOAL_REACHED',
      type: 'GOAL',
      desc: 'Check if the target piece has reached the goal cells. Used as win condition for slider puzzles.',
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'COVERAGE': return 'bg-blue-500/20 text-blue-300';
      case 'COUNT': return 'bg-green-500/20 text-green-300';
      case 'PLACEMENT': return 'bg-yellow-500/20 text-yellow-300';
      case 'MOVEMENT': return 'bg-purple-500/20 text-purple-300';
      case 'GOAL': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-300">
        Validation rules determine when a puzzle is "solved". Combine multiple rules for complex puzzles.
      </p>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.name} className="bg-black/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(rule.type)}`}>
                {rule.type}
              </span>
            </div>
            <code className="text-editor-accent font-display text-sm">{rule.name}</code>
            <p className="text-gray-400 text-sm mt-1">{rule.desc}</p>
          </div>
        ))}
      </div>

      <h4 className="text-white font-display font-semibold mt-6">Rule Format (Coverage Puzzle)</h4>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`"validation_rules": [
  { "type": "COVERAGE", "rule": "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
  { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
  { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
]`}
      </pre>

      <h4 className="text-white font-display font-semibold mt-6">Rule Format (Slider Puzzle)</h4>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`"validation_rules": [
  { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
  { "type": "GOAL", "rule": "GOAL_REACHED" }
]`}
      </pre>
    </div>
  );
}

function SliderTab() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/30 flex items-center justify-center flex-shrink-0">
            <LegoBrick2x1 className="w-8 h-6" color="#D01012" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-display font-bold text-lg mb-2">Klotski-Style Slider Puzzles</h4>
            <p className="text-gray-300 text-sm">
              Slider puzzles have pre-placed pieces that can only <strong>slide</strong> horizontally or vertically. 
              The goal is to move a target piece to a specific position (like a red 2×2 block to an exit).
            </p>
          </div>
        </div>
      </div>

      <h4 className="text-white font-display font-semibold">Key Differences from 3D Puzzles</h4>
      <div className="bg-black/30 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3 text-sm">
          <span className="px-2 py-1 bg-blue-500/30 rounded text-blue-300 font-mono text-xs shrink-0">viewMode</span>
          <span className="text-gray-400">Set to <code className="text-editor-accent">"2D_TOP_DOWN"</code> for flat 2D rendering</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <span className="px-2 py-1 bg-green-500/30 rounded text-green-300 font-mono text-xs shrink-0">initial_state</span>
          <span className="text-gray-400">Pieces start on the board (not in inventory). Defined by exact cells they cover.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <span className="px-2 py-1 bg-purple-500/30 rounded text-purple-300 font-mono text-xs shrink-0">SLIDING_ONLY</span>
          <span className="text-gray-400">Movement rule that prevents lifting — pieces slide along one axis only.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <span className="px-2 py-1 bg-red-500/30 rounded text-red-300 font-mono text-xs shrink-0">goal</span>
          <span className="text-gray-400">Defines which piece must reach which cells to win.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <span className="px-2 py-1 bg-yellow-500/30 rounded text-yellow-300 font-mono text-xs shrink-0">blocked_cells</span>
          <span className="text-gray-400">Cells where pieces cannot slide through (obstacles/walls).</span>
        </div>
      </div>

      <h4 className="text-white font-display font-semibold mt-6">Goal Definition</h4>
      <p className="text-gray-400 text-sm mb-3">
        The <code className="text-editor-accent">goal</code> property defines the win condition — which piece must cover which cells:
      </p>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`"goal": {
  "targetPieceId": "goal",          // ID of the piece to move
  "cells": [[1,4], [2,4], [1,5], [2,5]]  // Cells it must cover to win
}`}
      </pre>

      <h4 className="text-white font-display font-semibold mt-6">Example: Minimal Slider</h4>
      <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "puzzle_id": "mini-slider",
  "title": "Mini Slider",
  "description": "Slide the red block to the bottom",
  "viewMode": "2D_TOP_DOWN",
  "board": {
    "dimensions": { "width": 4, "height": 5, "depth": 1 },
    "initial_state": [
      {
        "id": "goal",
        "cells": [[1,0], [2,0], [1,1], [2,1]],
        "color": "#D01012"
      },
      {
        "id": "blocker1",
        "cells": [[0,0], [0,1]],
        "color": "#0055BF"
      }
    ],
    "blocked_cells": [[0,4], [3,4]]
  },
  "inventory": [],
  "validation_rules": [
    { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
    { "type": "GOAL", "rule": "GOAL_REACHED" }
  ],
  "goal": {
    "targetPieceId": "goal",
    "cells": [[1,4], [2,4], [1,5], [2,5]]
  }
}`}
      </pre>

      <h4 className="text-white font-display font-semibold mt-6">How Sliding Works</h4>
      <div className="bg-black/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 flex items-center justify-center bg-green-500/30 rounded text-green-300">1</span>
          <span className="text-gray-400">Click a piece to select it</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 flex items-center justify-center bg-green-500/30 rounded text-green-300">2</span>
          <span className="text-gray-400">Valid slide destinations appear as <span className="text-green-400">green cells</span></span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 flex items-center justify-center bg-green-500/30 rounded text-green-300">3</span>
          <span className="text-gray-400">Click any green cell to slide the piece there</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 flex items-center justify-center bg-green-500/30 rounded text-green-300">4</span>
          <span className="text-gray-400">The <span className="text-yellow-400">GOAL area</span> is shown with a dotted border</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 flex items-center justify-center bg-green-500/30 rounded text-green-300">5</span>
          <span className="text-gray-400">Move the target piece to cover all goal cells to win!</span>
        </div>
      </div>
    </div>
  );
}

function ExamplesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-white font-display font-semibold mb-2">Coverage Puzzle (3D)</h4>
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
        <h4 className="text-white font-display font-semibold mb-2">Fit All Bricks Puzzle (3D)</h4>
        <p className="text-gray-400 text-sm mb-3">
          Player must place all bricks on a larger board. Empty cells allowed.
        </p>
        <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "puzzle_id": "tetris-pack",
  "title": "Tetris Pack",
  "viewMode": "3D_ISOMETRIC",
  "board": {
    "dimensions": { "width": 10, "height": 4, "depth": 1 },
    "initial_state": []
  },
  "inventory": [
    { "id": "t", "shape": "T-tetromino", "color": "#9B5FC0", "quantity": 1 },
    { "id": "i", "shape": "I-tetromino", "color": "#00BCD4", "quantity": 1 },
    ...
  ],
  "validation_rules": [
    { "type": "COUNT", "rule": "ALL_BRICKS_MUST_BE_USED" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ]
}`}
        </pre>
      </div>

      <div>
        <h4 className="text-white font-display font-semibold mb-2">Slider Puzzle (2D)</h4>
        <p className="text-gray-400 text-sm mb-3">
          Klotski-style puzzle. Slide the red 2×2 block to the goal position at the bottom.
        </p>
        <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto text-gray-300">
{`{
  "puzzle_id": "Slider-01",
  "title": "Klotski Classic",
  "viewMode": "2D_TOP_DOWN",
  "board": {
    "dimensions": { "width": 4, "height": 5, "depth": 1 },
    "initial_state": [
      { "id": "goal", "cells": [[1,0],[2,0],[1,1],[2,1]], "color": "#D01012" },
      { "id": "v1", "cells": [[0,0],[0,1]], "color": "#0055BF" },
      { "id": "v2", "cells": [[3,0],[3,1]], "color": "#0055BF" },
      ...
    ],
    "blocked_cells": [[0,4], [3,4]]
  },
  "inventory": [],
  "validation_rules": [
    { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
    { "type": "GOAL", "rule": "GOAL_REACHED" }
  ],
  "goal": {
    "targetPieceId": "goal",
    "cells": [[1,4],[2,4],[1,5],[2,5]]
  }
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
          {activeTab === 'slider' && <SliderTab />}
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

