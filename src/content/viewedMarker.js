// Writes blob SHAs of generated files to GitLab's localStorage Viewed array (FR-18 – FR-20).

/**
 * Returns the localStorage key GitLab uses for the MR Viewed state.
 * @param {string} namespace  e.g. "/mygroup/myproject"
 * @param {string} mrIid
 * @returns {string}
 */
function localStorageKey(namespace, mrIid) {
  return `code-review-${namespace}/-/merge_requests/${mrIid}`;
}

/**
 * Marks the given blob SHAs as Viewed in GitLab's localStorage.
 * Deduplicates the array before writing (FR-18).
 *
 * @param {string} namespace
 * @param {string} mrIid
 * @param {string[]} blobShas
 */
export function markAsViewed(namespace, mrIid, blobShas) {
  if (!blobShas.length) return;
  const key = localStorageKey(namespace, mrIid);
  let existing = [];
  try {
    existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }
  const merged = Array.from(new Set([...existing, ...blobShas]));
  localStorage.setItem(key, JSON.stringify(merged));
}
