// Popup UI logic: reads/writes toggle state, shows MR status (FR-28 – FR-30).

const toggleViewed = document.getElementById('toggle-viewed');
const toggleHide = document.getElementById('toggle-hide');
const statusEl = document.getElementById('status');

// Load persisted toggle state.
chrome.storage.sync.get({ autoViewed: false, autoHide: false }, ({ autoViewed, autoHide }) => {
  toggleViewed.checked = autoViewed;
  toggleHide.checked = autoHide;
});

toggleViewed.addEventListener('change', () => {
  chrome.storage.sync.set({ autoViewed: toggleViewed.checked });
});

toggleHide.addEventListener('change', () => {
  chrome.storage.sync.set({ autoHide: toggleHide.checked });
});

// Query the active tab to show MR context status.
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab) return;
  const url = tab.url || '';
  if (/\/-\/merge_requests\/\d+\/diffs/.test(url)) {
    statusEl.textContent = 'Active on this MR diffs page.';
  } else {
    statusEl.textContent = 'Not on a GitLab MR diffs page.';
  }
});
