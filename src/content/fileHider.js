// Removes/restores generated file DOM nodes (FR-22 – FR-26).

import { SELECTORS } from './selectors.js';

// Map from filePath → { treeEntry, treeParent, treeNextSibling, diffBlock, diffParent, diffNextSibling }
// Tracks the most-recently removed element per path for in-order restoration.
const _hidden = new Map();

/**
 * Hides all generated files from the DOM.
 * Elements are detached (not display:none) and stored for restoration (FR-24).
 * Safe to call repeatedly — newly lazy-loaded nodes for tracked paths are also hidden (FR-26).
 * @param {Set<string>} generatedPaths
 */
export function hideGeneratedFiles(generatedPaths) {
  for (const path of generatedPaths) {
    hideForPath(path);
  }
}

// Alias used by index.js scaffold.
export const hideAll = hideGeneratedFiles;

/**
 * Restores all previously hidden elements to their original DOM positions (FR-25).
 */
export function restoreHiddenFiles() {
  for (const [, nodes] of _hidden) {
    _restore(nodes);
  }
  _hidden.clear();
}

// Alias used by index.js scaffold.
export const restoreAll = restoreHiddenFiles;

/**
 * Hides DOM nodes for a single generated file path.
 * Uses data-unwrench-hidden attribute to prevent double-hiding the same element.
 * Overwrites the tracked entry for each type so newly lazy-loaded nodes are captured.
 * @param {string} filePath
 */
export function hideForPath(filePath) {
  const entry = _hidden.get(filePath) || {};

  document.querySelectorAll(SELECTORS.FILE_TREE_ENTRY).forEach(el => {
    if (_getPath(el) === filePath && !el.dataset.unwrenchHidden) {
      entry.treeParent = el.parentNode;
      entry.treeNextSibling = el.nextSibling;
      entry.treeEntry = el;
      el.dataset.unwrenchHidden = 'true';
      el.remove();
    }
  });

  document.querySelectorAll(SELECTORS.DIFF_FILE_BLOCK).forEach(el => {
    if (_getPath(el) === filePath && !el.dataset.unwrenchHidden) {
      entry.diffParent = el.parentNode;
      entry.diffNextSibling = el.nextSibling;
      entry.diffBlock = el;
      el.dataset.unwrenchHidden = 'true';
      el.remove();
    }
  });

  if (entry.treeEntry || entry.diffBlock) {
    _hidden.set(filePath, entry);
  }
}

function _restore({ treeEntry, treeParent, treeNextSibling, diffBlock, diffParent, diffNextSibling }) {
  if (treeEntry && treeParent) {
    delete treeEntry.dataset.unwrenchHidden;
    treeParent.insertBefore(treeEntry, treeNextSibling || null);
  }
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
