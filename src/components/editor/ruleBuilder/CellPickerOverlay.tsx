import { useRuleBuilderStore } from './useRuleBuilderStore';
import { Badge } from '../../ui/shadcn/badge';
import { Button } from '../../ui/shadcn/button';
import { Crosshair, Check, Trash2 } from 'lucide-react';

export function CellPickerOverlay() {
  const isPickingCells = useRuleBuilderStore(s => s.cellPickerTarget !== null);
  const cellCount = useRuleBuilderStore(s => s.cellPickerCells.size);
  const stopCellPicker = useRuleBuilderStore(s => s.stopCellPicker);
  const clearPickerCells = useRuleBuilderStore(s => s.clearPickerCells);
  const singleTarget = useRuleBuilderStore(s => s.singleCellPickerTarget);

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
        className="h-6 text-[10px] gap-1"
        onClick={clearPickerCells}
      >
        <Trash2 className="w-3 h-3" />
        Clear
      </Button>
      <Button
        size="xs"
        className="h-6 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-500"
        onClick={stopCellPicker}
      >
        <Check className="w-3 h-3" />
        Done
      </Button>
    </div>
  );
}
