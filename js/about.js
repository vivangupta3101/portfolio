(function () {
"use strict";

class Component {
  constructor() { this.props = {}; }
  componentDidMount() {
    // Scrolling is native: the eased wheel handler that used to sit here made each notch
    // drift to a stop, which reads as a bounce-back.
    const ball = document.getElementById('pg-ball');
    if (!ball) return;
    let bx = -100, by = -100, tx = -100, ty = -100, raf = null;
    const win = document.getElementById('hi-win');
    const tick = () => {
      bx += (tx - bx) * 0.18; by += (ty - by) * 0.18;
      ball.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) translate(-50%,-50%)';
      if (win) win.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + (win.classList.contains('hi-win-on') ? 1 : 0.7) + ')';
      raf = Math.abs(tx - bx) > 0.2 || Math.abs(ty - by) > 0.2 ? requestAnimationFrame(tick) : null;
    };
    this._move = (e) => {
      tx = e.clientX; ty = e.clientY;
      this._pt = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(tick);
      ball.classList.toggle('pg-ball-big', !!e.target.closest('a, button'));
    };
    window.addEventListener('mousemove', this._move);

    // Place rotator: each line flips up out of the way to reveal the next
    this._zones = [];
    const rot = document.getElementById('hi-rot');
    if (rot) {
      const wheel = rot.querySelector('.hi-wheel');
      const items = Array.from(rot.querySelectorAll('.hi-item'));
      const N = items.length, STEP = 360 / N;
      let turn = 0;
      const FAN = 26;
      const sd = (k, cur) => { let d = k - cur; if (d > N / 2) d -= N; if (d < -N / 2) d += N; return d; };
      const paint = () => {
        const cur = turn % N;
        items.forEach((el, k) => {
          const d = sd(k, cur);
          const vis = Math.abs(d) <= 1;
          el.classList.toggle('is-cur', d === 0);
          el.style.transform = 'rotate(' + (d * FAN) + 'deg) translateX(var(--R))';
          el.style.transitionDelay = '0s, 0s';
          el.style.opacity = d === 0 ? '1' : vis ? '0.14' : '0';
        });
        rot.style.setProperty('--hi-w', items[cur].offsetWidth + 'px');
      };
      paint();
      window.addEventListener('resize', paint);
      const showPhoto = () => {
        if (!win) return;
        const cur = items[turn % N];
        const img = win.querySelector('img');
        win.querySelector('.hi-win-ph').textContent = cur.textContent.trim();
        win.classList.add('hi-win-empty');
        const imgs = win.querySelectorAll('img');
        imgs.forEach((m) => m.removeAttribute('data-missing'));
        img.onload = () => { win.classList.remove('hi-win-empty'); };
        img.onerror = () => { imgs.forEach((m) => m.setAttribute('data-missing', '')); };
        imgs.forEach((m) => { m.src = cur.dataset.photo; });
      };
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const mask = document.getElementById('hi-mask');
        if (mask) mask.classList.add('hi-open');
        setTimeout(() => {
          setInterval(() => {
            turn += 1;
            paint();
            if (win && win.classList.contains('hi-win-on')) showPhoto();
          }, 2800);
        }, 1600);
      }

      rot.addEventListener('mouseenter', () => {
        if (!win) return;
        win.classList.add('hi-win-on');
        ball.classList.add('pg-ball-window');
        if (!raf) raf = requestAnimationFrame(tick);
        showPhoto();
      });
      rot.addEventListener('mouseleave', () => {
        if (!win) return;
        win.classList.remove('hi-win-on');
        ball.classList.remove('pg-ball-window');
        if (!raf) raf = requestAnimationFrame(tick);
      });

      // Scrolling moves the word under a stationary cursor: re-test hit on every frame sync
      this._zones.push((p) => {
        if (!win) return false;
        const r = rot.getBoundingClientRect();
        const inside = !!p && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
        if (inside === win.classList.contains('hi-win-on')) return inside;
        win.classList.toggle('hi-win-on', inside);
        ball.classList.toggle('pg-ball-window', inside);
        if (inside) showPhoto();
        if (!raf) raf = requestAnimationFrame(tick);
        return inside;
      });
    }

    // Sketch window: the ball becomes a square viewport and the pencil copy shows through it
    const flip = document.getElementById('ab-flip');
    const sketch = document.getElementById('ab-sketch');
    if (flip && sketch) {
      const onFlipMove = (e) => {
        const r = flip.getBoundingClientRect();
        sketch.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
        sketch.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
      };
      flip.addEventListener('mouseenter', (e) => {
        sketch.classList.add('ab-sketch-on');
        ball.classList.add('pg-ball-window');
        onFlipMove(e);
      });
      flip.addEventListener('mousemove', onFlipMove);
      flip.addEventListener('mouseleave', () => {
        sketch.classList.remove('ab-sketch-on');
        ball.classList.remove('pg-ball-window');
      });

      this._zones.push((p) => {
        const r = flip.getBoundingClientRect();
        const inside = !!p && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
        sketch.classList.toggle('ab-sketch-on', inside);
        ball.classList.toggle('pg-ball-window', inside);
        if (inside) {
          sketch.style.setProperty('--mx', (p.x - r.left).toFixed(1) + 'px');
          sketch.style.setProperty('--my', (p.y - r.top).toFixed(1) + 'px');
        }
        return inside;
      });
    }

    // Hover follows the page, not just the mouse: a trackpad/inertia scroll slides content under a
    // stationary cursor without firing a mousemove, so re-test the last known cursor point per frame.
    let __pending = false;
    const __syncHover = () => {
      const bb = document.getElementById('pg-ball');
      if (!bb) return;
      if (!this._pt) { bb.classList.remove('pg-ball-big'); this._zones.forEach((fn) => fn(null)); return; }
      let inZone = false;
      this._zones.forEach((fn) => { if (fn(this._pt)) inZone = true; });
      const el = document.elementFromPoint(this._pt.x, this._pt.y);
      bb.classList.toggle('pg-ball-big', !inZone && !!(el && el.closest && el.closest('a, button')));
    };
    const __queueSync = () => {
      if (__pending) return;
      __pending = true;
      requestAnimationFrame(() => { __pending = false; __syncHover(); });
    };
    window.addEventListener('scroll', __queueSync, { passive: true });
    window.addEventListener('wheel', __queueSync, { passive: true });
    window.addEventListener('resize', __queueSync);
    document.addEventListener('mouseleave', () => { this._pt = null; __syncHover(); });

  }
  componentWillUnmount() { if (this._move) window.removeEventListener('mousemove', this._move); }
}



var __app = new Component();
function __boot() { if (__app.componentDidMount) __app.componentDidMount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot); else __boot();
window.addEventListener('pagehide', function () { if (__app.componentWillUnmount) __app.componentWillUnmount(); });
})();
