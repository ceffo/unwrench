// Popup UI logic: reads/writes toggle state, shows MR status (FR-28 – FR-30, NFR-16).

const toggleViewed = document.getElementById('toggle-viewed');
const toggleHide = document.getElementById('toggle-hide');
const hostInput = document.getElementById('host-url');
const statusEl = document.getElementById('status');
const versionEl = document.getElementById('version');

// Show extension version from manifest.
const { version } = chrome.runtime.getManifest();
versionEl.textContent = `v${version}`;

// Load persisted state.
chrome.storage.sync.get(
  { autoViewed: false, autoHide: false, gitlabHost: 'https://gitlab.com' },
  ({ autoViewed, autoHide, gitlabHost }) => {
    toggleViewed.checked = autoViewed;
    toggleHide.checked = autoHide;
    hostInput.value = gitlabHost;
  },
);

// Save toggle state immediately on change and notify active tab.
toggleViewed.addEventListener('change', () => {
  chrome.storage.sync.set({ autoViewed: toggleViewed.checked });
  notifyTab({ autoViewed: { newValue: toggleViewed.checked } });
});

toggleHide.addEventListener('change', () => {
  chrome.storage.sync.set({ autoHide: toggleHide.checked });
  notifyTab({ autoHide: { newValue: toggleHide.checked } });
});

// Save host URL when input loses focus or user presses Enter.
hostInput.addEventListener('change', () => {
  const raw = hostInput.value.trim().replace(/\/$/, '');
  if (raw) {
    hostInput.value = raw;
    chrome.storage.sync.set({ gitlabHost: raw });
  }
});

// Send a STORAGE_CHANGED message directly so the content script reacts without
// waiting for chrome.storage.onChanged (which fires in background, not popup context).
function notifyTab(changes) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'STORAGE_CHANGED', changes }).catch(() => {});
  });
}

// Query active tab's content script for generated-file count (FR-28).
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.id) {
    statusEl.textContent = 'Not on a GitLab MR page.';
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' })
    .then((resp) => {
      if (resp?.onMRPage) {
        const n = resp.generatedCount ?? 0;
        statusEl.textContent = `${n} generated file${n === 1 ? '' : 's'} detected`;
      } else {
        statusEl.textContent = 'Not on a GitLab MR page.';
      }
    })
    .catch(() => {
      statusEl.textContent = 'Not on a GitLab MR page.';
    });
});
