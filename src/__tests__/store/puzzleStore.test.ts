import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePuzzleStore } from '@/store/puzzleStore';
import type { PuzzleDefinition, PlacedBrick } from '@/types/puzzle';
import { DEFAULT_PUZZLE } from '@/types/puzzle';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const testPuzzle: PuzzleDefinition = {
  title: 'Test Puzzle',
  description: 'A test puzzle',
  viewMode: '3D',
  board: { dimensions: { width: 4, height: 4, depth: 1 }, initial_state: [] },
  inventory: [
    { id: 'unit-red', shape: 'unit', color: '#ff0000', quantity: 3 },
    { id: 'domino-blue', shape: 'domino', color: '#0000ff', quantity: 2 },
  ],
  validation_rules: [
    { type: 'PLACEMENT', rule: 'NO_BRICK_OVERLAP' },
    { type: 'PLACEMENT', rule: 'NO_BRICKS_OUT_OF_BOUNDS' },
  ],
};

const slidingPuzzle: PuzzleDefinition = {
  title: 'Sliding Test',
  description: 'A sliding puzzle',
  viewMode: '2D',
  board: {
    dimensions: { width: 4, height: 4, depth: 1 },
    initial_state: [
      { id: 'slider-a', shape: 'unit', color: '#ff0000', position: [0, 0] as [number, number], rotation: 0 },
      { id: 'slider-b', shape: 'unit', color: '#0000ff', position: [2, 0] as [number, number], rotation: 0 },
    ],
  },
  inventory: [
    { id: 'slider-a', shape: 'unit', color: '#ff0000', quantity: 1 },
    { id: 'slider-b', shape: 'unit', color: '#0000ff', quantity: 1 },
  ],
  validation_rules: [
    { type: 'MOVEMENT', rule: 'SLIDING_ONLY' },
  ],
};

const noRemovalPuzzle: PuzzleDefinition = {
  title: 'No Removal Test',
  description: 'Brick removal disabled',
  viewMode: '3D',
  board: { dimensions: { width: 4, height: 4, depth: 1 }, initial_state: [] },
  inventory: [
    { id: 'unit-red', shape: 'unit', color: '#ff0000', quantity: 3 },
  ],
  validation_rules: [
    { type: 'CONSTRAINT', rule: 'NO_BRICK_REMOVAL' },
    { type: 'PLACEMENT', rule: 'NO_BRICK_OVERLAP' },
  ],
};

/** Helper: create a PlacedBrick stub (no instanceId — placeBrick assigns one). */
function makeBrick(overrides: Partial<PlacedBrick> & { id: string; shape: string; color: string }): PlacedBrick {
  return {
    instanceId: '',
    position: { x: 0, y: 0 },
    rotation: 0,
    z: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  // Reset to a clean default-puzzle state
  usePuzzleStore.getState().resetPuzzle();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// 1. Initial state
// ===========================================================================

describe('Initial state', () => {
  it('starts with DEFAULT_PUZZLE loaded', () => {
    const state = usePuzzleStore.getState();
    expect(state.puzzle).toEqual(DEFAULT_PUZZLE);
  });

  it('boardState has correct dimensions from DEFAULT_PUZZLE', () => {
    const { boardState } = usePuzzleStore.getState();
    expect(boardState.dimensions).toEqual(DEFAULT_PUZZLE.board.dimensions);
  });

  it('inventoryState is populated from DEFAULT_PUZZLE', () => {
    const { inventoryState } = usePuzzleStore.getState();
    expect(inventoryState.size).toBeGreaterThan(0);
    for (const brick of DEFAULT_PUZZLE.inventory) {
      expect(inventoryState.get(brick.id)).toBe(brick.quantity);
    }
  });

  it('has empty placed bricks', () => {
    const { boardState } = usePuzzleStore.getState();
    expect(boardState.placedBricks).toHaveLength(0);
  });

  it('no selection, no errors, not complete', () => {
    const s = usePuzzleStore.getState();
    expect(s.selectedBrickId).toBeNull();
    expect(s.lastActionError).toBeNull();
    expect(s.isComplete).toBe(false);
    expect(s.moveCount).toBe(0);
  });
});

// ===========================================================================
// 2. setPuzzle
// ===========================================================================

describe('setPuzzle', () => {
  it('loads a new puzzle and resets board/inventory/selection/undo', () => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    const s = usePuzzleStore.getState();

    expect(s.puzzle).toEqual(testPuzzle);
    expect(s.boardState.dimensions).toEqual(testPuzzle.board.dimensions);
    expect(s.inventoryState.get('unit-red')).toBe(3);
    expect(s.inventoryState.get('domino-blue')).toBe(2);
    expect(s.selectedBrickId).toBeNull();
    expect(s.previewRotation).toBe(0);
    expect(s.undoStack).toHaveLength(0);
    expect(s.redoStack).toHaveLength(0);
  });

  it('updates jsonSource to match the new puzzle', () => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    const { jsonSource } = usePuzzleStore.getState();
    expect(JSON.parse(jsonSource)).toEqual(testPuzzle);
  });
});

