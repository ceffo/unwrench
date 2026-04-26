// Non-module bootstrap script injected at document_start (EC-07).
// Runs before the page's own scripts so the fetch wrapper is in place
// before GitLab's Vue app makes the diffs_metadata.json request.
// Must NOT use ES module syntax (import/export) — run_at: document_start
// does not support module-type content scripts in Chrome MV3.
// Sets window.__GL_FETCH_INTERCEPTED__ so apiInterceptor.js skips double-wrapping.
(function () {
  const script = document.createElement('script');
  script.textContent = [
    '(function(){',
    '  if(window.__GL_FETCH_INTERCEPTED__)return;',
    '  window.__GL_FETCH_INTERCEPTED__=true;',
    '  var _orig=window.fetch;',
    '  window.fetch=async function(){',
    '    var r=await _orig.apply(this,arguments);',
    '    var url=typeof arguments[0]==="string"?arguments[0]:((arguments[0]&&arguments[0].url)||"");',
    '    if(url.includes("diffs_metadata.json")){',
    '      r.clone().json().then(function(d){',
    '        window.postMessage({type:"GL_DIFFS_METADATA",data:d},"*");',
    '      }).catch(function(){});',
    '    }',
    '    return r;',
    '  };',
    '})();',
  ].join('');
  (document.head || document.documentElement).appendChild(script);
  script.remove();
})();
