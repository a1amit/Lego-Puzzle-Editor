import { create } from 'zustand';
import {
  PuzzleDefinition,
  PlacedBrick,
  BoardState,
  ValidationResult,
  DEFAULT_PUZZLE,
  PuzzleDefinitionSchema,
  SHAPE_LIBRARY
} from '../types/puzzle';
import { ValidationRegistry, getBrickCells, rotateShape } from '../validation/ValidationRegistry';
import { getValidSlideDestinations, generateInstanceId } from '../engine/utils';
import type { EngineBoard, PlacedPiece } from '../engine/types';
import { createInitialBoard, createInitialInventory } from '../engine/boardFactory';
import { enrichValidationRules, hasSlidingOnlyRule, hasNoBrickRemovalRule } from '../engine/validationHelpers';
import { SoundManager } from '../services/SoundManager';
import { haptics } from '../services/haptics';

// ============================================
// UNDO / REDO SNAPSHOT
// ============================================

interface BoardSnapshot {
  boardState: BoardState;
  inventoryState: Map<string, number>;
  moveCount: number;
}

const MAX_UNDO_HISTORY = 50;

interface PuzzleStore {
  // Puzzle Definition
  puzzle: PuzzleDefinition | null;
  jsonSource: string;
  parseError: string | null;

  // Board State
  boardState: BoardState;

  // Inventory
  inventoryState: Map<string, number>;

  // Validation
  validationResults: ValidationResult[];
  isComplete: boolean;
  moveCount: number;

  // Selection & Interaction
  selectedBrickId: string | null;
  previewRotation: number;
  hoveredCell: { x: number; y: number } | null;
  draggedBrick: PlacedBrick | null;

  // Action feedback
  lastActionError: string | null;
  shakeBoard: boolean;
  completionProgress: 'normal' | 'building' | 'almost';

  // Undo / Redo
  undoStack: BoardSnapshot[];
  redoStack: BoardSnapshot[];

  // Actions
  setPuzzle: (puzzle: PuzzleDefinition) => void;
  setJsonSource: (json: string) => void;
  parseAndLoadPuzzle: (json: string) => boolean;

  placeBrick: (brick: PlacedBrick) => void;
  removeBrick: (instanceId: string) => void;
  moveBrick: (instanceId: string, newPosition: { x: number; y: number }) => void;
  rotateBrick: (instanceId: string) => void;

  selectBrick: (brickId: string | null) => void;
  rotatePreview: () => void;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  setDraggedBrick: (brick: PlacedBrick | null) => void;

  resetPuzzle: () => void;
  validate: () => void;

  undo: () => void;
  redo: () => void;

  // Sliding helpers
  getValidSlideDestinationsFor: (instanceId: string) => [number, number][];
  isSlidingPuzzle: () => boolean;
}

// ============================================
// TYPE ADAPTERS (Store <-> Engine)
// ============================================

function toEnginePiece(brick: PlacedBrick): PlacedPiece {
  return {
    id: brick.id,
    instanceId: brick.instanceId,
    shape: brick.shape,
    color: brick.color,
    position: { x: brick.position.x, y: brick.position.y, z: brick.z || 0 },
    rotation: brick.rotation,
  };
}

function toEngineBoard(boardState: BoardState): EngineBoard {
  return {
    dimensions: boardState.dimensions,
    placedPieces: boardState.placedBricks.map(toEnginePiece),
    blockedCells: boardState.blockedCells,
  };
}

// ============================================
// HELPERS
// ============================================

function calculateZLevel(boardState: BoardState, cells: [number, number][]): number {
  let maxZ = -1;
  for (const brick of boardState.placedBricks) {
    const brickCells = getBrickCells(brick);
    const brickCellSet = new Set(brickCells.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of cells) {
      if (brickCellSet.has(`${x},${y}`)) {
        maxZ = Math.max(maxZ, brick.z || 0);
      }
    }
  }
  return maxZ + 1;
}

function findBricksStackedOnTop(
  boardState: BoardState,
  targetBrick: PlacedBrick,
  excludeInstanceIds: Set<string> = new Set()
): Set<string> {
  const stackedBrickIds = new Set<string>();
  const targetCells = getBrickCells(targetBrick);
  const targetCellSet = new Set(targetCells.map(([x, y]) => `${x},${y}`));
  const targetZ = targetBrick.z || 0;

  for (const brick of boardState.placedBricks) {
    if (excludeInstanceIds.has(brick.instanceId) || brick.instanceId === targetBrick.instanceId) continue;
    const brickZ = brick.z || 0;
    if (brickZ <= targetZ) continue;

    const brickCells = getBrickCells(brick);
    if (brickCells.some(([x, y]) => targetCellSet.has(`${x},${y}`))) {
      stackedBrickIds.add(brick.instanceId);
      const nestedStacked = findBricksStackedOnTop(
        boardState,
        brick,
        new Set([...excludeInstanceIds, ...stackedBrickIds])
      );
      nestedStacked.forEach(id => stackedBrickIds.add(id));
    }
  }
  return stackedBrickIds;
}

