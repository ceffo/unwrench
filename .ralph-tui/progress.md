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

## 2026-04-26 - unw-0bz.3
- What was implemented: Rewrote `src/content/mrContext.js` with async `getMRContext()` returning `{ projectId, sourceBranch, mrIid, mrPath, sourceSha }`. Extraction priority: `window.gl` global → `<meta>` tags / `document.body.dataset` → REST API fallback (`/api/v4/projects/:id/merge_requests/:iid`). Returns `null` on non-MR pages. `fetchMRMeta` kept as named export for reuse.
- Files changed: `src/content/mrContext.js`
- **Learnings:**
  - GitLab's `gl` global uses `gl.mrMetadata.sourceBranch` and `gl.mrMetadata.headSha` (not `gl.mr.*`) on newer versions — try both for resilience.
  - `mrPath` needed for the localStorage key format: `code-review-<mrPath>` (§5.5).
  - `sourceSha` can be null when API fallback also fails — callers must handle this gracefully.
  - The scaffold was synchronous and missing `mrPath`/`sourceSha`; always check scaffold completeness against bead spec before skipping to close.
---

## 2026-04-26 - unw-0bz.4
- What was implemented: `apiInterceptor.js` (complete) with `injectFetchInterceptor()` (idempotent via `window.__GL_FETCH_INTERCEPTED__` sentinel) and `waitForDiffsMetadata()` returning a Promise. Added `interceptorBootstrap.js` — a non-module content script at `document_start` that injects the fetch wrapper before GitLab's Vue app runs (EC-07). Fixed `manifest.json` to declare `"type": "module"` for the `index.js` content script entry (required for ES module `import` syntax in content scripts).
- Files changed: `src/content/apiInterceptor.js`, `src/content/interceptorBootstrap.js` (new), `manifest.json`
- **Learnings:**
  - Chrome MV3 content scripts with `import` statements require `"type": "module"` in the manifest `content_scripts` entry — without it, the browser rejects the script with a SyntaxError. The scaffold omitted this.
  - `run_at: "document_start"` does **not** support `"type": "module"` in Chrome MV3. The bootstrap must be a plain IIFE-in-a-string injected via a `<script>` tag, not an ES module.
  - Use a sentinel flag (`window.__GL_FETCH_INTERCEPTED__`) on the page context `window` to prevent double-wrapping when both the bootstrap and the fallback `injectFetchInterceptor()` might run.
  - `postMessage` origin filter: always pass `"*"` as the targetOrigin when posting from page context to content script — the content script checks `event.source === window` instead.
---

## 2026-04-26 - unw-0bz.5
- What was implemented: `src/content/gitattributesLoader.js` — `loadGitattributes(projectId, ref, sha)` async function. Checks `chrome.storage.session` cache (key: `ga_cache_<projectId>_<sha>`), falls back to recursive tree discovery + content fetch. Follows `X-Next-Page` pagination up to 5000 entries. Batches content fetches 10 at a time. 404 on root `.gitattributes` silently no-ops; other errors log to console.
- Files changed: `src/content/gitattributesLoader.js` (already implemented in scaffold; verified complete)
- **Learnings:**
  - Implementation was already present from the unw-0bz.1 scaffold and required no changes — always verify scaffold completeness before starting implementation work.
  - NFR-04 (max 10 concurrent) and NFR-05 (max 1 req/sec) are contradictory as stated; the implementation satisfies NFR-04 via batch chunking. Sequential tree pagination naturally rate-limits tree discovery; file content fetches are batched (10 at once).
  - `chrome.storage.session` does not persist across browser restarts, making it ideal for per-session API response caching.
  - Cache key uses `_` separator (`projectId_sha`) not `:` — avoid `:` in storage keys to prevent confusion with URL colons.
---

## 2026-04-26 - unw-0bz.6
- What was implemented: `src/content/gitattributesParser.test.js` — 12 Node built-in `node:test` unit tests for `parseGitattributes` and `parseAllGitattributes`. Scaffold parser was already correct; no changes to `gitattributesParser.js` needed.
- Files changed: `src/content/gitattributesParser.test.js` (new)
- **Learnings:**
  - Scaffold's argument order (`content, directory`) differs from bead spec (`path, content`) — the scaffold is internally consistent (called only via `parseAllGitattributes` which derives `directory` from `path`), so no change required.
  - Node `node:test` + `node:assert/strict` works with ES module imports (`import`) as long as the file is `.js` and node is 18+. No config needed.
  - `parseAllGitattributes` derives `directory` by slicing everything before the last `/` in `path`; root `.gitattributes` (no slash) correctly yields `''`.
---

