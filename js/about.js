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
    const tick = () => {
      bx += (tx - bx) * 0.18; by += (ty - by) * 0.18;
      ball.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) translate(-50%,-50%)';
      raf = Math.abs(tx - bx) > 0.2 || Math.abs(ty - by) > 0.2 ? requestAnimationFrame(tick) : null;
    };
    this._move = (e) => {
      tx = e.clientX; ty = e.clientY;
      this._pt = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(tick);
      ball.classList.toggle('pg-ball-big', !!e.target.closest('a, button'));
    };
    window.addEventListener('mousemove', this._move);

    // Hover follows the page, not just the mouse: a trackpad/inertia scroll slides content under a
    // stationary cursor without firing a mousemove, so re-test the last known cursor point per frame.
    let __pending = false;
    const __syncHover = () => {
      const bb = document.getElementById('pg-ball');
      if (!bb) return;
      if (!this._pt) { bb.classList.remove('pg-ball-big'); return; }
      const el = document.elementFromPoint(this._pt.x, this._pt.y);
      bb.classList.toggle('pg-ball-big', !!(el && el.closest && el.closest('a, button')));
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
