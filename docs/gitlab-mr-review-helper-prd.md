# PRD: GitLab MR Review Helper — Chrome Extension
**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-04-24

---

## 1. Overview

### 1.1 Problem Statement

GitLab's merge request diff view does not reliably collapse or hide generated files — particularly **newly added** generated files — even when those files are correctly declared in `.gitattributes` with the `gitlab-generated` attribute. The `Viewed` flag that drives collapse behavior must be set manually, one file at a time.

For repositories that auto-generate large numbers of files (e.g. protobuf outputs, lock files, SDK clients, ORM schemas), reviewers spend significant time dismissing noise before they can focus on meaningful code changes.

### 1.2 Solution

A Chrome extension that runs inside GitLab merge request pages and provides:

- Correct detection of generated files using the **source branch** `.gitattributes` (including nested files), fixing the gap where GitLab misses newly added generated files
- A wrench icon (🔧) marker next to each generated file in both the file tree and the diff header, so their status is always visible
- Two global toggles: one to automatically mark generated files as Viewed in localStorage, one to completely remove them from the file tree and diff view

### 1.3 Non-Goals for v1

- Firefox support
- Per-project or per-MR toggle state
- Syncing Viewed state to GitLab's server (the feature remains localStorage-only, matching GitLab's own implementation)
- Modifying GitLab's built-in collapse behavior (the extension works on top of it, not instead of it)
- Support for GitLab CI pipelines, issues, or any non-MR page

---

## 2. User Stories

| ID | As a… | I want to… | So that… |
|----|--------|-----------|----------|
| US-01 | Reviewer | See a wrench icon next to generated files in the file tree and diff headers | I immediately know which files are generated without expanding them |
| US-02 | Reviewer | Toggle "auto mark generated files as Viewed" globally | GitLab collapses generated files automatically when I open any MR |
| US-03 | Reviewer | Toggle "auto hide generated files" globally | Generated files are completely removed from the file tree and diff view, so I only see the files I need to review |
| US-04 | Reviewer | Have the extension correctly detect **newly added** generated files | New files matching `.gitattributes` patterns are treated the same as modified ones |
| US-05 | Reviewer | Have the extension work on self-hosted GitLab instances | My team's private instance is supported, not just gitlab.com |
| US-06 | Reviewer | Have my toggle preferences persist across browser sessions and devices | I don't have to re-configure the extension every time |

---

## 3. Functional Requirements

### 3.1 Host Detection & Activation

**FR-01** The extension MUST activate only on GitLab MR Changes tab pages. The URL pattern to match is:

```
*://*/*/-/merge_requests/*/diffs*
```

The extension MUST support arbitrary hostnames (self-hosted GitLab) — it MUST NOT be restricted to `gitlab.com`.

**FR-02** The extension MUST detect when the user navigates to a different MR or reloads the page (GitLab is a SPA; URL changes do not always trigger a full page reload). It MUST re-run its logic on each MR diffs navigation.

**FR-03** The extension MUST detect when GitLab's diff view finishes loading before applying any mutations (the diff is rendered asynchronously after the page shell loads).

---

### 3.2 `.gitattributes` Fetching & Parsing

**FR-04** On activation for a given MR, the extension MUST fetch the `.gitattributes` file from the **source branch** of the MR using the GitLab REST API:

```
GET /api/v4/projects/:id/repository/files/.gitattributes/raw?ref=<source_branch>
```