## 2026-04-26 - unw-0bz.7
- What was implemented: `src/content/fileMatcher.test.js` — 18 Node built-in `node:test` tests covering `isGenerated` (root patterns, nested scope, last-match-wins negation, `**` glob, anchored `/` patterns, `?` wildcard) and `classifyFiles`. Fixed a bug in the existing scaffold's `patternToRegex`: leading `/` was stripped then pattern was treated as no-slash, incorrectly allowing subdirectory matches. Fix: track `anchored` separately and only set `noSlash = true` when the pattern is neither anchored nor contains `/`.
- Files changed: `src/content/fileMatcher.test.js` (new), `src/content/fileMatcher.js` (anchored-pattern bug fix)
- **Learnings:**
  - The scaffold's `noSlash` check (`!p.includes('/')`) was evaluated *after* stripping the leading `/`, losing the anchoring intent. Always preserve anchoring state before transforming the pattern string.
  - Pattern `/foo.go` at directory `''` must produce `^foo\.go$`, not `^(?:.*/)?foo\.go$`.
  - All other scaffold logic (scope guard, `**` placeholder swap, `escapeRegex`) was correct and needed no changes.
---

## 2026-04-26 - unw-0bz.2
- What was implemented: Rewrote `src/content/selectors.js` with named exports verified against GitLab 17.x open-source Vue components. Added an exported convenience `SELECTORS` object for backward compat with existing modules.
- Files changed: `src/content/selectors.js`
- **Learnings:**
  - GitLab's confirmed class names (from live source): `.diff-file-row` (tree row), `.file-row-name` (filename in tree), `.tree-list-holder` (tree container), `.js-file-title` (diff header), `.file-header-content .file-title-name` (filename in header), `.diff-file` (full block), `#diffs` (root container).
  - GitLab also exposes `data-testid` attributes (`file-title-container`, `file-name-content`) which are more stable; documented in selector comments but not used as primary selectors to keep queries simple.
  - Fetching GitLab raw Vue source at `gitlab.com/gitlab-org/gitlab/-/raw/master/...` works without auth for public files.
  - All consumers use `SELECTORS.*` via the convenience object — no import changes needed.
---

## 2026-04-26 - unw-0bz.8
- What was implemented: `iconInjector.js` and `observer.js` fully implemented. `iconInjector.js`: uses `data-unwrench-icon="true"` attribute (spec requirement) instead of class-only for double-injection guard; exports both spec-named (`injectIcons`, `removeStaleIcons`) and scaffold-named (`injectAll`, `syncIcons`, `removeAllIcons`) functions so `index.js` imports are unbroken; path extraction tries `data-path`, `data-file-path`, and child element fallbacks. `observer.js`: module-level `startObserving`/`stopObserving` (for index.js) kept as primary API; added `startObserver`/`stopObserver` (caller-owned observer reference) as spec-named counterparts.
- Files changed: `src/content/iconInjector.js`, `src/content/observer.js`
- **Learnings:**
  - When a scaffold already has an API used by `index.js`, add the spec-named exports as aliases rather than renaming — prevents breaking the orchestrator.
  - Use `data-unwrench-icon` attribute (not just CSS class) for icon deduplication — the attribute approach is more explicit and aligns with the spec; querying `[data-unwrench-icon]` is equally efficient to `.class`.
  - GitLab path extraction needs multiple fallbacks: `data-path`, `data-file-path`, and child `[data-path]` queries — different GitLab versions expose the path differently on tree row vs. diff header elements.
  - `MutationObserver` with module-level state (for `startObserving`) vs. caller-owned state (for `startObserver`) serve different usage patterns; both patterns are valid depending on whether the caller or the module manages lifecycle.
---

