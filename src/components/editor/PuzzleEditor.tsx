import { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { usePuzzleStore } from '../../store/puzzleStore';
import { PuzzleDefinitionSchema } from '../../types/puzzle';

// JSON Schema for Monaco intellisense
const puzzleJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['puzzle_id', 'title', 'description', 'board', 'inventory', 'validation_rules'],
  properties: {
    puzzle_id: {
      type: 'string',
      description: 'Unique identifier for the puzzle',
    },
    title: {
      type: 'string',
      description: 'Display title of the puzzle',
    },
    description: {
      type: 'string',
      description: 'Description or instructions for the puzzle',
    },
    board: {
      type: 'object',
      required: ['dimensions'],
      properties: {
        dimensions: {
          type: 'object',
          required: ['width', 'height', 'depth'],
          properties: {
            width: { type: 'integer', minimum: 1 },
            height: { type: 'integer', minimum: 1 },
            depth: { type: 'integer', minimum: 1, default: 1 },
          },
        },
        initial_state: {
          type: 'array',
          description: 'Pre-placed pieces on the board (for slider puzzles)',
          items: {
            type: 'object',
            oneOf: [
              {
                // Reference to inventory piece
                properties: {
                  brickId: { type: 'string' },
                  position: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                  },
                  rotation: { type: 'number', default: 0 },
                },
                required: ['brickId', 'position'],
              },
              {
                // Cell-based piece (most explicit)
                properties: {
                  id: { type: 'string' },
                  cells: {
                    type: 'array',
                    description: 'Exactly which cells this piece covers [[x,y], ...]',
                    items: {
                      type: 'array',
                      items: { type: 'number' },
                      minItems: 2,
                      maxItems: 2,
                    },
                  },
                  color: { type: 'string' },
                },
                required: ['id', 'cells', 'color'],
              },
            ],
          },
        },
        blocked_cells: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
        },
      },
    },
    inventory: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'shape', 'color', 'quantity'],
        properties: {
          id: { type: 'string' },
          shape: {
            type: 'string',
            enum: [
              'T-tetromino',
              'I-tetromino',
              'L-tetromino',
              'O-tetromino',
              'S-tetromino',
              'Z-tetromino',
              'J-tetromino',
              'unit',
              'domino',
              'domino-v',
            ],
          },
          color: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
        },
      },
    },
    validation_rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'rule'],
        properties: {
          type: {
            type: 'string',
            enum: ['COVERAGE', 'PLACEMENT', 'COUNT', 'MOVEMENT', 'GOAL', 'CUSTOM'],
          },
          rule: {
            type: 'string',
            enum: [
              'ALL_BOARD_SQUARES_MUST_BE_COVERED',
              'ALL_BRICKS_MUST_BE_USED',
              'NO_BRICK_OVERLAP',
              'NO_BRICKS_OUT_OF_BOUNDS',
              'NO_BLOCKED_CELLS',
              'SLIDING_ONLY',
              'FREE_PLACEMENT',
              'GOAL_REACHED',
            ],
          },
          params: { type: 'object' },
        },
      },
    },
    viewMode: {
      type: 'string',
      enum: ['3D_ISOMETRIC', '2D_TOP_DOWN', '2D_GRID'],
      description: 'How to render the puzzle (3D or 2D)',
      default: '3D_ISOMETRIC',
    },
    goal: {
      type: 'object',
      description: 'Win condition for slider puzzles',
      properties: {
        targetPieceId: {
          type: 'string',
          description: 'ID of the piece that must reach the goal',
        },
        cells: {
          type: 'array',
          description: 'Cells the target piece must cover to win [[x,y], ...]',
          items: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
        },
      },
      required: ['targetPieceId', 'cells'],
    },
    metadata: {
      type: 'object',
      properties: {
        author: { type: 'string' },
        difficulty: {
          type: 'string',
          enum: ['easy', 'medium', 'hard', 'expert'],
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        version: { type: 'string' },
      },
    },
  },
};

