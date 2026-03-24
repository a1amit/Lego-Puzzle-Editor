import { useState, useRef } from 'react';
import type { CombinatorNode, CombinatorKind, ConditionNode, LeafKind } from '../../../types/customRules';
import { createDefaultLeaf, createDefaultCombinator } from '../../../validation/conditionMeta';
import { useRuleBuilderStore } from './useRuleBuilderStore';
import { ConditionEditor } from './ConditionEditor';
import { ConditionTypePicker } from './ConditionTypePicker';
import { Plus, X } from 'lucide-react';

interface CombinatorGroupProps {
  ruleId: string;
  path: number[];
  node: CombinatorNode;
  depth: number;
  onRemove?: () => void;
}

const KIND_STYLES: Record<CombinatorKind, { label: string; headerBg: string; borderLeft: string }> = {
  ALL:        { label: 'ALL (AND)',   headerBg: 'bg-blue-500/15 border-b-blue-500/25',   borderLeft: 'border-l-blue-400' },
  ANY:        { label: 'ANY (OR)',    headerBg: 'bg-emerald-500/15 border-b-emerald-500/25', borderLeft: 'border-l-emerald-400' },
  NONE:       { label: 'NONE (NOR)',  headerBg: 'bg-red-500/15 border-b-red-500/25',     borderLeft: 'border-l-red-400' },
  EXACTLY_N:  { label: 'EXACTLY N',  headerBg: 'bg-purple-500/15 border-b-purple-500/25', borderLeft: 'border-l-purple-400' },
  AT_LEAST_N: { label: 'AT LEAST N', headerBg: 'bg-amber-500/15 border-b-amber-500/25', borderLeft: 'border-l-amber-400' },
};

export function CombinatorGroup({ ruleId, path, node, depth, onRemove }: CombinatorGroupProps) {
  const [showPicker, setShowPicker] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const updateCondition = useRuleBuilderStore(s => s.updateConditionAtPath);
  const addChild = useRuleBuilderStore(s => s.addChildAtPath);
  const removeChild = useRuleBuilderStore(s => s.removeChildAtPath);

  const style = KIND_STYLES[node.kind];

  const handleKindChange = (kind: CombinatorKind) => {
    updateCondition(ruleId, path, { ...node, kind });
  };

  const handleNChange = (n: number) => {
    updateCondition(ruleId, path, { ...node, n: Math.max(1, n) });
  };

  const handleAddLeaf = (kind: LeafKind) => {
    addChild(ruleId, path, createDefaultLeaf(kind));
  };

  const handleAddCombinator = (kind: 'ALL' | 'ANY' | 'NONE') => {
    addChild(ruleId, path, { ...createDefaultCombinator(), kind } as ConditionNode);
  };

  return (
    <div className={`rounded-lg border-l-[3px] ${style.borderLeft} border border-[var(--border-subtle)] ${depth > 0 ? 'ml-3' : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 ${style.headerBg} rounded-t-lg border-b`}>
        <select
          value={node.kind}
          onChange={e => handleKindChange(e.target.value as CombinatorKind)}
          className="h-6 px-1.5 bg-[var(--surface-base)] rounded-md border border-[var(--border-default)] text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
        >
          {Object.entries(KIND_STYLES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {(node.kind === 'EXACTLY_N' || node.kind === 'AT_LEAST_N') && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">N =</span>
            <input
              type="number"
              min={1}
              value={node.n ?? 1}
              onChange={e => handleNChange(Number(e.target.value))}
              className="h-6 w-12 px-1 bg-[var(--surface-base)] rounded-md border border-[var(--border-default)] text-[11px] text-foreground text-center focus:outline-none focus:border-primary/40"
            />
          </div>
        )}

        <span className="text-[11px] text-muted-foreground ml-auto font-medium">
          {node.children.length} condition{node.children.length !== 1 ? 's' : ''}
        </span>

        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-colors"
            title="Remove group"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Children */}
      <div className="p-2 space-y-2">
        {node.children.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-4 border border-dashed border-[var(--border-subtle)] rounded-lg">
            No conditions yet. Add one below.
          </div>
        )}

        {node.children.map((child, index) => (
          <ConditionEditor
            key={index}
            ruleId={ruleId}
            path={[...path, index]}
            node={child}
            depth={depth + 1}
            onRemove={() => removeChild(ruleId, path, index)}
          />
        ))}

        {/* Add button */}
        <button
          ref={addBtnRef}
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1.5 w-full justify-center py-2 rounded-lg border border-dashed border-[var(--border-subtle)] text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Condition
        </button>

        {showPicker && (
          <ConditionTypePicker
            anchorRef={addBtnRef}
            onSelect={(kind) => { handleAddLeaf(kind); setShowPicker(false); }}
            onSelectCombinator={(kind) => { handleAddCombinator(kind); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
