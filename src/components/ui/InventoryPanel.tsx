import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { m, AnimatePresence } from 'framer-motion';
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

const ShapePreview = memo(function ShapePreview({ shape, color, size = 40, rotation = 0 }: ShapePreviewProps) {
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
});

interface BrickItemProps {
  id: string;
  shape: string;
  color: string;
  remaining: number;
  isSelected: boolean;
  rotation: number;
  onSelect: () => void;
}

const BrickItem = memo(function BrickItem({ id, shape, color, remaining, isSelected, rotation, onSelect }: BrickItemProps) {
  const isAvailable = remaining > 0;

  return (
    <m.button
      layoutId={`brick-${id}`}
      aria-label={`${shape} brick, ${remaining} remaining${isSelected ? ', selected' : ''}`}
      className={`
        group relative flex flex-col items-center gap-2.5 p-3.5 rounded-xl border
        transition-[border-color,background-color] duration-150
        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none
        ${isSelected
          ? 'bg-primary/12 border-primary/40 shadow-lg shadow-primary/15'
          : 'bg-[var(--surface-raised)] border-border hover:border-primary/40 hover:bg-[var(--surface-panel)]'
        }
        ${!isAvailable ? 'opacity-40 cursor-not-allowed saturate-0' : 'cursor-pointer active:scale-[0.97]'}
      `}
      onClick={() => isAvailable && onSelect()}
      disabled={!isAvailable}
    >
      <div className="p-2 rounded-lg bg-background/70">
        <ShapePreview shape={shape} color={color} size={48} rotation={isSelected ? rotation : 0} />
      </div>

      <div className="text-center leading-tight">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{shape}</div>
        <div className={`text-sm font-bold tabular-nums ${remaining > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
          x{remaining}
        </div>
      </div>

      <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full ring-2 ring-background shadow-sm" style={{ backgroundColor: color }} />

      <AnimatePresence>
        {isSelected && (
          <>
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-md shadow-primary/40"
            >
              <Check className="w-3 h-3 text-primary-foreground" />
            </m.div>
            <m.div
              key={rotation}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-mono rounded shadow-sm"
            >
              {rotation}°
            </m.div>
          </>
        )}
      </AnimatePresence>
    </m.button>
  );
});

interface InventoryPanelProps {
  className?: string;
  engine?: UsePuzzleEngineReturn;
}

export function InventoryPanel({ className = '', engine }: InventoryPanelProps) {
  const store = usePuzzleStore(useShallow(s => ({
    puzzle: s.puzzle,
    inventoryState: s.inventoryState,
    selectedBrickId: s.selectedBrickId,
    previewRotation: s.previewRotation,
    selectBrick: s.selectBrick,
    rotatePreview: s.rotatePreview,
  })));

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
  const usedPercent = totalBricks > 0 ? (usedBricks / totalBricks) * 100 : 0;

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-[var(--surface-raised)] to-[var(--surface-base)] border-b border-border">
        <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          INVENTORY
        </h3>
        <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
          <span>{usedBricks} / {totalBricks} bricks placed</span>
          <span className="font-mono tabular-nums text-foreground/90">{Math.round(usedPercent)}%</span>
        </div>
        <Progress value={usedPercent} className="mt-2 h-1.5 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-primary [&>[data-slot=progress-indicator]]:to-primary/70 [&>[data-slot=progress-indicator]]:transition-all [&>[data-slot=progress-indicator]]:duration-500 [&>[data-slot=progress-indicator]]:ease-out" />
      </div>

      {/* Rotation control when brick is selected */}
      {isInventorySelection && (
        <div className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-b border-primary/40 flex items-center justify-between">
          <span className="text-xs text-primary font-semibold tracking-wide">Pre-rotate before placing</span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/20 shadow-sm" onClick={() => rotatePreview()}>
            <RotateCw className="w-3 h-3" />
            Rotate ({previewRotation}°)
          </Button>
        </div>
      )}

      {/* Brick grid */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-3.5 bg-gradient-to-b from-transparent to-background/40"
        role="grid"
        aria-label="Brick inventory"
        onKeyDown={(e) => {
          const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
          const currentIdx = buttons.indexOf(e.target as HTMLButtonElement);
          if (currentIdx === -1) return;
          let nextIdx = -1;
          if (e.key === 'ArrowRight') nextIdx = Math.min(currentIdx + 1, buttons.length - 1);
          else if (e.key === 'ArrowLeft') nextIdx = Math.max(currentIdx - 1, 0);
          else if (e.key === 'ArrowDown') {
            // Estimate columns from grid - move down by row
            const grid = e.currentTarget.querySelector('.grid');
            const cols = grid ? Math.floor(grid.clientWidth / 112) || 1 : 1;
            nextIdx = Math.min(currentIdx + cols, buttons.length - 1);
          } else if (e.key === 'ArrowUp') {
            const grid = e.currentTarget.querySelector('.grid');
            const cols = grid ? Math.floor(grid.clientWidth / 112) || 1 : 1;
            nextIdx = Math.max(currentIdx - cols, 0);
          }
          if (nextIdx >= 0 && nextIdx !== currentIdx) {
            e.preventDefault();
            buttons[nextIdx].focus();
          }
        }}
      >
        {puzzle.inventory.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            This puzzle does not use an inventory.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
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
        )}
      </div>
    </div>
  );
}
