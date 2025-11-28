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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
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

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

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

      {/* Resize handle */}
      <div
        className={`
          flex-shrink-0 relative
          ${isHorizontal ? 'w-1 h-full cursor-col-resize' : 'h-1 w-full cursor-row-resize'}
          bg-editor-border hover:bg-editor-accent transition-colors
          ${isDragging ? 'bg-editor-accent' : ''}
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Handle indicator */}
        <div
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            flex items-center justify-center gap-1
            ${isHorizontal ? 'flex-col w-4 h-12' : 'flex-row h-4 w-12'}
            ${isDragging ? 'opacity-100' : 'opacity-0 hover:opacity-100'}
            transition-opacity
          `}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-editor-accent" />
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

