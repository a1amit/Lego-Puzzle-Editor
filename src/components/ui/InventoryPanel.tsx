import { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { SHAPE_LIBRARY, Rotation3D, DEFAULT_ROTATION, normalizeCellsTo3D } from '../../types/puzzle';
import { rotateShape3D } from '../../validation/ValidationRegistry';

interface ShapePreviewProps {
  shape: string;
  color: string;
  size?: number;
  rotation?: Rotation3D;
}

// SVG preview of a shape with 3D rotation support
function ShapePreview({ shape, color, size = 40, rotation = DEFAULT_ROTATION }: ShapePreviewProps) {
  const shapeDefinition = SHAPE_LIBRARY[shape];

  if (!shapeDefinition) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-500"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  // Apply 3D rotation to cells and project to 2D for preview
  const cells = useMemo(() => {
    const cells3D = normalizeCellsTo3D(shapeDefinition.cells);
    return rotateShape3D(cells3D, rotation);
  }, [shapeDefinition.cells, rotation]);

  const maxX = Math.max(...cells.map((c: [number, number, number]) => c[0])) + 1;
  const maxY = Math.max(...cells.map((c: [number, number, number]) => c[1])) + 1;

  const cellSize = Math.min(size / maxX, size / maxY) * 0.8;
  const offsetX = (size - maxX * cellSize) / 2;
  const offsetY = (size - maxY * cellSize) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="transition-transform duration-200"
    >
      {cells.map(([x, y]: [number, number, number], i: number) => (
        <g key={i}>
          {/* Cell body */}
          <rect
            x={offsetX + x * cellSize + 1}
            y={offsetY + y * cellSize + 1}
            width={cellSize - 2}
            height={cellSize - 2}
            fill={color}
            rx={2}
          />
          {/* Stud */}
          <circle
            cx={offsetX + x * cellSize + cellSize / 2}
            cy={offsetY + y * cellSize + cellSize / 2}
            r={cellSize * 0.25}
            fill={color}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          {/* Light reflection */}
          <circle
            cx={offsetX + x * cellSize + cellSize / 2 + cellSize * 0.08}
            cy={offsetY + y * cellSize + cellSize / 2 - cellSize * 0.08}
            r={cellSize * 0.08}
            fill="rgba(255,255,255,0.4)"
          />
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
  rotation: Rotation3D;
  onSelect: () => void;
}

function BrickItem({ id: _id, shape, color, remaining, isSelected, rotation, onSelect }: BrickItemProps) {
  void _id; // Available for future use (e.g., accessibility)
  const isAvailable = remaining > 0;

  return (
    <button
      className={`
        relative flex items-center gap-2 p-2 rounded-lg transition-all duration-200
        ${isSelected
          ? 'bg-editor-accent/20 ring-2 ring-editor-accent shadow-lg'
          : 'bg-editor-sidebar hover:bg-editor-border/50'
        }
        ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onClick={() => isAvailable && onSelect()}
      disabled={!isAvailable}
    >
      {/* Shape preview with rotation */}
      <div className={`
        p-1.5 rounded-md bg-black/30 transition-all duration-200 flex-shrink-0
        ${isSelected ? 'ring-2 ring-editor-accent/50' : ''}
      `}>
        <ShapePreview
          shape={shape}
          color={color}
          size={36}
          rotation={isSelected ? rotation : DEFAULT_ROTATION}
        />
      </div>

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <div className="text-xs text-gray-400 font-display truncate">{shape}</div>
        <div className={`
          text-sm font-bold
          ${remaining > 0 ? 'text-white' : 'text-gray-500'}
        `}>
          ×{remaining}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="flex-shrink-0 flex items-center gap-1">
          <span className="text-[10px] text-editor-accent font-display">
            {rotation.x},{rotation.y},{rotation.z}
          </span>
          <div className="w-4 h-4 bg-editor-accent rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

interface InventoryPanelProps {
  className?: string;
}

export function InventoryPanel({ className = '' }: InventoryPanelProps) {
  const { puzzle, inventoryState, selectedBrickId, previewRotation, selectBrick, rotatePreview } = usePuzzleStore();
  
  // Check if selected brick is from inventory (not a placed brick)
  const isInventorySelection = useMemo(() => {
    if (!selectedBrickId) return false;
    return puzzle?.inventory.some(b => b.id === selectedBrickId) ?? false;
  }, [selectedBrickId, puzzle]);
  
  if (!puzzle) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-gray-500 text-sm">No puzzle loaded</p>
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
      <div className="flex-shrink-0 px-4 py-3 bg-editor-sidebar/50 border-b border-editor-border">
        <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          INVENTORY
        </h3>
        <div className="mt-1 text-xs text-gray-400">
          {usedBricks} / {totalBricks} bricks placed
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-editor-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-editor-accent to-editor-success transition-all duration-300"
            style={{ width: `${(usedBricks / totalBricks) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Rotation control when brick is selected */}
      {isInventorySelection && (
        <div className="flex-shrink-0 px-4 py-2 bg-editor-accent/10 border-b border-editor-accent/30 flex items-center justify-between">
          <span className="text-xs text-editor-accent font-display">
            Pre-rotate before placing
          </span>
          <button
            onClick={() => rotatePreview()}
            className="flex items-center gap-1 px-2 py-1 bg-editor-accent/20 hover:bg-editor-accent/30 text-editor-accent text-xs rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Rotate (X:{previewRotation.x} Y:{previewRotation.y} Z:{previewRotation.z})
          </button>
        </div>
      )}
      
      {/* Brick list - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <div className="flex flex-col gap-1.5">
          {puzzle.inventory.map((brick) => (
            <BrickItem
              key={brick.id}
              id={brick.id}
              shape={brick.shape}
              color={brick.color}
              remaining={inventoryState.get(brick.id) ?? 0}
              isSelected={selectedBrickId === brick.id}
              rotation={selectedBrickId === brick.id ? previewRotation : DEFAULT_ROTATION}
              onSelect={() => selectBrick(selectedBrickId === brick.id ? null : brick.id)}
            />
          ))}
        </div>
      </div>

      {/* Compact instructions */}
      <div className="flex-shrink-0 px-3 py-2 bg-editor-sidebar/50 border-t border-editor-border">
        <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
          <span><kbd className="px-0.5 bg-editor-border rounded text-gray-400">Q/E</kbd> Z-rot</span>
          <span><kbd className="px-0.5 bg-editor-border rounded text-gray-400">W/S</kbd> X-rot</span>
          <span><kbd className="px-0.5 bg-editor-border rounded text-gray-400">A/D</kbd> Y-rot</span>
          <span><kbd className="px-0.5 bg-editor-border rounded text-gray-400">Del</kbd> remove</span>
        </div>
      </div>
    </div>
  );
}
