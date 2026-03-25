import type { ComparisonOperator } from '../../../types/customRules';
import { COMPARISON_LABELS } from '../../../types/customRules';

interface ComparisonControlProps {
  operator: ComparisonOperator;
  value: number;
  onOperatorChange: (op: ComparisonOperator) => void;
  onValueChange: (val: number) => void;
}

const OPERATORS: ComparisonOperator[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];

export function ComparisonControl({ operator, value, onOperatorChange, onValueChange }: ComparisonControlProps) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={operator}
        onChange={e => onOperatorChange(e.target.value as ComparisonOperator)}
        className="h-7 px-2 bg-[var(--surface-base)] rounded-md border border-[var(--border-default)] text-xs text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer [color-scheme:dark]"
      >
        {OPERATORS.map(op => (
          <option key={op} value={op}>{COMPARISON_LABELS[op]}</option>
        ))}
      </select>
      <input
        type="number"
        value={value}
        onChange={e => onValueChange(Number(e.target.value))}
        className="h-7 w-16 px-2 bg-[var(--surface-base)] rounded-md border border-[var(--border-default)] text-xs text-foreground text-center focus:outline-none focus:border-primary/40 transition-colors [color-scheme:dark]"
      />
    </div>
  );
}
