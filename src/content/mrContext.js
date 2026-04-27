// Extracts MR metadata (project ID, source branch, MR IID, MR path, source SHA) from the GitLab page.

/**
 * Returns MR context for the current page, or null if not on an MR diffs page.
 * Extraction order: gl global → meta/data attributes → REST API fallback.
 *
 * @returns {Promise<{ projectId: string, sourceBranch: string, mrIid: string, mrPath: string, sourceSha: string|null } | null>}
 */
export async function getMRContext() {
  const match = location.pathname.match(/^(\/.+?)\/-\/merge_requests\/(\d+)/);
  if (!match) return null;

  const namespace = match[1]; // e.g. /mygroup/myproject
  const mrIid = match[2];
  const mrPath = `${namespace}/-/merge_requests/${mrIid}`;

  const gl = window.gl || {};

  let projectId =
    gl.projectId ||
    document.body?.dataset?.projectId ||
    gl.snowplowStandardContext?.data?.project_id ||
    null;
  if (projectId) projectId = String(projectId);

  let sourceBranch =
    gl.mrMetadata?.sourceBranch ||
    gl.mr?.sourceBranch ||
    document.querySelector('meta[name="current-branch"]')?.content ||
    document.querySelector('meta[name="mr-source-branch"]')?.content ||
    document.body?.dataset?.mrSourceBranch ||
    null;

  let sourceSha =
    gl.mrMetadata?.headSha ||
    gl.mr?.headSha ||
    null;

  if (!projectId || !sourceBranch || !sourceSha) {
    if (projectId) {
      const meta = await fetchMRMeta(projectId, mrIid);
      if (meta) {
        sourceBranch = sourceBranch || meta.sourceBranch;
        sourceSha = sourceSha || meta.sha;
      }
    }
  }

  if (!projectId || !sourceBranch) return null;

  return { projectId, sourceBranch, mrIid, mrPath, sourceSha: sourceSha || null };
}

/**
 * Fetches source branch and sha from the MR REST API.
 * Used as a fallback when the gl global or DOM attributes are incomplete.
 *
 * @param {string} projectId
 * @param {string} mrIid
 * @returns {Promise<{ sourceBranch: string, sha: string } | null>}
 */
export async function fetchMRMeta(projectId, mrIid) {
  try {
    const res = await fetch(`/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { sourceBranch: data.source_branch, sha: data.sha };
  } catch {
    return null;
  }
}
