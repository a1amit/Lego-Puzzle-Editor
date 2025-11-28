import { create } from 'zustand';
import { 
  PuzzleDefinition, 
  PlacedBrick, 
  BoardState, 
  ValidationResult,
  DEFAULT_PUZZLE,
  PuzzleDefinitionSchema
} from '../types/puzzle';
import { ValidationRegistry } from '../validation/ValidationRegistry';

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
    
    // Create new placed brick with unique instance ID
    const instanceId = `${brick.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const placedBrick: PlacedBrick = {
      ...brick,
      instanceId,
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
    
    // Return brick to inventory
    const newInventory = new Map(inventoryState);
    const current = newInventory.get(brick.id) ?? 0;
    newInventory.set(brick.id, current + 1);
    
    set({
      boardState: {
        ...boardState,
        placedBricks: boardState.placedBricks.filter(b => b.instanceId !== instanceId),
      },
      inventoryState: newInventory,
    });
    
    get().validate();
  },
  
  moveBrick: (instanceId, newPosition) => {
    const { boardState } = get();
    
    set({
      boardState: {
        ...boardState,
        placedBricks: boardState.placedBricks.map(b =>
          b.instanceId === instanceId
            ? { ...b, position: newPosition }
            : b
        ),
      },
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
