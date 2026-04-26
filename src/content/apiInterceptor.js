// Wraps window.fetch in the page context to observe diffs_metadata.json responses.
// Must be injected into the page context (not the isolated content script context)
// so it intercepts GitLab's own fetch calls (FR-21, EC-07).

export function injectFetchInterceptor() {
  const script = document.createElement('script');
  script.textContent = `(function() {
    const _origFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await _origFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      if (url.includes('diffs_metadata.json')) {
        response.clone().json().then(data => {
          window.postMessage({ type: 'GL_DIFFS_METADATA', data }, '*');
        }).catch(() => {});
      }
      return response;
    };
  })();`;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

/**
 * Returns a Promise that resolves once with the diffs metadata payload.
 * @returns {Promise<object>}
 */
export function waitForDiffsMetadata() {
  return new Promise((resolve) => {
    function handler(event) {
      if (event.source === window && event.data?.type === 'GL_DIFFS_METADATA') {
        window.removeEventListener('message', handler);
        resolve(event.data.data);
      }
    }
    window.addEventListener('message', handler);
  });
}