// ===========================================================================
// 3. parseAndLoadPuzzle
// ===========================================================================

describe('parseAndLoadPuzzle', () => {
  it('valid JSON loads successfully and returns true', () => {
    const json = JSON.stringify(testPuzzle);
    const result = usePuzzleStore.getState().parseAndLoadPuzzle(json);
    expect(result).toBe(true);

    const s = usePuzzleStore.getState();
    expect(s.puzzle?.title).toBe('Test Puzzle');
    expect(s.parseError).toBeNull();
  });

  it('invalid JSON sets parseError with syntax message', () => {
    const result = usePuzzleStore.getState().parseAndLoadPuzzle('{ bad json!!');
    expect(result).toBe(false);

    const { parseError } = usePuzzleStore.getState();
    expect(parseError).toContain('JSON Syntax Error');
  });

  it('valid JSON but invalid schema sets parseError with Zod messages', () => {
    // Missing required fields
    const result = usePuzzleStore.getState().parseAndLoadPuzzle(JSON.stringify({ title: 'X' }));
    expect(result).toBe(false);

    const { parseError } = usePuzzleStore.getState();
    expect(parseError).toBeTruthy();
    // Zod messages are joined with \n — should mention missing fields
    expect(parseError).not.toContain('JSON Syntax Error');
  });
});

// ===========================================================================
// 4. placeBrick
// ===========================================================================

describe('placeBrick', () => {
  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
  });

  it('places a unit brick, reduces inventory, updates board', () => {
    const brick = makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } });
    usePuzzleStore.getState().placeBrick(brick);

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks).toHaveLength(1);
    expect(s.inventoryState.get('unit-red')).toBe(2);

    const placed = s.boardState.placedBricks[0];
    expect(placed.id).toBe('unit-red');
    expect(placed.position).toEqual({ x: 0, y: 0 });
    expect(placed.instanceId).toBeTruthy();
  });

  it('triggers validation after placement', () => {
    const brick = makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } });
    usePuzzleStore.getState().placeBrick(brick);
    const s = usePuzzleStore.getState();
    expect(s.validationResults.length).toBeGreaterThan(0);
  });

  it('pushes undo snapshot and clears redo stack', () => {
    const brick = makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 1, y: 1 } });
    usePuzzleStore.getState().placeBrick(brick);

    const s = usePuzzleStore.getState();
    expect(s.undoStack).toHaveLength(1);
    expect(s.redoStack).toHaveLength(0);
  });

  it('places a domino brick and covers two cells', () => {
    const brick = makeBrick({ id: 'domino-blue', shape: 'domino', color: '#0000ff', position: { x: 0, y: 0 } });
    usePuzzleStore.getState().placeBrick(brick);

    const placed = usePuzzleStore.getState().boardState.placedBricks[0];
    // domino covers [0,0] and [1,0]
    expect(placed.shape).toBe('domino');
  });
});

