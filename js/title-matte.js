/* Track-matte previews in the hero name: hovering a letter pair fills those letters with a
   photo — the image is seen through the glyphs, the rest of the frame stays the live video.
   Groups: VI / VA / N.G / UP / TA. Swap the file names in PHOTOS for the real shots. */
(function () {
  var title = document.getElementById('vg-hero-title');
  if (!title) return;
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
  var ls = [].slice.call(title.querySelectorAll('.vg-l'));
  if (ls.length < 11) return;

  var GROUPS = [[0, 1], [2, 3], [4, 5, 6], [7, 8], [9, 10]];
  var PHOTOS = [
    'assets/images/aeron-collage.png',
    'assets/images/mobius-poster.png',
    'assets/images/Website Pics_20.jpg',
    'assets/images/Website Pics1_07.jpg',
    'assets/images/aeron-collage.png'
  ];
  // per-group framing. out: <1 pulls the photo back to show more. shift x/y: nudge in
  // fractions of the crop size. Tune live with the photo editor (press P) and bake the
  // copied numbers back into these arrays.
  var OUT = [1.55, 1.8, 1, 1, 1.55];
  var SHIFT = [0.25, 0, 0, 0, -0.25];
  var SHIFT_Y = [0, 0.15, 0, 0, 0];
  var HIT = 6;        // px of slack around a glyph box
  var BLEED = 0.22;   // image reaches this much past the pair's box, so it reads as one photo
  var ZOOM = 1.14;    // starting zoom, eased to 1 on reveal

  var imgs = PHOTOS.map(function (src) { var i = new Image(); i.src = src; return i; });
  var groups = GROUPS.map(function (g, gi) { return { idx: g, src: PHOTOS[gi], img: imgs[gi], on: false, k: ZOOM }; });

  // handle for the dev photo editor: it mutates the framing arrays, swaps sources, and can pin a
  // group open so it can be judged without holding the cursor over the letters. Nothing here
  // persists — the editor owns its own storage, so the shipped site always renders the baked
  // arrays above.
  var api = window.__vgMatte = {
    labels: ['VI', 'VA', 'N.G', 'UP', 'TA'],
    out: OUT, shift: SHIFT, shiftY: SHIFT_Y,
    pinned: -1,
    src: function (i) { return groups[i].src; },
    setSrc: function (i, url) {
      groups[i].src = url;
      var im = new Image(); im.src = url; groups[i].img = im;
    }
  };

  // the fill colour is what cross-fades on reveal; background-size is eased in js instead,
  // since a css transition on it fought the per-frame writes and made the photo jump into place
  ls.forEach(function (l) { l.style.transition = '-webkit-text-fill-color 0.4s ease, color 0.4s ease'; });

  function clear(g) {
    g.idx.forEach(function (i) {
      var s = ls[i].style;
      s.backgroundImage = ''; s.backgroundSize = ''; s.backgroundPosition = '';
      s.webkitBackgroundClip = ''; s.backgroundClip = ''; s.webkitTextFillColor = '';
    });
  }

  var mx = null, my = null;
  window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('mouseleave', function () { mx = null; }, { passive: true });

  function frame() {
    requestAnimationFrame(frame);
    if (window.__vgBusy) return;
    var tb = title.getBoundingClientRect();
    if (tb.bottom < 0 || tb.top > window.innerHeight) return;

    for (var b = 0; b < groups.length; b++) {
      var g = groups[b];
      var rects = g.idx.map(function (i) { return ls[i].getBoundingClientRect(); });
      var left = Math.min.apply(null, rects.map(function (r) { return r.left; }));
      var right = Math.max.apply(null, rects.map(function (r) { return r.right; }));
      var top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
      var bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));

      var hover = api.pinned === b;
      if (!hover && mx !== null) {
        for (var k = 0; k < rects.length; k++) {
          var r = rects[k];
          if (mx >= r.left - HIT && mx <= r.right + HIT && my >= r.top - HIT && my <= r.bottom + HIT) { hover = true; break; }
        }
      }
      if (hover !== g.on) {
        g.on = hover;
        if (hover) { g.k = ZOOM; }
        else {
          g.idx.forEach(function (i) { ls[i].style.webkitTextFillColor = ''; });
          (function (gg) {
            clearTimeout(gg.t);
            gg.t = setTimeout(function () { if (!gg.on) clear(gg); }, 440);
          })(g);
          continue;
        }
      }
      if (!hover) continue;

      // the pair's box, bled out a little, is what the photo covers
      var pw = (right - left), ph = (bottom - top);
      var bw = pw * (1 + BLEED * 2), bh = ph * (1 + BLEED * 2);
      var bx = left - pw * BLEED, by = top - ph * BLEED;

      var nat = (g.img.naturalWidth && g.img.naturalHeight) ? g.img.naturalWidth / g.img.naturalHeight : 1.5;
      var cw = bw, ch = bw / nat;
      if (ch < bh) { ch = bh; cw = bh * nat; }
      var out = OUT[b] || 1; cw *= out; ch *= out;
      var zoom = g.k;                                   // eased by the css transition on the letters
      cw *= zoom; ch *= zoom;
      var ox = bx + (bw - cw) / 2 + (SHIFT[b] || 0) * cw;
      var oy = by + (bh - ch) / 2 + (SHIFT_Y[b] || 0) * ch;

      for (var i2 = 0; i2 < g.idx.length; i2++) {
        var lr = rects[i2], st = ls[g.idx[i2]].style;
        st.backgroundImage = 'url("' + g.src + '")';
        st.backgroundRepeat = 'no-repeat';
        st.backgroundSize = cw.toFixed(1) + 'px ' + ch.toFixed(1) + 'px';
        st.backgroundPosition = (ox - lr.left).toFixed(1) + 'px ' + (oy - lr.top).toFixed(1) + 'px';
        st.webkitBackgroundClip = 'text';
        st.backgroundClip = 'text';
        st.webkitTextFillColor = 'transparent';
      }
      g.k += (1 - g.k) * 0.05;   // slow, even settle out of the opening zoom
    }
  }
  requestAnimationFrame(frame);
})();
