// All GitLab DOM selectors — single source of truth (NFR-17).
// Validated against GitLab 17.x (open-source repo, master branch, April 2026).
// When GitLab's markup changes, update ONLY this file.

// ---------------------------------------------------------------------------
// File tree sidebar
// ---------------------------------------------------------------------------

// Each file row in the MR diffs sidebar tree/list.
// Source: app/assets/javascripts/diffs/components/tree_list.vue — class "diff-file-row".
// Use: find all sidebar entries to inject wrench icons next to filenames.
export const FILE_TREE_ENTRY = '.diff-file-row';

// The element that renders the filename text within a tree entry.
// Source: app/assets/javascripts/vue_shared/components/file_row.vue — class "file-row-name".
// Use: append the wrench icon immediately after this element.
export const FILE_TREE_FILENAME = '.file-row-name';

// The sidebar panel that contains all file tree rows (MutationObserver target).
// Source: tree_list.vue — class "tree-list-holder" wraps the scrollable list;
//         "mr-tree-list" is the nav element one level up.
// Use: attach MutationObserver to catch new rows added by virtual scroll.
export const FILE_TREE_CONTAINER = '.tree-list-holder';

// ---------------------------------------------------------------------------
// Main diff view
// ---------------------------------------------------------------------------

// The sticky header bar at the top of each expanded diff file block.
// Source: diff_file_header.vue — class "js-file-title file-title" on the root div;
//         data-testid="file-title-container" is the stable test hook.
// Use: inject wrench icon into the header, and as the selector to locate a
//      file block's header when iterating diff files.
export const DIFF_FILE_HEADER = '.js-file-title';

// The <strong> element that renders the filename inside a diff file header.
// Source: diff_file_header.vue — class "file-title-name" on the <strong> inside
//         the ".file-header-content" wrapper;
//         data-testid="file-name-content" is the stable test hook.
// Use: append the wrench icon immediately after this element.
export const DIFF_FILE_HEADER_FILENAME = '.file-header-content .file-title-name';

// The outermost wrapper of a single diff file block (header + diff table together).
// Source: diff_file.vue — class "diff-file file-holder" on the root div.
// Use: remove/restore the entire block when the hide toggle is on (FR-23/FR-25).
export const DIFF_FILE_BLOCK = '.diff-file';

// The root container of the entire diffs tab (MutationObserver attachment point).
// Source: Standard GitLab diffs page — the <div id="diffs"> element that GitLab
//         mounts its Vue diffs app into.
// Use: attach the top-level MutationObserver so incremental loads are caught (FR-15).
export const DIFF_CONTAINER = '#diffs';

// ---------------------------------------------------------------------------
// Convenience object (for callers that prefer a single import)
// ---------------------------------------------------------------------------
export const SELECTORS = {
  FILE_TREE_ENTRY,
  FILE_TREE_FILENAME,
  FILE_TREE_CONTAINER,
  DIFF_FILE_HEADER,
  DIFF_FILE_HEADER_FILENAME,
  DIFF_FILE_BLOCK,
  DIFF_CONTAINER,
};