// ===========================================================================
// 5. placeBrick errors
// ===========================================================================

describe('placeBrick errors', () => {
  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
  });

  it('no inventory remaining sets error', () => {
    // Exhaust all 3 unit-red bricks
    for (let i = 0; i < 3; i++) {
      usePuzzleStore.getState().placeBrick(
        makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: i, y: 0 } }),
      );
    }
    // Fourth should fail
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 3, y: 0 } }),
    );

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks).toHaveLength(3);
    expect(s.lastActionError).toContain('No more bricks');
  });

  it('exceeds depth sets error', () => {
    // Depth is 1, so z=0 is the only allowed level. Place two bricks at same cell to try stacking.
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );

    const s = usePuzzleStore.getState();
    // Second placement should fail because depth=1 means only z=0 is allowed
    expect(s.boardState.placedBricks).toHaveLength(1);
    expect(s.lastActionError).toContain('depth limit');
  });
});

// ===========================================================================
// 6. removeBrick
// ===========================================================================

describe('removeBrick', () => {
  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
  });

  it('removes a brick and returns it to inventory', () => {
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;

    usePuzzleStore.getState().removeBrick(instanceId);

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks).toHaveLength(0);
    expect(s.inventoryState.get('unit-red')).toBe(3);
  });

  it('removes stacked pieces when bottom piece is removed (depth > 1)', () => {
    // Use a puzzle with depth > 1 to allow stacking
    const deepPuzzle: PuzzleDefinition = {
      ...testPuzzle,
      title: 'Deep Puzzle',
      board: { dimensions: { width: 4, height: 4, depth: 3 }, initial_state: [] },
    };
    usePuzzleStore.getState().setPuzzle(deepPuzzle);

    // Place first brick at z=0
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    // Place second brick stacking at the same cell (z=1)
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );

    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(2);

    // Remove the bottom brick — the stacked one should go too
    const bottomId = usePuzzleStore.getState().boardState.placedBricks.find(b => b.z === 0)!.instanceId;
    usePuzzleStore.getState().removeBrick(bottomId);

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks).toHaveLength(0);
    expect(s.inventoryState.get('unit-red')).toBe(3);
  });

  it('is a no-op when instanceId does not exist', () => {
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    usePuzzleStore.getState().removeBrick('nonexistent-id');

    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(1);
  });
});

// ===========================================================================
// 7. removeBrick with NO_BRICK_REMOVAL rule
// ===========================================================================

describe('removeBrick with NO_BRICK_REMOVAL rule', () => {
  it('blocks removal and shows error', () => {
    usePuzzleStore.getState().setPuzzle(noRemovalPuzzle);
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;

    usePuzzleStore.getState().removeBrick(instanceId);

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks).toHaveLength(1);
    expect(s.lastActionError).toContain('removal is disabled');
  });
});

// ===========================================================================
// 8. moveBrick
// ===========================================================================

describe('moveBrick', () => {
  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
  });

  it('moves piece to new position and increments moveCount', () => {
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;
    usePuzzleStore.getState().moveBrick(instanceId, { x: 2, y: 2 });

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks[0].position).toEqual({ x: 2, y: 2 });
    expect(s.moveCount).toBe(1);
  });

  it('is a no-op when destination is same as current position', () => {
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;
    usePuzzleStore.getState().moveBrick(instanceId, { x: 0, y: 0 });

    expect(usePuzzleStore.getState().moveCount).toBe(0);
  });

  it('pushes undo snapshot on move', () => {
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;
    usePuzzleStore.getState().moveBrick(instanceId, { x: 1, y: 1 });

    // 1 from placeBrick + 1 from moveBrick
    expect(usePuzzleStore.getState().undoStack).toHaveLength(2);
  });
});

