// Removes/restores generated file DOM nodes (FR-22 – FR-26).

import { SELECTORS } from './selectors.js';

// Map from filePath → { treeEntry: Element, diffBlock: Element, treeParent, treeNextSibling, diffParent, diffNextSibling }
const _hidden = new Map();

/**
 * Hides all generated files from the DOM.
 * Elements are detached (not just display:none) and stored for restoration.
 * @param {Set<string>} generatedPaths
 */
export function hideAll(generatedPaths) {
  for (const path of generatedPaths) {
    if (!_hidden.has(path)) hideForPath(path);
  }
}

/**
 * Restores all previously hidden elements to their original DOM positions.
 */
export function restoreAll() {
  for (const [, nodes] of _hidden) {
    restore(nodes);
  }
  _hidden.clear();
}

/**
 * Hides DOM nodes for a single generated file path.
 * @param {string} filePath
 */
export function hideForPath(filePath) {
  if (_hidden.has(filePath)) return;

  const entry = { treeEntry: null, diffBlock: null };

  document.querySelectorAll(SELECTORS.FILE_TREE_ENTRY).forEach(el => {
    if (getPath(el) === filePath && !entry.treeEntry) {
      entry.treeParent = el.parentNode;
      entry.treeNextSibling = el.nextSibling;
      entry.treeEntry = el;
      el.remove();
    }
  });

  document.querySelectorAll(SELECTORS.DIFF_FILE_BLOCK).forEach(el => {
    if (getPath(el) === filePath && !entry.diffBlock) {
      entry.diffParent = el.parentNode;
      entry.diffNextSibling = el.nextSibling;
      entry.diffBlock = el;
      el.remove();
    }
  });

  if (entry.treeEntry || entry.diffBlock) {
    _hidden.set(filePath, entry);
  }
}

function restore({ treeEntry, treeParent, treeNextSibling, diffBlock, diffParent, diffNextSibling }) {
  if (treeEntry && treeParent) {
    treeParent.insertBefore(treeEntry, treeNextSibling || null);
  }
  if (diffBlock && diffParent) {
    diffParent.insertBefore(diffBlock, diffNextSibling || null);
  }
}

function getPath(el) {
  return el.dataset.path || el.querySelector('[data-path]')?.dataset.path || null;
}

export function isHiding() {
  return _hidden.size > 0;
}
