// Injects wrench icons into the file tree and diff headers (FR-13, FR-14, FR-15, FR-16).

import { SELECTORS } from './selectors.js';

const ICON_ATTR = 'data-unwrench-icon';
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

/**
 * Returns the file path associated with a file tree entry element.
 * GitLab exposes path via data-path or data-file-path on the row root or a child.
 */
function getPathFromTreeEntry(entry) {
  return (
    entry.dataset.path ||
    entry.dataset.filePath ||
    entry.querySelector('[data-path]')?.dataset.path ||
    entry.querySelector('[data-file-path]')?.dataset.filePath ||
    null
  );
}

/**
 * Returns the file path associated with a diff file header element.
 * Falls back to the nearest .diff-file ancestor which typically carries data-path.
 */
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
 * Injects wrench icons for a specific file path into any matching DOM elements.
 * @param {string} filePath
 */
export function injectForPath(filePath) {
  document.querySelectorAll(SELECTORS.FILE_TREE_ENTRY).forEach(entry => {
    if (getPathFromTreeEntry(entry) === filePath) {
      const nameEl = entry.querySelector(SELECTORS.FILE_TREE_FILENAME) || entry;
      injectIntoElement(nameEl);
    }
  });

  document.querySelectorAll(SELECTORS.DIFF_FILE_HEADER).forEach(header => {
    if (getPathFromDiffHeader(header) === filePath) {
      const nameEl = header.querySelector(SELECTORS.DIFF_FILE_HEADER_FILENAME) || header;
      injectIntoElement(nameEl);
    }
  });
}

/**
 * Injects wrench icons for all paths in generatedPaths that are currently in the DOM.
 * @param {Set<string>} generatedPaths
 */
export function injectIcons(generatedPaths) {
  for (const path of generatedPaths) {
    injectForPath(path);
  }
}

/** Alias for callers using the original scaffold name. */
export const injectAll = injectIcons;

/**
 * Removes all injected icons from the DOM.
 */
export function removeAllIcons() {
  document.querySelectorAll(`[${ICON_ATTR}]`).forEach(el => el.remove());
}

/**
 * Removes icons for files no longer in currentGeneratedPaths, then re-injects
 * icons for all current generated files (FR-16).
 * @param {Set<string>} currentGeneratedPaths
 */
export function removeStaleIcons(currentGeneratedPaths) {
  removeAllIcons();
  injectIcons(currentGeneratedPaths);
}

/** Alias for callers using the original scaffold name. */
export const syncIcons = removeStaleIcons;