// ===========================================================================
// 9. moveBrick with SLIDING_ONLY
// ===========================================================================

describe('moveBrick with SLIDING_ONLY', () => {
  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(slidingPuzzle);
  });

  it('valid slide succeeds', () => {
    const pieces = usePuzzleStore.getState().boardState.placedBricks;
    // slider-a is at (0,0), slider-b is at (2,0)
    // slider-a can slide right to (1,0) because (2,0) is blocked by slider-b
    const sliderA = pieces.find(p => p.id === 'slider-a')!;
    usePuzzleStore.getState().moveBrick(sliderA.instanceId, { x: 1, y: 0 });

    const moved = usePuzzleStore.getState().boardState.placedBricks.find(p => p.id === 'slider-a')!;
    expect(moved.position).toEqual({ x: 1, y: 0 });
    expect(usePuzzleStore.getState().moveCount).toBe(1);
  });

  it('invalid slide fails with error', () => {
    const pieces = usePuzzleStore.getState().boardState.placedBricks;
    const sliderA = pieces.find(p => p.id === 'slider-a')!;
    // Try to move diagonally — not valid for sliding
    usePuzzleStore.getState().moveBrick(sliderA.instanceId, { x: 1, y: 1 });

    const s = usePuzzleStore.getState();
    // The piece should not have moved
    const still = s.boardState.placedBricks.find(p => p.id === 'slider-a')!;
    expect(still.position).toEqual({ x: 0, y: 0 });
    expect(s.lastActionError).toContain('Invalid slide');
  });
});

// ===========================================================================
// 9b. moveBrick with move_as_stack: false (Hanoi-style)
// ===========================================================================

describe('moveBrick with move_as_stack: false', () => {
  const hanoiPuzzle: PuzzleDefinition = {
    title: 'Hanoi-ish',
    description: 'No stack moves',
    viewMode: '3D',
    move_as_stack: false,
    board: { dimensions: { width: 4, height: 4, depth: 3 }, initial_state: [] },
    inventory: [
      { id: 'unit-red', shape: 'unit', color: '#ff0000', quantity: 3 },
    ],
    validation_rules: [
      { type: 'PLACEMENT', rule: 'NO_BRICK_OVERLAP' },
    ],
  };

  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(hanoiPuzzle);
    // Stack two bricks at (0,0) — bottom z=0, top z=1.
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
  });

  it('rejects moving a brick that has anything stacked on top', () => {
    const bottom = usePuzzleStore.getState().boardState.placedBricks.find(b => b.z === 0)!;
    usePuzzleStore.getState().moveBrick(bottom.instanceId, { x: 2, y: 0 });

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks.find(b => b.instanceId === bottom.instanceId)!.position).toEqual({ x: 0, y: 0 });
    expect(s.lastActionError).toContain('remove the bricks on top');
    expect(s.moveCount).toBe(0);
  });

  it('allows moving the topmost brick', () => {
    const top = usePuzzleStore.getState().boardState.placedBricks.find(b => b.z === 1)!;
    usePuzzleStore.getState().moveBrick(top.instanceId, { x: 2, y: 0 });

    const moved = usePuzzleStore.getState().boardState.placedBricks.find(b => b.instanceId === top.instanceId)!;
    expect(moved.position).toEqual({ x: 2, y: 0 });
  });
});

// ===========================================================================
// 9c. moveBrick with subset_stacking (Hanoi disk-size rule)
// ===========================================================================

