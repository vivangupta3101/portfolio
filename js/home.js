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
    const move = (e) => { tx = e.clientX; ty = e.clientY; };
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
    // Glide scrolling.
    // A mouse wheel fires discrete notches (deltaY ~100), which the browser applies as jumps —
    // that is the "step by step" jitter. Trackpads and touch already glide natively with real
    // momentum, so we leave those completely alone and only ease the notches.
    // Note: html has scroll-behavior:smooth for anchor links; it MUST be forced to auto while
    // we drive the position ourselves, or every frame starts its own competing smooth animation.
    {
      const root = document.documentElement;
      // the page lock stays on while a project is open — but the reader overlay is what the user
      // is scrolling at that point, so never swallow its events
      // read the overlay from the DOM rather than trusting a flag — the flag is set on a different
      // `this` in one code path, which silently made the reader unscrollable
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

      let target = 0, current = 0, rafId = null, active = false;
      let rEl = null, rTarget = 0, rCurrent = 0, rRaf = null, rActive = false;
      const EASE = 0.16, MIN = 0.4;
      const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
      const stop = () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; active = false; root.style.scrollBehavior = ''; };
      const tick = () => {
        const d = target - current;
        if (Math.abs(d) < MIN) { window.scrollTo(0, target); stop(); return; }
        current += d * EASE;
        window.scrollTo(0, current);
        rafId = requestAnimationFrame(tick);
      };
      const rStop = () => { if (rRaf) cancelAnimationFrame(rRaf); rRaf = null; rActive = false; };
      const rTick = () => {
        if (!rEl) { rStop(); return; }
        const d = rTarget - rCurrent;
        if (Math.abs(d) < MIN) { rEl.scrollTop = rTarget; rStop(); return; }
        rCurrent += d * EASE;
        rEl.scrollTop = rCurrent;
        rRaf = requestAnimationFrame(rTick);
      };
      // a notch = line-mode, or a pixel delta big enough that no trackpad would emit it
      const isNotch = (e) => e.deltaMode === 1 || Math.abs(e.deltaY) >= 45;

      const onWheel = (e) => {
        if (e.ctrlKey || e.defaultPrevented) return;
        const el = readerEl();
        if (el) {
          if (!isNotch(e)) { rEl = el; rStop(); return; }
          e.preventDefault();
          rEl = el;
          if (!rActive) { rActive = true; rTarget = rCurrent = el.scrollTop; }
          const m = e.deltaMode === 1 ? 16 : 1;
          rTarget = Math.max(0, Math.min(Math.max(0, el.scrollHeight - el.clientHeight), rTarget + e.deltaY * m));
          if (rRaf === null) rRaf = requestAnimationFrame(rTick);
          return;
        }
        if (this._scrollLocked) { e.preventDefault(); return; } // tile mid-expand
        if (!isNotch(e)) { stop(); return; } // trackpad / touch: hands off
        e.preventDefault();
        if (!active) { active = true; target = current = window.scrollY; root.style.scrollBehavior = 'auto'; }
        const m = e.deltaMode === 1 ? 16 : 1;
        target = Math.max(0, Math.min(maxScroll(), target + e.deltaY * m));
        if (rafId === null) rafId = requestAnimationFrame(tick);
      };
      // lite devices keep pure native scroll — no main-thread work in the scroll path at all
      if (!lite) window.addEventListener('wheel', onWheel, { passive: false });
      this._smoothScroll = () => { window.removeEventListener('wheel', onWheel); stop(); rStop(); this._lockScroll(false); };
      this._readerScrollSync = () => { if (rRaf === null && rEl) { rTarget = rCurrent = rEl.scrollTop; } };
      this._readerScrollReset = (el) => { rEl = el || null; rStop(); rTarget = rCurrent = el ? el.scrollTop : 0; };
    }
    // nav logo expands leftwards to reveal links
    {
      const logo = document.getElementById('vg-navlogo');
      const links = document.getElementById('vg-navlinks');
      if (logo && links) {
        let open = false;
        const dots = logo.querySelectorAll('.vg-dot');
        const set = (o) => {
          open = o;
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
        row.addEventListener('mouseenter', () => ball.classList.add(cls));
        row.addEventListener('mouseleave', () => ball.classList.remove(cls));
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
        const im = new Image(); im.src = first;
      });
    };
    if (window.requestIdleCallback) window.requestIdleCallback(warmPages, { timeout: 4000 }); else setTimeout(warmPages, 800);
    const PROJECTS = {
      '#mobius': { bg: '#f6e9d2', ink: '#131313', label: 'M\u00d6BIUS', first: 'assets/images/mobius/cover.png',
        imgs: [{ src: 'assets/images/mobius/cover.png', w: 1680, h: 1127 }].concat(Array.from({ length: 12 }, (_, i) => ({
          src: 'assets/images/mobius/p' + String(i).padStart(2, '0') + '.png', w: 1680, h: i === 11 ? 1885 : 1893 }))) },
      '#bitl': { bg: '#0b0406', ink: '#f4f4f4', label: 'BITL', first: 'assets/images/bitl/p00.png',
        imgs: Array.from({ length: 16 }, (_, i) => ({ src: 'assets/images/bitl/p' + String(i).padStart(2, '0') + '.png', w: 2745,
          h: i < 7 ? 1839 : i === 7 ? 1830 : i < 15 ? 1930 : 1922 })) }
    };
    this._projects = PROJECTS;
    this._openProject = (p, onClose, insetTo) => {
      const ov = document.createElement('div');
      ov.id = 'vg-reader';
      ov.style.cssText = 'position:fixed;inset:0;z-index:8000;overflow-y:auto;overflow-x:hidden;background:' + p.bg +
        ';opacity:0;transition:opacity 0.28s ease;-webkit-overflow-scrolling:touch';
      const strip = document.createElement('div');
      strip.style.cssText = 'width:100%;line-height:0;font-size:0';
      p.imgs.forEach((it, i) => {
        const im = document.createElement('img');
        im.src = it.src; im.alt = '';
        im.width = it.w; im.height = it.h; // reserve layout up front: no late jump in scroll height
        if (i > 1) im.loading = 'lazy'; else im.fetchPriority = i === 0 ? 'high' : 'auto';
        im.decoding = 'async';
        im.style.cssText = 'display:block;width:100%;height:auto;margin-bottom:-1px';
        strip.appendChild(im);
      });
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
      ov.addEventListener('scroll', () => { if (this._readerScrollSync) this._readerScrollSync(); }, { passive: true });
      const first = strip.querySelector('img');
      const show = () => { void ov.getBoundingClientRect(); ov.style.opacity = '1'; };
      if (first && !first.complete) { first.onload = show; first.onerror = show; setTimeout(show, 400); }
      else show();
      const close = (e) => {
        if (e) e.preventDefault();
        this._readerOpen = false;
        if (this._readerScrollReset) this._readerScrollReset(null);
        document.removeEventListener('keydown', onKey);
        const target = insetTo && insetTo();
        if (!target) {
          ov.style.opacity = '0';
          setTimeout(() => { ov.remove(); if (onClose) onClose(); }, 300);
          return;
        }
        const fullEl = document.getElementById('vg-full');
        if (!fullEl) { ov.remove(); if (onClose) onClose(); return; }
        // hand the frame the reader is showing to the small #vg-full layer, then drop the
        // reader entirely — a full-viewport scroller of 1680px strips can't be re-rastered
        // per frame, so the shrink has to run on the light layer alone.
        const shown = Array.from(strip.querySelectorAll('img')).find((im) => {
          const b = im.getBoundingClientRect();
          return b.bottom > 1 && b.top < 2;
        }) || strip.querySelector('img');
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
      row.addEventListener('mouseenter', (e) => { if (!this._locked) enter(e); });
      row.addEventListener('mouseleave', (e) => { if (!this._locked) leave(e); });
      row.addEventListener('click', reveal);
      this._handlers.push([row, enter, leave]);
    });
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
