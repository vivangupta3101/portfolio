// Logo reveal: plays on every fresh load of the home page, on a black screen, before the site is
// shown. Arriving back from a project/about page or via browser back/forward skips it.
// Handoff: video (white/orange on black) -> background turns white, the black/orange mark takes
// over in place -> the mark flies to its nav position, then the site is revealed.
(function () {
  'use strict';

  // plays on every fresh load of the home page, but not when the visitor comes back from
  // another page of the site (project, about, backstage) or uses browser back/forward
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
  // the nav lives further down the document than this script, so it cannot be looked up yet —
  // resolve it at handoff time, when parsing has reached it
  var navMark = null;
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
    navMark = navMark || document.getElementById('vg-navmark');
    if (mark && !mark.complete) { mark.addEventListener('load', handoff, { once: true }); mark.addEventListener('error', fade, { once: true }); return; }
    if (!mark || !navMark) return fade();
    done = true;

    // 1. the screen turns over: black -> white while the white/orange mark dissolves out and the
    //    black/orange mark takes its place in the same spot. The white sits alone for a beat so the
    //    inverted logo is read as a logo before it moves.
    // the video's own box is a black rectangle: it has to be gone BEFORE the screen turns white,
    // or the square fades on a different curve than the background and reads as a black plate
    if (vid) {
      vid.style.transition = 'opacity 0.26s linear';
      vid.style.opacity = '0';
    }
    setTimeout(function () {
      if (vid) vid.style.display = 'none';
      host.style.transition = 'background-color 0.6s cubic-bezier(0.42,0,0.26,1)';
      host.style.backgroundColor = '#fbfbfa';
    }, 270);
    // pin the mark to the centre in real pixels: as a bare absolute child of a flex box its static
    // position is not reliably the centre, which is why it could look like nothing was there to fly
    var mw = mark.offsetWidth || mark.naturalWidth, mh = mark.offsetHeight || mark.naturalHeight;
    mark.style.left = Math.round((window.innerWidth - mw) / 2) + 'px';
    mark.style.top = Math.round((window.innerHeight - mh) / 2) + 'px';
    mark.style.transition = 'opacity 0.4s ease 0.42s';
    mark.style.opacity = '1';

    // 2. fly it to where the nav mark sits
    setTimeout(function () {
      var from = mark.getBoundingClientRect();
      var to = navMark.getBoundingClientRect();
      if (!from.width || !to.width) return setTimeout(function () { fade(); done = false; }, 0);
      navMark.style.opacity = '0';
      var s = to.width / from.width;
      mark.style.transition = 'transform 0.85s cubic-bezier(0.5,0.02,0.24,1)';
      mark.style.transform = 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + s + ')';

      // 3. the white plate dissolves while the mark is still travelling — fading the whole overlay
      //    would take the mark with it and read as a box catching up with the page
      setTimeout(function () {
        host.style.transition = 'background-color 0.45s cubic-bezier(0.4,0,0.3,1)';
        host.style.backgroundColor = 'rgba(251,251,250,0)';
        lock(false);
        setTimeout(function () {
          if (navMark) navMark.style.opacity = '1';
          mark.style.transition = 'opacity 0.14s linear';
          mark.style.opacity = '0';
          setTimeout(clear, 160);
        }, 560);
      }, 300);
    }, 940);
  };

  var hold = function () {
    try { vid.pause(); } catch (e) {}
    setTimeout(handoff, 180);
  };

  if (vid) {
    vid.addEventListener('ended', hold);
    // some browsers stall just short of 'ended'
    // The file is 9.3s but the mark stops moving at 3.75s and then holds on an unchanging frame for
    // the remaining 5.5s. Hand off just after it lands instead of playing the dead tail out.
    var CUT = 4.0;
    vid.addEventListener('timeupdate', function () {
      if (vid.currentTime >= CUT || (vid.duration && vid.duration - vid.currentTime < 0.3)) hold();
    });
    // a safety net: if the file stalls, don't trap the visitor on a black screen
    vid.addEventListener('error', fade);
    var p = vid.play();
    if (p && p.catch) p.catch(fade);
    setTimeout(function () { if (!done && (!vid.duration || vid.currentTime < 0.05)) fade(); }, 4000);
  } else handoff();

  // the reveal is not skippable: it plays out even if the visitor scrolls, clicks or types
  // through it. Scroll is already locked while the overlay is up.
  ['wheel', 'touchmove'].forEach(function (t) {
    host.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
  });
})();
