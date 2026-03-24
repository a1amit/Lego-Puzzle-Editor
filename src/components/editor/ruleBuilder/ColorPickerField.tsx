import { useState } from 'react';
import { usePuzzleStore } from '../../../store/puzzleStore';

interface ColorPickerFieldProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPickerField({ color, onChange }: ColorPickerFieldProps) {
  const [showCustom, setShowCustom] = useState(false);
  const puzzle = usePuzzleStore(s => s.puzzle);

  // Get unique colors from puzzle inventory for quick picks
  const inventoryColors = puzzle
    ? [...new Set(puzzle.inventory.map(b => b.color))]
    : [];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {inventoryColors.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-md border-2 transition-all ${
            c.toLowerCase() === color.toLowerCase()
              ? 'border-primary scale-110 shadow-md'
              : 'border-[var(--border-subtle)] hover:border-primary/40'
          }`}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="h-6 px-2 text-[10px] bg-secondary rounded-md border border-[var(--border-subtle)] text-muted-foreground hover:text-foreground transition-colors"
      >
        {showCustom ? 'Hide' : 'Custom'}
      </button>
      {showCustom && (
        <input
          type="color"
          value={color}
          onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded border-0 cursor-pointer"
        />
      )}
    </div>
  );
}
