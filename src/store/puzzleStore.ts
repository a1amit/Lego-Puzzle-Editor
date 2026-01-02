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
import { getValidSlideDestinations } from '../engine/utils';
import type { EngineBoard, PlacedPiece } from '../engine/types';

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
  previewRotation: number; // Rotation for inventory brick before placement
  hoveredCell: { x: number; y: number } | null;
  draggedBrick: PlacedBrick | null;

  // Actions
  setPuzzle: (puzzle: PuzzleDefinition) => void;
  setJsonSource: (json: string) => void;
  parseAndLoadPuzzle: (json: string) => boolean;

  placeBrick: (brick: PlacedBrick) => void;
  removeBrick: (instanceId: string) => void;
  moveBrick: (instanceId: string, newPosition: { x: number; y: number }) => void;
  rotateBrick: (instanceId: string) => void;

  selectBrick: (brickId: string | null) => void;
  rotatePreview: () => void; // Rotate the preview before placement
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  setDraggedBrick: (brick: PlacedBrick | null) => void;

  resetPuzzle: () => void;
  validate: () => void;

  // Sliding helpers
  getValidSlideDestinationsFor: (instanceId: string) => [number, number][];
  isSlidingPuzzle: () => boolean;
}

// ============================================
// TYPE ADAPTERS (Store <-> Engine)
// ============================================

/**
 * Convert store's PlacedBrick to engine's PlacedPiece format
 */
function toEnginePiece(brick: PlacedBrick): PlacedPiece {
  return {
    id: brick.id,
    instanceId: brick.instanceId,
    shape: brick.shape,
    color: brick.color,
    position: {
      x: brick.position.x,
      y: brick.position.y,
      z: brick.z || 0,
    },
    rotation: brick.rotation,
  };
}

/**
 * Convert store's BoardState to engine's EngineBoard format
 */
function toEngineBoard(boardState: BoardState): EngineBoard {
  return {
    dimensions: boardState.dimensions,
    placedPieces: boardState.placedBricks.map(toEnginePiece),
    blockedCells: boardState.blockedCells,
  };
}

/**
 * Check if a puzzle has the SLIDING_ONLY movement rule
 */
function hasSlidingOnlyRule(puzzle: PuzzleDefinition | null): boolean {
  if (!puzzle) return false;
  return puzzle.validation_rules.some(
    r => r.type === 'MOVEMENT' && r.rule === 'SLIDING_ONLY'
  );
}

/**
 * Check if a puzzle has the NO_BRICK_REMOVAL constraint rule
 */
function hasNoBrickRemovalRule(puzzle: PuzzleDefinition | null): boolean {
  if (!puzzle) return false;
  return puzzle.validation_rules.some(
    r => r.rule === 'NO_BRICK_REMOVAL'
  );
}

// Initialize with default puzzle JSON
const defaultJson = JSON.stringify(DEFAULT_PUZZLE, null, 2);

/**
 * Calculate the maximum z-level at the given cells
 * Returns the highest z-level + 1 (to stack on top)
 */
function calculateZLevel(
  boardState: BoardState,
  cells: [number, number][]
): number {
  let maxZ = -1;

  for (const brick of boardState.placedBricks) {
    const brickCells = getBrickCells(brick);
    const brickCellSet = new Set(brickCells.map(([x, y]) => `${x},${y}`));

    // Check if any of the new cells overlap with this brick's cells
    for (const [x, y] of cells) {
      if (brickCellSet.has(`${x},${y}`)) {
        maxZ = Math.max(maxZ, brick.z || 0);
      }
    }
  }

  return maxZ + 1; // Stack on top of the highest brick
}

/**
 * Find all bricks that are stacked on top of a given brick
 * Returns a set of instanceIds of bricks that should be removed
 */
