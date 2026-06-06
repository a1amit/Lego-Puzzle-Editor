import { useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import './monacoSetup'; // side effect: configures MonacoEnvironment + loader
import { usePuzzleStore } from '../../store/puzzleStore';
import type { PuzzleDefinition, PluginRenderKind } from '../../types/puzzle';
import { RUBIKS_CUBE_PLUGIN_SOURCE } from '../../runtime/plugin/examples/rubiksCubePlugin';
import { ACYCLIC_SHADOWS_PLUGIN_SOURCE } from '../../runtime/plugin/examples/acyclicShadowsPlugin';
import { Button } from '../ui/shadcn/button';
import { Play } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '../ui/shadcn/dropdown-menu';

/**
 * PluginCodeEditor — the "control everything in code" authoring surface.
 *
 * The creator writes a full PuzzlePlugin module (state + moves + win + render),
 * picks a render kind, and clicks Run to preview it live in the sandbox via the
 * shared store. Saving uses the existing draft flow (the module string is part
 * of the puzzle JSON). This is the general counterpart to the built-in Rubik's
 * example: any puzzle the grid model can't express lives here.
 */

const STARTER_DOM = `// A PuzzlePlugin: YOU own the state, the moves, the win check, and the
// rendering. The host runs this in a sandbox and confirms the win when
// isSolved() returns { solved: true }. Edit freely, then click Run.
export default {
  meta: { title: 'Toggle Grid', instructions: 'Click the tiles until they are all green.' },

  // Build the starting state (pure, JSON-serializable).
  initialState(ctx) {
    var cells = [];
    for (var i = 0; i < 9; i++) cells.push(i % 3 === 0);
    return { cells: cells };
  },

  // Apply a move -> a NEW state (pure, no mutation). A move is a tile index.
  applyMove(state, move) {
    var cells = state.cells.slice();
    cells[move.i] = !cells[move.i];
    return { cells: cells };
  },

  // Win check (pure). progress (0..1) drives the host's progress chip.
  isSolved(state) {
    var on = state.cells.filter(Boolean).length;
    return { solved: on === state.cells.length, progress: on / state.cells.length };
  },

  // Render into the sandbox DOM. Call api.emitMove(move) to submit a move.
  render: {
    mount: function (root, api) {
      root.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%';
      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(3,64px);gap:8px';
      root.appendChild(grid);
      var tiles = [];
      for (var i = 0; i < 9; i++) {
        (function (idx) {
          var t = document.createElement('button');
          t.style.cssText = 'border:none;border-radius:10px;cursor:pointer';
          t.onclick = function () { api.emitMove({ i: idx }); };
          grid.appendChild(t);
          tiles.push(t);
        })(i);
      }
      return {
        update: function (state) {
          for (var i = 0; i < tiles.length; i++) {
            tiles[i].style.background = state.cells[i] ? '#22c55e' : '#3a3f4b';
          }
        }
      };
    }
  }
};
`;

interface Template { label: string; renderKind: PluginRenderKind; source: string }
const TEMPLATES: Template[] = [
  { label: 'Toggle Grid (DOM)', renderKind: 'dom', source: STARTER_DOM },
  { label: "Rubik's Cube (WebGL)", renderKind: 'webgl', source: RUBIKS_CUBE_PLUGIN_SOURCE },
  { label: 'Acyclic Shadows (WebGL)', renderKind: 'webgl', source: ACYCLIC_SHADOWS_PLUGIN_SOURCE },
];

/** Best-effort read of meta.title from the module source for the initial
 *  definition title. The running plugin's reported meta is authoritative and
 *  re-syncs it on load (see PuzzleShell handlePluginMeta), so this just avoids
 *  a placeholder flash in the common case. */
function parseMetaTitle(module: string): string {
  const m = module.match(/title\s*:\s*"([^"]*)"/) || module.match(/title\s*:\s*'([^']*)'/);
  return (m && m[1].trim()) || 'Plugin Puzzle';
}

function buildPluginPuzzle(module: string, renderKind: PluginRenderKind): PuzzleDefinition {
  return {
    title: parseMetaTitle(module),
    description: 'Author-coded plugin puzzle.',
    engine: 'plugin',
    plugin: { module, renderKind, seed: 1, apiVersion: 1 },
    viewMode: '3D',
    board: { dimensions: { width: 1, height: 1, depth: 1 }, initial_state: [] },
    inventory: [],
    validation_rules: [],
    metadata: { difficulty: 'medium', tags: ['plugin'] },
  };
}

interface PluginCodeEditorProps {
  className?: string;
}

export function PluginCodeEditor({ className = '' }: PluginCodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const setPuzzle = usePuzzleStore((s) => s.setPuzzle);
  const currentPuzzle = usePuzzleStore((s) => s.puzzle);

  // Seed the editor from the current puzzle if it's already a plugin, else the
  // DOM starter template.
  const initial = currentPuzzle?.engine === 'plugin' && currentPuzzle.plugin
    ? { code: currentPuzzle.plugin.module, renderKind: currentPuzzle.plugin.renderKind }
    : { code: STARTER_DOM, renderKind: 'dom' as PluginRenderKind };

  const [renderKind, setRenderKind] = useState<PluginRenderKind>(initial.renderKind);
  const codeRef = useRef(initial.code);

  const handleMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoInstance.editor.defineTheme('puzzle-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#0f0f14', 'editor.foreground': '#c9d1d9' },
    });
    monacoInstance.editor.setTheme('puzzle-dark');
  };

  const run = () => {
    const code = editorRef.current?.getValue() ?? codeRef.current;
    codeRef.current = code;
    setPuzzle(buildPluginPuzzle(code, renderKind));
  };

  const loadTemplate = (t: Template) => {
    codeRef.current = t.source;
    editorRef.current?.setValue(t.source);
    setRenderKind(t.renderKind);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-mono text-primary whitespace-nowrap">plugin.js</span>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={renderKind}
            aria-label="Render kind"
            onChange={(e) => setRenderKind(e.target.value as PluginRenderKind)}
            className="h-7 px-2 rounded bg-secondary/70 border border-border text-xs text-foreground"
          >
            <option value="dom">DOM</option>
            <option value="canvas2d">Canvas 2D</option>
            <option value="webgl">WebGL (THREE)</option>
          </select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">Templates</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Start from</DropdownMenuLabel>
              {TEMPLATES.map((t) => (
                <DropdownMenuItem key={t.label} onClick={() => loadTemplate(t)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={run}>
            <Play className="w-3 h-3" />
            Run
          </Button>
        </div>
      </div>

      <div className="px-3 py-1.5 text-[11px] text-muted-foreground bg-card/50 border-b border-border">
        Export a default <span className="font-mono text-foreground/80">PuzzlePlugin</span>{' '}
        (meta, initialState, applyMove, isSolved, render.mount). The puzzle title comes from{' '}
        <span className="font-mono text-foreground/80">meta.title</span> in your code; for WebGL,{' '}
        <span className="font-mono text-foreground/80">self.THREE</span> is available. Click Run to preview →
      </div>

      <div className="flex-1 overflow-hidden bg-[#0f0f14]">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="puzzle-dark"
          defaultValue={initial.code}
          onMount={handleMount}
          onChange={(v) => { codeRef.current = v ?? ''; }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
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
    </div>
  );
}
