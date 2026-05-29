import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { PluginHostFrame, type PluginFrameState, type LibSpec } from './PluginHostFrame';
import type { PuzzleDefinition } from '../../types/puzzle';

/**
 * PluginRenderer — the host-side React surface for a `engine: 'plugin'` puzzle.
 *
 * It mounts the sandboxed PluginHostFrame, mirrors the existing renderer panel
 * (full-bleed view + a small status chip), and translates the frame's
 * postMessage state into the two things the shell cares about: a move count
 * and a rising-edge "solved" signal (which flips the shell's `isComplete` and
 * fires the unchanged recordCompletion / CongratulationsPopup pipeline).
 *
 * For `renderKind: 'webgl'` puzzles it lazily loads the bundled Three.js source
 * and hands it to the sandbox as a global (`THREE`) — a single source of truth,
 * served offline, no CDN. The module then renders real WebGL inside the
 * sandbox on its own GPU context (no coupling to the host's R3F).
 */
interface PluginRendererProps {
  puzzle: PuzzleDefinition;
  /** Bumped by the shell on reset / play-again. */
  resetSignal?: number;
  /** Every state update (move count, progress, solved). */
  onState?: (state: PluginFrameState) => void;
  /** Fired once on the rising edge of solved (re-armed on reset). */
  onComplete?: () => void;
  /** Module load/run error. */
  onError?: (message: string) => void;
}

export function PluginRenderer({ puzzle, resetSignal = 0, onState, onComplete, onError }: PluginRendererProps) {
  const plugin = puzzle.plugin;
  const needsThree = plugin?.renderKind === 'webgl';

  const [progress, setProgress] = useState(0);
  const [solved, setSolved] = useState(false);
  const [instructions, setInstructions] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [libs, setLibs] = useState<Record<string, LibSpec> | undefined>(undefined);
  const solvedRef = useRef(false);

  // Re-arm completion (and clear errors) whenever the puzzle resets.
  useEffect(() => {
    solvedRef.current = false;
    setSolved(false);
    setError(null);
  }, [resetSignal]);

  // Lazily fetch the Three.js source for webgl plugins (kept out of the main
  // bundle and out of non-3D plugins).
  useEffect(() => {
    let cancelled = false;
    if (!needsThree) {
      setLibs(undefined);
      return;
    }
    // Import the prebuilt Three ESM as raw text. Relative node_modules paths
    // are used deliberately: three's package `exports` field blocks these
    // subpaths, but relative file paths bypass it. three.module.js imports the
    // self-contained three.core.js; the sandbox rewrites that reference to a
    // blob URL when assembling the lib.
    Promise.all([
      import('../../../node_modules/three/build/three.module.js?raw'),
      import('../../../node_modules/three/build/three.core.js?raw'),
    ])
      .then(([mod, core]) => {
        if (cancelled) return;
        setLibs({
          THREE: {
            entry: 'three.module.js',
            files: {
              'three.module.js': mod.default,
              './three.core.js': core.default,
            },
          },
        });
      })
      .catch((e) => { if (!cancelled) setError('Failed to load 3D library: ' + String(e)); });
    return () => { cancelled = true; };
  }, [needsThree]);

  if (!plugin) {
    return (
      <div className="w-full h-full flex items-center justify-center text-destructive text-sm">
        This puzzle is missing its plugin module.
      </div>
    );
  }

  const waitingForLibs = needsThree && !libs && !error;

  const handleState = (s: PluginFrameState) => {
    setProgress(s.progress);
    setSolved(s.solved);
    onState?.(s);
    if (s.solved && !solvedRef.current) {
      solvedRef.current = true;
      onComplete?.();
    }
  };

  return (
    <div className="w-full h-full relative">
      {waitingForLibs ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <LoaderCircle className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm">Loading 3D engine…</span>
        </div>
      ) : (
        <PluginHostFrame
          source={plugin.module}
          seed={plugin.seed ?? 0}
          params={plugin.params}
          libs={libs}
          resetSignal={resetSignal}
          onReady={(meta, st) => {
            setInstructions(meta.instructions);
            handleState(st);
          }}
          onState={handleState}
          onError={(msg) => {
            setError(msg);
            onError?.(msg);
          }}
        />
      )}

      {/* Status chip */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium border backdrop-blur-sm ${
            solved
              ? 'bg-success/20 text-success border-success/40'
              : 'bg-background/70 text-muted-foreground border-border'
          }`}
        >
          {solved ? 'Solved!' : `Progress ${Math.round(progress * 100)}%`}
        </span>
      </div>

      {instructions && !solved && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center max-w-[70%]">
          <span className="inline-block px-3 py-1 rounded-md text-[11px] text-muted-foreground bg-background/60 backdrop-blur-sm border border-border">
            {instructions}
          </span>
        </div>
      )}

      {error && (
        <div className="absolute inset-x-3 bottom-3 z-20 rounded-md bg-destructive/15 border border-destructive/40 px-3 py-2 text-xs text-destructive font-mono overflow-auto max-h-32">
          {error}
        </div>
      )}
    </div>
  );
}
