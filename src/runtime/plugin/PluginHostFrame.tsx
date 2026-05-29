import { useEffect, useRef } from 'react';
import {
  isPluginMessage,
  type PluginToHostMessage,
  type PuzzlePluginMeta,
} from './contract';

/**
 * PluginHostFrame — runs an author-supplied puzzle module inside a hardened,
 * null-origin sandbox and bridges it to React over postMessage.
 *
 * Security boundary (the part that actually matters):
 *   - The frame loads /plugin-sandbox.html (a static host-authored document)
 *     with `sandbox="allow-scripts"` and WITHOUT `allow-same-origin` ⇒ opaque
 *     origin: no host cookies, no Clerk session, no `window.parent` DOM.
 *   - That document carries its OWN strict CSP (`connect-src 'none'`), so it is
 *     served over HTTP rather than via srcdoc precisely so it does NOT inherit
 *     the app's CSP. The module cannot phone home — enforced by the browser.
 *   - The only channel is postMessage of plain JSON. The author's module
 *     source is delivered after load (INIT); nothing author-controlled is ever
 *     inlined into the page.
 *
 * Trust posture (honest): for the POC the module's own logic runs INSIDE the
 * frame and self-reports `solved` — the same trust model as today's
 * `custom_code`. A later tier moves the pure functions into a host Web Worker
 * for an authoritative, watchdog-killable win check without changing this
 * component's protocol or the author contract.
 */

const SANDBOX_URL = '/plugin-sandbox.html';

/** Cheap 32-bit string hash for the iframe remount key (re-run on code edit). */
function hashSource(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

export interface PluginFrameState {
  solved: boolean;
  progress: number;
  moveCount: number;
  message?: string;
}

/**
 * A library exposed to the sandbox as a global. `files` maps each module's
 * relative specifier to its source; the sandbox creates a blob URL per file,
 * rewrites cross-references to those URLs, then imports `entry`. Supports
 * multi-file ESM packages (e.g. three.module.js → ./three.core.js).
 */
export interface LibSpec {
  entry: string;
  files: Record<string, string>;
}

interface PluginHostFrameProps {
  /** ES module source implementing the PuzzlePlugin contract (default export). */
  source: string;
  /** Seed for reproducible initial state. */
  seed?: number;
  /** Author params handed to initialState. */
  params?: Record<string, unknown>;
  /** Libraries exposed as globals in the sandbox before the module loads,
   *  e.g. { THREE: <three module spec> } for webgl. */
  libs?: Record<string, LibSpec>;
  /** Bump to re-initialise the puzzle to its starting state (reset / play again). */
  resetSignal?: number;
  /** Fired once when the module has loaded and produced its first state. */
  onReady?: (meta: PuzzlePluginMeta, state: PluginFrameState) => void;
  /** Fired after every accepted move. */
  onState?: (state: PluginFrameState) => void;
  /** Fired if the module throws while loading or running. */
  onError?: (message: string) => void;
  className?: string;
}

export function PluginHostFrame({
  source,
  seed = 0,
  params,
  libs,
  resetSignal = 0,
  onReady,
  onState,
  onError,
  className = '',
}: PluginHostFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // Latest values, read by the (once-bound) message handler / onLoad.
  const initRef = useRef({ source, seed, params, libs });
  initRef.current = { source, seed, params, libs };
  const cbRef = useRef({ onReady, onState, onError });
  cbRef.current = { onReady, onState, onError };

  function sendInit() {
    const { source, seed, params, libs } = initRef.current;
    frameRef.current?.contentWindow?.postMessage(
      { source: 'lpe-host', type: 'INIT', module: source, seed, params, libs },
      '*',
    );
  }

  useEffect(() => {
    function handle(ev: MessageEvent) {
      if (!frameRef.current || ev.source !== frameRef.current.contentWindow) return;
      if (!isPluginMessage(ev.data)) return;
      const msg = ev.data as PluginToHostMessage;
      switch (msg.type) {
        case 'BOOT':
          sendInit();
          break;
        case 'READY':
          cbRef.current.onReady?.(msg.meta, { solved: msg.solved, progress: msg.progress, moveCount: msg.moveCount });
          break;
        case 'STATE':
          cbRef.current.onState?.({ solved: msg.solved, progress: msg.progress, moveCount: msg.moveCount, message: msg.message });
          break;
        case 'ERROR':
          cbRef.current.onError?.(msg.message);
          break;
      }
    }
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, []);

  // Deliver RESET when the signal changes (skip the initial mount).
  const firstResetRef = useRef(true);
  useEffect(() => {
    if (firstResetRef.current) {
      firstResetRef.current = false;
      return;
    }
    frameRef.current?.contentWindow?.postMessage({ source: 'lpe-host', type: 'RESET' }, '*');
  }, [resetSignal]);

  return (
    <iframe
      // Remount (re-BOOT → re-INIT) when the module/seed changes.
      key={`${seed}:${hashSource(source)}`}
      ref={frameRef}
      title="Puzzle plugin"
      src={SANDBOX_URL}
      sandbox="allow-scripts"
      onLoad={sendInit}
      className={`w-full h-full border-0 bg-transparent ${className}`}
    />
  );
}
