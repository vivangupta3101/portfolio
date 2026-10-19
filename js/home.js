(function () {
"use strict";

class Component {
  constructor() { this.props = {}; }
  componentDidMount() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('vg-in'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.vg-reveal').forEach((el) => io.observe(el));
    this._io = io;
    const leak = document.getElementById('vg-leak');
    const main = document.querySelector('main');
    const speed = this.props.leakSpeed ?? 1.5;
    leak.style.transitionDuration = speed + 's';
    // one rAF per frame drives every scroll-reactive job (was: several listeners each forcing layout)
    const scrollJobs = [];
    let sJobRaf = null;
    const runScrollJobs = () => { sJobRaf = null; for (let i = 0; i < scrollJobs.length; i++) scrollJobs[i](); };
    const onScrollShared = () => { if (sJobRaf === null) sJobRaf = requestAnimationFrame(runScrollJobs); };
    // weak GPUs choke on 4 full-viewport background layers + a blurred fixed nav.
    // detect once and drop those two effects instead of dropping frames.
    // (hover: none) = a real touch device. (pointer: coarse) also matches touchscreen laptops,
    // which are perfectly capable — using it here needlessly stripped the effects on desktops.
    const noHover = window.matchMedia && matchMedia('(hover: none)').matches;
    const lowCore = (navigator.hardwareConcurrency || 8) <= 4;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lite = noHover || lowCore || reduce;
    const setLite = (on) => {
      lite = on;
      document.documentElement.classList.toggle('vg-lite', on);
      if (on) wins.forEach((w) => { w.style.transform = ''; w.style.willChange = ''; });
      else { sizeWins(); sync(); }
    };
    let wins = [];
    let vw = window.innerWidth, vh = window.innerHeight;
    const sizeWins = () => {
      wins = Array.prototype.slice.call(document.querySelectorAll('.vg-win'));
      vw = window.innerWidth; vh = window.innerHeight;
      if (lite) return;
      for (let i = 0; i < wins.length; i++) {
        const w = wins[i];
        w.style.width = vw + 'px'; w.style.height = vh + 'px';
        w.style.left = '0px'; w.style.top = '0px';
        w.style.willChange = 'transform';
      }
    };
    // read every rect first, then write every transform: one layout pass per frame, no thrash
    const rectBuf = [];
    const sync = () => {
      if (lite) return;
      const n = wins.length;
      for (let i = 0; i < n; i++) {
        const p = wins[i].parentElement;
        rectBuf[i] = p && p.offsetParent !== null ? p.getBoundingClientRect() : null;
      }
      for (let i = 0; i < n; i++) {
        const r = rectBuf[i];
        if (!r || r.bottom < -vh || r.top > vh * 2) continue;
        wins[i].style.transform = 'translate3d(' + (-r.left).toFixed(1) + 'px,' + (-r.top).toFixed(1) + 'px,0)';
      }
    };
    if (lite) document.documentElement.classList.add('vg-lite');
    sizeWins();
    sync();
    // hero scroll choreography: faded up top while video plays -> settles centered, sub fades in
    const title = document.getElementById('vg-hero-title');
    const sub = document.getElementById('vg-hero-sub');
    const arrow = document.getElementById('vg-hero-arrow');
    const hero = document.getElementById('top');
    const smooth = (t) => t * t * (3 - 2 * t);
    // the title follows the scroll through a short critically-damped glide rather than jumping
    // to each scroll event's position: native touch scroll and coarse wheels deliver uneven steps,
    // which read as a stutter on a large scaled headline
    let heroP = null, heroRaf = 0, heroLast = 0;
    const heroTarget = () => {
      const range = Math.max(1, hero.offsetHeight - window.innerHeight);
      return Math.max(0, Math.min(1, window.scrollY / range));
    };
    const heroApply = (p) => {
      const e = smooth(p);
      const box = title.closest('div');
      const boxH = box ? box.offsetHeight : window.innerHeight;
      // clamp from the title's static (untransformed) top so it never slides under the nav
      const staticTop = title.offsetTop;
      const boxTop = box ? box.getBoundingClientRect().top : 0;
      const navClear = Math.max(0, 74 - boxTop); // fixed nav ≈58px + margin, minus how far the box has scrolled up
      const maxUp = Math.max(0, staticTop - navClear);
      const off = Math.min(boxH * 0.25, maxUp);
      // starts small and high, grows to full size as it settles
      const hs = 0.52 + 0.48 * e;
      title.style.transform = 'translateY(' + (-off * (1 - e)).toFixed(1) + 'px) scale(' + hs.toFixed(3) + ')';
      title.style.opacity = (0.4 + 0.6 * e).toFixed(3);
      const se = smooth(Math.max(0, Math.min(1, (p - 0.3) / 0.5)));
      if (sub) {
        sub.style.opacity = se.toFixed(3);
        sub.style.transform = 'translateY(' + (22 * (1 - se)).toFixed(1) + 'px)';
        sub.style.letterSpacing = (0.55 - 0.27 * se).toFixed(3) + 'em';
      }
      if (arrow) arrow.style.opacity = (se * 0.75).toFixed(3);
    };
    const heroLoop = (now) => {
      heroRaf = 0;
      const t = heroTarget();
      const dt = heroLast ? Math.min(0.05, (now - heroLast) / 1000) : 1 / 60;
      heroLast = now;
      heroP = heroP == null ? t : heroP + (t - heroP) * (1 - Math.exp(-dt * 11));
      if (Math.abs(t - heroP) < 0.0006) heroP = t;
      heroApply(heroP);
      if (heroP !== t) heroRaf = requestAnimationFrame(heroLoop); else heroLast = 0;
    };
    const heroTick = (instant) => {
      if (!title || !hero) return;
      if (instant === true) { heroP = heroTarget(); heroApply(heroP); return; }
      if (heroP === 1 && window.scrollY > hero.offsetHeight + 200) return;
      if (!heroRaf) heroLoop(performance.now());
    };
    document.querySelectorAll('.vg-rise > span').forEach((l, i) => { l.style.animationDelay = (0.35 + i * 0.13) + 's'; });
    // fetch silhouettes at top priority before the video hogs bandwidth
    ['aeron', 'bitl', 'mobius', 'strahl', 'watchmaker'].forEach((k) => {
      const im = new Image(); im.fetchPriority = 'high'; im.src = 'assets/images/' + k + '-silhouette.webp';
    });
    // flowing contour lines behind the hero video (fills the letterbox bars)
    const flow = document.getElementById('vg-hero-flow');
    if (false && flow) {
      const fctx = flow.getContext('2d');
      let fw = 0, fh = 0;
      const fit = () => {
        const r = flow.getBoundingClientRect();
        fw = flow.width = Math.round(r.width * devicePixelRatio);
        fh = flow.height = Math.round(r.height * devicePixelRatio);
      };
      fit();
      window.addEventListener('resize', fit);
      let t0 = performance.now();
      const draw = (now) => {
        this._flowRaf = requestAnimationFrame(draw);
        if (window.__vgBusy) return;
        const heroEl = document.getElementById('top');
        if (heroEl && heroEl.getBoundingClientRect().bottom < 0) return; // off-screen: skip work
        const t = (now - t0) / 1000;
        fctx.clearRect(0, 0, fw, fh);
        const lines = 26;
        for (let i = 0; i < lines; i++) {
          const yBase = (i / (lines - 1)) * fh;
          const edge = Math.min(1, Math.abs(yBase - fh / 2) / (fh / 2)); // strongest near top/bottom
          const a = 0.02 + 0.16 * edge * edge;
          fctx.beginPath();
          fctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
          fctx.lineWidth = 1 * devicePixelRatio;
          const seg = 24;
          for (let s = 0; s <= seg; s++) {
            const x = (s / seg) * fw;
            const y = yBase
              + Math.sin(s * 0.55 + t * 0.35 + i * 0.45) * 9 * devicePixelRatio
              + Math.sin(s * 0.21 - t * 0.22 + i * 0.9) * 16 * devicePixelRatio;
            if (s === 0) fctx.moveTo(x, y); else fctx.lineTo(x, y);
          }
          fctx.stroke();
        }
      };
      this._flowRaf = requestAnimationFrame(draw);
      this._flowFit = fit;
    }
    // warm mask images: render each morph state off-screen so the first real hover is instant
    ['aeron', 'bitl', 'mobius', 'strahl', 'watchmaker'].forEach((k) => {
      const w = document.createElement('div');
      w.id = 'vg-ball-warm-' + k;
      w.className = 'vg-ball-' + k;
      w.style.cssText = 'position:fixed;left:-500px;top:-500px;width:150px;height:80px;z-index:-1;opacity:0.01;transition:none';
      const m = "url('assets/images/" + k + "-silhouette.webp') center / contain no-repeat";
      w.innerHTML = '<div class="vg-ball-inner" style="transition:none;width:100%;height:100%;background:#fff;-webkit-mask:' + m + ';mask:' + m + '"></div>';
      document.body.appendChild(w);
    });
    // soft entrance on load, then direct 1:1 scroll control
    title.style.transition = 'none';
    if (sub) sub.style.transition = 'opacity 1.4s ease 0.2s, transform 1.4s ease 0.2s';
    requestAnimationFrame(() => requestAnimationFrame(() => heroTick(true)));
    this._heroIntro = setTimeout(() => {
      title.style.transition = 'none';
      if (sub) sub.style.transition = 'none';
    }, 1700);
    scrollJobs.push(sync);
    scrollJobs.push(heroTick);
    const onResize = () => { sizeWins(); sync(); heroTick(true); };
    this._sync = onScrollShared;
    this._resize = onResize;
    window.addEventListener('scroll', onScrollShared, { passive: true });
    window.addEventListener('resize', onResize);
    // preload leak images so the expand never paints mid-decode
    (window.__vgKeep || (window.__vgKeep = []));
    document.querySelectorAll('[data-wire]').forEach((r) => { const i = new Image(); i.src = (window.__resources && r.dataset.wireRes && window.__resources[r.dataset.wireRes]) || r.dataset.wire; window.__vgKeep.push(i); if (i.decode) i.decode().catch(() => {}); });
    document.querySelectorAll('[data-leak-img]').forEach((r) => { const i = new Image(); i.src = (window.__resources && r.dataset.leakRes && window.__resources[r.dataset.leakRes]) || r.dataset.leakImg; window.__vgKeep.push(i); if (i.decode) i.decode().catch(() => {}); });
    document.querySelectorAll('.vg-row img').forEach((im) => { im.loading = 'eager'; if (im.decode) im.decode().catch(() => {}); });
    // custom minimal scrollbar: hidden until cursor nears the right edge or page scrolls
    const sb = document.getElementById('vg-sb');
    const sbThumb = document.getElementById('vg-sb-thumb');
    if (sb && sbThumb) {
      let sbHide, sbDragging = false, sbGrab = 0;
      const sbUpdate = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max <= 0) { sb.style.display = 'none'; return; }
        const h = Math.max(48, window.innerHeight * (window.innerHeight / document.documentElement.scrollHeight));
        sbThumb.style.height = h + 'px';
        sbThumb.style.top = ((window.scrollY / max) * (window.innerHeight - h - 12) + 6) + 'px';
      };
      const sbFlash = () => {
        sb.classList.add('vg-sb-show');
        clearTimeout(sbHide);
        if (!sbDragging && !sb.matches(':hover')) sbHide = setTimeout(() => sb.classList.remove('vg-sb-show'), 900);
      };
      scrollJobs.push(() => { sbUpdate(); sbFlash(); });
      window.addEventListener('resize', sbUpdate);
      window.addEventListener('mousemove', (e) => {
        if (window.innerWidth - e.clientX < 40) sbFlash();
        if (sbDragging) {
          const h = sbThumb.offsetHeight;
          const max = document.documentElement.scrollHeight - window.innerHeight;
          const t = Math.max(0, Math.min(1, (e.clientY - sbGrab - 6) / (window.innerHeight - h - 12)));
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(0, t * max);
          document.documentElement.style.scrollBehavior = '';
        }
      });
      sbThumb.addEventListener('mousedown', (e) => {
        sbDragging = true; sbGrab = e.clientY - sbThumb.getBoundingClientRect().top;
        sb.classList.add('vg-sb-drag'); e.preventDefault();
      });
      window.addEventListener('mouseup', () => {
        if (!sbDragging) return;
        sbDragging = false; sb.classList.remove('vg-sb-drag'); sbFlash();
      });
      sbUpdate();
    }
    // ball cursor
    const ball = document.getElementById('vg-ball');
    let bx = -100, by = -100, tx = -100, ty = -100, raf;
    const move = (e) => { tx = e.clientX; ty = e.clientY; this._pt = { x: e.clientX, y: e.clientY }; };
    document.addEventListener('mouseleave', () => { this._pt = null; if (this._syncHover) this._syncHover(); });
    // centre with a -50% translate rather than subtracting offsetWidth/2: the percentage resolves
    // against the element's own live size, so it stays centred through the 0.8s morph without
    // reading layout. (Sampling offsetWidth on an interval made the cursor jump ~20px mid-morph.)
    const tick = () => { bx += (tx - bx) * 0.22; by += (ty - by) * 0.22; ball.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) translate(-50%,-50%)'; raf = requestAnimationFrame(tick); };
    ball.style.transform = 'translate3d(-100px,-100px,0) translate(-50%,-50%)';
    window.addEventListener('mousemove', move, { passive: true });
    raf = requestAnimationFrame(tick);
    this._ball = { move, stop: () => cancelAnimationFrame(raf) };
    document.querySelectorAll('a').forEach((el) => {
      if (el.classList.contains('vg-row')) return; // tiles morph the cursor into their own silhouette
      el.addEventListener('mouseenter', () => ball.classList.add('vg-ball-big'));
      el.addEventListener('mouseleave', () => ball.classList.remove('vg-ball-big'));
    });
    // the cursor eases back to a plain circle whenever a project opens
    this._ballReset = () => {
      ball.className = '';
      ball.classList.remove('vg-ball-big');
    };
    // Scrolling is fully native — a wheel-lerp handler here made each notch drift to a stop, which
    // reads as lag on the live site.
    {
      const readerEl = () => document.getElementById('vg-reader');
      const blockScroll = (e) => { if (!readerEl()) e.preventDefault(); };
      this._lockScroll = (on) => {
        this._scrollLocked = on;
        window.__vgScrollLocked = on;
        if (on) {
          window.addEventListener('wheel', blockScroll, { passive: false });
          window.addEventListener('touchmove', blockScroll, { passive: false });
        } else {
          window.removeEventListener('wheel', blockScroll);
          window.removeEventListener('touchmove', blockScroll);
        }
      };
      this._smoothScroll = () => { this._lockScroll(false); };
      this._readerScrollSync = () => {};
      this._readerScrollReset = () => {};
    }
    // nav logo expands leftwards to reveal links
    {
      const logo = document.getElementById('vg-navlogo');
      const links = document.getElementById('vg-navlinks');
      if (logo && links) {
        let open = false, settleT;
        const dots = logo.querySelectorAll('.vg-dot');
        // dots carry mixed colours at rest (one orange, three black); once they merge into the square
        // they must read as one solid orange block, so the rest colour is remembered and restored
        const restFill = Array.from(dots).map((d) => d.style.background);
        const set = (o) => {
          open = o;
          // The panel expands from max-width 0, so both labels slide sideways for 0.65s. A click
          // landing mid-slide hits whichever label drifted under the pointer (BACKSTAGE sits nearer
          // the logo), opening the wrong page — so links stay untargetable until the motion settles.
          clearTimeout(settleT);
          links.style.pointerEvents = 'none';
          if (o) settleT = setTimeout(() => { links.style.pointerEvents = 'auto'; }, 700);
          links.style.maxWidth = o ? '300px' : '0px';
          links.style.opacity = o ? '1' : '0';
          links.style.transform = o ? 'translateX(0)' : 'translateX(14px)';
          links.style.marginRight = o ? '18px' : '0px';
          const center = logo.querySelector('.vg-dot-c');
          if (o) {
            // four circles contract inward and square off; a fifth square blinks in at the centre — a tight 5-dot grid
            const shift = [[3, 3], [-3, 3], [3, -3], [-3, -3]];
            dots.forEach((d, i) => {
              d.style.transform = 'translate(' + shift[i][0] + 'px, ' + shift[i][1] + 'px) scale(0.86)';
              d.style.borderRadius = '1px';
              d.style.background = '#ec7e41';
            });
            if (center) { center.style.opacity = '1'; center.style.transform = 'scale(1)'; }
          } else {
            dots.forEach((d, i) => {
              d.style.transform = 'none';
              d.style.borderRadius = '999px';
              d.style.background = restFill[i];
            });
            if (center) { center.style.opacity = '0'; center.style.transform = 'scale(0.2)'; }
          }
        };
        logo.addEventListener('click', () => set(!open));
        links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
        document.addEventListener('click', (e) => { if (open && !e.target.closest('#vg-navmenu')) set(false); });
      }
    }
    // category tabs
    const tabsEl = document.getElementById('vg-tabs');
    if (tabsEl) {
      const pill = document.getElementById('vg-tab-pill');
      const movePill = () => {
        const on = tabsEl.querySelector('.vg-tab-on');
        if (!on || !pill) return;
        pill.style.left = on.offsetLeft + 'px';
        pill.style.top = on.offsetTop + 'px';
        pill.style.width = on.offsetWidth + 'px';
        pill.style.height = on.offsetHeight + 'px';
      };
      // place instantly on load, animate afterwards
      if (pill) { const tr = pill.style.transition; pill.style.transition = 'none'; movePill(); void pill.offsetWidth; pill.style.transition = tr; }
      window.addEventListener('resize', movePill);
      this._movePill = movePill;
      // restoring a remembered category on load must not replay the swap: the grid is put straight
      // into its filtered state so the return-shrink can measure the real tile position
      const applySilent = (cat) => {
        tabsEl.querySelectorAll('.vg-tab').forEach((t) => {
          const on = (t.dataset.cat || 'all') === cat;
          t.classList.toggle('vg-tab-on', on);
          t.style.color = on ? '#ffffff' : '#131313';
        });
        const prevT = pill ? pill.style.transition : null;
        if (pill) pill.style.transition = 'none';
        movePill();
        const projs = Array.from(document.querySelectorAll('.vg-proj'));
        let j = 0;
        projs.forEach((p) => {
          const show = cat === 'all' || p.dataset.cat === cat;
          p.classList.remove('vg-swap-out', 'vg-swap-in');
          p.style.transition = 'none';
          p.style.display = show ? 'flex' : 'none';
          if (show) {
            p.style.flexDirection = j % 2 === 0 ? 'row-reverse' : 'row';
            const desc = p.querySelector(':scope > div.vg-reveal');
            if (desc) desc.style.textAlign = j % 2 === 0 ? 'left' : 'right';
            p.querySelectorAll('.vg-reveal').forEach((el) => el.classList.add('vg-in'));
            j++;
          }
        });
        void document.body.offsetWidth;
        projs.forEach((p) => { p.style.transition = ''; });
        if (pill) pill.style.transition = prevT;
        sync();
      };
      this._applyCat = applySilent;
      tabsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.vg-tab');
        if (!btn) return;
        try { sessionStorage.setItem('vgCat', btn.dataset.cat || 'all'); } catch (e2) {}
        tabsEl.querySelectorAll('.vg-tab').forEach((t) => {
          const on = t === btn;
          t.classList.toggle('vg-tab-on', on);
          t.style.color = on ? '#ffffff' : '#131313';
        });
        movePill();
        const cat = btn.dataset.cat;
        const projs = Array.from(document.querySelectorAll('.vg-proj'));
        if (this._swapT) clearTimeout(this._swapT);
        // soft swap: current set settles down + fades, new set rises in with a gentle stagger
        projs.forEach((p) => { if (p.style.display !== 'none') { p.style.transition = 'opacity 0.32s ease, transform 0.32s ease'; p.classList.add('vg-swap-out'); } });
        this._swapT = setTimeout(() => {
          let j = 0;
          projs.forEach((p) => {
            const show = cat === 'all' || p.dataset.cat === cat;
            p.classList.remove('vg-swap-out');
            p.style.display = show ? 'flex' : 'none';
            if (show) {
              // re-alternate image left/right by visible position within the filtered set
              p.style.flexDirection = j % 2 === 0 ? 'row-reverse' : 'row';
              const desc = p.querySelector(':scope > div.vg-reveal');
              if (desc) desc.style.textAlign = j % 2 === 0 ? 'left' : 'right';
              p.querySelectorAll('.vg-reveal').forEach((el) => el.classList.add('vg-in'));
              p.classList.add('vg-swap-in');
              const d = j * 0.09;
              p.style.transition = 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) ' + d + 's, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) ' + d + 's';
              j++;
            }
          });
          requestAnimationFrame(() => requestAnimationFrame(() => projs.forEach((p) => p.classList.remove('vg-swap-in'))));
          setTimeout(() => projs.forEach((p) => { p.style.transition = ''; }), j * 90 + 850);
          sync();
        }, 340);
      });
    }
    [['BitL', 'vg-ball-bitl'], ['Mobius', 'vg-ball-mobius'], ['StrahL', 'vg-ball-strahl'], ['Blind Watchmaker', 'vg-ball-watchmaker']].forEach(([label, cls]) => {
      const row = document.querySelector('[data-screen-label="' + label + '"]');
      if (row) {
        void cls; // ball silhouette class is owned by setHover() so scroll-driven hover keeps it in sync
      }
    });
    // first-visit category index overlay: pops once the visitor scrolls past the statement
    const idx = document.getElementById('vg-index');
    if (idx) {
      const stmt = document.querySelector('[data-screen-label="Partnership statement"]');
      let idxShown = false;
      // a remembered category is re-applied to the grid, but it only suppresses the picker when the
      // visitor is coming back from a project page (those flags are still set at this point, and are
      // cleared further down) — a fresh load of the home page always gets the picker on scroll
      let savedCat = null, returning = false;
      try {
        savedCat = sessionStorage.getItem('vgCat');
        // vgHomeScroll is the one flag consumed per return (cleared further down); vgExpandedFrom is
        // write-only and would stick for the whole session, wrongly suppressing every later load
        returning = sessionStorage.getItem('vgHomeScroll') != null;
      } catch (e) {}
      if (savedCat && this._applyCat) this._applyCat(savedCat);
      if (savedCat && returning) {
        idxShown = true;
        idx.classList.remove('vg-idx-show');
        idx.style.display = 'none';
      }
      // Nothing of the work section is on screen before the choice is made: the category bar and the
      // grid are held back (layout intact, so the picker's scroll trigger and the tile-return
      // measurements still work) and then rise in together once a category has been picked.
      const gateBar = document.querySelector('[data-screen-label="Category tabs"]');
      const gateWork = document.getElementById('vg-work');
      const gated = [gateBar, gateWork].filter(Boolean);
      const closeGate = () => gated.forEach((el) => {
        el.style.transition = 'none';
        el.style.opacity = '0';
        // the bar only fades: the picker flies its words into the real tab rects, so the bar must not
        // be shifted while that hand-off is measured
        if (el !== gateBar) el.style.transform = 'translateY(24px)';
        el.style.pointerEvents = 'none';
      });
      const openGate = () => {
        const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
        gated.forEach((el, i) => {
          el.style.transition = 'opacity 0.75s ease ' + (i * 0.28) + 's, transform 0.95s ' + EASE + ' ' + (i * 0.28) + 's';
          void el.offsetWidth; // closeGate set transition:none — commit that before the target values
          el.style.opacity = '1';
          if (el !== gateBar) el.style.transform = 'translateY(0)';
          el.style.pointerEvents = '';
        });
        // the rows come up one after the other behind the bar, same rise as every other reveal
        if (gateWork) {
          Array.from(gateWork.querySelectorAll('.vg-proj')).forEach((p, i) => {
            if (p.style.display === 'none') return;
            p.style.transition = 'opacity 0.8s ease ' + (0.4 + i * 0.1) + 's, transform 0.95s cubic-bezier(0.22, 1, 0.36, 1) ' + (0.4 + i * 0.1) + 's';
            p.style.opacity = '0';
            p.style.transform = 'translateY(30px)';
            void p.offsetWidth;
            p.style.opacity = '';
            p.style.transform = 'translateY(0)';
          });
          setTimeout(() => {
            gated.forEach((el) => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; });
            gateWork.querySelectorAll('.vg-proj').forEach((p) => { p.style.transition = ''; p.style.transform = ''; });
          }, 2200);
        }
      };
      // a return visit was never gated, so it needs no entrance
      if (!idxShown) closeGate();
      idx.querySelectorAll('.vg-idx-head, .vg-idx-item').forEach((el, i) => { el.style.transitionDelay = (0.15 + i * 0.07) + 's'; });
      // the category bar is a fixed bottom dock, so the work grid is what the picker waits for
      const tabsSec = document.getElementById('vg-work');
      const onIdxScroll = () => {
        if (idxShown) return;
        // wait until the statement has been read and the tabs bar is well into view
        const due = tabsSec ? tabsSec.getBoundingClientRect().top < window.innerHeight * 0.42 : (stmt && stmt.getBoundingClientRect().bottom < window.innerHeight * 0.2);
        if (due) {
          idxShown = true;
          idx.classList.add('vg-idx-show');
          document.body.style.overflow = 'hidden';
          // clear entrance stagger so hover response is instant afterwards
          setTimeout(() => idx.querySelectorAll('.vg-idx-head, .vg-idx-item').forEach((el) => { el.style.transitionDelay = '0s'; }), 1400);
        }
      };
      window.addEventListener('scroll', onIdxScroll, { passive: true });
      idx.addEventListener('click', (e) => {
        const b = e.target.closest('.vg-idx-item');
        const picked = b ? b.dataset.cat : 'all';
        try { sessionStorage.setItem('vgCat', picked); } catch (e2) {}
        const tab = document.querySelector('#vg-tabs .vg-tab[data-cat="' + picked + '"]');
        document.body.style.overflow = '';
        if (tab) tab.click();
        // jump behind the frosted glass so the tabs bar is on screen for the sort
        const sec = document.getElementById('vg-work');
        if (sec) {
          const prev = document.documentElement.style.scrollBehavior;
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(0, window.scrollY + sec.getBoundingClientRect().top - window.innerHeight * 0.24);
          document.documentElement.style.scrollBehavior = prev;
        }
        openGate();
        // every category sorts itself into its slot in the bar; tab text is ghosted (pills stay) until each clone lands, then cross-fades in place
        const tabs = Array.from(document.querySelectorAll('#vg-tabs .vg-tab'));
        tabs.forEach((t) => t.classList.add('vg-tab-ghost'));
        idx.querySelectorAll('.vg-idx-item').forEach((item, i) => {
          const target = tabs.find((t) => t.dataset.cat === item.dataset.cat);
          if (!target) return;
          const from = item.getBoundingClientRect();
          const to = target.getBoundingClientRect();
          const cs = getComputedStyle(item);
          const tcs = getComputedStyle(target);
          const delay = i * 0.06;
          const clone = document.createElement('div');
          clone.textContent = (item.childNodes[0] && item.childNodes[0].nodeValue ? item.childNodes[0].nodeValue : item.textContent).trim();
          Object.assign(clone.style, { position: 'fixed', left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', fontFamily: tcs.fontFamily, fontSize: cs.fontSize, fontWeight: '600', letterSpacing: cs.letterSpacing === 'normal' ? '0em' : cs.letterSpacing, color: '#ffffff', zIndex: '9500', pointerEvents: 'none', transition: 'transform 1.15s cubic-bezier(0.34, 1.28, 0.44, 1) ' + delay + 's, font-size 1.15s cubic-bezier(0.22, 1, 0.36, 1) ' + delay + 's, letter-spacing 1.15s cubic-bezier(0.22, 1, 0.36, 1) ' + delay + 's, color 1.05s ease ' + delay + 's, opacity 0.3s ease', opacity: '1' });
          document.body.appendChild(clone);
          item.style.visibility = 'hidden';
          const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
          const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            clone.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
            clone.style.fontSize = tcs.fontSize;
            clone.style.letterSpacing = tcs.letterSpacing;
            clone.style.color = tcs.color;
          }));
          // land: un-ghost the real tab while the identical clone fades out on top — seamless hand-off
          setTimeout(() => {
            target.classList.remove('vg-tab-ghost');
            clone.style.opacity = '0';
            setTimeout(() => { clone.remove(); item.style.visibility = ''; }, 340);
          }, delay * 1000 + 1150);
        });
        // safety: clear any ghosts left (e.g. tabs with no overlay counterpart)
        setTimeout(() => tabs.forEach((t) => t.classList.remove('vg-tab-ghost')), idx.querySelectorAll('.vg-idx-item').length * 60 + 1600);
        idx.classList.remove('vg-idx-show');
      });
      this._idxScroll = onIdxScroll;
    }
    // hand-sketch reveal: each traced path draws itself in, ordered outward from the tile
    this._traceCache = {};
    this._prepCache = {};
    this._aspect = {};
    // one-time heavy pass per artwork: split compound paths, measure lengths and bbox centres.
    // doing it off-screen at idle means a hover only has to set transitions.
    this._prepare = (url, markup) => {
      if (this._prepCache[url]) return this._prepCache[url];
      const pen = document.createElement('div');
      pen.setAttribute('aria-hidden', 'true');
      pen.style.cssText = 'position:fixed;left:-99999px;top:0;width:1200px;height:760px;opacity:0.01;pointer-events:none;contain:strict';
      pen.innerHTML = markup;
      document.body.appendChild(pen);
      const svg = pen.querySelector('svg');
      if (!svg) { pen.remove(); return markup; }
      svg.style.width = '100%'; svg.style.height = '100%';
      const NSU = 'http://www.w3.org/2000/svg';
      const probe = document.createElementNS(NSU, 'path');
      probe.style.display = 'none';
      svg.appendChild(probe);
      const num = '-?\\d*\\.?\\d+(?:e[-+]?\\d+)?';
      const head = new RegExp('^([Mm])\\s*(' + num + ')[\\s,]+(' + num + ')', 'i');
      Array.from(svg.querySelectorAll('path')).forEach((p) => {
        const d = p.getAttribute('d');
        if (!d) return;
        const subs = d.match(/[Mm][^Mm]*/g);
        if (!subs || subs.length < 2) return;
        let cx = 0, cy = 0;
        const bodies = [];
        for (const raw of subs) {
          const sd = raw.trim();
          const m = head.exec(sd);
          if (!m) return;
          const ax = m[1] === 'M' ? +m[2] : cx + +m[2];
          const ay = m[1] === 'M' ? +m[3] : cy + +m[3];
          const body = 'M' + ax + ' ' + ay + sd.slice(m[0].length);
          const closed = /[zZ]\s*$/.test(body);
          probe.setAttribute('d', body.replace(/[zZ]\s*$/, ''));
          const L = probe.getTotalLength();
          const e = L ? probe.getPointAtLength(L) : { x: ax, y: ay };
          bodies.push(body);
          if (closed) { cx = ax; cy = ay; } else { cx = e.x; cy = e.y; }
        }
        const frag = document.createDocumentFragment();
        bodies.forEach((b) => { const n = p.cloneNode(false); n.setAttribute('d', b); frag.appendChild(n); });
        p.parentNode.replaceChild(frag, p);
      });
      probe.remove();
      svg.querySelectorAll('path, ellipse, circle, rect, polyline, polygon, line').forEach((p) => {
        try {
          const b = p.getBBox();
          p.setAttribute('data-cx', b.x + b.width / 2);
          p.setAttribute('data-cy', b.y + b.height / 2);
          p.setAttribute('data-len', (p.getTotalLength ? p.getTotalLength() : 0) || 1);
        } catch (err) {}
      });
      const out = svg.outerHTML;
      pen.remove();
      this._prepCache[url] = out;
      return out;
    };
    // warm the traces + photo aspects up front so the first hover doesn't wait on a fetch
    const warm = () => {
      document.querySelectorAll('[data-trace]').forEach((r) => {
        const u = r.dataset.trace;
        if (!this._traceCache[u]) {
          fetch(u).then((x) => x.text()).then((t) => {
            this._traceCache[u] = t;
            const prep = () => this._prepare(u, t);
            if (window.requestIdleCallback) window.requestIdleCallback(prep, { timeout: 3000 }); else setTimeout(prep, 60);
          }).catch(() => {});
        }
        const ph = (window.__resources && r.dataset.leakRes && window.__resources[r.dataset.leakRes]) || r.dataset.leakImg;
        if (ph && !this._aspect[ph]) { const im = new Image(); im.onload = () => { this._aspect[ph] = im.naturalWidth / im.naturalHeight; }; im.src = ph; }
      });
    };
    if (window.requestIdleCallback) window.requestIdleCallback(warm); else setTimeout(warm, 1);
    // pre-warm project pages + their first screens: navigation then has nothing left to fetch
    if (window.__vgReturnCover) {
      const { el, href, ready } = window.__vgReturnCover;
      delete window.__vgReturnCover;
      const row = document.querySelector('a[href="' + href + '"]');
      // put the grid back exactly where it was before the tile expanded, so the shrink lands on the
      // tile rather than on wherever a fresh load happens to start
      let savedY = null;
      try {
        const v = sessionStorage.getItem('vgHomeScroll');
        if (v != null) { savedY = parseFloat(v); sessionStorage.removeItem('vgHomeScroll'); }
      } catch (e) {}
      if (savedY != null && isFinite(savedY)) {
        try { history.scrollRestoration = 'manual'; } catch (e) {}
        // smooth scrolling is on globally: it would animate this jump and the shrink would measure the
        // tile mid-flight, so it is off until the rect is taken
        const prevBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        setTimeout(() => { document.documentElement.style.scrollBehavior = prevBehavior; }, 1200);
        const settle = () => window.scrollTo(0, savedY);
        settle();
        requestAnimationFrame(settle);
        setTimeout(settle, 120);
      }
      const start = () => {
        if (row) {
          const b = row.getBoundingClientRect();
          el.style.transition = 'clip-path 0.9s cubic-bezier(0.62,0,0.2,1), opacity 0.5s ease 0.55s';
          el.style.clipPath = 'inset(' + b.top + 'px ' + (window.innerWidth - b.right) + 'px ' +
            (window.innerHeight - b.bottom) + 'px ' + b.left + 'px round 20px)';
          setTimeout(() => { el.style.opacity = '0'; }, 900);
          setTimeout(() => { el.remove(); }, 1450);
        } else {
          el.style.transition = 'opacity 0.4s ease';
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 450);
        }
      };
      // wait for the cover bitmap to decode before the shrink begins, so no frame of it is missing
      Promise.resolve(ready).then(() => setTimeout(start, 180));
    }
    const warmPages = () => {
      [['mobius.html', 'assets/images/mobius/cover.webp'], ['bitl.html', 'assets/images/bitl/p00.webp'],
       ['watchmaker.html', 'assets/images/watchmaker/cover.webp']].forEach(([page, first]) => {
        const l = document.createElement('link');
        l.rel = 'prefetch'; l.href = page; l.as = 'document';
        document.head.appendChild(l);
        // Warm AND decode the first page, then keep the element alive: the reader reuses this exact
        // <img> rather than making a fresh one, so the first open has no decode to wait on. Creating a
        // new element from the same URL still costs a decode, which is what made open #1 blank.
        const im = new Image();
        im.src = first;
        const park = () => { (window.__vgWarm || (window.__vgWarm = {}))[first] = im; };
        if (im.decode) im.decode().then(park, park); else if (im.complete) park(); else im.onload = park;
      });
    };
    if (window.requestIdleCallback) window.requestIdleCallback(warmPages, { timeout: 4000 }); else setTimeout(warmPages, 800);
    const PROJECTS = {
      '#mobius': { bg: '#f6e9d2', ink: '#131313', label: 'M\u00d6BIUS', first: 'assets/images/mobius/cover.webp',
        imgs: [{ src: 'assets/images/mobius/cover.webp', w: 1680, h: 1127 }].concat(Array.from({ length: 12 }, (_, i) => ({
          src: 'assets/images/mobius/p' + String(i).padStart(2, '0') + '.webp', w: 1680, h: i === 11 ? 1885 : 1893 }))) },
      // StrahL: 29 pages sliced from the lighting PDF with pdfslice-strahl.html, stacked flush
      '#strahl': { bg: '#f6e2c6', ink: '#131313', label: 'STRAHL', first: 'assets/images/strahl/p00.webp',
        imgs: [{ spread: {
          bg: '#f6e2c6',
          pages: [{ src: 'assets/images/strahl/p00s.webp', w: 2382, h: 1802 },
                  { src: 'assets/images/strahl/p01s.webp', w: 2382, h: 1684 }],
          mask: null,
          ring: { src: 'assets/images/strahl/ring.webp', left: 22.4, top: 21.01, w: 148.07, origin: '53.72% 46.28%' },
          products: [{ src: 'assets/images/strahl/prod-a.webp', left: 35.89, top: 18.27, w: 64.69 },
                     { src: 'assets/images/strahl/prod-b.webp', left: 25.27, top: 52.18, w: 62.47 },
                     { src: 'assets/images/strahl/prod-c.webp', left: 54.28, top: 76.25, w: 64.99 }]
        } }].concat(Array.from({ length: 27 }, (_, k) => { const i = k + 2;
          // p02 carries the tail of the printed lamp that the live overlay redraws; p03's question mark
          // and grey rule are lifted off the plate and drawn live (cleaned plates carry the 's' suffix)
          const it = { src: 'assets/images/strahl/p' + String(i).padStart(2, '0') + ([2, 3, 4, 5, 14].indexOf(i) >= 0 ? 's' : '') + '.webp',
            w: 2382, h: [4, 6, 8, 10, 11, 12].indexOf(i) >= 0 ? 1802 : 1684 };
          if (i === 3) it.draw = {
            // measured off the printed page, in per cent of the page box
            q: { left: 65.66, top: 53.62, w: 1.1335, ink: '#b81414' },
            rule: { left: 52.85, top: 56.71, w: 0.084, h: 43.29, ink: '#adacab' }
          };
          // the red rule down the Tinkering spread runs off p04 and continues at the top of p05:
          // both are lifted off the plates and drawn by the scroll, same width and ink as printed
          if (i === 4) it.draw = { rule: { left: 4.1142, top: 15.094, w: 0.2939, h: 84.906, ink: '#c40000' } };
          if (i === 5) it.draw = { rule: { left: 4.1142, top: 0, w: 0.2939, h: 27.612, ink: '#c40000' } };
          // the skyline is three depth planes in the artwork: they are lifted off the plate and pop
          // up in order, nearest first, when the band arrives on screen
          if (i === 14) it.pop = { top: 77.019, layers: [
            { src: 'assets/images/strahl/p14-l2.webp', dy: 7, z: 4, delay: 0 },
            { src: 'assets/images/strahl/p14-l1.webp', dy: 5, z: 3, delay: 0.2 },
            { src: 'assets/images/strahl/p14-l0.webp', dy: 3.5, z: 2, delay: 0.4 }
          ] };
          return it; })) },
      // pages 1-2 come from js/bitl-live.js: the same flat artwork plus the cursor glow and the
      // statement break. The strip picks up at p02.
      '#blind-watchmaker': { bg: '#eaeaea', ink: '#131313', label: 'BLIND WATCHMAKER', first: 'assets/images/watchmaker/cover.webp',
        imgs: [{ src: 'assets/images/watchmaker/cover.webp', w: 2880, h: 1620 }].concat(Array.from({ length: 12 }, (_, i) => ({
          src: 'assets/images/watchmaker/p' + String(i).padStart(2, '0') + '.webp', w: 2880, h: i === 11 ? 1622 : 1632 }))) },
      '#bitl': { bg: '#000000', ink: '#f4f4f4', label: 'BITL', first: 'assets/images/bitl/p00.webp', hero: 'bitl',
        imgs: Array.from({ length: 14 }, (_, k) => { const i = k + 2; const it = { src: 'assets/images/bitl/p' + String(i).padStart(2, '0') + '.webp' + (i === 11 ? '?v=20261019a' : ''), w: 2745,
          h: i < 7 ? 1839 : i === 7 ? 1830 : i < 15 ? 1930 : 1922 };
          // the mood-board page leaves an empty column under its first image: the caption sits there,
          // and the line that turns the argument follows the page before the re-mood board
          if (i === 2) {
            it.caption = "My first references of 90's design with a modern take were elegant, beautiful and marketable in their own way...";
            it.after = 'But I am not here to design SAFE.';
          }
          // p03 carries the re-mood board and the top of the timeline in one page: it is split so the
          // note about the new board can sit between them with room to breathe
          if (i === 3) return [{ src: 'assets/images/bitl/p03a.webp', w: 2745, h: 1460,
              body: ['Being my second year in design and a **passion project**. I knew this is the time i can play a lot more with **my designs**. I wanted to express myself as a designer and take **design decisions** to extents that would be difficult to bring in the **real world**.',
                'The challenge with this project was to do so while being **industry level** and **manufacturable**.'] },
            { src: 'assets/images/bitl/p03b.webp', w: 2745, h: 379 }];
          // p04 carries the tail of the timeline and the first sketch slide; p04-p07 hold the four
          // sketch slides, which run as one auto-playing carousel instead of four scrolled pages
          if (i === 4) return [{ src: 'assets/images/bitl/p04top.webp', w: 2745, h: 1164 },
            { sketchStory: true },
            { gap: true }];
          if (i === 5 || i === 6 || i === 7) return [];
          // p08: the final designs are rebuilt live (centred head, both sketches side by side);
          // the prototypes band below them stays as the printed slice
          if (i === 8) return [{ plate: [{ src: 'assets/images/bitl/final-a.webp', w: 1125, h: 580 },
              { src: 'assets/images/bitl/final-b.webp', w: 1125, h: 580 }],
              head: ['Final Designs', 'A sense of retro with a modern approach'] },
            // prototypes: photos from p08's foot + p09's top joined into one plate; the title and
            // sub are live, centred vertically in the black left column
            { src: 'assets/images/bitl/proto-a.webp', w: 2000, h: 1132,
              side: ['Prototypes', 'Simple flat cardboard protos to understand hand feel and sizing.'],
              frames: [['proto-a.webp', 34.8, 0, 42.25, 99.56], ['proto-b.webp', 77.9, 0, 21.8, 52.03], ['proto-c.webp', 78.2, 53.98, 21.2, 45.58]] }];
          if (i === 9) return { hatke: true };
          if (i === 10) return { src: 'assets/images/bitl/p10b.webp', w: 2000, h: 836 };
          // p12: the empty black under "WELCOME TO..." is trimmed so the reel follows closely
          if (i === 12) return { src: 'assets/images/bitl/p12c.webp', w: 2000, h: 860 };
          // p15: the photo strip stays printed; the four renders are cut out (red outline baked in),
          // rise in, and their screens play the logo reel in perspective
          if (i === 15) return [{ src: 'assets/images/bitl/p15top.webp', w: 2000, h: 300 }, { renders: true }];
          // p13: the static logo under "WELCOME TO..." becomes the logo reel with its sound
          if (i === 13) return [{ reel: 'assets/videos/bitl-logo.mp4', w: 2000, h: 820 },
            { src: 'assets/images/bitl/p13b.webp', w: 2000, h: 586 }];
          return it; }).flat() },
      // Sun Pharma dispenser: not a printed deck — a render, the brief, and the sketch/CAD sheets
      // laid on the grey paper as plates. Same expand/close as the other readers.
      '#sun-pharma': { bg: '#eaeaea', ink: '#131313', label: 'SUN PHARMA', first: 'assets/images/vending/hero.webp',
        copyInk: 'rgba(19,19,19,0.78)', strongInk: '#131313',
        imgs: [
          { src: 'assets/images/vending/hero.webp', w: 2880, h: 1226, body: [
            'Client — **Sun pharma, Laser Innovative technologies**',
            'A unique requirement for a medicine dispenser in pharmacies to reduce touch points of a consumer and easing the process of buying non prescription medicines.',
            'An instant connection and inspiration from capsules, I sketched out some forms that I believed stood out while still blending in.'] },
          { plate: [{ src: 'assets/images/vending/sketch-form1.webp', w: 900, h: 1600, cap: 'Form 1 — vending machine' },
                    { src: 'assets/images/vending/sketch-form2.webp', w: 900, h: 1600, cap: 'Form 2 — capsule inspired' }] },
          { plate: [{ src: 'assets/images/vending/cad.webp', w: 422, h: 887 }] }
        ] }
    };
    this._projects = PROJECTS;
    // the watchmaker opening statement is baked into p00: cover it and re-set it live, so the words
    // light up one by one as the reader scrolls (js/scrollwords.js)
    if (window.VG_WATCHMAKER_WORDS) PROJECTS['#blind-watchmaker'].imgs[1].words = window.VG_WATCHMAKER_WORDS;
    // the "A world for the blind" statement straddles p01/p02: both are masked and it plays live
    // between them (js/statement.js)
    if (window.vgStatement) {
      PROJECTS['#blind-watchmaker'].imgs[2].crop = [1140, 0];
      PROJECTS['#blind-watchmaker'].imgs[2].statement = true;
      PROJECTS['#blind-watchmaker'].imgs[3].crop = [1604, 28];
    }
    this._openProject = (p, onClose, insetTo) => {
      const ov = document.createElement('div');
      ov.id = 'vg-reader';
      ov.style.cssText = 'position:fixed;inset:0;z-index:8000;overflow-y:auto;overflow-x:hidden;background:' + p.bg +
        ';opacity:0;transition:opacity 0.28s ease;-webkit-overflow-scrolling:touch';
      if (p.hero === 'bitl' && window.mountBitlHero) {
        this._hero = window.mountBitlHero();
        ov.appendChild(this._hero.el);
      }
      const strip = document.createElement('div');
      strip.style.cssText = 'width:100%;line-height:0;font-size:0';
      // the four sketch slides share one frame: each slides out to the left as the next arrives from
      // the right. Autoplay pauses on hover, where the arrows appear.
      // BITL renders (p15): cut-out PNGs laid where the printed page had them. Each rises in when the
      // band arrives; the screens carry one shared, muted, looping logo reel mapped onto the glass
      // quad (render-local px: TL, TR, BR, BL) so all three play in step.
      const makeRenders = () => {
        const PW = 2000, PH = 1100, T0 = 300;
        const R = [
          { n: 1, x: 115, y: 353, w: 992, h: 477, q: [386, 95, 701, 163, 774, 306, 429, 241] },
          { n: 2, x: 1127, y: 409, w: 758, h: 421, q: [120, 9, 396, -118, 781, -6, 456, 143] },
          { n: 3, x: 192, y: 843, w: 679, h: 414 },
          { n: 4, x: 893, y: 848, w: 789, h: 435, q: [171, 19, 662, 19, 715, 214, 114, 214] }
        ];
        const sec = document.createElement('div');
        sec.style.cssText = 'position:relative;width:100%;aspect-ratio:' + PW + '/' + PH + ';background:#000;overflow:hidden;line-height:0';
        const v = document.createElement('video');
        v.src = 'assets/videos/bitl-logo.mp4'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
        v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
        const quad = (w, h, p) => {
          const [x0, y0, x1, y1, x2, y2, x3, y3] = p;
          const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
          const den = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / den, k = (dx1 * dy3 - dx3 * dy1) / den;
          const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
          return 'matrix3d(' + [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1].join(',') + ')';
        };
        const cvs = [], inners = [], figs = [];
        R.forEach((r, i) => {
          const fig = document.createElement('div');
          fig.style.cssText = 'position:absolute;left:' + (r.x / PW * 100) + '%;top:' + ((r.y - T0) / PH * 100) + '%;width:' +
            (r.w / PW * 100) + '%;aspect-ratio:' + r.w + '/' + r.h + ';opacity:0;transform:translateY(14%);' +
            'transition:opacity 0.9s ease ' + (i * 0.14) + 's,transform 1.2s cubic-bezier(0.22,1,0.36,1) ' + (i * 0.14) + 's';
          const inner = document.createElement('div');
          inner.style.cssText = 'position:absolute;left:0;top:0;width:' + r.w + 'px;height:' + r.h + 'px;transform-origin:0 0;overflow:hidden';
          if (r.q) {
            const c = document.createElement('canvas');
            c.width = 960; c.height = 540;
            c.style.cssText = 'position:absolute;left:0;top:0;width:960px;height:540px;transform-origin:0 0;transform:' + quad(960, 540, r.q) +
              ';background:#000';
            inner.appendChild(c); cvs.push(c);
          }
          const img = document.createElement('img');
          img.src = 'assets/images/bitl/render-' + r.n + '.webp'; img.alt = '';
          img.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
          // the cut-out sits under the screen: the screen glass is laid over it
          inner.insertBefore(img, inner.firstChild);
          fig.appendChild(inner); sec.appendChild(fig);
          inners.push([inner, r]); figs.push(fig);
        });
        const fit = () => inners.forEach(([el, r]) => { const s = el.parentNode.clientWidth / r.w; el.style.transform = 'scale(' + s + ')'; });
        const ro = new ResizeObserver(fit); ro.observe(sec);
        // glass layer, painted once in screen space so it takes the same perspective as the reel:
        // recess shadow along the bezel, a broad diagonal sheen, a sharp window streak and a lit top lip
        const glass = document.createElement('canvas');
        glass.width = 960; glass.height = 540;
        {
          const g = glass.getContext('2d');
          let gr = g.createLinearGradient(0, 0, 0, 90);
          gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(0, 0, 960, 90);
          gr = g.createLinearGradient(0, 0, 70, 0);
          gr.addColorStop(0, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(0, 0, 70, 540);
          gr = g.createLinearGradient(960, 0, 900, 0);
          gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(890, 0, 70, 540);
          // broad sheen: a soft lit wedge from the top-left, cut by a hard diagonal like the studio render
          g.save();
          g.beginPath(); g.moveTo(0, 0); g.lineTo(620, 0); g.lineTo(150, 540); g.lineTo(0, 540); g.closePath(); g.clip();
          gr = g.createLinearGradient(0, 0, 520, 360);
          gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(255,255,255,0.02)');
          g.fillStyle = gr; g.fillRect(0, 0, 960, 540);
          g.restore();
          // thin window streak
          g.save();
          g.beginPath(); g.moveTo(700, 0); g.lineTo(760, 0); g.lineTo(330, 540); g.lineTo(300, 540); g.closePath(); g.clip();
          gr = g.createLinearGradient(0, 0, 0, 540);
          gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0.03)');
          g.fillStyle = gr; g.fillRect(0, 0, 960, 540);
          g.restore();
          // lit lip along the top edge of the glass
          gr = g.createLinearGradient(0, 0, 960, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)');
          g.fillStyle = gr; g.fillRect(0, 0, 960, 3);
          // hot spot
          gr = g.createRadialGradient(170, 90, 0, 170, 90, 260);
          gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(0, 0, 960, 540);
        }
        let raf = 0, live = false, shown = false;
        const ctxs = cvs.map((c) => c.getContext('2d'));
        const paint = () => ctxs.forEach((x) => { x.drawImage(v, 0, 0, 960, 540); x.drawImage(glass, 0, 0); });
        // one paint per decoded video frame (not per display frame) where the browser can say when that is
        const VFC = typeof v.requestVideoFrameCallback === 'function';
        let vfcOn = false;
        const draw = () => {
          if (VFC) {
            if (vfcOn) return;
            vfcOn = true;
            v.requestVideoFrameCallback(function cb() { if (!live) { vfcOn = false; return; } paint(); v.requestVideoFrameCallback(cb); });
            return;
          }
          raf = requestAnimationFrame(draw);
          if (v.readyState >= 2) paint();
        };
        const io = new IntersectionObserver(es => es.forEach(e => {
          if (e.isIntersecting && !shown && e.intersectionRatio > 0.12) {
            shown = true; figs.forEach(f => { f.style.opacity = '1'; f.style.transform = 'none'; });
          }
          if (e.isIntersecting && !live) { live = true; v.play().catch(() => {}); raf = requestAnimationFrame(draw); }
          else if (!e.isIntersecting && live) { live = false; v.pause(); cancelAnimationFrame(raf); }
        }), { threshold: [0, 0.12, 0.5] });
        io.observe(sec);
        const reap = setInterval(() => { if (!sec.isConnected && shown !== null) { if (document.getElementById('vg-reader')) return; io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); v.pause(); v.removeAttribute('src'); v.load(); clearInterval(reap); } }, 1000);
        return sec;
      };
      const makeCarousel = (it) => {
        const root = document.createElement('div');
        const cw = it.crop ? it.crop[1] - it.crop[0] : 1;
        root.style.cssText = 'position:relative;width:100%;overflow:hidden;background:' + (it.crop ? '#fff' : '#000') +
          ';line-height:0;font-size:0;aspect-ratio:' + Math.round(it.w * cw) + '/' + it.h;
        let wrap = root, sub = null, notes = null, sheet = null, rootW = '';
        if (it.heading) {
          wrap = document.createElement('div');
          wrap.style.cssText = 'width:100%;background:#000';
          const head = document.createElement('div');
          head.style.cssText = 'display:flex;flex-direction:column;flex-direction:row;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:1.6rem 4vw;padding:24vh 4vw 14vh;box-sizing:border-box';
          const h = document.createElement('h2');
          h.textContent = it.heading;
          h.style.cssText = "margin:0;font-family:'VG Pixel','Press Start 2P',monospace;font-weight:400;color:#f3323f;" +
            'font-size:clamp(28px,4vw,76px);line-height:1.1;letter-spacing:0.02em';
          sub = document.createElement('h3');
          sub.style.cssText = "margin:0;font-family:'VG Pixel','Press Start 2P',monospace;font-weight:400;color:#131313;" +
            'font-size:clamp(20px,2.2vw,42px);line-height:1.15;letter-spacing:0.02em;transition:opacity 0.3s ease';
          notes = document.createElement('p');
          notes.style.cssText = "margin:0;max-width:900px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;" +
            'font-weight:400;font-size:clamp(15px,1.35vw,28px);line-height:1.6;letter-spacing:0.005em;' +
            'color:rgba(19,19,19,0.82);text-wrap:pretty;transition:opacity 0.3s ease';
          const tag = document.createElement('p');
          tag.textContent = 'Exploring design languages';
          tag.style.cssText = "margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:400;" +
            'font-size:clamp(15px,1.35vw,28px);line-height:1.4;letter-spacing:0.005em;color:rgba(244,244,244,0.86)';
          head.appendChild(h); head.appendChild(tag);
          // the slide's own title and notes sit on the sketch paper, above the drawings
          const paper = document.createElement('div');
          paper.style.cssText = 'display:flex;flex-direction:column;gap:1.4rem;background:#fff;padding:6vh 4vw 2vh;box-sizing:border-box';
          paper.appendChild(sub); paper.appendChild(notes);
          wrap.appendChild(head); wrap.appendChild(paper);
          // the sketch is capped so its title, notes and the buttons at its foot fit on one screen
          sheet = document.createElement('div');
          sheet.style.cssText = 'position:relative;background:#fff;padding-bottom:3vh;line-height:0';
          rootW = 'min(100%,calc(76vh * ' + (it.w * cw / it.h).toFixed(4) + '))';
          root.style.width = rootW;
          root.style.margin = '0 auto';
          sheet.appendChild(root); wrap.appendChild(sheet);
        }
        const setLabel = (k, animate) => {
          if (!sub) return;
          const L = it.labels[k], apply = () => { sub.textContent = L[0]; notes.textContent = L.slice(1).join(' '); sub.style.opacity = notes.style.opacity = '1'; };
          if (!animate) return apply();
          sub.style.opacity = notes.style.opacity = '0';
          setTimeout(apply, 300);
        };
        setLabel(0, false);
        // one sliding track instead of per-slide transforms: nothing is re-laid-out mid-move, so the
        // motion stays on the compositor. A clone of the first frame trails the last one, letting the
        // loop keep sliding forward and snap back invisibly once it lands.
        const N = it.carousel.length;
        const track = document.createElement('div');
        track.style.cssText = 'position:absolute;inset:0;display:flex;width:100%;height:100%;' +
          'will-change:transform;transform:translate3d(0,0,0);backface-visibility:hidden';
        const EASE = 'transform 0.9s cubic-bezier(0.5, 0, 0.2, 1)';
        it.carousel.concat(it.carousel[0]).forEach((src, idx) => {
          const im = document.createElement('img');
          im.src = src; im.alt = ''; im.width = it.w; im.height = it.h; im.decoding = 'async';
          if (idx > 1) im.loading = 'lazy';
          im.draggable = false;
          if (it.crop) {
            const cell = document.createElement('div');
            cell.style.cssText = 'flex:0 0 100%;width:100%;height:100%;overflow:hidden;position:relative';
            im.style.cssText = 'position:absolute;top:0;height:100%;display:block;width:' + (100 / cw).toFixed(3) +
              '%;left:' + (-it.crop[0] / cw * 100).toFixed(3) + '%';
            cell.appendChild(im); track.appendChild(cell);
          } else {
            im.style.cssText = 'flex:0 0 100%;width:100%;height:100%;display:block;object-fit:cover';
            track.appendChild(im);
          }
        });
        root.appendChild(track);
        let pos = 0, cur = 0, hovering = false, moving = false;
        const place = (p, animate) => {
          track.style.transition = animate ? EASE : 'none';
          track.style.transform = 'translate3d(' + (-p * 100) + '%,0,0)';
          if (!animate) void track.offsetWidth;
        };
        const paintDots = () => dots.forEach((d, k) => {
          d.style.background = k === cur ? '#f3323f' : dotOff;
        });
        track.addEventListener('transitionend', (e) => {
          if (e.propertyName !== 'transform') return;
          moving = false;
          if (pos === N) { pos = 0; place(0, false); }
        });
        const go = (next) => {
          if (moving) return;
          if (next === cur && !(next === 0 && pos === N)) return;
          moving = true;
          pos = next === 0 && cur === N - 1 ? N : next;
          cur = next;
          place(pos, true);
          paintDots();
          setLabel(cur, true);
        };
        // chunky pixel buttons: stepped corners, a hard 4px drop and a pixel chevron. They sit at the
        // sketch's centre and slide down to its bottom corners as the reader scrolls through it.
        const STEP = 'polygon(4px 0,calc(100% - 4px) 0,calc(100% - 4px) 4px,100% 4px,100% calc(100% - 4px),' +
          'calc(100% - 4px) calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 4px),0 calc(100% - 4px),0 4px,4px 4px)';
        const chev = [0, 1, 2, 3, 4, 3, 2, 1, 0].map((x, y) => '<rect x="' + x + '" y="' + y + '" width="2" height="1"/>').join('');
        const arrow = (side) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', side === 'left' ? 'Previous sketch' : 'Next sketch');
          // on the capped sheet the buttons sit in the white margin beside the sketch, not over it
          const at = sheet ? 'max(1.5%,calc((100% - ' + rootW + ') / 2 - 100px))' : '2.4%';
          b.style.cssText = 'position:absolute;top:50%;' + side + ':' + at + ';width:64px;height:68px;padding:0;border:0;' +
            'background:none;cursor:pointer;z-index:3;transform:translateY(-50%);line-height:0';
          const base = document.createElement('span');
          base.style.cssText = 'position:absolute;left:0;top:4px;width:64px;height:64px;background:#111;clip-path:' + STEP;
          const face = document.createElement('span');
          face.style.cssText = 'position:absolute;left:0;top:0;width:64px;height:64px;background:#111;clip-path:' + STEP +
            ';transition:transform 0.08s steps(2)';
          const fill = document.createElement('span');
          fill.style.cssText = 'position:absolute;inset:4px;background:#f4f4f4;clip-path:' + STEP +
            ';box-shadow:inset -4px -4px 0 #b9b9b9,inset 4px 4px 0 #ffffff;display:flex;align-items:center;justify-content:center';
          fill.innerHTML = '<svg viewBox="0 0 6 9" width="18" height="27" shape-rendering="crispEdges" style="fill:#111;' +
            (side === 'left' ? 'transform:scaleX(-1);' : '') + 'margin-' + (side === 'left' ? 'right' : 'left') + ':3px">' + chev + '</svg>';
          face.appendChild(fill);
          b.appendChild(base); b.appendChild(face);
          const paint = (on) => {
            fill.style.background = on ? '#f3323f' : '#f4f4f4';
            fill.style.boxShadow = on ? 'inset -4px -4px 0 #a81f29,inset 4px 4px 0 #ff6b74' : 'inset -4px -4px 0 #b9b9b9,inset 4px 4px 0 #ffffff';
            fill.firstChild.style.fill = on ? '#fff' : '#111';
          };
          b.addEventListener('mouseenter', () => paint(true));
          b.addEventListener('mouseleave', () => { paint(false); face.style.transform = ''; });
          b.addEventListener('pointerdown', () => { face.style.transform = 'translateY(4px)'; });
          b.addEventListener('pointerup', () => { face.style.transform = ''; });
          b.addEventListener('click', (e) => { e.preventDefault(); go((cur + (side === 'left' ? -1 : 1) + N) % N); });
          (sheet || root).appendChild(b);
          return b;
        };
        const prev = arrow('left'), next = arrow('right');
        const rail = document.createElement('div');
        rail.style.cssText = 'position:absolute;left:0;right:0;bottom:3.2%;display:flex;justify-content:center;' +
          'gap:10px;z-index:3';
        const dotOff = it.crop ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.32)';
        const dots = it.carousel.map((_, k) => {
          const d = document.createElement('button');
          d.type = 'button'; d.setAttribute('aria-label', 'Sketch ' + (k + 1));
          d.style.cssText = 'width:9px;height:9px;padding:0;border:0;border-radius:50%;cursor:pointer;background:' +
            (k ? dotOff : '#f3323f');
          d.addEventListener('click', () => go(k));
          rail.appendChild(d);
          return d;
        });
        root.appendChild(rail);
        // no autoplay: the reader steps through with the buttons. Their drop is scrubbed by the scroll.
        let bq = false;
        const drop = () => {
          bq = false;
          const r = root.getBoundingClientRect();
          if (!r.height) return;
          const t = Math.max(0, Math.min(1, (innerHeight * 0.75 - r.top) / (r.height * 0.6)));
          const e = t * t * (3 - 2 * t);
          const y = (50 + 50 * e).toFixed(2);
          [prev, next].forEach((b) => { b.style.top = 'calc(' + y + '% - ' + (e * 96).toFixed(1) + 'px)'; b.style.transform = 'translateY(' + (-50 * (1 - e)).toFixed(1) + '%)'; });
        };
        const onDrop = () => { if (!bq) { bq = true; requestAnimationFrame(drop); } };
        ov.addEventListener('scroll', onDrop, { passive: true });
        addEventListener('resize', onDrop);
        requestAnimationFrame(drop);
        return wrap;
      };


      // "Kuch hatke": one pinned, scroll-driven chapter on black. The title rises into a header, the
      // problem and the BUT play in turn, the everyday objects pop in, the camera settles on the Orbit
      // tub, and the last screen frames the cardboard tests around the CAD grip.
      const makeHatke = () => {
        const B = 'assets/images/bitl/';
        const PIX = "font-family:'VG Pixel','Press Start 2P',monospace;font-weight:400;";
        const MONO = "font-family:'Courier New',ui-monospace,monospace;";
        const N = 8;
        const mk = (tag, css, txt) => { const e = document.createElement(tag); e.style.cssText = css; if (txt) e.textContent = txt; return e; };
        const outer = mk('div', 'position:relative;width:100%;background:#000');
        const pin = mk('div', 'position:sticky;top:0;height:100vh;overflow:hidden;background:#000;line-height:normal');
        outer.appendChild(pin);
        const C = 'position:absolute;left:50%;top:50%;width:min(84vw,1100px);display:flex;flex-direction:column;align-items:center;' +
          'gap:2.2rem;text-align:center;will-change:transform,opacity';
        const title = mk('h2', 'position:absolute;left:50%;top:50%;margin:0;white-space:nowrap;' + PIX + 'color:#f3323f;' +
          'font-size:clamp(40px,7vw,132px);line-height:1;letter-spacing:0.02em;transform-origin:50% 0;will-change:transform', 'Kuch hatke');
        const sub0 = mk('p', 'position:absolute;left:50%;top:50%;margin:0;' + MONO + 'color:#f4f4f4;font-size:clamp(16px,1.6vw,30px);white-space:nowrap', 'something different');
        const b1 = mk('div', C);
        const wtd = mk('h3', 'margin:0;' + PIX + 'color:#f4f4f4;font-size:clamp(28px,4vw,76px);line-height:1.1;letter-spacing:0.02em', 'WHAT TO DO...........');
        b1.appendChild(mk('p', 'margin:0;max-width:52ch;' + MONO + 'color:#f4f4f4;font-size:clamp(16px,1.6vw,30px);line-height:1.4;text-wrap:balance',
          'Since my design included an angled position. It was now very important to test the hand grips and not take existing ergonomic data, as they might not fit my new hand position'));
        const b2 = mk('div', C);
        const but = mk('div', "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;color:#f3323f;font-size:clamp(64px,10vw,190px);line-height:0.9;letter-spacing:0.01em", 'BUT');
        but.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0.12, offset: 0.5 }, { opacity: 0.12, offset: 0.62 }, { opacity: 1, offset: 0.67 }, { opacity: 1 }],
          { duration: 1100, iterations: Infinity });
        b2.appendChild(but);
        b2.appendChild(mk('p', 'margin:0;' + MONO + 'color:#f4f4f4;font-size:clamp(18px,2vw,38px);line-height:1.3', 'I had no access to a 3D printer.'));
        b2.appendChild(wtd);
        const l3 = mk('p', 'position:absolute;left:50%;top:21vh;width:90vw;margin:0;text-align:center;' + MONO + 'color:#f4f4f4;' +
          'font-size:clamp(16px,1.6vw,30px);line-height:1.35;text-wrap:balance', 'So I started looking around me for the ideal grip.');
        const row = mk('div', 'position:absolute;left:0;right:0;top:30vh;bottom:9vh;display:flex;align-items:flex-end;justify-content:center;' +
          'gap:6vw;will-change:transform');
        const OBJ = [['obj-dove.webp', 46, 'Dove shampoo bottle'], ['obj-dispenser.webp', 42, 'Soap dispenser'],
          ['obj-bisleri.webp', 34, 'Bisleri bottle'], ['obj-orbit.webp', 36, 'Orbit gum tub']];
        const objs = OBJ.map(([src, h, alt], j) => {
          const w = mk('div', 'position:relative;height:' + h + 'vh;transform:scale(0) translateY(20%);opacity:0;transform-origin:50% 100%;' +
            'transition:transform 0.7s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease,filter 0.6s ease');
          const im = mk('img', 'display:block;height:100%;width:auto');
          im.src = B + src; im.alt = alt; im.decoding = 'async';
          im.addEventListener('load', () => { layout(); onS(); });
          w.appendChild(im); row.appendChild(w);
          return w;
        });
        const orbit = objs[3];
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        ring.setAttribute('style', 'position:absolute;left:-7%;top:-4%;width:114%;height:108%;overflow:visible;pointer-events:none');
        ring.innerHTML = '<rect fill="none" stroke="#f3323f" stroke-width="3" stroke-linecap="round"/>';
        orbit.appendChild(ring);
        const ringR = ring.firstChild;
        // drawn in real pixels so the dash length is the true perimeter (no stretched viewBox)
        let ringW = 0, ringL = 1;
        const sizeRing = () => {
          const w = ring.clientWidth, h = ring.clientHeight;
          if (!w || w === ringW) return;
          ringW = w;
          ring.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
          const r = Math.min(w, h) * 0.22;
          ['x', 'y'].forEach((a) => ringR.setAttribute(a, '2'));
          ringR.setAttribute('width', w - 4); ringR.setAttribute('height', h - 4);
          ringR.setAttribute('rx', r); ringR.setAttribute('ry', r);
          ringL = ringR.getTotalLength ? ringR.getTotalLength() : 2 * (w + h);
          ringR.setAttribute('stroke-dasharray', ringL + ' ' + ringL);
        };
        const aha = mk('div', 'position:absolute;left:8vw;top:50%;display:flex;flex-direction:column;gap:1.6rem;will-change:transform,opacity');
        aha.appendChild(mk('div', PIX + 'color:#f3323f;font-size:clamp(48px,8vw,150px);line-height:1;letter-spacing:0.02em', 'ahaaaa.'));
        aha.appendChild(mk('p', 'margin:0;' + MONO + 'color:#f4f4f4;font-size:clamp(18px,2vw,38px);line-height:1.3', 'That feels right.'));
        const fin = mk('div', 'position:absolute;inset:0;pointer-events:none');
        const cadBox = mk('div', 'position:absolute;right:5vw;top:50%;width:min(38vw,74vh);display:flex;flex-direction:column;gap:4vh;will-change:transform,opacity');
        const cad = mk('img', 'display:block;width:100%;height:auto;' +
          '-webkit-mask-image:linear-gradient(to bottom,transparent,#000 20%),linear-gradient(to left,transparent,#000 20%),linear-gradient(to top,transparent,#000 5%);-webkit-mask-composite:source-in;' +
          'mask-image:linear-gradient(to bottom,transparent,#000 20%),linear-gradient(to left,transparent,#000 20%),linear-gradient(to top,transparent,#000 5%);mask-composite:intersect');
        cad.src = B + 'hatke-cad-cut.webp'; cad.alt = 'CAD render of the grip'; cad.decoding = 'async';
        // cardboard tests gathered on the left: the tall hand shot beside the two table shots
        const grid = mk('div', 'position:absolute;left:4vw;top:50%;width:min(44vw,92vh);height:min(78vh,40vw);display:grid;' +
          'grid-template-columns:0.72fr 1fr;grid-template-rows:1fr 1fr;gap:12px;will-change:transform,opacity');
        const CORN = [['hatke-3.webp', 'grid-row:1 / span 2', 'Holding the Orbit grip'],
          ['hatke-1.webp', '', 'Cardboard frame on Orbit tubs'],
          ['hatke-2.webp', '', 'Cardboard frame standing on Orbit tubs']];
        const corners = CORN.map(([src, pos, alt]) => {
          const im = mk('img', pos + ';display:block;width:100%;height:100%;object-fit:cover;min-height:0;will-change:transform,opacity');
          im.src = B + src; im.alt = alt; im.decoding = 'async'; im.loading = 'lazy';
          grid.appendChild(im);
          return { im };
        });
        fin.appendChild(grid);
        cadBox.appendChild(cad);
        cadBox.appendChild(mk('p', 'margin:0 0 0 6%;max-width:40ch;' + MONO + 'color:#f4f4f4;font-size:clamp(15px,1.3vw,24px);line-height:1.5;text-wrap:pretty',
          "The Orbit's ellipse felt like the perfect shape contour in the position, which I quickly tested and then replicated on the inner side of my design."));
        fin.appendChild(cadBox);
        [row, b1, b2, l3, aha, sub0, title, fin].forEach((e) => pin.appendChild(e));

        const cl = (v) => Math.max(0, Math.min(1, v));
        const ease = (t) => t * t * (3 - 2 * t);
        const seg = (p, a, b) => ease(cl((p - a) / (b - a)));
        let stepPx = 1, popped = -1, tH = 0, OX = 0, OY = 0, RW = 0, RH = 0, lastZ = -1;
        // measured once per resize / image load: reading them per scroll frame after the writes forced a layout every frame
        const layout = () => {
          stepPx = Math.round(innerHeight * 0.8); outer.style.height = (innerHeight + N * stepPx) + 'px';
          tH = title.offsetHeight; OX = orbit.offsetLeft + orbit.offsetWidth / 2; OY = orbit.offsetTop + orbit.offsetHeight / 2;
          RW = row.clientWidth; RH = row.clientHeight; ringW = 0; sizeRing();
        };
        const frame = () => {
          q = false;
          const r = outer.getBoundingClientRect();
          if (!r.height || r.bottom < -50 || r.top > innerHeight + 50) return;
          const p = Math.max(0, -r.top) / stepPx;
          // title: centre -> header
          const up = seg(p, 0.3, 1.0), vh = innerHeight;
          title.style.transform = 'translate(-50%,' + ((1 - up) * (-tH / 2 - vh * 0.03) + up * (-vh * 0.5 + vh * 0.07)).toFixed(1) + 'px) scale(' + (1 - up * 0.45).toFixed(3) + ')';
          title.style.opacity = String(1 - seg(p, 6.4, 6.8));
          sub0.style.transform = 'translate(-50%,' + (tH / 2 + vh * 0.02 - up * 40).toFixed(1) + 'px)';
          sub0.style.opacity = String(1 - seg(p, 0.3, 0.6));
          const in1 = seg(p, 0.7, 1.0), out1 = seg(p, 1.6, 1.9);
          b1.style.opacity = String(in1 * (1 - out1));
          b1.style.transform = 'translate(-50%,calc(-50% + ' + ((1 - in1) * 40 - out1 * 60).toFixed(1) + 'px))';
          const in2 = seg(p, 1.8, 2.1), out2 = seg(p, 2.7, 3.1);
          b2.style.opacity = String(in2 * (1 - out2));
          b2.style.transform = 'translate(calc(-50% - ' + (out2 * 70).toFixed(2) + 'vw),-50%) scale(' + (1.25 - in2 * 0.25).toFixed(3) + ')';
          const in3 = seg(p, 2.9, 3.2), zoom = seg(p, 4.4, 5.4), gone = seg(p, 6.6, 7.0);
          l3.style.opacity = String(in3 * (1 - zoom));
          l3.style.transform = 'translate(-50%,' + ((1 - in3) * 24).toFixed(1) + 'px)';
          // objects pop one by one; reversible
          // the four arrive together on the first scroll, a beat apart
          const k = p < 3.05 ? -1 : 3;
          if (k !== popped) {
            popped = k;
            objs.forEach((o, j) => {
              o.style.transitionDelay = k >= 0 ? (j * 0.14) + 's' : '0s';
              o.style.opacity = j <= k ? '1' : '0'; o.style.transform = j <= k ? 'scale(1)' : 'scale(0) translateY(20%)';
            });
          }
          if (zoom !== lastZ) { lastZ = zoom; const fv = zoom > 0.0005 ? 'brightness(' + (1 - zoom).toFixed(3) + ') blur(' + (zoom * 4).toFixed(2) + 'px)' : ''; objs.forEach((o, j) => { if (j < 3) o.style.filter = fv; }); }
          // soft zoom onto the Orbit tub
          const ox = OX, oy = OY, W = RW, s = 1 + zoom * 0.45;
          row.style.transformOrigin = ox + 'px ' + oy + 'px';
          row.style.transform = 'translate(' + (zoom * (W * 0.5 - ox)).toFixed(1) + 'px,' + (zoom * (RH * 0.5 - oy + vh * 0.04)).toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
          row.style.opacity = String(1 - gone);
          const dr = seg(p, 4.4, 5.4);
          ringR.style.opacity = dr > 0.001 ? '1' : '0';
          ringR.setAttribute('stroke-dashoffset', ((1 - dr) * ringL).toFixed(1));
          const ah = seg(p, 4.7, 5.4);
          aha.style.opacity = String(ah * (1 - gone));
          aha.style.transform = 'translateY(calc(-50% + ' + ((1 - ah) * 30).toFixed(1) + 'px))';
          // last screen: cardboard tests slide in from the left, the CAD grip from the right
          const f = seg(p, 6.8, 7.5);
          corners.forEach((c, j) => {
            const t = seg(p, 6.7 + j * 0.1, 7.3 + j * 0.1);
            c.im.style.opacity = String(t);
            c.im.style.transform = 'translateX(' + (-(1 - t) * 40).toFixed(2) + 'vw)';
          });
          grid.style.transform = 'translateY(-50%)';
          cadBox.style.opacity = String(f);
          cadBox.style.transform = 'translate(' + ((1 - f) * 30).toFixed(2) + 'vw,-50%)';
        };
        let q = false;
        const onS = () => { if (!q) { q = true; requestAnimationFrame(frame); } };
        ov.addEventListener('scroll', onS, { passive: true });
        addEventListener('resize', () => { layout(); onS(); });
        requestAnimationFrame(() => { layout(); frame(); });
        if (document.fonts) document.fonts.ready.then(() => { layout(); onS(); });
        return outer;
      };

      // BitL concept sketches as one pinned, scroll-driven sequence: each sheet arrives whole, the
      // camera then zooms onto every design on it in turn before the next sheet slides in. After the
      // second sheet a red ITERATIONS card holds the centre, is pushed up by the next scroll, and the
      // iteration sheets follow. Geometry is in source pixels of the 2000x1126 sketch exports.
      const makeSketchStory = () => {
        const SW = 2000, SH = 1126, CX0 = 504, CX1 = 1988;
        const R = (CX1 - CX0) / SH;
        const B = 'assets/images/bitl/';
        const PIX = "font-family:'VG Pixel','Press Start 2P',monospace;font-weight:400;";
        const SANS = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:400;";
        const PAGES = [
          { src: B + 'sketch1.webp', label: ['Bionic forms', 'Unique console, callback to futurism. Bold design while being similar to console designs.'],
            views: [null, [570, 370, 1270, 740], [1320, 170, 1600, 490], [1340, 750, 2000, 1110]] },
          { src: B + 'sketch2.webp', label: ['Space tech', 'Space tech & aviation design inspired. fits well with the analog retro vibe.'],
            views: [null, [580, 420, 1280, 990], [1460, 110, 2000, 950]] },
          { title: 'Feedback' },
          // notes: [quote, anchor x/y in % of the sketch], left to right so the leaders never cross
          // three steps on the same view so the feedback holds for longer before the next card
          { views: [null, null, null], feedback: [
            [B + 'selected-spacetech.webp', 'Space tech', [
              ['\u201CFeels more comfortable as well.\u201D', 9, 62],
              ['\u201CScreen to body ratio is too off\u201D', 46, 52],
              ['\u201CFeels more retro\u201D', 72, 8]]],
            [B + 'selected-bionic.webp', 'Bionic forms', [
              ['\u201CMore apocalyptic\u201D', 9, 48],
              ['\u201CLooks insanely cool, like flesh being torn\u201D', 66, 58],
              ['\u201CLooks like a Doom console\u201D', 88, 72]]]] },
          { title: 'Iterations' },
          { iter: { src: B + 'sketch3.webp', sel: B + 'selected-bionic.webp', alt: 'Selected bionic forms design', cols: 3,
            cuts: [[695, 60, 1035, 250], [1100, 60, 1440, 250], [1520, 60, 1865, 250], [690, 330, 1030, 525], [1100, 330, 1440, 525], [1520, 330, 1865, 525]] } },
          { iter: { src: B + 'sketch4.webp', sel: B + 'selected-spacetech.webp', alt: 'Selected space tech design', cols: 2,
            cuts: [[590, 85, 1195, 385], [1295, 85, 1900, 385], [585, 410, 1185, 715], [1290, 410, 1890, 715]] } }
        ];
        const toView = (v) => {
          if (!v) return { s: 1, a: 0, b: 0 };
          const fx0 = (v[0] - CX0) / (CX1 - CX0), fx1 = (v[2] - CX0) / (CX1 - CX0), fy0 = v[1] / SH, fy1 = v[3] / SH;
          // a gentle push toward the design rather than a full close-up, kept inside the sheet's edges
          const full = Math.max(1, Math.min(1 / (fx1 - fx0), 1 / (fy1 - fy0)) * 0.9);
          const sc = Math.min(1.45, 1 + (full - 1) * 0.35);
          const cl = (v) => Math.max((1 - sc) * 100, Math.min(0, v));
          return { s: sc, a: cl((0.5 - (fx0 + fx1) / 2 * sc) * 100), b: cl((0.5 - (fy0 + fy1) / 2 * sc) * 100) };
        };
        const steps = [];
        PAGES.forEach((pg, i) => (pg.views || [null]).forEach((v) => steps.push({ page: i, view: toView(v), label: pg.label || null })));
        const S = steps.length;

        const wrap = document.createElement('div');
        wrap.style.cssText = 'width:100%;background:#000;line-height:normal';
        const head = document.createElement('div');
        head.style.cssText = 'display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:1.6rem 4vw;' +
          'padding:24vh 4vw 14vh;box-sizing:border-box';
        const h = document.createElement('h2');
        h.textContent = 'Conceptualisation';
        h.style.cssText = 'margin:0;' + PIX + 'color:#f3323f;font-size:clamp(28px,4vw,76px);line-height:1.1;letter-spacing:0.02em';
        const tag = document.createElement('p');
        tag.textContent = 'Exploring design languages';
        tag.style.cssText = 'margin:0;' + SANS + 'font-size:clamp(15px,1.35vw,28px);line-height:1.4;color:rgba(244,244,244,0.86)';
        head.appendChild(h); head.appendChild(tag); wrap.appendChild(head);

        const outer = document.createElement('div');
        outer.style.cssText = 'position:relative;width:100%;background:#fff';
        const pin = document.createElement('div');
        pin.style.cssText = 'position:sticky;top:0;height:100vh;display:flex;flex-direction:column;background:#fff;overflow:hidden';
        outer.appendChild(pin); wrap.appendChild(outer);

        const paper = document.createElement('div');
        paper.style.cssText = 'display:flex;flex-direction:column;gap:1.1rem;padding:9vh 4vw 2.5vh;box-sizing:border-box;' +
          'min-height:calc(9vh + 2.5vh + 6.2rem);transition:opacity 0.3s ease';
        const sub = document.createElement('h3');
        sub.style.cssText = 'margin:0;' + PIX + 'color:#131313;font-size:clamp(20px,2.2vw,42px);line-height:1.15;letter-spacing:0.02em';
        const notes = document.createElement('p');
        notes.style.cssText = 'margin:0;max-width:900px;' + SANS + 'font-size:clamp(15px,1.35vw,28px);line-height:1.5;' +
          'color:rgba(19,19,19,0.82);text-wrap:pretty';
        paper.appendChild(sub); paper.appendChild(notes); pin.appendChild(paper);

        // ITERATIONS lands in the middle of the sheet, then rises into the heading slot and stays there
        // each title card: lands centred, rises into the heading slot, and fades as the next title arrives
        const TIs = PAGES.map((pg, i) => (pg.title ? i : -1)).filter((i) => i >= 0);
        const ttls = TIs.map((ti) => {
          const el = document.createElement('div');
          el.textContent = PAGES[ti].title;
          el.style.cssText = 'position:absolute;left:0;top:0;z-index:4;pointer-events:none;white-space:nowrap;opacity:0;' +
            'transform-origin:0 0;' + PIX + 'color:#f3323f;font-size:clamp(44px,7vw,150px);line-height:1;letter-spacing:0.03em';
          pin.appendChild(el);
          return el;
        });
        const box = document.createElement('div');
        box.style.cssText = 'position:relative;flex:1;min-height:0;display:flex;justify-content:center;align-items:flex-start;padding-bottom:3vh';
        const stage = document.createElement('div');
        stage.style.cssText = 'position:relative;overflow:hidden;background:#fff;line-height:0;font-size:0';
        box.appendChild(stage); pin.appendChild(box);

        const cropImg = (src, x0, y0, x1, y1) => {
          const c = document.createElement('div');
          c.style.cssText = 'position:relative;overflow:hidden;width:100%;aspect-ratio:' + (x1 - x0) + '/' + (y1 - y0);
          const im = document.createElement('img');
          im.src = src; im.alt = ''; im.decoding = 'async'; im.draggable = false;
          im.style.cssText = 'position:absolute;display:block;height:auto;max-width:none;width:' + (SW / (x1 - x0) * 100).toFixed(3) +
            '%;left:' + (-x0 / (x1 - x0) * 100).toFixed(3) + '%;top:' + (-y0 / (y1 - y0) * 100).toFixed(3) + '%';
          c.appendChild(im);
          return c;
        };
        const fbInk = [], fbRoutes = [];
        let fbOn = false;
        const plates = PAGES.map((pg) => {
          const pl = document.createElement('div');
          pl.style.cssText = 'position:absolute;inset:0;visibility:hidden;will-change:transform';
          const cam = document.createElement('div');
          cam.style.cssText = 'position:absolute;inset:0;transform-origin:0 0';
          if (pg.src && pg.crop) {
            // iteration sheet: top row pair only, set as large as the stage allows
            cam.style.display = 'flex'; cam.style.alignItems = 'center'; cam.style.justifyContent = 'center';
            cam.style.padding = '0 1%'; cam.style.boxSizing = 'border-box';
            cam.appendChild(cropImg(pg.src, pg.crop[0], pg.crop[1], pg.crop[2], pg.crop[3]));
          } else if (pg.src) {
            cam.appendChild(cropImg(pg.src, CX0, 0, CX1, SH));
          } else if (pg.feedback) {
            cam.style.display = 'flex'; cam.style.alignItems = 'center'; cam.style.justifyContent = 'center';
            cam.style.gap = '12%'; cam.style.padding = '0 9%'; cam.style.boxSizing = 'border-box';
            // quotes sit in normal flow above each sketch; the leaders are measured from the laid-out
            // boxes, so nothing can overlap the sketch or its caption at any size
            const NS = 'http://www.w3.org/2000/svg';
            pg.feedback.forEach(([src, name, quotes]) => {
              const fig = document.createElement('div');
              fig.style.cssText = 'position:relative;flex:1;min-width:0;display:flex;flex-direction:column;align-items:stretch;gap:1.4rem;line-height:normal';
              const row = document.createElement('div');
              row.style.cssText = 'display:grid;grid-template-columns:repeat(' + quotes.length + ',minmax(0,1fr));gap:4%;align-items:end;margin-bottom:6%';
              const shot = document.createElement('div');
              shot.style.cssText = 'position:relative;width:100%';
              const im = document.createElement('img');
              im.src = src; im.alt = name + ' selected design'; im.decoding = 'async';
              im.style.cssText = 'display:block;width:100%;height:auto';
              shot.appendChild(im);
              const svg = document.createElementNS(NS, 'svg');
              svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none';
              const leaders = quotes.map(([q, ax, ay], qi) => {
                const t = document.createElement('div');
                t.textContent = q;
                t.style.cssText = "font-family:'Architects Daughter','Segoe Print','Bradley Hand',cursive;font-size:clamp(12px,1.05vw,20px);" +
                  'line-height:1.25;color:#c8242f;text-align:center;text-wrap:balance;opacity:0;transition:opacity 0.5s ease ' + (0.1 + qi * 0.45).toFixed(2) + 's';
                // the middle quote sits a step higher so neighbours never read as one line
                if (qi === 1) t.style.marginBottom = '1.2em';
                row.appendChild(t);
                fbInk.push({ on: () => { t.style.opacity = '1'; }, off: () => { t.style.opacity = '0'; } });
                const mk = (dur, delay) => {
                  const p = document.createElementNS(NS, 'path');
                  p.setAttribute('pathLength', '1'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#c8242f');
                  p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
                  p.style.cssText = 'stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset ' + dur + 's ease ' + delay.toFixed(2) + 's';
                  svg.appendChild(p);
                  fbInk.push({ on: () => { p.style.strokeDashoffset = '0'; }, off: () => { p.style.strokeDashoffset = '1'; } });
                  return p;
                };
                return { t, ax, ay, line: mk(0.9, 0.25 + qi * 0.45), bend: qi % 2 ? -1 : 1 };
              });
              // plain leaders that stop just short of the drawing: the first inked pixel in the anchor's
              // column is found once from the image itself, so the line meets the outline from above
              let edge = null;
              const scan = () => {
                if (!im.naturalWidth) return;
                const cw = 400, ch = Math.round(400 * im.naturalHeight / im.naturalWidth);
                const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
                const g = cv.getContext('2d'); g.drawImage(im, 0, 0, cw, ch);
                let px; try { px = g.getImageData(0, 0, cw, ch).data; } catch (err) { return; }
                edge = leaders.map((o) => {
                  const x = Math.min(cw - 1, Math.round(cw * o.ax / 100));
                  for (let y = 0; y < ch; y++) {
                    for (let dx = -2; dx <= 2; dx++) {
                      const i = (y * cw + Math.max(0, Math.min(cw - 1, x + dx))) * 4;
                      if (px[i] + px[i + 1] + px[i + 2] < 480) return y / ch * 100;
                    }
                  }
                  return o.ay;
                });
              };
              // geometry in the figure's own (unscaled) layout pixels
              const route = () => {
                if (!edge) scan();
                const fw = fig.offsetWidth, fh = fig.offsetHeight;
                if (!fw) return;
                svg.setAttribute('viewBox', '0 0 ' + fw + ' ' + fh);
                leaders.forEach((o, li) => {
                  const sx = o.t.offsetLeft + o.t.offsetWidth / 2, sy = o.t.offsetTop + o.t.offsetHeight + 4;
                  const top = edge ? edge[li] : 0;
                  const ex = shot.offsetLeft + shot.offsetWidth * o.ax / 100, ey = shot.offsetTop + shot.offsetHeight * top / 100 - 8;
                  const cx = (sx + ex) / 2 + o.bend * fw * 0.06, cy = (sy + ey) / 2 - fw * 0.02;
                  o.line.setAttribute('d', 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1));
                });
              };
              fbRoutes.push(route);
              im.addEventListener('load', route);
              const cap = document.createElement('div');
              cap.textContent = name;
              cap.style.cssText = 'align-self:center;' + PIX + 'color:#131313;font-size:clamp(18px,1.8vw,36px);line-height:1.15;letter-spacing:0.02em';
              fig.appendChild(row); fig.appendChild(shot); fig.appendChild(cap); fig.appendChild(svg); cam.appendChild(fig);
            });
          } else if (pg.iter) {
            cam.style.display = 'flex'; cam.style.alignItems = 'center'; cam.style.gap = '2.5%'; cam.style.padding = '0 0.5%';
            cam.style.boxSizing = 'border-box';
            const left = document.createElement('div');
            left.style.cssText = 'flex:0 0 21%;display:flex;flex-direction:column;gap:1.4rem;line-height:normal';
            const lab = document.createElement('div');
            lab.textContent = 'Selected design';
            lab.style.cssText = PIX + 'color:#f3323f;font-size:clamp(16px,1.6vw,32px);line-height:1.15;letter-spacing:0.02em';
            const sel = document.createElement('img');
            sel.src = pg.iter.sel; sel.alt = pg.iter.alt; sel.decoding = 'async';
            sel.style.cssText = 'display:block;width:100%;height:auto';
            left.appendChild(lab); left.appendChild(sel);
            const right = document.createElement('div');
            // each iteration cut out on its own and packed tight, so they read as large as the column allows
            right.style.cssText = 'flex:1;min-width:0;display:grid;grid-template-columns:repeat(' + pg.iter.cols + ',minmax(0,1fr));gap:3vh 1.2%;align-items:center';
            pg.iter.cuts.forEach((r) => right.appendChild(cropImg(pg.iter.src, r[0], r[1], r[2], r[3])));
            cam.appendChild(left); cam.appendChild(right);
          }
          pl.appendChild(cam); stage.appendChild(pl);
          return { pl, cam };
        });

        // pixel buttons beside the stage: they step the scroll to the previous / next shot
        const STEP = 'polygon(4px 0,calc(100% - 4px) 0,calc(100% - 4px) 4px,100% 4px,100% calc(100% - 4px),' +
          'calc(100% - 4px) calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 4px),0 calc(100% - 4px),0 4px,4px 4px)';
        const chev = [0, 1, 2, 3, 4, 3, 2, 1, 0].map((x, y) => '<rect x="' + x + '" y="' + y + '" width="2" height="1"/>').join('');
        let stepPx = 1, p = 0;
        const goStep = (k) => {
          k = Math.max(0, Math.min(S - 1, k));
          ov.scrollTo({ top: ov.scrollTop + outer.getBoundingClientRect().top + k * stepPx + 2, behavior: 'smooth' });
        };
        const arrow = (side) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', side === 'left' ? 'Previous sketch' : 'Next sketch');
          b.style.cssText = 'position:absolute;top:50%;width:64px;height:68px;padding:0;border:0;background:none;cursor:pointer;' +
            'z-index:3;transform:translateY(-50%);line-height:0';
          const base = document.createElement('span');
          base.style.cssText = 'position:absolute;left:0;top:4px;width:64px;height:64px;background:#111;clip-path:' + STEP;
          const face = document.createElement('span');
          face.style.cssText = 'position:absolute;left:0;top:0;width:64px;height:64px;background:#111;clip-path:' + STEP +
            ';transition:transform 0.08s steps(2)';
          const fill = document.createElement('span');
          fill.style.cssText = 'position:absolute;inset:4px;background:#f4f4f4;clip-path:' + STEP +
            ';box-shadow:inset -4px -4px 0 #b9b9b9,inset 4px 4px 0 #ffffff;display:flex;align-items:center;justify-content:center';
          fill.innerHTML = '<svg viewBox="0 0 6 9" width="18" height="27" shape-rendering="crispEdges" style="fill:#111;' +
            (side === 'left' ? 'transform:scaleX(-1);' : '') + 'margin-' + (side === 'left' ? 'right' : 'left') + ':3px">' + chev + '</svg>';
          face.appendChild(fill);
          b.appendChild(base); b.appendChild(face);
          const paint = (on) => {
            fill.style.background = on ? '#f3323f' : '#f4f4f4';
            fill.style.boxShadow = on ? 'inset -4px -4px 0 #a81f29,inset 4px 4px 0 #ff6b74' : 'inset -4px -4px 0 #b9b9b9,inset 4px 4px 0 #ffffff';
            fill.firstChild.style.fill = on ? '#fff' : '#111';
          };
          b.addEventListener('mouseenter', () => paint(true));
          b.addEventListener('mouseleave', () => { paint(false); face.style.transform = ''; });
          b.addEventListener('pointerdown', () => { face.style.transform = 'translateY(4px)'; });
          b.addEventListener('pointerup', () => { face.style.transform = ''; });
          b.addEventListener('click', (e) => { e.preventDefault(); goStep(Math.round(p) + (side === 'left' ? -1 : 1)); });
          box.appendChild(b);
          return b;
        };
        const prev = arrow('left'), next = arrow('right');

        let W = 0;
        const layout = () => {
          const vh = innerHeight;
          stepPx = Math.round(vh * 0.7);
          outer.style.height = (vh + (S - 1) * stepPx) + 'px';
          const bw = box.clientWidth, bh = box.clientHeight - vh * 0.03;
          W = Math.max(200, Math.min(bw - 260, bh * R));
          stage.style.width = W + 'px'; stage.style.height = (W / R) + 'px';
          const at = 'max(1.5%,calc(50% - ' + (W / 2) + 'px - 100px))';
          prev.style.left = at; next.style.right = at;
          measureSO(); TM = []; ttls.forEach((_, j) => measureT(j));
        };
        let TM = [], SO = { x: 0, y: 0, w: 0, h: 0 };
        const measureSO = () => { const pr = pin.getBoundingClientRect(), sr = stage.getBoundingClientRect(); SO = { x: sr.left - pr.left, y: sr.top - pr.top, w: sr.width, h: sr.height }; };
        const measureT = (j) => { const t = ttls[j]; return (TM[j] = { w: t.offsetWidth, h: t.offsetHeight,
          ts: Math.min(1, (parseFloat(getComputedStyle(sub).fontSize) * 1.9) / parseFloat(getComputedStyle(t).fontSize)) }); };
        const lerp = (a, b, t) => a + (b - a) * t;
        const ease = (t) => t * t * (3 - 2 * t);
        let shown = '';
        const setLabel = (L) => {
          const key = L ? L.join('|') : '';
          if (key === shown) return;
          shown = key;
          paper.style.opacity = '0';
          clearTimeout(setLabel.t);
          setLabel.t = setTimeout(() => {
            if (L) { sub.textContent = L[0]; notes.textContent = L[1] || ''; paper.style.opacity = '1'; requestAnimationFrame(() => { measureSO(); onS(); }); }
          }, 260);
        };
        const frame = () => {
          q = false;
          const r = outer.getBoundingClientRect();
          if (!r.height) return;
          if (!W) layout();
          const vh = innerHeight;
          p = Math.max(0, Math.min(S - 1, -r.top / stepPx));
          const k = Math.min(S - 1, Math.floor(p)), f = p - k;
          const e = k >= S - 1 ? 0 : ease(Math.max(0, Math.min(1, (f - 0.2) / 0.6)));
          const A = steps[k], Bs = steps[Math.min(S - 1, k + 1)];
          plates.forEach((o) => { o.pl.style.visibility = 'hidden'; });
          const put = (st, off, axis, view) => {
            const o = plates[st.page];
            o.pl.style.visibility = 'visible';
            o.pl.style.transform = axis === 'y' ? 'translate3d(0,' + off + '%,0)' : 'translate3d(' + off + '%,0,0)';
            o.cam.style.transform = 'translate(' + view.a.toFixed(3) + '%,' + view.b.toFixed(3) + '%) scale(' + view.s.toFixed(4) + ')';
          };
          if (A.page === Bs.page) {
            put(A, 0, 'x', { s: lerp(A.view.s, Bs.view.s, e), a: lerp(A.view.a, Bs.view.a, e), b: lerp(A.view.b, Bs.view.b, e) });
          } else {
            const axis = PAGES[A.page].title ? 'y' : 'x';
            put(A, -e * 100, axis, A.view);
            put(Bs, (1 - e) * 100, axis, Bs.view);
          }
          setLabel(e < 0.5 ? A.label : Bs.label);
          {
            const FB = PAGES.findIndex((pg) => pg.feedback);
            const on = (A.page === FB && (Bs.page === FB || e < 0.15)) || (Bs.page === FB && e > 0.6);
            if (on !== fbOn) { fbOn = on; if (on) fbRoutes.forEach((f) => f()); fbInk.forEach((o) => (on ? o.on() : o.off())); }
          }
          {
            ttls.forEach((ttl, j) => {
              const TI = TIs[j], NX = TIs[j + 1] != null ? TIs[j + 1] : Infinity;
              const m = TM[j] || measureT(j);
              const tw = m.w, th = m.h, ts = m.ts;
              const cx = SO.x + SO.w / 2 - tw / 2, cy = SO.y + SO.h / 2 - th / 2;
              const tx = innerWidth * 0.04, ty = innerHeight * 0.09;
              let u = 0, op = 0;                                 // u: 0 centred, 1 in the heading slot
              if (A.page < TI && Bs.page === TI) op = e;
              else if (A.page === TI && Bs.page === TI) op = 1;
              else if (A.page === TI) { op = 1; u = e; }
              else if (A.page > TI && A.page < NX) { u = 1; op = Bs.page === NX ? 1 - e : 1; }
              const sc = lerp(1, ts, u);
              ttl.style.opacity = op.toFixed(3);
              ttl.style.transform = 'translate(' + lerp(cx, tx, u).toFixed(1) + 'px,' + lerp(cy, ty, u).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
            });
          }
          // the buttons drop from the stage's middle to its foot as the sheet scrolls up to pin
          const dt = ease(Math.max(0, Math.min(1, (vh - r.top) / vh)));
          [prev, next].forEach((b) => {
            b.style.top = 'calc(' + (50 + 50 * dt).toFixed(2) + '% - ' + (dt * 96).toFixed(1) + 'px)';
            b.style.transform = 'translateY(' + (-50 * (1 - dt)).toFixed(1) + '%)';
          });
          prev.style.opacity = p < 0.05 ? '0.35' : '1';
          next.style.opacity = p > S - 1.05 ? '0.35' : '1';
        };
        let q = false;
        const onS = () => { if (!q) { q = true; requestAnimationFrame(frame); } };
        ov.addEventListener('scroll', onS, { passive: true });
        addEventListener('resize', () => { layout(); fbRoutes.forEach((f) => f()); onS(); });
        requestAnimationFrame(() => { layout(); frame(); });
        if (document.fonts) document.fonts.ready.then(() => { layout(); onS(); });
        return wrap;
      };

      // p00+p01 of StrahL are one spread: the printed pattern ring is erased with a cream annulus and
      // re-laid live so it can turn, with the three product renders back on top of it. Geometry is in
      // per cent of the spread box, measured against the printed pages.
      const makeSpread = (sp) => {
        const root = document.createElement('div');
        root.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0';
        sp.pages.forEach((pg, k) => {
          const im = document.createElement('img');
          im.src = pg.src; im.alt = ''; im.width = pg.w; im.height = pg.h;
          im.decoding = 'async';
          if (!k) im.fetchPriority = 'high';
          im.style.cssText = 'display:block;width:100%;height:auto;margin-bottom:-1px;position:relative;z-index:0';
          root.appendChild(im);
        });
        // cream annulus: covers the printed ring whatever angle the live one lands on
        if (sp.mask) {
        const mask = document.createElement('div');
        mask.style.cssText = 'position:absolute;left:' + sp.mask.left + '%;top:' + sp.mask.top + '%;width:' +
          sp.mask.w + '%;height:' + sp.mask.h + '%;z-index:1;pointer-events:none;background:radial-gradient(circle closest-side,' +
          'rgba(0,0,0,0) 0 ' + sp.mask.inner + '%,' + sp.bg + ' ' + sp.mask.inner + '%,' + sp.bg + ' 100%,rgba(0,0,0,0) 100%)';
        root.appendChild(mask);
        }
        const ring = document.createElement('img');
        ring.src = sp.ring.src; ring.alt = ''; ring.decoding = 'async'; ring.fetchPriority = 'high';
        ring.style.cssText = 'position:absolute;left:' + sp.ring.left + '%;top:' + sp.ring.top + '%;width:' +
          sp.ring.w + '%;height:auto;z-index:2;pointer-events:none;transform-origin:' + sp.ring.origin +
          ';transition:transform 0.7s cubic-bezier(0.22,1,0.36,1)';
        root.appendChild(ring);
        sp.products.forEach((pr) => {
          const im = document.createElement('img');
          im.src = pr.src; im.alt = ''; im.decoding = 'async'; im.fetchPriority = 'high';
          im.style.cssText = 'position:absolute;left:' + pr.left + '%;top:' + pr.top + '%;width:' + pr.w +
            '%;height:auto;z-index:3;pointer-events:none';
          root.appendChild(im);
        });
        // one 15deg step every 800ms: each step eases out and the next leaves straight away
        let deg = 0;
        const timer = setInterval(() => {
          if (!document.body.contains(root)) return clearInterval(timer);
          const r = root.getBoundingClientRect();
          if (r.bottom < -200 || r.top > innerHeight + 200) return;
          deg += 15;
          ring.style.transform = 'rotate(' + deg + 'deg)';
        }, 800);
        return root;
      };

      const risers = [], plateFigs = [];
      p.imgs.forEach((it, i) => {
        if (it.spread) { strip.appendChild(makeSpread(it.spread)); return; }
        if (it.gap) { const g = document.createElement('div');
          g.style.cssText = 'width:100%;background:' + p.bg + ';height:34vh'; strip.appendChild(g); return; }
        // loose sheets rather than printed pages: each sits on the paper with its own margin and
        // rises in with the house reveal
        if (it.plate) {
          if (it.head) {
            const hd = document.createElement('div');
            hd.style.cssText = 'width:100%;box-sizing:border-box;background:' + p.bg + ';padding:14vh 6vw 0;display:flex;' +
              'flex-direction:column;align-items:center;gap:2.2rem;text-align:center';
            const h = document.createElement('h2');
            h.textContent = it.head[0];
            h.style.cssText = "margin:0;font-family:'VG Pixel','Press Start 2P',monospace;font-weight:400;color:#f3323f;" +
              'font-size:clamp(28px,4vw,76px);line-height:1.1;letter-spacing:0.02em';
            const s = document.createElement('p');
            s.textContent = it.head[1];
            s.style.cssText = "margin:0;font-family:'Courier New',ui-monospace,monospace;color:#f4f4f4;" +
              'font-size:clamp(16px,1.6vw,30px);line-height:1.3;text-wrap:balance';
            hd.appendChild(h); hd.appendChild(s); strip.appendChild(hd);
          }
          const sec = document.createElement('section');
          sec.style.cssText = 'width:100%;box-sizing:border-box;background:' + p.bg + ';padding:' + (it.head ? '8vh 0 12vh' : '12vh 8vw') + ';display:grid;' +
            'grid-template-columns:repeat(' + it.plate.length + ',minmax(0,1fr));gap:' + (it.head ? '12px' : '6vw') + ';align-items:' + (it.head ? 'center' : 'end') + ';' +
            'justify-items:center;line-height:0;font-size:0';
          it.plate.forEach((pg) => {
            const fig = document.createElement('figure');
            fig.style.cssText = 'margin:0;display:flex;flex-direction:column;gap:18px;max-width:100%;' + (it.head ? 'width:100%;' : '') + 'opacity:0;' +
              'transform:translateY(26px);transition:opacity 0.9s cubic-bezier(0.22,1,0.36,1),' +
              'transform 0.9s cubic-bezier(0.22,1,0.36,1)';
            const pim = document.createElement('img');
            pim.src = pg.src; pim.alt = pg.cap || ''; pim.width = pg.w; pim.height = pg.h;
            pim.loading = 'lazy'; pim.decoding = 'async';
            pim.style.cssText = it.head ? 'display:block;width:100%;height:auto' : 'display:block;width:auto;max-width:100%;max-height:76vh;height:auto';
            fig.appendChild(pim);
            if (pg.cap) {
              const c = document.createElement('figcaption');
              c.textContent = pg.cap;
              c.style.cssText = "font-family:'neuzeit-grotesk','DIN Neuzeit Grotesk','Helvetica Neue',Helvetica," +
                'Arial,sans-serif;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;' +
                'line-height:1.5;color:rgba(19,19,19,0.55)';
              fig.appendChild(c);
            }
            sec.appendChild(fig);
            plateFigs.push(fig);
          });
          strip.appendChild(sec);
          return;
        }
        if (it.sketchStory) { strip.appendChild(makeSketchStory()); return; }
        if (it.hatke) { strip.appendChild(makeHatke()); return; }
        if (it.renders) { strip.appendChild(makeRenders()); return; }
        if (it.reel) {
          const box = document.createElement('div');
          box.style.cssText = 'position:relative;width:100%;background:#000;overflow:hidden;line-height:0;display:flex;align-items:center;justify-content:center;margin-bottom:-1px';
          const v = document.createElement('video');
          v.src = it.reel; v.preload = 'auto'; v.playsInline = true; v.setAttribute('playsinline', '');
          v.style.cssText = 'display:block;width:min(100%,150vh);height:auto;aspect-ratio:16/9;object-fit:contain;clip-path:inset(1px)';
          box.appendChild(v); strip.appendChild(box);
          const gap = document.createElement('div');
          gap.style.cssText = 'width:100%;height:16vh;background:#000';
          strip.appendChild(gap);
          // plays (with sound — the reader was opened by a click) each time it scrolls into view
          let on = false;
          const chk = () => {
            if (!box.isConnected) { v.pause(); return; }
            const b = box.getBoundingClientRect();
            if (!b.height) return;
            const vis = b.top < innerHeight * 0.6 && b.bottom > innerHeight * 0.4;
            if (vis && !on) {
              on = true; v.currentTime = 0; v.muted = false;
              v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
            } else if (!vis && on && (b.top > innerHeight || b.bottom < 0)) { on = false; v.pause(); }
          };
          ov.addEventListener('scroll', chk, { passive: true });
          let seenOv = false;
          const reap = setInterval(() => { if (ov.isConnected) { seenOv = true; return; } if (seenOv) { v.pause(); v.removeAttribute('src'); v.load(); clearInterval(reap); } }, 600);
          return;
        }
        if (it.carousel) { strip.appendChild(makeCarousel(it)); return; }
        // A page whose ink finishes itself: the question mark is stroked on when the line lands on
        // screen, and the rule under it is drawn downward by the scroll itself.
        const makeDrawPage = (cfg, img) => {
          const NS = 'http://www.w3.org/2000/svg';
          const w = document.createElement('div');
          w.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0';
          w.appendChild(img);
          let hook = null, dot = null;
          if (cfg.q) {
          const svg = document.createElementNS(NS, 'svg');
          svg.setAttribute('viewBox', '0 0 27 46');
          svg.setAttribute('fill', 'none');
          svg.style.cssText = 'position:absolute;left:' + cfg.q.left + '%;top:' + cfg.q.top + '%;width:' +
            cfg.q.w + '%;height:auto;overflow:visible;pointer-events:none;z-index:2';
          hook = document.createElementNS(NS, 'path');
          hook.setAttribute('d', 'M 3.6 17.4 A 10.35 10.35 0 1 1 23.85 17 C 23.85 23 13.5 24 13.5 28.5 L 13.5 33');
          hook.setAttribute('stroke', cfg.q.ink);
          hook.setAttribute('stroke-width', '2.3');
          hook.setAttribute('stroke-linecap', 'round');
          hook.setAttribute('stroke-linejoin', 'round');
          dot = document.createElementNS(NS, 'circle');
          dot.setAttribute('cx', '13.5'); dot.setAttribute('cy', '41.5'); dot.setAttribute('r', '1.55');
          dot.setAttribute('fill', cfg.q.ink);
          dot.style.cssText = 'opacity:0;transition:opacity 0.28s ease 0.9s';
          svg.appendChild(hook); svg.appendChild(dot); w.appendChild(svg);
          }
          const rule = document.createElement('div');
          rule.style.cssText = 'position:absolute;left:' + cfg.rule.left + '%;top:' + cfg.rule.top + '%;width:' +
            cfg.rule.w + '%;height:' + cfg.rule.h + '%;background:' + cfg.rule.ink +
            ';transform:scaleY(0);transform-origin:top center;pointer-events:none;z-index:2';
          w.appendChild(rule);
          let L = 0, drawn = false, seen = false;
          const sync = () => {
            const box = w.getBoundingClientRect();
            if (box.height) {
              if (hook && !L && hook.getTotalLength) {
                L = hook.getTotalLength();
                hook.style.strokeDasharray = L;
                hook.style.strokeDashoffset = L;
                hook.style.transition = 'stroke-dashoffset 1.05s cubic-bezier(0.22, 1, 0.36, 1)';
              }
              const qTop = cfg.q ? box.top + box.height * cfg.q.top / 100 : 0;
              if (cfg.q && !drawn && L && qTop < window.innerHeight * 0.8 && qTop > -box.height) {
                drawn = true;
                hook.style.strokeDashoffset = '0';
                dot.style.opacity = '1';
              }
              // the rule tracks the scroll directly rather than easing: it reads as the page being
              // ruled in by the movement, and it retracts if the reader scrolls back up
              const rTop = box.top + box.height * cfg.rule.top / 100;
              const rH = box.height * cfg.rule.h / 100;
              const p = Math.max(0, Math.min(1, (window.innerHeight * 0.86 - rTop) / rH));
              rule.style.transform = 'scaleY(' + p.toFixed(4) + ')';
            }
            // one rAF loop rather than scroll listeners: momentum scrolling on the reader does not
            // fire reliably per frame. The strip is still detached on the first frames, so the loop
            // waits to have been connected once before it treats removal as the reader closing.
            if (w.isConnected) seen = true;
            if (!seen || w.isConnected) requestAnimationFrame(sync);
          };
          requestAnimationFrame(sync);
          return w;
        };
        // Depth planes lifted off a flat page: each pops up into place, nearest first, once the band
        // reaches the screen. It plays once and is not tied to scroll position.
        const makePopPage = (cfg, img) => {
          const w = document.createElement('div');
          w.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0;overflow:hidden';
          w.appendChild(img);
          const els = cfg.layers.map((L) => {
            const el = document.createElement('img');
            el.src = L.src; el.alt = ''; el.loading = 'lazy'; el.decoding = 'async';
            el.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:auto;pointer-events:none;' +
              'z-index:' + L.z + ';opacity:0;transform:translateY(' + L.dy + '%);transition:transform 0.95s ease-in-out ' +
              L.delay + 's, opacity 0.6s ease-in-out ' + L.delay + 's';
            w.appendChild(el);
            return el;
          });
          let done = false, seen = false;
          const sync = () => {
            const box = w.getBoundingClientRect();
            if (!done && box.height) {
              const top = box.top + box.height * cfg.top / 100;
              if (top < window.innerHeight * 0.5 && top > -box.height) {
                done = true;
                els.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
              }
            }
            if (w.isConnected) seen = true;
            if (done || (seen && !w.isConnected)) return;
            requestAnimationFrame(sync);
          };
          requestAnimationFrame(sync);
          return w;
        };
        const im = document.createElement('img');
        im.src = it.src; im.alt = '';
        im.width = it.w; im.height = it.h; // reserve layout up front: no late jump in scroll height
        if (i > 1) im.loading = 'lazy'; else im.fetchPriority = i === 0 ? 'high' : 'auto';
        im.decoding = 'async';
        im.style.cssText = 'display:block;width:100%;height:auto;margin-bottom:-1px';
        if (it.draw) { strip.appendChild(makeDrawPage(it.draw, im)); return; }
        if (it.pop) { strip.appendChild(makePopPage(it.pop, im)); return; }
        if (it.words && window.vgScrollWords) {
          // the page before it is pinned along with this one, so the whole frame holds still
          const prev = strip.lastElementChild && strip.lastElementChild.tagName === 'IMG' ? strip.lastElementChild : null;
          strip.appendChild(window.vgScrollWords(im, Object.assign({}, it.words, { scroller: ov, above: prev })));
        } else if (it.crop) {
          const w = document.createElement('div');
          w.style.cssText = 'position:relative;width:100%;overflow:hidden;line-height:0;font-size:0;' +
            'aspect-ratio:2880/' + it.crop[0];
          im.style.marginBottom = '0';
          if (it.crop[1]) im.style.marginTop = (-it.crop[1] / 2880 * 100).toFixed(4) + '%';
          w.appendChild(im);
          strip.appendChild(w);
          if (it.statement) strip.appendChild(window.vgStatement({ scroller: ov }));
        } else if (it.side) {
          const holder = document.createElement('div');
          holder.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0';
          if (it.frames) {
            // each photo slides in from the right inside its own frame, one after another
            holder.style.aspectRatio = it.w + '/' + it.h;
            holder.style.background = '#000';
            const fr = it.frames.map(([src, l, t, w, h], j) => {
              const f = document.createElement('div');
              f.style.cssText = 'position:absolute;left:' + l + '%;top:' + t + '%;width:' + w + '%;height:' + h + '%;overflow:hidden';
              const pim = document.createElement('img');
              pim.src = 'assets/images/bitl/' + src; pim.alt = ''; pim.decoding = 'async';
              pim.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;transform:translateX(101%);' +
                'transition:transform 1.1s cubic-bezier(0.19,1,0.22,1) ' + (j * 0.18) + 's';
              f.appendChild(pim); holder.appendChild(f);
              return pim;
            });
            let inView = false;
            const chk = () => {
              const b = holder.getBoundingClientRect();
              if (!b.height) return;
              const on = b.top < innerHeight * 0.7 && b.bottom > 0;
              if (on && !inView) { inView = true; fr.forEach((m) => { m.style.transform = 'translateX(0)'; }); }
              else if (!on && inView && b.top > innerHeight) { inView = false; fr.forEach((m) => { m.style.transform = 'translateX(101%)'; }); }
            };
            ov.addEventListener('scroll', chk, { passive: true });
            requestAnimationFrame(chk);
          } else holder.appendChild(im);
          const tx = document.createElement('div');
          tx.style.cssText = 'position:absolute;left:4vw;top:50%;transform:translateY(-50%);width:28%;display:flex;' +
            'flex-direction:column;gap:2.2rem;line-height:normal';
          const h = document.createElement('h2');
          h.textContent = it.side[0];
          h.style.cssText = "margin:0;font-family:'VG Pixel','Press Start 2P',monospace;font-weight:400;color:#f3323f;" +
            'font-size:clamp(28px,4vw,76px);line-height:1.1;letter-spacing:0.02em';
          const s = document.createElement('p');
          s.textContent = it.side[1];
          s.style.cssText = "margin:0;font-family:'Courier New',ui-monospace,monospace;color:#f4f4f4;" +
            'font-size:clamp(16px,1.6vw,30px);line-height:1.3;text-wrap:pretty';
          tx.appendChild(h); tx.appendChild(s); holder.appendChild(tx);
          strip.appendChild(holder);
        } else if (it.caption) {
          const holder = document.createElement('div');
          holder.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0';
          holder.appendChild(im);
          const cap = document.createElement('p');
          // the three qualities warm to the SAFE red one after another as the caption scrolls in
          const HL = ['elegant', 'beautiful', 'marketable'];
          const words = [];
          it.caption.split(/(elegant|beautiful|marketable)/).forEach((seg) => {
            if (!seg) return;
            if (HL.indexOf(seg) >= 0) {
              const w = document.createElement('span');
              w.textContent = seg;
              w.style.cssText = 'color:inherit;transition:color 0.9s ease';
              cap.appendChild(w); words.push(w);
            } else cap.appendChild(document.createTextNode(seg));
          });
          risers.push({ hl: true, mask: cap, words, done: false });
          cap.style.cssText = "position:absolute;left:2%;bottom:5%;width:27%;margin:0;font-family:Outfit," +
            "'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:400;font-size:clamp(13px,1.35vw,30px);" +
            'line-height:1.45;letter-spacing:0.005em;color:rgba(244,244,244,0.82);text-wrap:pretty';
          holder.appendChild(cap);
          strip.appendChild(holder);
        } else strip.appendChild(im);
        if (it.body) {
          const sec = document.createElement('section');
          sec.style.cssText = 'width:100%;background:' + p.bg + ';display:flex;flex-direction:column;gap:2.4rem;' +
            'align-items:center;padding:26vh 8vw;line-height:1.5;margin-top:-2px;position:relative;font-size:16px;' +
            'box-sizing:border-box';
          const bw = [];
          it.body.forEach((t) => {
            const par = document.createElement('p');
            // **phrase** marks the words that carry the point; every word is its own span so the copy
            // can fill in word by word as the reader scrolls (bold words fill to the SAFE red)
            t.split(/\*\*/).forEach((seg, k) => {
              if (!seg) return;
              const host = k % 2 ? document.createElement('strong') : par;
              if (k % 2) { host.style.cssText = 'font-weight:700'; par.appendChild(host); }
              seg.split(/(\s+)/).forEach((tok) => {
                if (!tok) return;
                if (/^\s+$/.test(tok)) return host.appendChild(document.createTextNode(tok));
                const w = document.createElement('span');
                w.textContent = tok;
                w.style.cssText = 'opacity:0.18;transition:opacity 0.15s linear,color 0.3s ease';
                host.appendChild(w); bw.push({ w, red: !!(k % 2) });
              });
            });
            par.style.cssText = "margin:0;max-width:1000px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;" +
              'font-weight:400;font-size:clamp(15px,1.35vw,28px);line-height:1.6;letter-spacing:0.005em;' +
              'color:' + (p.copyInk || 'rgba(244,244,244,0.86)') + ';text-wrap:pretty;text-align:center';
            sec.appendChild(par);
          });
          // the section pins mid-screen while the scroll fills it, the same pause as the watchmaker opener
          const pinBox = document.createElement('div');
          pinBox.style.cssText = 'position:relative;width:100%;background:' + p.bg;
          pinBox.appendChild(sec);
          strip.appendChild(pinBox);
          sec.style.position = 'sticky';
          let range = 1, lastT = -1;
          const lay = () => {
            const vh = innerHeight, h = sec.offsetHeight;
            if (!h) return;
            sec.style.top = Math.round((vh - h) / 2) + 'px';
            range = Math.round(vh * 1.1);
            pinBox.style.height = (h + range) + 'px';
          };
          const fill = () => {
            if (!sec.offsetHeight) return;
            if (pinBox.offsetHeight !== sec.offsetHeight + range) lay();
            const t = Math.max(0, Math.min(1, ((parseFloat(sec.style.top) || 0) - pinBox.getBoundingClientRect().top) / range));
            if (Math.abs(t - lastT) < 0.002) return;
            lastT = t;
            const n = t * bw.length * 1.04;
            bw.forEach((o, i) => {
              const v = Math.max(0, Math.min(1, n - i));
              o.w.style.opacity = String(0.18 + 0.82 * v);
              o.w.style.color = o.red && v >= 0.5 ? '#f3323f' : '';
            });
          };
          let fq = false;
          const onF = () => { if (fq) return; fq = true; requestAnimationFrame(() => { fq = false; fill(); }); };
          ov.addEventListener('scroll', onF, { passive: true });
          addEventListener('resize', () => { lay(); onF(); });
          requestAnimationFrame(() => { lay(); fill(); });
        }
        if (it.after) {
          const brk = document.createElement('section');
          brk.style.cssText = 'position:relative;width:100%;background:#000;display:flex;align-items:center;' +
            'justify-content:center;padding:26vh 40px;line-height:1.5;box-sizing:border-box';
          brk.style.background = p.bg;
          const mask = document.createElement('div');
          mask.style.cssText = 'max-width:1180px';
          // deliberately not the statement voice: plain white sub-heading, only SAFE performs
          const line = document.createElement('p');
          line.style.cssText = "margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:400;" +
            'font-size:clamp(20px,2.1vw,40px);line-height:1.35;letter-spacing:0.005em;text-align:center;' +
            'text-wrap:balance;color:#f4f4f4;opacity:0;transform:translateY(14px);' +
            'transition:opacity 0.7s ease,transform 0.9s cubic-bezier(0.19,1,0.22,1)';
          const parts = it.after.split('SAFE');
          line.appendChild(document.createTextNode(parts[0]));
          const safe = document.createElement('span');
          safe.textContent = 'SAFE';
          safe.style.cssText = 'display:inline-block;font-weight:700;letter-spacing:0.02em;color:#f3323f;' +
            'opacity:0;transform:translateY(0.12em) scale(0.94)';
          line.appendChild(safe);
          line.appendChild(document.createTextNode(parts[1] || ''));
          mask.appendChild(line); brk.appendChild(mask); strip.appendChild(brk);
          risers.push({ mask, line, safe, done: false });
        }
      });
      // same rise as the statement break, driven off the reader's own scroller
      const reduceRise = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const checkRisers = () => {
        for (let i = 0; i < risers.length; i++) {
          const r = risers[i];
          if (r.done) {
            // once it has dropped back below the fold, re-arm so it plays again on the way down
            if (reduceRise) continue;
            const ob = r.mask.getBoundingClientRect();
            if (ob.height && ob.top > innerHeight) {
              r.done = false;
              (r.timers || []).forEach(clearTimeout); r.timers = [];
              if (r.hl) r.words.forEach((w) => { w.style.color = 'inherit'; });
              else {
                const L = r.line, tr = L.style.transition;
                L.style.transition = 'none'; L.style.opacity = '0'; L.style.transform = 'translateY(14px)';
                if (r.safe) { r.safe.style.transition = 'none'; r.safe.style.opacity = '0'; r.safe.style.transform = 'translateY(0.12em) scale(0.94)'; }
                void L.offsetWidth; L.style.transition = tr;
              }
            }
            continue;
          }
          r.timers = r.timers || [];
          const later = (f, t) => r.timers.push(setTimeout(f, t));
          if (r.hl) {
            const hb = r.mask.getBoundingClientRect();
            if (hb.height && hb.bottom < innerHeight * 0.97 && hb.top > 0) {
              r.done = true;
              r.words.forEach((w, k) => later(() => { w.style.color = '#f3323f'; }, 80 + k * 220));
            }
            continue;
          }
          const b = r.mask.getBoundingClientRect();
          if (b.height && b.top < innerHeight * 0.86 && b.bottom > 0) {
            r.done = true;
            r.line.style.opacity = '1';
            r.line.style.transform = 'translateY(0)';
            if (r.safe) {
              const s = r.safe;
              // SAFE arrives after the line settles, flickering on like a tube warming up
              later(() => {
                s.style.transition = 'opacity 0.14s linear,transform 0.5s cubic-bezier(0.19,1,0.22,1)';
                s.style.transform = 'translateY(0) scale(1)';
                [0, 90, 150, 260, 320].forEach((t, k) => later(() => { s.style.opacity = k % 2 ? '0.15' : '1'; }, t));
                later(() => { s.style.opacity = '1'; }, 420);
              }, 620);
            }
          }
        }
      };
      if (reduceRise) risers.forEach((r) => { if (r.hl) return; r.done = true; r.line.style.opacity = '1'; r.line.style.transform = 'translateY(0)'; if (r.safe) r.safe.style.opacity = '1'; });
      this._checkRisers = checkRisers;
      if (plateFigs.length) {
        const io = new IntersectionObserver((es) => es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          io.unobserve(e.target);
        }), { root: ov, threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
        plateFigs.forEach((f) => io.observe(f));
      }
      ov.appendChild(strip);
      const foot = document.createElement('footer');
      foot.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:24px;padding:64px 40px 72px;' +
        'font-size:11px;letter-spacing:0.16em;color:' + p.ink + ';opacity:0.6';
      const back = document.createElement('a');
      back.href = '#'; back.textContent = '\u2190 BACK TO PROJECTS';
      back.style.cssText = 'color:inherit;text-decoration:none';
      const tag = document.createElement('span');
      tag.textContent = p.label;
      foot.appendChild(back); foot.appendChild(tag);
      ov.appendChild(foot);
      const bar = document.createElement('div');
      bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:8010;display:flex;align-items:center;' +
        'justify-content:space-between;padding:20px 40px;mix-blend-mode:difference;color:#fff;' +
        'font-size:12px;letter-spacing:0.16em;font-weight:500;pointer-events:none';
      const home = document.createElement('a');
      home.href = '#'; home.textContent = 'PORTFOLIO';
      home.style.cssText = 'color:#fff;text-decoration:none;font-weight:700;letter-spacing:0.18em;pointer-events:auto';
      const closeBtn = document.createElement('a');
      closeBtn.href = '#'; closeBtn.textContent = '\u2190 BACK';
      closeBtn.style.cssText = 'color:#fff;text-decoration:none;pointer-events:auto';
      bar.appendChild(home); bar.appendChild(closeBtn);
      ov.appendChild(bar);
      document.body.appendChild(ov);
      this._readerOpen = true;
      if (this._readerScrollReset) this._readerScrollReset(ov);
      ov.addEventListener('scroll', () => { if (this._readerScrollSync) this._readerScrollSync(); checkRisers(); }, { passive: true });
      requestAnimationFrame(checkRisers);
      // The reader used to fade in on load, which showed a blank panel for a beat while the first
      // page decoded. Now it is revealed only once that page is decoded and ready to paint, with no
      // fade — the expanded tile sits underneath in the same colour, so the swap is invisible.
      const first = ov.querySelector('img');
      let shown = false;
      const show = () => {
        if (shown) return;
        shown = true;
        ov.style.transition = 'none';
        void ov.getBoundingClientRect();
        ov.style.opacity = '1';
        // the reader is opaque: the home page under it (hero video, blurred nav, tiles) stops painting and decoding
        setTimeout(() => {
          if (!ov.isConnected || !this._readerOpen) return;
          document.documentElement.classList.add('vg-reader-on');
          this._underVids = Array.from(document.querySelectorAll('video')).filter((v) => !ov.contains(v) && !v.paused);
          this._underVids.forEach((v) => v.pause());
        }, 320);
      };
      if (first) {
        const ready = first.decode ? first.decode() : Promise.resolve();
        ready.then(show, show);
        setTimeout(show, 900);
      } else show();
      const close = (e) => {
        if (e) e.preventDefault();
        this._readerOpen = false;
        document.documentElement.classList.remove('vg-reader-on');
        (this._underVids || []).forEach((v) => { v.play().catch(() => {}); });
        this._underVids = null;
        if (this._hero) { this._hero.destroy(); this._hero = null; }
        if (this._readerScrollReset) this._readerScrollReset(null);
        document.removeEventListener('keydown', onKey);
        const target = insetTo && insetTo();
        if (!target) {
          ov.style.transition = 'opacity 0.28s ease';
          void ov.getBoundingClientRect();
          ov.style.opacity = '0';
          setTimeout(() => { ov.remove(); if (onClose) onClose(); }, 300);
          return;
        }
        const fullEl = document.getElementById('vg-full');
        if (!fullEl) { ov.remove(); if (onClose) onClose(); return; }
        // hand the frame the reader is showing to the small #vg-full layer, then drop the
        // reader entirely — a full-viewport scroller of 1680px strips can't be re-rastered
        // per frame, so the shrink has to run on the light layer alone.
        // search the whole overlay, not just the strip: pages 1-2 live in the hero wrap, so a strip
        // search hands the shrink the wrong artwork on the first three screens
        const shown = Array.from(ov.querySelectorAll('img')).find((im) => {
          const b = im.getBoundingClientRect();
          return b.bottom > 1 && b.top < 2;
        }) || ov.querySelector('img');
        const src = shown.getAttribute('src');
        const offset = Math.round(shown.getBoundingClientRect().top);
        const finish = () => {
          fullEl.style.backgroundSize = 'cover';
          fullEl.style.backgroundPosition = 'center';
          if (onClose) onClose();
        };
        const run = () => {
          fullEl.style.transition = 'none';
          fullEl.style.background = p.bg;
          if (shown.complete && shown.naturalWidth) {
            fullEl.style.backgroundImage = 'url("' + src + '")';
            fullEl.style.backgroundSize = '100% auto';
            fullEl.style.backgroundRepeat = 'no-repeat';
            fullEl.style.backgroundPosition = '0px ' + offset + 'px';
          } else {
            fullEl.style.backgroundImage = 'none';
          }
          fullEl.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
          fullEl.style.opacity = '1';
          ov.remove();
          void fullEl.getBoundingClientRect();
          // the reader's teardown is an expensive frame; don't let it be the transition's first
          requestAnimationFrame(() => {
            fullEl.style.transition = 'clip-path 0.95s cubic-bezier(0.62, 0, 0.2, 1), opacity 0.28s ease 0.78s';
            fullEl.style.clipPath = target;
            fullEl.style.opacity = '0';
            let done = false;
            const once = () => { if (done) return; done = true; fullEl.removeEventListener('transitionend', onEnd); finish(); };
            const onEnd = (ev) => { if (ev.propertyName === 'clip-path') once(); };
            fullEl.addEventListener('transitionend', onEnd);
            setTimeout(once, 1600);
          });
        };
        run(); // never gate the close on a decode — an unloaded strip would freeze the screen
      };
      const onKey = (ev) => { if (ev.key === 'Escape') close(ev); };
      document.addEventListener('keydown', onKey);
      [back, home, closeBtn].forEach((a) => a.addEventListener('click', close));
      // the circle cursor grows over the reader's own links too
      const ballEl = document.getElementById('vg-ball');
      [back, home, closeBtn].forEach((a) => {
        a.addEventListener('mouseenter', () => ballEl && ballEl.classList.add('vg-ball-big'));
        a.addEventListener('mouseleave', () => ballEl && ballEl.classList.remove('vg-ball-big'));
      });
      return close;
    };
    this._sketch = (url, ox, oy, photo, mode) => {
      const host = document.getElementById('vg-sketch');
      if (!host) return;
      const run = (rawMarkup, ox, oy) => {
        const ar = photo && this._aspect[photo];
        host.style.transition = 'none';
        host.style.clipPath = 'none';
        host.innerHTML = this._prepCache[url] || this._prepare(url, rawMarkup);
        const svg = host.querySelector('svg');
        if (!svg) return;
        // 'slice' = the same cover-fit the colour photo uses, so the outlines land on it exactly.
        // 'topfit' traces were drawn over the project page, where the photo runs full width from the
        // top: crop the canvas to the photo's own rect before the usual cover-fit
        const topfit = mode === 'topfit';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        svg.style.width = '100%'; svg.style.height = '100%';
        svg.style.overflow = 'visible'; // nothing the drawing carries gets cut by the frame
        // dx/dy trim per trace file; js/trace-dev.js (dev only, press D) writes these live
        const n = (window.__vgNudge && window.__vgNudge(url)) ||
          (window.VG_TRACE_BAKED && window.VG_TRACE_BAKED[url]) ||
          (topfit ? { dx: 1.7, dy: -0.6 } : { dx: 0, dy: 0 });
        if (ar && topfit) {
          const v = svg.viewBox.baseVal;
          const bx = v.x, by = v.y, bw = v.width, bh = v.width / ar;
          svg.setAttribute('data-basevb', bx + ' ' + by + ' ' + bw + ' ' + bh);
          svg.setAttribute('viewBox', (bx + bw * n.dx / 100) + ' ' + (by + bh * n.dy / 100) +
            ' ' + bw + ' ' + bh);
        }
        // re-frame the drawing to the photo's aspect so both cover-fit to the identical rect
        if (!topfit) {
          const v = svg.viewBox.baseVal;
          let w = v.width, h = v.height, x = v.x, y = v.y;
          if (ar) {
            const a0 = w / h;
            if (Math.abs(a0 - ar) > 0.002) {
              if (ar < a0) { const nh = w / ar; y -= (nh - h) / 2; h = nh; }
              else { const nw = h * ar; x -= (nw - w) / 2; w = nw; }
            }
          }
          svg.setAttribute('data-basevb', x + ' ' + y + ' ' + w + ' ' + h);
          svg.setAttribute('viewBox', (x + w * n.dx / 100) + ' ' + (y + h * n.dy / 100) +
            ' ' + w + ' ' + h);
        }
        const paths = Array.from(svg.querySelectorAll('path, ellipse, circle, rect, polyline, polygon, line'));
        const vb = svg.viewBox.baseVal;
        // cursor (viewport px) -> viewBox units under cover-fit
        const hr = host.getBoundingClientRect();
        const k = Math.max(hr.width / vb.width, hr.height / vb.height);
        const ky = k;
        const offX = (hr.width - vb.width * k) / 2, offY = (hr.height - vb.height * ky) / 2;
        const px = ox == null ? hr.width / 2 : ox - hr.left, py = oy == null ? hr.height / 2 : oy - hr.top;
        const cx0 = (px - offX) / k, cy0 = (py - offY) / ky;
        const scored = paths.map((p) => {
          const bx = +p.getAttribute('data-cx'), by = +p.getAttribute('data-cy');
          const dx = (isNaN(bx) ? 0 : bx) - cx0, dy = (isNaN(by) ? 0 : by) - cy0;
          return { p, d: Math.hypot(dx, dy), L: +p.getAttribute('data-len') || 1 };
        });
        const rMax = Math.max(1, ...scored.map((s) => s.d));
        if (mode === 'mask') {
          // artwork whose strokes are filled outlines: inking it as dashes looks jagged,
          // so paint it solid and let a soft front creep outward from the cursor instead
          paths.forEach((p) => { p.style.fill = '#131313'; p.style.stroke = 'none'; p.style.strokeDashoffset = '0'; p.style.opacity = '1'; p.style.transition = 'none'; });
          host.style.clipPath = 'circle(0px at ' + px + 'px ' + py + 'px)';
          void host.getBoundingClientRect();
          const reach = Math.hypot(hr.width, hr.height);
          host.style.transition = 'clip-path 1.5s cubic-bezier(0.16,0.72,0.28,1)';
          host.style.clipPath = 'circle(' + reach + 'px at ' + px + 'px ' + py + 'px)';
          return;
        }
        const total = 1800;
        // strokes are vector-effect: non-scaling-stroke, which dashes in screen px, not viewBox units:
        // scale each dash to the path's on-screen length or zoomed-in traces draw only part of each line
        // dash in normalised units (pathLength) so every element — path, line, polyline, ellipse,
        // transformed or not — hides and reveals fully whatever the zoom or vector-effect handling
        // non-scaling-stroke dashes are unreliable across browsers (lines stall part-drawn, then pop).
        // Drop it and set the width in viewBox units instead: same 1.5px on screen, and dashes are exact.
        const sw = 1.5 / k;
        scored.forEach((s) => {
          const Lu = s.L + 2;
          s.L = s.L * k; // on-screen length, drives duration
          s.p.style.cssText += ';vector-effect:none;stroke-width:' + sw + 'px;stroke-dasharray:' + Lu + ' ' + Lu + ';stroke-dashoffset:' + Lu + ';opacity:0;transition:none';
        });
        // once every stroke has landed, drop the dashes so nothing can stay partly hidden
        clearTimeout(this._dashClear);
        this._dashClear = setTimeout(() => {
          if (!host.contains(svg)) return;
          scored.forEach((s) => { s.p.style.transition = 'none'; s.p.style.strokeDasharray = 'none'; s.p.style.strokeDashoffset = '0'; s.p.style.opacity = ''; });
        }, total + 50 + 560 + 80);
        void svg.getBoundingClientRect(); // one flush for the whole set, then release them
        scored.forEach((s) => {
          // ^0.62 -> the ink front races away fast, then eases as it reaches the edges
          const delay = Math.pow(s.d / rMax, 0.62) * total + Math.random() * 50;
          const dur = Math.min(560, 160 + s.L * 1.4);
          s.p.style.transition = 'stroke-dashoffset ' + dur + 'ms cubic-bezier(0.22,0.7,0.3,1) ' + delay + 'ms, opacity 90ms linear ' + delay + 'ms';
          s.p.style.strokeDashoffset = '0';
          s.p.style.opacity = '';
        });
      };
      const go = () => {
        if (this._traceCache[url]) { run(this._traceCache[url], ox, oy); return; }
        fetch(url).then((r) => r.text()).then((t) => { this._traceCache[url] = t; run(t, ox, oy); }).catch(() => {});
      };
      if (photo && !this._aspect[photo]) {
        const im = new Image();
        im.onload = () => { this._aspect[photo] = im.naturalWidth / im.naturalHeight; go(); };
        im.onerror = go;
        im.src = photo;
      } else go();
    };
    this._handlers = [];
    const wireA = document.getElementById('vg-wire-a'), wireBox = document.getElementById('vg-wire'), full = document.getElementById('vg-full'), zoom = document.getElementById('vg-leak-zoom');
    const srcFor = (row) => {
      if (row.dataset.leakImg) return (window.__resources && row.dataset.leakRes && window.__resources[row.dataset.leakRes]) || row.dataset.leakImg;
      const img = row.querySelector('img');
      return img ? img.src : null;
    };
    const HOVER = new Map();
    let hoverRow = null;
    // touch screens have no hover: the first tap on a tile plays its sketch-out (the hover state),
    // the second tap on the same tile opens it. A tap anywhere else puts the sketch away.
    const TOUCH = !!(window.matchMedia && matchMedia('(hover: none)').matches);
    let armed = null, tapPt = null;
    document.querySelectorAll('.vg-row').forEach((row) => {
      let posterOpen = false;
      let lastPt = null;
      row.addEventListener('pointermove', (e) => { lastPt = { x: e.clientX, y: e.clientY }; }, { passive: true });
      const enter = (ev) => {
        const r = row.getBoundingClientRect();
        const pt = (ev && ev.clientX != null) ? { x: ev.clientX, y: ev.clientY } : lastPt;
        const cx = pt ? pt.x : r.left + r.width / 2;
        const cy = pt ? pt.y : Math.max(0, Math.min(window.innerHeight, r.top + r.height / 2));
        const src = srcFor(row);
        if (src) {
          document.body.classList.add('vg-focus');
          const proj0 = row.closest('.vg-proj');
          if (proj0) proj0.classList.add('vg-focus-row');
          // Only a tile with a hand-traced SVG draws: the white sheet comes up and the paths ink
          // themselves in. Tiles without one get the plain photo flood — no live edge filter, no
          // stand-in line art. Adding data-trace="…svg" to a row is all it takes to opt it in.
          if (row.dataset.trace) {
            wireA.style.filter = 'none';
            wireA.style.background = '#ffffff';
            const sk0 = document.getElementById('vg-sketch');
            if (sk0) sk0.style.opacity = '1';
            this._sketch(row.dataset.trace, cx, cy, src, row.dataset.traceMode);
          } else {
            document.getElementById('vg-sketch').innerHTML = '';
          }
          const bg = 'url("' + src + '") center / cover no-repeat';
          wireBox.style.opacity = row.dataset.trace ? '1' : '0';
          full.style.transition = 'none';
          full.style.opacity = '0';
          full.style.background = row.dataset.leak + ' ' + bg;
          row.classList.add('vg-lift');
        } else {
          wireBox.style.opacity = '0';
          full.style.transition = 'none';
          full.style.opacity = '1';
          full.style.background = row.dataset.leak;
        }
        // no scaling: the drawing is fixed in place; a ragged, hand-sketched front inks it in outward
        zoom.style.transition = 'none';
        zoom.style.transform = 'none';
        if (row.dataset.trace) {
          // the sketch itself is the reveal: show the white sheet at once, lines draw themselves in
          leak.style.transition = 'none';
          leak.style.clipPath = 'circle(0% at ' + cx + 'px ' + cy + 'px)';
          void leak.offsetWidth;
          leak.style.transition = 'clip-path 0.35s cubic-bezier(0.45, 0, 0.35, 1)';
          leak.style.clipPath = 'circle(150% at ' + cx + 'px ' + cy + 'px)';
          if (this.props.dimOthers ?? true) main.classList.add('vg-dim');
          return;
        }
        leak.style.transition = 'none';
        leak.style.clipPath = 'circle(0% at ' + cx + 'px ' + cy + 'px)';
        void leak.offsetWidth;
        leak.style.transition = 'clip-path ' + speed + 's cubic-bezier(0.45, 0, 0.35, 1)';
        leak.style.clipPath = 'circle(150% at ' + cx + 'px ' + cy + 'px)';
        if (this.props.dimOthers ?? true) main.classList.add('vg-dim');
      };
      const reveal = (e) => {
        // a real page link (not a "#" in-page project) always navigates normally
        const href = row.getAttribute('href') || '';
        // a tile whose href is a real page (watchmaker.html) plays the same grow-to-fullscreen
        // as the in-page projects, then navigates once the rectangle has filled the screen
        const pageNav = href.slice(0, 1) !== '#' ? href : null;
        if (posterOpen || this._locked || !srcFor(row)) return;
        if (TOUCH && armed !== row) {
          if (e) e.preventDefault();
          armed = row;
          tapPt = e && e.clientX != null ? { x: e.clientX, y: e.clientY } : null;
          setHover(row, tapPt);
          return;
        }
        armed = null;
        e.preventDefault();
        posterOpen = true;
        // hold the page still: no hover teardown, no scroll fighting the growing rectangle
        this._locked = true;
        window.__vgBusy = true;
        if (window.__vgSmooth) window.__vgSmooth.stop();
        if (this._ballReset) this._ballReset();
        if (this._lockScroll) this._lockScroll(true);
        const r2 = row.getBoundingClientRect();
        const pt2 = (e && e.clientX != null) ? { x: e.clientX, y: e.clientY } : lastPt;
        const cx2 = pt2 ? pt2.x : r2.left + r2.width / 2;
        const cy2 = pt2 ? pt2.y : Math.max(0, Math.min(window.innerHeight, r2.top + r2.height / 2));
        // click = the tile's own rectangle grows smoothly to fill the screen
        const insetFrom = 'inset(' + r2.top + 'px ' + (window.innerWidth - r2.right) + 'px ' +
          (window.innerHeight - r2.bottom) + 'px ' + r2.left + 'px round 20px)';
        const PAGE_DECK = { 'watchmaker.html': '#blind-watchmaker' };
        const deck = PROJECTS[pageNav ? PAGE_DECK[pageNav] : href];
        if (deck) {
          full.style.backgroundColor = deck.bg || '#131313';
          full.style.backgroundImage = 'url("' + deck.first + '")';
        } else if (pageNav) {
          // pages without a deck (aeron.html) grow their own cover, framed exactly as the tile shows it
          full.style.backgroundColor = row.dataset.leak || '#131313';
          full.style.backgroundImage = 'url("' + srcFor(row) + '")';
          const win = row.querySelector('.vg-win');
          if (win) full.style.backgroundPosition = getComputedStyle(win).backgroundPosition;
        }
        full.style.transition = 'none';
        full.style.clipPath = insetFrom;
        full.style.opacity = '1';
        void full.offsetWidth;
        full.style.willChange = 'clip-path';
        full.style.transition = 'clip-path 1.05s cubic-bezier(0.62, 0, 0.2, 1)';
        full.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
        setTimeout(() => { full.style.willChange = ''; }, 1100);
        if (row.dataset.trace) {
          // colour swallows the outlines: the drawing dissolves just behind the flood front
          const sk = document.getElementById('vg-sketch');
          sk.style.transition = 'opacity 0.75s ease 0.35s';
          sk.style.opacity = '0';
          setTimeout(() => { sk.innerHTML = ''; sk.style.transition = 'none'; sk.style.opacity = '1'; }, 1150);
        }
        // the tile stays put under the growing rectangle; the copy clears to its nearest edge
        const proj = row.closest('.vg-proj');
        row.style.transition = 'opacity 0.5s ease';
        row.style.opacity = '0';
        const desc = proj ? proj.querySelector(':scope > div.vg-reveal') : null;
        if (desc) {
          const rd = desc.getBoundingClientRect();
          const out = (rd.left + rd.width / 2) < window.innerWidth / 2 ? -1 : 1;
          desc.style.transition = 'transform 1s cubic-bezier(0.5, 0, 0.2, 1), opacity 0.7s ease';
          desc.style.transform = 'translateX(' + out * (window.innerWidth * 0.6) + 'px)';
          desc.style.opacity = '0';
        }
        this._exitRow = () => {
          row.style.transition = ''; row.style.transform = ''; row.style.opacity = '';
          if (desc) { desc.style.transition = ''; desc.style.transform = ''; desc.style.opacity = ''; }
        };
        row.classList.add('vg-expand');
        row.classList.remove('vg-lift');
        document.body.classList.add('vg-focus');
        if (proj) proj.classList.add('vg-focus-row');
        if (pageNav) {
          // the shrink-back on return is set up by the cover block in index.html
          try {
            sessionStorage.setItem('vgExpandedFrom', pageNav);
            sessionStorage.setItem('vgHomeScroll', String(window.scrollY || 0));
          } catch (e2) {}
          setTimeout(() => { location.href = pageNav; }, 1010);
          return;
        }
        // once the rectangle has filled the screen, hand off to the project page
        const deckFor = PROJECTS[href];
        if (deckFor) {
          if (deckFor.first) { const pre = new Image(); pre.src = deckFor.first; }
          setTimeout(() => {
            const insetTo = () => {
              const b = row.getBoundingClientRect();
              return 'inset(' + b.top + 'px ' + (window.innerWidth - b.right) + 'px ' +
                (window.innerHeight - b.bottom) + 'px ' + b.left + 'px round 20px)';
            };
            const close = this._openProject(deckFor, () => {
              // returning home: put every hover layer back the way leave() would
              full.style.transition = 'none';
              full.style.opacity = '0';
              full.style.clipPath = 'none';
              // the tile and its copy drift back in rather than popping
              row.style.transition = 'opacity 0.6s ease';
              row.style.opacity = '';
              if (desc) {
                desc.style.transition = 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease';
                desc.style.transform = '';
                desc.style.opacity = '';
              }
              setTimeout(() => {
                row.style.transition = '';
                if (desc) desc.style.transition = '';
              }, 1000);
              this._exitRow = null;
              row.classList.remove('vg-expand');
              row.classList.remove('vg-lift');
              document.body.classList.remove('vg-focus');
              document.querySelectorAll('.vg-focus-row').forEach((n) => n.classList.remove('vg-focus-row'));
              main.classList.remove('vg-dim');
              leak.style.transition = 'none';
              leak.style.clipPath = 'circle(0% at 50% 50%)';
              posterOpen = false;
              this._locked = false;
              window.__vgBusy = false;
              if (this._lockScroll) this._lockScroll(false);
            }, insetTo);
            this._closeReader = close;
          }, 1080);
        }
        else setTimeout(() => { this._locked = false; window.__vgBusy = false; if (this._lockScroll) this._lockScroll(false); }, 1200);
      };
      const leave = () => {
        leak.style.transition = 'none';
        const r = row.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = Math.max(0, Math.min(window.innerHeight, r.top + r.height / 2));
        leak.style.clipPath = 'circle(0% at ' + cx + 'px ' + cy + 'px)';
        wireBox.style.opacity = '0';
        const sk = document.getElementById('vg-sketch');
        // the trace dev bar (js/trace-dev.js) holds the drawing on screen so it can be nudged
        if (window.__vgTraceHold) { sk.style.transition = 'none'; sk.style.opacity = '1'; sk.style.clipPath = 'none'; }
        else { sk.style.transition = 'none'; sk.style.opacity = '1'; sk.style.clipPath = 'none'; sk.innerHTML = ''; }
        zoom.style.transition = 'none';
        zoom.style.transform = 'scale(1)';
        posterOpen = false;
        window.__vgBusy = false;
        full.style.transition = 'none';
        full.style.opacity = '0';
        full.style.clipPath = 'none';
        if (this._exitRow) { this._exitRow(); this._exitRow = null; }
        row.classList.remove('vg-expand');
        row.classList.remove('vg-lift');
        document.body.classList.remove('vg-focus');
        document.querySelectorAll('.vg-focus-row').forEach((p) => p.classList.remove('vg-focus-row'));
        main.classList.remove('vg-dim');
      };
      // every hover path funnels through one hover-state setter, so a trackpad scroll that slides a
      // tile under a stationary cursor reads exactly like the cursor moving onto it
      HOVER.set(row, { enter, leave });
      if (!TOUCH) {
        row.addEventListener('mouseenter', (e) => { setHover(row, { x: e.clientX, y: e.clientY }); });
        row.addEventListener('mouseleave', () => { if (hoverRow === row) setHover(null, null); });
      }
      row.addEventListener('click', reveal);
      this._handlers.push([row, enter, leave]);
    });

    // Hover follows the page, not just the mouse.
    // A trackpad/inertia scroll moves content under a cursor that never fires a mousemove, and the
    // browser's own mouseenter on scroll is unreliable — so we hit-test the last known cursor point
    // against the tile rects on every scroll frame and drive the same enter/leave.
    const BALL_CLS = { 'Aeron': 'vg-ball-aeron', 'BitL': 'vg-ball-bitl', 'Mobius': 'vg-ball-mobius', 'StrahL': 'vg-ball-strahl', 'Blind Watchmaker': 'vg-ball-watchmaker' };
    const rowAt = (pt) => {
      if (!pt) return null;
      let found = null;
      HOVER.forEach((_v, row) => {
        if (found) return;
        // the grid keeps its layout while the category picker is up, so a rect test alone would let a
        // scroll slide a still-hidden tile under the cursor and morph it. The gate's pointer-events:none
        // inherits down to the rows, which is exactly the "not interactive yet" signal to respect.
        if (getComputedStyle(row).pointerEvents === 'none') return;
        const r = row.getBoundingClientRect();
        if (pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom) found = row;
      });
      return found;
    };
    // fast scrolling: tiles flick past the resting cursor, and each would start its expand (photo
    // fades to glass) only to be abandoned a frame later — that is the grey flash. Hold new enters
    // until the page settles; leaving still happens at once.
    let lastY = window.scrollY, lastT = performance.now(), fastUntil = 0, settleT = 0;
    const onScrollSpeed = () => {
      const now = performance.now(), y = window.scrollY;
      const v = Math.abs(y - lastY) / Math.max(1, now - lastT);
      lastY = y; lastT = now;
      if (v > 0.6) {
        fastUntil = now + 160;
        clearTimeout(settleT);
        settleT = setTimeout(() => { if (this._syncHover) this._syncHover(); }, 180);
      }
    };
    window.addEventListener('scroll', onScrollSpeed, { passive: true });
    const setHover = (row, pt) => {
      // while a project is opening/open the hover layers are owned by the reveal; drop the tracked
      // row so the first hover after it closes counts as a fresh enter
      if (this._locked) { hoverRow = null; return; }
      // the cursor shape always follows the tile under it, even mid-scroll; only the tile's expand
      // waits for the page to settle
      const bc = row && BALL_CLS[row.getAttribute('data-screen-label')];
      if (ball) Object.values(BALL_CLS).forEach((c) => { if (c !== bc) ball.classList.remove(c); });
      if (bc && ball) ball.classList.add(bc);
      if (row && !TOUCH && performance.now() < fastUntil) row = null;
      if (row === hoverRow) return;
      if (hoverRow) {
        const prev = HOVER.get(hoverRow);
        if (prev) prev.leave();
      }
      hoverRow = row;
      if (row) {
        const p = pt || this._pt;
        const nxt = HOVER.get(row);
        if (nxt) nxt.enter(p ? { clientX: p.x, clientY: p.y } : null);
      }
    };
    this._syncHover = () => {
      if (TOUCH) {
        // after the first tap the finger's point acts as the cursor: scrolling slides tiles under it
        // exactly like a mouse resting on a trackpad scroll, so the sketch follows (or clears) the
        // same way it does on desktop
        if (!armed) return;
        if (tapPt) {
          const r = rowAt(tapPt);
          if (r !== armed) { armed = r; setHover(r, tapPt); }
          if (!r) tapPt = null;
        } else {
          const b = armed.getBoundingClientRect();
          if (b.bottom < 0 || b.top > innerHeight) { armed = null; setHover(null, null); }
        }
        return;
      }
      setHover(rowAt(this._pt), this._pt);
    };
    if (TOUCH) document.addEventListener('click', (e) => {
      if (armed && !e.target.closest('.vg-row')) { armed = null; tapPt = null; setHover(null, null); }
    }, true);
    let hoverRafPending = false;
    const queueSync = () => {
      if (hoverRafPending) return;
      hoverRafPending = true;
      requestAnimationFrame(() => { hoverRafPending = false; if (!window.__vgBusy) this._syncHover(); });
    };
    window.addEventListener('scroll', queueSync, { passive: true });
    window.addEventListener('wheel', queueSync, { passive: true });
    if (TOUCH) window.addEventListener('touchmove', queueSync, { passive: true });
    window.addEventListener('resize', queueSync);
  }
  componentWillUnmount() {
    if (this._io) this._io.disconnect();
    if (this._heroIntro) clearTimeout(this._heroIntro);
    if (this._flowRaf) cancelAnimationFrame(this._flowRaf);
    if (this._flowFit) window.removeEventListener('resize', this._flowFit);
    if (this._sync) { window.removeEventListener('scroll', this._sync); window.removeEventListener('resize', this._sync); }
    if (this._movePill) window.removeEventListener('resize', this._movePill);
    if (this._smoothScroll) this._smoothScroll();
    (this._handlers || []).forEach(([row, enter, leave]) => {
      row.removeEventListener('mouseenter', enter);
      row.removeEventListener('mouseleave', leave);
    });
  }
  renderVals() {
    const videoUrl = this.props.heroVideo ?? 'assets/videos/Sequence 01-6311139a.mp4';
    this._videoRef = this._videoRef || ((el) => {
      if (!el) return;
      const wire = () => {
        const url = this.props.heroVideo ?? (window.__resources && window.__resources.heroVideo) ?? 'assets/videos/Sequence 01-6311139a.mp4';
        if (el.getAttribute('src') !== url) {
          el.setAttribute('src', url);
          el.muted = true; el.loop = true; el.playsInline = true; el.setAttribute('playsinline', '');
          const p = el.play(); if (p && p.catch) p.catch(() => {});
        }
      };
      wire();
      // standalone bundle: upgrade to the inlined blob once resources finish unpacking
      let tries = 0;
      const t = setInterval(() => { wire(); if (++tries > 40 || (window.__resources && window.__resources.heroVideo)) clearInterval(t); }, 250);
    });
    return { videoUrl, hasVideo: !!videoUrl, videoRef: this._videoRef };
  }
}


var __app = new Component();
function __boot() { if (__app.componentDidMount) __app.componentDidMount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot); else __boot();
window.addEventListener('pagehide', function () { if (__app.componentWillUnmount) __app.componentWillUnmount(); });
})();
