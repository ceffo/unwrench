// MutationObserver for incremental diff loading (FR-15, FR-26, NFR-03).

import { SELECTORS } from './selectors.js';

const DEBOUNCE_MS = 50;

// Module-level state for the primary observer used by index.js.
let _observer = null;
let _debounceTimer = null;

/**
 * Starts observing the diff container for new file blocks/tree entries.
 * Debounces the callback by 50ms (NFR-03).
 * @param {() => void} onMutation
 */
export function startObserving(onMutation) {
  stopObserving();

  const container = document.querySelector(SELECTORS.DIFF_CONTAINER);
  if (!container) return;

  _observer = new MutationObserver(() => {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(onMutation, DEBOUNCE_MS);
  });

  _observer.observe(container, { childList: true, subtree: true });
}

export function stopObserving() {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
  clearTimeout(_debounceTimer);
  _debounceTimer = null;
}

/**
 * Creates and starts a standalone MutationObserver on the diff container.
 * Returns the observer so the caller controls its lifecycle.
 * @param {(mutations: MutationRecord[]) => void} callback
 * @returns {MutationObserver|null}
 */
export function startObserver(callback) {
  const container = document.querySelector(SELECTORS.DIFF_CONTAINER);
  if (!container) return null;

  let debounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => callback(mutations), DEBOUNCE_MS);
  });

  observer.observe(container, { childList: true, subtree: true });
  return observer;
}

/**
 * Disconnects a standalone observer returned by startObserver.
 * @param {MutationObserver} observer
 */
export function stopObserver(observer) {
  if (observer) observer.disconnect();
}
