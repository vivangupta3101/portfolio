// The "A world for the blind" statement of the watchmaker deck, set live so it can arrive in order:
// the sentence, then the rule drawing down, then the closing line typing out with its two dots
// blinking. It plays on its own clock the first time it comes into view.
(function () {
  'use strict';

  const TAIL = 'Lets fix that';

  window.vgStatement = function (cfg) {
    const opt = cfg || {};
    const outer = document.createElement('section');
    outer.setAttribute('data-screen-label', 'Watchmaker statement');
    outer.style.cssText = 'position:relative;width:100%;height:74vh;background:#ffffff;line-height:0;font-size:0';

    const frame = document.createElement('div');
    frame.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
      "justify-content:center;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;" +
      'line-height:1.34;color:#131313';
    outer.appendChild(frame);

    const line = document.createElement('p');
    line.style.cssText = 'margin:0;font-size:clamp(20px,2.15vw,62px);font-weight:400;letter-spacing:-0.002em;' +
      'line-height:1.34;opacity:0;transition:opacity 0.45s ease';
    line.appendChild(document.createTextNode('A world for the blind ,Yet no '));
    const bold = document.createElement('strong');
    bold.style.cssText = 'font-weight:700';
    bold.textContent = 'soution';
    line.appendChild(bold);
    line.appendChild(document.createTextNode(' for the blind'));
    line.appendChild(document.createElement('br'));
    line.appendChild(document.createTextNode('to expirience this art.'));
    frame.appendChild(line);

    const rule = document.createElement('div');
    rule.style.cssText = 'width:1px;height:min(5.3vw,154px);margin:min(1.3vw,37px) 0 min(2.7vw,79px);' +
      'background:rgba(19,19,19,0.45);transform:scaleY(0);transform-origin:50% 0;' +
      'transition:transform 0.55s cubic-bezier(0.22,1,0.36,1)';
    frame.appendChild(rule);

    // the tail holds its final width from the start and the typed text is centred inside it, so
    // nothing drifts sideways as the characters land
    const tail = document.createElement('p');
    tail.style.cssText = 'position:relative;margin:0;font-size:clamp(18px,1.95vw,56px);font-weight:400;' +
      'letter-spacing:-0.002em;white-space:pre';
    const ghost = document.createElement('span');
    ghost.textContent = TAIL + '..';
    ghost.style.cssText = 'visibility:hidden';
    tail.appendChild(ghost);
    const live = document.createElement('span');
    live.style.cssText = 'position:absolute;left:50%;top:0;transform:translateX(-50%);white-space:pre';
    const typed = document.createElement('span');
    const dots = document.createElement('span');
    dots.textContent = '..';
    dots.style.opacity = '0';
    live.appendChild(typed);
    live.appendChild(dots);
    tail.appendChild(live);
    frame.appendChild(tail);

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      const timers = [];
      timers.push(setTimeout(() => { line.style.opacity = '1'; }, 120));
      timers.push(setTimeout(() => { rule.style.transform = 'scaleY(1)'; }, 760));
      for (let i = 1; i <= TAIL.length; i++) {
        timers.push(setTimeout(() => { typed.textContent = TAIL.slice(0, i); }, 1300 + i * 34));
      }
      timers.push(setTimeout(() => {
        dots.style.opacity = '1';
        setInterval(() => { dots.style.opacity = dots.style.opacity === '0' ? '1' : '0'; }, 560);
      }, 1300 + TAIL.length * 34 + 140));
    };

    const check = () => {
      const r = outer.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85 && r.bottom > 0) play();
    };
    const scroller = opt.scroller || window;
    scroller.addEventListener('scroll', check, { passive: true });
    if (scroller !== window) window.addEventListener('scroll', check, { passive: true });
    requestAnimationFrame(check);
    return outer;
  };
})();
