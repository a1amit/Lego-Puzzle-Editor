/**
 * Lego-themed SVG thumbnails for puzzle cards.
 * 2D: top-down baseplate with colorful bricks and studs.
 * 3D: isometric stacked bricks.
 */

const LEGO_PALETTE = ['#D01012', '#0055BF', '#F5CD2F', '#287F46', '#FE8A18', '#9B5FC0', '#003DA5', '#D3BC8D'];

// Deterministic pseudo-random from seed
function rand(seed: number) { return ((Math.sin(seed * 9301 + 49297) % 1) + 1) % 1; }

interface PuzzleThumbnailProps {
  dimensions: { width: number; height: number };
  viewMode?: '2D' | '3D';
  className?: string;
}

export function PuzzleThumbnail({ dimensions, viewMode = '2D', className = '' }: PuzzleThumbnailProps) {
  return viewMode === '3D'
    ? <Thumbnail3D dimensions={dimensions} className={className} />
    : <Thumbnail2D dimensions={dimensions} className={className} />;
}

/** 2D: Top-down baseplate with scattered bricks and studs */
function Thumbnail2D({ dimensions, className }: { dimensions: { width: number; height: number }; className: string }) {
  const { width, height } = dimensions;
  const cellSize = 12;
  const svgW = width * cellSize;
  const svgH = height * cellSize;
  const maxSize = 120;
  const scale = Math.min(maxSize / svgW, maxSize / svgH, 1);

  // Generate deterministic brick placements
  const bricks: { x: number; y: number; w: number; h: number; color: string }[] = [];
  const occupied = new Set<string>();
  const seed = width * 100 + height;

  for (let i = 0; i < width * height * 2; i++) {
    const bw = rand(seed + i * 3) > 0.5 ? 2 : (rand(seed + i * 7) > 0.6 ? 3 : 1);
    const bh = rand(seed + i * 5) > 0.7 ? 2 : 1;
    const bx = Math.floor(rand(seed + i * 11) * (width - bw + 1));
    const by = Math.floor(rand(seed + i * 13) * (height - bh + 1));

    // Check if space is free
    let fits = true;
    for (let dx = 0; dx < bw && fits; dx++)
      for (let dy = 0; dy < bh && fits; dy++)
        if (occupied.has(`${bx + dx},${by + dy}`)) fits = false;
    if (!fits) continue;

    // Place it
    for (let dx = 0; dx < bw; dx++)
      for (let dy = 0; dy < bh; dy++)
        occupied.add(`${bx + dx},${by + dy}`);

    bricks.push({
      x: bx * cellSize,
      y: by * cellSize,
      w: bw * cellSize,
      h: bh * cellSize,
      color: LEGO_PALETTE[Math.floor(rand(seed + i * 17) * LEGO_PALETTE.length)],
    });
    if (bricks.length >= Math.ceil(width * height * 0.6)) break;
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg width={svgW * scale} height={svgH * scale} viewBox={`0 0 ${svgW} ${svgH}`} className="rounded-lg">
        {/* Baseplate */}
        <rect width={svgW} height={svgH} fill="#1a5c2a" rx={2} />
        {/* Baseplate stud grid */}
        {Array.from({ length: width }).map((_, cx) =>
          Array.from({ length: height }).map((_, cy) => (
            <circle
              key={`s${cx}-${cy}`}
              cx={cx * cellSize + cellSize / 2}
              cy={cy * cellSize + cellSize / 2}
              r={cellSize * 0.18}
              fill="rgba(255,255,255,0.08)"
            />
          ))
        )}
        {/* Bricks */}
        {bricks.map((b, i) => (
          <g key={i}>
            <rect x={b.x + 0.5} y={b.y + 0.5} width={b.w - 1} height={b.h - 1} rx={1.5} fill={b.color} />
            {/* Highlight edge */}
            <rect x={b.x + 0.5} y={b.y + 0.5} width={b.w - 1} height={b.h * 0.25} rx={1.5} fill="rgba(255,255,255,0.15)" />
            {/* Studs on brick */}
            {Array.from({ length: Math.round(b.w / cellSize) }).map((_, sx) =>
              Array.from({ length: Math.round(b.h / cellSize) }).map((_, sy) => (
                <circle
                  key={`st${sx}-${sy}`}
                  cx={b.x + sx * cellSize + cellSize / 2}
                  cy={b.y + sy * cellSize + cellSize / 2}
                  r={cellSize * 0.22}
                  fill="rgba(255,255,255,0.2)"
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth={0.4}
                />
              ))
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** 3D: Isometric Lego build on a green baseplate */
function Thumbnail3D({ dimensions, className }: { dimensions: { width: number; height: number }; className: string }) {
  const { width, height } = dimensions;
  const seed = width * 100 + height + 7;

  // Iso cell dimensions
  const tileW = 12; // half-width of iso tile
  const tileH = 7;  // half-height of iso tile
  const brickH = 6; // brick thickness
  const cols = Math.min(width, 6);
  const rows = Math.min(height, 5);
  const maxLayers = 3;

  // Canvas sizing
  const isoTotalW = (cols + rows) * tileW;
  const isoTotalH = (cols + rows) * tileH / 2 + maxLayers * brickH + brickH;
  const pad = 8;
  const svgW = isoTotalW + pad * 2;
  const svgH = isoTotalH + pad * 2;
  const maxSize = 130;
  const scale = Math.min(maxSize / svgW, maxSize / svgH, 1);

  // Origin: top-center of the baseplate diamond
  const ox = rows * tileW + pad;
  const oy = pad + maxLayers * brickH;

  // Iso projection helpers
  const ix = (c: number, r: number) => ox + (c - r) * tileW;
  const iy = (c: number, r: number, layer: number) => oy + (c + r) * (tileH / 2) - layer * brickH;

  // Build occupancy grid and place bricks layer by layer
  const grid: boolean[][][] = Array.from({ length: maxLayers }, () =>
    Array.from({ length: cols }, () => Array(rows).fill(false))
  );

  type Brick = { c: number; r: number; cw: number; rh: number; layer: number; color: string };
  const bricks: Brick[] = [];

  for (let layer = 0; layer < maxLayers; layer++) {
    // Fill rate decreases per layer
    const fillChance = layer === 0 ? 0.85 : layer === 1 ? 0.4 : 0.15;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[layer][c][r]) continue;
        if (rand(seed + layer * 300 + c * 19 + r * 13) > fillChance) continue;
        // Upper layers need support from below
        if (layer > 0 && !grid[layer - 1][c][r]) continue;

        // Try to place a 2x1 or 1x2 brick, fall back to 1x1
        let cw = 1, rh = 1;
        const tryWide = rand(seed + layer * 70 + c * 31 + r * 23);
        if (tryWide > 0.5 && c + 1 < cols && !grid[layer][c + 1][r] && (layer === 0 || grid[layer - 1][c + 1][r])) {
          cw = 2;
        } else if (tryWide > 0.25 && r + 1 < rows && !grid[layer][c][r + 1] && (layer === 0 || grid[layer - 1][c][r + 1])) {
          rh = 2;
        }

        // Mark occupied
        for (let dc = 0; dc < cw; dc++)
          for (let dr = 0; dr < rh; dr++)
            grid[layer][c + dc][r + dr] = true;

        bricks.push({
          c, r, cw, rh, layer,
          color: LEGO_PALETTE[Math.floor(rand(seed + layer * 50 + c * 17 + r * 11) * LEGO_PALETTE.length)],
        });
      }
    }
  }

  // Sort: bottom-to-top, then back-to-front
  bricks.sort((a, b) => (a.layer - b.layer) || (a.c + a.r) - (b.c + b.r));

  // Helper: build iso diamond polygon points for a brick spanning cw x rh cells
  const topFace = (b: Brick) => {
    const x0 = ix(b.c, b.r);
    const y0 = iy(b.c, b.r, b.layer);
    const x1 = ix(b.c + b.cw, b.r);
    const y1 = iy(b.c + b.cw, b.r, b.layer);
    const x2 = ix(b.c + b.cw, b.r + b.rh);
    const y2 = iy(b.c + b.cw, b.r + b.rh, b.layer);
    const x3 = ix(b.c, b.r + b.rh);
    const y3 = iy(b.c, b.r + b.rh, b.layer);
    return `${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`;
  };

  const leftFace = (b: Brick) => {
    const x0 = ix(b.c, b.r + b.rh);
    const y0 = iy(b.c, b.r + b.rh, b.layer);
    const x1 = ix(b.c + b.cw, b.r + b.rh);
    const y1 = iy(b.c + b.cw, b.r + b.rh, b.layer);
    return `${x0},${y0} ${x1},${y1} ${x1},${y1 + brickH} ${x0},${y0 + brickH}`;
  };

  const rightFace = (b: Brick) => {
    const x0 = ix(b.c + b.cw, b.r);
    const y0 = iy(b.c + b.cw, b.r, b.layer);
    const x1 = ix(b.c + b.cw, b.r + b.rh);
    const y1 = iy(b.c + b.cw, b.r + b.rh, b.layer);
    return `${x0},${y0} ${x1},${y1} ${x1},${y1 + brickH} ${x0},${y0 + brickH}`;
  };

  // Baseplate points
  const bpTop = `${ix(0,0)},${iy(0,0,0)} ${ix(cols,0)},${iy(cols,0,0)} ${ix(cols,rows)},${iy(cols,rows,0)} ${ix(0,rows)},${iy(0,rows,0)}`;
  const bpFrontL = `${ix(0,rows)},${iy(0,rows,0)} ${ix(cols,rows)},${iy(cols,rows,0)} ${ix(cols,rows)},${iy(cols,rows,0)+3} ${ix(0,rows)},${iy(0,rows,0)+3}`;
  const bpFrontR = `${ix(cols,0)},${iy(cols,0,0)} ${ix(cols,rows)},${iy(cols,rows,0)} ${ix(cols,rows)},${iy(cols,rows,0)+3} ${ix(cols,0)},${iy(cols,0,0)+3}`;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg width={svgW * scale} height={svgH * scale} viewBox={`0 0 ${svgW} ${svgH}`} className="rounded-lg">
        <defs>
          <filter id="bshadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" /></filter>
        </defs>

        {/* Baseplate */}
        <g filter="url(#bshadow)">
          <polygon points={bpTop} fill="#1a7a32" />
          <polygon points={bpFrontL} fill="#14612a" />
          <polygon points={bpFrontR} fill="#0f4d22" />
          {/* Baseplate studs */}
          {Array.from({ length: cols }).map((_, c) =>
            Array.from({ length: rows }).map((_, r) => (
              <ellipse
                key={`bs${c}-${r}`}
                cx={ix(c + 0.5, r + 0.5)}
                cy={iy(c + 0.5, r + 0.5, 0) - 1}
                rx={tileW * 0.2}
                ry={tileH * 0.12}
                fill="rgba(255,255,255,0.1)"
              />
            ))
          )}
        </g>

        {/* Bricks */}
        {bricks.map((b, i) => (
          <g key={i}>
            {/* Left face (front-left) */}
            <polygon points={leftFace(b)} fill={b.color} opacity={0.65} />
            {/* Right face (front-right) */}
            <polygon points={rightFace(b)} fill={b.color} opacity={0.45} />
            {/* Top face */}
            <polygon points={topFace(b)} fill={b.color} />
            {/* Top highlight */}
            <polygon points={topFace(b)} fill="rgba(255,255,255,0.1)" />
            {/* Studs on top */}
            {Array.from({ length: b.cw }).map((_, sc) =>
              Array.from({ length: b.rh }).map((_, sr) => (
                <ellipse
                  key={`st${sc}-${sr}`}
                  cx={ix(b.c + sc + 0.5, b.r + sr + 0.5)}
                  cy={iy(b.c + sc + 0.5, b.r + sr + 0.5, b.layer) - 1.5}
                  rx={tileW * 0.2}
                  ry={tileH * 0.12}
                  fill={b.color}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={0.5}
                />
              ))
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