/**
 * Convert engine board (from boardFactory) to store's BoardState format
 */
function engineBoardToBoardState(engine: EngineBoard): BoardState {
  return {
    dimensions: engine.dimensions,
    placedBricks: engine.placedPieces.map(p => ({
      id: p.id,
      instanceId: p.instanceId,
      shape: p.shape,
      color: p.color,
      position: { x: p.position.x, y: p.position.y },
      rotation: p.rotation,
      z: p.position.z,
    })),
    blockedCells: engine.blockedCells,
  };
}

function setActionError(set: (partial: Partial<PuzzleStore>) => void, message: string) {
  set({ lastActionError: message, shakeBoard: true });
  SoundManager.getInstance().play('invalid');
  haptics.error();
  setTimeout(() => set({ shakeBoard: false }), 400);
  setTimeout(() => set({ lastActionError: null }), 3000);
}

/**
 * Run validation and return partial state to merge into a single set() call.
 * This avoids the double set() overhead of calling validate() separately.
 */
function computeValidation(
  puzzle: PuzzleDefinition | null,
  boardState: BoardState,
  moveCount: number,
): { validationResults: ValidationResult[]; isComplete: boolean; completionProgress: 'normal' | 'building' | 'almost' } {
  if (!puzzle) return { validationResults: [], isComplete: false, completionProgress: 'normal' };
  const rulesWithParams = enrichValidationRules(puzzle, moveCount);
  const results = ValidationRegistry.validate(boardState, rulesWithParams);
  const isComplete = ValidationRegistry.isAllValid(results);

  const passCount = results.filter(r => r.isValid).length;
  const total = results.length;
  const ratio = total > 0 ? passCount / total : 0;
  let completionProgress: 'normal' | 'building' | 'almost' = 'normal';
  if (ratio >= 0.9) completionProgress = 'almost';
  else if (ratio >= 0.75) completionProgress = 'building';

  return { validationResults: results, isComplete, completionProgress };
}

// ============================================
// localStorage persistence helpers
// ============================================

const STORAGE_PREFIX = 'lego-puzzle-progress:';

function savePuzzleProgress(puzzleTitle: string, boardState: BoardState, inventoryState: Map<string, number>, moveCount: number) {
  try {
    const data = {
      placedBricks: boardState.placedBricks,
      inventory: Array.from(inventoryState.entries()),
      moveCount,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_PREFIX + puzzleTitle, JSON.stringify(data));
  } catch { /* quota exceeded or unavailable */ }
}

function loadPuzzleProgress(puzzleTitle: string): { placedBricks: BoardState['placedBricks']; inventory: [string, number][]; moveCount: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + puzzleTitle);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearPuzzleProgress(puzzleTitle: string) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + puzzleTitle);
  } catch { /* ignore */ }
}

// ============================================
// INITIAL STATE (uses shared boardFactory)
// ============================================

const defaultJson = JSON.stringify(DEFAULT_PUZZLE, null, 2);

const initialBoard = engineBoardToBoardState(createInitialBoard(DEFAULT_PUZZLE));
const initialInventory = createInitialInventory(DEFAULT_PUZZLE);

// ============================================
// STORE
// ============================================

