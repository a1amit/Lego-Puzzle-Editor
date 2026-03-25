import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { CONDITION_META, CONDITION_CATEGORIES, type ConditionCategory } from '../../../validation/conditionMeta';
import type { LeafKind } from '../../../types/customRules';
import { LEAF_KINDS } from '../../../types/customRules';
import { Badge } from '../../ui/shadcn/badge';
import { Layers, Grid3X3, Hash, Box, Move, FlipHorizontal, Code } from 'lucide-react';

interface ConditionTypePickerProps {
  onSelect: (kind: LeafKind) => void;
  onSelectCombinator: (kind: 'ALL' | 'ANY' | 'NONE') => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const CATEGORY_ICONS: Record<ConditionCategory, typeof Grid3X3> = {
  'Cell': Grid3X3,
  'Row/Column': Layers,
  'Count': Hash,
  'Stacking': Box,
  'Spatial': Move,
  'Symmetry': FlipHorizontal,
  'Advanced': Code,
};

export function ConditionTypePicker({ onSelect, onSelectCombinator, onClose, anchorRef }: ConditionTypePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<ConditionCategory | 'Logic'>('Cell');
  const viewMode = usePuzzleStore(s => s.puzzle?.viewMode ?? '3D');
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Position the panel relative to the anchor button
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelHeight = 400;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    let top: number;
    if (spaceBelow >= panelHeight || spaceBelow >= spaceAbove) {
      top = rect.bottom + 4;
    } else {
      top = rect.top - Math.min(panelHeight, spaceAbove) - 4;
    }

    let left = rect.left;
    if (left + 360 > window.innerWidth - 8) {
      left = window.innerWidth - 360 - 8;
    }

    setPos({ top, left: Math.max(8, left) });
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const content = (
    <div
      ref={panelRef}
      className="fixed w-[360px] rounded-xl shadow-2xl overflow-hidden border border-[var(--border-default)]"
      style={{
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        backgroundColor: 'var(--surface-raised)',
      }}
    >
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-[var(--border-subtle)]" style={{ backgroundColor: 'var(--surface-sunken)' }}>
        {CONDITION_CATEGORIES.map(cat => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cat}
            </button>
          );
        })}
        <button
          onClick={() => setSelectedCategory('Logic')}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
            selectedCategory === 'Logic'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
          }`}
        >
          Logic Group
        </button>
      </div>

      {/* Options */}
      <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
        {selectedCategory === 'Logic' ? (
          <>
            {(['ALL', 'ANY', 'NONE'] as const).map(kind => (
              <button
                key={kind}
                onClick={() => { onSelectCombinator(kind); onClose(); }}
                className="w-full text-left p-2.5 rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <div className="text-xs font-semibold text-foreground">
                  {kind === 'ALL' ? 'ALL (AND)' : kind === 'ANY' ? 'ANY (OR)' : 'NONE (NOR)'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {kind === 'ALL' ? 'All conditions must pass' :
                   kind === 'ANY' ? 'At least one condition must pass' :
                   'No conditions may pass'}
                </div>
              </button>
            ))}
          </>
        ) : (
          LEAF_KINDS
            .filter(kind => CONDITION_META[kind].category === selectedCategory)
            .map(kind => {
              const meta = CONDITION_META[kind];
              const disabled = meta.is3DOnly && viewMode === '2D';

              return (
                <button
                  key={kind}
                  onClick={() => { if (!disabled) { onSelect(kind); onClose(); } }}
                  disabled={disabled}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                    disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-secondary/80 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                    {meta.is3DOnly && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">3D only</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{meta.description}</div>
                </button>
              );
            })
        )}
      </div>

      {/* Close */}
      <div className="p-2 border-t border-[var(--border-subtle)]">
        <button
          onClick={onClose}
          className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground py-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
