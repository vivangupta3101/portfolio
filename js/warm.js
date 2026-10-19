/* Warms the HTTP cache with every project image once the current page has finished loading, so opening any
   project later paints from cache instead of the network. Runs at low priority, two at a time (one on slow links),
   and backs off while a project reader is opening. Skipped entirely when the browser asks to save data. */
(function () {
  'use strict';
  var c = navigator.connection || {};
  if (c.saveData) return;
  var LIST = ["assets/images/bitl/final-a.webp","assets/images/bitl/final-b.webp","assets/images/bitl/hatke-1.webp","assets/images/bitl/hatke-2.webp","assets/images/bitl/hatke-3.webp","assets/images/bitl/hatke-cad-cut.webp","assets/images/bitl/obj-bisleri.webp","assets/images/bitl/obj-dispenser.webp","assets/images/bitl/obj-dove.webp","assets/images/bitl/obj-orbit.webp","assets/images/bitl/p00.webp","assets/images/bitl/p01.webp","assets/images/bitl/p02.webp","assets/images/bitl/p03.webp","assets/images/bitl/p03a.webp","assets/images/bitl/p03b.webp","assets/images/bitl/p04.webp","assets/images/bitl/p04top.webp","assets/images/bitl/p05.webp","assets/images/bitl/p06.webp","assets/images/bitl/p07.webp","assets/images/bitl/p08.webp","assets/images/bitl/p09.webp","assets/images/bitl/p10.webp","assets/images/bitl/p10b.webp","assets/images/bitl/p11.webp?v=20261019a","assets/images/bitl/p12.webp","assets/images/bitl/p12c.webp","assets/images/bitl/p13.webp","assets/images/bitl/p13b.webp","assets/images/bitl/p14.webp","assets/images/bitl/p15.webp","assets/images/bitl/p15top.webp","assets/images/bitl/proto-a.webp","assets/images/bitl/proto-b.webp","assets/images/bitl/proto-c.webp","assets/images/bitl/selected-bionic.webp","assets/images/bitl/selected-spacetech.webp","assets/images/bitl/sketch1.webp","assets/images/bitl/sketch2.webp","assets/images/bitl/sketch3.webp","assets/images/bitl/sketch4.webp","assets/images/strahl/p00.webp","assets/images/strahl/p00s.webp","assets/images/strahl/p01.webp","assets/images/strahl/p01s.webp","assets/images/strahl/p02.webp","assets/images/strahl/p03.webp","assets/images/strahl/p04.webp","assets/images/strahl/p05.webp","assets/images/strahl/p06.webp","assets/images/strahl/p07.webp","assets/images/strahl/p08.webp","assets/images/strahl/p09.webp","assets/images/strahl/p10.webp","assets/images/strahl/p11.webp","assets/images/strahl/p12.webp","assets/images/strahl/p13.webp","assets/images/strahl/p14-l0.webp","assets/images/strahl/p14-l1.webp","assets/images/strahl/p14-l2.webp","assets/images/strahl/p14.webp","assets/images/strahl/p15.webp","assets/images/strahl/p16.webp","assets/images/strahl/p17.webp","assets/images/strahl/p18.webp","assets/images/strahl/p19.webp","assets/images/strahl/p20.webp","assets/images/strahl/p21.webp","assets/images/strahl/p22.webp","assets/images/strahl/p23.webp","assets/images/strahl/p24.webp","assets/images/strahl/p25.webp","assets/images/strahl/p26.webp","assets/images/strahl/p27.webp","assets/images/strahl/p28.webp","assets/images/strahl/prod-a.webp","assets/images/strahl/prod-b.webp","assets/images/strahl/prod-c.webp","assets/images/strahl/ring.webp","assets/images/mobius/cover.webp","assets/images/mobius/p00.webp","assets/images/mobius/p01.webp","assets/images/mobius/p02.webp","assets/images/mobius/p03.webp","assets/images/mobius/p04.webp","assets/images/mobius/p05.webp","assets/images/mobius/p06.webp","assets/images/mobius/p07.webp","assets/images/mobius/p08.webp","assets/images/mobius/p09.webp","assets/images/mobius/p10.webp","assets/images/mobius/p11.webp","assets/images/watchmaker/cover.webp","assets/images/watchmaker/p00.webp","assets/images/watchmaker/p01.webp","assets/images/watchmaker/p02.webp","assets/images/watchmaker/p03.webp","assets/images/watchmaker/p04.webp","assets/images/watchmaker/p05.webp","assets/images/watchmaker/p06.webp","assets/images/watchmaker/p07.webp","assets/images/watchmaker/p08.webp","assets/images/watchmaker/p09.webp","assets/images/watchmaker/p10.webp","assets/images/watchmaker/p11.webp","assets/images/adi/p01.webp","assets/images/adi/p02.webp","assets/images/adi/p03.webp","assets/images/adi/p04.webp","assets/images/adi/p05.webp","assets/images/adi/p06.webp","assets/images/adi/p07.webp","assets/images/adi/p10.webp","assets/images/vending/cad.webp","assets/images/vending/hero.webp","assets/images/vending/sketch-form1.webp","assets/images/vending/sketch-form2.webp","assets/images/kirmada/cover.webp"];
  var done = {};
  try { done = JSON.parse(sessionStorage.getItem('vg-warm') || '{}'); } catch (e) {}
  var slow = /(^|-)2g|3g/.test(c.effectiveType || '');
  var i = 0, active = 0;
  var save = function () { try { sessionStorage.setItem('vg-warm', JSON.stringify(done)); } catch (e) {} };
  var next = function () {
    var max = slow ? 1 : 2;
    if (document.getElementById('vg-reader') && active >= 1) { setTimeout(next, 600); return; }
    while (active < max && i < LIST.length) {
      var src = LIST[i++];
      if (done[src]) continue;
      active++;
      (function (s) {
        var im = new Image();
        im.decoding = 'async';
        try { im.fetchPriority = 'low'; } catch (e) {}
        var fin = function () { active--; done[s] = 1; if (i % 8 === 0 || i >= LIST.length) save(); (window.requestIdleCallback || setTimeout)(next); };
        im.onload = fin; im.onerror = fin;
        im.src = s;
      })(src);
    }
  };
  var start = function () { setTimeout(next, 400); };
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