export const usePuzzleStore = create<PuzzleStore>((set, get) => ({
  puzzle: DEFAULT_PUZZLE,
  jsonSource: defaultJson,
  parseError: null,

  boardState: initialBoard,
  inventoryState: initialInventory,

  validationResults: [],
  isComplete: false,
  moveCount: 0,

  selectedBrickId: null,
  previewRotation: 0,
  hoveredCell: null,
  draggedBrick: null,

  lastActionError: null,
  shakeBoard: false,
  completionProgress: 'normal',

  undoStack: [],
  redoStack: [],

  // ------------------------------------------
  // PUZZLE LOADING
  // ------------------------------------------

  setPuzzle: (puzzle) => {
    const freshBoard = engineBoardToBoardState(createInitialBoard(puzzle));
    const freshInventory = createInitialInventory(puzzle);
    let boardState = freshBoard;
    let inventoryState = freshInventory;
    let moveCount = 0;

    // Silently restore saved progress if available
    if (puzzle.title) {
      const saved = loadPuzzleProgress(puzzle.title);
      if (saved && saved.placedBricks.length > 0) {
        boardState = { ...freshBoard, placedBricks: saved.placedBricks };
        inventoryState = new Map(saved.inventory);
        moveCount = saved.moveCount ?? 0;
      }
    }

    set({
      puzzle,
      jsonSource: JSON.stringify(puzzle, null, 2),
      boardState,
      inventoryState,
      moveCount,
      selectedBrickId: null,
      previewRotation: 0,
      undoStack: [],
      redoStack: [],
      lastActionError: null,
      shakeBoard: false,
      ...computeValidation(puzzle, boardState, moveCount),
    });
  },

  setJsonSource: (json) => {
    set({ jsonSource: json });
  },

  parseAndLoadPuzzle: (json) => {
    try {
      const parsed = JSON.parse(json);
      const validated = PuzzleDefinitionSchema.parse(parsed);

      set({
        puzzle: validated,
        jsonSource: json,
        parseError: null,
        boardState: engineBoardToBoardState(createInitialBoard(validated)),
        inventoryState: createInitialInventory(validated),
        validationResults: [],
        isComplete: false,
        previewRotation: 0,
        undoStack: [],
        redoStack: [],
        lastActionError: null,
        shakeBoard: false,
        completionProgress: 'normal',
      });

      return true;
    } catch (error) {
      let errorMessage = 'Invalid JSON';
      if (error instanceof SyntaxError) {
        errorMessage = `JSON Syntax Error: ${error.message}`;
      } else if (error instanceof Error && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        errorMessage = zodError.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('\n');
      }
      set({ parseError: errorMessage });
      return false;
    }
  },

  // ------------------------------------------
  // BOARD MANIPULATION
  // ------------------------------------------

  placeBrick: (brick) => {
    const { boardState, inventoryState, undoStack } = get();

    const remaining = inventoryState.get(brick.id) ?? 0;
    if (remaining <= 0) {
      setActionError(set, 'No more bricks of this type available');
      return;
    }

    const shape = SHAPE_LIBRARY[brick.shape];
    if (!shape) return;

    const rotatedCells = rotateShape(shape.cells, brick.rotation || 0);
    const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
      brick.position.x + dx,
      brick.position.y + dy,
    ]);

    const zLevel = calculateZLevel(boardState, cells);
    const maxAllowedZ = boardState.dimensions.depth - 1;
    if (zLevel > maxAllowedZ) {
      setActionError(set, 'Cannot stack higher — depth limit reached');
      return;
    }

    // Save snapshot for undo
    const snapshot: BoardSnapshot = {
      boardState: { ...boardState, placedBricks: [...boardState.placedBricks] },
      inventoryState: new Map(inventoryState),
      moveCount: get().moveCount,
    };

    const instanceId = generateInstanceId(brick.id);
    const placedBrick: PlacedBrick = { ...brick, instanceId, z: zLevel };

    const newInventory = new Map(inventoryState);
    newInventory.set(brick.id, remaining - 1);

    const newBoardState = {
      ...boardState,
      placedBricks: [...boardState.placedBricks, placedBrick],
    };

    set({
      boardState: newBoardState,
      inventoryState: newInventory,
      previewRotation: 0,
      undoStack: [...undoStack.slice(-(MAX_UNDO_HISTORY - 1)), snapshot],
      redoStack: [],
      ...computeValidation(get().puzzle, newBoardState, get().moveCount),
    });
    SoundManager.getInstance().play('snap');
    haptics.medium();
  },

  removeBrick: (instanceId) => {
    const { boardState, inventoryState, puzzle, undoStack } = get();

    if (hasNoBrickRemovalRule(puzzle)) {
      setActionError(set, 'Brick removal is disabled for this puzzle');
      return;
    }

    const brick = boardState.placedBricks.find(b => b.instanceId === instanceId);
    if (!brick) return;

    // Save snapshot for undo
    const snapshot: BoardSnapshot = {
      boardState: { ...boardState, placedBricks: [...boardState.placedBricks] },
      inventoryState: new Map(inventoryState),
      moveCount: get().moveCount,
    };

    const stackedBrickIds = findBricksStackedOnTop(boardState, brick);
    const bricksToRemove = boardState.placedBricks.filter(
      b => b.instanceId === instanceId || stackedBrickIds.has(b.instanceId)
    );

    const newInventory = new Map(inventoryState);
    for (const brickToRemove of bricksToRemove) {
      const current = newInventory.get(brickToRemove.id) ?? 0;
      newInventory.set(brickToRemove.id, current + 1);
    }

    const instanceIdsToRemove = new Set([instanceId, ...stackedBrickIds]);
    const newBoardState = {
      ...boardState,
      placedBricks: boardState.placedBricks.filter(b => !instanceIdsToRemove.has(b.instanceId)),
    };

    set({
      boardState: newBoardState,
      inventoryState: newInventory,
      undoStack: [...undoStack.slice(-(MAX_UNDO_HISTORY - 1)), snapshot],
      redoStack: [],
      ...computeValidation(get().puzzle, newBoardState, get().moveCount),
    });
    SoundManager.getInstance().play('undo');
    haptics.light();
  },

  moveBrick: (instanceId, newPosition) => {
    const { boardState, inventoryState, puzzle, undoStack } = get();

    const brick = boardState.placedBricks.find(b => b.instanceId === instanceId);
    if (!brick) return;

    if (brick.position.x === newPosition.x && brick.position.y === newPosition.y) return;

    if (hasSlidingOnlyRule(puzzle)) {
      const engineBoard = toEngineBoard(boardState);
      const enginePiece = toEnginePiece(brick);
      const validDestinations = getValidSlideDestinations(engineBoard, enginePiece);
      const isValidSlide = validDestinations.some(
        ([x, y]) => x === newPosition.x && y === newPosition.y
      );
      if (!isValidSlide) {
        setActionError(set, 'Invalid slide — not a valid destination');
        return;
      }
    }

    // Save snapshot for undo
    const snapshot: BoardSnapshot = {
      boardState: { ...boardState, placedBricks: [...boardState.placedBricks] },
      inventoryState: new Map(inventoryState),
      moveCount: get().moveCount,
    };

    const stackedBrickIds = findBricksStackedOnTop(boardState, brick);
    const newInventory = new Map(inventoryState);
    const bricksToRemove = boardState.placedBricks.filter(
      b => stackedBrickIds.has(b.instanceId)
    );
    for (const brickToRemove of bricksToRemove) {
      const current = newInventory.get(brickToRemove.id) ?? 0;
      newInventory.set(brickToRemove.id, current + 1);
    }

    const bricksWithoutStacked = boardState.placedBricks.filter(
      b => !stackedBrickIds.has(b.instanceId)
    );

    const shape = SHAPE_LIBRARY[brick.shape];
    if (!shape) return;

    const rotatedCells = rotateShape(shape.cells, brick.rotation || 0);
    const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
      newPosition.x + dx,
      newPosition.y + dy,
    ]);

    const otherBricks = bricksWithoutStacked.filter(b => b.instanceId !== instanceId);
    const tempBoardState: BoardState = { ...boardState, placedBricks: otherBricks };
    const zLevel = calculateZLevel(tempBoardState, cells);

    const maxAllowedZ = boardState.dimensions.depth - 1;
    if (zLevel > maxAllowedZ) {
      setActionError(set, 'Cannot move — depth limit would be exceeded');
      return;
    }

    const newBoardState = {
      ...boardState,
      placedBricks: bricksWithoutStacked.map(b =>
        b.instanceId === instanceId
          ? { ...b, position: newPosition, z: zLevel }
          : b
      ),
    };
    const newMoveCount = get().moveCount + 1;

    set({
      boardState: newBoardState,
      inventoryState: newInventory,
      moveCount: newMoveCount,
      undoStack: [...undoStack.slice(-(MAX_UNDO_HISTORY - 1)), snapshot],
      redoStack: [],
      ...computeValidation(get().puzzle, newBoardState, newMoveCount),
    });
    SoundManager.getInstance().play('slide');
    haptics.light();
  },

  rotateBrick: (instanceId) => {
    const { boardState, undoStack, inventoryState } = get();

    const snapshot: BoardSnapshot = {
      boardState: { ...boardState, placedBricks: [...boardState.placedBricks] },
      inventoryState: new Map(inventoryState),
      moveCount: get().moveCount,
    };

    const newBoardState = {
      ...boardState,
      placedBricks: boardState.placedBricks.map(b =>
        b.instanceId === instanceId
          ? { ...b, rotation: (b.rotation + 90) % 360 }
          : b
      ),
    };

    set({
      boardState: newBoardState,
      undoStack: [...undoStack.slice(-(MAX_UNDO_HISTORY - 1)), snapshot],
      redoStack: [],
      ...computeValidation(get().puzzle, newBoardState, get().moveCount),
    });
    SoundManager.getInstance().play('rotate');
    haptics.light();
  },

  // ------------------------------------------
  // SELECTION
  // ------------------------------------------

  selectBrick: (brickId) => {
    const { selectedBrickId } = get();
    if (brickId !== selectedBrickId) {
      set({ selectedBrickId: brickId, previewRotation: 0 });
      if (brickId) SoundManager.getInstance().play('select');
    } else {
      set({ selectedBrickId: brickId });
    }
  },

  rotatePreview: () => {
    const { previewRotation } = get();
    set({ previewRotation: (previewRotation + 90) % 360 });
  },

  setHoveredCell: (cell) => set({ hoveredCell: cell }),

  setDraggedBrick: (brick) => set({ draggedBrick: brick }),

  // ------------------------------------------
  // RESET
  // ------------------------------------------

  resetPuzzle: () => {
    const { puzzle } = get();
    if (puzzle?.title) clearPuzzleProgress(puzzle.title);
    set({
      boardState: engineBoardToBoardState(createInitialBoard(puzzle)),
      inventoryState: createInitialInventory(puzzle),
      validationResults: [],
      isComplete: false,
      moveCount: 0,
      selectedBrickId: null,
      previewRotation: 0,
      undoStack: [],
      redoStack: [],
      lastActionError: null,
      shakeBoard: false,
      completionProgress: 'normal',
    });
  },

  // ------------------------------------------
  // VALIDATION (uses shared enrichValidationRules)
  // ------------------------------------------

  validate: () => {
    const { puzzle, boardState, moveCount } = get();
    if (!puzzle) return;

    const rulesWithParams = enrichValidationRules(puzzle, moveCount);
    const results = ValidationRegistry.validate(boardState, rulesWithParams);
    const isComplete = ValidationRegistry.isAllValid(results);

    set({ validationResults: results, isComplete });
  },

  // ------------------------------------------
  // UNDO / REDO
  // ------------------------------------------

  undo: () => {
    const { undoStack, boardState, inventoryState, moveCount, redoStack } = get();
    if (undoStack.length === 0) return;

    const currentSnapshot: BoardSnapshot = {
      boardState: { ...boardState, placedBricks: [...boardState.placedBricks] },
      inventoryState: new Map(inventoryState),
      moveCount,
    };

    const prev = undoStack[undoStack.length - 1];
    set({
      boardState: prev.boardState,
      inventoryState: prev.inventoryState,
      moveCount: prev.moveCount,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, currentSnapshot],
      selectedBrickId: null,
      previewRotation: 0,
      ...computeValidation(get().puzzle, prev.boardState, prev.moveCount),
    });
    SoundManager.getInstance().play('undo');
    haptics.light();
  },

  redo: () => {
    const { redoStack, boardState, inventoryState, moveCount, undoStack } = get();
    if (redoStack.length === 0) return;

    const currentSnapshot: BoardSnapshot = {
      boardState: { ...boardState, placedBricks: [...boardState.placedBricks] },
      inventoryState: new Map(inventoryState),
      moveCount,
    };

    const next = redoStack[redoStack.length - 1];
    set({
      boardState: next.boardState,
      inventoryState: next.inventoryState,
      moveCount: next.moveCount,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, currentSnapshot],
      selectedBrickId: null,
      previewRotation: 0,
      ...computeValidation(get().puzzle, next.boardState, next.moveCount),
    });
    SoundManager.getInstance().play('undo');
    haptics.light();
  },

  // ------------------------------------------
  // SLIDING HELPERS
  // ------------------------------------------

  getValidSlideDestinationsFor: (instanceId) => {
    const { boardState, puzzle } = get();
    if (!hasSlidingOnlyRule(puzzle)) return [];

    const brick = boardState.placedBricks.find(b => b.instanceId === instanceId);
    if (!brick) return [];

    const engineBoard = toEngineBoard(boardState);
    const enginePiece = toEnginePiece(brick);
    return getValidSlideDestinations(engineBoard, enginePiece);
  },

  isSlidingPuzzle: () => {
    const { puzzle } = get();
    return hasSlidingOnlyRule(puzzle);
  },
}));

// ============================================
// localStorage auto-save (debounced via subscribe)
// ============================================

let saveTimer: ReturnType<typeof setTimeout> | null = null;

usePuzzleStore.subscribe((state, prevState) => {
  // Only save when board actually changes
  if (state.boardState === prevState.boardState) return;
  const title = state.puzzle?.title;
  if (!title) return;

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    savePuzzleProgress(title, state.boardState, state.inventoryState, state.moveCount);
  }, 500);
});
