# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **No bundler**: All JS is vanilla ES modules loaded directly by Chrome. `import` paths must be relative (e.g. `./selectors.js`), not bare specifiers.
- **Page-context injection**: `apiInterceptor.js` creates a `<script>` element and immediately removes it — the only way to wrap `window.fetch` in the page context from a content script.
- **Pure modules for testing**: `gitattributesParser.js` and `fileMatcher.js` have zero browser/DOM imports so they can be `node --test`ed directly.
- **Single selector file**: All GitLab DOM selectors live exclusively in `src/content/selectors.js` — never inline them in other modules.
- **chrome.storage.session** (not `localStorage`) for per-session `.gitattributes` cache — survives tab navigations but clears on browser restart.

---

## 2026-04-26 - unw-0bz.1
- What was implemented: Full project scaffold — manifest.json (MV3), all 11 content script modules, popup (HTML/JS/CSS), background service worker, 3 placeholder PNG icons, README.md skeleton.
- Files changed: `manifest.json`, `src/background.js`, `src/content/index.js`, `mrContext.js`, `apiInterceptor.js`, `gitattributesLoader.js`, `gitattributesParser.js`, `fileMatcher.js`, `iconInjector.js`, `fileHider.js`, `viewedMarker.js`, `observer.js`, `selectors.js`, `src/popup/popup.html`, `popup.js`, `popup.css`, `icons/icon{16,48,128}.png`, `README.md`
- **Learnings:**
  - MV3 background service worker cannot use `chrome.tabs` without the `tabs` permission — used `tabs` query in background only to relay storage changes; check if `tabs` permission is needed at manifest level (currently not declared — will need to add if background tab relay is required).
  - PNG icons must be valid binary PNG; generated programmatically with Python/zlib since no image editor available in this env.
  - `br sync --flush-only` reported "nothing to export" after `br close` — likely because the close already wrote to JSONL. This is normal.
---

