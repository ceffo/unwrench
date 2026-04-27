// Removes/restores generated file DOM nodes from the diff view (FR-22 – FR-26).
// The sidebar tree is handled separately via dimming in iconInjector.js.

import { SELECTORS } from './selectors.js';

// Map from filePath → { diffBlock, diffParent, diffNextSibling }
const _hidden = new Map();

/**
 * Hides generated files from the diff view.
 * Elements are detached (not display:none) and stored for restoration (FR-24).
 * @param {Set<string>} generatedPaths
 */
export function hideGeneratedFiles(generatedPaths) {
  for (const path of generatedPaths) {
    hideForPath(path);
  }
}

export const hideAll = hideGeneratedFiles;

/**
 * Restores all previously hidden diff blocks (FR-25).
 */
export function restoreHiddenFiles() {
  for (const [, nodes] of _hidden) {
    _restore(nodes);
  }
  _hidden.clear();
}

export const restoreAll = restoreHiddenFiles;

/**
 * Hides the diff block for a single generated file path.
 * @param {string} filePath
 */
export function hideForPath(filePath) {
  if (typeof filePath !== 'string') return;
  const entry = _hidden.get(filePath) || {};

  document.querySelectorAll(SELECTORS.DIFF_FILE_BLOCK).forEach(el => {
    const path = _getPath(el);
    if (typeof path === 'string' && path === filePath && !el.dataset.unwrenchHidden) {
      entry.diffParent = el.parentNode;
      entry.diffNextSibling = el.nextSibling;
      entry.diffBlock = el;
      el.dataset.unwrenchHidden = 'true';
      el.remove();
    }
  });

  if (entry.diffBlock) {
    _hidden.set(filePath, entry);
  }
}

function _restore({ diffBlock, diffParent, diffNextSibling }) {
  if (diffBlock && diffParent) {
    delete diffBlock.dataset.unwrenchHidden;
    diffParent.insertBefore(diffBlock, diffNextSibling || null);
  }
}

function _getPath(el) {
  return (
    el.dataset.path ||
    el.dataset.filePath ||
    el.querySelector('[data-path]')?.dataset.path ||
    el.querySelector('[data-file-path]')?.dataset.filePath ||
    null
  );
}

export function isHiding() {
  return _hidden.size > 0;
}
