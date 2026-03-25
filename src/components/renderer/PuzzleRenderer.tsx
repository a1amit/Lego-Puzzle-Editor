/**
 * PuzzleRenderer - Strategy Pattern Implementation
 *
 * This component dynamically renders the puzzle based on the viewMode
 * specified in the puzzle configuration. It consumes the headless
 * usePuzzleEngine hook and passes the state to the appropriate renderer.
 *
 * Supported View Modes:
 * - 3D: Full 3D view with Three.js
 * - 2D: 2D grid view
 */

import { Suspense, lazy } from 'react';
import { LoaderCircle, Box, Grid3x3 } from 'lucide-react';
import { Badge } from '../ui/shadcn/badge';
import type { ViewMode } from '../../types/puzzle';
import type { UsePuzzleEngineReturn } from '../../engine';

// Lazy load renderers to avoid loading Three.js for 2D puzzles
const Renderer3D = lazy(() => import('./Renderer3D').then(m => ({ default: m.Renderer3D })));
const Renderer2D = lazy(() => import('./Renderer2D').then(m => ({ default: m.Renderer2D })));

// ============================================
// LOADING FALLBACK
// ============================================

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="w-8 h-8 text-primary animate-spin" />
        <span className="text-muted-foreground text-sm">Loading renderer...</span>
      </div>
    </div>
  );
}

// ============================================
// RENDERER PROPS INTERFACE
// ============================================

export interface RendererProps {
  engine: UsePuzzleEngineReturn;
  className?: string;
}

// ============================================
// PUZZLE RENDERER
// ============================================

interface PuzzleRendererProps {
  engine: UsePuzzleEngineReturn;
  /** Override the view mode from puzzle config */
  viewModeOverride?: ViewMode;
  className?: string;
}

export function PuzzleRenderer({
  engine,
  viewModeOverride,
  className = ''
}: PuzzleRendererProps) {
  // Determine the view mode
  const viewMode: ViewMode = viewModeOverride ?? engine.config.viewMode ?? '3D';

  // Select the appropriate renderer based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case '3D':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Renderer3D engine={engine} className={className} />
          </Suspense>
        );

      case '2D':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Renderer2D engine={engine} className={className} />
          </Suspense>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-background">
            <span className="text-destructive">Unknown view mode: {viewMode}</span>
          </div>
        );
    }
  };

  return (
    <div className={`w-full h-full ${className}`}>
      {renderContent()}
    </div>
  );
}

// ============================================
// VIEW MODE INDICATOR
// ============================================

interface ViewModeIndicatorProps {
  viewMode: ViewMode;
  className?: string;
}

export function ViewModeIndicator({ viewMode, className = '' }: ViewModeIndicatorProps) {
  return (
    <Badge variant="secondary" className={`gap-1.5 ${className}`}>
      {viewMode === '3D' ? (
        <Box className="w-3.5 h-3.5" />
      ) : (
        <Grid3x3 className="w-3.5 h-3.5" />
      )}
      {viewMode}
    </Badge>
  );
}
