// Aeron landing + prologue: centred lockup, sharp start button whose hover shoots the parting line
// to the right, then the darkness copy, the "let's change that" flash and the outline goggles.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var gate = $('ae-gate'), wrap = $('ae-btn-wrap'), btn = $('ae-start-btn');
  var shard = $('ae-shard'), vline = $('ae-vline'), black = $('ae-black'), flash = $('ae-flash');
  var l1 = $('ae-l1'), l2 = $('ae-l2'), l2a = $('ae-l2a'), l2b = $('ae-l2b');
  var fx = $('ae-fx'), cx = fx.getContext('2d');
  if (!gate || !btn) return;

  var LINE_X = 0.84;                 // parting line, fraction of viewport width
  var W = 0, H = 0;
  function size() {
    var d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    fx.width = Math.round(W * d); fx.height = Math.round(H * d); cx.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener('resize', size); size();

  // ---- outline goggles: traced edge map, tinted with the lime -> mint -> ice gradient
  var gog = null, glow = null, GA = 1222 / 864;
  var im = new Image();
  im.onload = function () {
    var w = im.width, h = im.height, c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in';
    var g = x.createLinearGradient(0, 0, w, h * 0.35);
    g.addColorStop(0, '#d8ff3e'); g.addColorStop(0.5, '#6dffd0'); g.addColorStop(1, '#7cd6ff');
    x.fillStyle = g; x.fillRect(0, 0, w, h); gog = c;
    var c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    var x2 = c2.getContext('2d'); x2.filter = 'blur(9px)'; x2.drawImage(c, 0, 0); x2.drawImage(c, 0, 0); glow = c2;
    GA = w / h;
  };
  im.src = 'assets/images/aeron/aeron-edge.png';

  // ---- hover: button pops, a shard leaves its right edge and stands up as the parting line
  var clicked = false, shardA = null, vA = null;
  function shoot() {
    var r = wrap.getBoundingClientRect(), sx = r.right + 8, y = r.top + r.height / 2, tx = W * (clicked && window.__aeron ? __aeron.rimX() : LINE_X);
    shard.style.left = sx + 'px'; shard.style.top = y + 'px'; shard.style.width = Math.max(0, tx - sx) + 'px';
    if (shardA) shardA.cancel(); if (vA) vA.cancel();
    shardA = shard.animate([{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.6 }, { clipPath: 'inset(0 0 0 100%)', opacity: 1 }],
      { duration: 520, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
    vline.style.transition = 'none'; vline.style.left = tx + 'px'; vline.style.opacity = '1';
    vA = vline.animate([{ clipPath: 'inset(' + y + 'px 0 ' + (H - y) + 'px 0)' }, { clipPath: 'inset(0px 0 0px 0)' }],
      { duration: 760, delay: 330, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
  }
  function retract() {
    if (clicked) return;
    vline.style.transition = 'opacity .3s ease'; vline.style.opacity = '0';
  }

  // ---- prologue copy
  var words = [];
  function build() {
    var rows = [['This', 'darkness', 'represents', 'the', 'air', 'outside'],
                ['the', 'same', 'air', 'thats', 'restricting', 'your', 'runs', 'by', 'upto', '3 %']];
    rows.forEach(function (row, ri) {
      row.forEach(function (w) {
        var s = document.createElement('span');
        s.textContent = w;
        s.style.cssText = 'display:inline-block; opacity:0; white-space:pre' + (w === '3 %' ? '; color:#6dffd0' : '');
        l1.appendChild(s); l1.appendChild(document.createTextNode(' ')); words.push(s);
      });
      if (ri === 0) l1.appendChild(document.createElement('br'));
    });
  }
  build();
  function showL1() {
    words.forEach(function (s, i) {
      s.animate([{ opacity: 0, transform: 'translateY(.4em)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }],
        { duration: 720, delay: i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    });
  }
  function hideL1() {
    l1.animate([{ opacity: 1, filter: 'blur(0px)', transform: 'none' }, { opacity: 0, filter: 'blur(8px)', transform: 'translateY(-.3em)' }],
      { duration: 520, easing: 'ease-in', fill: 'forwards' });
  }
  // "let's change that": split into letters so it can move like a motion graphic
  var chars = [];
  (function () {
    var txt = l2.textContent; l2.textContent = '';
    for (var i = 0; i < txt.length; i++) {
      var s = document.createElement('span'); s.textContent = txt[i];
      s.style.cssText = 'display:inline-block; white-space:pre; opacity:0; will-change:transform, filter';
      l2.appendChild(s); chars.push(s);
    }
  })();
  function changeThat() {
    storyAt = performance.now();
    if (window.__aeron) window.__aeron.story();
    flash.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.2,.7,.3,1)' });
    l2.style.opacity = '1';
    var OUT = 1650;
    chars.forEach(function (s, i) {
      s.animate([
        { opacity: 0, transform: 'translateX(-1.1em) skewX(-28deg) scaleX(1.7)', filter: 'blur(14px)' },
        { opacity: 1, transform: 'translateX(0.05em) skewX(5deg) scaleX(0.95)', filter: 'blur(0px)', offset: 0.55 },
        { opacity: 1, transform: 'none', filter: 'blur(0px)' }
      ], { duration: 540, delay: i * 26, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
      s.animate([{ color: '#ffffff' }, { color: '#d8ff3e', offset: 0.3 }, { color: '#6dffd0', offset: 0.6 }, { color: '#ffffff' }],
        { duration: 720, delay: 420 + i * 30, easing: 'linear' });
      s.animate([
        { opacity: 1, transform: 'none', filter: 'blur(0px)' },
        { opacity: 0, transform: 'translateX(38vw) skewX(-24deg) scaleX(2.2)', filter: 'blur(16px)' }
      ], { duration: 640, delay: OUT + i * 22, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' });
    });
    var u = $('ae-l2u');
    if (u) {
      u.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 480, delay: 200, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' });
      u.animate([{ transform: 'scaleX(1)', transformOrigin: 'right center', opacity: 1 }, { transform: 'scaleX(0)', transformOrigin: 'right center', opacity: 0.4 }],
        { duration: 420, delay: OUT - 80, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' });
    }
    [[l2a, -1.6, 0], [l2b, 2.2, 50]].forEach(function (o) {   // brief chromatic split while it lands
      o[0].animate([
        { opacity: 0, transform: 'translateX(0)' }, { opacity: 0.8, transform: 'translateX(' + o[1] + '%)', offset: 0.2 },
        { opacity: 0, offset: 0.4 }, { opacity: 0.5, transform: 'translateX(' + (-o[1] * 0.5) + '%)', offset: 0.6 },
        { opacity: 0, transform: 'translateX(0)' }
      ], { duration: 380, delay: 120 + o[2], easing: 'steps(1, end)', fill: 'forwards' });
    });
  }

  // ---- click: sound unlocks, the landing clears, darkness, copy, flash
  var proAt = 0, storyAt = 0;
  btn.addEventListener('click', function () {
    if (clicked) return;
    clicked = true;
    if (window.__aeron) window.__aeron.unlock();
    gate.style.opacity = '0'; gate.style.pointerEvents = 'none';
    proAt = performance.now();
    // the centre line sweeps right to the rim; the lit field fades in behind it as it arrives
    setTimeout(function () {
      if (window.__aeron) window.__aeron.prologue();
      var st = $('ae-stage'); st.style.transition = 'opacity 1.3s ease'; st.style.opacity = '1';
    }, 650);
    setTimeout(function () { gate.remove(); }, 1000);
    setTimeout(showL1, 1600);
    setTimeout(hideL1, 7000);
    setTimeout(changeThat, 7650);
  });

  // ---- fx canvas: passive parting line, wind, outline goggles
  function cl(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function oc(v) { return 1 - Math.pow(1 - v, 3); }
  function rnd(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function line(t, a, amp, xf) {
    var x0 = W * xf, pts = [];
    for (var y = -16; y <= H + 16; y += 8) {
      pts.push([x0 + amp * (9 * Math.sin(y * 0.0065 + t * 0.8) + 5 * Math.sin(y * 0.017 - t * 1.3) + 2.4 * Math.sin(y * 0.041 + t * 2.1)), y]);
    }
    cx.save();
    var g = cx.createLinearGradient(x0 - 30, 0, W, 0);
    g.addColorStop(0, 'rgba(140,240,225,0)'); g.addColorStop(0.1, 'rgba(140,240,225,' + 0.08 * a + ')'); g.addColorStop(1, 'rgba(140,240,225,' + 0.025 * a + ')');
    cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) cx.lineTo(pts[i][0], pts[i][1]);
    
    cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length; i++) cx.lineTo(pts[i][0], pts[i][1]);
    cx.strokeStyle = 'rgba(120,255,225,' + 0.28 * a + ')'; cx.lineWidth = 5; cx.stroke();
    cx.shadowColor = 'rgba(120,255,225,0.9)'; cx.shadowBlur = 16;
    cx.strokeStyle = 'rgba(232,255,250,' + 0.95 * a + ')'; cx.lineWidth = 1.4; cx.stroke();
    cx.restore();
  }

  function gust(s) {
    if (s < 0) return 0;
    if (s < 0.15) return s / 0.15;
    if (s < 1.4) return 1 - 0.45 * oc((s - 0.15) / 1.25);
    if (s < 1.9) return 0.55 + 0.45 * ((s - 1.4) / 0.5);
    if (s < 2.45) return 1;
    return Math.max(0, 1 - (s - 2.45) / 0.5);
  }
  function wind(s, t) {
    var I = gust(s); if (I <= 0) return;
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 48; i++) {
      var len = 90 + rnd(i) * 320, sp = 1500 + rnd(i + 9) * 2200, y = H * (0.2 + 0.7 * rnd(i + 3));
      var x = ((rnd(i + 5) * 4000 + t * sp) % (W + len * 2)) - len;
      var al = I * (0.18 + 0.42 * rnd(i + 7));
      var g = cx.createLinearGradient(x - len, 0, x, 0);
      g.addColorStop(0, 'rgba(200,255,238,0)'); g.addColorStop(1, 'rgba(210,255,240,' + al + ')');
      cx.strokeStyle = g; cx.lineWidth = 0.7 + rnd(i + 11) * 1.1;
      cx.beginPath(); cx.moveTo(x - len, y); cx.lineTo(x, y); cx.stroke();
    }
    cx.restore();
  }

  function pose(s) {
    var cy = H * 0.6, P = { x: 0, y: cy, ang: 0, rz: 0, sx: 1, a: 1 };
    if (s < 1.35) {
      var k = oc(cl(s / 1.35));
      P.x = -0.45 * W + 0.95 * W * k;
      P.ang = (1 - k) * Math.PI * 2 * 3.25;                 // tumbling in, the wind bleeding off its spin
      P.y = cy - (1 - k) * H * 0.09 + Math.sin(s * 6) * H * 0.025 * (1 - k);
      P.rz = -(1 - k) * 0.55 + Math.sin(s * 8) * 0.05 * (1 - k);
      P.a = cl(s / 0.12);
    } else if (s < 1.95) {
      var u = s - 1.35;
      P.x = 0.5 * W + u * 22; P.ang = Math.sin(u * 4.5) * 0.28; P.y = cy + Math.sin(u * 3.2) * 5; P.rz = Math.sin(u * 2.6) * 0.035;
    } else {
      var v = cl((s - 1.95) / 0.5), e = v * v * v;
      P.x = 0.5 * W + 13 + e * 0.95 * W; P.ang = e * 0.9; P.y = cy - e * H * 0.02; P.rz = -e * 0.06;
      P.sx = 1 + e * 0.35; P.a = 1 - cl((s - 2.3) / 0.15);
    }
    return P;
  }
  function one(P, a, gw) {
    if (!gog || a <= 0.002) return;
    var gh = gw / GA, c = Math.cos(P.ang);
    cx.save(); cx.translate(P.x, P.y); cx.rotate(P.rz);
    cx.transform(1, Math.sin(P.ang) * 0.14, 0, 1, 0, 0);
    cx.scale((c < 0 ? -1 : 1) * Math.max(0.04, Math.abs(c)) * P.sx, 1);
    cx.globalCompositeOperation = 'lighter';
    cx.globalAlpha = a * 0.75; cx.drawImage(glow, -gw / 2, -gh / 2, gw, gh);
    cx.globalAlpha = a; cx.drawImage(gog, -gw / 2, -gh / 2, gw, gh);
    cx.restore();
  }
  function goggles(s) {
    if (s < 0 || s > 2.6) return;
    var gw = Math.min(W * 0.42, H * 0.52 * GA);
    for (var i = 7; i >= 1; i--) { var P = pose(s - i * 0.022); one(P, P.a * 0.34 * (1 - i / 8), gw); }
    var Q = pose(s); one(Q, Q.a, gw);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    cx.clearRect(0, 0, W, H);
    var t = now / 1000, s = storyAt ? (now - storyAt) / 1000 : -1, xf = 0.5, a = 1;
    if (proAt) {                                           // centre -> rim sweep after START
      var k = cl((now - proAt) / 1150); k = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      var rim = window.__aeron && __aeron.rimX ? __aeron.rimX() : LINE_X;
      xf = 0.5 + (rim - 0.5) * k;
    }
    if (s > 2.1) a = Math.max(0, 1 - (s - 2.1) / 0.9);     // the real membrane takes over as the PNG arrives
    if (a > 0) line(t, a, 1, xf);                           // always waving, never static
    if (s >= 0 && s < 3.1) { wind(s, t); goggles(s); }
  }
  requestAnimationFrame(loop);
})();
