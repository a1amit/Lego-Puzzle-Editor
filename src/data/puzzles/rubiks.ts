import type { PuzzleDefinition } from '../../types/puzzle';
import { RUBIKS_CUBE_PLUGIN_SOURCE } from '../../runtime/plugin/examples/rubiksCubePlugin';

/**
 * A 3×3 Rubik's cube — the flagship `engine: 'plugin'` puzzle.
 *
 * The board/inventory/validation_rules below are harmless minimal stubs the
 * plugin engine ignores (they stay required so the grid schema's guarantees
 * are untouched). All real behaviour — state, moves, rendering, win check —
 * lives in the author module referenced by `plugin.module`, run inside a
 * sandboxed iframe.
 */
export const RUBIKS_CUBE_PUZZLE: PuzzleDefinition = {
  title: "Rubik's Cube (LEGO)",
  description:
    "A 3×3 Rubik's cube built as a plugin puzzle. The editor is just the engine: it renders the author's own code and confirms the win when the author's validation passes. Twist faces until every side is a single color.",
  engine: 'plugin',
  plugin: {
    module: RUBIKS_CUBE_PLUGIN_SOURCE,
    renderKind: 'webgl',
    seed: 7,
    // Scramble depth is author-tunable via params.scramble (default 25).
    params: { scramble: 20 },
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
    tags: ['plugin', 'rubiks', 'mechanical'],
  },
};
