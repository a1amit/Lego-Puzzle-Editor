/**
 * SvgDefs2D - SVG filter, gradient, and pattern definitions for the 2D renderer.
 */

import { useMemo } from 'react';
import type { PlacedPiece } from '../../../engine';
import { lighten, darken, C, SHADOW } from './styles2D';

interface SvgDefsProps {
  pieces: PlacedPiece[];
  inventoryColors: string[];
  cellSize: number;
}

export function SvgDefs({ pieces, inventoryColors, cellSize }: SvgDefsProps) {
  const uniqueColors = useMemo(() => {
    const colorSet = new Set([...pieces.map(p => p.color), ...inventoryColors]);
    return Array.from(colorSet);
  }, [pieces, inventoryColors]);

  return (
    <defs>
      {/* Board surface gradient */}
      <radialGradient id="board-gradient" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stopColor={C.boardSurface} />
        <stop offset="100%" stopColor={C.boardSurfaceEdge} />
      </radialGradient>

      {/* Board inset shadow filter */}
      <filter id="board-shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
      </filter>

      {/* Piece drop shadow - subtle, always on */}
      <filter id="piece-shadow" x="-10%" y="-10%" width="130%" height="140%">
        <feDropShadow dx="0" dy={SHADOW.offsetY} stdDeviation={SHADOW.blur} floodColor="#000" floodOpacity={SHADOW.opacity} />
      </filter>

      {/* Piece drop shadow - selected (stronger) */}
      <filter id="piece-shadow-selected" x="-15%" y="-15%" width="140%" height="160%">
        <feDropShadow dx="0" dy={SHADOW.selectedOffsetY} stdDeviation={SHADOW.selectedBlur} floodColor="#000" floodOpacity={SHADOW.selectedOpacity} />
      </filter>

      {/* Selection glow */}
      <filter id="selection-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feFlood floodColor={C.selectionGlow} floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Hover glow */}
      <filter id="hover-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        <feFlood floodColor="#ffffff" floodOpacity="0.2" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Valid destination pulse glow */}
      <filter id="dest-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feFlood floodColor={C.validDestGlow} floodOpacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Cell stud gradient (board studs) */}
      <radialGradient id="cell-stud-grad" cx="40%" cy="35%" r="55%">
        <stop offset="0%" stopColor={C.cellStudHighlight} />
        <stop offset="50%" stopColor={C.cellStud} />
        <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
      </radialGradient>

      {/* Cell base gradient */}
      <linearGradient id="cell-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.cellBaseLight} />
        <stop offset="100%" stopColor={C.cellBase} />
      </linearGradient>

      {/* Blocked cell gradient */}
      <linearGradient id="cell-blocked-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.cellBlockedLight} />
        <stop offset="100%" stopColor={C.cellBlocked} />
      </linearGradient>

      {/* Per-piece color gradients */}
      {uniqueColors.map(color => {
        const id = `piece-grad-${color.replace('#', '')}`;
        const studId = `stud-grad-${color.replace('#', '')}`;
        return (
          <g key={color}>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lighten(color, 0.12)} />
              <stop offset="50%" stopColor={color} />
              <stop offset="100%" stopColor={darken(color, 35)} />
            </linearGradient>
            <radialGradient id={studId} cx="38%" cy="35%" r="58%">
              <stop offset="0%" stopColor={lighten(color, 0.22)} />
              <stop offset="55%" stopColor={color} />
              <stop offset="100%" stopColor={darken(color, 40)} />
            </radialGradient>
          </g>
        );
      })}

      {/* Stud inner shadow (concavity ring) */}
      <filter id="stud-inset" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
        <feOffset dx="0" dy="0.8" result="offsetBlur" />
        <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
      </filter>

      {/* Brick inner shadow for depth effect */}
      <filter id="brick-inner-shadow" x="-5%" y="-5%" width="110%" height="120%">
        {/* Invert the source alpha to create an inner shadow mask */}
        <feComponentTransfer in="SourceAlpha" result="inverse">
          <feFuncA type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feGaussianBlur in="inverse" stdDeviation="1.5" result="blur" />
        <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
        <feFlood floodColor="#000" floodOpacity="0.25" result="color" />
        <feComposite in="color" in2="offsetBlur" operator="in" result="shadow" />
        <feComposite in="shadow" in2="SourceAlpha" operator="in" result="clipped" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="clipped" />
        </feMerge>
      </filter>

      {/* CSS animation for pulsing destination circles */}
      <style>{`
        @keyframes pulse-dest {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes dash-march {
          to { stroke-dashoffset: -16; }
        }
        /* The Snap: a brick clicking down — drop in slightly large, squash
           on contact, spring back. Centered on the piece via fill-box. */
        @keyframes piece-place {
          0%   { transform: scale(1.14); opacity: 0.75; }
          55%  { transform: scale(0.95, 0.93); opacity: 1; }
          80%  { transform: scale(1.025, 1.02); }
          100% { transform: scale(1); }
        }
        .dest-pulse { animation: pulse-dest 1.5s ease-in-out infinite; }
        .dash-march { animation: dash-march 0.6s linear infinite; }
        .piece-place {
          transform-box: fill-box;
          transform-origin: center;
          animation: piece-place 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .piece-slide {
          transition: transform 200ms ease-out;
        }
      `}</style>

      {/* Grid pattern */}
      <pattern id="grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
        <rect width={cellSize} height={cellSize} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      </pattern>
    </defs>
  );
}