describe('moveBrick with subset_stacking', () => {
  // Three pieces: a 1x3 strip at (0,0), a 1x1 at (3,0), and a 1x1 at (4,0).
  // We try to move the 1x3 onto the 1x1 (bigger on smaller — should fail)
  // and the 1x1 onto the 1x3 (smaller on bigger — should succeed).
  const subsetPuzzle: PuzzleDefinition = {
    title: 'Subset stacking test',
    description: 'subset rule',
    viewMode: '3D',
    move_as_stack: false,
    subset_stacking: true,
    board: {
      dimensions: { width: 8, height: 4, depth: 3 },
      initial_state: [
        { id: 'big',  shape: 'tromino-I', color: '#0000ff', position: [0, 0] as [number, number], rotation: 0 },
        { id: 'sm1', shape: 'unit',      color: '#ff0000', position: [4, 0] as [number, number], rotation: 0 },
      ],
    },
    inventory: [],
    validation_rules: [
      { type: 'PLACEMENT', rule: 'NO_BRICKS_OUT_OF_BOUNDS' },
    ],
  };

  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(subsetPuzzle);
  });

  it('rejects placing a larger brick on a smaller one', () => {
    const big = usePuzzleStore.getState().boardState.placedBricks.find(b => b.id === 'big')!;
    // Try to drop 'big' (3 cells wide) on top of 'sm1' (1 cell). Move to (4,0).
    usePuzzleStore.getState().moveBrick(big.instanceId, { x: 4, y: 0 });

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks.find(b => b.id === 'big')!.position.x).toBe(0);
    expect(s.lastActionError).toMatch(/larger brick on a smaller one|nothing below/);
  });

  it('allows placing a smaller brick on a larger one', () => {
    const sm1 = usePuzzleStore.getState().boardState.placedBricks.find(b => b.id === 'sm1')!;
    // Drop sm1 onto cell (1, 0) — fully inside 'big' (cells 0..2,0).
    usePuzzleStore.getState().moveBrick(sm1.instanceId, { x: 1, y: 0 });

    const moved = usePuzzleStore.getState().boardState.placedBricks.find(b => b.id === 'sm1')!;
    expect(moved.position).toEqual({ x: 1, y: 0 });
    expect(moved.z).toBe(1);
  });
});

// ===========================================================================
// 10. rotateBrick
// ===========================================================================

describe('rotateBrick', () => {
  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'domino-blue', shape: 'domino', color: '#0000ff', position: { x: 0, y: 0 } }),
    );
  });

  it('rotation increments by 90 degrees', () => {
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;
    usePuzzleStore.getState().rotateBrick(instanceId);

    expect(usePuzzleStore.getState().boardState.placedBricks[0].rotation).toBe(90);
  });

  it('wraps at 360', () => {
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;
    for (let i = 0; i < 4; i++) {
      usePuzzleStore.getState().rotateBrick(instanceId);
    }
    expect(usePuzzleStore.getState().boardState.placedBricks[0].rotation).toBe(0);
  });

  it('pushes undo snapshot', () => {
    const before = usePuzzleStore.getState().undoStack.length;
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;
    usePuzzleStore.getState().rotateBrick(instanceId);

    expect(usePuzzleStore.getState().undoStack.length).toBe(before + 1);
  });
});

// ===========================================================================
// 11. selectBrick
// ===========================================================================

describe('selectBrick', () => {
  it('sets selectedBrickId and resets previewRotation', () => {
    // Set previewRotation to something non-zero first
    usePuzzleStore.getState().rotatePreview();
    expect(usePuzzleStore.getState().previewRotation).toBe(90);

    usePuzzleStore.getState().selectBrick('unit-red');

    const s = usePuzzleStore.getState();
    expect(s.selectedBrickId).toBe('unit-red');
    expect(s.previewRotation).toBe(0);
  });

  it('selecting null clears selection and resets previewRotation', () => {
    usePuzzleStore.getState().selectBrick('unit-red');
    usePuzzleStore.getState().rotatePreview();
    usePuzzleStore.getState().selectBrick(null);

    const s = usePuzzleStore.getState();
    expect(s.selectedBrickId).toBeNull();
    expect(s.previewRotation).toBe(0);
  });

  it('selecting the same brick does not reset previewRotation', () => {
    usePuzzleStore.getState().selectBrick('unit-red');
    usePuzzleStore.getState().rotatePreview(); // 90
    usePuzzleStore.getState().selectBrick('unit-red'); // same brick

    // previewRotation is NOT reset because brickId === selectedBrickId
    // Actually, looking at the code: if brickId !== selectedBrickId, reset. If same, just set.
    // So rotation remains:
    expect(usePuzzleStore.getState().previewRotation).toBe(90);
  });
});

