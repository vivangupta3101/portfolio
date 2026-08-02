(function () {
"use strict";

class Component {
  constructor() { this.props = {}; }
  componentDidMount() {
    // Glide scrolling: ease the discrete mouse-wheel notch. Trackpad/touch stay native.
    if (!(window.matchMedia && matchMedia('(hover: none)').matches) && (navigator.hardwareConcurrency || 8) > 4) {
      const root = document.documentElement;
      let target = 0, current = 0, rafId = null, active = false;
      const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
      const stop = () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; active = false; root.style.scrollBehavior = ''; };
      const tick = () => {
        const d = target - current;
        if (Math.abs(d) < 0.4) { window.scrollTo(0, target); stop(); return; }
        current += d * 0.16;
        window.scrollTo(0, current);
        rafId = requestAnimationFrame(tick);
      };
      window.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.defaultPrevented) return;
        if (!(e.deltaMode === 1 || Math.abs(e.deltaY) >= 45)) { stop(); return; }
        e.preventDefault();
        if (!active) { active = true; target = current = window.scrollY; root.style.scrollBehavior = 'auto'; }
        const m = e.deltaMode === 1 ? 16 : 1;
        target = Math.max(0, Math.min(maxScroll(), target + e.deltaY * m));
        if (rafId === null) rafId = requestAnimationFrame(tick);
      }, { passive: false });
    }
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
      if (!raf) raf = requestAnimationFrame(tick);
      ball.classList.toggle('pg-ball-big', !!e.target.closest('a, button'));
    };
    window.addEventListener('mousemove', this._move);
  }
  componentWillUnmount() { if (this._move) window.removeEventListener('mousemove', this._move); }
}



var __app = new Component();
function __boot() { if (__app.componentDidMount) __app.componentDidMount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot); else __boot();
window.addEventListener('pagehide', function () { if (__app.componentWillUnmount) __app.componentWillUnmount(); });
})();
