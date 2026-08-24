(function () {
"use strict";

class Component {
  constructor() { this.props = {}; }
  componentDidMount() {
    // Scrolling is native: the eased wheel handler that used to sit here made each notch
    // drift to a stop, which reads as a bounce-back.
    const b = document.createElement('div');
    b.id = 'pg-ball';
    document.body.appendChild(b);
    let x = -100, y = -100, tx = -100, ty = -100, raf;
    const move = (e) => { tx = e.clientX; ty = e.clientY; this._pt = { x: e.clientX, y: e.clientY }; __syncHover(); };
    const tick = () => {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      b.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%)';
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', move, { passive: true });
    raf = requestAnimationFrame(tick);

    // Hover follows the page, not just the mouse: a trackpad/inertia scroll slides content under a
    // stationary cursor without firing a mousemove, so re-test the last known cursor point per frame.
    let __pending = false;
    const __syncHover = () => {
      const bb = b;
      if (!bb) return;
      if (!this._pt) { bb.classList.remove('big'); return; }
      const el = document.elementFromPoint(this._pt.x, this._pt.y);
      bb.classList.toggle('big', !!(el && el.closest && el.closest('a, button')));
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

    this._cleanup = () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); b.remove(); };
  }
  componentWillUnmount() { if (this._cleanup) this._cleanup(); }

  renderVals() {
    const n = 12;
    const pages = [];
    for (let i = 0; i < n; i++) pages.push({ src: 'assets/images/watchmaker/p' + String(i).padStart(2, '0') + '.png' });
    return { pages };
  }
}



var __app = new Component();
function __boot() { if (__app.componentDidMount) __app.componentDidMount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot); else __boot();
window.addEventListener('pagehide', function () { if (__app.componentWillUnmount) __app.componentWillUnmount(); });
})();
