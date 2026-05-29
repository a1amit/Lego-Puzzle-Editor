import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/shadcn/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../ui/shadcn/tabs';
import { Button } from '../ui/shadcn/button';
import { Badge } from '../ui/shadcn/badge';
import {
  Layers,
  Puzzle,
  ShieldCheck,
  Lightbulb,
  Rocket,
  Square,
  RectangleHorizontal,
  Grid3x3,
  Mouse,
  Move,
  Keyboard,
  Copy,
  Check,
  Sparkles,
  Code2,
} from 'lucide-react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function KBD({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded font-mono text-xs">
      {children}
    </kbd>
  );
}

function CopyableCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[var(--surface-sunken)] rounded-lg p-4 pr-12 text-sm overflow-x-auto text-muted-foreground font-mono">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary/80 border border-[var(--border-subtle)] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function ShapePreviewMini({ cells, color = 'var(--primary)' }: { cells: number[][]; color?: string }) {
  if (!cells.length) return null;
  const xs = cells.map(c => c[0]);
  const ys = cells.map(c => c[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const cellSize = 8;
  const gap = 1;
  const w = cols * (cellSize + gap) - gap;
  const h = rows * (cellSize + gap) - gap;

  return (
    <svg width={w} height={h} className="shrink-0">
      {cells.map((c, i) => (
        <rect
          key={i}
          x={(c[0] - minX) * (cellSize + gap)}
          y={(c[1] - minY) * (cellSize + gap)}
          width={cellSize}
          height={cellSize}
          rx={1.5}
          fill={color}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

/** Large section heading with icon, colored left border, and divider */
function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mt-8 mb-3 first:mt-0 pb-2 border-b border-border">
      {icon && <div className="text-primary">{icon}</div>}
      <h3 className="text-base font-bold text-foreground tracking-tight">{children}</h3>
    </div>
  );
}

/** Medium subsection heading — slightly smaller, no divider, muted accent */
function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold text-foreground/80 mt-5 mb-2 pl-0.5 border-l-2 border-primary/40 pl-2.5">{children}</h4>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      {/* Getting Started */}
      <div className="bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/40 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-foreground font-bold text-lg mb-2">Try Sample Puzzles First!</h4>
            <p className="text-muted-foreground text-sm mb-3">
              Before creating your own puzzle, try the built-in samples to understand how puzzles work.
            </p>
            <div className="bg-background/50 rounded-lg p-3 text-sm text-muted-foreground">
              Click the <strong className="text-foreground">Puzzle</strong> dropdown in the header to switch puzzles
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <Square className="w-3 h-3 text-lego-red" />
                T-Time — 3D Coverage
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <RectangleHorizontal className="w-3 h-3 text-lego-blue" />
                Tetris Pack — 3D Fit all
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Move className="w-3 h-3 text-red-400" />
                Klotski — 2D Slider
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Grid3x3 className="w-3 h-3 text-emerald-400" />
                Nonogram — 2D Logic
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground">
        The Virtual Lego Puzzle Editor lets you create custom puzzles using a JSON-based format.
        Each puzzle defines a board, inventory of bricks, and validation rules.
      </p>

      {/* View Modes */}
      <SectionTitle icon={<Layers className="w-4 h-4" />}>View Modes</SectionTitle>
      <div className="bg-secondary rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="default" className="text-xs">3D</Badge>
          <span className="text-muted-foreground">Interactive 3D view with rotation & zoom (default)</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="secondary" className="text-xs">2D</Badge>
          <span className="text-muted-foreground">Flat 2D grid view for slider & grid puzzles</span>
        </div>
      </div>

      {/* 3D Controls */}
      <SectionTitle icon={<Mouse className="w-4 h-4" />}>3D View Controls</SectionTitle>
      <div className="bg-secondary rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <KBD>Left-click + Drag</KBD>
          <span className="text-muted-foreground">Rotate the camera view</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>Right-click + Drag</KBD>
          <span className="text-muted-foreground">Pan the camera view</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>Scroll Wheel</KBD>
          <span className="text-muted-foreground">Zoom in/out</span>
        </div>
      </div>

      {/* 2D Controls */}
      <SectionTitle icon={<Move className="w-4 h-4" />}>2D View Controls (Slider Puzzles)</SectionTitle>
      <div className="bg-secondary rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <KBD>Click piece</KBD>
          <span className="text-muted-foreground">Select a piece (shows valid moves as green)</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>Click green cell</KBD>
          <span className="text-muted-foreground">Slide the selected piece to that position</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>Esc</KBD>
          <span className="text-muted-foreground">Deselect current piece</span>
        </div>
      </div>

      {/* Brick Controls */}
      <SectionTitle icon={<Keyboard className="w-4 h-4" />}>Brick Controls</SectionTitle>
      <div className="bg-secondary rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <KBD>Click inventory brick</KBD>
          <span className="text-muted-foreground">Select a brick to place</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>R / Right-click</KBD>
          <span className="text-muted-foreground">Rotate selected brick 90°</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>Click on board</KBD>
          <span className="text-muted-foreground">Place the selected brick</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>Click placed brick</KBD>
          <span className="text-muted-foreground">Lift and reposition</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>Del</KBD>
          <span className="text-muted-foreground">Remove brick from board</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <KBD>Esc</KBD>
          <span className="text-muted-foreground">Deselect current brick</span>
        </div>
      </div>

      <SectionTitle>JSON Structure</SectionTitle>
      <CopyableCode>{`{
  "title": "Puzzle Name",
  "description": "Instructions for the player",
  "viewMode": "3D",  // or "2D"
  "board": {
    "dimensions": { "width": 8, "height": 4, "depth": 1 },
    "initial_state": [],
    "blocked_cells": []
  },
  "inventory": [...],
  "validation_rules": [...],
  "goal": { ... },
  "metadata": {
    "author": "Your Name",
    "difficulty": "easy|medium|hard|expert",
    "tags": ["tag1", "tag2"]
  }
}`}</CopyableCode>

      <SectionTitle>Board Configuration</SectionTitle>
      <ul className="list-disc list-inside text-muted-foreground space-y-1">
        <li><code className="text-primary">width</code> - Number of columns (1-20)</li>
        <li><code className="text-primary">height</code> - Number of rows (1-20)</li>
        <li><code className="text-primary">depth</code> - Height layers (usually 1)</li>
        <li><code className="text-primary">initial_state</code> - Pre-placed pieces for slider puzzles</li>
        <li><code className="text-primary">blocked_cells</code> - Cells where pieces cannot be placed</li>
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
    { name: 'tromino-I', cells: '[[0,0],[1,0],[2,0]]', desc: 'Three cells horizontal (3 cells)' },
    { name: 'plus', cells: '[[1,0],[1,1],[1,2],[0,1],[2,1]]', desc: 'Cross shape (5 cells)' },
    { name: 'long-L-pentomino', cells: '[[0,1],[1,1],[2,1],[3,1],[0,0]]', desc: 'Long L shape (5 cells)' },
    { name: 'corner-pentomino', cells: '[[0,2],[1,2],[2,2],[2,1],[2,0]]', desc: 'Corner shape (5 cells)' },
    { name: 'stretched-Z-pentomino', cells: '[[1,2],[2,2],[1,1],[0,0],[1,0]]', desc: 'Stretched Z shape (5 cells)' },
    { name: 'U-pentomino', cells: '[[0,0],[1,0],[1,1],[0,2],[1,2]]', desc: 'U shape (5 cells)' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Available built-in shapes. Each brick in the inventory references a shape by name.
      </p>

      <div className="grid gap-3">
        {shapes.map((shape) => {
          const parsedCells = JSON.parse(shape.cells) as number[][];
          return (
            <div key={shape.name} className="bg-secondary rounded-lg p-3 flex items-start gap-4">
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <ShapePreviewMini cells={parsedCells} color="oklch(0.65 0.15 250)" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{shape.name}</div>
                <div className="text-sm text-muted-foreground">{shape.desc}</div>
                <code className="text-xs text-primary mt-1 block">{shape.cells}</code>
              </div>
            </div>
          );
        })}
      </div>

      <SectionTitle>Inventory Item Format (3D Puzzles)</SectionTitle>
      <CopyableCode>{`{
  "id": "brick-1",
  "shape": "T-tetromino",
  "color": "#D01012",
  "quantity": 2
}`}</CopyableCode>

      <SectionTitle>Custom Shapes (3D Puzzles)</SectionTitle>
      <p className="text-muted-foreground text-sm mb-3">
        Not limited to the built-in shapes above — define any arbitrary shape using <code className="text-primary">custom_shapes</code> in your puzzle definition:
      </p>
      <CopyableCode>{`"custom_shapes": {
  "my-L-shape": {
    "name": "my-L-shape",
    "cells": [[0,0], [1,0], [2,0], [2,1], [2,2]]
  }
}`}</CopyableCode>
      <p className="text-muted-foreground text-sm mt-2 mb-1">
        Then reference it by name in your inventory, just like any built-in shape:
      </p>
      <CopyableCode>{`{
  "id": "custom-1",
  "shape": "my-L-shape",
  "color": "#FF6600",
  "quantity": 1
}`}</CopyableCode>
      <p className="text-muted-foreground text-sm mt-2">
        Each cell is <code className="text-primary">[x, y]</code> relative to the piece origin. You can create any polyomino shape this way.
      </p>

      <SectionTitle>Cell-Based Piece Definition (Slider Puzzles)</SectionTitle>
      <p className="text-muted-foreground text-sm mb-3">
        For slider puzzles, pieces are defined by the exact cells they cover in <code className="text-primary">initial_state</code>:
      </p>
      <CopyableCode>{`"initial_state": [
  {
    "id": "red-block",
    "cells": [[1,0], [2,0], [1,1], [2,1]],
    "color": "#D01012"
  },
  {
    "id": "blue-v1",
    "cells": [[0,0], [0,1]],
    "color": "#0055BF"
  }
]`}</CopyableCode>
      <p className="text-muted-foreground text-sm mt-2">
        Each cell is <code className="text-primary">[x, y]</code> — the exact grid positions the piece covers.
      </p>
    </div>
  );
}

function ValidationTab() {
  const rules = [
    { name: 'ALL_BOARD_SQUARES_MUST_BE_COVERED', type: 'COVERAGE', desc: 'Every cell on the board must be covered by a brick. Used for classic coverage puzzles.' },
    { name: 'ALL_BRICKS_MUST_BE_USED', type: 'COUNT', desc: 'All bricks from the inventory must be placed on the board. Board can have empty cells.' },
    { name: 'NO_BRICK_OVERLAP', type: 'PLACEMENT', desc: 'Bricks cannot overlap each other. Usually required for all puzzles.' },
    { name: 'NO_BRICKS_OUT_OF_BOUNDS', type: 'PLACEMENT', desc: 'All bricks must be fully within the board boundaries.' },
    { name: 'NO_BLOCKED_CELLS', type: 'PLACEMENT', desc: 'Bricks cannot be placed on blocked/obstacle cells.' },
    { name: 'SLIDING_ONLY', type: 'MOVEMENT', desc: 'Pieces can only slide horizontally or vertically — no lifting or free placement.' },
    { name: 'FREE_PLACEMENT', type: 'MOVEMENT', desc: 'Pieces can be placed freely anywhere on the board (default behavior).' },
    { name: 'NO_ROTATION', type: 'ROTATION', desc: 'Disables rotation for all pieces. Used for slider puzzles.' },
    {
      name: 'PATTERN_MATCH', type: 'PATTERN', desc: 'Check if placed pieces match a target pattern.',
      paramDetails: [
        { name: 'rows', tooltip: '2D array defining the pattern grid.' },
        { name: 'color_mapping', tooltip: 'Object mapping pattern values to hex colors.' },
        { name: 'allow_empty_cells?', tooltip: 'If true, cells in the pattern can be empty.' },
        { name: 'reject_unmapped_target_colors?', tooltip: 'If true, rejects mapped colors in unmapped cells.' },
      ],
    },
    {
      name: 'GOAL_REACHED', type: 'GOAL', desc: 'Check if the target piece has reached the goal cells.',
      paramDetails: [
        { name: 'targetPieceId', tooltip: 'ID of the single piece that must reach the goal.' },
        { name: 'targetPieceIds', tooltip: 'Array of piece IDs — any one reaching the goal wins.' },
        { name: 'allowAnyPiece', tooltip: 'If true, any piece can trigger the win.' },
        { name: 'cells', tooltip: 'Array of [x,y] coordinates defining the goal area.' },
        { name: 'hideGoalVisualization?', tooltip: 'If true, hides the goal overlay.' },
      ],
    },
    { name: 'NO_BRICK_REMOVAL', type: 'CONSTRAINT', desc: 'Prevents deleting/removing pieces from the board.' },
    {
      name: 'MAX_MOVES', type: 'MAX_MOVES', desc: 'Limits the maximum number of moves allowed.',
      paramDetails: [{ name: 'maxMoves', tooltip: 'Maximum number of moves allowed.' }],
    },
    {
      name: 'CUSTOM_RULE', type: 'CUSTOM', desc: 'Creator-defined rule using the visual rule builder. Build complex win conditions by combining 29 condition types (cell checks, row/column rules, stacking, symmetry, spatial, and count-based) with nestable logic groups (ALL, ANY, NONE, EXACTLY_N, AT_LEAST_N).',
      paramDetails: [
        { name: 'label', tooltip: 'Display name shown in the validation panel.' },
        { name: 'condition', tooltip: 'Recursive condition tree with leaf conditions and logic combinators.' },
      ],
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'COVERAGE': return 'bg-blue-500/20 text-blue-300';
      case 'COUNT': return 'bg-green-500/20 text-green-300';
      case 'PLACEMENT': return 'bg-yellow-500/20 text-yellow-300';
      case 'MOVEMENT': return 'bg-purple-500/20 text-purple-300';
      case 'ROTATION': return 'bg-orange-500/20 text-orange-300';
      case 'PATTERN': return 'bg-cyan-500/20 text-cyan-300';
      case 'GOAL': return 'bg-red-500/20 text-red-300';
      case 'CONSTRAINT': return 'bg-pink-500/20 text-pink-300';
      case 'MAX_MOVES': return 'bg-red-500/20 text-red-300';
      case 'CUSTOM': return 'bg-teal-500/20 text-teal-300';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Validation rules determine when a puzzle is "solved". Combine multiple rules for complex puzzles.
      </p>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.name} className="bg-secondary rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(rule.type)}`}>
                {rule.type}
              </span>
            </div>
            <code className="text-primary text-sm">{rule.name}</code>
            <p className="text-muted-foreground text-sm mt-1">{rule.desc}</p>
            {rule.paramDetails && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-muted-foreground text-xs">Params:</span>
                {rule.paramDetails.map((param, idx) => (
                  <span key={idx} className="relative group">
                    <code className="text-cyan-400 text-xs cursor-help px-1.5 py-0.5 bg-cyan-500/10 rounded hover:bg-cyan-500/20 transition-colors">
                      {param.name}
                    </code>
                    <span className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-popover border border-border rounded-lg text-xs text-popover-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                      {param.tooltip}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <SubTitle>Rule Format (Coverage Puzzle)</SubTitle>
      <CopyableCode>{`"validation_rules": [
  { "type": "COVERAGE", "rule": "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
  { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
  { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
]`}</CopyableCode>

      <SubTitle>Rule Format (Slider Puzzle)</SubTitle>
      <CopyableCode>{`"validation_rules": [
  { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
  { "type": "ROTATION", "rule": "NO_ROTATION" },
  { "type": "CONSTRAINT", "rule": "NO_BRICK_REMOVAL" },
  { "type": "GOAL", "rule": "GOAL_REACHED" }
]`}</CopyableCode>

      <SubTitle>Custom Rule Example</SubTitle>
      <p className="text-muted-foreground text-sm mb-2">
        Custom rules let you combine conditions with logic groups (ALL, ANY, NONE). Use the <strong>Custom Rules</strong> tab in the editor for a visual builder, or define them in JSON:
      </p>
      <CopyableCode>{`{
  "type": "CUSTOM",
  "rule": "CUSTOM_RULE",
  "params": {
    "label": "Symmetric tower",
    "condition": {
      "kind": "ALL",
      "children": [
        { "kind": "horizontal_symmetry" },
        { "kind": "max_stack_height", "operator": "gte", "value": 3 },
        { "kind": "no_adjacent_same_color" }
      ]
    }
  }
}`}</CopyableCode>
      <p className="text-muted-foreground text-sm mt-2">
        <strong>29 conditions</strong> across 7 categories: Cell, Row/Column, Region, Count, Stacking (3D), Spatial, and Symmetry. Conditions can be nested inside logic groups for complex rules.
      </p>
    </div>
  );
}

function SliderTab() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500/15 to-orange-500/10 border border-red-500/30 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Move className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-foreground font-bold text-lg mb-2">Klotski-Style Slider Puzzles</h4>
            <p className="text-muted-foreground text-sm">
              Slider puzzles have pre-placed pieces that can only <strong className="text-foreground">slide</strong> horizontally or vertically.
              The goal is to move a target piece to a specific position.
            </p>
          </div>
        </div>
      </div>

      <SectionTitle>Key Differences from 3D Puzzles</SectionTitle>
      <div className="bg-secondary rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-blue-500/20 text-blue-300 text-xs shrink-0">viewMode</Badge>
          <span className="text-muted-foreground">Set to <code className="text-primary">"2D"</code> for flat 2D rendering</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-green-500/20 text-green-300 text-xs shrink-0">initial_state</Badge>
          <span className="text-muted-foreground">Pieces start on the board (not in inventory). Defined by exact cells.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-purple-500/20 text-purple-300 text-xs shrink-0">SLIDING_ONLY</Badge>
          <span className="text-muted-foreground">Movement rule that prevents lifting — pieces slide along one axis only.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-red-500/20 text-red-300 text-xs shrink-0">goal</Badge>
          <span className="text-muted-foreground">Defines which piece must reach which cells to win.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-yellow-500/20 text-yellow-300 text-xs shrink-0">blocked_cells</Badge>
          <span className="text-muted-foreground">Cells where pieces cannot slide through (obstacles/walls).</span>
        </div>
      </div>

      <SectionTitle>Goal Definition</SectionTitle>
      <p className="text-muted-foreground text-sm mb-3">
        The <code className="text-primary">goal</code> property defines the win condition:
      </p>
      <CopyableCode>{`"goal": {
  "targetPieceId": "goal",
  "targetPieceIds": ["p1", "p2"],
  "allowAnyPiece": true,
  "cells": [[1,4], [2,4], [1,5], [2,5]],
  "hideGoalVisualization": true
}`}</CopyableCode>

      <SubTitle>Example: Minimal Slider</SubTitle>
      <CopyableCode>{`{
  "title": "Mini Slider",
  "description": "Slide the red block to the bottom",
  "viewMode": "2D",
  "board": {
    "dimensions": { "width": 4, "height": 5, "depth": 1 },
    "initial_state": [
      { "id": "goal", "cells": [[1,0],[2,0],[1,1],[2,1]], "color": "#D01012" },
      { "id": "blocker1", "cells": [[0,0],[0,1]], "color": "#0055BF" }
    ],
    "blocked_cells": [[0,4], [3,4]]
  },
  "inventory": [],
  "validation_rules": [
    { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
    { "type": "ROTATION", "rule": "NO_ROTATION" },
    { "type": "CONSTRAINT", "rule": "NO_BRICK_REMOVAL" },
    { "type": "GOAL", "rule": "GOAL_REACHED" }
  ],
  "goal": { "targetPieceId": "goal", "cells": [[1,4],[2,4],[1,5],[2,5]] }
}`}</CopyableCode>

      <SectionTitle>How Sliding Works</SectionTitle>
      <div className="bg-secondary rounded-lg p-4 space-y-2">
        {[
          'Click a piece to select it',
          'Valid slide destinations appear as green cells',
          'Click any green cell to slide the piece there',
          'The GOAL area is shown with a dotted border',
          'Move the target piece to cover all goal cells to win!',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="w-6 h-6 flex items-center justify-center bg-success/20 rounded text-success text-xs font-bold">{i + 1}</span>
            <span className="text-muted-foreground">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NonogramTab() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Grid3x3 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-foreground font-bold text-lg mb-2">Nonogram (Picross) Puzzles</h4>
            <p className="text-muted-foreground text-sm">
              Nonogram puzzles display number hints on the left and top of the grid. Players must fill cells according to the clues.
              <strong className="text-foreground"> Black bricks</strong> mark filled cells, <strong className="text-foreground">red bricks</strong> mark empty cells.
            </p>
          </div>
        </div>
      </div>

      <SectionTitle>Key Components</SectionTitle>
      <div className="bg-secondary rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-emerald-500/20 text-emerald-300 text-xs shrink-0">nonogram_hints</Badge>
          <span className="text-muted-foreground">Defines row and column number hints displayed around the grid.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-cyan-500/20 text-cyan-300 text-xs shrink-0">target_pattern</Badge>
          <span className="text-muted-foreground">Defines the solution pattern. Uses PATTERN_MATCH validation.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-yellow-500/20 text-yellow-300 text-xs shrink-0">reject_unmapped</Badge>
          <span className="text-muted-foreground">Rejects mapped colors placed in unmapped cells.</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <Badge className="bg-blue-500/20 text-blue-300 text-xs shrink-0">viewMode: "2D"</Badge>
          <span className="text-muted-foreground">Nonogram puzzles use 2D view.</span>
        </div>
      </div>

      <SubTitle>Nonogram Hints Format</SubTitle>
      <CopyableCode>{`"nonogram_hints": {
  "rows": [
    [4],      // Row 0: 4 consecutive filled cells
    [1, 1],   // Row 1: two separate single cells
    [2, 1],   // Row 2: group of 2, then group of 1
    [3],      // Row 3: 3 consecutive cells
    [1, 2]    // Row 4: single, then pair
  ],
  "columns": [
    [1, 1], [1, 2], [5], [1, 2], [2]
  ]
}`}</CopyableCode>

      <SubTitle>Target Pattern Format</SubTitle>
      <CopyableCode>{`"target_pattern": {
  "rows": [
    [1, 1, 1, 1, 0],
    [0, 0, 1, 0, 1],
    [0, 1, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 1, 1, 0]
  ],
  "color_mapping": { "1": "#05131D" }
}`}</CopyableCode>

      <div className="bg-primary/10 border border-primary/40 rounded-lg p-4 mt-4">
        <h4 className="text-primary font-semibold mb-2 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Tips
        </h4>
        <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
          <li>Row hints appear on the <strong className="text-foreground">left</strong> side of the grid</li>
          <li>Column hints appear on the <strong className="text-foreground">top</strong> of the grid</li>
          <li>Numbers indicate consecutive groups of filled cells</li>
          <li>Red bricks are optional helpers — only black bricks are validated</li>
        </ul>
      </div>
    </div>
  );
}

function CustomRulesTab() {
  const conditions = [
    { category: 'Cell', items: [
      { name: 'cells_are_covered', desc: 'Specific cells must have bricks on them.' },
      { name: 'cells_are_empty', desc: 'Specific cells must not have any bricks.' },
      { name: 'cells_have_color', desc: 'Specific cells must be covered by a brick of a given color.' },
    ]},
    { category: 'Row/Column', items: [
      { name: 'row_fully_covered', desc: 'Every cell in a row must have a brick.' },
      { name: 'column_fully_covered', desc: 'Every cell in a column must have a brick.' },
      { name: 'row_is_empty', desc: 'No cells in a row may have bricks.' },
      { name: 'column_is_empty', desc: 'No cells in a column may have bricks.' },
      { name: 'count_per_row', desc: 'Every row must have a covered cell count satisfying a comparison.' },
      { name: 'count_per_column', desc: 'Every column must have a covered cell count satisfying a comparison.' },
      { name: 'parity_per_row', desc: 'Every row must have an even or odd number of covered cells.' },
      { name: 'parity_per_column', desc: 'Every column must have an even or odd number of covered cells.' },
    ]},
    { category: 'Count', items: [
      { name: 'total_pieces_placed', desc: 'Total number of pieces on the board (=, >, <, etc.).' },
      { name: 'pieces_of_color_count', desc: 'Number of placed pieces with a specific color.' },
      { name: 'pieces_of_shape_count', desc: 'Number of placed pieces with a specific shape.' },
      { name: 'covered_cell_count', desc: 'Total number of cells covered by bricks.' },
      { name: 'max_colors_used', desc: 'Number of distinct brick colors placed on the board.' },
    ]},
    { category: 'Stacking (3D)', items: [
      { name: 'stack_height_at_cells', desc: 'Vertical stack height at specific cells.' },
      { name: 'max_stack_height', desc: 'The tallest stack on the board.' },
      { name: 'min_stack_height', desc: 'The shortest non-empty stack on the board.' },
    ]},
    { category: 'Spatial', items: [
      { name: 'no_adjacent_same_color', desc: 'No two adjacent cells (up/down/left/right) share the same color.' },
      { name: 'all_covered_connected', desc: 'All covered cells must form one connected group.' },
      { name: 'piece_at_position', desc: 'A specific piece must cover exactly the given cells.' },
      { name: 'path_exists', desc: 'A path must exist through covered cells from start to end (cardinal adjacency).' },
      { name: 'all_same_color_connected', desc: 'All cells of each color must form one connected group.' },
      { name: 'no_shared_diagonal', desc: 'No two covered cells may share a diagonal (N-Queens constraint).' },
    ]},
    { category: 'Symmetry', items: [
      { name: 'horizontal_symmetry', desc: 'Board must be symmetric left-to-right (coverage and colors).' },
      { name: 'vertical_symmetry', desc: 'Board must be symmetric top-to-bottom (coverage and colors).' },
    ]},
    { category: 'Advanced', items: [
      { name: 'custom_code', desc: 'Write JavaScript code that validates the board. Ultimate flexibility for any rule.' },
    ]},
  ];

  const categoryColors: Record<string, string> = {
    'Cell': 'bg-blue-500/20 text-blue-300',
    'Row/Column': 'bg-purple-500/20 text-purple-300',
    'Count': 'bg-green-500/20 text-green-300',
    'Stacking (3D)': 'bg-orange-500/20 text-orange-300',
    'Spatial': 'bg-cyan-500/20 text-cyan-300',
    'Symmetry': 'bg-pink-500/20 text-pink-300',
    'Advanced': 'bg-amber-500/20 text-amber-300',
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Custom rules let you define your own win conditions without writing code. Use the <strong>Custom Rules</strong> tab in the editor to build rules visually, or define them in JSON.
      </p>

      <SectionTitle>How It Works</SectionTitle>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Each custom rule has:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Name</strong> &mdash; shown in the validation panel (e.g. "Build a tower")</li>
          <li><strong>Description</strong> &mdash; hint shown to the player when the rule fails</li>
          <li><strong>Condition tree</strong> &mdash; one or more conditions combined with logic groups</li>
        </ul>
      </div>

      <SectionTitle>Logic Groups</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { name: 'ALL (AND)', desc: 'Every condition must pass', color: 'border-l-blue-400' },
          { name: 'ANY (OR)', desc: 'At least one must pass', color: 'border-l-green-400' },
          { name: 'NONE (NOR)', desc: 'No conditions may pass', color: 'border-l-red-400' },
        ].map(g => (
          <div key={g.name} className={`bg-secondary rounded-lg p-3 border-l-[3px] ${g.color}`}>
            <div className="text-xs font-bold text-foreground">{g.name}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{g.desc}</div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        You can also use <strong>EXACTLY N</strong> (exactly N conditions must pass) and <strong>AT LEAST N</strong> (N or more must pass). Logic groups can be nested inside each other for complex rules.
      </p>

      <SubTitle>Cell Picker</SubTitle>
      <p className="text-muted-foreground text-sm">
        For conditions that target specific cells, click the <strong>Pick</strong> button to enter cell picker mode. Click cells on the board to select/deselect them, then click <strong>Done</strong>. Works in both 2D and 3D views.
      </p>

      <SectionTitle>Condition Types ({conditions.reduce((n, c) => n + c.items.length, 0)} total)</SectionTitle>
      <div className="space-y-3">
        {conditions.map(cat => (
          <div key={cat.category}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 text-xs rounded font-medium ${categoryColors[cat.category] ?? 'bg-secondary text-muted-foreground'}`}>
                {cat.category}
              </span>
            </div>
            <div className="space-y-1 ml-1">
              {cat.items.map(item => (
                <div key={item.name} className="flex gap-2">
                  <code className="text-primary text-[11px] shrink-0">{item.name}</code>
                  <span className="text-muted-foreground text-[11px]">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>JSON Format</SectionTitle>
      <p className="text-muted-foreground text-sm mb-2">
        Custom rules are stored in <code className="text-primary">validation_rules</code> with type <code className="text-primary">"CUSTOM"</code>:
      </p>
      <CopyableCode>{`{
  "type": "CUSTOM",
  "rule": "CUSTOM_RULE",
  "params": {
    "label": "Symmetric & colorful",
    "description": "Build a symmetric pattern with no same-color neighbors",
    "condition": {
      "kind": "ALL",
      "children": [
        { "kind": "horizontal_symmetry" },
        { "kind": "no_adjacent_same_color" },
        { "kind": "covered_cell_count", "operator": "gte", "value": 8 }
      ]
    }
  }
}`}</CopyableCode>

      <SubTitle>Comparison Operators</SubTitle>
      <p className="text-muted-foreground text-sm mb-2">
        Count and stacking conditions use these operators:
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { op: 'eq', label: '= equal' },
          { op: 'neq', label: '\u2260 not equal' },
          { op: 'gt', label: '> greater' },
          { op: 'gte', label: '\u2265 at least' },
          { op: 'lt', label: '< less' },
          { op: 'lte', label: '\u2264 at most' },
        ].map(o => (
          <div key={o.op} className="bg-secondary rounded px-2 py-1 text-center">
            <code className="text-primary text-xs">{o.op}</code>
            <div className="text-[10px] text-muted-foreground">{o.label}</div>
          </div>
        ))}
      </div>

      <SubTitle>Custom Code (Advanced)</SubTitle>
      <p className="text-muted-foreground text-sm mb-2">
        For rules that can't be expressed with the built-in conditions, use <code className="text-primary">custom_code</code> to write
        JavaScript directly. Your code receives <code className="text-primary">board</code> and <code className="text-primary">helpers</code> and
        must return <code className="text-primary">{'{ passed: boolean, message: string }'}</code>.
      </p>

      <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
        <div className="text-foreground font-semibold text-xs">Available in your code:</div>
        <div className="space-y-1 text-muted-foreground text-[11px]">
          <div><code className="text-primary">board.width</code>, <code className="text-primary">board.height</code>, <code className="text-primary">board.depth</code> &mdash; board dimensions</div>
          <div><code className="text-primary">board.placedBricks[]</code> &mdash; array of {'{ id, shape, color, x, y, z, rotation }'}</div>
          <div><code className="text-primary">board.blockedCells[]</code> &mdash; array of [x, y]</div>
          <div><code className="text-primary">helpers.isOccupied(x, y)</code> &mdash; true if cell has a brick</div>
          <div><code className="text-primary">helpers.getCellColor(x, y)</code> &mdash; color string or null</div>
          <div><code className="text-primary">helpers.getStackHeight(x, y)</code> &mdash; number of stacked bricks</div>
          <div><code className="text-primary">helpers.countOccupied()</code> &mdash; total occupied cells</div>
          <div><code className="text-primary">helpers.getBricksAt(x, y)</code> &mdash; array of {'{ id, shape, color, z }'}</div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm mt-2 mb-2">
        Use the <strong>Test</strong> button in the editor to run your code against the current board and see the result instantly.
      </p>

      <SubTitle>Example: No pieces on the border</SubTitle>
      <CopyableCode>{`for (const b of board.placedBricks) {
  if (b.x === 0 || b.x === board.width - 1 || b.y === 0 || b.y === board.height - 1) {
    return { passed: false, message: "A piece is on the border!" };
  }
}
return { passed: true, message: "No pieces on the border" };`}</CopyableCode>

      <SubTitle>JSON Format (custom code)</SubTitle>
      <CopyableCode>{`{
  "type": "CUSTOM",
  "rule": "CUSTOM_RULE",
  "params": {
    "label": "No border pieces",
    "description": "Keep all pieces away from the edges",
    "condition": {
      "kind": "custom_code",
      "code": "for (const b of board.placedBricks) {\\n  if (b.x === 0 || b.x === board.width - 1 || b.y === 0 || b.y === board.height - 1) {\\n    return { passed: false, message: \\"A piece is on the border!\\" };\\n  }\\n}\\nreturn { passed: true, message: \\"No pieces on the border\\" };"
    }
  }
}`}</CopyableCode>
    </div>
  );
}

function ExamplesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-bold text-foreground mb-2">Coverage Puzzle (3D)</h4>
        <p className="text-muted-foreground text-sm mb-3">
          Cover every cell on an 8x4 board using 8 T-tetrominoes.
        </p>
        <CopyableCode>{`{
  "title": "T-Time",
  "board": {
    "dimensions": { "width": 8, "height": 4, "depth": 1 }
  },
  "inventory": [
    { "id": "t1", "shape": "T-tetromino", "color": "#D01012", "quantity": 1 },
    { "id": "t2", "shape": "T-tetromino", "color": "#0055BF", "quantity": 1 },
    ...
  ],
  "validation_rules": [
    { "type": "COVERAGE", "rule": "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ]
}`}</CopyableCode>
      </div>

      <div>
        <h4 className="text-base font-bold text-foreground mb-2">Slider Puzzle (2D)</h4>
        <p className="text-muted-foreground text-sm mb-3">
          Klotski-style puzzle. Slide the red 2x2 block to the goal position.
        </p>
        <CopyableCode>{`{
  "title": "Klotski Classic",
  "viewMode": "2D",
  "board": {
    "dimensions": { "width": 4, "height": 5, "depth": 1 },
    "initial_state": [
      { "id": "goal", "cells": [[1,0],[2,0],[1,1],[2,1]], "color": "#D01012" },
      ...
    ],
    "blocked_cells": [[0,4], [3,4]]
  },
  "inventory": [],
  "validation_rules": [
    { "type": "MOVEMENT", "rule": "SLIDING_ONLY" },
    { "type": "GOAL", "rule": "GOAL_REACHED" }
  ],
  "goal": { "targetPieceId": "goal", "cells": [[1,4],[2,4],[1,5],[2,5]] }
}`}</CopyableCode>
      </div>

      {/* Quick Start */}
      <div className="bg-success/10 border border-success/30 rounded-lg p-4">
        <h4 className="text-success font-semibold mb-2 flex items-center gap-2">
          <Rocket className="w-4 h-4" />
          Quick Start
        </h4>
        <ol className="text-muted-foreground text-sm space-y-2 list-decimal list-inside">
          <li>Click the <strong className="text-foreground">Puzzle</strong> dropdown to see samples</li>
          <li>Select a sample to load it into the editor</li>
          <li>Play with the puzzle to understand how it works</li>
          <li>Modify the JSON to create your own variation</li>
        </ol>
      </div>

      <div className="bg-primary/10 border border-primary/40 rounded-lg p-4">
        <h4 className="text-primary font-semibold mb-2 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Tips
        </h4>
        <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
          <li>Use the <strong className="text-foreground">Format</strong> button to auto-format your JSON</li>
          <li>Changes are applied live when JSON is valid</li>
          <li>Each brick ID must be unique in the inventory</li>
          <li>Colors can be any valid CSS hex color</li>
          <li>Bricks can be rotated 90° by pressing <KBD>R</KBD></li>
          <li>All panels are resizable — drag the borders to adjust!</li>
        </ul>
      </div>
    </div>
  );
}

function PluginTab() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        <strong>Plugin (code) puzzles</strong> let you build <em>any</em> puzzle in JavaScript — for
        ideas the grid model can't express, like a Rubik's cube, a hex board, or a graph puzzle. You
        write a small module that owns the state, the moves, the win check, and the rendering; the app
        runs it in a secure sandbox and confirms the win when your <code className="font-mono text-primary">isSolved()</code> passes.
      </p>

      <div className="bg-primary/10 border border-primary/40 rounded-lg p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">When to use it:</strong> stick with the normal grid editor + Custom Rules for
        brick-on-grid puzzles. Reach for a plugin only when you need custom geometry, custom moves, or your own rendering.
      </div>

      <SectionTitle icon={<Rocket className="w-4 h-4" />}>Create one in 5 steps</SectionTitle>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground ml-1">
        <li>Open the editor (<strong>Create</strong> a new puzzle, or <strong>Edit</strong> one you own) and click the <strong>Plugin (Code)</strong> tab.</li>
        <li>Click <strong>Templates</strong> to start from a working example (<em>Toggle Grid</em> or <em>Rubik's Cube</em>), or write your own.</li>
        <li>Pick a <strong>render kind</strong>: <Badge variant="secondary" className="text-[10px]">DOM</Badge> <Badge variant="secondary" className="text-[10px]">Canvas 2D</Badge> <Badge variant="secondary" className="text-[10px]">WebGL</Badge>.</li>
        <li>Give it a <strong>title</strong>, then click <strong>Run</strong> to preview it live in the panel.</li>
        <li><strong>Save Draft</strong>, then <strong>Publish</strong> when you're happy with it.</li>
      </ol>

      <SectionTitle icon={<Code2 className="w-4 h-4" />}>The contract</SectionTitle>
      <p className="text-sm text-muted-foreground">
        Your code must <code className="font-mono text-primary">export default</code> an object with these functions. The
        logic functions must be <strong>pure</strong> (no side effects, return new values) so the app can snapshot state and
        check the win reliably:
      </p>
      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
        <li><code className="font-mono text-primary">meta</code> — <code className="font-mono text-foreground/80">{'{ title, instructions }'}</code></li>
        <li><code className="font-mono text-primary">initialState(ctx)</code> — build the starting state (use <code className="font-mono text-foreground/80">ctx.seed</code> / <code className="font-mono text-foreground/80">ctx.params</code>)</li>
        <li><code className="font-mono text-primary">applyMove(state, move)</code> — return a <strong>new</strong> state</li>
        <li><code className="font-mono text-primary">isSolved(state)</code> — <code className="font-mono text-foreground/80">{'{ solved, progress, message }'}</code></li>
        <li><code className="font-mono text-primary">render.mount(root, api)</code> — draw into <code className="font-mono text-foreground/80">root</code>, call <code className="font-mono text-foreground/80">api.emitMove(move)</code> on input, and return <code className="font-mono text-foreground/80">{'{ update(state) }'}</code></li>
      </ul>

      <SubTitle>Minimal example</SubTitle>
      <CopyableCode>{`export default {
  meta: { title: 'My Puzzle', instructions: 'Turn it green.' },
  initialState(ctx) { return { on: false }; },
  applyMove(state, move) { return { on: !state.on }; },
  isSolved(state) {
    return { solved: state.on, progress: state.on ? 1 : 0,
             message: state.on ? 'Done!' : 'Not yet' };
  },
  render: {
    mount(root, api) {
      var btn = root.ownerDocument.createElement('button');
      btn.textContent = 'Toggle';
      btn.onclick = function () { api.emitMove({}); };
      root.appendChild(btn);
      return { update(s) { root.style.background = s.on ? '#22c55e' : ''; } };
    }
  }
};`}</CopyableCode>

      <SectionTitle icon={<Sparkles className="w-4 h-4" />}>Rendering &amp; 3D</SectionTitle>
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <p><strong>DOM</strong> / <strong>Canvas 2D</strong>: in <code className="font-mono text-primary">render.mount</code>, create elements or a <code className="font-mono text-foreground/80">&lt;canvas&gt;</code> inside <code className="font-mono text-foreground/80">root</code>, then redraw them from <code className="font-mono text-foreground/80">update(state)</code>.</p>
        <p><strong>WebGL (3D)</strong>: pick render kind <Badge variant="secondary" className="text-[10px]">WebGL</Badge> and build your own Three.js scene — no install or imports. Three is provided as a global; read it at the top of <code className="font-mono text-primary">render.mount</code> and use it normally:</p>
      </div>
      <CopyableCode>{`render: {
  mount(root, api) {
    var THREE = self.THREE;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(3, 3, 5); camera.lookAt(0, 0, 0);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(root.clientWidth, root.clientHeight);
    root.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    // ...add your meshes here...
    return {
      update(state) { /* move/recolor meshes from state */ renderer.render(scene, camera); }
    };
  }
}`}</CopyableCode>
      <p className="text-sm text-muted-foreground">Handle player input however you like (buttons, pointer events, raycasting) and call <code className="font-mono text-primary">api.emitMove(move)</code> — the host applies it through your <code className="font-mono text-primary">applyMove</code> and calls <code className="font-mono text-foreground/80">update</code> with the new state.</p>

      <SectionTitle icon={<ShieldCheck className="w-4 h-4" />}>Win, progress &amp; safety</SectionTitle>
      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
        <li>Your <code className="font-mono text-primary">isSolved()</code> drives the win popup and the <strong>Validation</strong> panel (which shows your <code className="font-mono text-foreground/80">message</code>).</li>
        <li><code className="font-mono text-foreground/80">progress</code> (0–1) shows as a live percentage while the player works.</li>
        <li>Your code runs in an <strong>isolated sandbox</strong> — it cannot touch the page, your account, or the network.</li>
        <li>Completion is self-reported by your code (like custom rules), so treat plugin scores as advisory.</li>
      </ul>
    </div>
  );
}

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] sm:max-w-3xl max-h-[100vh] sm:max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Puzzle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Puzzle Creator Guide</DialogTitle>
              <DialogDescription>Learn how to create custom puzzles</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-shrink-0 mx-6 mt-2">
          <TabsList className="!h-auto flex-wrap justify-start bg-transparent gap-1 p-0 border-b border-border pb-2">
            <TabsTrigger value="overview" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Layers className="w-3.5 h-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="shapes" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Puzzle className="w-3.5 h-3.5" />
              Shapes
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="slider" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Move className="w-3.5 h-3.5" />
              Slider
            </TabsTrigger>
            <TabsTrigger value="nonogram" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Grid3x3 className="w-3.5 h-3.5" />
              Nonogram
            </TabsTrigger>
            <TabsTrigger value="customrules" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              Custom Rules
            </TabsTrigger>
            <TabsTrigger value="plugin" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Code2 className="w-3.5 h-3.5" />
              Plugin (Code)
            </TabsTrigger>
            <TabsTrigger value="examples" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Lightbulb className="w-3.5 h-3.5" />
              Examples
            </TabsTrigger>
          </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <TabsContent value="overview" className="mt-0"><OverviewTab /></TabsContent>
            <TabsContent value="shapes" className="mt-0"><ShapesTab /></TabsContent>
            <TabsContent value="validation" className="mt-0"><ValidationTab /></TabsContent>
            <TabsContent value="slider" className="mt-0"><SliderTab /></TabsContent>
            <TabsContent value="nonogram" className="mt-0"><NonogramTab /></TabsContent>
            <TabsContent value="customrules" className="mt-0"><CustomRulesTab /></TabsContent>
            <TabsContent value="plugin" className="mt-0"><PluginTab /></TabsContent>
            <TabsContent value="examples" className="mt-0"><ExamplesTab /></TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button onClick={onClose}>Got it!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
