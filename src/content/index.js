// Entry point: orchestrates all modules (FR-01 – FR-30).

import { getMRContext, fetchMRMeta } from './mrContext.js';
import { injectFetchInterceptor, waitForDiffsMetadata } from './apiInterceptor.js';
import { loadGitattributes } from './gitattributesLoader.js';
import { parseAllGitattributes } from './gitattributesParser.js';
import { classifyFiles } from './fileMatcher.js';
import { syncIcons, removeAllIcons } from './iconInjector.js';
import { hideAll, restoreAll } from './fileHider.js';
import { markAsViewed } from './viewedMarker.js';
import { startObserving, stopObserving } from './observer.js';

// Only activate on GitLab MR diffs pages (FR-01).
const MR_DIFFS_RE = /\/-\/merge_requests\/\d+\/diffs/;

let _lastMRKey = null;
let _generatedPaths = new Set();
let _toggleState = { autoViewed: false, autoHide: false };

async function getToggles() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ autoViewed: false, autoHide: false }, resolve);
  });
}

async function run() {
  if (!MR_DIFFS_RE.test(location.pathname)) return;

  // Inject fetch interceptor as early as possible (EC-07).
  injectFetchInterceptor();

  // Get MR context.
  let ctx = getMRContext();
  if (!ctx || !ctx.projectId) return;

  // Fetch source branch + SHA if not available from page context.
  if (!ctx.sourceBranch) {
    const meta = await fetchMRMeta(ctx.projectId, ctx.mrIid);
    if (!meta) return;
    ctx = { ...ctx, ...meta };
  }

  const mrKey = `${ctx.projectId}:${ctx.mrIid}`;
  if (mrKey === _lastMRKey) return; // already initialised for this MR

  // Clean up state from any previous MR (NFR-08, EC-05).
  cleanup();
  _lastMRKey = mrKey;

  // Wait for diffs metadata (provides blob SHAs).
  const [gaFiles, diffsMetadata, toggles] = await Promise.all([
    loadGitattributes(ctx.projectId, ctx.sourceBranch, ctx.sourceBranch),
    waitForDiffsMetadata(),
    getToggles(),
  ]);

  _toggleState = toggles;

  if (!gaFiles.length) return; // no .gitattributes — silent no-op (EC-01)

  const patternList = parseAllGitattributes(gaFiles);

  // Build file path + blob SHA map from diffs metadata.
  const diffFiles = (diffsMetadata?.diff_files || diffsMetadata?.diffs || []).map(f => ({
    path: f.new_path || f.old_path,
    blobId: f.blob?.id || f.blob_id || null,
  }));

  const classifiedMap = classifyFiles(diffFiles.map(f => f.path), patternList);

  _generatedPaths = new Set(
    [...classifiedMap.entries()].filter(([, gen]) => gen).map(([p]) => p),
  );

  if (!_generatedPaths.size) return; // nothing generated — EC-02

  // Apply features.
  applyFeatures(diffFiles, ctx);

  // Watch for incremental DOM loads (FR-15, FR-26).
  startObserving(() => applyFeatures(diffFiles, ctx));
}

function applyFeatures(diffFiles, ctx) {
  syncIcons(_generatedPaths);

  if (_toggleState.autoHide) {
    hideAll(_generatedPaths);
  }

  if (_toggleState.autoViewed) {
    const blobShas = diffFiles
      .filter(f => _generatedPaths.has(f.path) && f.blobId)
      .map(f => f.blobId);
    markAsViewed(ctx.namespace, ctx.mrIid, blobShas);
  }
}

function cleanup() {
  stopObserving();
  removeAllIcons();
  restoreAll();
  _generatedPaths = new Set();
  _lastMRKey = null;
}

// Listen for storage changes (FR-30).
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'STORAGE_CHANGED') return;
  const { autoViewed, autoHide } = msg.changes;
  if (autoViewed !== undefined) _toggleState.autoViewed = autoViewed.newValue;
  if (autoHide !== undefined) _toggleState.autoHide = autoHide.newValue;

  if (_toggleState.autoHide) {
    hideAll(_generatedPaths);
  } else {
    restoreAll();
  }
  syncIcons(_generatedPaths);
});

// SPA navigation: re-run when URL changes (FR-02).
let _lastPath = location.pathname;
const navObserver = new MutationObserver(() => {
  if (location.pathname !== _lastPath) {
    _lastPath = location.pathname;
    _lastMRKey = null; // force re-init
    run();
  }
});
navObserver.observe(document.body || document.documentElement, { childList: true, subtree: false });

run();
