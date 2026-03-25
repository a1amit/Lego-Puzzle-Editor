import { create } from 'zustand';
import type { ConditionNode } from '../../../types/customRules';
import { isCombinator, CustomRuleParamsSchema } from '../../../types/customRules';
import { createDefaultCombinator } from '../../../validation/conditionMeta';
import { usePuzzleStore } from '../../../store/puzzleStore';

// ============================================
// TYPES
// ============================================

export interface CustomRuleEntry {
  id: string;
  label: string;
  description: string;
  condition: ConditionNode;
}

interface RuleBuilderState {
  customRules: CustomRuleEntry[];
  activeRuleId: string | null;

  // Cell picker (multi-cell)
  cellPickerTarget: { ruleId: string; path: number[] } | null;
  cellPickerCells: Set<string>;
  /** Monotonic counter — increments on every picker cell change to guarantee reactive updates in R3F */
  cellPickerVersion: number;

  // Single-cell picker (for start/end cells in path_exists)
  singleCellPickerTarget: { ruleId: string; path: number[]; field: string } | null;

  // Actions
  addRule: () => void;
  removeRule: (id: string) => void;
  updateRuleLabel: (id: string, label: string) => void;
  updateRuleDescription: (id: string, description: string) => void;
  updateConditionAtPath: (ruleId: string, path: number[], node: ConditionNode) => void;
  addChildAtPath: (ruleId: string, path: number[], child: ConditionNode) => void;
  removeChildAtPath: (ruleId: string, path: number[], childIndex: number) => void;
  setActiveRule: (id: string | null) => void;

  // Cell picker (multi-cell)
  startCellPicker: (ruleId: string, path: number[]) => void;
  stopCellPicker: () => void;
  toggleCell: (x: number, y: number) => void;
  clearPickerCells: () => void;

  // Single-cell picker
  startSingleCellPicker: (ruleId: string, path: number[], field: string) => void;
  pickSingleCell: (x: number, y: number) => void;

  // Sync
  syncToJSON: () => void;
  loadFromJSON: () => void;
  debouncedSync: () => void;
}

// ============================================
// PATH-BASED TREE UTILITIES
// ============================================

/** Immutably update a node at a given path in the condition tree */
function updateAtPath(
  root: ConditionNode,
  path: number[],
  updater: (node: ConditionNode) => ConditionNode,
): ConditionNode {
  if (path.length === 0) return updater(root);

  if (!isCombinator(root)) return root; // leaf can't have children

  const [head, ...rest] = path;
  const newChildren = [...root.children];
  if (head >= 0 && head < newChildren.length) {
    newChildren[head] = updateAtPath(newChildren[head], rest, updater);
  }
  return { ...root, children: newChildren };
}

/** Get the node at a given path */
function getAtPath(root: ConditionNode, path: number[]): ConditionNode | null {
  let current: ConditionNode = root;
  for (const idx of path) {
    if (!isCombinator(current)) return null;
    if (idx < 0 || idx >= current.children.length) return null;
    current = current.children[idx];
  }
  return current;
}

/** Get cells from a leaf node at a given path (for the cell picker) */
function getCellsFromNode(node: ConditionNode): [number, number][] | null {
  if (isCombinator(node)) return null;
  if ('cells' in node && Array.isArray(node.cells)) {
    return node.cells as [number, number][];
  }
  return null;
}

let nextId = 1;

// ============================================
// STORE
// ============================================

