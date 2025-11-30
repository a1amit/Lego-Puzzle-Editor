import { create } from 'zustand';
import {
  PuzzleDefinition,
  PlacedBrick,
  BoardState,
  ValidationResult,
  DEFAULT_PUZZLE,
  PuzzleDefinitionSchema,
  SHAPE_LIBRARY,
  Rotation3D,
  DEFAULT_ROTATION,
  Cell3D,
  normalizeCellsTo3D
} from '../types/puzzle';
import {
  ValidationRegistry,
  getBrickCells3D,
  rotateShape3D,
  incrementRotation,
  getOccupiedCellSet
} from '../validation/ValidationRegistry';

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

  // Selection & Interaction
  selectedBrickId: string | null;
  previewRotation: Rotation3D; // 3D rotation for inventory brick before placement
  hoveredCell: { x: number; y: number } | null;
  draggedBrick: PlacedBrick | null;

  // Actions
  setPuzzle: (puzzle: PuzzleDefinition) => void;
  setJsonSource: (json: string) => void;
  parseAndLoadPuzzle: (json: string) => boolean;

  placeBrick: (brick: PlacedBrick) => void;
  removeBrick: (instanceId: string) => void;
  moveBrick: (instanceId: string, newPosition: { x: number; y: number }) => void;
  rotateBrick: (instanceId: string, axis?: 'x' | 'y' | 'z') => void;

  selectBrick: (brickId: string | null) => void;
  rotatePreview: (axis?: 'x' | 'y' | 'z') => void; // Rotate the preview before placement on specified axis
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  setDraggedBrick: (brick: PlacedBrick | null) => void;

  resetPuzzle: () => void;
  validate: () => void;
}

// Initialize with default puzzle JSON
const defaultJson = JSON.stringify(DEFAULT_PUZZLE, null, 2);

/**
 * Calculate the lowest valid Z position for placing a brick at given X,Y with specified rotation.
 * The brick will be placed at the lowest Z where it doesn't collide with existing bricks.
 * Returns -1 if placement is not possible (would exceed depth limit).
 */
function calculatePlacementZ(
  boardState: BoardState,
  shapeName: string,
  position: { x: number; y: number },
  rotation: Rotation3D,
  excludeBrickId?: string
): number {
  const shape = SHAPE_LIBRARY[shapeName];
  if (!shape) return -1;

  // Get the rotated cells at origin
  const cells3D = normalizeCellsTo3D(shape.cells);
  const rotatedCells = rotateShape3D(cells3D, rotation);

  // Get all occupied cells (excluding the brick being moved if any)
  const occupiedSet = getOccupiedCellSet(boardState, excludeBrickId);

  // Find the minimum Z where we can place this brick without collision
  // Start from z=0 and go up
  const maxDepth = boardState.dimensions.depth;

  for (let baseZ = 0; baseZ < maxDepth; baseZ++) {
    let canPlace = true;

    for (const [dx, dy, dz] of rotatedCells) {
      const worldX = position.x + dx;
      const worldY = position.y + dy;
      const worldZ = baseZ + dz;

      // Check if this voxel is out of bounds
      if (worldZ >= maxDepth || worldZ < 0) {
        canPlace = false;
        break;
      }

      // Check if this voxel is occupied
      if (occupiedSet.has(`${worldX},${worldY},${worldZ}`)) {
        canPlace = false;
        break;
      }
    }

    if (canPlace) {
      return baseZ;
    }
  }

  return -1; // No valid placement found
}

/**
 * Find all bricks that would be affected if we remove/move a given brick.
 * In 3D, we check for bricks that occupy cells directly above any cell of the target brick.
 */
