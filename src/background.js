// Service worker: storage bridge only.
// Handles chrome.storage.onChanged relay and any future background tasks.

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  // Forward storage changes to all content scripts on MR diffs pages.
  chrome.tabs.query({ url: '*://*/*/-/merge_requests/*/diffs*' }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'STORAGE_CHANGED', changes }).catch(() => {});
    }
  });
});
