import { describe, it, expect, beforeAll } from 'vitest';
import { RUBIKS_CUBE_PLUGIN_SOURCE } from '../../runtime/plugin/examples/rubiksCubePlugin';

/**
 * Evaluates the EXACT author module source (the artifact that runs in the
 * sandbox) and exercises its pure logic. This proves the contract claim that
 * initialState / applyMove / isSolved are pure and correct — and the
 * sexy-move identity is a real correctness gate that only passes for a
 * genuine cube (a wrong-but-plausible permutation table would fail it).
 */

interface Move { face: string; dir: number }
interface CubePlugin {
  initialState(ctx: { seed: number }): unknown;
  applyMove(state: unknown, move: Move): unknown;
  isSolved(state: unknown): { solved: boolean; progress: number };
  legalMoves(): Move[];
  _solvedState(): unknown;
}

let plugin: CubePlugin;

beforeAll(() => {
  // Turn the ES module source into something evaluable in Node: the only
  // top-level statement is `export default CUBE;` → swap it for a return.
  const body = RUBIKS_CUBE_PLUGIN_SOURCE.replace('export default CUBE;', 'return CUBE;');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  plugin = new Function(body)() as CubePlugin;
});

const R: Move = { face: 'R', dir: 1 };
const Rp: Move = { face: 'R', dir: -1 };
const U: Move = { face: 'U', dir: 1 };
const Up: Move = { face: 'U', dir: -1 };

function seq(state: unknown, moves: Move[]): unknown {
  return moves.reduce((s, m) => plugin.applyMove(s, m), state);
}

describe("Rubik's cube plugin logic", () => {
  it('a solved cube reports solved with full progress', () => {
    const s = plugin._solvedState();
    const v = plugin.isSolved(s);
    expect(v.solved).toBe(true);
    expect(v.progress).toBe(1);
  });

  it('exposes 18 legal moves', () => {
    expect(plugin.legalMoves()).toHaveLength(18);
  });

  it('a single quarter turn is not solved', () => {
    const s = plugin.applyMove(plugin._solvedState(), R);
    expect(plugin.isSolved(s).solved).toBe(false);
  });

  it('applyMove is pure (does not mutate its input)', () => {
    const s0 = plugin._solvedState();
    const snapshot = JSON.stringify(s0);
    plugin.applyMove(s0, R);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });

  it('four identical quarter turns return to solved (R4 = identity)', () => {
    const s = seq(plugin._solvedState(), [R, R, R, R]);
    expect(plugin.isSolved(s).solved).toBe(true);
  });

  it("R' is the exact inverse of R", () => {
    const s = seq(plugin._solvedState(), [R, Rp]);
    expect(plugin.isSolved(s).solved).toBe(true);
  });

  it('the sexy move repeated 6 times is the identity ((R U R\' U\')x6)', () => {
    let s = plugin._solvedState();
    for (let i = 0; i < 6; i++) s = seq(s, [R, U, Rp, Up]);
    expect(plugin.isSolved(s).solved).toBe(true);
  });

  it('initialState produces a scrambled (unsolved) cube', () => {
    expect(plugin.isSolved(plugin.initialState({ seed: 7 })).solved).toBe(false);
  });

  it('initialState is deterministic for a given seed', () => {
    const a = JSON.stringify(plugin.initialState({ seed: 7 }));
    const b = JSON.stringify(plugin.initialState({ seed: 7 }));
    expect(a).toBe(b);
    const c = JSON.stringify(plugin.initialState({ seed: 8 }));
    expect(a).not.toBe(c);
  });
});
