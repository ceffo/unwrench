## Codebase Patterns

> This section is read by every agent iteration. Keep it up to date with patterns, gotchas, and decisions.

### Project overview
Chrome extension (Manifest V3, Chrome 120+, vanilla JS, no bundler) that marks and optionally hides generated files on GitLab MR diff pages. Source of truth: `docs/gitlab-mr-review-helper-prd.md`.

### File layout (PRD §5.1)
```
manifest.json
src/
  background.js           — MV3 service worker (minimal)
  content/
    index.js              — orchestrator, entry point
    mrContext.js          — extract projectId / sourceBranch / mrIid from page
    apiInterceptor.js     — intercept diffs_metadata.json via page-context fetch wrap
    gitattributesLoader.js — fetch + cache .gitattributes from GitLab API
    gitattributesParser.js — pure function, no browser deps, Node-testable
    fileMatcher.js         — pure function, no browser deps, Node-testable
    iconInjector.js        — inject 🔧 icons, tag with data-unwrench-icon
    fileHider.js           — detach/restore DOM nodes, tag with data-unwrench-hidden
    viewedMarker.js        — write blob SHAs to GitLab localStorage
    observer.js            — MutationObserver with 50ms debounce
    selectors.js           — ALL GitLab DOM selectors live here, nowhere else
  popup/
    popup.html / popup.js / popup.css
icons/
  icon16.png / icon48.png / icon128.png
README.md
```

### Hard constraints (break these = broken extension or CSP rejection)
- **No `eval`** anywhere. No `innerHTML` for API-derived content (NFR-13).
- **No inline scripts/styles** in popup.html (Chrome CSP blocks them).
- **All DOM selectors** in `src/content/selectors.js` only — never hardcoded inline (NFR-17).
- **`gitattributesParser.js` and `fileMatcher.js`** must have zero `chrome.*`, `document`, or `window` imports — they must run under bare `node --test` (NFR-18).
- **`apiInterceptor.js`** must inject into the **page context** (not the isolated content-script context) because GitLab's own fetch is same-origin and invisible to the content script's `window.fetch`. Use a `<script>` element injection or `chrome.scripting.executeScript` with `world: "MAIN"`. Communicate back via `window.postMessage`.
- **`chrome.storage.sync`** for toggle prefs (survives across devices/restarts). **`chrome.storage.session`** for .gitattributes cache (keyed by `${projectId}:${sourceSha}`).

### GitLab localStorage key format (PRD §5.5)
```
key:   code-review-/namespace/project/-/merge_requests/42
value: ["sha1", "sha2", ...]   (JSON array of blob SHA strings)
```

### MR context extraction (PRD §5.3)
Priority order: `window.gl.projectId` → URL parsing → `<meta name="current-branch">` → fallback API call to `GET /api/v4/projects/:id/merge_requests/:iid`.

### API rate limiting (NFR-05)
Max 1 GitLab API request per second per tab. Max 10 concurrent tree-fetch requests (NFR-04).

### MutationObserver (NFR-03)
Options: `{ childList: true, subtree: true }`. Debounce callback 50ms.

### SPA navigation (NFR-08)
GitLab is a SPA. When URL changes to a different MR, run `cleanup()` (stop observer, remove icons, restore hidden elements, clear module-level maps) then re-run full init.

### Node unit tests
```bash
node --test src/content/gitattributesParser.test.js
node --test src/content/fileMatcher.test.js
```

---

<!-- Iteration logs appended below by agents -->
