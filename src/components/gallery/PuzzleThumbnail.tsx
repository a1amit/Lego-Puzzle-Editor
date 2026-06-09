/**
 * Lego-themed SVG thumbnails for puzzle cards. Three variants, all full-bleed
 * (preserveAspectRatio "slice" — the art always covers its container):
 *   2D:     top-down baseplate with glossy packed bricks and studs.
 *   3D:     isometric build with properly shaded faces (no opacity tricks).
 *   plugin: a glowing closed circuit threading a 3x3x3 wire lattice — plugin
 *           puzzles carry stub 1x1 boards, so they get their own motif.
 * Art is deterministic per puzzle: seeded by `seedKey` (slug) + dimensions, so
 * two same-sized puzzles no longer share an identical thumbnail.
 */
import { useId } from 'react';

const LEGO_PALETTE = ['#D01012', '#0055BF', '#F5CD2F', '#287F46', '#FE8A18', '#9B5FC0', '#003DA5', '#D3BC8D'];

// Deep navy plate tones that sit naturally on the app's dark theme
const PLATE = '#161d2c';
const PLATE_SIDE = '#10151f';
const PLATE_STUD = 'rgba(255,255,255,0.055)';

/** Deterministic pseudo-random from seed */
function rand(seed: number) { return ((Math.sin(seed * 9301 + 49297) % 1) + 1) % 1; }

/** Small string hash so each puzzle gets its own art */
function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000;
}

/** Lighten (f > 0) or darken (f < 0) a #rrggbb color — real plastic shading */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const t = f > 0 ? v + (255 - v) * f : v * (1 + f);
    return Math.round(Math.max(0, Math.min(255, t)));
  };
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface PuzzleThumbnailProps {
  dimensions: { width: number; height: number };
  viewMode?: '2D' | '3D';
  /** PuzzleDefinition.engine — 'plugin' puzzles get the lattice motif */
  engine?: string;
  /** Usually the slug; differentiates art between same-sized puzzles */
  seedKey?: string;
  className?: string;
}

export function PuzzleThumbnail({ dimensions, viewMode = '2D', engine, seedKey = '', className = '' }: PuzzleThumbnailProps) {
  const seed = hashKey(seedKey) + dimensions.width * 100 + dimensions.height;
  // Plugin puzzles (and their stub 1x1 boards) get a dedicated motif
  if (engine === 'plugin' || (dimensions.width <= 1 && dimensions.height <= 1)) {
    return <ThumbnailPlugin seed={seed} className={className} />;
  }
  return viewMode === '3D'
    ? <Thumbnail3D dimensions={dimensions} seed={seed} className={className} />
    : <Thumbnail2D dimensions={dimensions} seed={seed} className={className} />;
}

/** Shared full-bleed svg shell with a soft sheen + corner vignette */
function Shell({ viewBox, className, children }: { viewBox: string; className: string; children: React.ReactNode }) {
  const uid = useId();
  const [, , vw, vh] = viewBox.split(' ').map(Number);
  return (
    <div className={`h-full w-full ${className}`}>
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className="block h-full w-full">
        <defs>
          <radialGradient id={`${uid}v`} cx="50%" cy="42%" r="75%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
          </radialGradient>
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.07" />
            <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {children}
        <rect width={vw} height={vh} fill={`url(#${uid}s)`} />
        <rect width={vw} height={vh} fill={`url(#${uid}v)`} />
      </svg>
    </div>
  );
}

