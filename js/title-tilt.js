/* Hero name reacts to the cursor like a single 3D plane: the whole word turns to face the
   pointer, and letters nearest it push towards the viewer so the line bends through the word.
   Only live once the title has settled at full size, and only within a radius of the name.
   Everything is lerped per frame, so it eases in and out on its own. */
(function () {
  var title = document.getElementById('vg-hero-title');
  if (!title) return;
  var pointerFine = !(window.matchMedia && window.matchMedia('(hover: none)').matches);
  // the plane goes on .vg-rise: its inner span carries the vgRise entrance keyframes, and a
  // filled CSS animation would discard any inline transform written there
  var words = [].slice.call(title.querySelectorAll('.vg-rise'));
  var ls = [].slice.call(title.querySelectorAll('.vg-l'));
  if (!ls.length) return;

  // fit the name to its box so the last letter is never clipped, whatever the viewport
  (function () {
    var box = title.parentElement;
    function fitTitle() {
      var avail = (box ? box.clientWidth : window.innerWidth) * 0.82; // slack for the 3D push, which widens the line
      var fs = parseFloat(getComputedStyle(title).fontSize) || 100;
      title.style.fontSize = fs + 'px';
      var em = title.offsetWidth / fs;                  // intrinsic width in em, layout-only
      if (!em) return;
      var target = Math.min(232, avail / em);
      title.style.fontSize = target.toFixed(2) + 'px';
    }
    fitTitle();
    window.addEventListener('resize', fitTitle);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
  })();

  var TURN_Y = 16;    // deg the plane turns about its vertical axis
  var TURN_X = 9;     // deg the plane tips about its horizontal axis
  var LEAN = 26;      // deg each letter adds, facing the pointer
  var PUSH = 44;      // px a letter closest to the pointer comes forward
  var LIFT = 10;      // px of vertical give
  var REACH = 560;    // px sideways for a letter's full lean
  var RADIUS = 340;   // px outside the name's box where the effect still responds
  var LERP = 0.08;

  var st = { ry: 0, rx: 0 };
  var cur = ls.map(function () { return { r: 0, z: 0, y: 0 }; });
  var mx = null, my = null;

  window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('mouseleave', function () { mx = null; }, { passive: true });

  function settle() {
    var hero = document.getElementById('top');
    if (!hero) return 1;
    var range = Math.max(1, hero.offsetHeight - window.innerHeight);
    var p = Math.max(0, Math.min(1, window.scrollY / range));
    return Math.max(0, Math.min(1, (p - 0.86) / 0.14));
  }
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  function frame() {
    requestAnimationFrame(frame);
    if (window.__vgBusy) return;
    var box = title.getBoundingClientRect();
    if (box.bottom < -200 || box.top > window.innerHeight + 200) return;

    var gate = settle();
    var near = 0;
    if (mx !== null && gate > 0) {
      var dx = Math.max(box.left - mx, 0, mx - box.right);
      var dy = Math.max(box.top - my, 0, my - box.bottom);
      near = smooth(Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / RADIUS));
    }
    var amp = gate * near;

    // the word as a whole plane
    var tRy = 0, tRx = 0;
    if (amp > 0) {
      var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      tRy = -Math.max(-1, Math.min(1, (mx - cx) / (box.width / 2))) * TURN_Y * amp;
      tRx = Math.max(-1, Math.min(1, (my - cy) / (box.height * 1.6))) * TURN_X * amp;
    }
    st.ry += (tRy - st.ry) * LERP;
    st.rx += (tRx - st.rx) * LERP;
    for (var w = 0; w < words.length; w++) {
      words[w].style.transform = 'rotateY(' + st.ry.toFixed(3) + 'deg) rotateX(' + st.rx.toFixed(3) + 'deg)';
    }

    // per-letter bend: lean towards the pointer, closest letters forward
    for (var i = 0; i < ls.length; i++) {
      var tr = 0, tz = 0, ty = 0;
      if (amp > 0) {
        var r = ls[i].getBoundingClientRect();
        var lx = r.left + r.width / 2;
        var d = mx - lx;
        var t = Math.max(-1, Math.min(1, d / REACH));
        var prox = Math.max(0, 1 - Math.abs(d) / (box.width * 0.42));
        prox = smooth(prox);
        tr = -t * LEAN * amp;
        tz = prox * PUSH * amp;
        ty = -prox * LIFT * amp;
      }
      var c = cur[i];
      c.r += (tr - c.r) * LERP;
      c.z += (tz - c.z) * LERP;
      c.y += (ty - c.y) * LERP;
      ls[i].style.transform = 'translate3d(0,' + c.y.toFixed(2) + 'px,' + c.z.toFixed(2) + 'px) rotateY(' + c.r.toFixed(3) + 'deg)';
    }
  }
  if (pointerFine) requestAnimationFrame(frame);
})();
