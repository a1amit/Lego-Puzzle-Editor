import { useCallback, useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import Editor, { OnMount, OnChange, loader } from '@monaco-editor/react';
import { usePuzzleStore } from '../../store/puzzleStore';

// Use locally bundled Monaco (not CDN) — required by CSP and saves ~8.7MB of unused workers
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        { type: 'module' },
      );
    }
    return new Worker(
      new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
      { type: 'module' },
    );
  },
};
loader.config({ monaco });
import { PuzzleDefinitionSchema } from '../../types/puzzle';
import { Button } from '../ui/shadcn/button';
import { Badge } from '../ui/shadcn/badge';

// JSON Schema for Monaco intellisense
const puzzleJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['title', 'description', 'board', 'inventory', 'validation_rules'],
  properties: {
    title: { type: 'string', description: 'Display title of the puzzle' },
    description: { type: 'string', description: 'Description or instructions for the puzzle' },
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
                properties: {
                  brickId: { type: 'string' },
                  position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
                  rotation: { type: 'number', default: 0 },
                },
                required: ['brickId', 'position'],
              },
              {
                properties: {
                  id: { type: 'string' },
                  cells: {
                    type: 'array',
                    description: 'Exactly which cells this piece covers [[x,y], ...]',
                    items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
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
          items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
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
            enum: ['T-tetromino', 'I-tetromino', 'L-tetromino', 'O-tetromino', 'S-tetromino', 'Z-tetromino', 'J-tetromino', 'unit', 'domino', 'domino-v', 'tromino-I', 'plus', 'long-L-pentomino', 'corner-pentomino', 'stretched-Z-pentomino', 'U-pentomino'],
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
          type: { type: 'string', enum: ['COVERAGE', 'PLACEMENT', 'COUNT', 'MOVEMENT', 'ROTATION', 'PATTERN', 'GOAL', 'CONSTRAINT', 'MAX_MOVES', 'CUSTOM'] },
          rule: { type: 'string', enum: ['ALL_BOARD_SQUARES_MUST_BE_COVERED', 'ALL_BRICKS_MUST_BE_USED', 'NO_BRICK_OVERLAP', 'NO_BRICKS_OUT_OF_BOUNDS', 'NO_BLOCKED_CELLS', 'SLIDING_ONLY', 'FREE_PLACEMENT', 'NO_ROTATION', 'NO_BRICK_REMOVAL', 'PATTERN_MATCH', 'GOAL_REACHED', 'MAX_MOVES', 'CUSTOM_RULE'] },
          params: {
            type: 'object',
            description: 'Rule-specific parameters. For CUSTOM_RULE: { label: string, condition: { kind: "ALL"|"ANY"|"NONE"|..., children: [...] } or leaf condition like { kind: "cells_are_covered", cells: [[x,y],...] } }',
          },
        },
      },
    },
    viewMode: { type: 'string', enum: ['3D', '2D'], description: 'How to render the puzzle (3D or 2D)', default: '3D' },
    goal: {
      type: 'object',
      description: 'Win condition for slider puzzles',
      properties: {
        targetPieceId: { type: 'string', description: 'ID of the piece that must reach the goal' },
        targetPieceIds: { type: 'array', items: { type: 'string' }, description: 'List of piece IDs (any one can satisfy the goal)' },
        allowAnyPiece: { type: 'boolean', description: 'If true, any piece on the board can satisfy the goal' },
        hideGoalVisualization: { type: 'boolean', description: 'If true, the goal area will not be rendered' },
        cells: { type: 'array', description: 'Cells the target piece must cover to win [[x,y], ...]', items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 } },
      },
      required: ['cells'],
    },
    target_pattern: {
      type: 'object',
      description: 'Target pattern for pattern-matching puzzles (Binary, RLE, etc.)',
      properties: {
        rows: { type: 'array', description: '2D grid of expected values. rows[y][x] = value (0, 1, or color key)', items: { type: 'array', items: { type: ['number', 'string'] } } },
        color_mapping: { type: 'object', description: 'Maps pattern values to colors.', additionalProperties: { type: 'string' } },
        allow_empty_cells: { type: 'boolean', description: 'If true, cells without pieces are allowed', default: false },
      },
      required: ['rows', 'color_mapping'],
    },
    metadata: {
      type: 'object',
      properties: {
        author: { type: 'string' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
        tags: { type: 'array', items: { type: 'string' } },
        version: { type: 'string' },
      },
    },
  },
};

