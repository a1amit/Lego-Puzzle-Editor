# Lego Puzzle Editor — Full Project Audit Report

**Date:** February 27, 2026
**Branch:** `UI_improvement`
**Stack:** React 19, TypeScript, Vite 7, Three.js/R3F, Zustand 5, Tailwind 4, Monaco Editor, Zod 4

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Security Audit (Backend Specialist)](#1-security-audit)
3. [Architecture Review (Lead Architect)](#2-architecture-review)
4. [Frontend & Accessibility Audit (Frontend Specialist)](#3-frontend--accessibility-audit)
5. [Tech Radar — Cutting-Edge Tools (Researcher)](#4-tech-radar--cutting-edge-tools)
6. [Dependency & Performance Analysis (Optimization Engineer)](#5-dependency--performance-analysis)
7. [Consolidated Findings by Severity](#consolidated-findings-by-severity)
8. [Top 10 Actionable Recommendations](#top-10-actionable-recommendations)
9. [What's Already Done Well](#whats-already-done-well)

---

## Executive Summary

Five specialist agents audited the project in parallel, covering security, architecture, frontend/UX, dependencies/performance, and cutting-edge tooling. The project has a solid foundation — clean dependency graph, excellent config centralization, proper Zod validation at boundaries, and smart lazy-loading of renderers. The key areas for improvement are: **client-side API key exposure**, **9.1MB of unnecessary Monaco workers**, **duplicated business logic** between the dual state systems, **zero mobile/accessibility support**, and several **component files exceeding 700+ lines** that need decomposition.

---

## 1. Security Audit

### FINDING 1: Client-Side API Key Exposure
**Severity: HIGH**
**File:** `src/services/ChatService.ts:30`, `.env.example:3`

The `VITE_OPENROUTER_API_KEY` env variable uses the `VITE_` prefix, which means Vite inlines it into the client-side JavaScript bundle. Anyone who opens DevTools or inspects the built JS can extract the key.

- **Line 30:** `return import.meta.env.VITE_OPENROUTER_API_KEY || null;`
- **Impact:** An attacker can steal the API key and make unlimited requests against the OpenRouter API at the key owner's expense.
- **Mitigation:**
  1. Create a lightweight backend proxy (Cloudflare Worker, Vercel serverless function, or Express endpoint) that holds the API key server-side and forwards requests.
  2. If a proxy is infeasible, use free-tier-only models (which the project already does with `:free` suffix), and set strict rate limits and spending caps on the OpenRouter dashboard.
  3. Ensure `.env` is in `.gitignore` and never commit real keys.

### FINDING 2: No Rate Limiting on Chat API Calls
**Severity: MEDIUM**
**File:** `src/services/ChatService.ts:76-112`, `src/components/ui/ChatPanel.tsx:142-168`

No throttling, debounce, or rate-limit mechanism exists. A user or automated script could fire rapid requests to OpenRouter.

- **Impact:** Denial-of-wallet if the API key has a paid plan; API abuse; potential rate-limit bans.
- **Mitigation:**
  1. Add a client-side cooldown (minimum 2-second gap between sends; disable button for duration).
  2. Track request count per session and cap it (e.g., 30 requests per 10 minutes).
  3. The `isLoading` state partially gates concurrent requests but doesn't prevent rapid sequential ones.

### FINDING 3: react-markdown with remark-gfm — Potential XSS Vector
**Severity: MEDIUM**
**File:** `src/components/ui/ChatPanel.tsx:421`

`react-markdown` v10 does NOT allow raw HTML by default (safe). No `rehypeRaw` or `dangerouslySetInnerHTML` found. However, `remark-gfm` has historically had XSS vectors through crafted markdown (malicious link URLs, image injection). Content comes from an external LLM API which could be prompt-injected.

- **Mitigation:**
  1. Add a custom `components` prop to `ReactMarkdown` that sanitizes `href` values on `<a>` tags (reject `javascript:`, `data:`, `vbscript:` protocols) and adds `rel="noopener noreferrer" target="_blank"`.
  2. Consider `rehype-sanitize` for defense-in-depth.

### FINDING 4: User Input Display — Safe
**Severity: LOW**
**File:** `src/components/ui/ChatPanel.tsx:396-406`

User messages use JSX text interpolation (not `dangerouslySetInnerHTML`). React automatically escapes content. **Safe against XSS.** However, user input is passed directly to OpenRouter without sanitization, enabling prompt injection on the AI side. Low risk since AI output is sandboxed by react-markdown.

### FINDING 5: No Content Security Policy (CSP) Headers
**Severity: MEDIUM**
**File:** `index.html`

No CSP meta tag or security headers. Without CSP, if any XSS vector is found, an attacker has unrestricted ability to load external scripts or exfiltrate data.

- **Mitigation:**
  ```html
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'self'; script-src 'self';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src https://fonts.gstatic.com;
    connect-src 'self' https://openrouter.ai;
    img-src 'self' data: blob:;">
  ```
  Note: Monaco Editor may require `'unsafe-eval'` for `script-src`.

### FINDING 6: Monaco Editor — No Code Execution Risk
**Severity: LOW (informational)**
**File:** `src/components/editor/PuzzleEditor.tsx`

Monaco is configured as JSON-only editor (`defaultLanguage="json"`). All puzzle data goes through Zod validation (`PuzzleDefinitionSchema.safeParse`). No `eval()` or `new Function()` anywhere. Well-designed.

### FINDING 7: Error Messages May Leak Internal Information
**Severity: LOW**
**File:** `src/services/ChatService.ts:54-57, 63-69`

Error messages from OpenRouter are passed through to UI. Could reveal API provider URL or model names, but these are already visible in source.

### FINDING 8: localStorage Without Schema Validation
**Severity: LOW**
**File:** `src/components/ui/ChatPanel.tsx:60-66`

Chat panel position from localStorage is parsed but not validated against a schema. `JSON.parse` is wrapped in try/catch (good). Worst case: malformed position object causing rendering issues.

### FINDING 9: Data Validation Architecture — Well Designed
**Severity: N/A (positive)**

Zod schemas validate all puzzle data at parse time. `ValidationRegistry` is well-structured. `puzzleStore` uses `PuzzleDefinitionSchema.parse()` to validate all JSON input before loading. Strong TypeScript types throughout with runtime Zod validation.

### FINDING 10: Dependency Versions — Current
**Severity: LOW**

All dependencies are recent versions. No known critical CVEs. Zod 4 is very new — monitor for early-stage bugs. Run `npm audit` periodically.

### FINDING 11: .env File Present
**Severity: LOW**

Verify `.env` is listed in `.gitignore` to prevent accidental commit.

### Security Summary Table

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Client-side API key exposure (VITE_ prefix) | **HIGH** | Needs fix |
| 2 | No rate limiting on chat API calls | **MEDIUM** | Needs fix |
| 3 | react-markdown + remark-gfm XSS risk | **MEDIUM** | Needs hardening |
| 4 | User input display (JSX escaping) | LOW | Safe |
| 5 | No CSP headers | **MEDIUM** | Needs fix |
| 6 | Monaco editor — JSON only, no code exec | LOW | Safe |
| 7 | Error message information leakage | LOW | Minor improvement |
| 8 | localStorage without schema validation | LOW | Minor improvement |
| 9 | Data validation architecture | N/A | Well designed |
| 10 | Dependency versions | LOW | Current, monitor |
| 11 | .env file exists | LOW | Verify .gitignore |

---

## 2. Architecture Review

### Dependency Flow Diagram

```
                       src/App.tsx
                      /     |     \
                     /      |      \
            PuzzleEditor  PreviewPanel  Header
            (Monaco)       /    \        |
                          /      \    puzzleCategories.ts
                  PuzzleScene  PuzzleRenderer
                  (3D/Zustand)   (Strategy Pattern)
                      |          /        \
                      |    Renderer2D    Renderer3D
                      |     (SVG)     (Three.js bridge)
                      |       |          |
                      |       |     LegoBoard + PolyominoBrick
                      |       |          |
                      v       v          v
               puzzleStore.ts    usePuzzleEngine.ts
               (Zustand, 3D)    (React hook, 2D)
                      \         /
                       \       /
                  boardFactory.ts       (shared init)
                  validationHelpers.ts  (shared enrichment)
                  engine/utils.ts       (shared pure functions)
                        |
                        v
               ValidationRegistry.ts    (singleton)
                        |
                        v
                  types/puzzle.ts       (types + data + schemas)
                        |
                        v
                  config/sceneConfig.ts (centralized magic numbers)
```

**Key observations:**
- Clean layered architecture: types -> engine -> validation -> store -> components
- No circular dependencies detected
- Mild bidirectional coupling between `engine` and `validation` (import different things)

### 2.1 Dual State System
**Verdict: Well-intentioned separation with significant duplication.**

**What works:**
- Both share `boardFactory.ts` and `validationHelpers.ts` — good DRY extraction
- `usePuzzleEngine` is truly headless (no DOM/Three.js imports)
- Type adapters cleanly bridge the two type systems

**What's concerning:**
- **Logic duplication**: `placeBrick` in store (~50 lines) and `placePiece` in engine hook (~80 lines) implement the same algorithm with different types. Same for `removeBrick`/`removePiece`, `moveBrick`/`movePiece`, `rotateBrick`/`rotatePiece`. ~200 lines of duplicated business logic.
- `calculateZLevel` and `findBricksStackedOnTop` duplicated with different types
- **Undo/redo only exists in Zustand store** — 2D puzzles have no undo support
- **Validation timing differs**: Store calls `validate()` imperatively; engine uses `useEffect` on board changes

**Recommendation (HIGH):** Store should delegate to the engine rather than reimplementing logic. Internalize engine core into a pure class, have both delegate to it, and move undo/redo to shared core.

### 2.2 God File: types/puzzle.ts (1112 lines)
**Verdict: Needs splitting. Four distinct responsibilities.**

Current contents:
- Type definitions and Zod schemas (lines 1-388)
- Shape library (lines 43-122): `SHAPE_LIBRARY` with 18+ shapes
- Puzzle definitions (lines 392-1112): 14 hardcoded puzzles
- Schema validation (Zod schemas)

**Recommendation (HIGH):** Split into:
```
src/types/
  puzzle.ts         (~200 lines) - Types, interfaces, Zod schemas only
  shapeLibrary.ts   (~100 lines) - SHAPE_LIBRARY + ShapeNameSchema
src/data/
  puzzles/
    index.ts        - Re-exports all puzzles
    coverage.ts     - DEFAULT_PUZZLE, COLORFUL_COVERAGE_PUZZLE, GRID_PUZZLE
    slider.ts       - SLIDER_PUZZLE, KLOTSKI_*, PEN_CHALLENGE
    pattern.ts      - BINARY_*, NONOGRAM_*
    templates.ts    - BLANK_PUZZLE, FIT_ALL_PUZZLE
```

### 2.3 ValidationRegistry Singleton
**Verdict: Functional with testing concerns.**

- 705-line file mixes registry pattern with 500+ lines of validator implementations
- Singleton constructed at import time — tests cannot get fresh instance
- **Recommendation (MEDIUM):** Extract validators into separate files. Export a factory `createValidationRegistry()`. Keep singleton as default export.

### 2.4 Component Bloat

**Renderer2D.tsx — 1237 lines (HIGH):**
```
renderer/2d/
  Renderer2D.tsx      (~200 lines) - Main orchestrator
  Board2D.tsx         (~200 lines) - Board grid + cell rendering
  Piece2D.tsx         (~150 lines) - Individual piece rendering
  NonogramHints.tsx   (~100 lines) - Hint number rendering
  GoalOverlay2D.tsx   (~80 lines)  - Goal area visualization
  interactions2D.ts   (~150 lines) - Click/drag handlers (custom hook)
  styles2D.ts         (~100 lines) - SVG style calculations
```

**PuzzleScene.tsx — 746 lines (MEDIUM):** Extract `GoalIndicator3D`, `GhostBrickPreview`, and interaction handlers.

### 2.5 Barrel Files — Minimal and Helpful
Two barrel files exist, both well-structured. No deep chains. No issues.

### 2.6 Config Management — Excellent
`sceneConfig.ts` is cleanly sectioned (SCENE_3D, BRICK_3D, BOARD_3D, ANIMATION_3D, COLORS, SCENE_2D, CONFETTI). No scattered magic numbers found in components.

### 2.7 Scalability

| Scenario | Difficulty |
|----------|-----------|
| Add 50 more puzzles | **LOW** (with types/puzzle.ts split) |
| Add multiplayer | **HIGH** (needs server state, action serialization, server-side validation) |

### Architecture Summary

| # | Refactoring | Priority | Effort | Impact |
|---|-------------|----------|--------|--------|
| 1 | Split types/puzzle.ts | HIGH | Medium | Scalability, maintainability |
| 2 | Unify dual state logic | HIGH | High | Eliminates ~200 lines duplication, gives 2D undo/redo |
| 3 | Decompose Renderer2D.tsx | HIGH | Medium | Maintainability, testability |
| 4 | Extract validator implementations | MEDIUM | Low | Testability, organization |
| 5 | Decompose PuzzleScene.tsx | MEDIUM | Medium | Maintainability |
| 6 | Add action serialization (command pattern) | LOW | High | Enables multiplayer, replay |
| 7 | Move undo/redo to shared engine | MEDIUM | Medium | Feature parity 2D/3D |

---

## 3. Frontend & Accessibility Audit

### 3.1 State Management

**Zustand Store (puzzleStore.ts):**
- Flat store with ~20+ state fields and ~15 actions
- Some components use selectors properly (`App.tsx:122`)
- `InventoryPanel.tsx:116` destructures the entire store — re-renders on ANY state change
- **Recommendation:** Use `usePuzzleStore(s => s.puzzle)` selectors or Zustand's `useShallow`

**Undo/Redo:** Snapshot-based with `MAX_UNDO_HISTORY=50`. Keyboard shortcuts properly set up with input-element exclusion. Works in 3D only — 2D engine lacks undo/redo.

**Stale Closure Risk:** `setActionError` uses `setTimeout` to clear after 3s. Rapid errors could clear prematurely. Sonner toasts mitigate this for UX.

### 3.2 Component Decomposition Needed

| File | Lines | Recommendation |
|------|-------|----------------|
| Renderer2D.tsx | 1,237 | Split into 5-7 files (HIGH) |
| InstructionsModal.tsx | 729 | Extract 6 tab content components into `instructions/` folder (MEDIUM) |
| ChatPanel.tsx | 428 | Extract drag logic into `useDraggable` hook (LOW) |

### 3.3 Accessibility — Critical Gaps

**3D Renderer — Zero Accessibility (HIGH):**
- `Renderer3D.tsx` has zero ARIA attributes
- Three.js Canvas has no accessible alternative content
- Screen readers see nothing
- No fallback text description of board state

**2D Grid — No Keyboard Navigation (HIGH):**
- SVG board has `role="grid"` and `aria-label` (good)
- Individual cells lack `role="gridcell"` or `aria-label`
- No arrow-key cell navigation
- Grid cells use mouse events only (`onClick`, `onMouseEnter`, `onMouseLeave`)
- No `onFocus`/`onBlur` or `tabIndex`

**Chat Panel (MEDIUM):**
- Close button has `aria-label="Close chat"` (good)
- Message list missing `role="log"` or `aria-live="polite"`
- Suggestion buttons lack descriptive aria-labels

**Color Contrast (MEDIUM):**
- `rgba(255,255,255,0.25)` "2D View" text likely below WCAG AA 3:1 minimum
- Muted-foreground is borderline AA at ~4.5:1

### 3.4 Responsive Design — Desktop Only

**ResizablePanels — Mouse Only (HIGH):**
- Uses only `onMouseDown`, `mousemove`, `mouseup`
- No touch event support — completely non-functional on mobile/tablet

**Fixed Layout (HIGH):**
- `App.tsx:153` sets `h-screen w-screen overflow-hidden`
- Chat panel uses fixed pixel-based positioning
- Inventory panel has hardcoded `min-w-[320px]`
- No responsive breakpoints or mobile layout adjustments

**Dynamic Cell Sizing (positive):** `Renderer2D.tsx:783-808` uses ResizeObserver — well-implemented.

### 3.5 Animation
- CSS keyframe animations used throughout (not JS animation library) — appropriate and lightweight
- Confetti uses `useMemo` for pre-computed positions — avoids re-render flicker
- SVG inline `<style>` in defs could be moved to global CSS

### 3.6 2D/3D Mode Switching
- View mode determined by puzzle definition, not user-switchable
- Lazy loading via `lazy()` code-splits renderers — well done
- No state transfer when switching puzzles between modes (by design)

### 3.7 Loading States
- **3D:** `<Suspense fallback={null}>` — no loading indicator while meshes load (MEDIUM)
- **Chat:** Proper loading dots animation (good)

### 3.8 Performance Issues
- **Console.log in production (MEDIUM):** 12+ `console.log` calls in Renderer2D click handlers
- **Inline computation (MEDIUM):** `getValidSlideDestinations` called for EVERY piece on EVERY render, not just selected piece
- **No React.memo (MEDIUM):** `GridCell` and `Piece2D` not memoized — all re-render on hover
- **SVG filter performance (LOW):** 8+ SVG filters applied per piece, no adaptive quality for 2D (3D has this)

### Frontend Summary by Severity

**HIGH:** Renderer2D decomposition, zero 3D accessibility, no keyboard navigation, no touch support, no mobile layout

**MEDIUM:** Store selectors, console.log in production, 3D loading fallback null, InstructionsModal decomposition, chat ARIA, color contrast, inline getValidSlideDestinations

**LOW:** Dual state bridge fragility, no 2D undo/redo, inline SVG styles, setActionError timer, SVG filter performance

---

## 4. Tech Radar — Cutting-Edge Tools

### 4.1 Monaco Editor Alternatives

**Top Recommendation: CodeMirror 6 + @uiw/react-codemirror**
- **npm:** `@uiw/react-codemirror`
- **Bundle:** ~1.26MB vs Monaco's ~5MB — **75% reduction**
- **Core only:** ~300KB
- **Why:** Monaco is the heaviest single dependency. CodeMirror 6's modular architecture imports only what you need. Sourcegraph migrated from Monaco to CodeMirror for this reason.

**Lightweight option:** `react-simple-code-editor` — if only basic syntax highlighting is needed.

### 4.2 R3F / Three.js Ecosystem (2025-2026)

**Three.js WebGPU Renderer (production-ready since r171):**
- `import * as THREE from 'three/webgpu'`
- Auto-fallback to WebGL 2 on older browsers
- Up to 50% performance improvement
- TSL (Three Shader Language): JS-based shaders compiling to both WGSL and GLSL

**@react-three/rapier v2.2.0:** Physics engine for piece snapping, collision detection. Supports R3F v9 + React 19. SIMD-accelerated.

**r3f-perf v7.2.1:** Drop-in performance monitor. Shows FPS, draw calls, triangles, textures. Just add `<Perf />` inside Canvas.

**@react-three/a11y v3.0.0:** Only library for WebGL/R3F accessibility. Keyboard tab navigation, screen reader descriptions, focus indication. May need compatibility testing with R3F v9.

### 4.3 State Management Innovations

**Zustand 5 Optimization (already in project):**
- `subscribeWithSelector` middleware: listen to specific slices, prevent cross-renderer re-renders
- `immer` middleware: mutable-style updates with immutability

**React 19 `use()` + Suspense:** Replace `useEffect`-based data fetching for puzzle loading and chat responses.

**React 19 Activity Component (experimental):** "Deactivate" components without unmounting — preserve 2D/3D renderer state during switches.

### 4.4 WebGL Profiling & Debugging

| Tool | What it does |
|------|-------------|
| **Spector.js** | Full WebGL frame traces — draw calls, state changes, shaders |
| **webgl-tools** | GPU timers, memory tracking, draw analysis, HTML report export |
| **Figma's WebGL Profiler** | GPU-side profiling via `EXT_disjoint_timer_query` |
| **r3f-perf** | Easiest option — in-app FPS/draw-call monitor |

### 4.5 Animation Alternatives

- **Keep `motion` for complex orchestrated animations** (but the optimizer found it's unused — remove it)
- **CSS animations for simple transitions** — Tailwind 4 animation utilities make this easy
- **GSAP** — if scroll-linked or complex timeline animations are needed later

### 4.6 Vite Build Optimizations

**React Compiler v1.0 (`babel-plugin-react-compiler`):**
- Released October 2025
- Automatic memoization — eliminates need for useMemo/useCallback/memo
- Up to 12% faster loads, 2.5x quicker interactions
- Zero code changes needed

**vite-plugin-glsl v1.5.1+:** Import/inline GLSL/WGSL shader files with minification at build time.

**Three.js Tree Shaking:** Switch `import * as THREE` to named imports where possible.

### 4.7 Ecosystem Updates for Existing Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| Zod 4 (4.3.6) | Already on latest | 14x faster string parsing, 57% smaller bundle vs Zod 3 |
| Tailwind 4 (4.2.1) | Already on latest | Oxide engine (Rust), 3.5-5x faster builds |
| shadcn/ui | Current | New `radix-ui` unified package, Base UI support (Feb 2026) |

### Tech Radar Priority Recommendations

1. **React Compiler v1.0** — easiest win, automatic memoization, ~12% perf improvement
2. **Replace Monaco with CodeMirror 6** — largest bundle reduction (~75%)
3. **Three.js WebGPU Renderer** — change one import for up to 50% rendering boost
4. **r3f-perf** — zero-effort performance monitoring during development
5. **Zustand subscribeWithSelector** — prevent cross-renderer re-renders
6. **CSS animations for simple transitions** — keep motion only for complex interactions
7. **@react-three/a11y** — keyboard nav + screen reader support for 3D scenes

---

## 5. Dependency & Performance Analysis

### 5.1 Dependency Audit

| Dependency | Severity | Finding |
|-----------|----------|---------|
| `motion` (^12.34.3) | **HIGH** | **Completely unused** — zero imports in src/. Remove it. |
| `radix-ui` (^1.4.3) | MEDIUM | Meta-package pulls 30+ sub-packages. Only 9 used. Tree-shaking handles it. |
| `autoprefixer` + `postcss` | LOW | Potentially unnecessary with Tailwind v4's `@tailwindcss/vite` plugin. |
| `react-markdown` + remark-* | LOW | Three packages for single chat panel component. |
| `postprocessing` | LOW | Required peer dep of `@react-three/postprocessing`. Not redundant. |
| `zod`, `@vercel/analytics`, `lucide-react`, `clsx`, `cva`, `tailwind-merge` | NONE | All properly used, well tree-shaken. |

### 5.2 Production Build Analysis

| Chunk | Size (raw) | Size (gzip) |
|-------|-----------|-------------|
| `vendor-three` (Three.js + R3F + Drei) | **1,232 KB** | 353 KB |
| `index` (app code + all unsplit deps) | **551 KB** | 161 KB |
| `vendor-utils` (Zustand + Zod) | 77 KB | 22 KB |
| `vendor-monaco` (Monaco wrapper) | 14 KB | 5 KB |
| `Renderer2D` (lazy) | 18 KB | 6 KB |
| `Renderer3D` (lazy) | 7 KB | 3 KB |
| `vendor-react` | **0 KB (EMPTY!)** | - |
| **Monaco Workers** (total) | **9,116 KB** | - |

**Critical findings:**

**`vendor-react` chunk is EMPTY (HIGH):** React is bundled into the `index` chunk instead of being split. Fix with function-based `manualChunks`:
```js
manualChunks(id) {
  if (id.includes('node_modules/react-dom')) return 'vendor-react';
  if (id.includes('node_modules/react/')) return 'vendor-react';
  if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'vendor-three';
  if (id.includes('node_modules/monaco-editor')) return 'vendor-monaco';
}
```

**Monaco Workers = 9.1MB (HIGH):** Four workers loaded when only JSON is needed:
- `ts.worker`: 7,010 KB (TypeScript — not needed)
- `css.worker`: 1,030 KB (CSS — not needed)
- `html.worker`: 693 KB (HTML — not needed)
- `json.worker`: 383 KB (JSON — **this is the only one needed**)

Restricting to JSON-only saves ~8.7MB.

**Three.js at 1.2MB (MEDIUM):** Expected for Three.js + R3F + Drei. Uses `import * as THREE` in 4 files which prevents tree-shaking. Switch to named imports for modest savings (~50-100KB).

### 5.3 Performance Analysis

**FloatingPreviewBrick — 60fps React Re-renders (MEDIUM):**
`PuzzleScene.tsx:179` — `setWorldPosition(target.clone())` in `useFrame` triggers React state updates every frame when pointer moves. Use a `ref` instead:
```ts
useFrame(() => {
  if (result && groupRef.current) {
    groupRef.current.position.set(posX, 0.5, posZ);
  }
});
```

**Renderer2D — No React.memo (MEDIUM):**
`GridCell` and `Piece2D` are not memoized. On an 8x8 board = 64 components; 20x20 = 400 components, all re-rendering on hover. Wrap in `React.memo` with stable props.

**Double State Updates Per Action (MEDIUM):**
`puzzleStore.validate()` causes a second `set()` call after every board mutation (6 action types). Combine into single `set()`:
```ts
// Instead of two set() calls:
// set({ boardState: newState }); get().validate();
// Do one:
const results = ValidationRegistry.validate(newState, rules);
set({ boardState: newState, validationResults: results, isComplete: ... });
```

**hoveredCell at Mouse-Move Frequency (MEDIUM):**
`hoveredCell` and `setHoveredCell` trigger store updates on every mouse move, causing all subscribers to re-render. Move to a separate store slice or use `useRef`.

**Three.js Memory — No .dispose() Calls (MEDIUM):**
No explicit disposal found. R3F auto-disposes JSX-created objects, but imperatively created objects (`new THREE.Color()` in `useMemo`) are not auto-disposed. Low risk for small objects, but monitor GPU memory for large boards.

**getValidSlideDestinations — 4x Recomputation (LOW):**
Calls `getAllOccupiedCells` once per direction (4 times). Compute occupied cells once and pass as parameter.

### 5.4 Vite Config Issues

Current `manualChunks` (BROKEN):
```js
manualChunks: {
  'vendor-react': ['react', 'react-dom'],        // PRODUCES EMPTY CHUNK
  'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
  'vendor-monaco': ['monaco-editor', '@monaco-editor/react'],
  'vendor-utils': ['zustand', 'zod'],
}
```

**Recommendations:**
1. Fix with function-based `manualChunks` (see 5.2)
2. Add `postprocessing` to `vendor-three` chunk
3. Lazy-load Monaco editor (not all users edit JSON)
4. Renderers already lazy-loaded via `PuzzleRenderer.tsx` — well done

### 5.5 tsconfig
Solid config. `strict: true`, `noUnusedLocals`, `noUnusedParameters` enabled. Consider upgrading `target` from `ES2020` to `ES2022` for slightly smaller output (native class fields, top-level await).

---

## Consolidated Findings by Severity

### HIGH (12 findings)

| # | Finding | Source |
|---|---------|--------|
| 1 | Client-side API key exposure (VITE_ prefix) | Security |
| 2 | Monaco workers = 9.1MB (only JSON needed) | Optimization |
| 3 | `vendor-react` chunk is empty — React not cached separately | Optimization |
| 4 | `motion` package completely unused | Optimization |
| 5 | ~200 lines duplicated business logic in dual state systems | Architecture |
| 6 | `types/puzzle.ts` is 1112-line god file | Architecture |
| 7 | `Renderer2D.tsx` is 1237 lines — needs decomposition | Architecture + Frontend |
| 8 | No touch/mobile support (ResizablePanels, chat, grid) | Frontend |
| 9 | Zero accessibility in 3D renderer | Frontend |
| 10 | No keyboard cell navigation in 2D grid | Frontend |
| 11 | No mobile layout — fixed desktop-only viewport | Frontend |
| 12 | `InventoryPanel` destructures entire store (re-renders on any change) | Frontend |

### MEDIUM (13 findings)

| # | Finding | Source |
|---|---------|--------|
| 1 | No rate limiting on chat API calls | Security |
| 2 | react-markdown + remark-gfm XSS risk (link URLs) | Security |
| 3 | No CSP headers | Security |
| 4 | `radix-ui` unified package pulls 30+ sub-packages | Optimization |
| 5 | FloatingPreviewBrick triggers React re-renders at 60fps | Optimization |
| 6 | GridCell/Piece2D lack React.memo — excessive re-renders | Optimization |
| 7 | Double state updates per action (validate causes second set()) | Optimization |
| 8 | No .dispose() calls for Three.js resources | Optimization |
| 9 | 3D loading fallback is null — no spinner | Frontend |
| 10 | InstructionsModal has 6 tab components in 729 lines | Frontend |
| 11 | Console.log statements in production click handlers | Frontend |
| 12 | Color contrast below WCAG AA for some elements | Frontend |
| 13 | Chat panel missing aria-live region | Frontend |

### LOW (10 findings)

| # | Finding | Source |
|---|---------|--------|
| 1 | Error message information leakage | Security |
| 2 | localStorage without schema validation | Security |
| 3 | autoprefixer/postcss potentially unnecessary | Optimization |
| 4 | react-markdown + remark for single component | Optimization |
| 5 | getValidSlideDestinations rebuilds cell map 4x | Optimization |
| 6 | tsconfig target could be ES2022 | Optimization |
| 7 | No undo/redo in 2D engine | Frontend |
| 8 | SVG inline styles could be global CSS | Frontend |
| 9 | Stale closure risk in setActionError timer | Frontend |
| 10 | SVG filter performance on large 2D boards | Frontend |

---

## Top 10 Actionable Recommendations

### 1. Move API Key Server-Side
Create a Cloudflare Worker / Vercel serverless proxy. Removes the single biggest security risk. **[Security, HIGH]**

### 2. Fix Monaco Worker Bloat (save ~8.7MB)
Restrict Monaco to JSON worker only. The editor only needs JSON language support. **[Performance, HIGH]**

### 3. Fix `vendor-react` Chunk Splitting
Switch to function-based `manualChunks` in `vite.config.ts` to properly separate React from app code. **[Performance, HIGH]**

### 4. Add React Compiler v1.0
Add `babel-plugin-react-compiler` to Vite config — automatic memoization across the app, ~12% performance improvement, zero code changes. **[Performance, HIGH]**

### 5. Unify Dual State Logic
Make `puzzleStore` delegate to the engine core instead of reimplementing `placeBrick`/`removeBrick`. Eliminates ~200 lines of duplication and gives 2D puzzles undo/redo. **[Architecture, HIGH]**

### 6. Split `types/puzzle.ts`
Separate into: `types/puzzle.ts` (types only), `data/shapeLibrary.ts`, and `data/puzzles/*.ts` (one file per category). **[Architecture, HIGH]**

### 7. Decompose `Renderer2D.tsx`
Extract `Piece2D`, `NonogramHints`, `GoalOverlay2D`, edge-calculation utils, and interaction hooks into separate files. **[Architecture, HIGH]**

### 8. Remove `motion` Dependency
Zero imports found anywhere in `src/`. Delete from `package.json`. **[Dependencies, HIGH]**

### 9. Add Content Security Policy
Add CSP meta tag to `index.html` restricting script/connect sources. **[Security, MEDIUM]**

### 10. Consider CodeMirror 6 Migration
Replace Monaco Editor with `@uiw/react-codemirror` for ~75% bundle size reduction (~5MB to ~1.3MB). **[Performance, MEDIUM]**

---

## What's Already Done Well

- **Clean dependency graph** — no circular dependencies, strict downward import flow
- **Excellent config centralization** — `sceneConfig.ts` with no scattered magic numbers
- **Strategy pattern + lazy loading** — `PuzzleRenderer` code-splits 2D/3D renderers
- **Zod validation at all data boundaries** — runtime type safety with `PuzzleDefinitionSchema`
- **Adaptive 3D performance** — disables effects for large boards (400+ cells)
- **Headless engine design** — `usePuzzleEngine` has zero rendering imports
- **CSS-only animations** — no unnecessary JS animation runtime
- **React JSX escaping** — prevents XSS in user content display
- **Shared modules** — `boardFactory`, `validationHelpers` reduce duplication
- **Well-structured barrel files** — minimal, no deep chains
- **Proper input validation** — Monaco restricted to JSON, Zod validates before loading
- **Good error UX** — Sonner toast integration, inline chat errors, parse error display
- **Confetti pre-computation** — `useMemo` for random positions avoids render flicker
- **3D adaptive rendering** — DPR reduction, shadow simplification for large boards
