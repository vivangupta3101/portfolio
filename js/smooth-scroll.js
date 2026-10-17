/* Lenis-style smooth scroll (self-hosted, no dependency).
   Wheel + keyboard input is intercepted and eased into position with a per-frame lerp.
   Works on the window and on any nested scroll container (e.g. the #vg-reader overlay),
   so scroll-driven animations that read window.scrollY keep working unchanged.
   Opt out on a subtree with [data-no-smooth]. Touch/trackpad-pan gestures stay native. */
(function () {
  if (window.__vgSmooth) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var LERP = 0.11;        // easing factor per frame — lower = longer glide
  var WHEEL = 1.0;        // wheel delta multiplier
  var KEY = 120;          // px per arrow key
  var EPS = 0.35;

  var docEl = document.documentElement;
  // native CSS smooth scrolling would animate our own scrollTo writes and fight the lerp
  var st = document.createElement('style');
  st.textContent = 'html.vg-smooth,html.vg-smooth body{scroll-behavior:auto !important}';
  (document.head || docEl).appendChild(st);
  docEl.classList.add('vg-smooth');
  var jobs = [];          // active animations, one per container
  var raf = null;

  function maxScroll(el) {
    return el === docEl
      ? Math.max(0, docEl.scrollHeight - window.innerHeight)
      : Math.max(0, el.scrollHeight - el.clientHeight);
  }
  function getY(el) { return el === docEl ? window.scrollY : el.scrollTop; }
  function setY(el, y) {
    if (el === docEl) window.scrollTo(0, y);
    else el.scrollTop = y;
  }

  function jobFor(el) {
    for (var i = 0; i < jobs.length; i++) if (jobs[i].el === el) return jobs[i];
    var j = { el: el, target: getY(el), current: getY(el), active: false };
    jobs.push(j);
    return j;
  }

  function frame() {
    raf = null;
    var running = false;
    for (var i = 0; i < jobs.length; i++) {
      var j = jobs[i];
      if (!j.active) continue;
      // an outside jump (anchor, scrollTo, restore) resyncs instead of being fought
      var live = getY(j.el);
      if (Math.abs(live - j.current) > 2) { j.current = live; j.target = live; j.active = false; continue; }
      j.target = Math.max(0, Math.min(maxScroll(j.el), j.target));
      var d = j.target - j.current;
      if (Math.abs(d) < EPS) { j.current = j.target; setY(j.el, j.target); j.active = false; continue; }
      j.current += d * LERP;
      setY(j.el, j.current);
      running = true;
    }
    if (running) raf = requestAnimationFrame(frame);
  }
  function kick() { if (raf === null) raf = requestAnimationFrame(frame); }

  function scrollableAncestor(node, dir) {
    while (node && node !== document.body && node !== docEl) {
      if (node.nodeType === 1) {
        if (node.hasAttribute && node.hasAttribute('data-no-smooth')) return null;
        var cs = getComputedStyle(node);
        var oy = cs.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
          var room = dir > 0
            ? node.scrollTop < maxScroll(node) - 1
            : node.scrollTop > 1;
          if (room) return node;
        }
      }
      node = node.parentNode;
    }
    return docEl;
  }

  function push(el, delta) {
    var j = jobFor(el);
    if (!j.active) { j.current = getY(el); j.target = j.current; }
    j.target = Math.max(0, Math.min(maxScroll(el), j.target + delta));
    j.active = true;
    kick();
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey) return;               // pinch-zoom
    var dir = e.deltaY >= 0 ? 1 : -1;
    var el = scrollableAncestor(e.target, dir);
    if (!el) return;
    // the page-level lock only holds the page itself: an open project reader (its own scroller)
    // still glides, which is what the lock was silently switching off
    if (window.__vgScrollLocked && el === docEl) return;
    if (e.defaultPrevented && el === docEl) return;
    var delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 16;               // lines
    else if (e.deltaMode === 2) delta *= window.innerHeight;
    if (!delta) return;
    if (maxScroll(el) <= 0) return;
    e.preventDefault();
    push(el, delta * WHEEL);
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName || ''))) return;
    var rd = document.getElementById('vg-reader');
    var el = (rd && (!t || t === document.body || t === docEl)) ? rd : (scrollableAncestor(t, 1) || docEl);
    if (window.__vgScrollLocked && el === docEl) return;
    var vh = el === docEl ? window.innerHeight : el.clientHeight;
    var d = 0;
    switch (e.key) {
      case 'ArrowDown': d = KEY; break;
      case 'ArrowUp': d = -KEY; break;
      case 'PageDown': d = vh * 0.9; break;
      case 'PageUp': d = -vh * 0.9; break;
      case ' ': d = e.shiftKey ? -vh * 0.9 : vh * 0.9; break;
      default: return;
    }
    e.preventDefault();
    push(el, d);
  }, { passive: false });

  // touch and native scrollbar drags stay native: drop any glide in flight so nothing fights them
  var release = function () { for (var i = 0; i < jobs.length; i++) jobs[i].active = false; };
  window.addEventListener('touchstart', release, { passive: true });
  window.addEventListener('mousedown', release, { passive: true });

  window.__vgSmooth = {
    stop: release,
    scrollTo: function (y, el) { push(el || docEl, y - getY(el || docEl)); }
  };
})();