/** 2D: top-down baseplate, densely packed glossy bricks */
function Thumbnail2D({ dimensions, seed, className }: { dimensions: { width: number; height: number }; seed: number; className: string }) {
  const VW = 240, VH = 150;
  // Show a readable window of the board: huge boards get cropped, tiny ones zoomed
  const cols = Math.max(5, Math.min(dimensions.width, 12));
  const rows = Math.max(4, Math.min(dimensions.height, 8));
  const cell = Math.max(VW / cols, VH / rows);
  const ox = (VW - cols * cell) / 2;
  const oy = (VH - rows * cell) / 2;

  // Pack bricks until ~3/4 of the plate is covered
  const occupied = new Set<string>();
  const bricks: { x: number; y: number; w: number; h: number; color: string }[] = [];
  const SIZES: [number, number][] = [[2, 1], [1, 2], [2, 2], [3, 1], [1, 1], [2, 1]];
  let covered = 0;
  for (let i = 0; i < cols * rows * 5 && covered < cols * rows * 0.78; i++) {
    const [bw, bh] = SIZES[Math.floor(rand(seed + i * 7) * SIZES.length)];
    const bx = Math.floor(rand(seed + i * 11) * (cols - bw + 1));
    const by = Math.floor(rand(seed + i * 13) * (rows - bh + 1));
    let fits = true;
    for (let dx = 0; dx < bw && fits; dx++)
      for (let dy = 0; dy < bh && fits; dy++)
        if (occupied.has(`${bx + dx},${by + dy}`)) fits = false;
    if (!fits) continue;
    for (let dx = 0; dx < bw; dx++)
      for (let dy = 0; dy < bh; dy++)
        occupied.add(`${bx + dx},${by + dy}`);
    covered += bw * bh;
    bricks.push({ x: bx, y: by, w: bw, h: bh, color: LEGO_PALETTE[Math.floor(rand(seed + i * 17) * LEGO_PALETTE.length)] });
  }

  const studR = cell * 0.27;
  return (
    <Shell viewBox={`0 0 ${VW} ${VH}`} className={className}>
      <rect width={VW} height={VH} fill={PLATE} />
      {/* plate studs */}
      {Array.from({ length: cols }).map((_, cx) =>
        Array.from({ length: rows }).map((_, cy) => (
          <circle key={`p${cx}-${cy}`} cx={ox + cx * cell + cell / 2} cy={oy + cy * cell + cell / 2} r={cell * 0.21} fill={PLATE_STUD} />
        ))
      )}
      {/* bricks */}
      {bricks.map((b, i) => {
        const x = ox + b.x * cell, y = oy + b.y * cell, w = b.w * cell, h = b.h * cell;
        const g = 1.6; // grout between bricks
        return (
          <g key={i}>
            <rect x={x + g} y={y + g} width={w - g * 2} height={h - g * 2} rx={2.5}
              fill={b.color} stroke={shade(b.color, -0.45)} strokeWidth={1} />
            {/* top-edge light + bottom-edge shade = molded plastic */}
            <rect x={x + g + 1.5} y={y + g + 1.5} width={w - g * 2 - 3} height={(h - g * 2) * 0.26} rx={2} fill="#fff" opacity={0.16} />
            <rect x={x + g + 1.5} y={y + h - g - (h - g * 2) * 0.14 - 1.5} width={w - g * 2 - 3} height={(h - g * 2) * 0.14} rx={2} fill="#000" opacity={0.14} />
            {/* glossy studs */}
            {Array.from({ length: b.w }).map((_, sx) =>
              Array.from({ length: b.h }).map((_, sy) => {
                const cx0 = x + sx * cell + cell / 2, cy0 = y + sy * cell + cell / 2;
                return (
                  <g key={`s${sx}-${sy}`}>
                    <circle cx={cx0} cy={cy0 + 0.8} r={studR} fill={shade(b.color, -0.3)} />
                    <circle cx={cx0} cy={cy0} r={studR} fill={shade(b.color, 0.1)} />
                    <circle cx={cx0 - studR * 0.3} cy={cy0 - studR * 0.35} r={studR * 0.32} fill="#fff" opacity={0.3} />
                  </g>
                );
              })
            )}
          </g>
        );
      })}
    </Shell>
  );
}