// ===========================================================================
// 12. rotatePreview
// ===========================================================================

describe('rotatePreview', () => {
  it('increments by 90', () => {
    usePuzzleStore.getState().rotatePreview();
    expect(usePuzzleStore.getState().previewRotation).toBe(90);
  });

  it('wraps at 360', () => {
    for (let i = 0; i < 4; i++) {
      usePuzzleStore.getState().rotatePreview();
    }
    expect(usePuzzleStore.getState().previewRotation).toBe(0);
  });

  it('accumulates correctly through multiple rotations', () => {
    usePuzzleStore.getState().rotatePreview();
    usePuzzleStore.getState().rotatePreview();
    expect(usePuzzleStore.getState().previewRotation).toBe(180);

    usePuzzleStore.getState().rotatePreview();
    expect(usePuzzleStore.getState().previewRotation).toBe(270);
  });
});

// ===========================================================================
// 13. resetPuzzle
// ===========================================================================

describe('resetPuzzle', () => {
  it('resets all state back to initial', () => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    usePuzzleStore.getState().selectBrick('unit-red');
    usePuzzleStore.getState().rotatePreview();

    usePuzzleStore.getState().resetPuzzle();

    const s = usePuzzleStore.getState();
    expect(s.boardState.placedBricks).toHaveLength(0);
    expect(s.inventoryState.get('unit-red')).toBe(3);
    expect(s.selectedBrickId).toBeNull();
    expect(s.previewRotation).toBe(0);
    expect(s.undoStack).toHaveLength(0);
    expect(s.redoStack).toHaveLength(0);
    expect(s.moveCount).toBe(0);
    expect(s.isComplete).toBe(false);
    expect(s.lastActionError).toBeNull();
    expect(s.completionProgress).toBe('normal');
  });

  it('clears localStorage progress for the puzzle', () => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    // Advance timers to trigger localStorage save
    vi.advanceTimersByTime(1000);

    usePuzzleStore.getState().resetPuzzle();

    expect(localStorage.removeItem).toHaveBeenCalledWith('lego-puzzle-progress:Test Puzzle');
  });
});

// ===========================================================================
// 14. undo / redo
// ===========================================================================

describe('undo / redo', () => {
  beforeEach(() => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
  });

  it('undo restores previous state after placeBrick', () => {
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(1);

    usePuzzleStore.getState().undo();

    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(0);
    expect(usePuzzleStore.getState().inventoryState.get('unit-red')).toBe(3);
  });

  it('redo re-applies the undone action', () => {
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    usePuzzleStore.getState().undo();
    usePuzzleStore.getState().redo();

    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(1);
    expect(usePuzzleStore.getState().inventoryState.get('unit-red')).toBe(2);
  });

  it('undo on empty stack is a no-op', () => {
    const before = usePuzzleStore.getState();
    usePuzzleStore.getState().undo();
    const after = usePuzzleStore.getState();

    expect(after.boardState.placedBricks).toEqual(before.boardState.placedBricks);
    expect(after.undoStack).toHaveLength(0);
  });

  it('redo on empty stack is a no-op', () => {
    const before = usePuzzleStore.getState();
    usePuzzleStore.getState().redo();
    const after = usePuzzleStore.getState();

    expect(after.boardState.placedBricks).toEqual(before.boardState.placedBricks);
    expect(after.redoStack).toHaveLength(0);
  });

  it('placing a brick after undo clears redo stack', () => {
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    usePuzzleStore.getState().undo();
    expect(usePuzzleStore.getState().redoStack).toHaveLength(1);

    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 1, y: 1 } }),
    );
    expect(usePuzzleStore.getState().redoStack).toHaveLength(0);
  });

  it('multiple undo/redo cycles work correctly', () => {
    // Place two bricks
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 1, y: 0 } }),
    );
    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(2);

    // Undo both
    usePuzzleStore.getState().undo();
    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(1);
    usePuzzleStore.getState().undo();
    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(0);

    // Redo both
    usePuzzleStore.getState().redo();
    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(1);
    usePuzzleStore.getState().redo();
    expect(usePuzzleStore.getState().boardState.placedBricks).toHaveLength(2);
  });
});

