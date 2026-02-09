import { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { SHAPE_LIBRARY } from '../../types/puzzle';
import { rotateShape } from '../../validation/ValidationRegistry';
import { Progress } from '../ui/shadcn/progress';
import { Button } from '../ui/shadcn/button';
import { Package, RotateCw, Check } from 'lucide-react';
import type { UsePuzzleEngineReturn } from '../../engine';

interface ShapePreviewProps {
  shape: string;
  color: string;
  size?: number;
  rotation?: number;
}

function ShapePreview({ shape, color, size = 40, rotation = 0 }: ShapePreviewProps) {
  const shapeDefinition = SHAPE_LIBRARY[shape];

  if (!shapeDefinition) {
    return (
      <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ width: size, height: size }}>
        ?
      </div>
    );
  }

  const cells = useMemo(() => rotateShape(shapeDefinition.cells, rotation), [shapeDefinition.cells, rotation]);

  const maxX = Math.max(...cells.map(([x]) => x)) + 1;
  const maxY = Math.max(...cells.map(([, y]) => y)) + 1;
  const cellSize = Math.min(size / maxX, size / maxY) * 0.8;
  const offsetX = (size - maxX * cellSize) / 2;
  const offsetY = (size - maxY * cellSize) / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transition-transform duration-200">
      {cells.map(([x, y], i) => (
        <g key={i}>
          <rect x={offsetX + x * cellSize + 1} y={offsetY + y * cellSize + 1} width={cellSize - 2} height={cellSize - 2} fill={color} rx={2} />
          <circle cx={offsetX + x * cellSize + cellSize / 2} cy={offsetY + y * cellSize + cellSize / 2} r={cellSize * 0.25} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          <circle cx={offsetX + x * cellSize + cellSize / 2 + cellSize * 0.08} cy={offsetY + y * cellSize + cellSize / 2 - cellSize * 0.08} r={cellSize * 0.08} fill="rgba(255,255,255,0.4)" />
        </g>
      ))}
    </svg>
  );
}

interface BrickItemProps {
  id: string;
  shape: string;
  color: string;
  remaining: number;
  isSelected: boolean;
  rotation: number;
  onSelect: () => void;
}

function BrickItem({ id: _id, shape, color, remaining, isSelected, rotation, onSelect }: BrickItemProps) {
  void _id;
  const isAvailable = remaining > 0;

  return (
    <button
      className={`
        relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200
        ${isSelected
          ? 'bg-primary/15 ring-2 ring-primary shadow-lg shadow-primary/10 scale-105'
          : 'bg-secondary/50 hover:bg-secondary/80'
        }
        ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}
      `}
      onClick={() => isAvailable && onSelect()}
      disabled={!isAvailable}
    >
      <div className={`p-2 rounded-lg bg-background/60 transition-all duration-200 ${isSelected ? 'ring-2 ring-primary/40' : ''}`}>
        <ShapePreview shape={shape} color={color} size={48} rotation={isSelected ? rotation : 0} />
      </div>

      <div className="text-center">
        <div className="text-xs text-muted-foreground">{shape}</div>
        <div className={`text-sm font-bold ${remaining > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
          x{remaining}
        </div>
      </div>

      <div className="absolute top-2 right-2 w-3 h-3 rounded-full ring-2 ring-background" style={{ backgroundColor: color }} />

      {isSelected && (
        <>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-mono rounded">
            {rotation}°
          </div>
        </>
      )}
    </button>
  );
}

interface InventoryPanelProps {
  className?: string;
  engine?: UsePuzzleEngineReturn;
}

export function InventoryPanel({ className = '', engine }: InventoryPanelProps) {
  const store = usePuzzleStore();

  const puzzle = engine?.puzzle ?? store.puzzle;
  const inventoryState = engine?.inventory ?? store.inventoryState;
  const selectedBrickId = engine?.selectedPieceId ?? store.selectedBrickId;
  const previewRotation = engine?.previewRotation ?? store.previewRotation;
  const selectBrick = engine?.selectPiece ?? store.selectBrick;
  const rotatePreview = engine?.rotatePreview ?? store.rotatePreview;

  const isInventorySelection = useMemo(() => {
    if (!selectedBrickId) return false;
    return puzzle?.inventory.some(b => b.id === selectedBrickId) ?? false;
  }, [selectedBrickId, puzzle]);

  if (!puzzle) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-muted-foreground text-sm">No puzzle loaded</p>
      </div>
    );
  }

  const totalBricks = puzzle.inventory.reduce((sum, b) => sum + b.quantity, 0);
  const usedBricks = puzzle.inventory.reduce((sum, b) => {
    const remaining = inventoryState.get(b.id) ?? 0;
    return sum + (b.quantity - remaining);
  }, 0);

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-card/50 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          INVENTORY
        </h3>
        <div className="mt-1 text-xs text-muted-foreground">
          {usedBricks} / {totalBricks} bricks placed
        </div>
        <Progress value={(usedBricks / totalBricks) * 100} className="mt-2 h-1.5" />
      </div>

      {/* Rotation control when brick is selected */}
      {isInventorySelection && (
        <div className="flex-shrink-0 px-4 py-2 bg-primary/10 border-b border-primary/30 flex items-center justify-between">
          <span className="text-xs text-primary font-medium">Pre-rotate before placing</span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/20" onClick={() => rotatePreview()}>
            <RotateCw className="w-3 h-3" />
            Rotate ({previewRotation}°)
          </Button>
        </div>
      )}

      {/* Brick grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-3">
          {puzzle.inventory.map((brick) => (
            <BrickItem
              key={brick.id}
              id={brick.id}
              shape={brick.shape}
              color={brick.color}
              remaining={inventoryState.get(brick.id) ?? 0}
              isSelected={selectedBrickId === brick.id}
              rotation={selectedBrickId === brick.id ? previewRotation : 0}
              onSelect={() => selectBrick(selectedBrickId === brick.id ? null : brick.id)}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="flex-shrink-0 px-4 py-3 bg-card/50 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/80 mb-1.5">Controls:</p>
          <p>Click brick → <kbd className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded font-mono text-[10px]">R</kbd> rotate → click board</p>
          <p>Click placed brick to lift</p>
          <p><kbd className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded font-mono text-[10px]">Del</kbd> to remove</p>
        </div>
      </div>
    </div>
  );
}
