import { describe, it, expect } from 'vitest';
import { PuzzleDefinitionSchema } from '../../types/puzzle';
import { PUZZLE_CATEGORIES } from '../../config/puzzleCategories';

/**
 * BACKWARDS-COMPAT GUARD (the single most important test for the engine pivot).
 *
 * Adding the `engine`/`plugin` discriminator must NOT change how any existing
 * puzzle parses. Every registered built-in must still validate, and every
 * non-plugin puzzle must resolve to the grid tier (engine undefined or 'grid').
 */
describe('engine discriminator backwards-compat', () => {
  const allPuzzles = PUZZLE_CATEGORIES.flatMap((cat) =>
    cat.puzzles.map((p) => ({ slug: p.id, def: p.puzzle })),
  );

  it('has puzzles registered to check', () => {
    expect(allPuzzles.length).toBeGreaterThan(5);
  });

  it.each(allPuzzles.map((p) => [p.slug, p.def] as const))(
    'built-in puzzle "%s" still validates against PuzzleDefinitionSchema',
    (_slug, def) => {
      expect(() => PuzzleDefinitionSchema.parse(def)).not.toThrow();
    },
  );

  it('every non-plugin built-in resolves to the grid tier', () => {
    for (const { def } of allPuzzles) {
      const parsed = PuzzleDefinitionSchema.parse(def);
      if (parsed.engine === 'plugin') continue;
      expect(parsed.engine === undefined || parsed.engine === 'grid').toBe(true);
    }
  });

  it('the Rubik\'s cube is registered as a plugin puzzle', () => {
    const rubiks = allPuzzles.find((p) => p.slug === 'rubiks-cube');
    expect(rubiks).toBeDefined();
    const parsed = PuzzleDefinitionSchema.parse(rubiks!.def);
    expect(parsed.engine).toBe('plugin');
    expect(typeof parsed.plugin?.module).toBe('string');
    expect((parsed.plugin?.module ?? '').length).toBeGreaterThan(100);
  });
});

describe('plugin schema rules', () => {
  const grid = {
    title: 'Grid',
    description: 'd',
    board: { dimensions: { width: 2, height: 2, depth: 1 } },
    inventory: [],
    validation_rules: [],
  };

  it('a puzzle with no engine field defaults to grid behaviour (engine undefined)', () => {
    const parsed = PuzzleDefinitionSchema.parse(grid);
    expect(parsed.engine).toBeUndefined();
  });

  it("engine 'plugin' without a plugin definition is rejected", () => {
    expect(() => PuzzleDefinitionSchema.parse({ ...grid, engine: 'plugin' })).toThrow();
  });

  it("engine 'plugin' with a module parses and defaults renderKind/apiVersion", () => {
    const parsed = PuzzleDefinitionSchema.parse({
      ...grid,
      engine: 'plugin',
      plugin: { module: 'export default {}' },
    });
    expect(parsed.plugin?.renderKind).toBe('dom');
    expect(parsed.plugin?.apiVersion).toBe(1);
  });
});
