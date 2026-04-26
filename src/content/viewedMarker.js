// Writes blob SHAs of generated files to GitLab's localStorage Viewed array (FR-17 – FR-20).

/**
 * Marks the given generated files as Viewed in GitLab's localStorage.
 * Reads the existing SHA array, appends missing blob SHAs, and writes back.
 * Deduplicates — never removes existing SHAs (FR-20).
 *
 * @param {Array<{ filePath: string, blobId: string }>} generatedFiles
 * @param {string} mrPath  Full MR path, e.g. '/mygroup/myproject/-/merge_requests/42'
 */
export function markAsViewed(generatedFiles, mrPath) {
  const blobShas = generatedFiles.map(f => f.blobId).filter(Boolean);
  if (!blobShas.length) return;

  const key = `code-review-${mrPath}`;
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
