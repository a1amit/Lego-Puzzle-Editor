import { describe, it, expect, beforeAll } from 'vitest';
import { ACYCLIC_SHADOWS_PLUGIN_SOURCE } from '../../runtime/plugin/examples/acyclicShadowsPlugin';

/**
 * Evaluates the EXACT author module source (the artifact that runs in the
 * sandbox) and exercises its pure logic. The flagship gate is that the embedded
 * Rickard length-24 loop actually satisfies isSolved — i.e. the win-check both
 * recognises a single closed loop AND certifies that all three orthogonal
 * shadows are acyclic. The trap cases (a unit square, disjoint loops, a branch)
 * prove the four projection/loop fixes are real, not decorative.
 */

interface State { n: number; edges: string[] }
interface Move { type: string; key?: string; edges?: string[] }
interface Shadow { acyclic: boolean }
interface AcyclicPlugin {
  initialState(ctx: { params?: Record<string, unknown> }): State;
  applyMove(state: State, move: Move): State;
  isSolved(state: State): { solved: boolean; progress: number; message: string };
  legalMoves(state: State): Move[];
  _rickardEdges(): string[];
  _analyze(edges: string[]): { loop: boolean; shadows: Shadow[]; acyclic: number };
  _isSingleLoop(edges: string[]): boolean;
  _latticeEdges(n: number): string[];
}

let plugin: AcyclicPlugin;

beforeAll(() => {
  const body = ACYCLIC_SHADOWS_PLUGIN_SOURCE.replace('export default ACYCLIC;', 'return ACYCLIC;');
  plugin = new Function(body)() as AcyclicPlugin;
});

// canonical unit-edge key, matching the module's ekey()
function vkey(p: number[]) { return `${p[0]},${p[1]},${p[2]}`; }
function less3(a: number[], b: number[]) {
  if (a[0] !== b[0]) return a[0] < b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return a[2] < b[2];
}
function ekey(a: number[], b: number[]) {
  return less3(a, b) ? `${vkey(a)}|${vkey(b)}` : `${vkey(b)}|${vkey(a)}`;
}
function loopEdges(verts: number[][]) {
  return verts.map((v, i) => ekey(v, verts[(i + 1) % verts.length]));
}

describe('Acyclic Shadows plugin — the embedded Rickard solution', () => {
  it('is a single closed loop of exactly 24 edges', () => {
    const sol = plugin._rickardEdges();
    expect(sol).toHaveLength(24);
    expect(new Set(sol).size).toBe(24); // no duplicate edges
    expect(plugin._isSingleLoop(sol)).toBe(true);
  });

  it('has all three orthogonal shadows acyclic (the whole point)', () => {
    const a = plugin._analyze(plugin._rickardEdges());
    expect(a.loop).toBe(true);
    expect(a.acyclic).toBe(3);
    expect(a.shadows.every((s) => s.acyclic)).toBe(true);
  });

  it('reports solved with full progress via isSolved', () => {
    const v = plugin.isSolved({ n: 3, edges: plugin._rickardEdges() });
    expect(v.solved).toBe(true);
    expect(v.progress).toBe(1);
  });

  it("initialState start:'rickard' is already solved; default start is not", () => {
    const solved = plugin.initialState({ params: { start: 'rickard' } });
    expect(plugin.isSolved(solved).solved).toBe(true);
    const empty = plugin.initialState({ params: {} });
    expect(empty.edges).toHaveLength(0);
    expect(plugin.isSolved(empty).solved).toBe(false);
  });
});

describe('Acyclic Shadows plugin — win-check rejects the traps', () => {
  it('a closed loop whose shadow is itself a cycle is NOT solved (unit square)', () => {
    // a 1×1 square in the z=0 plane: a genuine closed loop, but its XY shadow is a 4-cycle
    const square = loopEdges([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]);
    expect(plugin._isSingleLoop(square)).toBe(true);
    const a = plugin._analyze(square);
    expect(a.acyclic).toBeLessThan(3); // the XY shadow has a cycle
    expect(plugin.isSolved({ n: 3, edges: square }).solved).toBe(false);
  });

  it('two disjoint loops are not a single closed loop', () => {
    const sq1 = loopEdges([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]);
    const sq2 = loopEdges([[0, 0, 2], [1, 0, 2], [1, 1, 2], [0, 1, 2]]);
    expect(plugin._isSingleLoop([...sq1, ...sq2])).toBe(false);
  });

  it('a path with a branch point (degree 3) is not a single closed loop', () => {
    const square = loopEdges([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]);
    const spur = ekey([0, 0, 0], [0, 0, 1]); // makes vertex 0,0,0 degree 3
    expect(plugin._isSingleLoop([...square, spur])).toBe(false);
  });

  it('an open path (not closed) is not solved', () => {
    const open = [ekey([0, 0, 0], [1, 0, 0]), ekey([1, 0, 0], [1, 1, 0])];
    expect(plugin._isSingleLoop(open)).toBe(false);
    expect(plugin.isSolved({ n: 3, edges: open }).solved).toBe(false);
  });
});

describe('Acyclic Shadows plugin — moves are pure', () => {
  it('toggle adds then removes an edge without mutating the input', () => {
    const s0: State = { n: 3, edges: [] };
    const key = plugin._latticeEdges(3)[0];
    const s1 = plugin.applyMove(s0, { type: 'toggle', key });
    expect(s0.edges).toHaveLength(0); // input untouched
    expect(s1.edges).toEqual([key]);
    const s2 = plugin.applyMove(s1, { type: 'toggle', key });
    expect(s2.edges).toHaveLength(0);
  });

  it("'solution' loads the Rickard loop and 'clear' empties it", () => {
    const loaded = plugin.applyMove({ n: 3, edges: [] }, { type: 'solution' });
    expect(loaded.edges).toHaveLength(24);
    expect(plugin.isSolved(loaded).solved).toBe(true);
    const cleared = plugin.applyMove(loaded, { type: 'clear' });
    expect(cleared.edges).toHaveLength(0);
  });

  it("'set' replaces the whole edge set without aliasing the input (drives Undo)", () => {
    const some = plugin._latticeEdges(3).slice(0, 3);
    const s = plugin.applyMove({ n: 3, edges: [] }, { type: 'set', edges: some });
    expect(s.edges).toEqual(some);
    some.push('mutated'); // prove applyMove copied the array
    expect(s.edges).toHaveLength(3);
  });

  it('legalMoves enumerates every lattice edge as a toggle', () => {
    const moves = plugin.legalMoves({ n: 3, edges: [] });
    // 3 * n^2 * (n-1) unit edges for n=3 -> 54
    expect(moves).toHaveLength(54);
    expect(moves.every((m) => m.type === 'toggle' && typeof m.key === 'string')).toBe(true);
  });
});
