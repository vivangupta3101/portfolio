// Hero mask editor — DEVELOPMENT ONLY, must be stripped on export (see CLAUDE.md).
//
// Press M over the hero to freeze the reel exactly as it stands and edit the annotation geometry by
// hand. Boxes can be turned into free polygons (P) whose nodes drag one at a time, masks can follow
// a moving object (K to keyframe, T to auto-track by matching the patch under the shape), and the
// whole SHOTS table is written to localStorage on exit so the edit survives a reload. C copies that
// table; paste it over the SHOTS array in js/hero-overlay.js to bake the result in for real.
(function () {
  var H = window.__vgHero;
  if (!H) return;
  var video = H.video, box = H.box;
  var ACCENT = '#ec7e41';
  var MONO = "font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:0.08em;" +
    'text-transform:uppercase;line-height:1.6';
  var KINDS = ['mark', 'at', 'half', 'pix', 'cross'];
  var POINTS = { at: 1, pix: 1, cross: 1 };   // these have no size and cannot be polygons
  var STORE = 'vg-hero-shots-v2';

  var on = false, shot = -1, sel = 0, node = -1, t = 0, wasPlaying = false, dirty = false;

  // ---- restore an unbaked edit from a previous session ----
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && saved.length === H.SHOTS.length) {
      saved.forEach(function (s, i) {
        KINDS.forEach(function (k) {
          if (s[k]) H.SHOTS[i][k] = s[k]; else delete H.SHOTS[i][k];
        });
        if (s.cap) H.SHOTS[i].cap = s.cap;
        if (s.label) H.SHOTS[i].label = s.label; else delete H.SHOTS[i].label;
      });
      console.log('[hero-mask-dev] restored saved geometry \u2014 press M then C to copy it for baking');
    }
  } catch (err) { /* ignore a bad blob */ }

  var ui = document.createElement('div');
  ui.style.cssText = 'position:absolute;inset:0;z-index:9998;display:none;font:' + MONO;
  box.appendChild(ui);

  var panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;left:26px;top:130px;bottom:70px;width:250px;overflow:auto;' +
    'background:rgba(8,8,8,0.94);border:1px solid rgba(255,255,255,0.16);padding:14px 16px;color:#fff;' +
    MONO + ';text-align:left;pointer-events:auto;user-select:none';
  ui.appendChild(panel);

  var handles = document.createElement('div');
  handles.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  ui.appendChild(handles);

  function fmt(n) { return (Math.round(n * 1000) / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, ''); }
  function live() { var s = H.SHOTS[shot]; return KINDS.filter(function (k) { return !!s[k]; }); }
  function kindOf() { return live()[sel]; }
  function shapeOf(kind) { var s = H.SHOTS[shot]; return s[kind] ? H.sample(s[kind], t) : null; }

  function writeShape(kind, sh) {
    var s = H.SHOTS[shot], trk = s[kind];
    if (trk && trk.keys) {
      // editing a tracked device rewrites the keyframe nearest the playhead
      var k = trk.keys, best = 0;
      for (var i = 1; i < k.length; i++) if (Math.abs(k[i].t - t) < Math.abs(k[best].t - t)) best = i;
      var keep = k[best].t;
      k[best] = JSON.parse(JSON.stringify(sh));
      k[best].t = keep;
    } else s[kind] = sh;
    dirty = true;
  }

  function bboxOf(pts) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(function (p) {
      x0 = Math.min(x0, p.u); y0 = Math.min(y0, p.v);
      x1 = Math.max(x1, p.u); y1 = Math.max(y1, p.v);
    });
    return { u: x0, v: y0, w: x1 - x0, h: y1 - y0 };
  }

  function nodeEl(x, y, active, n) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:' + (x - 6) + 'px;top:' + (y - 6) + 'px;width:12px;height:12px;' +
      'box-sizing:border-box;cursor:grab;pointer-events:auto;background:' +
      (active ? ACCENT : 'rgba(0,0,0,0.55)') + ';border:1px solid ' + (active ? '#fff' : ACCENT);
    d.dataset.node = n;
    return d;
  }

  function draw() {
    handles.innerHTML = '';
    var s = H.SHOTS[shot];
    if (!s) return;
    var L = live();
    if (sel >= L.length) sel = 0;
    L.forEach(function (kind, n) {
      var sh = shapeOf(kind);
      var active = n === sel;
      if (sh.pts) {
        // polygon: an outline plus one draggable handle per node
        var bb = bboxOf(sh.pts);
        var a0 = H.map(bb.u, bb.v), a1 = H.map(bb.u + bb.w, bb.v + bb.h);
        var hit = document.createElement('div');
        hit.style.cssText = 'position:absolute;left:' + a0.x + 'px;top:' + a0.y + 'px;width:' +
          (a1.x - a0.x) + 'px;height:' + (a1.y - a0.y) + 'px;cursor:move;pointer-events:auto;border:1px ' +
          (active ? 'solid rgba(236,126,65,0.4)' : 'dashed rgba(255,255,255,0.2)') + ';background:' +
          (active ? 'rgba(236,126,65,0.06)' : 'transparent');
        hit.dataset.kind = kind; hit.dataset.n = n;
        var tag = document.createElement('div');
        tag.textContent = kind + ' \u00b7 ' + sh.pts.length + ' nodes' +
          (s[kind].keys ? ' \u00b7 ' + s[kind].keys.length + 'k' : '');
        tag.style.cssText = 'position:absolute;left:0;top:-16px;white-space:nowrap;text-shadow:0 1px 3px #000;' +
          MONO + ';color:' + (active ? ACCENT : 'rgba(255,255,255,0.6)');
        hit.appendChild(tag);
        handles.appendChild(hit);
        if (active) sh.pts.forEach(function (p, i) {
          var q = H.map(p.u, p.v);
          var h = nodeEl(q.x, q.y, i === node, i);
          h.dataset.kind = kind; h.dataset.n = n;
          handles.appendChild(h);
        });
        return;
      }
      var isPt = !!POINTS[kind];
      var isAt = kind === 'at';
      var a = H.map(sh.u, sh.v);
      var b = isPt ? a : H.map(sh.u + sh.w, sh.v + sh.h);
      var g = document.createElement('div');
      var w = isAt ? Math.max(70, (s.label || '').length * 7 + 16) : isPt ? 18 : b.x - a.x;
      var h2 = isAt ? 34 : isPt ? 18 : b.y - a.y;
      g.style.cssText = 'position:absolute;left:' + (isAt ? a.x : isPt ? a.x - 9 : a.x) + 'px;top:' +
        (isAt ? a.y - 4 : isPt ? a.y - 9 : a.y) + 'px;width:' + w + 'px;height:' + h2 + 'px;pointer-events:auto;' +
        'cursor:move;border:1px ' + (active ? 'solid ' + ACCENT : 'dashed rgba(255,255,255,0.45)') + ';' +
        'background:' + (active ? 'rgba(236,126,65,0.09)' : 'transparent');
      g.dataset.kind = kind; g.dataset.n = n;
      var tg = document.createElement('div');
      tg.textContent = isAt ? 'label position \u2014 drag' : kind + (s[kind].keys ? ' \u00b7 ' + s[kind].keys.length + 'k' : '');
      tg.style.cssText = 'position:absolute;left:0;top:-16px;white-space:nowrap;text-shadow:0 1px 3px #000;' +
        MONO + ';color:' + (active ? ACCENT : 'rgba(255,255,255,0.6)');
      g.appendChild(tg);
      if (!isPt) ['left:-4px;top:-4px;cursor:nwse-resize;--c:nw', 'right:-4px;top:-4px;cursor:nesw-resize;--c:ne',
        'left:-4px;bottom:-4px;cursor:nesw-resize;--c:sw', 'right:-4px;bottom:-4px;cursor:nwse-resize;--c:se'
      ].forEach(function (c) {
        var hd = document.createElement('div');
        hd.style.cssText = 'position:absolute;width:9px;height:9px;background:' + ACCENT + ';' + c;
        hd.dataset.corner = c.split('--c:')[1];
        g.appendChild(hd);
      });
      handles.appendChild(g);
    });
    paint();
  }

  // The panel is built once and only its values are refreshed — a rebuild on every repaint would
  // blow away focus in the two text fields.
  function row(html) { var d = document.createElement('div'); d.innerHTML = html; panel.appendChild(d); return d; }
  function field(label) {
    var w = document.createElement('label');
    w.style.cssText = 'display:block;margin:8px 0 2px;color:rgba(255,255,255,0.5);' + MONO;
    w.textContent = label;
    var i = document.createElement('input');
    i.style.cssText = 'display:block;width:100%;box-sizing:border-box;background:rgba(255,255,255,0.06);' +
      'border:1px solid rgba(255,255,255,0.2);color:' + ACCENT + ';padding:5px 6px;' + MONO;
    w.appendChild(i);
    panel.appendChild(w);
    return i;
  }
  var pTitle = row('');
  pTitle.style.cssText = 'color:' + ACCENT + ';margin-bottom:8px';
  var pCap = field('CAPTION (BOTTOM LEFT)');
  var pLabel = field('CALLOUT LABEL');
  var pTime = row('');
  pTime.style.cssText = 'margin:10px 0 8px;font-variant-numeric:tabular-nums';
  var pRule = row('');
  pRule.style.cssText = 'height:1px;background:rgba(255,255,255,0.14);margin:0 0 10px';
  var pKind = row('');
  pKind.style.cssText = 'color:' + ACCENT;
  var pCoord = row('');
  pCoord.style.cssText = 'margin:4px 0 10px;color:rgba(255,255,255,0.8)';
  var pRule2 = row('');
  pRule2.style.cssText = 'height:1px;background:rgba(255,255,255,0.14);margin:0 0 10px';
  row('TAB next element<br>P rect \u21c4 polygon<br>click a node to select it<br>' +
    'N add node \u00b7 \u2326 delete node<br>\u2190 \u2192 step frame (\u21e7 = 0.5s)<br>' +
    '[ ] previous / next shot<br>K keyframe \u00b7 T auto-track<br>X clear keyframes<br>' +
    'L move label \u00b7 E edit it<br>\u21e7E edit caption<br>D delete this callout \u00b7 A add it<br>C copy SHOTS table<br>M / ESC exit \u00b7 saves'
  ).style.cssText = 'color:rgba(255,255,255,0.6)';
  var pMsg = row('');
  pMsg.style.cssText = 'margin-top:10px;color:' + ACCENT + ';min-height:14px';

  pCap.addEventListener('input', function () {
    H.SHOTS[shot].cap = pCap.value.toUpperCase();
    dirty = true;
    H.show(shot, t);
  });
  pLabel.addEventListener('input', function () {
    var sh = H.SHOTS[shot];
    if (!sh.mark) return;
    sh.label = pLabel.value.toUpperCase();
    dirty = true;
    H.setLabel(sh.label);
    H.show(shot, t);
  });

  function paint() {
    var s = H.SHOTS[shot];
    var kind = kindOf();
    var sh = kind ? shapeOf(kind) : null;
    var trk = kind ? s[kind] : null;
    pTitle.textContent = 'MASK EDITOR \u00b7 SHOT ' + (shot + 1) + '/' + H.SHOTS.length;
    if (document.activeElement !== pCap) pCap.value = s.cap || '';
    if (document.activeElement !== pLabel) pLabel.value = s.label || '';
    pLabel.disabled = !s.mark;
    pLabel.placeholder = s.mark ? '' : 'no callout \u2014 press A';
    pTime.textContent = 'T ' + t.toFixed(2) + 's   ' + s.t0.toFixed(2) + '\u2013' + s.t1.toFixed(2);
    pKind.textContent = (kind || '\u2014') + ' \u00b7 ' +
      (sh && sh.pts ? sh.pts.length + '-node poly' : POINTS[kind] ? 'point' : 'rect') +
      (trk && trk.keys ? ' \u00b7 ' + trk.keys.length + ' keys' : '');
    pCoord.innerHTML = !sh ? '' : sh.pts
      ? (node >= 0 ? 'node ' + (node + 1) + ' &nbsp; u ' + fmt(sh.pts[node].u) + ' &nbsp; v ' +
          fmt(sh.pts[node].v) : 'no node selected')
      : 'u ' + fmt(sh.u) + ' &nbsp; v ' + fmt(sh.v) +
          (sh.w != null ? '<br>w ' + fmt(sh.w) + ' &nbsp; h ' + fmt(sh.h) : '');
  }

  function msg(m) { pMsg.textContent = m; }
  function refresh() { H.show(shot, t); draw(); }

  function afterSeek(fn) {
    var once = function () { video.removeEventListener('seeked', once); fn(); };
    video.addEventListener('seeked', once);
  }
  function seek(dt) {
    var s = H.SHOTS[shot];
    t = Math.max(s.t0, Math.min(s.t1 - 0.01, t + dt));
    video.currentTime = t;
    afterSeek(refresh);
  }
  function gotoShot(i) {
    shot = (i + H.SHOTS.length) % H.SHOTS.length;
    sel = 0; node = -1;
    t = H.SHOTS[shot].t0 + 0.25;
    video.currentTime = t;
    afterSeek(refresh);
  }

  // ---- drag: whole shape, one corner, or a single node ----
  var drag = null;
  handles.addEventListener('pointerdown', function (e) {
    var g = e.target.closest('[data-kind]');
    if (!g) return;
    var kind = g.dataset.kind;
    sel = +g.dataset.n;
    var isNode = e.target.dataset.node != null;
    if (isNode) node = +e.target.dataset.node;
    else if (!e.target.dataset.corner) node = -1;
    drag = { kind: kind, corner: e.target.dataset.corner || null, node: isNode ? +e.target.dataset.node : -1,
      x: e.clientX, y: e.clientY, sh: JSON.parse(JSON.stringify(shapeOf(kind))) };
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
    draw();
  });
  handles.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var o = H.unmap(0, 0), p = H.unmap(e.clientX - drag.x, e.clientY - drag.y);
    var du = p.u - o.u, dv = p.v - o.v;
    var sh = JSON.parse(JSON.stringify(drag.sh));
    if (sh.pts) {
      if (drag.node >= 0) { sh.pts[drag.node].u += du; sh.pts[drag.node].v += dv; }
      else sh.pts.forEach(function (q) { q.u += du; q.v += dv; });
    } else if (!drag.corner) { sh.u += du; sh.v += dv; }
    else {
      if (drag.corner[1] === 'w') { sh.u += du; sh.w -= du; } else sh.w += du;
      if (drag.corner[0] === 'n') { sh.v += dv; sh.h -= dv; } else sh.h += dv;
      sh.w = Math.max(0.02, sh.w); sh.h = Math.max(0.02, sh.h);
    }
    writeShape(drag.kind, sh);
    refresh();
  });
  addEventListener('pointerup', function () { drag = null; });

  // ---- auto-track: match the patch under the shape forward through the shot ----
  var cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  var CW = 480, CH = 270;
  cv.width = CW; cv.height = CH;
  function grab() { cx.drawImage(video, 0, 0, CW, CH); }
  function gray(x, y, w, h) {
    var d = cx.getImageData(x, y, w, h).data, g = new Float32Array(w * h);
    for (var i = 0, j = 0; i < d.length; i += 4, j++) g[j] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    return g;
  }
  function sad(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }
  function seekTo(time) {
    return new Promise(function (res) {
      afterSeek(function () { requestAnimationFrame(res); });
      video.currentTime = time;
    });
  }
  function offsetShape(sh, du, dv) {
    var o = JSON.parse(JSON.stringify(sh));
    if (o.pts) o.pts.forEach(function (p) { p.u += du; p.v += dv; });
    else { o.u += du; o.v += dv; }
    return o;
  }

  async function track() {
    var s = H.SHOTS[shot], kind = kindOf();
    if (!kind) return;
    var sh0 = shapeOf(kind);
    var bb = sh0.pts ? bboxOf(sh0.pts) : (POINTS[kind] ? { u: sh0.u - 0.03, v: sh0.v - 0.05, w: 0.06, h: 0.10 } : sh0);
    msg('tracking\u2026');
    await seekTo(t);
    grab();
    var px = Math.max(0, Math.round(bb.u * CW)), py = Math.max(0, Math.round(bb.v * CH));
    var pw = Math.max(6, Math.round(bb.w * CW)), ph = Math.max(6, Math.round(bb.h * CH));
    px = Math.min(CW - pw, px); py = Math.min(CH - ph, py);
    var tpl = gray(px, py, pw, ph);
    var k0 = JSON.parse(JSON.stringify(sh0)); k0.t = +t.toFixed(2);
    var keys = [k0];
    var STEP = 0.1, RANGE = 9, sx = px, sy = py;
    for (var time = t + STEP; time < s.t1; time += STEP) {
      await seekTo(time);
      grab();
      var bestS = Infinity, bx = px, by = py;
      for (var dy = -RANGE; dy <= RANGE; dy++) for (var dx = -RANGE; dx <= RANGE; dx++) {
        var nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx + pw > CW || ny + ph > CH) continue;
        var sc = sad(tpl, gray(nx, ny, pw, ph));
        if (sc < bestS) { bestS = sc; bx = nx; by = ny; }
      }
      px = bx; py = by;
      tpl = gray(px, py, pw, ph);   // re-seed so slow drift does not lose the object
      var kk = offsetShape(sh0, (px - sx) / CW, (py - sy) / CH);
      kk.t = +time.toFixed(2);
      keys.push(kk);
      msg('tracking\u2026 ' + ((time - t) / (s.t1 - t) * 100).toFixed(0) + '%');
    }
    s[kind] = { keys: keys };
    dirty = true;
    await seekTo(t);
    refresh();
    msg(keys.length + ' keyframes');
  }

  // ---- serialise / save ----
  function shapeSrc(v) {
    if (v.pts) return '{ pts: [' + v.pts.map(function (p) {
      return '{ u: ' + fmt(p.u) + ', v: ' + fmt(p.v) + ' }';
    }).join(', ') + '] }';
    return '{ u: ' + fmt(v.u) + ', v: ' + fmt(v.v) +
      (v.w != null ? ', w: ' + fmt(v.w) + ', h: ' + fmt(v.h) : '') + ' }';
  }
  function serialise() {
    return 'var SHOTS = [\n' + H.SHOTS.map(function (s) {
      var parts = ['t0: ' + s.t0.toFixed(2), 't1: ' + s.t1.toFixed(2), "cap: '" + s.cap + "'"];
      if (s.label) parts.push("label: '" + s.label + "'");
      KINDS.forEach(function (k) {
        if (!s[k]) return;
        var v = s[k];
        if (v.keys) parts.push(k + ': { keys: [' + v.keys.map(function (q) {
          return shapeSrc(q).replace('{ ', '{ t: ' + q.t + ', ');
        }).join(', ') + '] }');
        else parts.push(k + ': ' + shapeSrc(v));
      });
      return '    { ' + parts.join(', ') + ' }';
    }).join(',\n') + '\n  ];';
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(H.SHOTS.map(function (s) {
        var o = { cap: s.cap };
        if (s.label) o.label = s.label;
        KINDS.forEach(function (k) { if (s[k]) o[k] = s[k]; });
        return o;
      })));
      console.log('[hero-mask-dev] saved. Paste this over SHOTS in js/hero-overlay.js:\n\n' + serialise());
      if (navigator.clipboard) navigator.clipboard.writeText(serialise()).catch(function () {});
    } catch (err) { console.warn('[hero-mask-dev] save failed', err); }
  }

  function enter() {
    on = true;
    wasPlaying = !video.paused;
    video.pause();
    H.hold(true);
    ui.style.display = 'block';
    t = video.currentTime || 0;
    var i = H.shotAt(t);
    if (i < 0) gotoShot(0); else { shot = i; sel = 0; node = -1; refresh(); }
  }
  function exit() {
    on = false;
    ui.style.display = 'none';
    if (dirty) { save(); dirty = false; }
    H.hold(false);
    if (wasPlaying) video.play();
  }

  addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (on && (e.target === pCap || e.target === pLabel)) {
      if (e.key === 'Escape' || e.key === 'Enter') e.target.blur();
      return;   // let the fields take their own keystrokes
    }
    var k = e.key.toLowerCase();
    if (k === 'm') { e.preventDefault(); on ? exit() : enter(); return; }
    if (!on) return;
    if (k === 'escape') { e.preventDefault(); exit(); return; }
    var s = H.SHOTS[shot], L = live(), kind = kindOf();
    if (e.key === 'Tab') { e.preventDefault(); sel = (sel + 1) % L.length; node = -1; draw(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); seek(e.shiftKey ? 0.5 : 1 / 12); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); seek(e.shiftKey ? -0.5 : -1 / 12); return; }
    if (e.key === '[') { e.preventDefault(); gotoShot(shot - 1); return; }
    if (e.key === ']') { e.preventDefault(); gotoShot(shot + 1); return; }

    if (k === 'p') {
      e.preventDefault();
      if (POINTS[kind]) { msg(kind + ' is a point'); return; }
      var sh = shapeOf(kind);
      if (sh.pts) {
        var bb = bboxOf(sh.pts);
        writeShape(kind, { u: bb.u, v: bb.v, w: bb.w, h: bb.h });
        node = -1;
        msg('back to a rect');
      } else {
        writeShape(kind, { pts: [
          { u: sh.u, v: sh.v }, { u: sh.u + sh.w, v: sh.v },
          { u: sh.u + sh.w, v: sh.v + sh.h }, { u: sh.u, v: sh.v + sh.h }
        ] });
        node = 0;
        msg('polygon \u00b7 drag any node');
      }
      refresh();
      return;
    }
    if (k === 'n') {
      e.preventDefault();
      var sp = shapeOf(kind);
      if (!sp.pts) { msg('press P first'); return; }
      // split the edge that leaves the selected node (or the longest edge if none is selected)
      var at = node;
      if (at < 0) {
        var best = 0, bl = -1;
        for (var i = 0; i < sp.pts.length; i++) {
          var q = sp.pts[(i + 1) % sp.pts.length];
          var d = Math.hypot(q.u - sp.pts[i].u, q.v - sp.pts[i].v);
          if (d > bl) { bl = d; best = i; }
        }
        at = best;
      }
      var a = sp.pts[at], b2 = sp.pts[(at + 1) % sp.pts.length];
      sp.pts.splice(at + 1, 0, { u: (a.u + b2.u) / 2, v: (a.v + b2.v) / 2 });
      writeShape(kind, sp);
      node = at + 1;
      refresh(); msg(sp.pts.length + ' nodes');
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      var sd = shapeOf(kind);
      if (!sd.pts || node < 0) return;
      if (sd.pts.length <= 3) { msg('3 nodes minimum'); return; }
      sd.pts.splice(node, 1);
      writeShape(kind, sd);
      node = Math.max(0, node - 1);
      refresh(); msg(sd.pts.length + ' nodes');
      return;
    }
    if (k === 'k') {
      e.preventDefault();
      var key = JSON.parse(JSON.stringify(shapeOf(kind)));
      key.t = +t.toFixed(2);
      var trk = s[kind];
      if (!trk.keys) s[kind] = { keys: [key] };
      else {
        var arr = s[kind].keys, at2 = arr.findIndex(function (q) { return Math.abs(q.t - key.t) < 0.03; });
        if (at2 >= 0) arr[at2] = key; else { arr.push(key); arr.sort(function (a, b) { return a.t - b.t; }); }
      }
      dirty = true; refresh(); msg('keyframe @ ' + key.t + 's');
      return;
    }
    if (k === 'x') {
      e.preventDefault();
      s[kind] = JSON.parse(JSON.stringify(shapeOf(kind)));
      dirty = true; refresh(); msg('keyframes cleared');
      return;
    }
    if (k === 'd') {
      e.preventDefault();
      delete s.mark; delete s.label; delete s.at;
      sel = 0; node = -1; dirty = true;
      refresh(); msg('callout deleted');
      return;
    }
    if (k === 'a') {
      e.preventDefault();
      if (s.mark) { msg('this shot already has one'); return; }
      s.mark = { u: 0.38, v: 0.40, w: 0.24, h: 0.22 };
      s.at = { u: 0.74, v: 0.70 };
      s.label = s.label || 'LABEL';
      sel = 0; node = -1; dirty = true;
      refresh(); msg('callout added \u2014 name it above');
      return;
    }
    if (k === 'l') {
      e.preventDefault();
      var ai = L.indexOf('at');
      if (ai < 0) { msg('no callout on this shot'); return; }
      sel = ai; node = -1;
      draw(); msg('label position \u2014 drag it anywhere');
      return;
    }
    if (k === 'e') {
      e.preventDefault();
      var f = e.shiftKey ? pCap : pLabel;
      f.focus(); f.select();
      msg('typing \u2014 enter or esc when done');
      return;
    }
    if (k === 't') { e.preventDefault(); track(); return; }
    if (k === 'c') {
      e.preventDefault();
      var out = serialise();
      if (navigator.clipboard) navigator.clipboard.writeText(out).then(function () { msg('SHOTS copied'); },
        function () { console.log(out); msg('logged to console'); });
      else { console.log(out); msg('logged to console'); }
      return;
    }
    if (k === 'r' && e.shiftKey) {
      e.preventDefault();
      localStorage.removeItem(STORE);
      msg('saved edit discarded \u2014 reload');
      return;
    }
  });
})();