interface PuzzleEditorProps {
  className?: string;
}

export function PuzzleEditor({ className = '' }: PuzzleEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const { jsonSource, setJsonSource, parseAndLoadPuzzle, parseError } = usePuzzleStore();
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [isModified, setIsModified] = useState(false);
  const [errorsCollapsed, setErrorsCollapsed] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const puzzleDarkTheme: monaco.editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '7ee787' },
      { token: 'string.value.json', foreground: 'a5d6ff' },
      { token: 'number', foreground: 'f5a97f' },
      { token: 'keyword', foreground: 'ff7b72' },
    ],
    colors: {
      'editor.background': '#0f0f14',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#1a1a24',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#6366f1',
      'editorLineNumber.foreground': '#484f58',
      'editorLineNumber.activeForeground': '#c9d1d9',
      'editor.inactiveSelectionBackground': '#264f7844',
      'editorIndentGuide.background': '#1e1e28',
      'editorIndentGuide.activeBackground': '#2e2e3a',
    },
  };

  // Define theme BEFORE editor mounts to prevent white flash
  const handleBeforeMount = (monacoInstance: typeof monaco) => {
    monacoInstance.editor.defineTheme('puzzle-dark', puzzleDarkTheme);
  };

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{ uri: 'http://puzzle-schema/puzzle.json', fileMatch: ['*'], schema: puzzleJsonSchema }],
      enableSchemaRequest: false,
      allowComments: false,
    });

    validateAndUpdate(jsonSource);
  };

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

  const updateMarkers = useCallback((errors: string[]) => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    const markers: monaco.editor.IMarkerData[] = errors.map((error) => ({
      severity: monacoRef.current!.MarkerSeverity.Error,
      message: error,
      startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1,
    }));
    monacoRef.current.editor.setModelMarkers(model, 'puzzle-validator', markers);
  }, []);

  const validateAndUpdate = useCallback((value: string) => {
    const errors = validateWithZod(value);
    setLocalErrors(errors);
    updateMarkers(errors);
    if (errors.length === 0) {
      parseAndLoadPuzzle(value);
      setIsModified(false);
    }
  }, [validateWithZod, updateMarkers, parseAndLoadPuzzle]);

  const handleChange: OnChange = (value) => {
    if (!value) return;
    setJsonSource(value);
    setIsModified(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { validateAndUpdate(value); }, 500);
  };

  useEffect(() => {
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, []);

  const hasErrors = localErrors.length > 0 || parseError;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-primary">puzzle.json</span>
          {isModified && (
            <span className="w-2 h-2 rounded-full bg-warning" title="Unsaved changes" />
          )}
          {hasErrors ? (
            <Badge variant="destructive" className="text-[10px] h-5">
              {localErrors.length} error{localErrors.length !== 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge variant="default" className="bg-success text-success-foreground text-[10px] h-5">
              Valid
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
        >
          Format
          <kbd className="hidden md:inline text-[10px] font-mono text-muted-foreground bg-secondary px-1 rounded">Shift+Alt+F</kbd>
        </Button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden bg-[#0f0f14]">
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="puzzle-dark"
          beforeMount={handleBeforeMount}
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
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            padding: { top: 12, bottom: 12 },
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-[#0f0f14]">
              <div className="text-muted-foreground text-sm">Loading editor...</div>
            </div>
          }
        />
      </div>

      {/* Error panel */}
      {hasErrors && (
        <div className="bg-destructive/10 border-t border-destructive/30">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
            onClick={() => setErrorsCollapsed(c => !c)}
          >
            <span>PROBLEMS</span>
            <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
              {localErrors.length || (parseError ? 1 : 0)}
            </Badge>
          </button>
          {!errorsCollapsed && (
            <div className="max-h-32 overflow-auto px-3 pb-3 space-y-1">
              {localErrors.map((error, i) => (
                <div key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                  <span className="text-destructive">●</span>
                  <span>{error}</span>
                </div>
              ))}
              {parseError && !localErrors.length && (
                <div className="text-xs text-foreground/70 flex items-start gap-2">
                  <span className="text-destructive">●</span>
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
