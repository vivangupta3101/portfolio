// Aeron hero — one continuous camera move over a single plate, played on its own clock.
// The three reference frames are not crossfaded: the plate pans and zooms so its own parting
// wave travels 0.95 -> 0.69 -> 0.72 -> 0.50 of the viewport, which is what makes the sequence
// read as footage instead of a slideshow. After the final push it holds, but nothing freezes:
// the two trail layers keep drifting on their own clocks forever.
//
// Keyframes are authored in viewport widths and are aspect-independent: the plate is
// cover-fitted, so on a viewport narrower than the art (1.4133:1) the art is wider than the
// screen. w is that overspill factor, x0 the parting wave's resting position, and the pan is
// solved per frame from the wanted wave position q instead of being baked in.
//
// window.__aeSeek(p) pins the playhead at p of the timeline (null releases it) — inspection
// hook, no UI, inert in normal use. Listed in CLAUDE.md as dev tooling.
(function () {
  var stage = document.getElementById('ae-stage');
  if (!stage) return;

  var plate = document.getElementById('ae-plate');
  var trails = document.getElementById('ae-trails');
  var trails2 = document.getElementById('ae-trails2');
  var prod = document.getElementById('ae-prod');
  var rim = document.getElementById('ae-rim');
  var glow = document.getElementById('ae-glow');

  var ART = 1491 / 1055;   // plate aspect
  var PART = 0.65;         // parting wave's x within the plate art
  var TIPF = 0.416;        // visor tip's x within the product plate

  // t = seconds, s = zoom over the cover fit (>= 1 keeps the plate covered vertically),
  // q = where the parting wave should sit, tip = where the visor tip should sit (viewport widths)
  var K = [
    { t: 0.00, s: 1.280, q: 0.950, tip: 1.370, e: 0 },   // frame 1 — wave a sliver off the right
    { t: 0.55, s: 1.275, q: 0.950, tip: 1.370, e: 0 },   // settle before the first move
    { t: 2.60, s: 1.130, q: 0.690, tip: 0.780, e: 2 },   // first push — only the visor shows
    { t: 3.70, s: 1.115, q: 0.720, tip: 0.845, e: 1 },   // eases back
    { t: 6.40, s: 1.460, q: 0.500, tip: 0.505, e: 3 },   // harder push, wave reaches centre
    { t: 7.20, s: 1.460, q: 0.500, tip: 0.505, e: 0 }    // hold
  ];
  var END = K[K.length - 1].t;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  // slow lean-in, then drive hard and settle — the "pushes harder" beat
  function easePush(t) { return t < 0.22 ? 2.3 * t * t : 1 - Math.pow(1 - t, 2.6); }

  function sample(time) {
    var i = 0;
    while (i < K.length - 2 && time > K[i + 1].t) i++;
    var a = K[i], b = K[i + 1];
    var t = (time - a.t) / (b.t - a.t);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = b.e === 2 ? easeOut(t) : b.e === 1 ? easeInOut(t) : b.e === 3 ? easePush(t) : t;
    return {
      s: a.s + (b.s - a.s) * t,
      q: a.q + (b.q - a.q) * t,
      tip: a.tip + (b.tip - a.tip) * t
    };
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0 = performance.now();
  var seek = null;

  function frame(now) {
    var t = (now - t0) / 1000;
    var time = seek !== null ? seek * END : reduce ? END : t;
    var v = sample(time);

    // cover overspill: how much wider than the screen the art is, in viewport widths
    var w = Math.max(1, ART * window.innerHeight / window.innerWidth);
    var x0 = 0.5 + (PART - 0.5) * w;          // parting wave at scale 1, transform-origin at the left edge
    var tx = v.q - v.s * x0 + 0.004 * Math.sin(t / 5.2);   // the camera never fully settles

    var breathe = 1 + 0.005 * Math.sin(t / 4.1);
    plate.style.transform = 'translate3d(' + (tx * 100).toFixed(4) + 'vw,' + (0.28 * Math.cos(t / 6.9)).toFixed(3) +
      'vh,0) scale(' + (v.s * breathe).toFixed(5) + ')';

    // Trails: two screen-blended copies of the plate that travel ALONG the streaks, masked in
    // element space so they never reach the light side (the mask rides the same transform, so
    // the art's 0.65 wave is tracked for free). Long periods with big amplitude — at any moment
    // the flow reads as one-way motion at ~2vw/s rather than a visible oscillation.
    var fxA = 12.0 * Math.sin(t / 6.37), fxB = -8.0 * Math.sin(t / 4.3 + 2.0);
    trails.style.transform = 'translate3d(' + ((tx * 100) + fxA).toFixed(4) + 'vw,' + (0.14 * fxA).toFixed(3) +
      'vh,0) scale(' + (v.s * (1.012 + 0.008 * Math.sin(t / 3.7))).toFixed(5) + ')';
    trails.style.opacity = (0.30 + 0.06 * Math.sin(t / 2.9)).toFixed(3);

    trails2.style.transform = 'translate3d(' + ((tx * 100) + fxB).toFixed(4) + 'vw,' + (0.11 * fxB).toFixed(3) +
      'vh,0) scale(' + (v.s * (1.04 + 0.014 * Math.cos(t / 5.9))).toFixed(5) + ')';
    trails2.style.opacity = (0.20 + 0.05 * Math.cos(t / 4.6)).toFixed(3);

    // product: its plate is sized off whichever axis is binding, so the tip is placed from
    // the element's real width rather than an assumed one
    var ew = prod.offsetWidth / window.innerWidth;
    var px = v.tip - TIPF * ew;
    var pe = 1 + 0.012 * Math.sin(t / 3.3);
    prod.style.transform = 'translate3d(' + (px * 100).toFixed(4) + 'vw,' + (-0.6 * Math.cos(t / 5.9)).toFixed(3) + 'vh,0)';

    // rim + bloom strengthen as the visor tip closes on the parting wave
    var near = 1 - Math.abs(v.tip - v.q) / 0.16;
    near = near < 0 ? 0 : near > 1 ? 1 : near;
    var live = px < 1.0 ? 1 : 0;
    rim.style.opacity = (live * (0.18 + 0.82 * near)).toFixed(3);
    glow.style.opacity = (live * (0.10 + 0.55 * near * near) * pe).toFixed(3);

    requestAnimationFrame(frame);
  }

  window.__aeSeek = function (p) {
    seek = (p === null || p === undefined) ? null : Math.max(0, Math.min(1, p));
  };

  requestAnimationFrame(frame);
})();
