// The problem statement page (p05): the printed heading, statement line and vertical rule are covered
// and re-set live — the sentence in the deck's statement voice (Outfit bold, graphite gradient, rising
// out of a mask, as BitL's "What if" line does) and the rule drawing itself down lower on the page,
// which pushes "Core elements to be solved for" down with it.
(function () {
  'use strict';

  var PAGE_W = 2880, PAGE_H = 1632;
  var SPLIT = 1556;      // above the top half of the "Core elements" heading
  var COVER_TOP = 700, COVER_BOT = 1440;

  function mount(page) {
    var holder = document.createElement('div');
    holder.style.cssText = 'position:relative;width:100%;line-height:0;font-size:0';
    page.parentNode.insertBefore(holder, page);

    var tail = document.createElement('img');
    tail.src = page.getAttribute('src');
    tail.alt = '';
    tail.loading = 'lazy';
    tail.style.cssText = 'display:block;width:100%;height:auto;margin-top:' +
      (-SPLIT / PAGE_W * 100).toFixed(4) + '%';

    var top = document.createElement('div');
    top.style.cssText = 'position:relative;width:100%;overflow:hidden;line-height:0;font-size:0;' +
      'aspect-ratio:' + PAGE_W + '/' + SPLIT;
    page.style.marginBottom = '0';
    top.appendChild(page);
    holder.appendChild(top);

    var pct = function (y) { return (y / SPLIT * 100).toFixed(3) + '%'; };

    // the printed heading goes: the live line carries the page
    var head = document.createElement('div');
    head.style.cssText = 'position:absolute;left:0;right:0;background:#ffffff;top:' + pct(375) +
      ';height:' + pct(180);
    top.appendChild(head);

    // the printed statement and the printed rule under it
    var cover = document.createElement('div');
    cover.style.cssText = 'position:absolute;left:0;right:0;background:#ffffff;' +
      'top:' + pct(COVER_TOP) + ';height:' + pct(COVER_BOT - COVER_TOP) +
      ';display:flex;align-items:center;justify-content:center;padding:0 5vw;box-sizing:border-box';
    var mask = document.createElement('div');
    mask.style.cssText = 'overflow:hidden;max-width:1180px;padding-bottom:0.14em;margin-bottom:-0.14em';
    var line = document.createElement('p');
    line.style.cssText = "margin:0;font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;" +
      'font-size:clamp(26px,3.6vw,64px);line-height:1.18;letter-spacing:-0.015em;text-align:center;' +
      'text-wrap:balance;background:linear-gradient(180deg,#8f8f8f 0%,#3c3c3c 46%,#0c0c0c 100%);' +
      '-webkit-background-clip:text;background-clip:text;color:transparent;transform:translateY(112%)';
    line.textContent = '\u201CHow might we enable visually impaired individuals to independently ' +
      'identify, handle & assemble watch components through non-visual means?\u201D';
    mask.appendChild(line);
    cover.appendChild(mask);
    top.appendChild(cover);

    // the shift: whitespace with the rule drawing down inside it
    var gap = document.createElement('div');
    gap.style.cssText = 'position:relative;width:100%;background:#ffffff;display:flex;' +
      'justify-content:center;padding:min(5vw,132px) 0 min(7vw,190px)';
    var rule = document.createElement('div');
    rule.style.cssText = 'width:1px;height:min(5.3vw,154px);background:rgba(19,19,19,0.45);' +
      'transform:scaleY(0);transform-origin:50% 0;' +
      'transition:transform 0.55s cubic-bezier(0.22,1,0.36,1)';
    gap.appendChild(rule);
    holder.appendChild(gap);

    var bottom = document.createElement('div');
    bottom.style.cssText = 'position:relative;width:100%;overflow:hidden;line-height:0;font-size:0;' +
      'aspect-ratio:' + PAGE_W + '/' + (PAGE_H - SPLIT);
    bottom.appendChild(tail);
    holder.appendChild(bottom);

    var shown = { line: false, rule: false };
    var inView = function (n) {
      var r = n.getBoundingClientRect();
      return r.height && r.top < window.innerHeight * 0.86 && r.bottom > 0;
    };
    var check = function () {
      if (!shown.line && inView(mask)) {
        shown.line = true;
        line.style.transition = 'transform 1.25s cubic-bezier(0.19,1,0.22,1)';
        line.style.transform = 'translateY(0)';
      }
      if (!shown.rule && inView(rule)) {
        shown.rule = true;
        rule.style.transform = 'scaleY(1)';
      }
    };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    requestAnimationFrame(check);
  }

  function boot() {
    var page = document.querySelector('img[src$="watchmaker/p05.png"]');
    if (page) mount(page);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
