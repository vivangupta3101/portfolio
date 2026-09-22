// "will solve" -> "Prototype 1 -": the two headlines are the same ink. As the first line leaves the
// top half of the screen its letters lift off, drift as loose floating characters, and settle into
// the Prototype headline lower on the board. Everything is a pure function of scroll position, so
// scrolling back up runs it exactly in reverse.
(function () {
  'use strict';

  var CANVAS_W = 1920;
  var SRC_BASE = 867;          // canvas-space baseline of "will solve"
  var DST_BASE = 1769;         // canvas-space baseline of "Prototype 1 -"
  var ANCHOR = 0.28;           // the hand-off line, as a share of the viewport

  function seeded(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(a, b, p) { var t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeInOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  function boot() {
    var canvas = document.querySelector('#wm-adi [data-board-canvas]');
    if (!canvas) return;
    var srcEls = [].slice.call(canvas.querySelectorAll('[data-morph-src]'));
    var dstEls = [].slice.call(canvas.querySelectorAll('[data-morph-dst]'));
    if (!srcEls.length || !dstEls.length) return;

    var layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;' +
      'opacity:0;will-change:opacity';
    canvas.appendChild(layer);

    // every glyph of a headline word, measured in canvas space
    function glyphsOf(els, baseline) {
      var out = [];
      els.forEach(function (el) {
        var cs = getComputedStyle(el);
        var size = parseFloat(cs.fontSize);
        var text = el.textContent;
        var probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;line-height:1;' +
          'left:' + el.offsetLeft + 'px;top:' + el.offsetTop + 'px;font-family:' + cs.fontFamily +
          ';font-size:' + size + 'px;font-weight:' + cs.fontWeight + ';letter-spacing:' + cs.letterSpacing;
        for (var i = 0; i < text.length; i++) {
          var s = document.createElement('span');
          s.textContent = text[i];
          probe.appendChild(s);
        }
        canvas.appendChild(probe);
        [].slice.call(probe.children).forEach(function (s) {
          if (!s.textContent.trim()) return;
          out.push({
            ch: s.textContent,
            x: el.offsetLeft + s.offsetLeft,
            y: baseline,
            size: size,
            font: cs.fontFamily,
            weight: cs.fontWeight,
            ls: cs.letterSpacing,
            color: cs.color
          });
        });
        canvas.removeChild(probe);
      });
      return out;
    }

    var src = glyphsOf(srcEls, SRC_BASE);
    var dst = glyphsOf(dstEls, DST_BASE);
    if (!src.length || !dst.length) return;

    // one flying element per glyph of each headline: the old letters fade out through the drift,
    // the new ones fade in out of it
    function make(g, i, role) {
      var n = document.createElement('div');
      n.style.cssText = 'position:absolute;left:0;top:0;white-space:pre;line-height:1;' +
        'font-family:' + g.font + ';font-weight:' + g.weight + ';letter-spacing:' + g.ls +
        ';color:' + g.color + ';transform-origin:center center;will-change:transform,opacity,font-size';
      layer.appendChild(n);
      n.textContent = g.ch;
      var r1 = seeded(i + (role === 'a' ? 1 : 91));
      var r2 = seeded(i * 2.7 + (role === 'a' ? 17 : 53));
      var r3 = seeded(i * 4.3 + (role === 'a' ? 31 : 71));
      return {
        el: n, g: g, role: role,
        ox: (r1 - 0.5) * 420, oy: (r2 - 0.5) * 300, rot: (r3 - 0.5) * 46,
        phase: r1 * 6.28, speed: 0.7 + r2 * 0.8
      };
    }

    var flyers = src.map(function (g, i) { return make(g, i, 'a'); })
      .concat(dst.map(function (g, i) { return make(g, i, 'b'); }));

    // an 'a' glyph aims at the new headline's matching letter; a 'b' glyph comes out of the old one
    flyers.forEach(function (f, i) {
      if (f.role === 'a') {
        var k = Math.min(i, dst.length - 1);
        f.from = f.g; f.to = dst[k];
      } else {
        var j = i - src.length;
        f.from = src[Math.min(j, src.length - 1)]; f.to = f.g;
      }
    });

    var live = false, raf = 0, lastP = -1;

    function progress() {
      var r = canvas.getBoundingClientRect();
      var s = r.width / CANVAS_W;
      var srcVp = r.top + SRC_BASE * s;
      var span = (DST_BASE - SRC_BASE) * s;
      return clamp((window.innerHeight * ANCHOR - srcVp) / span);
    }

    function paint(p, t) {
      var e = easeInOut(p);
      var bell = Math.pow(Math.sin(Math.PI * p), 1.6);   // quiet at both ends, calm on landing
      // the landing bubble: the new headline overshoots once as it forms
      var xfade = smooth(0.16, 0.86, p);   // complementary: the cloud keeps full ink mid-flight
      var land = 1 + 0.045 * Math.sin(Math.PI * clamp((p - 0.74) / 0.26));
      for (var i = 0; i < flyers.length; i++) {
        var f = flyers[i], a = f.from, b = f.to;
        var size = a.size + (b.size - a.size) * e;
        var x = a.x + (b.x - a.x) * e + f.ox * bell;
        var y = a.y + (b.y - a.y) * e + f.oy * bell +
          Math.sin(t * f.speed + f.phase) * 16 * bell;
        var rot = f.rot * bell;
        var sc = f.role === 'b' ? land : 1;
        // the cross-fade overlaps widely: the cloud never thins out mid-flight
        var op = f.role === 'a' ? Math.sqrt(1 - xfade) : Math.sqrt(xfade);
        f.el.style.fontSize = size + 'px';
        f.el.style.opacity = op;
        f.el.style.transform = 'translate(' + x + 'px,' + (y - size * 0.8) + 'px) rotate(' +
          rot + 'deg) scale(' + sc + ')';
      }
    }

    function frame() {
      raf = 0;
      var p = progress();
      var active = p > 0.0005 && p < 0.9995;
      if (active !== live) {
        live = active;
        layer.style.opacity = active ? '1' : '0';
        srcEls.forEach(function (el) { el.style.visibility = p > 0.0005 ? 'hidden' : ''; });
        dstEls.forEach(function (el) { el.style.visibility = p < 0.9995 ? 'hidden' : ''; });
      } else if (!active) {
        srcEls.forEach(function (el) { el.style.visibility = p > 0.0005 ? 'hidden' : ''; });
        dstEls.forEach(function (el) { el.style.visibility = p < 0.9995 ? 'hidden' : ''; });
      }
      if (active) {
        paint(p, performance.now() / 1000);
        raf = requestAnimationFrame(frame);   // keep floating while the letters are in the air
      } else if (p !== lastP) {
        paint(p, performance.now() / 1000);
      }
      lastP = p;
    }

    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () {
      // geometry is read live each frame, so a resize only needs a repaint
      kick();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(kick);
    kick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
