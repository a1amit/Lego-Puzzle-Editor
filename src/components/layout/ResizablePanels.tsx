import { useState, useCallback, useRef, useEffect, ReactNode } from 'react';

interface ResizablePanelsProps {
  direction: 'horizontal' | 'vertical';
  children: [ReactNode, ReactNode];
  defaultSize?: number; // percentage for first panel
  minSize?: number; // minimum percentage for first panel
  maxSize?: number; // maximum percentage for first panel
  className?: string;
}

export function ResizablePanels({
  direction,
  children,
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  className = '',
}: ResizablePanelsProps) {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hintShownRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHorizontal = direction === 'horizontal';

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setShowHint(false);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let percent: number;

      if (isHorizontal) {
        const x = e.clientX - rect.left;
        percent = (x / rect.width) * 100;
      } else {
        const y = e.clientY - rect.top;
        percent = (y / rect.height) * 100;
      }

      setSize(Math.max(minSize, Math.min(maxSize, percent)));
    },
    [isDragging, isHorizontal, minSize, maxSize]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Fallback: stop dragging if pointer leaves window
  useEffect(() => {
    if (isDragging) {
      const handleGlobalUp = () => setIsDragging(false);
      window.addEventListener('pointerup', handleGlobalUp);
      return () => window.removeEventListener('pointerup', handleGlobalUp);
    }
  }, [isDragging]);

  const handleDoubleClick = useCallback(() => {
    setSize(defaultSize);
  }, [defaultSize]);

  const handleMouseEnter = useCallback(() => {
    if (!hintShownRef.current) {
      hintShownRef.current = true;
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2500);
    }
  }, []);

  const cursorStyle = isHorizontal ? 'col-resize' : 'row-resize';

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full w-full overflow-hidden ${className}`}
      style={{ cursor: isDragging ? cursorStyle : 'default' }}
    >
      {/* First panel */}
      <div
        className="overflow-hidden flex-shrink-0"
        style={
          isHorizontal
            ? { width: `${size}%`, height: '100%' }
            : { height: `${size}%`, width: '100%' }
        }
      >
        {children[0]}
      </div>

      {/* Resize handle — wider hit area wrapping visual handle */}
      <div
        className={`
          flex-shrink-0 relative flex items-center justify-center group
          ${isHorizontal ? 'w-4 h-full cursor-col-resize' : 'h-4 w-full cursor-row-resize'}
          touch-none
        `}
        role="separator"
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(size)}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-label={`Resize ${isHorizontal ? 'horizontal' : 'vertical'} panels`}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 5 : 1;
          if ((isHorizontal && e.key === 'ArrowLeft') || (!isHorizontal && e.key === 'ArrowUp')) {
            e.preventDefault();
            setSize(s => Math.max(minSize, s - step));
          } else if ((isHorizontal && e.key === 'ArrowRight') || (!isHorizontal && e.key === 'ArrowDown')) {
            e.preventDefault();
            setSize(s => Math.min(maxSize, s + step));
          } else if (e.key === 'Home') {
            e.preventDefault();
            setSize(minSize);
          } else if (e.key === 'End') {
            e.preventDefault();
            setSize(maxSize);
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
      >
        {/* Visual handle bar */}
        <div
          className={`
            ${isHorizontal ? 'w-1.5 h-full rounded-full' : 'h-1.5 w-full rounded-full'}
            bg-border transition-all duration-150
            group-hover:bg-primary group-hover:shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_40%,transparent)]
            ${isDragging ? 'bg-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_50%,transparent)]' : ''}
          `}
        />
        {/* Handle indicator dots — visible at rest */}
        <div
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            flex items-center justify-center gap-1
            ${isHorizontal ? 'flex-col w-4 h-12' : 'flex-row h-4 w-12'}
            ${isDragging ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}
            transition-opacity pointer-events-none
          `}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-primary" />
          ))}
        </div>

        {/* Double-click hint tooltip */}
        {showHint && (
          <div
            className={`
              absolute z-50 px-2 py-1 rounded text-[10px] text-foreground bg-popover border border-border shadow-lg
              pointer-events-none whitespace-nowrap animate-[fade-in_0.2s_ease-out]
              ${isHorizontal ? 'top-1/2 -translate-y-1/2 left-full ml-2' : 'left-1/2 -translate-x-1/2 top-full mt-2'}
            `}
          >
            Double-click to reset size
          </div>
        )}
      </div>

      {/* Second panel */}
      <div
        className="overflow-hidden flex-1"
        style={
          isHorizontal
            ? { width: `${100 - size}%`, height: '100%' }
            : { height: `${100 - size}%`, width: '100%' }
        }
      >
        {children[1]}
      </div>
    </div>
  );
}