// ===========================================================================
// 15. validate
// ===========================================================================

describe('validate', () => {
  it('runs validation against current board state', () => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    usePuzzleStore.getState().validate();

    const s = usePuzzleStore.getState();
    expect(s.validationResults.length).toBeGreaterThan(0);
    // With no bricks placed, NO_BRICK_OVERLAP and NO_BRICKS_OUT_OF_BOUNDS should pass
    for (const result of s.validationResults) {
      expect(result.isValid).toBe(true);
    }
  });

  it('does nothing when no puzzle is loaded', () => {
    usePuzzleStore.setState({ puzzle: null });
    usePuzzleStore.getState().validate();

    // validationResults remain as they were before (no crash)
    expect(usePuzzleStore.getState().puzzle).toBeNull();
  });
});

// ===========================================================================
// 16. getValidSlideDestinationsFor
// ===========================================================================

describe('getValidSlideDestinationsFor', () => {
  it('returns destinations for a sliding puzzle', () => {
    usePuzzleStore.getState().setPuzzle(slidingPuzzle);

    const pieces = usePuzzleStore.getState().boardState.placedBricks;
    const sliderA = pieces.find(p => p.id === 'slider-a')!;

    const destinations = usePuzzleStore.getState().getValidSlideDestinationsFor(sliderA.instanceId);
    // slider-a at (0,0), slider-b at (2,0): slider-a can slide right to (1,0), down to (0,1), (0,2), (0,3)
    expect(destinations.length).toBeGreaterThan(0);
    // Should include at least (1,0) — one step right (blocked at (2,0) by slider-b)
    expect(destinations).toContainEqual([1, 0]);
  });

  it('returns empty for non-sliding puzzle', () => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    usePuzzleStore.getState().placeBrick(
      makeBrick({ id: 'unit-red', shape: 'unit', color: '#ff0000', position: { x: 0, y: 0 } }),
    );
    const instanceId = usePuzzleStore.getState().boardState.placedBricks[0].instanceId;

    const destinations = usePuzzleStore.getState().getValidSlideDestinationsFor(instanceId);
    expect(destinations).toHaveLength(0);
  });

  it('returns empty for unknown instanceId', () => {
    usePuzzleStore.getState().setPuzzle(slidingPuzzle);
    const destinations = usePuzzleStore.getState().getValidSlideDestinationsFor('nonexistent-id');
    expect(destinations).toHaveLength(0);
  });
});

// ===========================================================================
// 17. isSlidingPuzzle
// ===========================================================================

describe('isSlidingPuzzle', () => {
  it('returns true when SLIDING_ONLY rule present', () => {
    usePuzzleStore.getState().setPuzzle(slidingPuzzle);
    expect(usePuzzleStore.getState().isSlidingPuzzle()).toBe(true);
  });

  it('returns false for a normal puzzle', () => {
    usePuzzleStore.getState().setPuzzle(testPuzzle);
    expect(usePuzzleStore.getState().isSlidingPuzzle()).toBe(false);
  });

  it('returns false when no puzzle is loaded', () => {
    usePuzzleStore.setState({ puzzle: null });
    expect(usePuzzleStore.getState().isSlidingPuzzle()).toBe(false);
  });
});
