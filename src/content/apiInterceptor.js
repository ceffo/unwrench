// Fetches diffs metadata directly from the GitLab API.
// Previously used a page-context fetch interceptor, but GitLab's strict
// script-src CSP blocks all inline script injection — so we just request
// the JSON ourselves instead of trying to eavesdrop on GitLab's request.

/**
 * Fetches diffs_metadata.json for the given MR path.
 * @param {string} mrPath  e.g. "/dev/libs/ssa-models/-/merge_requests/21"
 * @returns {Promise<object|null>}
 */
export async function fetchDiffsMetadata(mrPath) {
  try {
    const res = await fetch(
      `${mrPath}/diffs_metadata.json?diff_head=true&view=inline&w=1`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
