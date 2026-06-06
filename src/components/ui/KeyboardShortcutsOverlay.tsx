import { useEffect, useState } from 'react';
import { useIsTouch } from '../../hooks/useMediaQuery';

const SHORTCUTS = [
  { keys: ['R'], description: 'Rotate selected brick' },
  { keys: ['Del'], description: 'Remove selected brick' },
  { keys: ['Esc'], description: 'Deselect brick' },
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Right-click'], description: 'Rotate preview (3D)' },
  { keys: ['?'], description: 'Toggle this overlay' },
];

export function KeyboardShortcutsOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  // Keyboard/mouse-only shortcuts are meaningless on touch devices — never
  // wire up the listener or render the overlay there.
  const isTouch = useIsTouch();

  useEffect(() => {
    if (isTouch) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === '?') {
        e.preventDefault();
        setIsVisible(v => !v);
      } else if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isTouch]);

  if (isTouch || !isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={() => setIsVisible(false)}
      role="dialog"
      aria-label="Keyboard shortcuts"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-foreground mb-4 tracking-wide">KEYBOARD SHORTCUTS</h2>
        <div className="space-y-2.5">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.description} className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded font-mono text-[10px] border border-border"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          Press <kbd className="px-1 py-0.5 bg-secondary rounded font-mono text-[10px]">?</kbd> or <kbd className="px-1 py-0.5 bg-secondary rounded font-mono text-[10px]">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