function findBricksStackedOnTop(
  boardState: BoardState,
  targetBrick: PlacedBrick,
  excludeInstanceIds: Set<string> = new Set()
): Set<string> {
  const stackedBrickIds = new Set<string>();
  const targetCells = getBrickCells(targetBrick);
  const targetCellSet = new Set(targetCells.map(([x, y]) => `${x},${y}`));
  const targetZ = targetBrick.z || 0;

  // Find all bricks with higher z-level that overlap with target brick's cells
  for (const brick of boardState.placedBricks) {
    // Skip if already excluded or if it's the target brick itself
    if (excludeInstanceIds.has(brick.instanceId) || brick.instanceId === targetBrick.instanceId) {
      continue;
    }

    // Only check bricks at higher z-levels
    const brickZ = brick.z || 0;
    if (brickZ <= targetZ) {
      continue;
    }

    // Check if this brick overlaps with the target brick's cells
    const brickCells = getBrickCells(brick);
    const hasOverlap = brickCells.some(([x, y]) => targetCellSet.has(`${x},${y}`));

    if (hasOverlap) {
      stackedBrickIds.add(brick.instanceId);

      // Recursively find bricks stacked on top of this one
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

const createInitialBoardState = (puzzle: PuzzleDefinition | null): BoardState => {
  if (!puzzle) {
    return {
      dimensions: { width: 8, height: 4, depth: 1 },
      placedBricks: [],
      blockedCells: [],
    };
  }

  // Load initial piece placements from puzzle definition (for slider puzzles)
  const placedBricks: PlacedBrick[] = [];

  if (puzzle.board.initial_state && puzzle.board.initial_state.length > 0) {
    for (const placement of puzzle.board.initial_state) {
      // Check which type of placement this is
      if ('cells' in placement && Array.isArray(placement.cells)) {
        // Cell-based piece definition (most explicit)
        // Convert cells to shape + position format for internal use
        const cells = placement.cells as [number, number][];
        const minX = Math.min(...cells.map(c => c[0]));
        const minY = Math.min(...cells.map(c => c[1]));

        // Create a custom shape from the cells (normalized to origin)
        const normalizedCells = cells.map(([x, y]) => [x - minX, y - minY] as [number, number]);
        const shapeName = `custom-${placement.id}`;

        // Register custom shape if not exists
        if (!SHAPE_LIBRARY[shapeName]) {
          SHAPE_LIBRARY[shapeName] = {
            name: shapeName,
            cells: normalizedCells,
          };
        }

        placedBricks.push({
          id: placement.id,
          instanceId: `${placement.id}-initial-${placedBricks.length}`,
          shape: shapeName,
          color: placement.color,
          position: { x: minX, y: minY },
          rotation: 0,
          z: 0,
        });
      } else if ('shape' in placement && 'color' in placement && 'position' in placement) {
        // Inline piece definition with shape name
        placedBricks.push({
          id: placement.id,
          instanceId: `${placement.id}-initial-${placedBricks.length}`,
          shape: placement.shape,
          color: placement.color,
          position: { x: placement.position[0], y: placement.position[1] },
          rotation: placement.rotation || 0,
          z: 0,
        });
      } else if ('brickId' in placement) {
        // Reference to inventory piece
        const brickDef = puzzle.inventory.find(b => b.id === placement.brickId);
        if (brickDef) {
          placedBricks.push({
            id: brickDef.id,
            instanceId: `${brickDef.id}-initial-${placedBricks.length}`,
            shape: brickDef.shape,
            color: brickDef.color,
            position: { x: placement.position[0], y: placement.position[1] },
            rotation: placement.rotation || 0,
            z: 0,
          });
        }
      }
    }
  }

  return {
    dimensions: puzzle.board.dimensions,
    placedBricks,
    blockedCells: puzzle.board.blocked_cells || [],
  };
};

const createInitialInventory = (puzzle: PuzzleDefinition | null): Map<string, number> => {
  const inventory = new Map<string, number>();
  if (puzzle) {
    for (const brick of puzzle.inventory) {
      inventory.set(brick.id, brick.quantity);
    }
  }
  return inventory;
};

export const usePuzzleStore = create<PuzzleStore>((set, get) => ({
  puzzle: DEFAULT_PUZZLE,
  jsonSource: defaultJson,
  parseError: null,

  boardState: createInitialBoardState(DEFAULT_PUZZLE),
  inventoryState: createInitialInventory(DEFAULT_PUZZLE),

  validationResults: [],
  isComplete: false,
  moveCount: 0,

  selectedBrickId: null,
  previewRotation: 0,
  hoveredCell: null,
  draggedBrick: null,

  setPuzzle: (puzzle) => {
    set({
      puzzle,
      jsonSource: JSON.stringify(puzzle, null, 2),
      boardState: createInitialBoardState(puzzle),
      inventoryState: createInitialInventory(puzzle),
      validationResults: [],
      isComplete: false,
      moveCount: 0,
      selectedBrickId: null,
      previewRotation: 0,
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
        boardState: createInitialBoardState(validated),
        inventoryState: createInitialInventory(validated),
        validationResults: [],
        isComplete: false,
        previewRotation: 0,
      });

      return true;
    } catch (error) {
      let errorMessage = 'Invalid JSON';

      if (error instanceof SyntaxError) {
        errorMessage = `JSON Syntax Error: ${error.message}`;
      } else if (error instanceof Error && 'issues' in error) {
        // Zod error
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        errorMessage = zodError.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('\n');
      }

      set({ parseError: errorMessage });
      return false;
    }
  },

  placeBrick: (brick) => {
    const { boardState, inventoryState } = get();

    // Check if brick is available in inventory
    const remaining = inventoryState.get(brick.id) ?? 0;
    if (remaining <= 0) return;

    // Calculate z-level for stacking
    const shape = SHAPE_LIBRARY[brick.shape];
    if (!shape) return;

    const rotatedCells = rotateShape(shape.cells, brick.rotation || 0);
    const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
      brick.position.x + dx,
      brick.position.y + dy,
    ]);

    const zLevel = calculateZLevel(boardState, cells);

    // Check if z-level exceeds board depth (depth: 1 = no stacking, depth: 2 = one layer, etc.)
    const maxAllowedZ = boardState.dimensions.depth - 1;
    if (zLevel > maxAllowedZ) {
      // Stacking would exceed depth limit
      return;
    }

    // Create new placed brick with unique instance ID
    const instanceId = `${brick.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const placedBrick: PlacedBrick = {
      ...brick,
      instanceId,
      z: zLevel,
    };

    // Update state
    const newInventory = new Map(inventoryState);
    newInventory.set(brick.id, remaining - 1);

    set({
      boardState: {
        ...boardState,
        placedBricks: [...boardState.placedBricks, placedBrick],
      },
      inventoryState: newInventory,
      previewRotation: 0, // Reset rotation after placement
    });

    // Validate after placement
    get().validate();
  },

  removeBrick: (instanceId) => {
    const { boardState, inventoryState, puzzle } = get();

    // Block removal if NO_BRICK_REMOVAL rule is present
    if (hasNoBrickRemovalRule(puzzle)) {
      console.log('Brick removal is disabled for this puzzle (NO_BRICK_REMOVAL rule)');
      return;
    }

    const brick = boardState.placedBricks.find(b => b.instanceId === instanceId);
    if (!brick) return;

    // Find all bricks stacked on top of this brick
    const stackedBrickIds = findBricksStackedOnTop(boardState, brick);

    // Collect all bricks to remove (the target brick + all stacked on top)
    const bricksToRemove = boardState.placedBricks.filter(
      b => b.instanceId === instanceId || stackedBrickIds.has(b.instanceId)
    );

    // Return all removed bricks to inventory
    const newInventory = new Map(inventoryState);
    for (const brickToRemove of bricksToRemove) {
      const current = newInventory.get(brickToRemove.id) ?? 0;
      newInventory.set(brickToRemove.id, current + 1);
    }

    // Remove all bricks (target + stacked on top)
    const instanceIdsToRemove = new Set([instanceId, ...stackedBrickIds]);
    set({
      boardState: {
        ...boardState,
        placedBricks: boardState.placedBricks.filter(b => !instanceIdsToRemove.has(b.instanceId)),
      },
      inventoryState: newInventory,
    });

    get().validate();
  },

  moveBrick: (instanceId, newPosition) => {
    const { boardState, inventoryState, puzzle } = get();

    const brick = boardState.placedBricks.find(b => b.instanceId === instanceId);
    if (!brick) return;

    // Check if position is actually changing
    if (brick.position.x === newPosition.x && brick.position.y === newPosition.y) {
      // Position is the same, no need to move
      return;
    }

    // === SLIDING ONLY VALIDATION ===
    // If SLIDING_ONLY rule is active, validate the move is a valid slide
    if (hasSlidingOnlyRule(puzzle)) {
      const engineBoard = toEngineBoard(boardState);
      const enginePiece = toEnginePiece(brick);
      const validDestinations = getValidSlideDestinations(engineBoard, enginePiece);

      const isValidSlide = validDestinations.some(
        ([x, y]) => x === newPosition.x && y === newPosition.y
      );

      if (!isValidSlide) {
        console.log('Invalid slide move - not in valid destinations');
        return; // Block invalid slides
      }
    }

    // Find all bricks stacked on top of the original position
    const stackedBrickIds = findBricksStackedOnTop(boardState, brick);

    // Remove stacked bricks and return them to inventory
    const newInventory = new Map(inventoryState);
    const bricksToRemove = boardState.placedBricks.filter(
      b => stackedBrickIds.has(b.instanceId)
    );

    for (const brickToRemove of bricksToRemove) {
      const current = newInventory.get(brickToRemove.id) ?? 0;
      newInventory.set(brickToRemove.id, current + 1);
    }

    // Remove stacked bricks from board state before calculating new z-level
    const bricksWithoutStacked = boardState.placedBricks.filter(
      b => !stackedBrickIds.has(b.instanceId)
    );

    // Calculate new z-level for the new position
    const shape = SHAPE_LIBRARY[brick.shape];
    if (!shape) return;

    const rotatedCells = rotateShape(shape.cells, brick.rotation || 0);
    const cells: [number, number][] = rotatedCells.map(([dx, dy]) => [
      newPosition.x + dx,
      newPosition.y + dy,
    ]);

    // Exclude the current brick from z-level calculation (it's being moved)
    const otherBricks = bricksWithoutStacked.filter(b => b.instanceId !== instanceId);
    const tempBoardState: BoardState = {
      ...boardState,
      placedBricks: otherBricks,
    };

    const zLevel = calculateZLevel(tempBoardState, cells);

    // Check if z-level exceeds board depth (depth: 1 = no stacking, depth: 2 = one layer, etc.)
    const maxAllowedZ = boardState.dimensions.depth - 1;
    if (zLevel > maxAllowedZ) {
      // Stacking would exceed depth limit, don't move
      return;
    }

    // Update board state: remove stacked bricks and move the target brick
    set({
      boardState: {
        ...boardState,
        placedBricks: bricksWithoutStacked.map(b =>
          b.instanceId === instanceId
            ? { ...b, position: newPosition, z: zLevel }
            : b
        ),
      },
      inventoryState: newInventory,
      moveCount: get().moveCount + 1,
    });

    get().validate();
  },

  rotateBrick: (instanceId) => {
    const { boardState } = get();

    set({
      boardState: {
        ...boardState,
        placedBricks: boardState.placedBricks.map(b =>
          b.instanceId === instanceId
            ? { ...b, rotation: (b.rotation + 90) % 360 }
            : b
        ),
      },
    });

    get().validate();
  },

  selectBrick: (brickId) => {
    const { selectedBrickId } = get();
    // Reset rotation when selecting a different brick
    if (brickId !== selectedBrickId) {
      set({ selectedBrickId: brickId, previewRotation: 0 });
    } else {
      set({ selectedBrickId: brickId });
    }
  },

  rotatePreview: () => {
    const { previewRotation } = get();
    set({ previewRotation: (previewRotation + 90) % 360 });
  },

  setHoveredCell: (cell) => {
    set({ hoveredCell: cell });
  },

  setDraggedBrick: (brick) => {
    set({ draggedBrick: brick });
  },

  resetPuzzle: () => {
    const { puzzle } = get();
    set({
      boardState: createInitialBoardState(puzzle),
      inventoryState: createInitialInventory(puzzle),
      validationResults: [],
      isComplete: false,
      moveCount: 0,
      selectedBrickId: null,
      previewRotation: 0,
    });
  },

  validate: () => {
    const { puzzle, boardState } = get();
    if (!puzzle) return;

    // Enhance validation rules with additional parameters
    const rulesWithParams = puzzle.validation_rules.map(rule => {
      // Add inventory data for ALL_BRICKS_MUST_BE_USED rule
      if (rule.rule === 'ALL_BRICKS_MUST_BE_USED') {
        return {
          ...rule,
          params: {
            ...rule.params,
            inventory: puzzle.inventory.map(b => ({ id: b.id, quantity: b.quantity })),
          },
        };
      }

      // Add goal cells data for GOAL_REACHED rule (slider puzzles)
      if (rule.rule === 'GOAL_REACHED' && puzzle.goal) {
        return {
          ...rule,
          params: {
            ...rule.params,
            targetPieceId: puzzle.goal.targetPieceId,
            targetPieceIds: puzzle.goal.targetPieceIds,
            allowAnyPiece: puzzle.goal.allowAnyPiece,
            goalCells: puzzle.goal.cells,
          },
        };
      }

      // Add target pattern data for PATTERN_MATCH rule
      if (rule.rule === 'PATTERN_MATCH' && puzzle.target_pattern) {
        return {
          ...rule,
          params: {
            ...rule.params,
            rows: puzzle.target_pattern.rows,
            color_mapping: puzzle.target_pattern.color_mapping,
            allow_empty_cells: puzzle.target_pattern.allow_empty_cells,
          },
        };
      }

      // Add current moves data for MAX_MOVES rule
      if (rule.rule === 'MAX_MOVES') {
        return {
          ...rule,
          params: {
            ...rule.params,
            currentMoves: get().moveCount,
          },
        };
      }

      return rule;
    });

    const results = ValidationRegistry.validate(boardState, rulesWithParams);
    const isComplete = ValidationRegistry.isAllValid(results);

    set({
      validationResults: results,
      isComplete,
    });
  },

  // Sliding puzzle helpers
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
