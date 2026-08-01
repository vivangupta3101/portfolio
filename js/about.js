(function () {
"use strict";

class Component {
  constructor() { this.props = {}; }
  componentDidMount() {
    const ball = document.getElementById('pg-ball');
    if (!ball) return;
    let bx = -100, by = -100, tx = -100, ty = -100, raf = null;
    const tick = () => {
      bx += (tx - bx) * 0.18; by += (ty - by) * 0.18;
      ball.style.transform = 'translate(' + (bx - 11) + 'px,' + (by - 11) + 'px)';
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
