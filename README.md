# GitLab MR Review Helper

A Chrome extension (Manifest V3) that improves the GitLab MR review workflow by detecting generated files and reducing noise in the diff view.

## Features

- Marks generated files (declared via `.gitattributes` with `gitlab-generated`) with a 🔧 wrench icon in the file tree and diff headers.
- **Auto-mark as Viewed** toggle: automatically collapses generated files in GitLab's diff view by writing their blob SHAs to localStorage.
- **Hide generated files** toggle: completely removes generated file entries from the file tree and diff view.

## Setup

### Requirements

- Chrome 120+
- GitLab 15.0+ (self-hosted or gitlab.com)

### Load the unpacked extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repository root (the directory containing `manifest.json`).
4. After any file change: click the **reload** button (↺) on the extension card, then reload the GitLab MR tab.

## Configuring a self-hosted GitLab instance

The extension uses `<all_urls>` host permissions, so it activates on any GitLab instance automatically. No additional configuration is needed.

## Debugging

- Content script logs: GitLab MR tab → DevTools → **Console** (filter by the extension's source).
- Background service worker logs: `chrome://extensions` → click **Service Worker** under the extension card.
- Popup logs: right-click the extension icon → **Inspect popup**.

## localStorage format (reference)

GitLab tracks Viewed files per MR in localStorage:

```
key:   code-review-/<namespace>/<project>/-/merge_requests/<iid>
value: JSON array of blob SHA strings — e.g. ["abc123...", "def456..."]
```

The extension reads the existing array, appends missing SHAs for generated files, and writes it back. It never removes SHAs.

## Project structure

```
gitlab-mr-review-helper/
├── manifest.json
├── src/
│   ├── background.js
│   └── content/
│       ├── index.js               # Orchestrator
│       ├── mrContext.js           # Extracts MR metadata from page
│       ├── apiInterceptor.js      # Observes diffs_metadata.json response
│       ├── gitattributesLoader.js # Fetches + caches .gitattributes from API
│       ├── gitattributesParser.js # Parses .gitattributes (pure, Node-testable)
│       ├── fileMatcher.js         # Classifies file paths (pure, Node-testable)
│       ├── iconInjector.js        # Injects wrench icons into DOM
│       ├── fileHider.js           # Removes/restores generated file DOM nodes
│       ├── viewedMarker.js        # Writes blob SHAs to GitLab localStorage
│       ├── observer.js            # MutationObserver for incremental load
│       └── selectors.js           # All GitLab DOM selectors (single source of truth)
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