function findBricksStackedOnTop(
  boardState: BoardState,
  targetBrick: PlacedBrick,
  excludeInstanceIds: Set<string> = new Set()
): Set<string> {
  const stackedBrickIds = new Set<string>();
  const targetCells = getBrickCells3D(targetBrick);

  // Create a set of all positions directly above target brick cells
  const aboveCellSet = new Set<string>();
  for (const [x, y, z] of targetCells) {
    // Add all cells from z+1 up to depth limit
    for (let aboveZ = z + 1; aboveZ < boardState.dimensions.depth; aboveZ++) {
      aboveCellSet.add(`${x},${y},${aboveZ}`);
    }
  }

  // Find all bricks that occupy any of the "above" cells
  for (const brick of boardState.placedBricks) {
    if (excludeInstanceIds.has(brick.instanceId) || brick.instanceId === targetBrick.instanceId) {
      continue;
    }

    const brickCells = getBrickCells3D(brick);
    const hasOverlap = brickCells.some(([x, y, z]) => aboveCellSet.has(`${x},${y},${z}`));

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

  // Convert 2D blocked cells to 3D (z=0 for ground level)
  const blockedCells: Cell3D[] = (puzzle.board.blocked_cells || []).map(cell => {
    // blocked_cells from schema are always [number, number]
    return [cell[0], cell[1], 0] as Cell3D;
  });

  return {
    dimensions: puzzle.board.dimensions,
    placedBricks: [],
    blockedCells,
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

  selectedBrickId: null,
  previewRotation: { ...DEFAULT_ROTATION }, // 3D rotation
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
      selectedBrickId: null,
      previewRotation: { ...DEFAULT_ROTATION },
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
        previewRotation: { ...DEFAULT_ROTATION },
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

    // Ensure rotation is properly formatted as Rotation3D
    const rotation: Rotation3D = typeof brick.rotation === 'number'
      ? { x: 0, y: 0, z: Math.floor((brick.rotation % 360) / 90) }
      : brick.rotation || { ...DEFAULT_ROTATION };

    // Calculate Z position for placement (find lowest available position)
    const zLevel = calculatePlacementZ(
      boardState,
      brick.shape,
      { x: brick.position.x, y: brick.position.y },
      rotation
    );

    if (zLevel < 0) {
      // No valid placement found
      return;
    }

    // Create new placed brick with unique instance ID
    const instanceId = `${brick.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const placedBrick: PlacedBrick = {
      id: brick.id,
      instanceId,
      shape: brick.shape,
      color: brick.color,
      position: { x: brick.position.x, y: brick.position.y, z: zLevel },
      rotation,
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
      previewRotation: { ...DEFAULT_ROTATION }, // Reset rotation after placement
    });

    // Validate after placement
    get().validate();
  },
  
  removeBrick: (instanceId) => {
    const { boardState, inventoryState } = get();
    
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
    const { boardState, inventoryState } = get();

    const brick = boardState.placedBricks.find(b => b.instanceId === instanceId);
    if (!brick) return;

    // Check if position is actually changing
    if (brick.position.x === newPosition.x && brick.position.y === newPosition.y) {
      return;
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

    // Create temporary board state without the brick being moved
    const tempBoardState: BoardState = {
      ...boardState,
      placedBricks: bricksWithoutStacked.filter(b => b.instanceId !== instanceId),
    };

    // Calculate new Z position for the new location
    const zLevel = calculatePlacementZ(
      tempBoardState,
      brick.shape,
      newPosition,
      brick.rotation
    );

    if (zLevel < 0) {
      // No valid placement found, don't move
      return;
    }

    // Update board state: remove stacked bricks and move the target brick
    set({
      boardState: {
        ...boardState,
        placedBricks: bricksWithoutStacked.map(b =>
          b.instanceId === instanceId
            ? { ...b, position: { ...newPosition, z: zLevel } }
            : b
        ),
      },
      inventoryState: newInventory,
    });

    get().validate();
  },
  
  rotateBrick: (instanceId, axis = 'z') => {
    const { boardState } = get();

    const brick = boardState.placedBricks.find(b => b.instanceId === instanceId);
    if (!brick) return;

    // Calculate new rotation
    const newRotation = incrementRotation(brick.rotation, axis);

    // Check if the rotated brick would collide with anything
    const tempBoardState: BoardState = {
      ...boardState,
      placedBricks: boardState.placedBricks.filter(b => b.instanceId !== instanceId),
    };

    // Get the shape and check if new rotation is valid
    const shape = SHAPE_LIBRARY[brick.shape];
    if (!shape) return;

    const cells3D = normalizeCellsTo3D(shape.cells);
    const rotatedCells = rotateShape3D(cells3D, newRotation);
    const occupiedSet = getOccupiedCellSet(tempBoardState);

    // Check for collisions with the new rotation
    let hasCollision = false;
    for (const [dx, dy, dz] of rotatedCells) {
      const worldX = brick.position.x + dx;
      const worldY = brick.position.y + dy;
      const worldZ = brick.position.z + dz;

      // Check bounds
      if (
        worldX < 0 || worldX >= boardState.dimensions.width ||
        worldY < 0 || worldY >= boardState.dimensions.height ||
        worldZ < 0 || worldZ >= boardState.dimensions.depth
      ) {
        hasCollision = true;
        break;
      }

      // Check collision with other bricks
      if (occupiedSet.has(`${worldX},${worldY},${worldZ}`)) {
        hasCollision = true;
        break;
      }
    }

    if (hasCollision) {
      // Rotation would cause collision, don't rotate
      return;
    }

    set({
      boardState: {
        ...boardState,
        placedBricks: boardState.placedBricks.map(b =>
          b.instanceId === instanceId
            ? { ...b, rotation: newRotation }
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
      set({ selectedBrickId: brickId, previewRotation: { ...DEFAULT_ROTATION } });
    } else {
      set({ selectedBrickId: brickId });
    }
  },

  rotatePreview: (axis = 'z') => {
    const { previewRotation } = get();
    set({ previewRotation: incrementRotation(previewRotation, axis) });
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
      selectedBrickId: null,
      previewRotation: { ...DEFAULT_ROTATION },
    });
  },
  
  validate: () => {
    const { puzzle, boardState } = get();
    if (!puzzle) return;
    
    // Enhance validation rules with inventory data for ALL_BRICKS_MUST_BE_USED
    const rulesWithParams = puzzle.validation_rules.map(rule => {
      if (rule.rule === 'ALL_BRICKS_MUST_BE_USED') {
        return {
          ...rule,
          params: {
            ...rule.params,
            inventory: puzzle.inventory.map(b => ({ id: b.id, quantity: b.quantity })),
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
}));
