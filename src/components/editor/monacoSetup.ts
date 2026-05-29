/**
 * Shared Monaco bootstrap. Imported (for side effects) by every editor so they
 * agree on a single `self.MonacoEnvironment` — otherwise the last importer
 * wins and one editor loses its language worker.
 *
 * Workers are locally bundled (not CDN) — required by the app CSP and avoids
 * shipping ~8.7MB of unused workers.
 */
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

self.MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === 'json') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        { type: 'module' },
      );
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
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

export { monaco };
