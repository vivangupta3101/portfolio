// Phones only (≤700px wide). Two things:
// 1. Type floor: inline sizes were authored for desktop, so live text below the usual phone reading
//    sizes is raised (labels to 12–14px, body copy to 16–17px). Type sized in cqw/vw is left alone —
//    it is registered to artwork and scales with it.
// 2. Slide viewer: the project decks are full-width artwork, so their text is tiny on a phone. Tapping
//    a slide opens it full-height in a pannable, pinch-zoomable viewer.
(function () {
  'use strict';
  var mq = window.matchMedia && matchMedia('(max-width: 700px)');
  if (!mq || !mq.matches) return;

  var MAP = [[10.99, 12], [11.99, 12.5], [12.99, 13.5], [13.99, 14.5], [15.49, 16], [16.49, 17]];
  var target = function (fs) { for (var i = 0; i < MAP.length; i++) if (fs <= MAP[i][0]) return MAP[i][1]; return 0; };
  var SKIP = 'script,style,svg,canvas,video,#vg-hero-title,[data-no-phone-type]';
  var done = new WeakSet();
  var fix = function (root) {
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    var n, seen = [];
    while ((n = w.nextNode())) {
      if (n.textContent.trim().length < 2) continue;
      var e = n.parentElement;
      if (!e || done.has(e) || e.closest(SKIP)) continue;
      done.add(e); seen.push(e);
    }
    // read every size first, then write — one layout pass
    var plan = seen.map(function (e) {
      var inl = '';
      for (var a = e; a && a !== document.body; a = a.parentElement) {
        var fsz = a.style && a.style.fontSize;
        if (fsz) { inl = fsz; break; }
      }
      if (/(cqw|cqh|vw|vh|vmin|vmax)/.test(inl) && !/clamp|max\(|min\(/.test(inl)) return null;
      var fs = parseFloat(getComputedStyle(e).fontSize);
      var t = target(fs);
      return t && t > fs ? [e, t] : null;
    });
    plan.forEach(function (p) { if (p) p[0].style.setProperty('font-size', p[1] + 'px', 'important'); });
  };
  var run = function () { fix(document.body); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.addEventListener('load', run);
  // content mounted later (the home project reader, late-built sections)
  var pend = null;
  new MutationObserver(function (ms) {
    if (pend) return;
    pend = setTimeout(function () {
      pend = null;
      ms.forEach(function (m) { m.addedNodes.forEach(function (nd) { if (nd.nodeType === 1) fix(nd); }); });
    }, 120);
  }).observe(document.documentElement, { childList: true, subtree: true });

  // ---- slide viewer ----
  var isSlide = function (img) {
    if (!img || img.tagName !== 'IMG') return false;
    if (img.closest('a,button,#vg-index,#vg-intro,[data-morph-src],[data-no-zoom]')) return false;
    var r = img.getBoundingClientRect();
    return r.width >= innerWidth * 0.9 && (img.naturalWidth || 0) >= 1400;
  };
  var view = null;
  var open = function (src, alt) {
    view = document.createElement('div');
    view.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#0d0d0d;overflow:auto;' +
      '-webkit-overflow-scrolling:touch;overscroll-behavior:contain;opacity:0;transition:opacity 0.3s ease;display:flex;align-items:center';
    var im = document.createElement('img');
    im.src = src; im.alt = alt || '';
    im.style.cssText = 'display:block;height:88vh;height:88svh;width:auto;max-width:none;flex:none;margin:0 16px';
    var x = document.createElement('button');
    x.type = 'button'; x.setAttribute('aria-label', 'Close');
    x.textContent = '\u2715';
    x.style.cssText = 'position:fixed;right:12px;top:12px;z-index:2;width:44px;height:44px;border:0;border-radius:50%;' +
      'background:rgba(255,255,255,0.14);color:#ffffff;font:18px/44px sans-serif;padding:0;cursor:pointer';
    var hint = document.createElement('div');
    hint.textContent = 'Drag to read \u00B7 pinch to zoom';
    hint.style.cssText = 'position:fixed;left:0;right:0;bottom:18px;text-align:center;color:rgba(255,255,255,0.7);' +
      "font:500 13px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:0.12em;text-transform:uppercase;pointer-events:none;transition:opacity 0.6s ease 1.6s";
    view.appendChild(im); view.appendChild(x); view.appendChild(hint);
    document.body.appendChild(view);
    var shut = function () {
      if (!view) return;
      var v = view; view = null;
      v.style.opacity = '0';
      setTimeout(function () { v.remove(); }, 320);
    };
    x.addEventListener('click', function (e) { e.stopPropagation(); shut(); });
    requestAnimationFrame(function () { view.style.opacity = '1'; hint.style.opacity = '0'; });
  };
  document.addEventListener('click', function (e) {
    if (view) return;
    var img = e.target && e.target.closest ? e.target.closest('img') : null;
    if (!isSlide(img)) return;
    open(img.currentSrc || img.src, img.alt);
  });

  // one quiet note per visit on pages that carry a deck
  var note = function () {
    try { if (sessionStorage.getItem('vg-zoom-note')) return; } catch (e) {}
    var imgs = [].slice.call(document.images).filter(function (i) { return (i.naturalWidth || 0) >= 1400 && !i.closest('a,button'); });
    if (imgs.length < 3) return;
    try { sessionStorage.setItem('vg-zoom-note', '1'); } catch (e) {}
    var t = document.createElement('div');
    t.textContent = 'Tap any slide to read it up close';
    t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translate(-50%,12px);z-index:2147483500;' +
      'background:rgba(19,19,19,0.88);color:#ffffff;padding:12px 18px;border-radius:999px;white-space:nowrap;' +
      "font:500 14px/1 'neuzeit-grotesk','Helvetica Neue',Helvetica,Arial,sans-serif;opacity:0;" +
      'transition:opacity 0.5s ease,transform 0.6s cubic-bezier(0.22,1,0.36,1);pointer-events:none';
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '1'; t.style.transform = 'translate(-50%,0)'; }, 1800);
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 600); }, 5600);
  };
  if (!/index\.html$|\/$/.test(location.pathname)) window.addEventListener('load', note);
})();