export const useRuleBuilderStore = create<RuleBuilderState>((set, get) => ({
  customRules: [],
  cellPickerVersion: 0,
  singleCellPickerTarget: null,
  activeRuleId: null,
  cellPickerTarget: null,
  cellPickerCells: new Set(),

  addRule() {
    const id = `cr_${nextId++}_${Date.now()}`;
    set(s => ({
      customRules: [
        ...s.customRules,
        { id, label: 'New Rule', description: '', condition: createDefaultCombinator() },
      ],
      activeRuleId: id,
    }));
    // Auto-sync after adding
    setTimeout(() => get().syncToJSON(), 0);
  },

  removeRule(id) {
    set(s => ({
      customRules: s.customRules.filter(r => r.id !== id),
      activeRuleId: s.activeRuleId === id ? null : s.activeRuleId,
      cellPickerTarget: s.cellPickerTarget?.ruleId === id ? null : s.cellPickerTarget,
    }));
    setTimeout(() => get().syncToJSON(), 0);
  },

  updateRuleLabel(id, label) {
    set(s => ({
      customRules: s.customRules.map(r => r.id === id ? { ...r, label } : r),
    }));
    get().debouncedSync();
  },

  updateRuleDescription(id, description) {
    set(s => ({
      customRules: s.customRules.map(r => r.id === id ? { ...r, description } : r),
    }));
    get().debouncedSync();
  },

  updateConditionAtPath(ruleId, path, node) {
    set(s => ({
      customRules: s.customRules.map(r =>
        r.id === ruleId
          ? { ...r, condition: updateAtPath(r.condition, path, () => node) }
          : r
      ),
    }));
    get().debouncedSync();
  },

  addChildAtPath(ruleId, path, child) {
    set(s => ({
      customRules: s.customRules.map(r => {
        if (r.id !== ruleId) return r;
        const newCondition = updateAtPath(r.condition, path, (node) => {
          if (!isCombinator(node)) return node;
          return { ...node, children: [...node.children, child] };
        });
        return { ...r, condition: newCondition };
      }),
    }));
    get().debouncedSync();
  },

  removeChildAtPath(ruleId, path, childIndex) {
    set(s => ({
      customRules: s.customRules.map(r => {
        if (r.id !== ruleId) return r;
        const newCondition = updateAtPath(r.condition, path, (node) => {
          if (!isCombinator(node)) return node;
          const newChildren = node.children.filter((_, i) => i !== childIndex);
          return { ...node, children: newChildren };
        });
        return { ...r, condition: newCondition };
      }),
    }));
    get().debouncedSync();
  },

  setActiveRule(id) {
    set({ activeRuleId: id });
  },

  // --- Cell Picker ---
  startCellPicker(ruleId, path) {
    const rule = get().customRules.find(r => r.id === ruleId);
    if (!rule) return;

    const node = getAtPath(rule.condition, path);
    if (!node) return;

    const existingCells = getCellsFromNode(node);
    const cellSet = new Set<string>();
    if (existingCells) {
      for (const [x, y] of existingCells) cellSet.add(`${x},${y}`);
    }

    set({
      cellPickerTarget: { ruleId, path },
      cellPickerCells: cellSet,
    });
  },

  stopCellPicker() {
    const { cellPickerTarget, cellPickerCells } = get();
    if (!cellPickerTarget) {
      set({ cellPickerTarget: null, cellPickerCells: new Set() });
      return;
    }

    // Write selected cells back to the condition node
    const cells: [number, number][] = [...cellPickerCells].map(k => {
      const [x, y] = k.split(',').map(Number);
      return [x, y] as [number, number];
    });

    if (cells.length > 0) {
      const { ruleId, path } = cellPickerTarget;
      const rule = get().customRules.find(r => r.id === ruleId);
      if (rule) {
        const node = getAtPath(rule.condition, path);
        if (node && !isCombinator(node) && 'cells' in node) {
          get().updateConditionAtPath(ruleId, path, { ...node, cells } as ConditionNode);
        }
      }
    }

    set({ cellPickerTarget: null, cellPickerCells: new Set() });
  },

  toggleCell(x, y) {
    set(s => {
      const next = new Set(s.cellPickerCells);
      const key = `${x},${y}`;
      if (next.has(key)) next.delete(key); else next.add(key);
      return { cellPickerCells: next, cellPickerVersion: s.cellPickerVersion + 1 };
    });
  },

  clearPickerCells() {
    set(s => ({ cellPickerCells: new Set(), cellPickerVersion: s.cellPickerVersion + 1 }));
  },

  // --- Single-cell picker (for path_exists start/end) ---
  startSingleCellPicker(ruleId, path, field) {
    set({
      singleCellPickerTarget: { ruleId, path, field },
      // Also clear multi-cell picker if active
      cellPickerTarget: null,
      cellPickerCells: new Set(),
    });
  },

  pickSingleCell(x, y) {
    const { singleCellPickerTarget } = get();
    if (!singleCellPickerTarget) return;

    const { ruleId, path, field } = singleCellPickerTarget;
    const rule = get().customRules.find(r => r.id === ruleId);
    if (!rule) return;

    // Update the condition's field (e.g. startCell or endCell) with the picked cell
    get().updateConditionAtPath(ruleId, path, {
      ...(() => {
        // Get current node at path
        let node: any = rule.condition;
        for (const idx of path) {
          if (node.children) node = node.children[idx];
        }
        return node;
      })(),
      [field]: [x, y],
    } as ConditionNode);

    // Exit picker mode
    set(s => ({
      singleCellPickerTarget: null,
      cellPickerVersion: s.cellPickerVersion + 1,
    }));
  },

  // --- Sync ---
  syncToJSON() {
    const { customRules } = get();
    const puzzleStore = usePuzzleStore.getState();
    const puzzle = puzzleStore.puzzle;
    if (!puzzle) return;

    // Remove existing CUSTOM_RULE entries
    const otherRules = puzzle.validation_rules.filter(r => r.rule !== 'CUSTOM_RULE');

    // Build new CUSTOM_RULE entries
    const customEntries = customRules
      .filter(r => r.label.trim().length > 0)
      .map(r => ({
        type: 'CUSTOM' as const,
        rule: 'CUSTOM_RULE',
        params: {
          label: r.label,
          ...(r.description ? { description: r.description } : {}),
          condition: r.condition,
        },
      }));

    const updatedPuzzle = {
      ...puzzle,
      validation_rules: [...otherRules, ...customEntries],
    };

    try {
      puzzleStore.parseAndLoadPuzzle(JSON.stringify(updatedPuzzle, null, 2));
    } catch {
      // Ignore parse errors during editing
    }
  },

  loadFromJSON() {
    const puzzle = usePuzzleStore.getState().puzzle;
    if (!puzzle) return;

    const customEntries = puzzle.validation_rules.filter(r => r.rule === 'CUSTOM_RULE');
    const rules: CustomRuleEntry[] = [];

    for (const entry of customEntries) {
      const parsed = CustomRuleParamsSchema.safeParse(entry.params);
      if (parsed.success) {
        rules.push({
          id: `cr_${nextId++}_${Date.now()}`,
          label: parsed.data.label,
          description: parsed.data.description ?? '',
          condition: parsed.data.condition,
        });
      }
    }

    set({ customRules: rules, activeRuleId: rules[0]?.id ?? null });
  },

  // Debounced sync (500ms to match Monaco pattern)
  debouncedSync: (() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        useRuleBuilderStore.getState().syncToJSON();
      }, 500);
    };
  })() as unknown as () => void,
}));
