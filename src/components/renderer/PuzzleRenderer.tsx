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
    <div className="w-full h-full flex items-center justify-center bg-editor-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-editor-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm font-display">Loading renderer...</span>
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
          <div className="w-full h-full flex items-center justify-center bg-editor-bg">
            <span className="text-editor-error">Unknown view mode: {viewMode}</span>
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
  const getIcon = () => {
    switch (viewMode) {
      case '3D':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3v18M3 12h18M12 3l9 9-9 9-9-9 9-9z" />
          </svg>
        );
      case '2D':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
            <line x1="3" y1="9" x2="21" y2="9" strokeWidth={2} />
            <line x1="3" y1="15" x2="21" y2="15" strokeWidth={2} />
            <line x1="9" y1="3" x2="9" y2="21" strokeWidth={2} />
            <line x1="15" y1="3" x2="15" y2="21" strokeWidth={2} />
          </svg>
        );
    }
  };

  const getLabel = () => {
    switch (viewMode) {
      case '3D': return '3D';
      case '2D': return '2D';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded bg-editor-border/30 ${className}`}>
      {getIcon()}
      <span className="text-xs text-gray-400">{getLabel()}</span>
    </div>
  );
}

