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
  const containerRef = useRef<HTMLDivElement>(null);

  const isHorizontal = direction === 'horizontal';

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
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

      {/* Resize handle — outer hit area (12px) wrapping visual handle (6px) */}
      <div
        className={`
          flex-shrink-0 relative flex items-center justify-center
          ${isHorizontal ? 'w-3 h-full cursor-col-resize' : 'h-3 w-full cursor-row-resize'}
          touch-none
        `}
        role="separator"
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Visual handle bar */}
        <div
          className={`
            ${isHorizontal ? 'w-1.5 h-full' : 'h-1.5 w-full'}
            bg-border hover:bg-primary transition-colors
            ${isDragging ? 'bg-primary' : ''}
          `}
        />
        {/* Handle indicator dots */}
        <div
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            flex items-center justify-center gap-1
            ${isHorizontal ? 'flex-col w-4 h-12' : 'flex-row h-4 w-12'}
            ${isDragging ? 'opacity-100' : 'opacity-0 hover:opacity-100'}
            transition-opacity pointer-events-none
          `}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-primary" />
          ))}
        </div>
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
