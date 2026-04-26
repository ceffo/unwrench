// Injects wrench icons into the file tree and diff headers (FR-13, FR-14, FR-15, FR-16).

import { SELECTORS } from './selectors.js';

const ICON_CLASS = 'unwrench-icon';
const ICON_TITLE = 'Generated file (gitlab-generated)';
const ICON_HTML = '🔧';

function createIcon() {
  const span = document.createElement('span');
  span.className = ICON_CLASS;
  span.title = ICON_TITLE;
  span.setAttribute('aria-hidden', 'true');
  span.textContent = ICON_HTML;
  span.style.marginLeft = '4px';
  return span;
}

/**
 * Injects a wrench icon after the filename in the given element, if not already present.
 * @param {Element} el
 */
function injectIntoElement(el) {
  if (el.querySelector(`.${ICON_CLASS}`)) return;
  el.appendChild(createIcon());
}

/**
 * Removes icons from elements whose files are no longer generated (FR-16).
 * @param {Set<string>} generatedPaths
 */
export function syncIcons(generatedPaths) {
  removeAllIcons();
  injectAll(generatedPaths);
}

export function removeAllIcons() {
  document.querySelectorAll(`.${ICON_CLASS}`).forEach(el => el.remove());
}

/**
 * Injects wrench icons for all generated files currently in the DOM.
 * @param {Set<string>} generatedPaths
 */
export function injectAll(generatedPaths) {
  for (const path of generatedPaths) {
    injectForPath(path);
  }
}

/**
 * Injects icons for a specific file path in any matching DOM elements.
 * @param {string} filePath
 */
export function injectForPath(filePath) {
  // File tree entries.
  document.querySelectorAll(SELECTORS.FILE_TREE_ENTRY).forEach(entry => {
    if (getPathFromTreeEntry(entry) === filePath) {
      const nameEl = entry.querySelector(SELECTORS.FILE_TREE_FILENAME) || entry;
      injectIntoElement(nameEl);
    }
  });

  // Diff file headers.
  document.querySelectorAll(SELECTORS.DIFF_FILE_HEADER).forEach(header => {
    if (getPathFromDiffHeader(header) === filePath) {
      const nameEl = header.querySelector(SELECTORS.DIFF_FILE_HEADER_FILENAME) || header;
      injectIntoElement(nameEl);
    }
  });
}

function getPathFromTreeEntry(entry) {
  return entry.dataset.path || entry.querySelector('[data-path]')?.dataset.path || null;
}

function getPathFromDiffHeader(header) {
  return (
    header.dataset.path ||
    header.closest(SELECTORS.DIFF_FILE_BLOCK)?.dataset.path ||
    null
  );
}
