// MutationObserver for incremental diff loading (FR-15, FR-26, NFR-03).

import { SELECTORS } from './selectors.js';

let _observer = null;
let _debounceTimer = null;
const DEBOUNCE_MS = 50;

/**
 * Starts observing the diff container for new file blocks/tree entries.
 * @param {() => void} onMutation  Callback to run on debounced mutations.
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
}
