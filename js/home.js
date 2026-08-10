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
    let heroSettled = false;
    const heroTick = () => {
      if (!title || !hero) return;
      if (window.scrollY > hero.offsetHeight + 200) { if (heroSettled) return; heroSettled = true; } else heroSettled = false;
      const range = Math.max(1, hero.offsetHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, window.scrollY / range));
      const e = smooth(p);
      const box = title.closest('div');
      const boxH = box ? box.offsetHeight : window.innerHeight;
      // clamp from the title's static (untransformed) top so it never slides under the nav
      const staticTop = title.offsetTop;
      const boxTop = box ? box.getBoundingClientRect().top : 0;
      const navClear = Math.max(0, 74 - boxTop); // fixed nav ≈58px + margin, minus how far the box has scrolled up
      const maxUp = Math.max(0, staticTop - navClear);
      const off = Math.min(boxH * 0.25, maxUp);
      title.style.transform = 'translateY(' + (-off * (1 - e)).toFixed(1) + 'px)';
      title.style.opacity = (0.4 + 0.6 * e).toFixed(3);
      const se = smooth(Math.max(0, Math.min(1, (p - 0.3) / 0.5)));
      if (sub) {
        sub.style.opacity = se.toFixed(3);
        sub.style.transform = 'translateY(' + (22 * (1 - se)).toFixed(1) + 'px)';
        sub.style.letterSpacing = (0.55 - 0.27 * se).toFixed(3) + 'em';
      }
      if (arrow) arrow.style.opacity = (1 - Math.min(1, p / 0.2)).toFixed(3);
    };
    document.querySelectorAll('.vg-rise > span').forEach((l, i) => { l.style.animationDelay = (0.35 + i * 0.13) + 's'; });
    // fetch silhouettes at top priority before the video hogs bandwidth
    ['bitl', 'mobius', 'strahl', 'watchmaker'].forEach((k) => {
      const im = new Image(); im.fetchPriority = 'high'; im.src = 'assets/images/' + k + '-silhouette.png';
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
    ['bitl', 'mobius', 'strahl', 'watchmaker'].forEach((k) => {
      const w = document.createElement('div');
      w.id = 'vg-ball-warm-' + k;
      w.className = 'vg-ball-' + k;
      w.style.cssText = 'position:fixed;left:-500px;top:-500px;width:150px;height:80px;z-index:-1;opacity:0.01;transition:none';
      const m = "url('assets/images/" + k + "-silhouette.png') center / contain no-repeat";
      w.innerHTML = '<div class="vg-ball-inner" style="transition:none;width:100%;height:100%;background:#fff;-webkit-mask:' + m + ';mask:' + m + '"></div>';
      document.body.appendChild(w);
    });
    // soft entrance on load, then direct 1:1 scroll control
    title.style.transition = 'none';
    if (sub) sub.style.transition = 'opacity 1.4s ease 0.2s, transform 1.4s ease 0.2s';
    requestAnimationFrame(() => requestAnimationFrame(heroTick));
    this._heroIntro = setTimeout(() => {
      title.style.transition = 'none';
      if (sub) sub.style.transition = 'none';
    }, 1700);
    scrollJobs.push(sync);
    scrollJobs.push(heroTick);
    const onResize = () => { sizeWins(); sync(); heroTick(); };
    this._sync = onScrollShared;
    this._resize = onResize;
    window.addEventListener('scroll', onScrollShared, { passive: true });
    window.addEventListener('resize', onResize);
    // preload leak images so the expand never paints mid-decode
    document.querySelectorAll('[data-wire]').forEach((r) => { const i = new Image(); i.src = (window.__resources && r.dataset.wireRes && window.__resources[r.dataset.wireRes]) || r.dataset.wire; });
    document.querySelectorAll('[data-leak-img]').forEach((r) => { const i = new Image(); i.src = (window.__resources && r.dataset.leakRes && window.__resources[r.dataset.leakRes]) || r.dataset.leakImg; });
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
    // Scrolling is fully native. An eased wheel handler used to run here; it made every notch
    // drift to a stop, which reads as a bounce-back, so the page now never touches the scroll path.
    {
      const readerEl = () => document.getElementById('vg-reader');
      const blockScroll = (e) => { if (!readerEl()) e.preventDefault(); };
      this._lockScroll = (on) => {
        this._scrollLocked = on;
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
            });
            if (center) { center.style.opacity = '1'; center.style.transform = 'scale(1)'; }
          } else {
            dots.forEach((d) => { d.style.transform = 'none'; d.style.borderRadius = '999px'; });
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
      tabsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.vg-tab');
        if (!btn) return;
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
      idx.querySelectorAll('.vg-idx-head, .vg-idx-item').forEach((el, i) => { el.style.transitionDelay = (0.15 + i * 0.07) + 's'; });
      const tabsSec = document.querySelector('[data-screen-label="Category tabs"]');
      const onIdxScroll = () => {
        if (idxShown) return;
        const due = tabsSec ? tabsSec.getBoundingClientRect().top < window.innerHeight * 0.9 : (stmt && stmt.getBoundingClientRect().bottom < window.innerHeight * 0.4);
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
        const tab = document.querySelector('#vg-tabs .vg-tab[data-cat="' + (b ? b.dataset.cat : 'all') + '"]');
        document.body.style.overflow = '';
        if (tab) tab.click();
        // jump behind the frosted glass so the tabs bar is on screen for the sort
        const sec = document.querySelector('[data-screen-label="Category tabs"]');
        if (sec) {
          const prev = document.documentElement.style.scrollBehavior;
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(0, window.scrollY + sec.getBoundingClientRect().top - window.innerHeight * 0.24);
          document.documentElement.style.scrollBehavior = prev;
        }
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
    const warmPages = () => {
      [['mobius.html', 'assets/images/mobius/cover.png'], ['bitl.html', 'assets/images/bitl/p00.png']].forEach(([page, first]) => {
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
      '#mobius': { bg: '#f6e9d2', ink: '#131313', label: 'M\u00d6BIUS', first: 'assets/images/mobius/cover.png',
        imgs: [{ src: 'assets/images/mobius/cover.png', w: 1680, h: 1127 }].concat(Array.from({ length: 12 }, (_, i) => ({
          src: 'assets/images/mobius/p' + String(i).padStart(2, '0') + '.png', w: 1680, h: i === 11 ? 1885 : 1893 }))) },
      // pages 1-2 come from js/bitl-live.js: the same flat artwork plus the cursor glow and the
      // statement break. The strip picks up at p02.
      '#bitl': { bg: '#000000', ink: '#f4f4f4', label: 'BITL', first: 'assets/images/bitl/p00.png', hero: 'bitl',
        imgs: Array.from({ length: 14 }, (_, k) => { const i = k + 2; const it = { src: 'assets/images/bitl/p' + String(i).padStart(2, '0') + '.png', w: 2745,
          h: i < 7 ? 1839 : i === 7 ? 1830 : i < 15 ? 1930 : 1922 };
          // the mood-board page leaves an empty column under its first image: the caption sits there,
          // and the line that turns the argument follows the page before the re-mood board
          if (i === 2) {
            it.caption = "My first references of 90's design with a modern take were elegant, beautiful and marketable in their own way...";
            it.after = 'But I am not here to design SAFE.';
          }
          // p03 carries the re-mood board and the top of the timeline in one page: it is split so the
          // note about the new board can sit between them with room to breathe
          if (i === 3) return [{ src: 'assets/images/bitl/p03a.png', w: 2745, h: 1460,
              body: ['Being my second year in design and a **passion project**. I knew this is the time i can play a lot more with **my designs**. I wanted to express myself as a designer and take **design decisions** to extents that would be difficult to bring in the **real world**.',
                'The challenge with this project was to do so while being **industry level** and **manufacturable**.'] },
            { src: 'assets/images/bitl/p03b.png', w: 2745, h: 379 }];
          // p04 carries the tail of the timeline and the first sketch slide; p04-p07 hold the four
          // sketch slides, which run as one auto-playing carousel instead of four scrolled pages
          if (i === 4) return [{ src: 'assets/images/bitl/p04top.png', w: 2745, h: 1164 },
            { carousel: [1, 2, 3, 4].map((k) => 'assets/images/bitl/sketch' + k + '.png'), w: 2745, h: 1545 },
            { gap: true }];
          if (i === 5 || i === 6 || i === 7) return [];
          return it; }).flat() }
    };
    this._projects = PROJECTS;
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
      const makeCarousel = (it) => {
        const root = document.createElement('div');
        root.style.cssText = 'position:relative;width:100%;overflow:hidden;background:#000;line-height:0;' +
          'font-size:0;aspect-ratio:' + it.w + '/' + it.h;
        const slides = it.carousel.map((src, idx) => {
          const im = document.createElement('img');
          im.src = src; im.alt = ''; im.width = it.w; im.height = it.h; im.decoding = 'async';
          if (idx) im.loading = 'lazy';
          im.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;' +
            'transform:translateX(' + (idx ? 100 : 0) + '%);transition:transform 0.75s cubic-bezier(0.65,0,0.35,1)';
          root.appendChild(im);
          return im;
        });
        let cur = 0, hovering = false;
        const go = (next, dir) => {
          next = (next + slides.length) % slides.length;
          if (next === cur) return;
          const a = slides[cur], b = slides[next];
          b.style.transition = 'none';
          b.style.transform = 'translateX(' + (dir > 0 ? 100 : -100) + '%)';
          void b.offsetWidth;
          b.style.transition = '';
          a.style.transform = 'translateX(' + (dir > 0 ? -100 : 100) + '%)';
          b.style.transform = 'translateX(0)';
          cur = next;
          dots.forEach((d, k) => { d.style.background = k === cur ? '#f3323f' : 'rgba(255,255,255,0.32)'; });
        };
        const arrow = (side) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', side === 'left' ? 'Previous sketch' : 'Next sketch');
          b.textContent = side === 'left' ? '\u2039' : '\u203a';
          b.style.cssText = 'position:absolute;top:50%;' + side + ':2.2%;transform:translateY(-50%);width:56px;' +
            'height:56px;border-radius:50%;border:1px solid rgba(255,255,255,0.28);background:rgba(0,0,0,0.55);' +
            'color:#fff;font-size:30px;line-height:1;cursor:pointer;opacity:0;transition:opacity 0.25s ease;' +
            'display:flex;align-items:center;justify-content:center;padding:0 0 4px;z-index:3;backdrop-filter:blur(4px)';
          b.addEventListener('click', (e) => { e.preventDefault(); go(cur + (side === 'left' ? -1 : 1), side === 'left' ? -1 : 1); });
          root.appendChild(b);
          return b;
        };
        const prev = arrow('left'), next = arrow('right');
        const rail = document.createElement('div');
        rail.style.cssText = 'position:absolute;left:0;right:0;bottom:3.2%;display:flex;justify-content:center;' +
          'gap:10px;z-index:3';
        const dots = slides.map((_, k) => {
          const d = document.createElement('button');
          d.type = 'button'; d.setAttribute('aria-label', 'Sketch ' + (k + 1));
          d.style.cssText = 'width:9px;height:9px;padding:0;border:0;border-radius:50%;cursor:pointer;background:' +
            (k ? 'rgba(255,255,255,0.32)' : '#f3323f');
          d.addEventListener('click', () => go(k, k > cur ? 1 : -1));
          rail.appendChild(d);
          return d;
        });
        root.appendChild(rail);
        root.addEventListener('mouseenter', () => { hovering = true; prev.style.opacity = '1'; next.style.opacity = '1'; });
        root.addEventListener('mouseleave', () => { hovering = false; prev.style.opacity = '0'; next.style.opacity = '0'; });
        const timer = setInterval(() => {
          if (!document.body.contains(root)) return clearInterval(timer);
          if (hovering) return;
          const r = root.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) return; // only advance while it is on screen
          go(cur + 1, 1);
        }, 4000);
        return root;
      };

      const risers = [];
      p.imgs.forEach((it, i) => {
        if (it.gap) { const g = document.createElement('div');
          g.style.cssText = 'width:100%;background:#000;height:34vh'; strip.appendChild(g); return; }
        if (it.carousel) { strip.appendChild(makeCarousel(it)); return; }
        const im = document.createElement('img');
        im.src = it.src; im.alt = '';
        im.width = it.w; im.height = it.h; // reserve layout up front: no late jump in scroll height
        if (i > 1) im.loading = 'lazy'; else im.fetchPriority = i === 0 ? 'high' : 'auto';
        im.decoding = 'async';
        im.style.cssText = 'display:block;width:100%;height:auto;margin-bottom:-1px';
        if (it.caption) {
          const holder = document.createElement('div');
          holder.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0';
          holder.appendChild(im);
          const cap = document.createElement('p');
          cap.textContent = it.caption;
          cap.style.cssText = "position:absolute;left:2%;bottom:5%;width:27%;margin:0;font-family:Outfit," +
            "'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:400;font-size:clamp(13px,1.35vw,30px);" +
            'line-height:1.45;letter-spacing:0.005em;color:rgba(244,244,244,0.82);text-wrap:pretty';
          holder.appendChild(cap);
          strip.appendChild(holder);
        } else strip.appendChild(im);
        if (it.body) {
          const sec = document.createElement('section');
          sec.style.cssText = 'width:100%;background:#000;display:flex;flex-direction:column;gap:2.4rem;' +
            'align-items:center;padding:26vh 8vw;line-height:1.5;margin-top:-2px;position:relative;font-size:16px;' +
            'box-sizing:border-box';
          it.body.forEach((t) => {
            const par = document.createElement('p');
            // **phrase** marks the words that carry the point
            t.split(/\*\*/).forEach((seg, k) => {
              if (!seg) return;
              if (k % 2) {
                const b = document.createElement('strong');
                b.textContent = seg; b.style.cssText = 'font-weight:700;color:#fff';
                par.appendChild(b);
              } else par.appendChild(document.createTextNode(seg));
            });
            par.style.cssText = "margin:0;max-width:1000px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;" +
              'font-weight:400;font-size:clamp(15px,1.35vw,28px);line-height:1.6;letter-spacing:0.005em;' +
              'color:rgba(244,244,244,0.86);text-wrap:pretty;text-align:center';
            sec.appendChild(par);
          });
          strip.appendChild(sec);
        }
        if (it.after) {
          const brk = document.createElement('section');
          brk.style.cssText = 'position:relative;width:100%;background:#000;display:flex;align-items:center;' +
            'justify-content:center;padding:26vh 40px;line-height:1.5;box-sizing:border-box';
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
      const checkRisers = () => {
        for (let i = 0; i < risers.length; i++) {
          const r = risers[i];
          if (r.done) continue;
          const b = r.mask.getBoundingClientRect();
          if (b.height && b.top < innerHeight * 0.86 && b.bottom > 0) {
            r.done = true;
            r.line.style.opacity = '1';
            r.line.style.transform = 'translateY(0)';
            if (r.safe) {
              const s = r.safe;
              // SAFE arrives after the line settles, flickering on like a tube warming up
              setTimeout(() => {
                s.style.transition = 'opacity 0.14s linear,transform 0.5s cubic-bezier(0.19,1,0.22,1)';
                s.style.transform = 'translateY(0) scale(1)';
                [0, 90, 150, 260, 320].forEach((t, k) => setTimeout(() => { s.style.opacity = k % 2 ? '0.15' : '1'; }, t));
                setTimeout(() => { s.style.opacity = '1'; }, 420);
              }, 620);
            }
          }
        }
      };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) risers.forEach((r) => { r.done = true; r.line.style.opacity = '1'; r.line.style.transform = 'translateY(0)'; if (r.safe) r.safe.style.opacity = '1'; });
      this._checkRisers = checkRisers;
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
      };
      if (first) {
        const ready = first.decode ? first.decode() : Promise.resolve();
        ready.then(show, show);
        setTimeout(show, 900);
      } else show();
      const close = (e) => {
        if (e) e.preventDefault();
        this._readerOpen = false;
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
        // 'slice' = the same cover-fit the colour photo uses, so the outlines land on it exactly
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        svg.style.width = '100%'; svg.style.height = '100%';
        // re-frame the drawing to the photo's aspect so both cover-fit to the identical rect
        if (ar) {
          const v = svg.viewBox.baseVal, a0 = v.width / v.height;
          if (Math.abs(a0 - ar) > 0.002) {
            let w = v.width, h = v.height, x = v.x, y = v.y;
            if (ar < a0) { const nh = w / ar; y -= (nh - h) / 2; h = nh; }
            else { const nw = h * ar; x -= (nw - w) / 2; w = nw; }
            svg.setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h);
          }
        }
        const paths = Array.from(svg.querySelectorAll('path, ellipse, circle, rect, polyline, polygon, line'));
        const vb = svg.viewBox.baseVal;
        // cursor (viewport px) -> viewBox units under cover-fit
        const hr = host.getBoundingClientRect();
        const k = Math.max(hr.width / vb.width, hr.height / vb.height);
        const offX = (hr.width - vb.width * k) / 2, offY = (hr.height - vb.height * k) / 2;
        const px = ox == null ? hr.width / 2 : ox - hr.left, py = oy == null ? hr.height / 2 : oy - hr.top;
        const cx0 = (px - offX) / k, cy0 = (py - offY) / k;
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
        scored.forEach((s) => {
          s.p.style.cssText += ';stroke-dasharray:' + s.L + ';stroke-dashoffset:' + s.L + ';opacity:0;transition:none';
        });
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
          // hover = wireframe map: pre-traced crisp line art when available, live edge filter otherwise
          const wireSrc = (window.__resources && row.dataset.wireRes && window.__resources[row.dataset.wireRes]) || row.dataset.wire || src;
          wireA.style.filter = row.dataset.wire ? 'none' : 'url(#vg-edge)';
          wireA.style.background = '#ffffff url("' + wireSrc + '") center / contain no-repeat';
          document.body.classList.add('vg-focus');
          const proj0 = row.closest('.vg-proj');
          if (proj0) proj0.classList.add('vg-focus-row');
          if (row.dataset.trace) {
            wireA.style.background = '#ffffff';
            // möbius reads denser than bitl at the same stroke opacity — knock it back
            const sk0 = document.getElementById('vg-sketch');
            if (sk0) sk0.style.opacity = '1';
            this._sketch(row.dataset.trace, cx, cy, src, row.dataset.traceMode);
          }
          else document.getElementById('vg-sketch').innerHTML = '';
          const bg = 'url("' + src + '") center / cover no-repeat';
          wireBox.style.opacity = '1';
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
        if (posterOpen || this._locked || !srcFor(row)) return;
        e.preventDefault();
        posterOpen = true;
        // hold the page still: no hover teardown, no scroll fighting the growing rectangle
        this._locked = true;
        if (this._ballReset) this._ballReset();
        if (this._lockScroll) this._lockScroll(true);
        const r2 = row.getBoundingClientRect();
        const pt2 = (e && e.clientX != null) ? { x: e.clientX, y: e.clientY } : lastPt;
        const cx2 = pt2 ? pt2.x : r2.left + r2.width / 2;
        const cy2 = pt2 ? pt2.y : Math.max(0, Math.min(window.innerHeight, r2.top + r2.height / 2));
        // click = the tile's own rectangle grows smoothly to fill the screen
        const insetFrom = 'inset(' + r2.top + 'px ' + (window.innerWidth - r2.right) + 'px ' +
          (window.innerHeight - r2.bottom) + 'px ' + r2.left + 'px round 20px)';
        const deck = PROJECTS[row.getAttribute('href')];
        if (deck) full.style.backgroundImage = 'url("' + deck.first + '")';
        full.style.transition = 'none';
        full.style.clipPath = insetFrom;
        full.style.opacity = '1';
        void full.offsetWidth;
        full.style.transition = 'clip-path 1.05s cubic-bezier(0.62, 0, 0.2, 1)';
        full.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
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
        // once the rectangle has filled the screen, hand off to the project page
        const deckFor = PROJECTS[row.getAttribute('href')];
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
              if (this._lockScroll) this._lockScroll(false);
            }, insetTo);
            this._closeReader = close;
          }, 1080);
        }
        else setTimeout(() => { this._locked = false; if (this._lockScroll) this._lockScroll(false); }, 1200);
      };
      const leave = () => {
        leak.style.transition = 'none';
        const r = row.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = Math.max(0, Math.min(window.innerHeight, r.top + r.height / 2));
        leak.style.clipPath = 'circle(0% at ' + cx + 'px ' + cy + 'px)';
        wireBox.style.opacity = '0';
        const sk = document.getElementById('vg-sketch');
        sk.style.transition = 'none'; sk.style.opacity = '1'; sk.style.clipPath = 'none'; sk.innerHTML = '';
        zoom.style.transition = 'none';
        zoom.style.transform = 'scale(1)';
        posterOpen = false;
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
      row.addEventListener('mouseenter', (e) => { setHover(row, { x: e.clientX, y: e.clientY }); });
      row.addEventListener('mouseleave', () => { if (hoverRow === row) setHover(null, null); });
      row.addEventListener('click', reveal);
      this._handlers.push([row, enter, leave]);
    });

    // Hover follows the page, not just the mouse.
    // A trackpad/inertia scroll moves content under a cursor that never fires a mousemove, and the
    // browser's own mouseenter on scroll is unreliable — so we hit-test the last known cursor point
    // against the tile rects on every scroll frame and drive the same enter/leave.
    const BALL_CLS = { 'BitL': 'vg-ball-bitl', 'Mobius': 'vg-ball-mobius', 'StrahL': 'vg-ball-strahl', 'Blind Watchmaker': 'vg-ball-watchmaker' };
    const rowAt = (pt) => {
      if (!pt) return null;
      let found = null;
      HOVER.forEach((_v, row) => {
        if (found) return;
        const r = row.getBoundingClientRect();
        if (pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom) found = row;
      });
      return found;
    };
    const setHover = (row, pt) => {
      // while a project is opening/open the hover layers are owned by the reveal; drop the tracked
      // row so the first hover after it closes counts as a fresh enter
      if (this._locked) { hoverRow = null; return; }
      if (row === hoverRow) return;
      if (hoverRow) {
        const prev = HOVER.get(hoverRow);
        if (prev) prev.leave();
        const c0 = BALL_CLS[hoverRow.getAttribute('data-screen-label')];
        if (c0 && ball) ball.classList.remove(c0);
      }
      hoverRow = row;
      if (row) {
        const p = pt || this._pt;
        const nxt = HOVER.get(row);
        if (nxt) nxt.enter(p ? { clientX: p.x, clientY: p.y } : null);
        const c1 = BALL_CLS[row.getAttribute('data-screen-label')];
        if (c1 && ball) ball.classList.add(c1);
      }
    };
    this._syncHover = () => { setHover(rowAt(this._pt), this._pt); };
    let hoverRafPending = false;
    const queueSync = () => {
      if (hoverRafPending) return;
      hoverRafPending = true;
      requestAnimationFrame(() => { hoverRafPending = false; this._syncHover(); });
    };
    window.addEventListener('scroll', queueSync, { passive: true });
    window.addEventListener('wheel', queueSync, { passive: true });
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
