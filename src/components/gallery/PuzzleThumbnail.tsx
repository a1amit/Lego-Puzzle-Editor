/**
 * Client-side SVG mini-renderer for puzzle thumbnails.
 * Renders a simplified non-interactive view from the puzzle definition.
 */

const CELL_SIZE = 8;
const COLORS = {
  grid: 'rgba(255,255,255,0.06)',
  gridLine: 'rgba(255,255,255,0.08)',
  blocked: 'rgba(255,255,255,0.03)',
  text: 'rgba(255,255,255,0.4)',
};

interface PuzzleThumbnailProps {
  dimensions: { width: number; height: number };
  viewMode?: '2D' | '3D';
  className?: string;
}

export function PuzzleThumbnail({ dimensions, viewMode = '2D', className = '' }: PuzzleThumbnailProps) {
  const { width, height } = dimensions;
  const svgWidth = width * CELL_SIZE;
  const svgHeight = height * CELL_SIZE;

  // Keep aspect ratio within bounds
  const maxSize = 100;
  const scale = Math.min(maxSize / svgWidth, maxSize / svgHeight, 1);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={svgWidth * scale}
        height={svgHeight * scale}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="rounded"
      >
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} fill={COLORS.grid} rx={2} />

        {/* Grid lines */}
        {Array.from({ length: width + 1 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * CELL_SIZE}
            y1={0}
            x2={i * CELL_SIZE}
            y2={svgHeight}
            stroke={COLORS.gridLine}
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: height + 1 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * CELL_SIZE}
            x2={svgWidth}
            y2={i * CELL_SIZE}
            stroke={COLORS.gridLine}
            strokeWidth={0.5}
          />
        ))}

        {/* View mode indicator */}
        <text
          x={svgWidth / 2}
          y={svgHeight / 2 + 2}
          textAnchor="middle"
          fontSize={Math.min(svgWidth, svgHeight) * 0.25}
          fill={COLORS.text}
          fontFamily="monospace"
        >
          {viewMode}
        </text>
      </svg>
    </div>
  );
}
