// Scroll-linked word reveal for text that is baked into flat artwork: the region of the image
// holding the type is covered with the artwork's own background colour, and the same copy is
// re-set as live HTML on top, one word lighting up per scroll step.
// Geometry is authored in image pixels (px within the source artwork) and converted to cqw, so the
// live type tracks the image at any width — in the home reader and on watchmaker.html alike.
(function () {
  'use strict';

  window.vgScrollWords = function (img, cfg) {
    const W = cfg.imgW;
    const cqw = (v) => (v / W * 100).toFixed(4) + 'cqw';

    const holder = document.createElement('div');
    holder.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0';

    // the frame carries the artwork the type is measured against; anything handed in as cfg.above
    // (the page before it) is pinned along with it, so the whole composition holds still.
    const frame = document.createElement('div');
    frame.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0;container-type:inline-size';
    frame.appendChild(img);
    holder.appendChild(frame);
    if (cfg.above) holder.insertBefore(cfg.above, frame);

    // the page pauses on this page while the words play: the artwork sticks to the viewport and the
    // extra height below it is the scroll the animation consumes. Nothing is blocked — the scroll
    // itself is the timeline, so it stays smooth and reverses on the way back up.
    // The hold pushes the artwork down from its static spot, so the wrapper carries the artwork's own
    // background: the space it vacates reads as more of the page rather than a gap.
    const outer = document.createElement('div');
    outer.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0;background:' + (cfg.bg || '#ffffff');
    outer.appendChild(holder);

    const cover = document.createElement('div');
    cover.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;background:' + (cfg.bg || '#ffffff') +
      ';width:' + cqw(cfg.coverW) + ';height:' + cqw(cfg.coverH);
    frame.appendChild(cover);

    const p = document.createElement('p');
    p.style.cssText = 'position:absolute;margin:0;left:' + cqw(cfg.x) + ';top:' + cqw(cfg.y) +
      ';font-family:' + (cfg.font || "'Helvetica Neue',Helvetica,Arial,sans-serif") +
      ';font-weight:400;font-size:' + cqw(cfg.size) + ';line-height:' + (cfg.lh || 1.21) +
      ';letter-spacing:-0.002em;color:' + (cfg.ink || '#131313') + ';white-space:pre;';
    p.innerHTML = cfg.html;
    frame.appendChild(p);

    // wrap every word (leaving <br> and <strong> structure intact) so each can fade on its own
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) return frag.appendChild(document.createTextNode(tok));
            const s = document.createElement('span');
            s.textContent = tok;
            s.style.cssText = 'display:inline-block;opacity:' + (cfg.dim != null ? cfg.dim : 0.16) +
              ';transition:opacity 0.12s linear';
            frag.appendChild(s);
            words.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(p);

    // a hairline rule under the marked phrase, drawn out from its centre once the last word lands
    const strong = p.querySelector('[data-rule]');
    let rule = null;
    if (strong) {
      rule = document.createElement('span');
      rule.style.cssText = 'position:absolute;left:0;right:0;bottom:-0.1em;height:0.035em;' +
        'background:rgba(19,19,19,0.28);transform:scaleX(0);transform-origin:50% 50%;' +
        'transition:transform 0.1s linear;pointer-events:none';
      strong.appendChild(rule);
    }

    // the reveal is scrubbed by the scroll itself: progress is the block's travel up the viewport,
    // so scrolling back down unlights the words and retracts the rule, every time.
    const scroller = cfg.scroller || window;
    const dim = cfg.dim != null ? String(cfg.dim) : '0.16';
    const target = () => (scroller === window ? window : scroller);
    const RULE_AT = 0.86;                                  // rule draws over the last stretch
    const PIN = cfg.pin != null ? cfg.pin : 0.95;           // pause length, in viewports of scroll

    // sticky geometry: hold the artwork so the statement sits low on screen, the way it reads when
    // you arrive at the page, and give the wrapper the extra height the pause spends.
    let range = 1;
    const layout = () => {
      const h = holder.offsetHeight;
      if (!h) return;
      const vh = window.innerHeight;
      // measure the live type rather than the artwork: the pin holds the statement just above the
      // bottom edge, whatever sits above it inside the pinned group
      const textBottom = frame.offsetTop + p.offsetTop + p.offsetHeight;
      holder.style.position = 'sticky';
      holder.style.top = Math.round(vh - textBottom - 14) + 'px';
      range = Math.round(vh * PIN);
      outer.style.height = (h + range) + 'px';
    };

    let last = -1;
    const step = () => {
      const h = holder.offsetHeight;
      if (!h) return;
      if (outer.offsetHeight - h !== range) layout();
      const top = parseFloat(holder.style.top) || 0;
      const t = Math.max(0, Math.min(1, (top - outer.getBoundingClientRect().top) / range));
      if (Math.abs(t - last) < 0.002) return;
      last = t;
      const n = t * words.length;
      for (let i = 0; i < words.length; i++) {
        // a soft edge: the word being crossed fades in partway rather than snapping on
        const v = Math.max(0, Math.min(1, n - i));
        words[i].style.opacity = v ? String(+dim + (1 - +dim) * v) : dim;
      }
      if (rule) {
        const u = Math.max(0, Math.min(1, (t - RULE_AT) / (1 - RULE_AT)));
        rule.style.transform = 'scaleX(' + u.toFixed(3) + ')';
      }
    };
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; step(); });
    };
    target().addEventListener('scroll', onScroll, { passive: true });
    if (scroller !== window) window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { layout(); onScroll(); });
    if (img.complete) layout(); else img.addEventListener('load', () => { layout(); step(); });
    requestAnimationFrame(() => { layout(); step(); });
    holder.__vgStep = step;
    return outer;
  };

  // the watchmaker opening statement, measured off assets/images/watchmaker/p00.png (2880x1632)
  window.VG_WATCHMAKER_WORDS = {
    imgW: 2880, imgH: 1632, x: 130, y: 105, size: 67, lh: 1.209, coverW: 1440, coverH: 600, textBottom: 540,
    bg: '#ffffff', ink: '#131313', dim: 0.16,
    html: 'For generations, watchmakers designed<br>complications for the blind,<br>&nbsp;<br>' +
      'This project begs a different question:<br>Who designs for the <strong data-rule="1" style="font-weight:700;position:relative">blind watchmaker</strong>?'
  };
})();
