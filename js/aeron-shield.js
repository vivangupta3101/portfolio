// Aeron Shield 01 opening scrub (first page of the Aeron project)
(() => {
  const Q = new URLSearchParams(location.search);
  let FIXED = Q.has('p') ? parseFloat(Q.get('p')) : null, TNOW = null;
  const now = () => TNOW != null ? TNOW : performance.now();
  window.__shSetP = (v, t) => { FIXED = v; TNOW = t; };      // test hook: freeze progress
  const root = document.documentElement;
  const cv = document.getElementById('sh-cv'), ctx = cv.getContext('2d', { alpha: false, desynchronized: true });
  const scrub = document.getElementById('sh-scrub'), meter = document.getElementById('sh-meter'), mnum = document.getElementById('sh-mnum');
  const call = document.getElementById('sh-call'), cdot = document.getElementById('sh-cdot'), cline = document.getElementById('sh-cline'), ctext = document.getElementById('sh-ctext');
  const lineEl = document.getElementById('sh-lineIn');
  const ex = document.getElementById('sh-ext-cv'), ectx = ex && ex.getContext('2d');
  const wordEls = document.querySelectorAll('#sh-scrub .sh-word b');
  const mk2 = () => { const c = document.createElement('canvas'); return [c, c.getContext('2d')]; };
  const [cA, xA] = mk2(), [cB, xB] = mk2(), [cS, xS] = mk2();
  // the scrub sits on a still floor: frame + AERON reflected below, compressed, rippling and softening with depth
  function extend(t) {
    if (!ectx) return;
    const er = ex.getBoundingClientRect(); if (er.top > innerHeight || er.bottom < 0) return;
    const ew = cv.width, eh = Math.round(ex.clientHeight * DPR); if (!eh || !ew) return;
    if (ex.width !== ew || ex.height !== eh) { ex.width = ew; ex.height = eh; }
    const d = Math.min(eh, Math.round(cv.height * .42)), sH = Math.round(d / .62);
    if (cS.width !== ew || cS.height !== sH) { cS.width = ew; cS.height = sH; }
    xS.setTransform(1, 0, 0, 1, 0, 0); xS.drawImage(cv, 0, cv.height - sH, ew, sH, 0, 0, ew, sH);
    // the word is DOM over the canvas: draw it into the source so it reflects too
    const sr = cv.getBoundingClientRect();
    wordEls.forEach(el => {
      const r = el.getBoundingClientRect(), op = +getComputedStyle(el).opacity; if (op < .02) return;
      const fs = el._fs || (el._fs = parseFloat(getComputedStyle(el).fontSize));
      xS.font = '900 ' + fs * DPR + 'px AeCtx'; xS.textBaseline = 'alphabetic';
      const m = xS.measureText(el.textContent), fa = m.fontBoundingBoxAscent / DPR, fd = m.fontBoundingBoxDescent / DPR;
      const base = r.top - sr.top + (fs - (fa + fd)) / 2 + fa;
      xS.globalAlpha = op; xS.fillStyle = '#0e0e0d';
      xS.fillText(el.textContent, (r.left - sr.left) * DPR, (base * DPR) - (cv.height - sH));
      xS.globalAlpha = 1;
    });
    // mirrored, in strips that drift sideways more the deeper they are
    if (cA.width !== ew || cA.height !== d) { cA.width = ew; cA.height = d; }
    xA.fillStyle = '#efefec'; xA.fillRect(0, 0, ew, d);
    const st = Math.max(2, Math.round(2 * DPR));
    for (let y = 0; y < d; y += st) {
      const k = y / d, sy = sH - (y + st) / .62 * 1, amp = k * k * 14 * DPR;
      const dx = amp * (Math.sin(y * .045 / DPR + t * 1.1) * .7 + Math.sin(y * .013 / DPR - t * .6) * .3);
      xA.drawImage(cS, 0, Math.max(0, sy), ew, st / .62, dx, y, ew, st);
    }
    // softening with depth: a blurred copy faded in from the join down
    const bw = Math.round(ew / 3), bh = Math.round(d / 3);
    if (cB.width !== bw || cB.height !== bh) { cB.width = bw; cB.height = bh; }
    xB.globalCompositeOperation = 'source-over'; xB.filter = 'blur(' + Math.round(4 * DPR) + 'px)';
    xB.clearRect(0, 0, bw, bh); xB.drawImage(cA, 0, 0, bw, bh); xB.filter = 'none';
    xB.globalCompositeOperation = 'destination-in';
    const gm = xB.createLinearGradient(0, 0, 0, bh); gm.addColorStop(0, 'rgba(0,0,0,0)'); gm.addColorStop(.08, 'rgba(0,0,0,0)'); gm.addColorStop(.5, 'rgba(0,0,0,1)');
    xB.fillStyle = gm; xB.fillRect(0, 0, bw, bh); xB.globalCompositeOperation = 'source-over';
    ectx.setTransform(1, 0, 0, 1, 0, 0);
    ectx.fillStyle = '#efefec'; ectx.fillRect(0, 0, ew, eh);
    ectx.drawImage(cA, 0, 0); ectx.drawImage(cB, 0, 0, ew, d);
    const g = ectx.createLinearGradient(0, 0, 0, d);
    g.addColorStop(0, 'rgba(239,239,236,0)'); g.addColorStop(.12, 'rgba(239,239,236,.3)'); g.addColorStop(.4, 'rgba(239,239,236,.7)'); g.addColorStop(.7, 'rgba(239,239,236,.92)'); g.addColorStop(1, 'rgba(239,239,236,1)');
    ectx.fillStyle = g; ectx.fillRect(0, 0, ew, d + 2);
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let M, frames = [], W = 0, H = 0, DPR = 1;
  // look-around: before scrolling, the cursor (or phone tilt) turns her head left and right
  let look = [], lookN = 0, lookT = 0, lookC = 0, lookBack = null;
  let lastSide = null, flashAt = 0, lookAt = 0;
  let target = 0, cur = 0, mx = 0, my = 0, px = 0, py = 0, lastDrawn = -1, lastKey = '';

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function size() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    lastKey = '';
  }

  // cover-fit with a focus point so the subject stays framed on any aspect
  function fit(p) {
    if (W / H < 1.05) {
      // portrait: the paper is flat, so the frame can sit low and narrower than the screen without visible edges
      // once the shield floats free, pull back so the full side profile fits the narrow screen
      const z = sstep(.44, .58, p);
      const s = Math.max(H * .6 * (1 - z) / M.h, W * (2.05 - .75 * z) / M.w), fw = M.w * s, fh = M.h * s;
      const fx = .5 + (.43 - .5) * sstep(.3, .45, p) * (1 - z) + (.505 - .5) * z;
      const T = (H - fh) * (1 - z) + (H * .56 - fh * .52) * z;
      return { L: W / 2 - fw * fx, T, fw, fh };
    }
    const s = Math.max(W / M.w, H / M.h);
    const fw = M.w * s, fh = M.h * s;
    const fx = M.focus[0], fy = M.focus[1];
    const L = clamp(W / 2 - fw * fx, W - fw, 0), T = clamp(H * .5 - fh * fy, H - fh, 0);
    return { L, T, fw, fh };
  }

  function progress() {
    if (FIXED != null) return FIXED;
    const r = scrub.getBoundingClientRect(), span = r.height - innerHeight;
    return clamp(-r.top / span, 0, 1);
  }

  // first 4% holds on the opening frame, last 18% holds on the presented goggles
  // 0–4% holds the opening frame, frames play to 74%, the side profile holds, then rushes off left (80–95%)
  const toFrame = p => clamp((p - .04) / .70, 0, 1) * (M.n - 1);
  const RUSH0 = .8, RUSH1 = .95; let handed = false, flipping = false;
  // exit: the side profile spins out flat (a card turning on its vertical axis, back side mirrored) and
  // swells as it goes, dissolving to bare paper — the hero then takes over on that same paper screen
  function flip(rk) {
    if (rk <= 0) { if (flipping) { flipping = false; cv.style.transform = ''; cv.style.opacity = ''; } return; }
    if (!flipping) { flipping = true; cv.style.transition = 'none'; cv.style.transformOrigin = '50% 46%'; }
    // the canvas rush carries it off left; on top it noses down slightly and spins only ~15° by the exit
    const e = ease(rk), th = 0;
    cv.style.transform = '';
    cv.style.opacity = (1 - sstep(.62, .96, rk)).toFixed(3);
  }
  const wordEl = document.querySelector('#sh-scrub .sh-word'), uiEl = document.querySelector('#sh-scrub .sh-ui');
  const ease = k => k * k * k * (k * (6 * k - 15) + 10);

  function draw(fi, p) {
    const i0 = Math.floor(fi), i1 = Math.min(M.n - 1, i0 + 1), k = (M.cut && i1 === M.cut) ? 0 : fi - i0;
    // editorial cut: a quick paper-coloured dip whenever the sequence crosses the cut
    const side = fi >= (M.cut || 1e9) - .5;
    if (side !== lastSide) { if (lastSide !== null) flashAt = now(); lastSide = side; }
    const fl = flashAt ? Math.exp(-Math.pow((now() - flashAt) / 110, 2)) : 0;
    const rk = clamp((p - RUSH0) / (RUSH1 - RUSH0), 0, 1), rush = ease(rk), rv = rk > 0 && rk < 1 ? Math.sin(Math.PI * rk) : 0;
    flip(rk);
    // look frames fade in once decoded instead of popping over the opening frame
    const lookIn = lookAt ? (reduce ? 1 : clamp((now() - lookAt) / 900, 0, 1)) : 0;
    const key = lookIn.toFixed(3) + '|' + (lookN ? lookC.toFixed(4) : '-') + '|' + rk.toFixed(4) + '|' + fi.toFixed(3) + '|' + px.toFixed(2) + '|' + py.toFixed(2) + '|' + W + 'x' + H + '|' + fl.toFixed(3);
    if (key === lastKey) return; lastKey = key;
    const g = fit(p), near = i => { for (let d = 0; d < 40; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; } return frames[0]; };
    const a = frames[i0] || near(i0), b = frames[i1];
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#efefec'; ctx.fillRect(0, 0, W, H);
    const zoom = 1.012, ox = (g.fw * (zoom - 1)) / 2, oy = (g.fh * (zoom - 1)) / 2;
    const L = g.L - ox + px - rush * W * 1.35, T = g.T - oy + py, FW = g.fw * zoom * (1 + rv * .06), FH = g.fh * zoom * (1 - rv * .025);
    // speed trail: ghost copies streaming behind (to the right) while it's moving fast
    if (rv > .02 && a && a.width) {
      for (let n = 6; n >= 1; n--) { ctx.globalAlpha = rv * .1 * (1 - n / 7); ctx.drawImage(a, L + n * rv * W * .045, T, FW, FH); }
      ctx.globalAlpha = 1;
    }
    if (a && a.width) ctx.drawImage(a, L, T, FW, FH);
    if (b && b.width && k > .02 && b !== a) { ctx.globalAlpha = k; ctx.drawImage(b, L, T, FW, FH); ctx.globalAlpha = 1; }
    const la = M.look && lookN === M.look.n ? (1 - sstep(.0, .035, p)) * lookIn : 0;
    if (la > .002) {
      const C = M.look.center, lf = clamp(C + lookC * (lookC < 0 ? C : M.look.n - 1 - C), 0, M.look.n - 1);
      const j0 = Math.floor(lf), j1 = Math.min(M.look.n - 1, j0 + 1), u = lf - j0;
      ctx.globalAlpha = la; if (look[j0] && look[j0].width) ctx.drawImage(look[j0], L, T, FW, FH);
      if (u > .02 && look[j1] && look[j1].width) { ctx.globalAlpha = la * u; ctx.drawImage(look[j1], L, T, FW, FH); }
      ctx.globalAlpha = 1;
    }
    // feather the frame borders into the page so a frame smaller than the screen shows no edge
    if (FW < W + 2 || FH < H + 2 || rush > 0) {
      const e = Math.min(FW, FH) * .12, P = 'rgba(239,239,236,', edge = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = ctx.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, P + '1)'); gr.addColorStop(1, P + '0)'); ctx.fillStyle = gr; ctx.fillRect(rx, ry, rw, rh); };
      edge(L, 0, L + e, 0, L - 1, T - 1, e, FH + 2); edge(L + FW, 0, L + FW - e, 0, L + FW - e, T - 1, e + 1, FH + 2);
      edge(0, T, 0, T + e, L - 1, T - 1, FW + 2, e); edge(0, T + FH, 0, T + FH - e, L - 1, T + FH - e, FW + 2, e + 1);
      if (L + FW < W) { ctx.fillStyle = '#efefec'; ctx.fillRect(L + FW, 0, W - L - FW, H); }
    }
    // wind lines left behind by the rush
    if (rv > .02) {
      ctx.strokeStyle = '#0e0e0d'; ctx.lineCap = 'round';
      for (let n = 0; n < 14; n++) {
        const yy = H * (.3 + .4 * ((n * .618) % 1)), len = W * (.08 + .22 * ((n * .37) % 1)) * rv;
        const x0 = L + FW * (.55 + .4 * ((n * .29) % 1)) + rv * W * .05 * n % (W * .2);
        ctx.globalAlpha = rv * (.18 + .25 * ((n * .53) % 1)); ctx.lineWidth = .6 + ((n * .41) % 1) * 1.2;
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + len, yy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (rk >= .985 && !handed) { handed = true; dispatchEvent(new Event('sh:handoff')); }
    if (wordEl) { wordEl.style.transform = rush ? 'translate3d(' + (-rush * 115) + 'vw,0,0) skewX(' + (-rv * 18) + 'deg)' : ''; wordEl.style.filter = rv > .05 ? 'blur(' + (rv * 6).toFixed(1) + 'px)' : ''; }
    if (uiEl) uiEl.style.opacity = (1 - sstep(.84, .93, p)).toFixed(3);
    if (fl > .004) { ctx.globalAlpha = fl * .6; ctx.fillStyle = '#efefec'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

    // callout on the held goggles once they're presented
    const on = false;
    call.classList.toggle('on', on);
    if (on) {
      const gx = L + M.call[0] * FW, gy = T + M.call[1] * FH;
      const narrow = W < 760;
      if (narrow) {
        const ey = gy - Math.min(130, H * .15), lx = 16;
        cdot.setAttribute('cx', gx); cdot.setAttribute('cy', gy);
        cline.setAttribute('d', `M${gx},${gy} L${gx},${ey} L${lx + 150},${ey}`);
        ctext.style.left = lx + 'px'; ctext.style.top = (ey - 64) + 'px'; ctext.style.textAlign = 'left'; ctext.style.width = 'auto';
      } else {
        const ex = gx - Math.min(130, W * .09), ey = gy - Math.min(215, H * .24);
        cdot.setAttribute('cx', gx); cdot.setAttribute('cy', gy);
        cline.setAttribute('d', `M${gx},${gy} L${ex},${ey} L${ex - 40},${ey}`);
        ctext.style.left = (ex - 52 - 190) + 'px'; ctext.style.top = (ey - 26) + 'px'; ctext.style.textAlign = 'right'; ctext.style.width = '190px';
      }
    }
    meter.style.setProperty('--p', p.toFixed(3));
    lineEl.style.opacity = (1 - sstep(.3, .5, p)).toFixed(3);
    mnum.textContent = p > .74 ? '02' : '01';
  }

  let lastT = 0;
  function tick(t) {
    const dt = lastT ? Math.min(.05, (t - lastT) / 1000) : .016; lastT = t;
    target = progress();
    cur += (target - cur) * (reduce || FIXED != null ? 1 : 1 - Math.exp(-dt * 6));
    if (Math.abs(target - cur) < .00005) cur = target;
    const pk = 1 - Math.exp(-dt * 3.6); px += (mx - px) * pk; py += (my - py) * pk;
    // following the cursor eases continuously; once scrolling starts she turns back to centre on a timed ease-in-out
    // as in the original v7 scrub: a plain per-frame ease toward the cursor, scrolling hands her back to centre
    {
      const lt = cur > .004 ? 0 : lookT;
      lookC += (lt - lookC) * (reduce ? 1 : 1 - Math.pow(1 - .07, dt * 60)); if (Math.abs(lt - lookC) < .0005) lookC = lt;
    }
    draw(toFrame(cur), cur);
    extend(now() / 1000);
    requestAnimationFrame(tick);
  }

  addEventListener('resize', () => { size(); wordEls.forEach(el => el._fs = 0); });
  addEventListener('pointermove', e => {
    if (reduce || e.pointerType !== 'mouse') return;
    mx = (e.clientX / innerWidth - .5) * -10; my = (e.clientY / innerHeight - .5) * -6;
    lookT = clamp((e.clientX / innerWidth - .5) * 2, -1, 1) * .8;
  }, { passive: true });
  document.addEventListener('mouseleave', () => { lookT = 0; });
  addEventListener('deviceorientation', e => { if (e.gamma == null || reduce) return; lookT = clamp(e.gamma / 25, -1, 1) * .8; }, { passive: true });
  window.__shLook = v => { lookT = v; };

  window.__shReady = (async () => {
    M = await (await fetch('assets/images/aeron/shield/meta.json')).json();
    size();
    // every frame lives in one packed file; first frame is fetched on its own range so the page can open fast
    const mk = (buf, i) => { const [o, l] = M.off[i]; const bl = new Blob([buf.slice(o, o + l)], { type: 'image/webp' });
      if (window.createImageBitmap) return createImageBitmap(bl).then(bm => { bm.naturalWidth = bm.width; frames[i] = bm; }, () => {});
      return new Promise(res => { const im = new Image(); im.onload = im.onerror = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(res); im.src = URL.createObjectURL(bl); frames[i] = im; }); };
    const all = fetch('assets/images/aeron/shield/frames.webp').then(r => r.arrayBuffer());
    { const buf = await all; await mk(buf, 0); }
    const rest = all.then(async buf => {
      for (let i = 1; i < M.n; i += 8) {
        await Promise.all(Array.from({ length: Math.min(8, M.n - i) }, (_, j) => mk(buf, i + j)));
        if (FIXED == null) await new Promise(r => setTimeout(r, 0));
      }
    });
    if (M.look && !Q.has('nolook')) {
      // decoded after the main frames, a few at a time, so the main thread never stalls
      const one = (buf, i) => { const [o, l] = M.look.off[i], bl = new Blob([buf.slice(o, o + l)], { type: 'image/webp' });
        if (window.createImageBitmap) return createImageBitmap(bl).then(bm => { look[i] = bm; }, () => {});
        return new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = URL.createObjectURL(bl); look[i] = im; }); };
      const lb = Promise.all([fetch('assets/images/aeron/shield/look.webp').then(r => r.arrayBuffer()), rest]).then(async ([buf]) => {
        for (let i = 0; i < M.look.n; i += 6) {
          await Promise.all(Array.from({ length: Math.min(6, M.look.n - i) }, (_, j) => one(buf, i + j)));
          if (FIXED == null) await new Promise(r => setTimeout(r, 0));
        }
        lookN = M.look.n; lookAt = now();
      });
      if (FIXED != null) await lb; else lb.then(() => { lastKey = ''; });
    }
    if (FIXED != null) await rest;
    requestAnimationFrame(() => {
      // from the home tile, the type waits until the cover has settled into the live frame
      const lag = window.__aeArrive ? 1.1 : 0;
      if (lag) { const cv = document.getElementById('sh-cv'); if (cv) cv.style.transition = 'none'; }
      if (lag) document.querySelectorAll('#sh-scrub .sh-fade').forEach(el => { el.style.transitionDelay = (parseFloat(el.style.transitionDelay) || 0) + lag + 's'; });
      root.classList.add('sh-ready');
      document.querySelectorAll('.sh-word').forEach(w => w.querySelectorAll('b').forEach((b, i) => b.style.animationDelay = (.55 + lag + i * .075) + 's'));
      const arr = document.getElementById('ae-arrive');
      if (arr) { setTimeout(() => { arr.style.opacity = '0'; }, 500); setTimeout(() => arr.remove(), 1600); }
      requestAnimationFrame(tick);
    });
    return true;
  })();
})();
