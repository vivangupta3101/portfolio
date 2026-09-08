// Technical-annotation graphics threaded through the project list — the hero overlay's vocabulary
// (dither grids, tick rails, crosshairs, travelling hairlines, corner ticks) in ink instead of
// white. They live on one page-level layer behind the work, placed only in the gaps BETWEEN rows
// and in the page margins, so nothing ever sits over copy. Spans are measured off the rows: a rail
// can run the height of two or three projects, a hairline can cross the whole page in one gap.
// Everything fades out while a tile is expanded, so the traced-SVG draw-out is never competed with.
(function () {
  var work = document.getElementById('vg-work');
  if (!work) return;
  var ACCENT = '#ec7e41';
  var INK = 'rgba(19,19,19,0.3)';
  var INK_SOFT = 'rgba(19,19,19,0.18)';

  var layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0;' +
    'transition:opacity 0.55s ease';
  if (getComputedStyle(work).position === 'static') work.style.position = 'relative';
  work.insertBefore(layer, work.firstChild);

  function el(css, parent) {
    var d = document.createElement('div');
    d.style.cssText = css;
    (parent || layer).appendChild(d);
    return d;
  }

  var devices = [];

  // ---- dither grid: pattern scrolls a column per beat, block drifts a pixel or two ----
  function grid(host, cols, rows) {
    cols = cols || 5; rows = rows || 3;
    var CELL = 6, STEP = 8;
    var base = [];
    for (var i = 0; i < cols * rows; i++) base.push((i * 7 + (i % 3)) % 5 < 2 ? 0 : 1);
    var wrap = el('position:absolute;inset:0', host);
    var cells = base.map(function (_, k) {
      return el('position:absolute;width:' + CELL + 'px;height:' + CELL + 'px;left:' + (k % cols) * STEP +
        'px;top:' + Math.floor(k / cols) * STEP + 'px;box-sizing:border-box;' +
        'transition:background 0.24s linear,border-color 0.24s linear', wrap);
    });
    host.style.width = cols * STEP + 'px';
    host.style.height = rows * STEP + 'px';
    return function (t) {
      var beat = Math.floor(t / 0.22);
      if (wrap._b !== beat) {
        wrap._b = beat;
        cells.forEach(function (c, k) {
          var col = k % cols, row = Math.floor(k / cols);
          var on = base[row * cols + ((col + beat) % cols)] === 1;
          if ((col + row + beat) % 7 === 0) on = !on;
          c.style.background = on ? INK : 'transparent';
          c.style.borderWidth = on ? '0' : '1px';
          c.style.borderStyle = 'solid';
          c.style.borderColor = on ? 'transparent' : INK_SOFT;
        });
      }
      wrap.style.transform = 'translate(' + (Math.sin(t * 1.4) * 1.5).toFixed(2) + 'px,' +
        (Math.cos(t * 0.9) * 1.5).toFixed(2) + 'px)';
    };
  }

  // ---- vertical rail: hairline with ticks and one orange marker running its length ----
  function rail(host, ticks) {
    host.style.width = '8px';
    var line = el('position:absolute;left:0;top:0;bottom:0;width:1px;background:' + INK, host);
    for (var i = 0; i <= ticks; i++) {
      el('position:absolute;left:0;top:' + (i * 100 / ticks) + '%;width:' + (i % 2 ? 4 : 7) +
        'px;height:1px;background:' + INK, line);
    }
    var run = el('position:absolute;left:-1px;top:0;width:9px;height:1px;background:' + ACCENT, line);
    return function (t) {
      var f = (t / 6) % 1;
      run.style.top = (f * 100).toFixed(2) + '%';
      run.style.opacity = (0.3 + 0.7 * Math.sin(f * Math.PI)).toFixed(2);
    };
  }

  // ---- horizontal hairline: draws across a gap, with a scanning highlight ----
  function span(host) {
    host.style.height = '1px';
    el('position:absolute;inset:0;background:' + INK_SOFT, host);
    el('position:absolute;left:0;top:-3px;width:1px;height:7px;background:' + INK, host);
    el('position:absolute;right:0;top:-3px;width:1px;height:7px;background:' + INK, host);
    var run = el('position:absolute;top:0;left:0;width:64px;height:1px;background:linear-gradient(' +
      'to right,rgba(236,126,65,0) 0%,' + ACCENT + ' 50%,rgba(236,126,65,0) 100%)', host);
    return function (t) {
      var f = (t / 5) % 1;
      run.style.transform = 'translateX(' + (f * (host.offsetWidth + 64) - 64).toFixed(1) + 'px)';
    };
  }

  // ---- crosshair: a registration mark that breathes and drifts ----
  function cross(host) {
    host.style.width = '30px'; host.style.height = '30px';
    var wrap = el('position:absolute;left:15px;top:15px;width:0;height:0', host);
    el('position:absolute;left:-13px;top:0;width:26px;height:1px;background:' + INK, wrap);
    el('position:absolute;left:0;top:-13px;width:1px;height:26px;background:' + INK, wrap);
    var ring = el('position:absolute;left:-5px;top:-5px;width:10px;height:10px;border:1px solid ' +
      ACCENT + ';border-radius:50%', wrap);
    return function (t) {
      wrap.style.transform = 'translate(0,' + (Math.sin(t * 0.7) * 5).toFixed(2) + 'px)';
      ring.style.transform = 'scale(' + (1 + Math.sin(t * 1.9) * 0.18).toFixed(3) + ')';
      ring.style.opacity = (0.5 + 0.5 * Math.abs(Math.sin(t * 0.95))).toFixed(2);
    };
  }

  // ---- corner ticks: a crop frame that keeps re-registering itself ----
  function crop(host, w, h) {
    host.style.width = w + 'px'; host.style.height = h + 'px';
    var parts = ['left:0;top:0;border-left:1px solid;border-top:1px solid',
      'right:0;top:0;border-right:1px solid;border-top:1px solid',
      'left:0;bottom:0;border-left:1px solid;border-bottom:1px solid',
      'right:0;bottom:0;border-right:1px solid;border-bottom:1px solid'].map(function (c) {
      return el('position:absolute;width:11px;height:11px;border-color:' + INK + ';' + c, host);
    });
    return function (t) {
      var beat = Math.floor(t / 1.1) % 4;
      parts.forEach(function (p, n) {
        p.style.borderColor = n === beat ? ACCENT : INK;
        p.style.opacity = n === beat ? '1' : '0.7';
      });
      host.style.transform = 'translate(' + (Math.cos(t * 0.5) * 3).toFixed(2) + 'px,0)';
    };
  }

  // ---- bar meter: three hairlines whose lengths cycle, like a readout ----
  function meter(host) {
    host.style.width = '46px'; host.style.height = '16px';
    var bars = [0, 1, 2].map(function (i) {
      return el('position:absolute;left:0;top:' + (i * 6) + 'px;height:1px;width:46px;background:' +
        (i === 1 ? ACCENT : INK) + ';transform-origin:left center', host);
    });
    return function (t) {
      bars.forEach(function (b, i) {
        b.style.transform = 'scaleX(' + (0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + i * 0.25)))).toFixed(3) + ')';
      });
    };
  }

  // ---- placement: measure the rows, then hang devices in the gaps and margins ----
  var rows = [].slice.call(work.querySelectorAll('.vg-proj'));
  if (!rows.length) return;

  function build() {
    layer.innerHTML = '';
    devices.length = 0;
    var wb = work.getBoundingClientRect();
    var pad = parseFloat(getComputedStyle(work).paddingLeft) || 32;
    var boxes = rows.map(function (r) {
      var b = r.getBoundingClientRect();
      return { top: b.top - wb.top, bottom: b.bottom - wb.top, h: b.height,
        reversed: getComputedStyle(r).flexDirection.indexOf('reverse') > 0 };
    });

    // long rails in the page margin, each spanning two or three projects
    var groups = [[0, 2], [3, 5], [6, 8], [9, 11]];
    groups.forEach(function (g, gi) {
      var a = boxes[g[0]], b = boxes[Math.min(g[1], boxes.length - 1)];
      if (!a || !b) return;
      var left = gi % 2 === 0;
      var host = el('position:absolute;' + (left ? 'left:' + (pad - 18) : 'right:' + (pad - 18)) +
        'px;top:' + (a.top + a.h * 0.12) + 'px;height:' + (b.bottom - a.top - a.h * 0.24) + 'px');
      devices.push({ tick: rail(host, 6 + gi), t0: gi * 1.3 });
    });

    // one device in each gap between rows, alternating type and side
    var makers = [
      function (h) { return grid(h, 6, 3); },
      function (h) { return crop(h, 54, 32); },
      cross,
      meter,
      function (h) { return grid(h, 4, 4); }
    ];
    for (var i = 0; i < boxes.length - 1; i++) {
      var gapTop = boxes[i].bottom, gapBottom = boxes[i + 1].top;
      var mid = (gapTop + gapBottom) / 2;
      if (gapBottom - gapTop < 40) continue;

      // every third gap gets a hairline right across the page instead of a small device
      if (i % 3 === 1) {
        // a measured segment, not a rule across the page: full width read as a divider
        var wide = boxes[i].reversed;
        var hostS = el('position:absolute;' + (wide ? 'left' : 'right') + ':' + (pad + 4) +
          'px;width:min(260px,26vw);top:' + mid.toFixed(1) + 'px');
        devices.push({ tick: span(hostS), t0: i * 0.9 });
        continue;
      }
      var side = i % 2 === 0 ? 'left' : 'right';
      var host2 = el('position:absolute;' + side + ':' + (pad + 6) + 'px;top:' + (mid - 20).toFixed(1) + 'px');
      devices.push({ tick: makers[i % makers.length](host2), t0: i * 0.7 });
    }
  }

  build();
  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); });

  // ---- run only while the list is on screen, and never while a tile is expanded ----
  var visible = false;
  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
  }, { threshold: 0 }).observe(work);

  var start = performance.now();
  (function loop(now) {
    var focus = document.body.classList.contains('vg-focus') || !!document.getElementById('vg-reader');
    layer.style.opacity = visible && !focus ? '1' : '0';
    if (visible && !focus) {
      var t = (now - start) / 1000;
      devices.forEach(function (d) { d.tick(t + d.t0); });
    }
    requestAnimationFrame(loop);
  })(start);
})();
