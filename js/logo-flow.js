/* Balanced logo flow: symmetric bulge at centre, symmetric fade at both edges.
   The track itself is a plain CSS marquee; this only shapes each mark by its distance
   from the strip's centre, so entry and exit always mirror each other. */
(function () {
  var strip = document.querySelector('.vg-flow');
  if (!strip) return;
  var items = [].slice.call(strip.querySelectorAll('.vg-flow-item'));
  if (!items.length) return;
  var raf = null, visible = true;

  function tick() {
    raf = requestAnimationFrame(tick);
    if (window.__vgBusy) return;
    var box = strip.getBoundingClientRect();
    if (!box.width) return;
    var cx = box.left + box.width / 2, half = box.width / 2;
    for (var i = 0; i < items.length; i++) {
      var r = items[i].getBoundingClientRect();
      var mid = r.left + r.width / 2;
      if (mid < box.left - 400 || mid > box.right + 400) { items[i].style.opacity = '0'; continue; }
      var t = Math.min(1, Math.abs(mid - cx) / half);           // 0 centre, 1 edge
      var scale = 1.24 - 0.44 * t;
      var op = Math.max(0, 1 - Math.pow(t, 1.7) * 1.12);
      var blur = t > 0.55 ? (t - 0.55) * 6.5 : 0;
      items[i].style.transform = 'scale(' + scale.toFixed(3) + ')';
      items[i].style.opacity = op.toFixed(3);
      items[i].style.filter = blur ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
    }
  }
  function start() { if (raf === null && visible) raf = requestAnimationFrame(tick); }
  function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      visible ? start() : stop();
    }, { rootMargin: '120px' }).observe(strip);
  }
  start();
})();
