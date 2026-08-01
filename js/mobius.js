(function () {
"use strict";

class Component {
  constructor() { this.props = {}; }
  componentDidMount() {
    // Glide scrolling: ease the discrete mouse-wheel notch. Trackpad/touch stay native.
    if (!(window.matchMedia && matchMedia('(pointer: coarse)').matches) && (navigator.hardwareConcurrency || 8) > 4) {
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
    const b = document.createElement('div');
    b.id = 'pg-ball';
    document.body.appendChild(b);
    let x = -100, y = -100, tx = -100, ty = -100, raf;
    const move = (e) => { tx = e.clientX; ty = e.clientY; };
    const tick = () => {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      const h = b.offsetWidth / 2;
      b.style.transform = 'translate(' + (x - h) + 'px,' + (y - h) + 'px)';
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', move, { passive: true });
    raf = requestAnimationFrame(tick);
    document.querySelectorAll('a').forEach((el) => {
      el.addEventListener('mouseenter', () => b.classList.add('big'));
      el.addEventListener('mouseleave', () => b.classList.remove('big'));
    });
    this._cleanup = () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); b.remove(); };
  }
  componentWillUnmount() { if (this._cleanup) this._cleanup(); }

  renderVals() {
    const n = 12;
    const pages = [];
    for (let i = 0; i < n; i++) pages.push({ src: 'assets/images/mobius/p' + String(i).padStart(2, '0') + '.png' });
    return { pages };
  }
}



var __app = new Component();
function __boot() { if (__app.componentDidMount) __app.componentDidMount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot); else __boot();
window.addEventListener('pagehide', function () { if (__app.componentWillUnmount) __app.componentWillUnmount(); });
})();