interface PuzzleEditorProps {
  className?: string;
}

export function PuzzleEditor({ className = '' }: PuzzleEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const { jsonSource, setJsonSource, parseAndLoadPuzzle, parseError } = usePuzzleStore();
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const debounceRef = useRef<number | null>(null);

  // Setup Monaco on mount
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure JSON with our schema
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'http://puzzle-schema/puzzle.json',
          fileMatch: ['*'],
          schema: puzzleJsonSchema,
        },
      ],
      enableSchemaRequest: false,
      allowComments: false,
    });

    // Custom dark theme
    monaco.editor.defineTheme('puzzle-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '7ee787' },
        { token: 'string.value.json', foreground: 'a5d6ff' },
        { token: 'number', foreground: 'f5a97f' },
        { token: 'keyword', foreground: 'ff7b72' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#58a6ff',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editor.inactiveSelectionBackground': '#264f7844',
        'editorIndentGuide.background': '#21262d',
        'editorIndentGuide.activeBackground': '#30363d',
      },
    });

    monaco.editor.setTheme('puzzle-dark');

    // Initial validation
    validateAndUpdate(jsonSource);
  };

  // Validate JSON with Zod and update markers
  const validateWithZod = useCallback((value: string): string[] => {
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(value);
      const result = PuzzleDefinitionSchema.safeParse(parsed);

      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push(`${issue.path.join('.')}: ${issue.message}`);
        }
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        errors.push(`JSON Syntax: ${e.message}`);
      }
    }

    return errors;
  }, []);

  // Update editor markers based on errors
  const updateMarkers = useCallback((errors: string[]) => {
    if (!editorRef.current || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const markers: editor.IMarkerData[] = errors.map((error) => ({
      severity: monacoRef.current!.MarkerSeverity.Error,
      message: error,
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    }));

    monacoRef.current.editor.setModelMarkers(model, 'puzzle-validator', markers);
  }, []);

  // Debounced validation
  const validateAndUpdate = useCallback((value: string) => {
    const errors = validateWithZod(value);
    setLocalErrors(errors);
    updateMarkers(errors);

    if (errors.length === 0) {
      parseAndLoadPuzzle(value);
    }
  }, [validateWithZod, updateMarkers, parseAndLoadPuzzle]);

  // Handle editor changes
  const handleChange: OnChange = (value) => {
    if (!value) return;
    setJsonSource(value);

    // Debounce validation
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      validateAndUpdate(value);
    }, 500);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasErrors = localErrors.length > 0 || parseError;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2 bg-editor-sidebar border-b border-editor-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-display text-editor-accent">puzzle.json</span>
          {hasErrors && (
            <span className="px-2 py-0.5 text-xs bg-editor-error/20 text-editor-error rounded-full">
              {localErrors.length} error(s)
            </span>
          )}
          {!hasErrors && (
            <span className="px-2 py-0.5 text-xs bg-editor-success/20 text-editor-success rounded-full">
              Valid
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-editor-border rounded transition-colors"
            onClick={() => {
              if (editorRef.current) {
                editorRef.current.getAction('editor.action.formatDocument')?.run();
              }
            }}
          >
            Format
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={jsonSource}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            padding: { top: 12, bottom: 12 },
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-editor-bg">
              <div className="text-gray-400">Loading editor...</div>
            </div>
          }
        />
      </div>

      {/* Error panel */}
      {hasErrors && (
        <div className="max-h-32 overflow-auto bg-editor-error/10 border-t border-editor-error/30 p-3">
          <div className="text-xs font-display text-editor-error mb-2">PROBLEMS</div>
          <div className="space-y-1">
            {localErrors.map((error, i) => (
              <div key={i} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-editor-error">●</span>
                <span>{error}</span>
              </div>
            ))}
            {parseError && !localErrors.length && (
              <div className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-editor-error">●</span>
                <span>{parseError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