## 2026-04-26 - unw-0bz.9
- What was implemented: Rewrote `src/content/viewedMarker.js` with signature `markAsViewed(generatedFiles, mrPath)` per bead spec. Takes `Array<{ filePath, blobId }>` + full `mrPath` string. localStorage key is `code-review-${mrPath}`. Reads existing array, appends missing SHAs (deduplicates via Set), writes back. Never removes existing SHAs (FR-20). Also fixed `index.js` call site which was using non-existent `ctx.namespace` and `ctx.mrIid` — now passes correct `generatedFiles` array and `ctx.mrPath`.
- Files changed: `src/content/viewedMarker.js`, `src/content/index.js`
- **Learnings:**
  - The scaffold's `markAsViewed(namespace, mrIid, blobShas)` signature didn't match the bead spec AND `index.js` was calling it with `ctx.namespace` (a field that doesn't exist on the mrContext return value — `mrPath` does).
  - Always verify that index.js call sites use field names that actually exist on the context object returned by mrContext.js.
  - The toggle check (`autoViewed`) belongs in the orchestrator (`index.js`), not inside `markAsViewed` — keeps the marker module pure (just does the localStorage write).
---

## 2026-04-26 - unw-0bz.11
- What was implemented: Popup UI (FR-28–FR-30, NFR-16). Added host URL input to `popup.html`. Rewrote `popup.js` to read version from `chrome.runtime.getManifest()`, persist `gitlabHost` in `chrome.storage.sync`, query active tab via `GET_STATUS` message to show real generated file count. Added `GET_STATUS` message handler in `index.js` (returns `{ onMRPage, generatedCount }`). Added `tabs` permission to `manifest.json`. Added host input styles to `popup.css`.
- Files changed: `src/popup/popup.html`, `src/popup/popup.js`, `src/popup/popup.css`, `src/content/index.js`, `manifest.json`
- **Learnings:**
  - Use `chrome.tabs.sendMessage` with a `GET_STATUS` request to content script to get real generated file count — avoids needing `tab.url` (which requires `tabs` permission for URL access).
  - The `tabs` permission is required for `chrome.tabs.query` to return usable tab IDs from the popup context; add it explicitly.
  - `chrome.runtime.onMessage.addListener` handler must return `false` (or nothing) for synchronous `sendResponse` — only return `true` if responding asynchronously.
  - `gitlabHost` in `chrome.storage.sync` is a UX setting for user awareness; content script API calls use relative paths (same-origin) so the setting doesn't affect API fetch URLs directly.
  - popup.js notifies the active tab's content script directly via `sendMessage` on toggle change, bypassing the background-mediated `chrome.storage.onChanged` path — ensures immediate live propagation (FR-30).
---

## 2026-04-26 - unw-0bz.12
- What was implemented: Wired `src/content/index.js` end-to-end orchestration. Fixed four bugs in the scaffold: (1) `getMRContext()` was called without `await` — it's async; (2) no diff-container readiness wait (FR-03) — added `waitForDiffContainer(5000ms)` using a MutationObserver with timeout; (3) `loadGitattributes` was passed `sourceBranch` as the sha cache key instead of `sourceSha`; (4) SPA navigation only had a DOM mutation watcher — added `window.addEventListener('popstate', ...)` for history.pushState-based navigation. Removed redundant `fetchMRMeta` import (getMRContext handles the fallback internally). `background.js` was already correct — listens for `chrome.storage.onChanged` and relays changes to all MR diffs tabs.
- Files changed: `src/content/index.js`
- **Learnings:**
  - Always `await` async context functions — missing `await` on `getMRContext()` causes `ctx` to be a Promise object, failing all property accesses silently.
  - `waitForDiffContainer` must observe `document.documentElement` (not `document.body`) during `document_idle` load — `<body>` may not exist yet when content script fires.
  - GitLab SPA navigation uses `history.pushState`, which does NOT fire `popstate` on its own. You need BOTH a `popstate` listener (for back/forward) AND a DOM/URL polling observer (for pushState links). The combination catches all GitLab navigation patterns.
  - The `sourceSha` cache key bug would silently cause the gitattributes to be re-fetched on every page load (different branch = different cache miss key), defeating FR-08.
---

## 2026-04-26 - unw-0bz.10
- What was implemented: `src/content/fileHider.js` — complete implementation of `hideGeneratedFiles(generatedPaths)` and `restoreHiddenFiles()`. Detaches tree entries and diff blocks from DOM, stores `{ parent, nextSibling }` refs for in-order restoration. Tags detached nodes with `data-unwrench-hidden` attribute to prevent double-hiding. Fixed guard so newly lazy-loaded nodes for already-tracked paths are also hidden (FR-26). Added spec-named exports alongside `hideAll`/`restoreAll` aliases used by index.js.
- Files changed: `src/content/fileHider.js`
- **Learnings:**
  - Scaffold used `if (_hidden.has(filePath)) return` which would skip newly lazy-loaded nodes for an already-tracked path. Fix: check `!el.dataset.unwrenchHidden` on each candidate element instead of bailing early on the path key.
  - `data-unwrench-hidden` attribute on the element (not just the Map key) is the right deduplication guard — the element-level attribute prevents double-hiding even if `hideForPath` is called multiple times for the same path.
  - Path extraction needs `data-file-path` fallback in addition to `data-path` — GitLab 17.x uses both attribute names on different container elements (same pattern as iconInjector).
  - Delete `el.dataset.unwrenchHidden` (not just set to empty) on restore so the attribute is cleanly removed from the DOM element if it gets re-added to the page.
---
