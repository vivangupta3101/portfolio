// Every 7 seconds the cursor on the Blind Watchmaker page turns into a small dithered bitmap
// eye: it scales into place, the pupil circles as if searching, it blinks, then it scales away and
// the plain dot returns. Ordered (Bayer) thresholding on a 2px grid keeps it a true bitmap at cursor size.
(function () {
  'use strict';

  const SIZE = 56, PIX = 2, R = 26;              // backing grid: ~28 bitmap pixels across
  const CSS = 28;                                 // on screen, a touch bigger than the 22px dot
  const INK = '#ffffff';   // difference-blended like the dot, so it reads on any background
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  // the sphere is lit and dithered; only the iris moves, orbiting the gaze around the eyeball
  const eyeInk = (nx, ny, nz, lon0, lat0, lid) => {
    const lum = clamp(nx * -0.48 + ny * -0.46 + nz * 0.75, 0, 1);
    const r2 = nx * nx + ny * ny;
    let ink = 0.05 + 0.30 * (1 - lum) + 0.30 * r2 * r2;
    const lat = Math.asin(clamp(ny, -1, 1));
    const lon = Math.atan2(nx, nz);
    const d = Math.acos(clamp(Math.sin(lat) * Math.sin(lat0) +
      Math.cos(lat) * Math.cos(lat0) * Math.cos(lon - lon0), -1, 1));
    if (d < 0.62) {
      ink = 0.92;
      if (d < 0.26) ink = 1;
      const h = Math.acos(clamp(Math.sin(lat) * Math.sin(lat0 + 0.24) +
        Math.cos(lat) * Math.cos(lat0 + 0.24) * Math.cos(lon - (lon0 - 0.26)), -1, 1));
      if (h < 0.17) ink = 0.02;
    }
    if (lid > 0) {
      const edge = -1 + 2.15 * lid;
      if (ny < edge) ink = ny > edge - 0.07 ? 1 : 0;
    }
    return ink;
  };

  const boot = () => {
    const ball = document.getElementById('pg-ball');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:' + CSS + 'px;height:' + CSS + 'px;' +
      'pointer-events:none;z-index:9999;opacity:0;mix-blend-mode:difference;' +
      'transition:opacity 0.4s ease';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let x = -300, y = -300;
    window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });

    let open = false, t0 = 0, blinkAt = 700, blinking = false, blinkT = 0;

    const draw = (el) => {
      let lid = 0;
      if (!blinking && el > blinkAt) { blinking = true; blinkT = 0; }
      if (blinking) {
        blinkT += 16.7;
        lid = blinkT < 110 ? blinkT / 110 : blinkT < 250 ? 1 - (blinkT - 110) / 140 : 0;
        if (blinkT > 250) { blinking = false; blinkAt = el + 900 + Math.random() * 800; }
      }
      // the gaze circles: longitude sweeps, latitude bobs a little
      const lon0 = Math.sin(el * 0.0016) * 0.95;
      const lat0 = Math.sin(el * 0.0011 + 1.2) * 0.30;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = INK;
      const c = SIZE / 2;
      let row = 0;
      for (let py = 0; py < SIZE; py += PIX, row++) {
        let col = 0;
        for (let px = 0; px < SIZE; px += PIX, col++) {
          const nx = (px + PIX / 2 - c) / R, ny = (py + PIX / 2 - c) / R;
          const r2 = nx * nx + ny * ny;
          if (r2 > 1) continue;
          const ink = eyeInk(nx, ny, Math.sqrt(1 - r2), lon0, lat0, lid);
          if (ink > BAYER[(col % 4) + (row % 4) * 4]) ctx.fillRect(px, py, PIX, PIX);
        }
      }
    };

    const tick = (now) => {
      if (open) { if (!t0) t0 = now; draw(now - t0); }
      canvas.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) ' +
        'scale(' + (open ? 1 : 0.35) + ')';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // same morph as every other cursor state on the page: an eased scale, no spin
    const EASE = 'transform 0.8s cubic-bezier(0.34,1.2,0.44,1)';
    const goBlind = () => {
      open = true; t0 = 0; blinkAt = 620; blinking = false;
      canvas.style.transition = 'opacity 0.4s ease,' + EASE;
      canvas.style.opacity = '1';
      if (ball) ball.style.opacity = '0';
      setTimeout(() => {
        canvas.style.opacity = '0';
        if (ball) ball.style.opacity = '1';
        setTimeout(() => { open = false; schedule(); }, 800);
      }, 4000);
    };
    const schedule = () => setTimeout(goBlind, 7000);
    if (ball) ball.style.transition = 'opacity 0.3s ease';
    schedule();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
