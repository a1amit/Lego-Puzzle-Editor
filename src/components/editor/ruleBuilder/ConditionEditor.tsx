import type { ConditionNode } from '../../../types/customRules';
import { isCombinator } from '../../../types/customRules';
import type { CombinatorNode, LeafCondition } from '../../../types/customRules';
import { CombinatorGroup } from './CombinatorGroup';
import { LeafConditionRow } from './LeafConditionRow';

interface ConditionEditorProps {
  ruleId: string;
  path: number[];
  node: ConditionNode;
  depth: number;
  onRemove?: () => void;
}

export function ConditionEditor({ ruleId, path, node, depth, onRemove }: ConditionEditorProps) {
  if (isCombinator(node)) {
    return (
      <CombinatorGroup
        ruleId={ruleId}
        path={path}
        node={node as CombinatorNode}
        depth={depth}
        onRemove={onRemove}
      />
    );
  }

  return (
    <LeafConditionRow
      ruleId={ruleId}
      path={path}
      condition={node as LeafCondition}
      onRemove={onRemove ?? (() => {})}
    />
  );
}
