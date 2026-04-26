// All GitLab DOM selectors — single source of truth (NFR-17).
// Validated against GitLab 17.x. Update here when GitLab's markup changes.

export const SELECTORS = {
  // File tree sidebar: each file entry link/row.
  // GitLab renders these inside the diff file list panel.
  FILE_TREE_ENTRY: '.diff-file-row, .file-row',

  // The filename text node container within a file tree entry.
  FILE_TREE_FILENAME: '.file-row-name, .diff-file-name',

  // Diff file header: the top bar of each expanded diff block.
  DIFF_FILE_HEADER: '.js-file-title, .diff-file-header',

  // Filename text within a diff file header.
  DIFF_FILE_HEADER_FILENAME: '.file-header-content .file-title-name, .diff-file-header .file-title',

  // The outer wrapper of a single diff file block (header + content together).
  DIFF_FILE_BLOCK: '.diff-file',

  // The main diff content container (observed for incremental loads).
  DIFF_CONTAINER: '#diffs, .diffs-content',

  // The file tree sidebar container.
  FILE_TREE_CONTAINER: '.diff-file-list, .files-changed',
};
