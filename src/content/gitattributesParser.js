// Pure function module — no DOM or browser API imports (NFR-18).
// Parses .gitattributes text into a structured pattern list (FR-06, FR-07).

/**
 * Parses a single .gitattributes file's text content.
 *
 * @param {string} content  Raw text of a .gitattributes file.
 * @param {string} directory  Path of the directory containing this file ('' for root).
 * @returns {Array<{pattern: string, directory: string, generated: boolean}>}
 */
export function parseGitattributes(content, directory) {
  const results = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Split on whitespace: first token is the pattern, rest are attributes.
    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    const pattern = tokens[0];
    const attrs = tokens.slice(1);

    // Check for gitlab-generated (set) or -gitlab-generated (unset).
    if (attrs.includes('gitlab-generated')) {
      results.push({ pattern, directory, generated: true });
    } else if (attrs.includes('-gitlab-generated')) {
      results.push({ pattern, directory, generated: false });
    }
  }

  return results;
}

/**
 * Parses all loaded .gitattributes files into a flat pattern list.
 *
 * @param {Array<{path: string, content: string}>} files
 * @returns {Array<{pattern: string, directory: string, generated: boolean}>}
 */
export function parseAllGitattributes(files) {
  const all = [];
  for (const { path, content } of files) {
    // directory is the parent dir of the .gitattributes file.
    const directory = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    all.push(...parseGitattributes(content, directory));
  }
  return all;
}
