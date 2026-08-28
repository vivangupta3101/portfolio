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

    // scroll reveals: each deck block (text and image alike) rises and fades in once
    const deck = document.querySelector('[data-screen-label="Blind Watchmaker deck"]');
    if (deck) {
      // the scripted pages (p03 pop-out grid, p05 problem statement) animate themselves —
      // wrapping them in a reveal fights their own transforms, so leave them alone
      const blocks = [...deck.children].filter((el) => !el.querySelector('img[src$="watchmaker/p03.png"], img[src$="watchmaker/p05.png"]') && !(el.tagName === 'IMG' && /p0[35]\.png$/.test(el.getAttribute('src') || '')));
      blocks.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(26px)';
        el.style.transition = 'opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)';
        el.style.willChange = 'opacity, transform';
      });
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          io.unobserve(e.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
      blocks.forEach((el) => io.observe(el));
      // anything already on screen at load shows straight away
      requestAnimationFrame(() => {
        blocks.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.9) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; io.unobserve(el); }
        });
      });
    }

    // every block of the deck overlaps its neighbour by 2px: at wide viewports each page scales to a
    // fractional height, and a boundary with no overlap rounds into a hairline of page background
    const deckEl = document.querySelector('[data-screen-label="Blind Watchmaker deck"]');
    if (deckEl) {
      const seal = () => {
        Array.from(deckEl.children).forEach((c, i) => {
          if (i < deckEl.children.length - 1) c.style.marginBottom = '-2px';
        });
      };
      seal();
      setTimeout(seal, 400);
      setTimeout(seal, 1500);
    }
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
