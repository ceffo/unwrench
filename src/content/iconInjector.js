// Injects wrench icons into the file tree and diff headers (FR-13, FR-14, FR-15, FR-16).
// Also dims generated file rows in the sidebar tree.

import { SELECTORS } from './selectors.js';

const ICON_ATTR = 'data-unwrench-icon';
const DIM_ATTR = 'data-unwrench-dim';
const ICON_TITLE = 'Generated file (gitlab-generated)';

function createIcon() {
  const span = document.createElement('span');
  span.setAttribute(ICON_ATTR, 'true');
  span.setAttribute('aria-hidden', 'true');
  span.title = ICON_TITLE;
  span.textContent = '🔧';
  span.style.marginLeft = '4px';
  return span;
}

function injectIntoElement(el) {
  if (el.querySelector(`[${ICON_ATTR}]`)) return;
  el.appendChild(createIcon());
}

function getPathFromTreeEntry(entry) {
  return (
    entry.dataset.path ||
    entry.dataset.filePath ||
    entry.querySelector('[data-path]')?.dataset.path ||
    entry.querySelector('[data-file-path]')?.dataset.filePath ||
    null
  );
}

function getPathFromDiffHeader(header) {
  return (
    header.dataset.path ||
    header.dataset.filePath ||
    header.closest(SELECTORS.DIFF_FILE_BLOCK)?.dataset.path ||
    header.closest(SELECTORS.DIFF_FILE_BLOCK)?.dataset.filePath ||
    null
  );
}

/**
 * Injects wrench icons for generated files and dims their sidebar tree rows.
 * @param {Set<string>} generatedPaths
 * @param {Map<string,string>} fileHashToPath
 */
export function injectIcons(generatedPaths, fileHashToPath = new Map()) {
  // Tree sidebar
  document.querySelectorAll(SELECTORS.FILE_TREE_ENTRY).forEach(entry => {
    const hash = entry.dataset.fileRow;
    const path = hash ? fileHashToPath.get(hash) : getPathFromTreeEntry(entry);
    if (path && generatedPaths.has(path)) {
      const nameEl = entry.querySelector(SELECTORS.FILE_TREE_FILENAME) || entry;
      injectIntoElement(nameEl);
      // Dim the entire row so it recedes visually without disappearing.
      if (!entry.dataset.unwrenchDim) {
        entry.dataset.unwrenchDim = 'true';
        entry.style.opacity = '0.4';
      }
    }
  });

  // Diff headers
  document.querySelectorAll(SELECTORS.DIFF_FILE_HEADER).forEach(header => {
    const path = getPathFromDiffHeader(header);
    if (path && generatedPaths.has(path)) {
      const nameEl = header.querySelector(SELECTORS.DIFF_FILE_HEADER_FILENAME) || header;
      injectIntoElement(nameEl);
    }
  });
}

export const injectAll = injectIcons;

/**
 * Removes all injected icons and sidebar dimming from the DOM.
 */
export function removeAllIcons() {
  document.querySelectorAll(`[${ICON_ATTR}]`).forEach(el => el.remove());
  document.querySelectorAll(`[${DIM_ATTR}]`).forEach(el => {
    el.removeAttribute(DIM_ATTR);
    el.style.opacity = '';
  });
}

/**
 * Removes stale icons/dimming then re-injects for current generated paths (FR-16).
 */
export function removeStaleIcons(currentGeneratedPaths, fileHashToPath = new Map()) {
  removeAllIcons();
  injectIcons(currentGeneratedPaths, fileHashToPath);
}

export const syncIcons = removeStaleIcons;
