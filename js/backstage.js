(function () {
"use strict";

const TRIMMED = ['Website Pics_01','Website Pics_25','Website Pics_28','Website Pics1_02','Website Pics1_03','Website Pics1_18','Website Pics1_23','Website Pics1_24','Website Pics1_25','Website Pics1_26'];
function pick(base) { return TRIMMED.indexOf(base) >= 0 ? 'assets/images/trim-' + base + '.png' : 'assets/images/' + base + '.jpg'; }
function buildFiles() {
  const a = [], b = [];
  for (let i = 1; i <= 35; i++) a.push(pick('Website Pics_' + String(i).padStart(2, '0')));
  for (let i = 1; i <= 32; i++) b.push(pick('Website Pics1_' + String(i).padStart(2, '0')));
  // interleave the two batches so the collage mixes shop shots and screens
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}
const FILES = buildFiles();

class Component {
  constructor() { this.props = {}; }


  _ballMount() {
    const ball = document.getElementById('pg-ball');
    if (!ball || this._ballOn) return;
    this._ballOn = true;
    let bx = -100, by = -100, tx = -100, ty = -100, raf = null;
    const tick = () => {
      bx += (tx - bx) * 0.18; by += (ty - by) * 0.18;
      ball.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) translate(-50%,-50%)';
      raf = Math.abs(tx - bx) > 0.2 || Math.abs(ty - by) > 0.2 ? requestAnimationFrame(tick) : null;
    };
    this._move = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
      const hit = e.target.closest('a, button');
      ball.classList.toggle('pg-ball-big', !!hit);
    };
    window.addEventListener('mousemove', this._move);
  }

  _glide() {
    // Glide scrolling: ease the discrete mouse-wheel notch. Trackpad/touch stay native.
    if ((window.matchMedia && matchMedia('(hover: none)').matches) || (navigator.hardwareConcurrency || 8) <= 4) return;
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

  componentDidMount() { this._ballMount(); this._glide(); }
  componentWillUnmount() { if (this._move) window.removeEventListener('mousemove', this._move); }

  renderVals() {
    const limit = this.props.itemCount ?? FILES.length;
    const items = FILES.slice(0, limit).map((src, i) => ({
      id: i,
      src: src,
      project: 'PROJECT TBD',
      caption: 'Caption pending \u2014 tell me what this one is.'
    }));
    return { crop: this.props.crop ?? 'natural', items, countLabel: items.length + ' ITEMS \u00b7 UNSORTED' };
  }
}



var __app = new Component();
function __boot() { if (__app.componentDidMount) __app.componentDidMount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot); else __boot();
window.addEventListener('pagehide', function () { if (__app.componentWillUnmount) __app.componentWillUnmount(); });
})();
