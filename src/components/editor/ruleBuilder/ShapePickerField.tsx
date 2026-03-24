import { SHAPE_LIBRARY } from '../../../types/puzzle';

interface ShapePickerFieldProps {
  shape: string;
  onChange: (shape: string) => void;
}

export function ShapePickerField({ shape, onChange }: ShapePickerFieldProps) {
  const shapeNames = Object.keys(SHAPE_LIBRARY);

  return (
    <select
      value={shape}
      onChange={e => onChange(e.target.value)}
      className="h-7 px-2 bg-[var(--surface-base)] rounded-md border border-[var(--border-default)] text-xs text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer max-w-[160px] [color-scheme:dark]"
    >
      {shapeNames.map(name => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}
