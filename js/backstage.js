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
      this._pt = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(tick);
      const hit = e.target.closest('a, button');
      ball.classList.toggle('pg-ball-big', !!hit);
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

  // Scrolling is native: the eased wheel handler that used to live here made each notch drift
  // to a stop, which reads as a bounce-back.
  _glide() {}

  _deferImages() {
    // The intro type animation and 67 image decodes were competing for the same frames, so the
    // headline visibly stuttered. Sources are held in data-src and released only once the intro has
    // played; from there native lazy-loading decides what actually fetches. The queue must NEVER
    // wait on load events — offscreen lazy images never fire one, which stalls it forever.
    const imgs = Array.from(document.querySelectorAll('#bs-grid img[data-src]'));
    if (!imgs.length) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 16));
    const hydrate = (im) => {
      const done = () => {
        im.style.opacity = '1';
        if (im.naturalWidth && im.naturalHeight) im.style.aspectRatio = im.naturalWidth + ' / ' + im.naturalHeight;
      };
      im.addEventListener('load', done, { once: true });
      im.addEventListener('error', () => { im.style.opacity = '1'; }, { once: true });
      im.src = im.dataset.src;
      im.removeAttribute('data-src');
      if (im.complete) done();
    };
    let i = 0;
    const pump = () => {
      // assign a chunk per idle slice; assignment is cheap, the browser handles fetch scheduling
      for (let n = 0; n < 8 && i < imgs.length; n++) hydrate(imgs[i++]);
      if (i < imgs.length) idle(pump);
    };
    // 1.45s = the headline/paragraph rise (1.25s + 0.12s stagger) plus a beat
    setTimeout(() => idle(pump), 1450);
  }

  componentDidMount() { this._ballMount(); this._glide(); this._deferImages(); }
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
