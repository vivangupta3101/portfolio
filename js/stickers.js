// Empathy exercise spread: each photographed subject is also a cut-out. On hover the cut-out
// lifts off the page like a sticker peeled up — it fades in perfectly registered on the printed
// pixels, then eases up, tilts, and keeps a slow sway while the cursor stays on it.
(function () {
  "use strict";

  // rects measured against the p03 page box (2880 x 1632); zoom1 straddles the p02/p03 seam
  var SPOTS = [
    { src: 'assets/images/watchmaker/zoom1.png', left: 42.708, top: -39.338, width: 55.556, pad: 38.19, tilt: -1.6, rise: 4.4 },
    { src: 'assets/images/watchmaker/zoom2.png', left: 18.056, top: 29.902, width: 31.250, pad: 25.87, tilt: 1.9, rise: 5.2 },
    { src: 'assets/images/watchmaker/zoom3.png', left: 52.951, top: 33.578, width: 45.139, pad: 23.96, tilt: -1.3, rise: 4.6 }
  ];

  function mount(page) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;line-height:0;font-size:0;z-index:3';
    page.parentNode.insertBefore(wrap, page);
    wrap.appendChild(page);

    SPOTS.forEach(function (s, i) {
      // the silhouette the sticker vacates: filled with a heavily smeared, slightly enlarged copy of
      // the page itself, so the surrounding tones bleed inward as a plausible guess at what stood
      // behind the subject rather than a blurred cut-out of the subject
      var hole = document.createElement('div');
      hole.style.cssText = 'position:absolute;left:' + s.left + '%;top:' + s.top + '%;width:' + s.width + '%;' +
        'height:0;padding-bottom:' + s.pad + '%;pointer-events:none;opacity:0;z-index:2;overflow:hidden;' +
        'mask-image:url(' + s.src + ');-webkit-mask-image:url(' + s.src + ');' +
        'mask-size:100% 100%;-webkit-mask-size:100% 100%;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;' +
        'transition:opacity 0.5s ease';
      var fillWrap = document.createElement('div');
      fillWrap.style.cssText = 'position:absolute;inset:-14%;overflow:hidden';
      var fill = document.createElement('img');
      fill.src = page.getAttribute('src');
      fill.alt = '';
      // the page re-laid at its own scale, then pushed sideways and smeared, so the pixels landing in
      // the hole come from BESIDE the subject, not from the subject itself
      var base = 'position:absolute;display:block;width:' + (100 / s.width * 100).toFixed(3) + '%;' +
        'left:' + (-(s.left / s.width) * 100).toFixed(3) + '%;' +
        'top:' + (-(s.top * (1632 / 2880) / s.pad) * 100).toFixed(3) + '%;';
      fill.style.cssText = base + 'filter:blur(22px);transform-origin:50% 50%;' +
        'transform:scale(1.45) translate(' + (s.tilt > 0 ? '-' : '') + '7%, -5%)';
      var fill2 = document.createElement('img');
      fill2.src = fill.src;
      fill2.alt = '';
      // a mirrored second pass fills whatever the first pass still left reading as the subject
      fill2.style.cssText = base + 'filter:blur(26px);opacity:0.45;transform-origin:50% 50%;' +
        'transform:scaleX(-1) scale(1.5) translate(5%, 6%)';
      fillWrap.appendChild(fill);
      fillWrap.appendChild(fill2);
      hole.appendChild(fillWrap);
      wrap.appendChild(hole);

      var lift = document.createElement('div');
      lift.className = 'wm-sticker';
      lift.style.cssText = 'position:absolute;left:' + s.left + '%;top:' + s.top + '%;width:' + s.width + '%;' +
        'pointer-events:none;opacity:0;z-index:3;transform-origin:50% 88%;' +
        'transition:opacity 0.4s ease 0.34s, transform 0.62s cubic-bezier(0.32,0.9,0.4,1)';
      var img = document.createElement('img');
      img.src = s.src;
      img.alt = '';
      img.loading = 'lazy';
      img.style.cssText = 'display:block;width:100%;height:auto;filter:drop-shadow(0 0 0 rgba(0,0,0,0));' +
        'transition:filter 0.7s ease';
      lift.appendChild(img);
      wrap.appendChild(lift);

      var hot = document.createElement('div');
      hot.style.cssText = 'position:absolute;left:' + s.left + '%;top:' + s.top + '%;width:' + s.width + '%;' +
        'height:0;padding-bottom:' + s.pad + '%;z-index:4';
      hot.setAttribute('aria-hidden', 'true');
      wrap.appendChild(hot);

      var on = false;
      var enter = function () {
        if (on) return;
        on = true;
        lift.style.transition = 'opacity 0.16s ease, transform 0.95s cubic-bezier(0.16,1,0.3,1)';
        lift.style.opacity = '1';
        lift.style.transform = 'translateY(-' + s.rise + '%) scale(1.10) rotate(' + s.tilt + 'deg)';
        img.style.filter = 'drop-shadow(0 ' + (26 + i * 2) + 'px 34px rgba(12,10,16,0.34))';
        hole.style.transition = 'opacity 0.3s ease';
        hole.style.opacity = '1';
        setTimeout(function () { if (on) img.style.animation = 'wmStickerSway 5.2s ease-in-out 0s infinite alternate'; }, 620);
      };
      var leave = function () {
        if (!on) return;
        on = false;
        img.style.animation = '';
        lift.style.transition = 'opacity 0.36s ease 0.30s, transform 0.66s cubic-bezier(0.33,0,0.28,1)';
        lift.style.opacity = '0';
        lift.style.transform = 'translateY(0) scale(1) rotate(0deg)';
        img.style.filter = 'drop-shadow(0 0 0 rgba(0,0,0,0))';
        hole.style.transition = 'opacity 0.45s ease 0.25s';
        hole.style.opacity = '0';
      };
      hot.addEventListener('mouseenter', enter);
      hot.addEventListener('mouseleave', leave);
      // trackpad inertia slides the page under a still cursor: re-test on scroll
      window.addEventListener('scroll', function () {
        if (!on) return;
        var r = hot.getBoundingClientRect(), p = window.__vgPt;
        if (!p) return;
        if (p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom) leave();
      }, { passive: true });
    });
  }

  window.addEventListener('mousemove', function (e) { window.__vgPt = { x: e.clientX, y: e.clientY }; }, { passive: true });

  function boot() {
    var page = document.querySelector('img[src$="watchmaker/p03.png"]');
    if (page) mount(page);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
