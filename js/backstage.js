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
      ball.style.transform = 'translate(' + (bx - 11) + 'px,' + (by - 11) + 'px)';
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

  componentDidMount() { this._ballMount(); }
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
