(function () {
"use strict";

const CAPTIONS = {"Website Pics1_01":"Shadow test — perforated form throwing a dappled pattern on the wall.","Website Pics1_04":"Bench clamp holding a sanded profile flat while the glue sets.","Website Pics1_05":"Heads down over a shared sketch table.","Website Pics1_06":"Studio afternoon — laptops, cardboard, and someone still deciding.","Website Pics1_07":"Waiting on the CNC bed to finish a pass.","Website Pics1_08":"Fit check with the headband mock-up, mirror as second pair of eyes.","Website Pics1_09":"Desk mid-review: printouts, post-its, and a screen full of options.","Website Pics1_10":"Ribbed 3D print straight off the plate, still warm.","Website Pics1_11":"Museum floor, studying how the car is staged.","Website Pics1_12":"Down on the floor with the taped-out footprint.","Website Pics1_13":"String-and-tag map of every connection in the system.","Website Pics1_14":"Whiteboard mid-synthesis, before anything got wiped.","Website Pics1_15":"The same wall a day later — clusters starting to hold.","Website Pics1_16":"Rover chassis with the board and wiring dropped in.","Website Pics1_17":"Gloves on, spreading filler over the shaped foam.","Website Pics1_19":"Parts laid out for the build: foam soles, cable, small hardware.","Website Pics1_20":"Shooting the model on a tripod in the makeshift studio.","Website Pics1_21":"Fan blade concept held up against the render on screen.","Website Pics1_22":"Workshop crowd around the pattern table.","Website Pics1_27":"Pinning drawings up to read the set together.","Website Pics1_28":"Reference shots taped up beside the working model.","Website Pics1_29":"Exhibition panel, first time seeing it printed.","Website Pics1_30":"Display board at the show, with samples on the shelf.","Website Pics1_31":"Process wall for the same project, boards and photos.","Website Pics1_32":"Holding the plywood body to feel the edge radius.","Website Pics_02":"Shoe scan under projected grid light.","Website Pics_03":"Welded tube frame outside, sun on the joints.","Website Pics_04":"Tension test — pulling a woven strap by hand.","Website Pics_05":"Folded cardboard chair standing on grass.","Website Pics_06":"Two mint prototypes and a tray of components.","Website Pics_07":"Photographing a long print flat on the ground.","Website Pics_08":"Lighting rig taped together against the studio wall.","Website Pics_09":"Plaster claw fresh out of the mould.","Website Pics_10":"Faceted cork model, panels glued facet by facet.","Website Pics_11":"Materials laid out along the table for a group review.","Website Pics_12":"Wooden clamp jig on the bench, mid-assembly.","Website Pics_13":"Paper study models scattered across the cutting mat.","Website Pics_14":"Pencil study of a doubly-curved surface.","Website Pics_15":"Slotted ply discs assembled into a cluster.","Website Pics_16":"Folded paper forms next to their flat nets.","Website Pics_17":"Top-down of the working desk: tools, cards, sketches.","Website Pics_18":"Quilted fabric sample on the mat.","Website Pics_19":"Sketch wall in progress, notes pinned over notes.","Website Pics_20":"Whiteboard planning session, sticky notes in columns.","Website Pics_21":"Loose sketch of an enclosure, coffee-stained corner.","Website Pics_22":"Surfacing on screen at the wooden desk, late.","Website Pics_23":"Thumbnail grid — a page of quick option sketches.","Website Pics_24":"Breadboarded electronics taped down for testing.","Website Pics_26":"Working out of the car boot between site visits.","Website Pics_27":"Bench covered in leather offcuts and stamped test pieces.","Website Pics_29":"White printed parts on the table for a fit check.","Website Pics_30":"Screen, printout and pen — comparing on-screen to on-paper.","Website Pics_31":"CAD drawing on the monitor, dimensions in progress.","Website Pics_32":"Hands inside the frame, wiring up the lamp.","Website Pics_33":"Ceramic-look form on its black plinth.","Website Pics_34":"Two screens: geometry above, thermal-looking colour study below.","Website Pics_35":"Technical drawing marked up in blue ink.","Website Pics1_02":"Terrazzo-style cast discs curing in a row.","Website Pics1_03":"Light test — the shade throwing a warm pool across the floor.","Website Pics1_18":"Screen-time on the couch, laughing at something on the phone.","Website Pics1_23":"Video call review with a mentor.","Website Pics1_24":"Soldering at the electronics bench.","Website Pics1_25":"Drilling a part down at floor level.","Website Pics1_26":"Control panel mock-up beside its printed buttons.","Website Pics_01":"Notebook open on the workbench, layout roughed out.","Website Pics_25":"Wire figure lamp lit up in the dark studio.","Website Pics_28":"Phone case print, patterned skin peeled back."};
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
      if (this._capPlace) this._capPlace();
      raf = Math.abs(tx - bx) > 0.2 || Math.abs(ty - by) > 0.2 ? requestAnimationFrame(tick) : null;
    };
    this._move = (e) => {
      tx = e.clientX; ty = e.clientY;
      this._pt = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(tick);
      const hit = e.target.closest('a, button');
      ball.classList.toggle('pg-ball-big', !!hit);
      if (this._capSet) this._capSet(e.target.closest('[data-bs-tile]'));
    };
    window.addEventListener('mousemove', this._move);

    // Backstage only: a caption trails the dot, naming whatever tile sits under it
    const cap = document.getElementById('bs-cap');
    const capFor = (tile) => {
      const im = tile.querySelector('img');
      const src = im ? (im.dataset.src || im.getAttribute('src') || '') : '';
      const base = decodeURIComponent(src.split('/').pop() || '').replace(/^trim-/, '').replace(/\.(jpg|png)$/i, '');
      return tile.dataset.caption || CAPTIONS[base] || '';
    };
    let capTile = null;
    const capPlace = () => {
      if (!cap) return;
      const on = cap.classList.contains('bs-cap-on');
      const flipX = bx > innerWidth - 300, flipY = by > innerHeight - 120;
      cap.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) translate(' +
        (flipX ? 'calc(-100% - 22px)' : '22px') + ',' + (flipY ? 'calc(-100% - 14px)' : '14px') + ') scale(' + (on ? 1 : 0.96) + ')';
    };
    this._capPlace = capPlace;
    this._capSet = (tile) => {
      if (!cap || tile === capTile) return;
      capTile = tile;
      if (tile) {
        const t = capFor(tile);
        cap.textContent = t;
        cap.classList.toggle('bs-cap-on', !!t);
      } else cap.classList.remove('bs-cap-on');
      capPlace();
    };

    // Hover follows the page, not just the mouse: a trackpad/inertia scroll slides content under a
    // stationary cursor without firing a mousemove, so re-test the last known cursor point per frame.
    let __pending = false;
    const __syncHover = () => {
      const bb = document.getElementById('pg-ball');
      if (!bb) return;
      if (!this._pt) { bb.classList.remove('pg-ball-big'); if (this._capSet) this._capSet(null); return; }
      const el = document.elementFromPoint(this._pt.x, this._pt.y);
      bb.classList.toggle('pg-ball-big', !!(el && el.closest && el.closest('a, button')));
      if (this._capSet) this._capSet(el && el.closest ? el.closest('[data-bs-tile]') : null);
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

}



var __app = new Component();
function __boot() { if (__app.componentDidMount) __app.componentDidMount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot); else __boot();
window.addEventListener('pagehide', function () { if (__app.componentWillUnmount) __app.componentWillUnmount(); });
})();