/** 3D: isometric build with shaded faces on a dark plate */
function Thumbnail3D({ dimensions, seed, className }: { dimensions: { width: number; height: number }; seed: number; className: string }) {
  const uid = useId();
  const tileW = 16, tileH = 9, brickH = 9;
  const cols = Math.max(4, Math.min(dimensions.width, 7));
  const rows = Math.max(3, Math.min(dimensions.height, 6));
  const maxLayers = 4;

  const isoW = (cols + rows) * tileW;
  const isoH = (cols + rows) * tileH / 2 + maxLayers * brickH;
  const pad = 10;
  const VW = isoW + pad * 2;
  const VH = isoH + pad * 2 + 6;
  const ox = rows * tileW + pad;
  const oy = pad + maxLayers * brickH;
  const ix = (c: number, r: number) => ox + (c - r) * tileW;
  const iy = (c: number, r: number, layer: number) => oy + (c + r) * (tileH / 2) - layer * brickH;

  // place bricks layer by layer; upper layers need support
  const grid: boolean[][][] = Array.from({ length: maxLayers }, () =>
    Array.from({ length: cols }, () => Array(rows).fill(false))
  );
  type Brick = { c: number; r: number; cw: number; rh: number; layer: number; color: string };
  const bricks: Brick[] = [];
  const FILL = [0.92, 0.55, 0.3, 0.16];
  for (let layer = 0; layer < maxLayers; layer++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[layer][c][r]) continue;
        if (rand(seed + layer * 300 + c * 19 + r * 13) > FILL[layer]) continue;
        if (layer > 0 && !grid[layer - 1][c][r]) continue;
        let cw = 1, rh = 1;
        const tryWide = rand(seed + layer * 70 + c * 31 + r * 23);
        if (tryWide > 0.5 && c + 1 < cols && !grid[layer][c + 1][r] && (layer === 0 || grid[layer - 1][c + 1][r])) cw = 2;
        else if (tryWide > 0.25 && r + 1 < rows && !grid[layer][c][r + 1] && (layer === 0 || grid[layer - 1][c][r + 1])) rh = 2;
        for (let dc = 0; dc < cw; dc++)
          for (let dr = 0; dr < rh; dr++)
            grid[layer][c + dc][r + dr] = true;
        bricks.push({ c, r, cw, rh, layer, color: LEGO_PALETTE[Math.floor(rand(seed + layer * 50 + c * 17 + r * 11) * LEGO_PALETTE.length)] });
      }
    }
  }
  bricks.sort((a, b) => (a.layer - b.layer) || (a.c + a.r) - (b.c + b.r));

  const quad = (pts: [number, number][]) => pts.map(p => p.join(',')).join(' ');
  const topFace = (b: Brick) => quad([
    [ix(b.c, b.r), iy(b.c, b.r, b.layer)],
    [ix(b.c + b.cw, b.r), iy(b.c + b.cw, b.r, b.layer)],
    [ix(b.c + b.cw, b.r + b.rh), iy(b.c + b.cw, b.r + b.rh, b.layer)],
    [ix(b.c, b.r + b.rh), iy(b.c, b.r + b.rh, b.layer)],
  ]);
  const leftFace = (b: Brick) => {
    const x0 = ix(b.c, b.r + b.rh), y0 = iy(b.c, b.r + b.rh, b.layer);
    const x1 = ix(b.c + b.cw, b.r + b.rh), y1 = iy(b.c + b.cw, b.r + b.rh, b.layer);
    return quad([[x0, y0], [x1, y1], [x1, y1 + brickH], [x0, y0 + brickH]]);
  };
  const rightFace = (b: Brick) => {
    const x0 = ix(b.c + b.cw, b.r), y0 = iy(b.c + b.cw, b.r, b.layer);
    const x1 = ix(b.c + b.cw, b.r + b.rh), y1 = iy(b.c + b.cw, b.r + b.rh, b.layer);
    return quad([[x0, y0], [x1, y1], [x1, y1 + brickH], [x0, y0 + brickH]]);
  };

  const plateTop = quad([
    [ix(0, 0), iy(0, 0, 0)], [ix(cols, 0), iy(cols, 0, 0)],
    [ix(cols, rows), iy(cols, rows, 0)], [ix(0, rows), iy(0, rows, 0)],
  ]);
  const plateL = quad([
    [ix(0, rows), iy(0, rows, 0)], [ix(cols, rows), iy(cols, rows, 0)],
    [ix(cols, rows), iy(cols, rows, 0) + 4], [ix(0, rows), iy(0, rows, 0) + 4],
  ]);
  const plateR = quad([
    [ix(cols, 0), iy(cols, 0, 0)], [ix(cols, rows), iy(cols, rows, 0)],
    [ix(cols, rows), iy(cols, rows, 0) + 4], [ix(cols, 0), iy(cols, 0, 0) + 4],
  ]);

  return (
    <Shell viewBox={`0 0 ${VW} ${VH}`} className={className}>
      <defs>
        <radialGradient id={`${uid}g`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#3b4f7a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0d1119" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={VW} height={VH} fill={PLATE_SIDE} />
      <rect width={VW} height={VH} fill={`url(#${uid}g)`} />

      {/* baseplate */}
      <polygon points={plateTop} fill={PLATE} />
      <polygon points={plateL} fill={shade(PLATE, -0.35)} />
      <polygon points={plateR} fill={shade(PLATE, -0.55)} />
      {Array.from({ length: cols }).map((_, c) =>
        Array.from({ length: rows }).map((_, r) => (
          <ellipse key={`bs${c}-${r}`} cx={ix(c + 0.5, r + 0.5)} cy={iy(c + 0.5, r + 0.5, 0) - 1}
            rx={tileW * 0.2} ry={tileH * 0.12} fill={PLATE_STUD} />
        ))
      )}

      {/* bricks: shaded opaque faces — light top, mid left, dark right */}
      {bricks.map((b, i) => (
        <g key={i}>
          <polygon points={leftFace(b)} fill={shade(b.color, -0.18)} stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} />
          <polygon points={rightFace(b)} fill={shade(b.color, -0.42)} stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} />
          <polygon points={topFace(b)} fill={shade(b.color, 0.16)} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />
          {Array.from({ length: b.cw }).map((_, sc) =>
            Array.from({ length: b.rh }).map((_, sr) => {
              const cx0 = ix(b.c + sc + 0.5, b.r + sr + 0.5);
              const cy0 = iy(b.c + sc + 0.5, b.r + sr + 0.5, b.layer);
              return (
                <g key={`st${sc}-${sr}`}>
                  <ellipse cx={cx0} cy={cy0 - 1} rx={tileW * 0.22} ry={tileH * 0.14} fill={shade(b.color, -0.12)} />
                  <ellipse cx={cx0} cy={cy0 - 2.5} rx={tileW * 0.22} ry={tileH * 0.14} fill={shade(b.color, 0.32)} />
                </g>
              );
            })
          )}
        </g>
      ))}
    </Shell>
  );
}

