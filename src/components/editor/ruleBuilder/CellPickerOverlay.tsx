import { useRuleBuilderStore } from './useRuleBuilderStore';
import { Badge } from '../../ui/shadcn/badge';
import { Button } from '../../ui/shadcn/button';
import { Crosshair, Check, Trash2 } from 'lucide-react';
import { useIsMobile, useIsTouch } from '../../../hooks/useMediaQuery';

export function CellPickerOverlay() {
  const isPickingCells = useRuleBuilderStore(s => s.cellPickerTarget !== null);
  const cellCount = useRuleBuilderStore(s => s.cellPickerCells.size);
  const stopCellPicker = useRuleBuilderStore(s => s.stopCellPicker);
  const clearPickerCells = useRuleBuilderStore(s => s.clearPickerCells);
  const singleTarget = useRuleBuilderStore(s => s.singleCellPickerTarget);
  // Call both hooks unconditionally (no `||` short-circuit) per rules of hooks.
  const isMobile = useIsMobile();
  const isTouch = useIsTouch();
  const compact = isMobile || isTouch;
  const btnClass = compact ? 'h-10 px-3 text-xs gap-1.5' : 'h-6 text-[10px] gap-1';

  // Single-cell picker mode (path_exists start/end)
  if (singleTarget) {
    const isStart = singleTarget.field === 'startCell';
    const label = isStart ? 'start' : 'end';
    return (
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-raised)]/95 backdrop-blur-md border ${isStart ? 'border-success/40' : 'border-destructive/40'} rounded-xl shadow-xl`}>
        <Crosshair className={`w-4 h-4 ${isStart ? 'text-success' : 'text-destructive'} animate-pulse`} />
        <span className="text-xs text-foreground font-medium">Click a cell to set the <strong>{label}</strong> point</span>
      </div>
    );
  }

  // Multi-cell picker mode
  if (!isPickingCells) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-raised)]/95 backdrop-blur-md border border-primary/40 rounded-xl shadow-xl">
      <Crosshair className="w-4 h-4 text-primary animate-pulse" />
      <span className="text-xs text-foreground font-medium">Click cells to select</span>
      <Badge variant="secondary" className="text-[10px] font-mono">
        {cellCount} selected
      </Badge>
      <Button
        variant="outline"
        size="xs"
        className={btnClass}
        onClick={clearPickerCells}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Clear
      </Button>
      <Button
        size="xs"
        className={btnClass}
        onClick={stopCellPicker}
      >
        <Check className="w-3.5 h-3.5" />
        Done
      </Button>
    </div>
  );
}
