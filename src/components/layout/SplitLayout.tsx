import { useState, useCallback, useRef, useEffect } from 'react';

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplit?: number;
  minLeft?: number;
  minRight?: number;
}

export function SplitLayout({
  left,
  right,
  defaultSplit = 40,
  minLeft = 20,
  minRight = 30,
}: SplitLayoutProps) {
  const [splitPercent, setSplitPercent] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    
    setSplitPercent(Math.max(minLeft, Math.min(100 - minRight, percent)));
  }, [isDragging, minLeft, minRight]);
  
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
  
  return (
    <div 
      ref={containerRef}
      className="flex h-full w-full overflow-hidden"
      style={{ cursor: isDragging ? 'col-resize' : 'default' }}
    >
      {/* Left panel */}
      <div 
        className="h-full overflow-hidden flex-shrink-0"
        style={{ width: `${splitPercent}%` }}
      >
        {left}
      </div>
      
      {/* Resize handle */}
      <div
        className={`
          w-1 h-full flex-shrink-0 cursor-col-resize relative
          bg-editor-border hover:bg-editor-accent transition-colors
          ${isDragging ? 'bg-editor-accent' : ''}
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Handle indicator */}
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-4 h-12 flex flex-col items-center justify-center gap-1
          ${isDragging ? 'opacity-100' : 'opacity-0 hover:opacity-100'}
          transition-opacity
        `}>
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-editor-accent" />
          ))}
        </div>
      </div>
      
      {/* Right panel */}
      <div 
        className="h-full overflow-hidden flex-1"
        style={{ width: `${100 - splitPercent}%` }}
      >
        {right}
      </div>
    </div>
  );
}

