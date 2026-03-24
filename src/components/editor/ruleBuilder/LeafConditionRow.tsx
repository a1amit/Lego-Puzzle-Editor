import type { LeafCondition, LeafKind, ComparisonOperator, ConditionNode } from '../../../types/customRules';
import { CONDITION_META } from '../../../validation/conditionMeta';
import { ComparisonControl } from './ComparisonControl';
import { ColorPickerField } from './ColorPickerField';
import { ShapePickerField } from './ShapePickerField';
import { useRuleBuilderStore } from './useRuleBuilderStore';
import { Badge } from '../../ui/shadcn/badge';
import { MapPin, X, Crosshair } from 'lucide-react';

interface LeafConditionRowProps {
  ruleId: string;
  path: number[];
  condition: LeafCondition;
  onRemove: () => void;
}

export function LeafConditionRow({ ruleId, path, condition, onRemove }: LeafConditionRowProps) {
  const updateCondition = useRuleBuilderStore(s => s.updateConditionAtPath);
  const startCellPicker = useRuleBuilderStore(s => s.startCellPicker);
  const cellPickerTarget = useRuleBuilderStore(s => s.cellPickerTarget);
  const meta = CONDITION_META[condition.kind as LeafKind];

  const isPickingThis = cellPickerTarget?.ruleId === ruleId &&
    JSON.stringify(cellPickerTarget?.path) === JSON.stringify(path);

  const update = (partial: Partial<LeafCondition>) => {
    updateCondition(ruleId, path, { ...condition, ...partial } as ConditionNode);
  };

  const cellCount = 'cells' in condition && Array.isArray(condition.cells)
    ? condition.cells.length
    : 0;

  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border transition-colors ${
      isPickingThis
        ? 'bg-cyan-500/10 border-cyan-500/40'
        : 'bg-[var(--surface-raised)] border-[var(--border-subtle)]'
    }`}>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Condition label */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[11px] font-semibold shrink-0 bg-primary/15 text-primary border border-primary/25">
            {meta?.label ?? condition.kind}
          </Badge>
          {meta?.is3DOnly && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">3D</Badge>
          )}
        </div>

        {/* Cells control */}
        {meta?.needsCells && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <Badge
              variant="outline"
              className="text-[11px] font-mono cursor-default"
              title={'cells' in condition ? (condition.cells as [number, number][]).map(([x, y]) => `(${x},${y})`).join(' ') : ''}
            >
              {cellCount} cell{cellCount !== 1 ? 's' : ''}
            </Badge>
            <button
              onClick={() => startCellPicker(ruleId, path)}
              className={`flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium transition-colors ${
                isPickingThis
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-secondary text-muted-foreground hover:text-foreground border border-[var(--border-subtle)]'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              {isPickingThis ? 'Picking...' : 'Pick'}
            </button>
          </div>
        )}

        {/* Row/Column input */}
        {meta?.needsRowCol && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground capitalize">{meta.needsRowCol}:</span>
            <input
              type="number"
              min={0}
              value={(condition as Record<string, unknown>)[meta.needsRowCol] as number ?? 0}
              onChange={e => update({ [meta.needsRowCol!]: Number(e.target.value) } as Partial<LeafCondition>)}
              className="h-7 w-16 px-2 bg-[var(--surface-base)] rounded-md border border-[var(--border-default)] text-xs text-foreground text-center focus:outline-none focus:border-primary/40 transition-colors [color-scheme:dark]"
            />
          </div>
        )}

        {/* Color picker */}
        {meta?.needsColor && 'color' in condition && (
          <ColorPickerField
            color={(condition as { color: string }).color}
            onChange={c => update({ color: c } as Partial<LeafCondition>)}
          />
        )}

        {/* Shape picker */}
        {meta?.needsShape && 'shape' in condition && (
          <ShapePickerField
            shape={(condition as { shape: string }).shape}
            onChange={s => update({ shape: s } as Partial<LeafCondition>)}
          />
        )}

        {/* Comparison control */}
        {meta?.needsComparison && 'operator' in condition && 'value' in condition && (
          <ComparisonControl
            operator={(condition as { operator: ComparisonOperator }).operator}
            value={(condition as { value: number }).value}
            onOperatorChange={op => update({ operator: op } as Partial<LeafCondition>)}
            onValueChange={val => update({ value: val } as Partial<LeafCondition>)}
          />
        )}

        {/* Piece ID input */}
        {meta?.needsPieceId && 'pieceId' in condition && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Piece ID:</span>
            <input
              type="text"
              value={(condition as { pieceId: string }).pieceId}
              onChange={e => update({ pieceId: e.target.value } as Partial<LeafCondition>)}
              placeholder="e.g. red-block"
              className="h-7 flex-1 px-2 bg-[var(--surface-base)] rounded-md border border-[var(--border-default)] text-xs text-foreground focus:outline-none focus:border-primary/40 transition-colors [color-scheme:dark]"
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="mt-1 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        title="Remove condition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