/**
 * Plugin: a glowing closed circuit threading a 3x3x3 wire lattice — nods to
 * the author-coded mechanical puzzles (Rubik's cube, Acyclic Shadows).
 */
const PLUGIN_LOOPS: [number, number, number][][] = [
  // each is a closed walk on the 3x3x3 lattice (unit steps, [x, y-up, z])
  [[0,0,0],[1,0,0],[2,0,0],[2,1,0],[2,1,1],[2,1,2],[2,0,2],[1,0,2],[0,0,2],[0,1,2],[0,1,1],[0,1,0]],
  [[0,1,0],[1,1,0],[1,2,0],[2,2,0],[2,2,1],[2,1,1],[2,1,2],[1,1,2],[1,0,2],[0,0,2],[0,0,1],[0,1,1]],
  [[0,0,1],[1,0,1],[2,0,1],[2,0,2],[2,1,2],[2,2,2],[1,2,2],[1,2,1],[1,2,0],[0,2,0],[0,1,0],[0,0,0]],
];
const PLUGIN_ACCENTS = ['#ffb000', '#4db8ff', '#bbe90b'];

function ThumbnailPlugin({ seed, className }: { seed: number; className: string }) {
  const uid = useId();
  const VW = 240, VH = 150;
  const u = 26, v = 13, h = 22;
  const cx = VW / 2, cy = 71;
  const px = (p: [number, number, number]) => cx + (p[0] - p[2]) * u;
  const py = (p: [number, number, number]) => cy + (p[0] + p[2]) * v - p[1] * h;

  // every unit edge of the 3x3x3 lattice, as faint wires
  const wires: string[] = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) {
    const a: [number, number, number] = [x, y, z];
    if (x < 2) wires.push(`${px(a)},${py(a)} ${px([x + 1, y, z])},${py([x + 1, y, z])}`);
    if (y < 2) wires.push(`${px(a)},${py(a)} ${px([x, y + 1, z])},${py([x, y + 1, z])}`);
    if (z < 2) wires.push(`${px(a)},${py(a)} ${px([x, y, z + 1])},${py([x, y, z + 1])}`);
  }

  const loop = PLUGIN_LOOPS[seed % PLUGIN_LOOPS.length];
  const accent = PLUGIN_ACCENTS[Math.floor(seed / 7) % PLUGIN_ACCENTS.length];
  const pts = [...loop, loop[0]].map(p => `${px(p)},${py(p)}`).join(' ');

  return (
    <Shell viewBox={`0 0 ${VW} ${VH}`} className={className}>
      <defs>
        <radialGradient id={`${uid}g`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#33508c" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0d1119" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={VW} height={VH} fill={PLATE_SIDE} />
      <rect width={VW} height={VH} fill={`url(#${uid}g)`} />

      {/* lattice wires + nodes */}
      {wires.map((w, i) => <polyline key={i} points={w} stroke="#2b3650" strokeWidth={1} fill="none" />)}
      {Array.from({ length: 27 }).map((_, i) => {
        const p: [number, number, number] = [i % 3, Math.floor(i / 9), Math.floor(i / 3) % 3];
        return <circle key={`n${i}`} cx={px(p)} cy={py(p)} r={1.6} fill="#39455e" />;
      })}

      {/* the glowing circuit: wide soft pass underneath, crisp pass on top */}
      <polyline points={pts} stroke={accent} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" fill="none" opacity={0.18} />
      <polyline points={pts} stroke={accent} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" fill="none" opacity={0.95} />
      {loop.map((p, i) => (
        <g key={`v${i}`}>
          <circle cx={px(p)} cy={py(p)} r={3.4} fill={accent} opacity={0.35} />
          <circle cx={px(p)} cy={py(p)} r={2} fill={shade(accent, 0.35)} />
        </g>
      ))}
    </Shell>
  );
}
