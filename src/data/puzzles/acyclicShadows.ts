import type { PuzzleDefinition } from '../../types/puzzle';
import { ACYCLIC_SHADOWS_PLUGIN_SOURCE } from '../../runtime/plugin/examples/acyclicShadowsPlugin';

/**
 * Acyclic Shadows — the Lenstra / Oskar's-maze problem as an `engine: 'plugin'`
 * puzzle. Lay a single closed loop of bricks on a 3×3×3 lattice whose three
 * orthogonal shadows are all trees (no cycle in any projection). Solvable —
 * "Show solution" reveals Rickard's minimal length-24 loop.
 *
 * Like the Rubik's cube, the board/inventory/validation_rules below are harmless
 * minimal stubs the plugin engine ignores; all real behaviour lives in the
 * author module referenced by `plugin.module`, run inside a sandboxed iframe.
 */
export const ACYCLIC_SHADOWS_PUZZLE: PuzzleDefinition = {
  title: 'Acyclic Shadows',
  description:
    "A closed loop in 3D whose three orthogonal shadows must each be a tree — no cycle in any projection. This is Hendrik Lenstra's 1994 question about Oskar's maze cube, built as a plugin puzzle: the editor is just the engine, running the author's own state, rendering and win check. Click lattice edges to build the loop; 'Show solution' reveals John Rickard's minimal length-24 answer.",
  engine: 'plugin',
  plugin: {
    module: ACYCLIC_SHADOWS_PLUGIN_SOURCE,
    renderKind: 'webgl',
    seed: 1,
    // n = lattice vertices per axis; start = 'empty' (solve from scratch) | 'rickard'.
    params: { n: 3, start: 'empty' },
    apiVersion: 1,
  },
  viewMode: '3D',
  board: {
    dimensions: { width: 1, height: 1, depth: 1 },
    initial_state: [],
  },
  inventory: [],
  validation_rules: [],
  metadata: {
    author: 'Engine demo',
    difficulty: 'hard',
    tags: ['plugin', 'topology', 'mechanical', 'oskar-maze'],
  },
};
