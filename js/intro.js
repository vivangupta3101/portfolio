// Logo reveal: plays on every fresh load of the home page, on a black screen, before the site is
// shown. Arriving back from a project/about page or via browser back/forward skips it.
// Sequence: the mark video plays on black while the page's own HUD chrome assembles around it,
// piece by piece, like the interface booting. When the mark lands the HUD drops away, the mark
// travels to its nav position, and the site pops up behind it. The screen stays black throughout.
(function () {
  'use strict';

  var internal = false;
  try {
    var r = document.referrer;
    if (r) {
      var u = new URL(r);
      internal = u.origin === location.origin && !/(^|\/)index\.html?$/.test(u.pathname) && u.pathname !== location.pathname;
    }
  } catch (e) {}
  var backfwd = false;
  try {
    var nav = performance.getEntriesByType('navigation')[0];
    backfwd = nav ? nav.type === 'back_forward' : performance.navigation && performance.navigation.type === 2;
  } catch (e) {}
  var seen = internal || backfwd;
  if (/[?&]intro\b/.test(location.search) || location.hash === '#intro') seen = false;

  var host = document.getElementById('vg-intro');
  if (!host) return;
  if (seen) { host.remove(); return; }

  var lock = function (on) {
    document.documentElement.style.overflow = on ? 'hidden' : '';
    document.body.style.overflow = on ? 'hidden' : '';
  };

  lock(true);
  host.style.display = 'flex';

  var vid = host.querySelector('video');
  var mark = document.getElementById('vg-intro-mark');
  var navMark = null;
  var done = false;

  // The traced mark has to land exactly on the logo the reel leaves behind; the reel's logo is not
  // perfectly centred in the frame, so the still is nudged off centre. dx/dy in px, sc a scale
  // multiplier. Tunable live with the I bar (js/intro-align-dev.js) — bake settled numbers here.
  var ADJ = { dx: 0, dy: 0, sc: 1 };
  try {
    var savedAdj = JSON.parse(localStorage.getItem('vg-intro-mark-adj') || 'null');
    if (savedAdj) { ADJ.dx = savedAdj.dx || 0; ADJ.dy = savedAdj.dy || 0; ADJ.sc = savedAdj.sc || 1; }
  } catch (e) {}
  var freeze = false;
  try { freeze = sessionStorage.getItem('vg-intro-freeze') === '1'; } catch (e) {}
  // Where the reel's logo actually sits in its last frame, measured off the file (1080x1080,
  // frame at 4.0s) and normalised to the frame. The still is registered to this rect, not to the
  // middle of the screen — the logo the reel leaves behind is low and right of frame centre.
  var REEL = { u: 0.3481, v: 0.3769, w: 0.3361, h: 0.2935 };
  var placeMark = function () {
    if (!mark) return;
    var box = vid ? vid.getBoundingClientRect() : null;
    var w, h, left, top;
    if (box && box.width) {
      // the reel is object-fit: contain in a square box, so its frame fills the shorter side
      var side = Math.min(box.width, box.height);
      var fx = box.left + (box.width - side) / 2, fy = box.top + (box.height - side) / 2;
      w = side * REEL.w * ADJ.sc;
      h = w * (mark.naturalHeight || 168) / (mark.naturalWidth || 194);
      left = fx + side * REEL.u - (w - side * REEL.w) / 2 + ADJ.dx;
      top = fy + side * REEL.v - (h - side * REEL.h) / 2 + ADJ.dy;
    } else {
      w = (mark.naturalWidth || 194) * ADJ.sc;
      h = (mark.naturalHeight || 168) * ADJ.sc;
      left = (window.innerWidth - w) / 2 + ADJ.dx;
      top = (window.innerHeight - h) / 2 + ADJ.dy;
    }
    mark.style.width = w.toFixed(1) + 'px';
    mark.style.height = h.toFixed(1) + 'px';
    mark.style.left = left.toFixed(1) + 'px';
    mark.style.top = top.toFixed(1) + 'px';
  };
  window.__vgIntroMark = { adj: ADJ, apply: placeMark, frozen: freeze };

  // ---- HUD: the same chrome vocabulary as the hero overlay, assembled while the mark plays ----
  var MONO = "font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:0.18em;font-weight:500";
  var HAIR = 'rgba(255,255,255,0.45)';
  var EASE = 'cubic-bezier(0.22,1,0.36,1)';
  // the HUD is placed on the hero's own 16:9 box, not the viewport, so every piece sits exactly
  // where the real overlay will be and the two are indistinguishable at handoff
  var hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;pointer-events:none;color:#fff';
  host.appendChild(hud);
  function fitHud() {
    var box = document.querySelector('#top > div > div');
    var r = box ? box.getBoundingClientRect() : null;
    if (!r || !r.width) { hud.style.cssText += ';left:0;top:0;right:0;bottom:0'; return; }
    hud.style.left = r.left + 'px';
    hud.style.top = r.top + 'px';
    hud.style.width = r.width + 'px';
    hud.style.height = r.height + 'px';
  }
  fitHud();
  window.addEventListener('resize', fitHud);

  var pieces = [];
  function piece(css, html, delay) {
    var d = document.createElement('div');
    d.style.cssText = css + ';opacity:0;transition:opacity 0.7s ease,transform 0.9s ' + EASE + ',width 0.9s ' + EASE + ',height 0.9s ' + EASE;
    if (html) d.innerHTML = html;
    hud.appendChild(d);
    pieces.push({ el: d, at: delay });
    return d;
  }

  // frame corners
  var CO = 'position:absolute;width:22px;height:22px;border:1px solid ' + HAIR;
  piece(CO + ';left:26px;top:96px;border-right:0;border-bottom:0', '', 0.35);
  piece(CO + ';right:26px;top:96px;border-left:0;border-bottom:0', '', 0.45);
  piece(CO + ';left:26px;bottom:26px;border-right:0;border-top:0', '', 0.55);
  piece(CO + ';right:26px;bottom:26px;border-left:0;border-top:0', '', 0.65);

  // left tick rail
  var railWrap = piece('position:absolute;left:26px;top:132px;bottom:74px;width:1px;background:' + HAIR, '', 0.9);
  for (var t = 0; t < 10; t++) {
    var tick = document.createElement('div');
    tick.style.cssText = 'position:absolute;left:0;top:' + (t * 100 / 9) + '%;width:6px;height:1px;background:' + HAIR;
    railWrap.appendChild(tick);
  }

  piece('position:absolute;left:60px;top:96px;' + MONO, 'SKETCH \u2192 CAD \u2192 CUT \u2192 TEST', 1.25);
  var count = piece('position:absolute;right:60px;top:96px;text-align:right;' + MONO, '10 SHOTS / 00:28', 1.45);
  piece('position:absolute;right:30px;top:50%;' + MONO +
    ';white-space:nowrap;writing-mode:vertical-rl;transform:translateY(-50%);letter-spacing:0.22em', 'DESIGN REDESIGN REPEAT', 1.8);

  var foot = piece('position:absolute;left:60px;bottom:26px;display:flex;align-items:baseline;gap:12px;' + MONO,
    '<span style="width:5px;height:5px;background:#ec7e41;display:inline-block"></span><span data-cap>INITIALISING</span>', 2.1);
  var clock = piece('position:absolute;right:60px;bottom:26px;' + MONO, '00:00.0 / SHOT 01', 2.3);

  // a hairline that fills as the reel plays — the only piece that reads as loading
  var barWrap = piece('position:absolute;left:60px;right:60px;bottom:58px;height:1px;background:rgba(255,255,255,0.18)', '', 2.5);
  var bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:0;top:0;height:100%;width:0%;background:#ec7e41';
  barWrap.appendChild(bar);

  var t0 = performance.now();
  var CUT = 4.0;
  var CAPS = [[0, 'INITIALISING'], [1.4, 'LOADING ASSETS'], [2.6, 'DEFINING GEOMETRY'], [3.4, 'READY']];
  var hudRaf = requestAnimationFrame(function step(now) {
    hudRaf = requestAnimationFrame(step);
    var s = (now - t0) / 1000;
    for (var i = 0; i < pieces.length; i++) {
      if (!pieces[i].done && s >= pieces[i].at) { pieces[i].done = true; pieces[i].el.style.opacity = '1'; }
    }
    var p = Math.max(0, Math.min(1, s / CUT));
    bar.style.width = (p * 100).toFixed(1) + '%';
    var secs = Math.min(CUT, s);
    clock.textContent = '00:0' + Math.floor(secs) + '.' + Math.floor((secs % 1) * 10) + ' / SHOT 01';
    var cap = foot.querySelector('[data-cap]');
    for (var c = CAPS.length - 1; c >= 0; c--) {
      if (s >= CAPS[c][0]) { if (cap.textContent !== CAPS[c][1]) cap.textContent = CAPS[c][1]; break; }
    }
  });

  var clear = function () {
    cancelAnimationFrame(hudRaf);
    lock(false);
    if (navMark) navMark.style.opacity = '';
    host.remove();
  };

  var fade = function () {
    if (done) return;
    done = true;
    host.style.transition = 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)';
    host.style.opacity = '0';
    lock(false);
    setTimeout(clear, 900);
  };

  // the page rises in behind the black: opacity only on the scroll-critical wrappers, a small
  // scale on the hero's own content, so nothing that owns sticky/fixed positioning is transformed
  function popPage() {
    var heroBox = document.querySelector('#top > div > div');
    var navEl = document.querySelector('nav');
    if (heroBox) {
      heroBox.style.transition = 'none';
      heroBox.style.transform = 'scale(1.045)';
      heroBox.style.opacity = '0.4';
      requestAnimationFrame(function () {
        heroBox.style.transition = 'transform 1.1s ' + EASE + ', opacity 0.7s ease';
        heroBox.style.transform = 'scale(1)';
        heroBox.style.opacity = '1';
        setTimeout(function () { heroBox.style.transition = ''; heroBox.style.transform = ''; heroBox.style.opacity = ''; }, 1250);
      });
    }
    if (navEl) {
      navEl.style.transition = 'none';
      navEl.style.opacity = '0';
      requestAnimationFrame(function () {
        navEl.style.transition = 'opacity 0.6s ease 0.15s';
        navEl.style.opacity = '1';
        setTimeout(function () { navEl.style.transition = ''; navEl.style.opacity = ''; }, 900);
      });
    }
  }

  var handoff = function () {
    if (done) return;
    navMark = navMark || document.getElementById('vg-navmark');
    if (mark && !mark.complete) { mark.addEventListener('load', handoff, { once: true }); mark.addEventListener('error', fade, { once: true }); return; }
    if (!mark || !navMark) return fade();
    done = true;

    // 1. the HUD stays exactly where it is — the real overlay sits under it in the same place, so
    //    it is handed over rather than faded out and back in. Only the reel dissolves.
    if (vid) {
      vid.style.transition = 'opacity 0.55s ease';
      vid.style.opacity = '0';
    }
    placeMark();
    mark.style.transition = 'opacity 0.55s ease';
    mark.style.opacity = '1';
    if (freeze) {
      // alignment mode: hold the last video frame under the still so the two can be matched
      if (vid) { vid.style.transition = 'none'; vid.style.opacity = '0.75'; }
      return;
    }
    setTimeout(function () { if (vid) vid.style.display = 'none'; }, 580);

    // 2. it travels to the nav position
    setTimeout(function () {
      var from = mark.getBoundingClientRect();
      var to = navMark.getBoundingClientRect();
      if (!from.width || !to.width) return setTimeout(function () { fade(); done = false; }, 0);
      navMark.style.opacity = '0';
      var s = to.width / from.width;
      mark.style.transition = 'transform 0.85s cubic-bezier(0.5,0.02,0.24,1)';
      mark.style.transform = 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + s + ')';

      // 3. the black lifts while the mark is still travelling and the page pops in behind it
      setTimeout(function () {
        host.style.transition = 'background-color 0.55s cubic-bezier(0.4,0,0.3,1)';
        host.style.backgroundColor = 'rgba(0,0,0,0)';
        lock(false);
        popPage();
        setTimeout(function () {
          hud.remove();
          if (navMark) navMark.style.opacity = '1';
          mark.style.transition = 'opacity 0.14s linear';
          mark.style.opacity = '0';
          setTimeout(clear, 160);
        }, 520);
      }, 260);
    }, 900);
  };

  var hold = function () {
    try { vid.pause(); } catch (e) {}
    setTimeout(handoff, 180);
  };

  if (vid) {
    vid.addEventListener('ended', hold);
    // the file is 9.3s but the mark stops moving at 3.75s; hand off just after it lands
    vid.addEventListener('timeupdate', function () {
      if (vid.currentTime >= CUT || (vid.duration && vid.duration - vid.currentTime < 0.3)) hold();
    });
    vid.addEventListener('error', fade);
    var p = vid.play();
    if (p && p.catch) p.catch(fade);
    setTimeout(function () { if (!done && (!vid.duration || vid.currentTime < 0.05)) fade(); }, 4000);
  } else handoff();

  ['wheel', 'touchmove'].forEach(function (t2) {
    host.addEventListener(t2, function (e) { e.preventDefault(); }, { passive: false });
  });
})();
