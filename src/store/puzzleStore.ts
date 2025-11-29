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
  
  return {
    dimensions: puzzle.board.dimensions,
    placedBricks: [],
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
      // Position is the same, no need to move
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
      selectedBrickId: null,
      previewRotation: 0,
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
