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
    const label = singleTarget.field === 'startCell' ? 'start' : 'end';
    const color = singleTarget.field === 'startCell' ? 'emerald' : 'red';
    return (
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-raised)]/95 backdrop-blur-md border border-${color}-500/40 rounded-xl shadow-xl`}>
        <Crosshair className={`w-4 h-4 text-${color}-400 animate-pulse`} />
        <span className="text-xs text-foreground font-medium">Click a cell to set the <strong>{label}</strong> point</span>
      </div>
    );
  }

  // Multi-cell picker mode
  if (!isPickingCells) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-raised)]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-xl">
      <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />
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
        className={`${btnClass} bg-cyan-600 hover:bg-cyan-500`}
        onClick={stopCellPicker}
      >
        <Check className="w-3.5 h-3.5" />
        Done
      </Button>
    </div>
  );
}
