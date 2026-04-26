# AI Agent Instructions

## This project: unwrench

A **Manifest V3 Chrome extension** that improves the GitLab MR review workflow by:
- Detecting generated files (via `.gitattributes` `gitlab-generated` attribute) on the MR source branch
- Marking them with a wrench 🔧 icon in the file tree and diff headers
- Optionally auto-marking them as Viewed in GitLab's localStorage (so they collapse)
- Optionally hiding them from the diff view entirely

Full spec: `docs/gitlab-mr-review-helper-prd.md`  
Task board: `br list --status=open` (beads-rust tracker, epic `unw-0bz`)  
Dev patterns: `.ralph-tui/progress.md`

## Code navigation 

Prefer using the /file-search plugin instead of ad-hoc methods 


## Memory — Hard Rule

**Never create, read, or write memory files** (notes.md, findings.md, session-notes.md, MEMORY.md, or any ad-hoc `.md` scratch file). All persistent memory goes through the **engram plugin** exclusively:

```bash
mem_save    — save decisions, bugs, discoveries, patterns (call proactively)
mem_search  — recall prior work before starting anything that may have been done before
mem_session_summary — call before signalling completion on each bead
```

The only file-based state you may write is `.ralph-tui/progress.md` — that is ralph-tui's system file for injecting codebase patterns into agent prompts, not personal memory.

---

<!-- bv-agent-instructions-v2 -->

---

## Beads Workflow Integration

This project uses [beads_rust](https://github.com/Dicklesworthstone/beads_rust) (`br`) for issue tracking and [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) (`bv`) for graph-aware triage. Issues are stored in `.beads/` and tracked in git.

### Using bv as an AI sidecar

bv is a graph-aware triage engine for Beads projects (.beads/beads.jsonl). Instead of parsing JSONL or hallucinating graph traversal, use robot flags for deterministic, dependency-aware outputs with precomputed metrics (PageRank, betweenness, critical path, cycles, HITS, eigenvector, k-core).

**Scope boundary:** bv handles *what to work on* (triage, priority, planning). `br` handles creating, modifying, and closing beads.

**CRITICAL: Use ONLY --robot-* flags. Bare bv launches an interactive TUI that blocks your session.**

#### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock the most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

```bash
bv --robot-triage        # THE MEGA-COMMAND: start here
bv --robot-next          # Minimal: just the single top pick + claim command

# Token-optimized output (TOON) for lower LLM context usage:
# --format toon does NOT work. Pipe JSON output to the toon executable instead:
bv --robot-triage | toon
bv --robot-next | toon
```

#### Other bv Commands

| Command | Returns |
|---------|---------|
| `--robot-plan` | Parallel execution tracks with unblocks lists |
| `--robot-priority` | Priority misalignment detection with confidence |
| `--robot-insights` | Full metrics: PageRank, betweenness, HITS, eigenvector, critical path, cycles, k-core |
| `--robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| `--robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| `--robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues |
| `--robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |

#### Scoping & Filtering

```bash
bv --robot-plan --label backend              # Scope to label's subgraph
bv --robot-insights --as-of HEAD~30          # Historical point-in-time
bv --recipe actionable --robot-plan          # Pre-filter: ready to work (no blockers)
bv --recipe high-impact --robot-triage       # Pre-filter: top PageRank scores
```

### br Commands for Issue Management

```bash
br ready              # Show issues ready to work (no blockers)
br list --status=open # All open issues
br show <id>          # Full issue details with dependencies
br create --title="..." --type=task --priority=2
br update <id> --status=in_progress
br close <id> --reason="Completed"
br close <id1> <id2>  # Close multiple issues at once
br sync --flush-only  # Export DB to JSONL
```

### Workflow Pattern

1. **Triage**: Run `bv --robot-triage` to find the highest-impact actionable work
2. **Claim**: Use `br update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `br close <id>`
5. **Sync**: Always run `br sync --flush-only` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `br ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers 0-4, not words)
- **Types**: task, bug, feature, epic, chore, docs, question
- **Blocking**: `br dep add <issue> <depends-on>` to add dependencies

### Session Protocol

```bash
git status              # Check what changed
git add <files>         # Stage code changes
br sync --flush-only    # Export beads changes to JSONL
git commit -m "..."     # Commit everything
git push                # Push to remote
```

<!-- end-bv-agent-instructions -->

---

## Chrome Extension Development

This repo builds a **Manifest V3 Chrome extension** targeting Chrome 120+. There is no bundler — all JS is vanilla ES modules loaded directly by Chrome.

### Project layout (source of truth: `docs/gitlab-mr-review-helper-prd.md`)

```
gitlab-mr-review-helper/
├── manifest.json
├── src/
│   ├── background.js           # MV3 service worker
│   ├── content/
│   │   ├── index.js            # Orchestrator
│   │   ├── mrContext.js
│   │   ├── apiInterceptor.js
│   │   ├── gitattributesLoader.js
│   │   ├── gitattributesParser.js
│   │   ├── fileMatcher.js
│   │   ├── iconInjector.js
│   │   ├── fileHider.js
│   │   ├── viewedMarker.js
│   │   ├── observer.js
│   │   └── selectors.js
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

### Key constraints

- **No `eval` or `innerHTML`** for any API-derived or user-controlled content (NFR-13).
- **All DOM selectors** live exclusively in `src/content/selectors.js` — never inline them elsewhere (NFR-17).
- **Pure function modules** (`gitattributesParser.js`, `fileMatcher.js`) must have zero DOM/browser API imports so they can be unit-tested in Node (NFR-18).
- API interception for `diffs_metadata.json` requires a script injected into the **page context** (not the isolated content script context) via `chrome.scripting.executeScript`, communicating back via `window.postMessage`.
- `chrome.storage.sync` for toggle preferences (persists across devices), `chrome.storage.session` for per-session `.gitattributes` cache.

### Loading the extension for manual testing

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the repo root (where `manifest.json` lives).
4. After any file change: click the **reload** button (↺) on the extension card, then reload the GitLab MR tab.

### Debugging content scripts

- Open the GitLab MR tab → DevTools → **Console** (filter by the extension's content script source).
- For background service worker logs: `chrome://extensions` → click **Service Worker** link under the extension.
- For popup logs: right-click the extension icon → **Inspect popup**.

---

## Live Feedback Loop for Iterative Development

After each implementation task, gather real browser feedback before marking the bead closed:

### Step 1 — Load & smoke-test

```bash
# After editing any file, remind the user to reload the extension:
echo "Reload extension at chrome://extensions, then open a GitLab MR diffs page."
```

Check the DevTools console for errors. Paste any errors back into the conversation so the next task can address them.

### Step 2 — Validate against acceptance criteria

Each bead's acceptance criteria map directly to PRD functional requirements (FR-XX). Before closing a bead, confirm each FR listed in the bead description passes manually or via Node unit tests where applicable.

### Step 3 — Unit tests for pure modules

`gitattributesParser.js` and `fileMatcher.js` are pure functions — write and run Node tests:

```bash
node --test src/content/gitattributesParser.test.js
node --test src/content/fileMatcher.test.js
```

No test runner needed beyond Node's built-in `node:test`.

### Step 4 — Feed errors back into the next session

If a manual test surfaces a bug, create a `bug` bead immediately:

```bash
br create --title="<short description>" --type=bug --priority=1
br dep add <bug-id> <bead-that-introduced-it>
```

Then fix it before advancing to the next feature bead.

### Step 5 — Sync at session end

```bash
br sync --flush-only
git add .beads/
git commit -m "chore: sync beads state"
```
