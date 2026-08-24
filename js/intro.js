// Logo reveal: plays once per visitor (localStorage), on a black screen, before the home page is
// shown. Refreshes and back-navigation skip straight to the site (load with ?intro to force it).
// Handoff: video (white/orange on black) -> background turns white, the black/orange mark takes
// over in place -> the mark flies to its nav position, then the site is revealed.
(function () {
  'use strict';

  var KEY = 'vgIntroSeen';
  var force = /[?&]intro\b/.test(location.search) || location.hash === '#intro';
  var seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch (e) { seen = true; }
  if (force) seen = false;

  var host = document.getElementById('vg-intro');
  if (!host) return;
  if (seen) { host.remove(); return; }

  try { localStorage.setItem(KEY, '1'); } catch (e) {}

  var lock = function (on) {
    document.documentElement.style.overflow = on ? 'hidden' : '';
    document.body.style.overflow = on ? 'hidden' : '';
  };

  lock(true);
  host.style.display = 'flex';

  var vid = host.querySelector('video');
  var mark = document.getElementById('vg-intro-mark');
  var navMark = document.getElementById('vg-navmark');
  var done = false;

  var clear = function () {
    lock(false);
    if (navMark) navMark.style.opacity = '';
    host.remove();
  };

  // fallback: no mark to hand off to, so just fade the black screen away
  var fade = function () {
    if (done) return;
    done = true;
    host.style.transition = 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)';
    host.style.opacity = '0';
    lock(false);
    setTimeout(clear, 900);
  };

  var handoff = function () {
    if (done) return;
    if (mark && !mark.complete) { mark.addEventListener('load', handoff, { once: true }); mark.addEventListener('error', fade, { once: true }); return; }
    if (!mark || !navMark) return fade();
    done = true;

    // 1. black -> white, video out, black/orange mark in, in the same spot
    host.style.transition = 'background-color 0.75s cubic-bezier(0.4,0,0.2,1)';
    host.style.backgroundColor = '#fbfbfa';
    if (vid) {
      vid.style.transition = 'opacity 0.55s ease';
      vid.style.opacity = '0';
    }
    mark.style.transition = 'opacity 0.55s ease 0.12s';
    mark.style.opacity = '1';

    // 2. fly it to where the nav mark sits
    setTimeout(function () {
      var from = mark.getBoundingClientRect();
      var to = navMark.getBoundingClientRect();
      if (!from.width || !to.width) return setTimeout(function () { fade(); done = false; }, 0);
      navMark.style.opacity = '0';
      var s = to.width / from.width;
      mark.style.transition = 'transform 1.05s cubic-bezier(0.65,0,0.2,1)';
      mark.style.transform = 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + s + ')';

      // 3. the site arrives behind it, then the overlay steps aside
      setTimeout(function () {
        host.style.transition = 'opacity 0.5s ease';
        host.style.opacity = '0';
        if (navMark) navMark.style.opacity = '1';
        lock(false);
        setTimeout(clear, 560);
      }, 880);
    }, 780);
  };

  var hold = function () {
    try { vid.pause(); } catch (e) {}
    setTimeout(handoff, 320);
  };

  if (vid) {
    vid.addEventListener('ended', hold);
    // some browsers stall just short of 'ended'
    vid.addEventListener('timeupdate', function () {
      if (vid.duration && vid.duration - vid.currentTime < 0.08) hold();
    });
    // a safety net: if the file stalls, don't trap the visitor on a black screen
    vid.addEventListener('error', fade);
    var p = vid.play();
    if (p && p.catch) p.catch(fade);
    setTimeout(function () { if (!done && (!vid.duration || vid.currentTime < 0.05)) fade(); }, 4000);
  } else handoff();

  // skipping cuts to the handoff, not to a bare fade
  ['click', 'keydown', 'wheel', 'touchstart'].forEach(function (t) {
    window.addEventListener(t, handoff, { passive: true, once: true });
  });
})();
