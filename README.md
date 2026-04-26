# GitLab MR Review Helper

A Chrome extension (Manifest V3, Chrome 120+) that improves the GitLab MR review workflow by detecting generated files via `.gitattributes` and reducing noise in the diff view.

## Features

- **Wrench icon markers**: Injects a 🔧 icon next to every generated file in the file tree sidebar and diff headers so you can immediately identify generated noise.
- **Auto-mark as Viewed** toggle: Writes the blob SHAs of generated files into GitLab's `localStorage` Viewed list so GitLab collapses them automatically when you open any MR.
- **Hide generated files** toggle: Completely removes generated file entries from the file tree and diff view, leaving only the files that matter for review.
- **Self-hosted GitLab support**: Works on any GitLab instance (15.0+), not just `gitlab.com`.
- **Persistent settings**: Toggle state syncs across devices via `chrome.storage.sync`.

---

## Setup

### Requirements

- Chrome 120 or later
- GitLab 15.0 or later (self-hosted or gitlab.com)

### Loading the unpacked extension in Chrome

1. Clone or download this repository.
2. Open **`chrome://extensions`** in Chrome.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the repository root (the directory that contains `manifest.json`).
5. The extension icon appears in the toolbar. Click it to open the popup and configure settings.

**After any source file change:** click the reload button (↺) on the extension card at `chrome://extensions`, then reload the GitLab MR tab.

---

## Configuring a self-hosted GitLab instance

No extra configuration is required. The extension uses `<all_urls>` host permissions and makes all API calls via relative paths (same-origin), so it activates automatically on any GitLab instance you are browsing.

The **GitLab host URL** field in the popup (default: `https://gitlab.com`) is informational — it lets you track which host you are working on and the value is synced across devices via `chrome.storage.sync`. It does not affect API routing.

If you are using a self-hosted instance and the extension is not activating, verify that the MR diff URL matches the pattern:

```
https://<your-host>/<namespace>/<project>/-/merge_requests/<iid>/diffs
```

---

## How the extension works

1. **Context extraction** — On each MR diffs page, the extension reads the project ID, source branch, MR IID, and source commit SHA from the GitLab `gl` JavaScript global or page metadata. It falls back to the REST API if needed.

2. **`.gitattributes` fetching** — The extension fetches the `.gitattributes` file(s) from the MR's source branch via the GitLab REST API. It discovers nested `.gitattributes` files by walking the repository tree recursively (up to 5,000 entries). Results are cached in `chrome.storage.session` for the duration of the browser session, keyed by project ID + commit SHA.

3. **File classification** — Each file in the MR diff is matched against the parsed patterns using last-match-wins semantics, consistent with `git check-attr`.

4. **Feature application**:
   - Icons are injected into the file tree and diff headers.
   - If the **Auto-mark as Viewed** toggle is on, blob SHAs are written to GitLab's localStorage.
   - If the **Hide** toggle is on, generated file DOM nodes are detached from the page.

5. **SPA navigation** — GitLab is a single-page application. The extension detects navigation between MRs via `popstate` events and URL change observation, cleaning up state from the previous MR before re-running.

---

## localStorage format (reference)

GitLab tracks which diff files you have marked as Viewed in the browser's `localStorage`. The extension reads and writes this same storage to auto-collapse generated files.

```
Key:   code-review-<full MR path>
       e.g. code-review-/mygroup/myproject/-/merge_requests/42

Value: JSON array of blob SHA strings
       e.g. ["abc123def456...", "789xyz..."]
```

The extension reads the existing array, appends the blob SHAs of all generated files (deduplicating), and writes the merged array back. It **never removes** SHAs from the array, so manually unmarking a Viewed file is preserved.

---

## Known limitations

- **New pushes while page is open**: The extension re-fetches `.gitattributes` only when the source commit SHA changes. If you push to an MR while the tab is open and GitLab updates the diff without reloading the page, you may need to manually reload the tab.
- **Newly loaded diff blocks (lazy loading)**: The extension watches for new DOM nodes via `MutationObserver`, but GitLab's incremental diff loader may race with icon injection in some cases. Icons will appear after the next mutation fires (typically within 50 ms).
- **EC-06 — manual Viewed uncheck**: If you manually uncheck Viewed on a generated file, the extension will not re-mark it in the same page session. The auto-mark only runs once per page load and once on diff version change.
- **Large repositories**: Tree discovery is capped at 5,000 entries. Repositories with more than 5,000 files may have nested `.gitattributes` files missed. A console warning is logged when the limit is hit.
- **GitLab DOM changes**: All selectors live in `src/content/selectors.js`. If GitLab updates its markup, only that file needs to be edited. The extension degrades gracefully (no icons, no hiding) rather than throwing errors.

---

## Debugging

- **Content script logs**: Open the GitLab MR tab → DevTools → **Console**. Filter by the extension's source (`unwrench`).
- **Background service worker logs**: `chrome://extensions` → click **Service Worker** under the extension card.
- **Popup logs**: Right-click the extension icon → **Inspect popup**.

---

## Running unit tests

Two pure-function modules have Node.js unit tests (no browser required):

```bash
node --test src/content/gitattributesParser.test.js
node --test src/content/fileMatcher.test.js
```

---

## Project structure

```
├── manifest.json
├── src/
│   ├── background.js                   # Service worker — relays storage changes to tabs
│   └── content/
│       ├── index.js                    # Orchestrator — wires all modules together
│       ├── interceptorBootstrap.js     # Injected at document_start for EC-07 timing
│       ├── mrContext.js                # Extracts MR metadata from page context
│       ├── apiInterceptor.js           # Wraps window.fetch to observe diffs_metadata.json
│       ├── gitattributesLoader.js      # Fetches + caches .gitattributes from GitLab API
│       ├── gitattributesParser.js      # Parses .gitattributes text — pure, Node-testable
│       ├── fileMatcher.js              # Classifies file paths — pure, Node-testable
│       ├── iconInjector.js             # Injects wrench icons into DOM
│       ├── fileHider.js                # Detaches/restores generated file DOM nodes
│       ├── viewedMarker.js             # Writes blob SHAs to GitLab localStorage
│       ├── observer.js                 # MutationObserver for incremental diff loading
│       └── selectors.js                # All GitLab DOM selectors (single source of truth)
│   └── popup/
│       ├── popup.html
│       ├── popup.js
│       └── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## v2 roadmap

- Per-project or per-MR toggle overrides
- Inverse mode: "show only generated files" for reviewing generated changes explicitly
- Keyboard shortcut to toggle hide mode without opening the popup
- Integration with GitLab's server-side reviewer API (server-side Viewed state, not just localStorage)
- Firefox support (Manifest V2/V3 compatibility layer)
- GitHub and Bitbucket support
