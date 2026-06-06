/**
 * PuzzlePlugin contract — the API an author codes a "plugin" puzzle against.
 *
 * This is the engine pivot's escape hatch (Tier 2 / "full code" rung): instead
 * of describing a puzzle declaratively (grid + validation rules), the author
 * ships an ES module that OWNS the puzzle — its state, its moves, its win
 * check, and its rendering. The host degrades to a shell: it loads the module
 * inside a sandbox, gives it a DOM node to draw into, relays input, snapshots
 * state for undo, and fires the existing completion/XP pipeline when the
 * module reports `solved`.
 *
 * The four logic functions (`initialState`, `applyMove`, `isSolved`,
 * `serialize`) MUST be pure and JSON-serializable in/out — that is what lets
 * the host snapshot state for undo, replay a move log, and (in a later tier)
 * re-run `isSolved` authoritatively in a Web Worker. `render.mount` is the one
 * impure surface and only ever runs inside the sandbox.
 *
 * S = author's state type (opaque JSON to the host).
 * M = author's move type   (opaque JSON to the host).
 */

export interface PuzzlePluginMeta {
  /** Display title (the host's gallery/title may override). */
  title: string;
  /** Short how-to-play text shown by the host chrome. */
  instructions?: string;
  /** Whether the host should offer undo/redo (host snapshots S). */
  supportsUndo?: boolean;
  /** Whether `initialState` honours `ctx.seed` for reproducible setups. */
  rngSeedable?: boolean;
}

/** Verdict returned by `isSolved`. `progress` (0..1) drives partial-credit UI. */
export interface SolveResult {
  solved: boolean;
  message?: string;
  progress?: number;
}

/** Seeded helpers injected so `initialState`/`applyMove` stay deterministic. */
export interface PluginHelpers {
  /** Deterministic PRNG in [0, 1). Use this instead of Math.random(). */
  rng(): number;
}

/** Handle the host hands to `render.mount` so the view can drive the puzzle. */
export interface PluginRenderApi<S, M> {
  /** Latest authoritative state (host-owned). */
  getState(): S;
  /** Submit a move; the host applies it via `applyMove` and re-renders. */
  emitMove(move: M): void;
  /** Render-time config from the host: the puzzle's `plugin.params` plus host
   *  injections such as `isAdmin`. Not part of game state — for gating UI. */
  params?: Record<string, unknown>;
  helpers: PluginHelpers;
}

/** What `render.mount` returns so the host can push updates / clean up. */
export interface RenderController<S> {
  /** Called after every accepted move with the new state. */
  update(state: S): void;
  /** Called when the render surface is resized. */
  resize?(width: number, height: number): void;
  /** Called when the puzzle unmounts. */
  dispose?(): void;
}

export interface PuzzlePlugin<S = unknown, M = unknown> {
  meta: PuzzlePluginMeta;

  /** Build the starting state. Pure. May use `params`, `seed`, or resume `saved`. */
  initialState(ctx: { seed: number; params?: Record<string, unknown>; saved?: S }): S;

  /** Optional: enumerate currently-legal moves (drives hint/solver UI). Pure. */
  legalMoves?(state: S): M[];

  /** Apply a move, returning a NEW state. Pure. Throw to reject an illegal move. */
  applyMove(state: S, move: M): S;

  /** Win check. Pure. */
  isSolved(state: S): SolveResult;

  /** Optional custom (de)serialization; defaults to JSON. */
  serialize?(state: S): string;
  deserialize?(serialized: string): S;

  /** Mount the view into `root`. The only impure surface; runs in the sandbox. */
  render: {
    mount(root: HTMLElement, api: PluginRenderApi<S, M>): RenderController<S>;
  };
}

// ============================================
// HOST ↔ SANDBOX MESSAGE PROTOCOL
// ============================================
//
// For the POC the module's logic runs INSIDE the sandbox iframe (same trust
// posture as today's custom_code). A later tier moves the pure functions into
// a host Web Worker for authoritative, watchdog-killable evaluation without
// changing this protocol's shape or the author contract above.

export const PLUGIN_PROTOCOL_VERSION = 1;

/** Messages the sandboxed frame posts UP to the host. */
export type PluginToHostMessage =
  | { source: 'lpe-plugin'; type: 'BOOT' }
  | { source: 'lpe-plugin'; type: 'READY'; meta: PuzzlePluginMeta; solved: boolean; progress: number; moveCount: number; message?: string }
  | { source: 'lpe-plugin'; type: 'STATE'; solved: boolean; progress: number; moveCount: number; message?: string }
  | { source: 'lpe-plugin'; type: 'ERROR'; message: string };

/** Messages the host posts DOWN to the sandboxed frame. */
export type HostToPluginMessage =
  | { source: 'lpe-host'; type: 'RESET' };

export function isPluginMessage(data: unknown): data is PluginToHostMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === 'lpe-plugin'
  );
}
