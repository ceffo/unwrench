// Extracts MR metadata (project ID, source branch, MR IID) from the GitLab page.

/**
 * @returns {{ projectId: string, mrIid: string, sourceBranch: string, namespace: string } | null}
 */
export function getMRContext() {
  // GitLab exposes a `gl` global with project metadata on MR pages.
  const gl = window.gl || {};

  const projectId = gl.projectId || document.body?.dataset?.projectId;
  if (!projectId) return null;

  // Extract MR IID and namespace/project from the URL path.
  // Path shape: /:namespace/:project/-/merge_requests/:iid/diffs
  const match = location.pathname.match(/^(\/[^/]+\/[^/]+)\/-\/merge_requests\/(\d+)/);
  if (!match) return null;

  const namespace = match[1];
  const mrIid = match[2];

  // Source branch: try gl global first, then meta tag, then data attribute.
  const sourceBranch =
    gl.mrMetadata?.sourceBranch ||
    document.querySelector('meta[name="mr-source-branch"]')?.content ||
    document.body?.dataset?.mrSourceBranch ||
    null;

  return { projectId: String(projectId), mrIid, namespace, sourceBranch };
}

/**
 * Fetches source branch and sha from the MR API when the page context lacks them.
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
