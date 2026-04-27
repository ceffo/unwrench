(async () => {
  try {
    await import(chrome.runtime.getURL('src/content/index.js'));
  } catch (e) {
    console.error('[unwrench] content script failed to load:', e);
  }
})();
