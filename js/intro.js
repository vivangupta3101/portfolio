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
    if (nav ? nav.type === 'reload' : performance.navigation && performance.navigation.type === 1) internal = backfwd = false;
  } catch (e) {}
  var seen = internal || backfwd;
  // A phone that runs short of memory reloads the tab by itself, usually mid-scroll. That reload must
  // not replay the intro: if this tab was scrolled down the page within the last few seconds before
  // the load, it is treated as the browser's reload, not the visitor's.
  try {
    var ly = JSON.parse(sessionStorage.getItem('vg-home-y') || 'null');
    if (ly && ly.y > (window.innerHeight || 700) * 0.8 && Date.now() - ly.t < 5000) seen = true;
  } catch (e) {}
  if (window.__vgIntroRan) seen = true;
  window.__vgIntroRan = true;
  if (/[?&]intro\b/.test(location.search) || location.hash === '#intro') seen = false;
  var yT = 0;
  window.addEventListener('scroll', function () {
    if (yT) return;
    yT = setTimeout(function () { yT = 0; try { sessionStorage.setItem('vg-home-y', JSON.stringify({ y: window.scrollY || 0, t: Date.now() })); } catch (e) {} }, 250);
  }, { passive: true });

  var host = document.getElementById('vg-intro');
  if (!host) return;
  if (seen) { host.remove(); return; }

  var lock = function (on) {
    document.documentElement.style.overflow = on ? 'hidden' : '';
    document.body.style.overflow = on ? 'hidden' : '';
  };

  lock(true);
  host.style.display = 'flex';
  // the name waits under its mask until the reel is done, then rises in VIVAN orange / GUPTA white
  document.documentElement.classList.add('vg-intro-hold');
  // The SFX runs on Web Audio: the context is created and resumed inside the "Play with sound" click,
  // which is the one moment every browser (Safari and iOS included) allows sound to start. The file
  // is fetched and decoded while the gate is up, then started on the same tick as the reel.
  var SFX_URL = 'assets/audio/logo-intro-v7-sfx-ext.wav';
  var AC = window.AudioContext || window.webkitAudioContext;
  var actx = null, sfxBuf = null, sfxRaw = null, sfxSrc = null, sfxGain = null;
  var sfxOn = false, sfxDead = false, wantSound = false;
  var rawResolve, rawP = new Promise(function (res) { rawResolve = res; });
  var decode = function () {
    if (!actx || sfxBuf) return Promise.resolve(sfxBuf);
    return rawP.then(function (b) {
      if (!b || sfxBuf) return sfxBuf;
      return new Promise(function (res) {
        try { actx.decodeAudioData(b.slice(0), function (d) { sfxBuf = d; res(d); }, function () { res(null); }); } catch (e) { res(null); }
      });
    });
  };
  var startSfx = function () {
    if (sfxOn || sfxDead || done || !started || !wantSound || !actx || !sfxBuf) return;
    var at = vid ? vid.currentTime : 0;
    if (at > CUT - 0.5) return;
    sfxOn = true;
    try { if (actx.state !== 'running') actx.resume(); } catch (e) {}
    sfxGain = actx.createGain(); sfxGain.gain.value = 1; sfxGain.connect(actx.destination);
    sfxSrc = actx.createBufferSource(); sfxSrc.buffer = sfxBuf; sfxSrc.connect(sfxGain);
    sfxSrc.start(0, at > 0.04 ? at : 0);
  };
  var stopSfx = function (now) {
    if (sfxDead) return;
    sfxDead = true;
    if (!sfxSrc || !actx) return;
    var dur = now === true ? 0.03 : (typeof now === 'number' ? now : 600) / 1000, t = actx.currentTime;
    try {
      sfxGain.gain.cancelScheduledValues(t);
      sfxGain.gain.setValueAtTime(sfxGain.gain.value, t);
      sfxGain.gain.linearRampToValueAtTime(0, t + dur);
      sfxSrc.stop(t + dur + 0.05);
    } catch (e) {}
  };
  window.addEventListener('pagehide', function () { stopSfx(true); });

  var vid = host.querySelector('video');
  var mark = document.getElementById('vg-intro-mark');
  var navMark = null;
  var done = false;

  // The traced mark has to land exactly on the logo the reel leaves behind; the reel's logo is not
  // perfectly centred in the frame, so the still is nudged off centre. dx/dy in px, sc a scale
  // multiplier. Tunable live with the I bar (js/intro-align-dev.js) — bake settled numbers here.
  var ADJ = { dx: 0, dy: 0, sc: 1 };
  try {
    var savedAdj = JSON.parse(localStorage.getItem('vg-intro-mark-adj-v7') || 'null');
    if (savedAdj) { ADJ.dx = savedAdj.dx || 0; ADJ.dy = savedAdj.dy || 0; ADJ.sc = savedAdj.sc || 1; }
  } catch (e) {}
  var freeze = false;
  try { freeze = sessionStorage.getItem('vg-intro-freeze') === '1'; } catch (e) {}
  // Where the reel's logo sits in its last frame, measured off logo-intro-v7.mp4 (1920x1080,
  // settled from 10.2s) and normalised to the frame. The reel is full-bleed object-fit: cover.
  var REEL = { u: 861 / 1920, v: 453 / 1080, w: 199 / 1920, h: 174 / 1080, fw: 1920, fh: 1080 };
  var placeMark = function () {
    if (!mark) return;
    var box = vid ? vid.getBoundingClientRect() : null;
    var w, h, left, top;
    if (box && box.width) {
      var k = Math.max(box.width / REEL.fw, box.height / REEL.fh);
      var fW = REEL.fw * k, fH = REEL.fh * k;
      var fx = box.left + (box.width - fW) / 2, fy = box.top + (box.height - fH) / 2;
      w = fW * REEL.w * ADJ.sc;
      h = w * (mark.naturalHeight || 168) / (mark.naturalWidth || 194);
      left = fx + fW * REEL.u - (w - fW * REEL.w) / 2 + ADJ.dx;
      top = fy + fH * REEL.v - (h - fH * REEL.h) / 2 + ADJ.dy;
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

  piece('position:absolute;left:60px;top:96px;' + MONO, 'SKETCH \u2192 CAD \u2192 CUT \u2192 TEST', 1.25).classList.add('vg-hud-l');
  var count = piece('position:absolute;right:60px;top:96px;text-align:right;' + MONO, '10 SHOTS / 00:28', 1.45);
  count.classList.add('vg-hud-count');
  piece('position:absolute;right:30px;top:50%;' + MONO +
    ';white-space:nowrap;writing-mode:vertical-rl;transform:translateY(-50%);letter-spacing:0.22em', 'DESIGN REDESIGN REPEAT', 1.8);

  var foot = piece('position:absolute;left:60px;bottom:26px;display:flex;align-items:baseline;gap:12px;' + MONO,
    '<span style="width:5px;height:5px;background:#ec7e41;display:inline-block"></span><span data-cap>INITIALISING</span>', 2.1);
  var clock = piece('position:absolute;right:60px;bottom:26px;' + MONO, '00:00.0 / SHOT 01', 2.3);
  foot.classList.add('vg-hud-l'); clock.classList.add('vg-hud-r');

  // a hairline that fills as the reel plays — the only piece that reads as loading
  var barWrap = piece('position:absolute;left:60px;right:60px;bottom:58px;height:1px;background:rgba(255,255,255,0.18)', '', 2.5);
  barWrap.classList.add('vg-hud-l', 'vg-hud-r');
  var bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:0;top:0;height:100%;width:0%;background:#ec7e41';
  // phones: the loading bar is the whole HUD during the intro; the captions belong to the hero overlay
  // underneath, which shows once the black lifts after the logo has gone
  if (window.matchMedia && matchMedia('(max-width: 700px)').matches) {
    pieces.forEach(function (p) { if (p.el !== barWrap) p.el.style.display = 'none'; });
  }
  barWrap.appendChild(bar);

  var t0 = 0;
  // loading is mapped to the reel: the bar, clock and captions follow its playhead
  var CUT = 10.3;
  var CAPS = [[0, 'INITIALISING'], [2.5, 'LOADING ASSETS'], [5.5, 'DEFINING GEOMETRY'], [8.5, 'ASSEMBLING'], [9.9, 'READY']];
  var hudRaf = requestAnimationFrame(function step(now) {
    hudRaf = requestAnimationFrame(step);
    if (!t0) return;
    var s = (now - t0) / 1000;
    var rt = vid && vid.currentTime > 0 ? vid.currentTime : 0;
    for (var i = 0; i < pieces.length; i++) {
      if (!pieces[i].done && s >= pieces[i].at) { pieces[i].done = true; pieces[i].el.style.opacity = '1'; }
    }
    var p = Math.max(0, Math.min(1, rt / CUT));
    bar.style.width = (p * 100).toFixed(1) + '%';
    var secs = Math.min(CUT, rt);
    clock.textContent = '00:' + (secs < 10 ? '0' : '') + Math.floor(secs) + '.' + Math.floor((secs % 1) * 10) + ' / SHOT 01';
    var cap = foot.querySelector('[data-cap]');
    for (var c = CAPS.length - 1; c >= 0; c--) {
      if (rt >= CAPS[c][0]) { if (cap.textContent !== CAPS[c][1]) cap.textContent = CAPS[c][1]; break; }
    }
  });

  // release the name: it rises from below its mask at full strength, VIVAN in orange. Classes on
  // <html> (home.css) so heroTick's inline opacity can't override it, and the title is looked up
  // lazily because this script runs before the hero markup exists.
  var root = document.documentElement;
  var riseTitle = function () {
    var title = document.getElementById('vg-hero-title');
    if (!title) return root.classList.remove('vg-intro-hold');
    [].slice.call(title.querySelectorAll('.vg-rise > span')).forEach(function (w, i) { w.style.animationDelay = (0.05 + i * 0.13) + 's'; });
    root.classList.add('vg-intro-lit');
    root.classList.remove('vg-intro-hold');
  };
  var ghost = null;
  var riseOnBlack = function () {
    if (ghost) return;
    var title = document.getElementById('vg-hero-title');
    var box = document.querySelector('#top > div > div');
    if (!title || !box) return;
    var r = box.getBoundingClientRect();
    var cs = getComputedStyle(box);
    ghost = document.createElement('div');
    ghost.style.cssText = 'position:absolute;pointer-events:none;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height +
      'px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:' + cs.rowGap;
    var t = title.cloneNode(true);
    t.removeAttribute('id');
    t.style.opacity = '1';
    t.style.transition = 'none';
    t.style.transform = title.style.transform;
    var ws = [].slice.call(t.querySelectorAll('.vg-rise > span'));
    ws.forEach(function (w, i) { w.style.animationDelay = (0.05 + i * 0.13) + 's'; });
    if (ws[0]) ws[0].style.color = '#ec7e41';
    ghost.appendChild(t);
    var sub = document.getElementById('vg-hero-sub');
    if (sub) { var sc = sub.cloneNode(true); sc.removeAttribute('id'); sc.style.visibility = 'hidden'; ghost.appendChild(sc); }
    host.insertBefore(ghost, mark);
  };
  // the real title takes over exactly where the copy sits (already risen, lit), then the copy goes
  var swapToReal = function () {
    var title = document.getElementById('vg-hero-title');
    if (title) [].slice.call(title.querySelectorAll('.vg-rise > span')).forEach(function (w) { w.style.animation = 'none'; w.style.transform = 'none'; });
    root.classList.add('vg-intro-lit');
    root.classList.remove('vg-intro-hold');
    if (ghost) { ghost.remove(); ghost = null; }
  };
  // and settles back to the resting hero state (white, 0.4) as the mark leaves for the nav
  var settleTitle = function () {
    root.classList.add('vg-intro-settle');
    root.classList.remove('vg-intro-lit');
    setTimeout(function () { root.classList.remove('vg-intro-settle'); }, 1000);
  };

  var clear = function () {
    cancelAnimationFrame(hudRaf);
    document.documentElement.classList.remove('vg-intro-hold');
    lock(false);
    if (navMark) navMark.style.opacity = '';
    host.remove();
  };

  var fade = function () {
    if (done) return;
    done = true;
    stopSfx(600);
    host.style.transition = 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)';
    host.style.opacity = '0';
    lock(false);
    riseTitle();
    setTimeout(settleTitle, 1500);
    setTimeout(clear, 900);
  };

  // the page rises in behind the black: opacity only on the scroll-critical wrappers, a small
  // scale on the hero's own content, so nothing that owns sticky/fixed positioning is transformed
  function popPage() {
    var heroBox = document.querySelector('#top > div > div');
    var navEl = document.querySelector('nav');
    if (heroBox && false) {
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
    riseOnBlack();
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

    // 2. the name has risen on the black over the reel's last frame; then the mark travels to the nav
    setTimeout(function () {
      var from = mark.getBoundingClientRect();
      var to = navMark.getBoundingClientRect();
      if (!from.width || !to.width) { done = false; return fade(); }
      var s = to.width / from.width;
      mark.style.transition = 'transform 0.85s cubic-bezier(0.5,0.02,0.24,1)';
      mark.style.transform = 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + s + ')';

      // 3. once it has landed the black lifts onto the header, the name stays put, then drops to 0.4
      setTimeout(function () {
        hud.remove();
        host.style.transition = 'background-color 0.6s cubic-bezier(0.4,0,0.3,1)';
        host.style.backgroundColor = 'rgba(0,0,0,0)';
        popPage();
        // the real title sits already risen, white, at its resting 0.4 exactly under the copy
        var realT = document.getElementById('vg-hero-title');
        if (realT) [].slice.call(realT.querySelectorAll('.vg-rise > span')).forEach(function (w) { w.style.animation = 'none'; w.style.transform = 'none'; });
        root.classList.remove('vg-intro-hold');
        setTimeout(function () {
          navMark.style.opacity = '1';
          mark.style.transition = 'opacity 0.14s linear';
          mark.style.opacity = '0';
          lock(false);
          host.style.pointerEvents = 'none';
          // one continuous dissolve: the copy fades off the real title while VIVAN turns white, so
          // the name eases from orange / full to white / 0.4 with no swap frame
          if (ghost) {
            var gw = ghost.querySelector('.vg-rise > span');
            ghost.style.transition = 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)';
            if (gw) { gw.style.transition = 'color 1.1s ease'; gw.style.color = '#ffffff'; }
            requestAnimationFrame(function () { if (ghost) ghost.style.opacity = '0'; });
          }
          setTimeout(function () { if (ghost) { ghost.remove(); ghost = null; } clear(); }, 1500);
          // the extended glow holds under the hand-off, then slowly fades once the name has dimmed
          setTimeout(function () { stopSfx(3200); }, 1500);
        }, 650);
      }, 900);
    }, 1300);
  };

  var hold = function () {
    try { vid.pause(); } catch (e) {}
    setTimeout(handoff, 180);
  };

  if (vid) {
    vid.addEventListener('ended', hold);
    // the file is 11.1s; the logo settles at ~10.2s — hand off just after it lands
    vid.muted = true;

    vid.addEventListener('timeupdate', function () {
      if (vid.currentTime >= 9.9) riseOnBlack();
      if (vid.currentTime >= CUT || (vid.duration && vid.duration - vid.currentTime < 0.3)) hold();
    });
    vid.addEventListener('error', function () { if (started) fade(); });
    var started = false, answered = false;
    var FACE = "font-family:'Archivo','Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-size:clamp(15px,1.25vw,19px);line-height:1";

    // ---- 1. loader: an orange bar while the reel and its sound download in full ----
    // Everything the intro plays is fetched completely before the visitor is asked anything, so the
    // reel can never stall mid-play and the sound is decoded and ready the instant they choose it.
    var loader = document.createElement('div');
    loader.style.cssText = 'position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;transition:opacity 0.45s ease';
    loader.innerHTML = '<div style="position:relative;width:min(260px,62vw);height:3px;background:rgba(255,255,255,0.14);overflow:hidden">' +
      '<div data-fill style="position:absolute;inset:0;background:#ec7e41;transform-origin:0 50%;transform:scaleX(0);transition:transform 0.25s linear"></div></div>' +
      '<div style="' + FACE + ';font-size:clamp(12px,0.95vw,14px);letter-spacing:0.22em;color:rgba(255,255,255,0.72)">Loading your experience</div>';
    host.appendChild(loader);
    var fill = loader.querySelector('[data-fill]');
    var SZ = { v: 6849114, a: 3880844 }, got = { v: 0, a: 0 }, shown = 0;
    var setBar = function () {
      var p = Math.min(1, (got.v + got.a) / (SZ.v + SZ.a));
      shown = Math.max(shown, p);
      fill.style.transform = 'scaleX(' + shown.toFixed(3) + ')';
    };
    var grab = function (url, key, type) {
      return fetch(url, { cache: 'force-cache' }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        var len = +r.headers.get('content-length'); if (len > 1000) SZ[key] = len;
        if (!r.body || !r.body.getReader) return r.arrayBuffer().then(function (b) { got[key] = SZ[key]; setBar(); return b; });
        var rd = r.body.getReader(), parts = [], n = 0;
        var pump = function () {
          return rd.read().then(function (x) {
            if (x.done) {
              var out = new Uint8Array(n), o = 0;
              for (var i = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
              got[key] = SZ[key]; setBar(); return out.buffer;
            }
            parts.push(x.value); n += x.value.length; got[key] = Math.min(n, SZ[key]); setBar();
            return pump();
          });
        };
        return pump();
      });
    };
    // index.html carries the reel as data-src so the browser doesn't start a second, competing download
    var VID_URL = vid.getAttribute('data-src') || vid.getAttribute('src');
    if (vid.getAttribute('src')) { vid.removeAttribute('src'); try { vid.load(); } catch (e) {} }
    var vidP = grab(VID_URL, 'v').then(function (buf) {
      return new Promise(function (res) {
        var u = URL.createObjectURL(new Blob([buf], { type: 'video/mp4' }));
        var ok = function () { res(true); };
        vid.addEventListener('loadeddata', ok, { once: true });
        vid.addEventListener('error', function () { vid.src = VID_URL; res(false); }, { once: true });
        vid.src = u; try { vid.load(); } catch (e) {}
        setTimeout(ok, 4000);
      });
    }, function () { vid.src = VID_URL; got.v = SZ.v; setBar(); return false; });
    var audP = grab(SFX_URL, 'a').then(function (b) { sfxRaw = b; rawResolve(b); return true; }, function () { got.a = SZ.a; setBar(); rawResolve(null); return false; });
    var fontsP = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    var markP = new Promise(function (res) { if (!mark || mark.complete) return res(); mark.addEventListener('load', res, { once: true }); mark.addEventListener('error', res, { once: true }); });
    var loaded = false;
    var showGate = function () {
      if (loaded) return; loaded = true;
      shown = 1; fill.style.transform = 'scaleX(1)';
      setTimeout(function () {
        // the bar clears first, then the choice comes up on clean black
        loader.style.opacity = '0';
        setTimeout(function () {
          loader.remove();
          host.appendChild(gate);
          gate.querySelectorAll('[data-glow]').forEach(function (g) { paintGlow(g); });
          requestAnimationFrame(function () { requestAnimationFrame(function () { gate.style.opacity = '1'; }); });
        }, 470);
      }, 260);
    };
    Promise.all([vidP, audP, fontsP, markP]).then(showGate, showGate);
    // a very slow connection still gets the choice: the reel then streams instead
    setTimeout(function () { if (!loaded) { if (!vid.getAttribute('src')) vid.src = VID_URL; showGate(); } }, 20000);

    // ---- 2. sound gate ----
    var gate = document.createElement('div');
    gate.style.cssText = 'position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;opacity:0;transition:opacity 0.5s ease;' + MONO;
    var CUT_CORNERS = 'clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)';
    var BTN = 'appearance:none;border:0;cursor:pointer;padding:20px 34px;width:340px;max-width:calc(100vw - 48px);display:flex;align-items:center;justify-content:center;transition:background-color 0.35s ease,color 0.35s ease;' + FACE + ';' + CUT_CORNERS;
    // the glow is painted once into a canvas with generous padding: a CSS blur filter gets clipped to a
    // hard rectangle by the compositor after a moment of hovering, a canvas bitmap cannot be
    var GLOW = '<canvas data-glow style="position:absolute;left:-64px;top:-64px;width:calc(100% + 128px);height:calc(100% + 128px);pointer-events:none;opacity:0;transform:scale(0.96);transition:opacity 0.4s ease,transform 0.5s cubic-bezier(0.22,1,0.36,1)"></canvas>';
    var paintGlow = function (cv) {
      var w = cv.parentNode.offsetWidth, h = cv.parentNode.offsetHeight; if (!w || !h) return;
      var P = 64, k = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round((w + 2 * P) * k); cv.height = Math.round((h + 2 * P) * k);
      var x = cv.getContext('2d'); x.scale(k, k);
      var c = 16, poly = function (o) { x.beginPath(); x.moveTo(P + c - o, P - o); x.lineTo(P + w + o, P - o); x.lineTo(P + w + o, P + h - c + o); x.lineTo(P + w - c + o, P + h + o); x.lineTo(P - o, P + h + o); x.lineTo(P - o, P + c - o); x.closePath(); };
      // only the shadow is painted (the shape itself is drawn far off-canvas), so no hard edge shows
      var OFF = 10000;
      x.fillStyle = '#000'; x.shadowOffsetX = OFF * k; x.shadowOffsetY = 0;
      x.translate(-OFF, 0);
      x.shadowColor = 'rgba(236,126,65,0.85)'; x.shadowBlur = 30 * k; poly(2); x.fill();
      x.shadowColor = 'rgba(243,154,99,0.9)'; x.shadowBlur = 12 * k; poly(0); x.fill();
    };
    gate.innerHTML = '<span style="position:relative;display:block">' + GLOW + '<button type="button" data-snd="1" style="' + BTN + ';position:relative;background:#ec7e41;color:#000000">Play with sound</button></span>' +
      '<button type="button" data-snd="0" style="appearance:none;border:0;background:none;cursor:pointer;padding:10px 6px;color:rgba(255,255,255,0.6);transition:color 0.3s ease,text-shadow 0.3s ease;' + FACE + ';font-size:clamp(12px,0.95vw,14px);letter-spacing:0.12em">Continue without sound</button>';
    [].slice.call(gate.querySelectorAll('button')).forEach(function (b) {
      if (b.dataset.snd === '0') {
        b.addEventListener('mouseenter', function () { b.style.color = '#ffffff'; b.style.textShadow = '0 0 14px rgba(255,255,255,0.6)'; });
        b.addEventListener('mouseleave', function () { b.style.color = 'rgba(255,255,255,0.6)'; b.style.textShadow = ''; });
        return;
      }
      var g = b.parentNode.querySelector('[data-glow]');
      var on = function () { g.style.opacity = '0.95'; g.style.transform = 'scale(1.06)'; b.style.backgroundColor = '#f39a63'; };
      var off = function () { g.style.opacity = '0'; g.style.transform = 'scale(0.96)'; b.style.backgroundColor = '#ec7e41'; };
      b.addEventListener('mouseenter', on); b.addEventListener('mouseleave', off);
      b.addEventListener('focus', on); b.addEventListener('blur', off);
    });

    // ---- 3. start: reel and sound begin together ----
    var go = function () {
      if (started || done) return;
      started = true;
      t0 = performance.now();
      var p;
      try { p = vid.play(); } catch (e) { return fade(); }
      if (p && p.then) p.then(startSfx, function () { setTimeout(function () { if (!done && vid.paused) fade(); }, 300); });
      else startSfx();
      // the reel never got going (decode failure, blocked): show the site rather than a black screen
      setTimeout(function () { if (!done && (!vid.duration || vid.currentTime < 0.05)) fade(); }, 6000);
    };
    var answer = function (withSound) {
      if (answered || !loaded) return;
      answered = true;
      if (withSound && AC) {
        wantSound = true;
        try {
          actx = new AC();
          // a one-sample silent buffer played inside the gesture unlocks output on iOS
          var b0 = actx.createBuffer(1, 1, 22050), s0 = actx.createBufferSource(); s0.buffer = b0; s0.connect(actx.destination); s0.start(0);
          actx.resume();
        } catch (e) { actx = null; }
      } else sfxDead = true;
      gate.style.opacity = '0';
      gate.style.pointerEvents = 'none';
      setTimeout(function () { gate.remove(); }, 520);
      // the sound is already downloaded; PCM decodes in a few ms. The reel waits for it (≤ 0.5s) so
      // both start on the same frame, then starts regardless — the sound would join in sync
      var begun = false, begin = function () { if (begun) return; begun = true; setTimeout(go, 120); };
      if (wantSound && actx) decode().then(begin, begin); else begin();
      setTimeout(begin, 500);
    };
    gate.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) answer(b.dataset.snd === '1'); });
    window.addEventListener('keydown', function k(e) {
      if (answered) return window.removeEventListener('keydown', k);
      if (!loaded) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(true); } else if (e.key === 'Escape') answer(false);
    });
    (function late() {
      if (done) return;
      requestAnimationFrame(late);
      if (started && wantSound && !sfxOn && sfxBuf && !vid.paused) startSfx();
    })();
    // leaving the tab mid-reel would let the sound and picture drift apart: finish the intro instead
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && started && !done) { stopSfx(true); try { vid.pause(); } catch (e) {} fade(); }
    });
  } else handoff();

  ['wheel', 'touchmove'].forEach(function (t2) {
    host.addEventListener(t2, function (e) { e.preventDefault(); }, { passive: false });
  });
})();
