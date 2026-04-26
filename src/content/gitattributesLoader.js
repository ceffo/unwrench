// Fetches and caches .gitattributes files from the GitLab API (FR-04, FR-05, FR-08).

const CACHE_KEY_PREFIX = 'ga_cache_';
const MAX_TREE_ENTRIES = 5000;
const MAX_CONCURRENT = 10;

/**
 * Returns a cache key for a given project + branch SHA.
 */
function cacheKey(projectId, sha) {
  return CACHE_KEY_PREFIX + projectId + '_' + sha;
}

/**
 * Fetches the raw text of a single .gitattributes file.
 * Returns null if not found or on error.
 * @param {string} projectId
 * @param {string} filePath  e.g. ".gitattributes" or "subdir/.gitattributes"
 * @param {string} ref  branch name or SHA
 * @returns {Promise<string|null>}
 */
async function fetchGitattributesFile(projectId, filePath, ref) {
  const encoded = encodeURIComponent(filePath);
  const url = `/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encoded}/raw?ref=${encodeURIComponent(ref)}`;
  try {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`[unwrench] Failed to fetch ${filePath}: ${res.status}`);
      return null;
    }
    return res.text();
  } catch (err) {
    console.error(`[unwrench] Error fetching ${filePath}:`, err);
    return null;
  }
}

/**
 * Discovers all .gitattributes file paths in the repo tree.
 * Follows pagination. Returns array of file paths (strings).
 * @param {string} projectId
 * @param {string} ref
 * @returns {Promise<string[]>}
 */
async function discoverGitattributesPaths(projectId, ref) {
  const paths = [];
  let page = 1;
  let total = 0;

  while (true) {
    const url = `/api/v4/projects/${encodeURIComponent(projectId)}/repository/tree?ref=${encodeURIComponent(ref)}&recursive=true&per_page=100&page=${page}`;
    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      console.error('[unwrench] Tree fetch error:', err);
      break;
    }
    if (!res.ok) break;

    const entries = await res.json();
    for (const entry of entries) {
      if (entry.name === '.gitattributes' && entry.type === 'blob') {
        paths.push(entry.path);
      }
      total++;
      if (total >= MAX_TREE_ENTRIES) {
        console.warn('[unwrench] Tree entry limit reached; some .gitattributes files may be missed.');
        return paths;
      }
    }

    const nextPage = res.headers.get('X-Next-Page');
    if (!nextPage) break;
    page = parseInt(nextPage, 10);
  }

  return paths;
}

/**
 * Fetches all .gitattributes content for the MR source branch,
 * using chrome.storage.session as a cache keyed by project + sha.
 *
 * @param {string} projectId
 * @param {string} ref  branch name
 * @param {string} sha  commit SHA (used as cache key)
 * @returns {Promise<Array<{path: string, content: string}>>}
 *   Array of { path, content } for each .gitattributes file found.
 */
export async function loadGitattributes(projectId, ref, sha) {
  const key = cacheKey(projectId, sha);

  // Check session cache first.
  const cached = await new Promise((resolve) => {
    chrome.storage.session.get(key, (result) => resolve(result[key] ?? null));
  });
  if (cached !== null) return cached;

  // Discover all .gitattributes paths.
  const paths = await discoverGitattributesPaths(projectId, ref);
  // Always include root even if tree discovery missed it.
  if (!paths.includes('.gitattributes')) {
    paths.unshift('.gitattributes');
  }

  // Fetch up to MAX_CONCURRENT in parallel.
  const results = [];
  for (let i = 0; i < paths.length; i += MAX_CONCURRENT) {
    const batch = paths.slice(i, i + MAX_CONCURRENT);
    const contents = await Promise.all(batch.map(p => fetchGitattributesFile(projectId, p, ref)));
    for (let j = 0; j < batch.length; j++) {
      if (contents[j] !== null) {
        results.push({ path: batch[j], content: contents[j] });
      }
    }
  }

  // Cache result.
  await new Promise((resolve) => {
    chrome.storage.session.set({ [key]: results }, resolve);
  });

  return results;
}
