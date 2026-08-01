(function () {
"use strict";

class Component {
  constructor() { this.props = {}; }
  componentDidMount() {
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

    // inertial smooth scrolling — matches the homepage feel
    {
      let target = window.scrollY, current = window.scrollY, rafId = null;
      const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const tick = () => {
        current += (target - current) * 0.1;
        if (Math.abs(target - current) < 0.5) { current = target; window.scrollTo(0, current); rafId = null; return; }
        window.scrollTo(0, current);
        rafId = requestAnimationFrame(tick);
      };
      const onWheel = (e) => {
        if (e.ctrlKey || e.defaultPrevented) return;
        e.preventDefault();
        if (rafId === null) { target = window.scrollY; current = window.scrollY; }
        const m = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
        target = Math.max(0, Math.min(maxScroll(), target + e.deltaY * m));
        if (rafId === null) rafId = requestAnimationFrame(tick);
      };
      const onNative = () => { if (rafId === null) { target = window.scrollY; current = window.scrollY; } };
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('scroll', onNative, { passive: true });
    }
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
