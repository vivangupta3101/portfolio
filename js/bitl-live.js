(function () {
"use strict";

// BitL reads as the flat deck it is. The only live parts are on page 1: the grid lights up under the
// cursor (a blurred copy of the same grid, masked to a soft disc) and the cursor drags a short trail
// across the floor. Everything else is the original artwork, untouched.
const BASE = 'assets/images/bitl-live/';
const STATEMENT = "\u201CWhat if 90's design language had access to modern manufacturing processes?\u201D";

const el = (tag, css) => { const n = document.createElement(tag); if (css) n.style.cssText = css; return n; };

// Alignment of each blurred grid copy over its flat page, in % of the frame (dy positive = down),
// plus a scale multiplier. glow.png is rendered at a different aspect than p00, so page 1 needs a
// nudge down; page 2's glow is keyed from its own page and starts at zero. Tunable live with the
// G bar (js/grid-glow-dev.js) — bake settled numbers here.
const ADJ = { p1: { dx: 0, dy: 2.8, sc: 1 }, p2: { dx: 0, dy: 0, sc: 1 } };
try {
  const saved = JSON.parse(localStorage.getItem('vg-glow-adj') || 'null');
  if (saved) { Object.assign(ADJ.p1, saved.p1 || {}); Object.assign(ADJ.p2, saved.p2 || {}); }
} catch (e) {}
const place = (node, a) => { node._adj = a; };
// The cursor glow is a fixed-size spotlight (a static radial mask) that is only ever moved with
// transforms, with the grid image counter-moved inside it — so following the cursor is compositor
// work. Rewriting a full-page mask-image every frame forced a repaint of the whole page and was
// what made the trail and cursor stutter.
const SPOT_MASK = 'radial-gradient(circle closest-side at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.72) 42%, rgba(0,0,0,0) 74%)';
const spotlight = (img) => {
  const spot = el('div', 'position:absolute;left:0;top:0;pointer-events:none;mix-blend-mode:screen;will-change:transform;' +
    '-webkit-mask-image:' + SPOT_MASK + ';mask-image:' + SPOT_MASK + ';-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:100% 100%;mask-size:100% 100%');
  const box = el('div', 'position:absolute;left:0;top:0');
  img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none;pointer-events:none;' +
    'filter:brightness(1.6) saturate(1.15)';
  box.appendChild(img); spot.appendChild(box);
  let lw = 0, lh = 0, lk = '';
  spot.move = (r, cx, cy) => {
    const S = Math.round(innerWidth * 0.68);
    if (r.width !== lw || r.height !== lh || spot._s !== S) {
      lw = r.width; lh = r.height; spot._s = S;
      spot.style.width = spot.style.height = S + 'px';
      box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
    }
    const ox = cx - S / 2, oy = cy - S / 2, a = img._adj || { dx: 0, dy: 0, sc: 1 };
    const k = ox.toFixed(1) + ',' + oy.toFixed(1) + ',' + a.dx + ',' + a.dy + ',' + a.sc;
    if (k === lk) return; lk = k;
    spot.style.transform = 'translate3d(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px,0)';
    box.style.transform = 'translate3d(' + (-ox).toFixed(1) + 'px,' + (-oy).toFixed(1) + 'px,0) translate(' + a.dx + '%,' + a.dy + '%) scale(' + a.sc + ')';
  };
  return spot;
};

window.mountBitlHero = function () {
  const wrap = el('div', 'position:relative;width:100%;line-height:0;font-size:0');

  // page 1, flat, with the two live layers sitting on top of it
  const stage = el('div', 'position:relative;width:100%;line-height:0;font-size:0');
  stage.setAttribute('data-screen-label', 'BitL cover');
  // reuse the already-decoded copy the home page parked on load, if it is there
  const P0 = 'assets/images/bitl/p00.webp';
  const page = (window.__vgWarm && window.__vgWarm[P0]) || el('img');
  page.style.cssText = 'display:block;width:100%;height:auto;margin-bottom:-1px';
  if (!page.src) page.src = P0;
  page.alt = ''; page.width = 2745; page.height = 1839; page.fetchPriority = 'high'; page.decoding = 'async';
  // The glow and trail live behind the console: a knockout mask (the console silhouette, dilated to
  // clear its violet outline, with a feathered edge) removes them wherever the device sits, so the
  // floor lights up around it instead of washing over it.
  const clip = el('div', 'position:absolute;inset:0;pointer-events:none;' +
    '-webkit-mask-image:url(' + BASE + 'console-knockout.png);mask-image:url(' + BASE + 'console-knockout.png);' +
    '-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat');
  const glow = el('img');
  glow.src = BASE + 'glow.png'; glow.alt = ''; glow.decoding = 'async';
  place(glow, ADJ.p1);
  const spot1 = spotlight(glow);
  const trail = el('canvas', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;' +
    'mix-blend-mode:screen;opacity:0.9');
  clip.appendChild(spot1); clip.appendChild(trail);
  stage.appendChild(page); stage.appendChild(clip);
  wrap.appendChild(stage);

  // page 2 carries the same floor grid off the bottom of page 1, so it lights up the same way
  const stage2 = el('div', 'position:relative;width:100%;line-height:0;font-size:0');
  const two = el('img', 'display:block;width:100%;height:auto;margin-bottom:-1px');
  two.src = 'assets/images/bitl/p01e.webp'; two.alt = '';
  two.width = 2745; two.height = 1839; two.decoding = 'async';
  const glow2 = el('img');
  glow2.src = BASE + 'glow2.png'; glow2.alt = ''; glow2.decoding = 'async';
  place(glow2, ADJ.p2);
  const spot2 = spotlight(glow2);
  stage2.style.overflow = 'hidden';
  stage2.appendChild(two); stage2.appendChild(spot2);
  wrap.appendChild(stage2);

  // the statement, rising into place
  const brk = el('section', 'position:relative;width:100%;background:#000;display:flex;align-items:center;' +
    'justify-content:center;padding:30vh 40px;line-height:1.5;box-sizing:border-box');
  brk.setAttribute('data-screen-label', 'BitL statement');
  const mask = el('div', 'overflow:hidden;max-width:1180px;padding-bottom:0.14em;margin-bottom:-0.14em');
  const line = el('p', "margin:0;font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;" +
    'font-size:clamp(26px,3.6vw,64px);line-height:1.18;letter-spacing:-0.015em;text-align:center;text-wrap:balance;' +
    'background:linear-gradient(180deg,#ff6b5e 0%,#f3323f 46%,#c4132a 100%);-webkit-background-clip:text;' +
    'background-clip:text;color:transparent;transform:translateY(112%)');
  line.textContent = STATEMENT;
  mask.appendChild(line); brk.appendChild(mask); wrap.appendChild(brk);

  const lite = matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches;
  let px = innerWidth * 0.5, py = innerHeight * 0.7;
  let moved = true;
  const onMove = (e) => { px = e.clientX; py = e.clientY; moved = true; };
  addEventListener('mousemove', onMove, { passive: true });

  let raf = 0, dead = false, started = false;
  const ctx = trail.getContext('2d');
  const pts = []; // client coordinates, shared by both canvases

  // the same trail continues over the rest of the deck: a fixed canvas above the reader, faded in
  // only once page 1 has scrolled away so the two never draw the cursor twice
  const roam = el('canvas', 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:8005;' +
    'mix-blend-mode:screen;opacity:0;transition:opacity 0.35s ease;display:none');
  const rctx = roam.getContext('2d');

  const stroke = (c, w, hgt, map, gate) => {
    c.clearRect(0, 0, w, hgt);
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = map(pts[i - 1]), p1 = map(pts[i]), p2 = map(pts[i + 1]);
      const k = i / pts.length;
      const a = k * k * pts[i].a * 0.55 * (gate ? gate(p1, hgt) : 1);
      if (a <= 0.002) continue;
      c.strokeStyle = 'rgba(255,58,66,' + a.toFixed(3) + ')';
      c.lineWidth = 1.5 + k * 3.5;
      c.beginPath();
      c.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      c.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      c.stroke();
    }
  };

  let live = 0, roamOn = false, coverOn = null;
  function frame() {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const r = stage.getBoundingClientRect();
    const scrolled = r.top !== frame._t; frame._t = r.top;

    // the tip eases toward the cursor rather than snapping, so a fast turn rounds off instead of
    // showing the corner where the mouse changed direction
    const last = pts[pts.length - 1];
    if (!last) pts.push({ x: px, y: py, a: 1 });
    else {
      const nx = last.x + (px - last.x) * 0.34, ny = last.y + (py - last.y) * 0.34;
      if (Math.hypot(nx - last.x, ny - last.y) > 1.2) pts.push({ x: nx, y: ny, a: 1 });
    }
    if (pts.length > 30) pts.shift();
    // nothing moved and the trail has faded out: skip every draw this frame
    let alive = false;
    for (let i = 0; i < pts.length; i++) if (pts[i].a > 0.01) { alive = true; break; }
    const dirty = moved || scrolled || alive || live > 0;
    live = alive ? 2 : Math.max(0, live - 1);
    moved = false;

    const onCover = r.width && r.bottom > innerHeight * 0.25;
    const coverVis = r.width && r.bottom > 0 && r.top < innerHeight;
    if (coverVis && dirty) {
      spot1.move(r, px - r.left, py - r.top);
      const w = Math.round(r.width * 0.5), hgt = Math.round(r.height * 0.5);
      if (trail.width !== w) { trail.width = w; trail.height = hgt; }
      stroke(ctx, w, hgt, (p) => ({ x: ((p.x - r.left) / r.width) * w, y: ((p.y - r.top) / r.height) * hgt }),
        (p, h) => Math.max(0, Math.min(1, (p.y / h - 0.52) / 0.22))); // only over the grid
    }

    const r2 = stage2.getBoundingClientRect();
    if (dirty && r2.width && r2.bottom > 0 && r2.top < innerHeight) spot2.move(r2, px - r2.left, py - r2.top);

    if (coverOn !== onCover) {
      coverOn = onCover;
      roam.style.opacity = onCover ? '0' : '1';
      if (!onCover) roam.style.display = '';
    }
    if (!onCover && dirty) {
      const w = Math.round(innerWidth * 0.5), hgt = Math.round(innerHeight * 0.5);
      if (roam.width !== w || roam.height !== hgt) { roam.width = w; roam.height = hgt; }
      stroke(rctx, w, hgt, (p) => ({ x: p.x * 0.5, y: p.y * 0.5 }), null);
      roamOn = true;
    } else if (onCover && roamOn) { roamOn = false; setTimeout(() => { if (coverOn) roam.style.display = 'none'; }, 400); }

    pts.forEach((p) => { p.a *= 0.945; });
    checkRise();
  }

  // the statement rises once it is actually on screen. A scroll check rather than an
  // IntersectionObserver: the reader is a fixed overlay with its own scroller, where IO does not
  // reliably report, and the rAF loop is already running.
  const checkRise = () => {
    if (started) return;
    // measured on the text itself, not its section — the section starts 30vh above the line, so
    // watching the section fired the rise while the words were still below the fold
    const br = mask.getBoundingClientRect();
    if (br.height && br.top < innerHeight * 0.86 && br.bottom > 0) {
      started = true;
      line.style.transition = 'transform 1.25s cubic-bezier(0.19,1,0.22,1)';
      line.style.transform = 'translateY(0)';
    }
  };

  // handle for the dev bar
  window.__vgGlow = { adj: ADJ, apply() { place(glow, ADJ.p1); place(glow2, ADJ.p2); moved = true; } };

  if (lite) {
    spot1.style.display = 'none'; spot2.style.display = 'none'; trail.style.display = 'none';
    line.style.transform = 'translateY(0)'; started = true;
  } else {
    document.body.appendChild(roam);
    raf = requestAnimationFrame(frame);
    addEventListener('scroll', checkRise, { passive: true, capture: true });
  }

  return {
    el: wrap,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      roam.remove();
      removeEventListener('scroll', checkRise, true);
      removeEventListener('mousemove', onMove);
    }
  };
};
})();