The project ID and source branch MUST be extracted from the GitLab page context (available in the `gl` JS global or the page's `<body>` data attributes, or from the MR metadata API).

**FR-05** The extension MUST also discover and fetch **nested** `.gitattributes` files anywhere in the repository tree on the source branch. Discovery MUST use:

```
GET /api/v4/projects/:id/repository/tree?ref=<source_branch>&recursive=true&per_page=100
```

Pagination MUST be followed (using the `X-Next-Page` response header) until all tree entries are retrieved. Any entry with `name == ".gitattributes"` and `type == "blob"` in a subdirectory MUST be fetched and parsed.

**FR-06** The `.gitattributes` parser MUST:
- Ignore comment lines (lines starting with `#`) and blank lines
- Parse lines of the form `<pattern> <attribute>[ <attribute>...]`
- Identify lines where any attribute token equals `gitlab-generated` (set) and where any attribute token equals `-gitlab-generated` (unset/negation)
- Support standard gitattributes glob patterns:
  - `*` matches any string not containing `/`
  - `**` matches any string including `/`
  - `?` matches any single character except `/`
  - A pattern starting with `/` is anchored to the directory containing the `.gitattributes` file
  - A pattern not containing `/` matches in the directory and all subdirectories
  - A pattern ending in `/` matches directories only (SHOULD be ignored for file matching in v1)
  - Negation patterns (`-gitlab-generated`) MUST override positive patterns, consistent with git's last-match-wins semantics

**FR-07** The parsed result MUST be a list of `{ pattern: string, directory: string, generated: boolean }` entries where `directory` is the path of the directory containing the `.gitattributes` file (empty string for root). This list is used for all subsequent file matching.

**FR-08** Results of `.gitattributes` fetching and parsing for a given MR (identified by project ID + source branch SHA) MUST be cached in `chrome.storage.session` for the duration of the browser session. Re-fetching MUST occur if the source branch SHA changes (i.e. a new push to the MR).

**FR-09** If the `.gitattributes` file does not exist on the source branch, the extension MUST silently no-op (no error shown to the user). If the API returns a non-200 response for any other reason, the extension MUST log the error to the console and no-op gracefully.

---

### 3.3 File Classification

**FR-10** For each file in the MR diff, the extension MUST determine whether it is generated by running the file's path (using `new_path` for added/modified files, `old_path` for deleted files) through the parsed pattern list using last-match-wins semantics, consistent with `git check-attr`.

**FR-11** The matching algorithm MUST correctly resolve nested `.gitattributes` scope: a pattern from a `.gitattributes` file located at `subdir/` MUST only apply to files whose path starts with `subdir/`.

**FR-12** The classification result (generated: true/false) for each file path MUST be computed once per MR load and stored in a module-level map for use by all downstream features.

---

### 3.4 Generated File Markers (Wrench Icon)

**FR-13** For every file classified as generated, the extension MUST inject a wrench icon (🔧 or an equivalent SVG icon consistent with GitLab's Pajamas design system if feasible) immediately after the filename in:
- The **file tree** sidebar entry
- The **diff file header** in the main view

**FR-14** The icon MUST be purely decorative (no click handler). It MUST have an accessible `title` attribute set to `"Generated file (gitlab-generated)"` and `aria-hidden="true"`.

**FR-15** The icon MUST be re-injected if GitLab re-renders the file tree or diff headers (e.g. due to incremental loading or virtualized list updates). The extension MUST use a `MutationObserver` on the diff container to detect new file headers and tree entries being added to the DOM.

**FR-16** If a file's generated status changes (e.g. after a new push), the icon MUST be removed from files no longer classified as generated.

---

### 3.5 Toggle: Auto Mark as Viewed

**FR-17** The extension popup MUST include a toggle labelled **"Auto-mark generated files as Viewed"** (default: **off**).

**FR-18** When this toggle is **on**, the extension MUST, after classifying all files in the current MR:
1. Read the existing `code-review-<mr-path>` entry from GitLab's `localStorage`
2. Compute the blob SHAs of all generated files from the MR diff metadata API response (`blob.id` field per file)
3. Add those SHAs to the array (deduplicating) and write the updated array back to `localStorage`

**FR-19** This operation MUST be performed:
- Once on initial load of the MR diffs page
- Again if the page detects a new diff version (GitLab polls for MR updates)

**FR-20** The extension MUST NOT remove SHAs from the `localStorage` array when the toggle is turned off. The toggle only controls future auto-marking; it does not undo past marks.

**FR-21** The blob SHA for each file MUST be obtained from the diffs metadata API response. The extension MUST intercept or observe the response of:

```
GET /<namespace>/<project>/-/merge_requests/<iid>/diffs_metadata.json
```

and extract the `blob.id` for each diff file entry. This interception MUST use a `fetch` wrapper injected into the page context (not a background service worker), since the request is same-origin.

---

### 3.6 Toggle: Auto Hide Generated Files

**FR-22** The extension popup MUST include a toggle labelled **"Hide generated files from diff view"** (default: **off**).

**FR-23** When this toggle is **on**, the extension MUST completely remove from the DOM:
- The file entry in the **file tree** sidebar for each generated file
- The entire **diff file block** (from the file header to the end of its diff content) in the main diff view for each generated file

**FR-24** Removal MUST be performed using DOM manipulation (setting `display: none` is NOT sufficient — the element MUST be detached from the DOM or wrapped in a `<template>` / `DocumentFragment` so it does not contribute to layout or tab order).

**FR-25** When the toggle is turned **off**, all previously removed elements MUST be re-inserted into their original DOM positions in their original order.

**FR-26** The MutationObserver from FR-15 MUST also handle the hide toggle: newly loaded diff blocks (from GitLab's incremental loading) that belong to generated files MUST be immediately removed if the hide toggle is on.

**FR-27** If both toggles are on simultaneously, both operations MUST be applied: files are marked as Viewed in localStorage AND removed from the DOM.

---

### 3.7 Extension Popup UI

**FR-28** The extension MUST provide a browser action popup. The popup MUST contain:
- Extension name and version
- Two toggle switches (FR-17, FR-22) with clear labels and descriptions
- A status line showing the current MR context: "X generated files detected" or "Not on a GitLab MR page"
- A small note clarifying that toggles apply globally to all MRs

**FR-29** Toggle state MUST be persisted in `chrome.storage.sync` so that preferences follow the user across devices and browser sessions.

**FR-30** Toggle state changes in the popup MUST immediately take effect on any active MR diffs tab without requiring a page reload. The content script MUST listen for `chrome.storage.onChanged` events.

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-01** The extension MUST NOT block the initial render of the GitLab page. All `.gitattributes` fetching, parsing, and DOM manipulation MUST run asynchronously after the page shell has loaded.

**NFR-02** Total time from MR page load to icon injection and file hiding MUST be under **500ms** on a standard broadband connection for MRs with up to 200 changed files. The dominant cost is the `.gitattributes` API fetch; the cache (FR-08) MUST eliminate this cost on repeat visits.

**NFR-03** The `MutationObserver` MUST use `{ childList: true, subtree: true }` and MUST debounce its callback with a 50ms delay to avoid processing burst DOM mutations from GitLab's incremental loader frame-by-frame.

**NFR-04** The recursive tree fetch for nested `.gitattributes` discovery (FR-05) MUST be performed with a maximum of **10 concurrent requests** and MUST short-circuit if no `.gitattributes` files are found in subdirectories after the first tree page.

**NFR-05** The extension MUST NOT make more than **1 GitLab API request per second** per tab to avoid triggering rate limiting on self-hosted instances with conservative rate limit configurations.

### 4.2 Reliability & Correctness

**NFR-06** The extension MUST use last-match-wins semantics in `.gitattributes` pattern resolution, consistent with `git check-attr` behavior. Tests MUST cover negation patterns, nested scope, and `**` globs.

**NFR-07** The extension MUST be resilient to GitLab DOM structure changes. All DOM selectors MUST be documented in a single `selectors.js` constants file so they can be updated in one place when GitLab's markup changes.

**NFR-08** The extension MUST handle GitLab's SPA navigation correctly. When the user navigates between MRs without a full page reload, the extension MUST clean up state from the previous MR (cached classifications, injected icons, restored hidden elements) before processing the new MR.

**NFR-09** The extension MUST NOT modify any GitLab API request (only observe responses). It MUST NOT write to any GitLab server-side resource. localStorage writes (FR-18) are the only mutation of shared state.

### 4.3 Security

**NFR-10** The extension MUST NOT request `tabs`, `history`, `cookies`, or any permission beyond what is necessary. Required permissions: `storage`, `scripting`, and host permissions scoped to the user-configured GitLab host.

**NFR-11** The extension MUST NOT inject any remote scripts or load resources from external CDNs at runtime. All dependencies MUST be bundled.

**NFR-12** The GitLab API is accessed using the user's existing session cookie (same-origin `fetch` from the content script injected into the page). No API tokens or credentials are stored or requested by the extension.

**NFR-13** Content scripts MUST NOT use `eval` or `innerHTML` for any user-controlled or API-derived content.

### 4.4 Compatibility

**NFR-14** The extension MUST target Chrome 120+ (Manifest V3).

**NFR-15** The extension MUST work on GitLab 15.0+ (when the `local_file_reviews` feature flag was made generally available and the localStorage format stabilized).

**NFR-16** The extension MUST work on both `gitlab.com` and self-hosted instances. The GitLab host MUST be configurable in the extension popup (defaulting to `gitlab.com`). The host permission MUST be `<all_urls>` or dynamically requested using `chrome.permissions.request` for the user-specified host.

### 4.5 Maintainability

**NFR-17** All GitLab DOM selectors used for file tree entries, diff file headers, and diff file blocks MUST live in a single `src/selectors.js` file with comments explaining what each selector targets and which GitLab version it was validated against.

**NFR-18** The `.gitattributes` pattern matching logic MUST be implemented as a pure function module with no DOM or browser API dependencies, so it can be unit tested in Node.js without a browser environment.

**NFR-19** The project MUST include a `README.md` with: setup instructions, how to load the unpacked extension in Chrome, how to configure a self-hosted instance, and a description of the localStorage format being written.

---

## 5. Technical Architecture

### 5.1 Extension Structure

```
gitlab-mr-review-helper/
├── manifest.json               # MV3 manifest
├── src/
│   ├── background.js           # Service worker: storage bridge only
│   ├── content/
│   │   ├── index.js            # Entry point: orchestrates all modules
│   │   ├── mrContext.js        # Extracts MR metadata from page (project ID, branches, MR IID)
│   │   ├── apiInterceptor.js   # Wraps window.fetch to observe diffs_metadata.json
│   │   ├── gitattributesLoader.js  # Fetches + caches .gitattributes from API
│   │   ├── gitattributesParser.js  # Parses .gitattributes text into pattern list
│   │   ├── fileMatcher.js      # Classifies file paths against pattern list
│   │   ├── iconInjector.js     # Injects wrench icons into DOM
│   │   ├── fileHider.js        # Removes/restores generated file DOM nodes
│   │   ├── viewedMarker.js     # Writes blob SHAs to GitLab localStorage
│   │   ├── observer.js         # MutationObserver for incremental load
│   │   └── selectors.js        # All GitLab DOM selectors (single source of truth)
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

### 5.2 Data Flow

```
Page Load
    │
    ▼
mrContext.js          ← Reads project ID, source branch, MR IID from DOM / gl global
    │
    ▼
gitattributesLoader.js  ← GET /api/v4/projects/:id/repository/tree (recursive)
    │                   ← GET /api/v4/projects/:id/repository/files/.gitattributes/raw
    │                     (for root + all nested .gitattributes files)
    │                   ← Cache result in chrome.storage.session
    ▼
gitattributesParser.js  ← Produces: [{ pattern, directory, generated }]
    │
    ▼
apiInterceptor.js       ← Observes diffs_metadata.json response
    │                   ← Extracts: [{ new_path, blob_id, new_file }] for each diff file
    │
    ▼
fileMatcher.js          ← Classifies each diff file path → generated: true/false
    │                   ← Produces: Map<filePath, { generated, blobId }>
    │
    ├──► iconInjector.js    ← Injects 🔧 into file tree entries + diff headers
    │
    ├──► viewedMarker.js    ← (if toggle on) writes blob SHAs to localStorage
    │
    └──► fileHider.js       ← (if toggle on) removes DOM nodes for generated files

observer.js             ← MutationObserver watches for new diff blocks / tree entries
                        ← Re-runs iconInjector + fileHider on new nodes
```

### 5.3 MR Context Extraction

GitLab exposes a `gl` JavaScript global on MR pages containing project metadata. The extension MUST read:

- `gl.projectId` → project ID for API calls
- The current URL path → extract MR IID and namespace/project slug
- The MR metadata from `document.querySelector('meta[name="current-branch"]')` or equivalent DOM data attributes for source branch name
- As fallback: call `GET /api/v4/projects/:id/merge_requests/:iid` to obtain `source_branch` and `sha`

### 5.4 API Interception Strategy

GitLab fetches `diffs_metadata.json` as a same-origin XHR/fetch from its own Vue app. The content script MUST inject a script into the **page context** (not the isolated content script context) to wrap `window.fetch` and observe the response, then `postMessage` the parsed data back to the content script.

This is required because the content script's `window.fetch` is isolated and does not intercept the page's own fetch calls.

```javascript
// Injected into page context (not content script context)
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);
  const url = typeof args[0] === 'string' ? args[0] : args[0].url;
  if (url.includes('diffs_metadata.json')) {
    const clone = response.clone();
    clone.json().then(data => {
      window.postMessage({ type: 'GL_DIFFS_METADATA', data }, '*');
    });
  }
  return response;
};
```

### 5.5 localStorage Key Format (Reference)

As reverse-engineered from GitLab's source:

```
key:   code-review-<full MR path>
       e.g. code-review-/mygroup/myproject/-/merge_requests/42

value: JSON array of blob SHA strings
       e.g. ["abc123...", "def456..."]
```

The extension reads the existing array, appends missing blob SHAs for generated files, and writes it back.

### 5.6 Manifest V3 Permissions

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "scripting"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "src/popup/popup.html" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/content/index.js"],
    "run_at": "document_idle"
  }]
}
```

The broad `<all_urls>` host permission is required because the GitLab host is user-configurable. Future versions may use `chrome.permissions.request` to request narrower host permissions dynamically.

---

## 6. Edge Cases & Known Limitations

| # | Scenario | Behavior |
|---|----------|----------|
| EC-01 | No `.gitattributes` file exists on source branch | Extension silently no-ops; no icons injected |
| EC-02 | `.gitattributes` exists but no `gitlab-generated` entries | Extension silently no-ops |
| EC-03 | All files in the MR are generated (hide toggle on) | All diff blocks removed; file tree empty; no special warning in v1 |
| EC-04 | MR has >1000 files (tree pagination) | Extension follows all pages up to a hard limit of 5000 tree entries; logs a warning if limit is hit |
| EC-05 | GitLab SPA navigation (no full page reload) | Extension re-runs full init sequence; previous MR's icons and state are cleaned up |
| EC-06 | User manually unchecks "Viewed" on a generated file | Extension does not re-mark it in the same page session (only runs once on load and on version change) |
| EC-07 | `diffs_metadata.json` is fetched before content script is ready | `apiInterceptor.js` MUST be injected synchronously at `document_start` via `scripting.executeScript` to avoid missing the first fetch |
| EC-08 | GitLab changes DOM structure (class names, markup) | `selectors.js` is the single update point; extension degrades gracefully (no icons/hiding) rather than throwing errors |
| EC-09 | User configures wrong GitLab host | API calls return 404; extension logs to console and no-ops |
| EC-10 | Pattern negation: `package-lock.json -gitlab-generated` in root, `*.json gitlab-generated` in subdirectory | Each `.gitattributes` file is scoped to its directory; root negation does not override subdirectory rules; last match within each applicable file wins |

---

## 7. Out of Scope (Future Versions)

- **v2:** Per-project or per-MR toggle overrides
- **v2:** A "show only generated files" inverse mode (for reviewing generated changes explicitly)
- **v2:** Keyboard shortcut to toggle hide mode without opening the popup
- **v2:** Integration with GitLab's server-side reviewer API (marking files reviewed server-side, not just in localStorage)
- **v3:** Firefox support (Manifest V2 / V3 compatibility layer)
- **v3:** Support for GitHub and Bitbucket (similar feature, different DOM and API)

---

## 8. Success Criteria for v1

| Metric | Target |
|--------|--------|
| Correctly classifies generated files (modified + new) | 100% of files matching `.gitattributes` patterns |
| False positive rate (non-generated files marked as generated) | 0% |
| Time to icon injection after diff load | < 500ms (p95) |
| Works on GitLab.com | Yes |
| Works on self-hosted GitLab 15.0+ | Yes |
| No console errors on MR pages where feature is active | Yes |
| Extension passes Chrome Web Store review requirements | Yes |
