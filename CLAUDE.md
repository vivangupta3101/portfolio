# Vivan Gupta — Portfolio site

Static site. No build step, no dependencies, no framework. Plain HTML + CSS + vanilla JS.
Open with any static server (VS Code Live Server, `python3 -m http.server`). It will **not**
work from `file://` because of relative asset paths + fetches.

---

## 1. File map

```
index.html          Home. Hero + category tabs + project tiles + in-page project reader.
backstage.html      3-column masonry of 67 behind-the-scenes photos.
about.html          Rotating-place headline, manifesto, Currently, Tools, black contact footer.
mobius.html         Standalone Möbius project page (13 PDF strips).
bitl.html           Standalone BitL project page (16 PDF strips).

css/home.css        Home only. Everything scroll/cursor/tile related lives here.
css/backstage.css   css/about.css   css/mobius.css   css/bitl.css

js/home.js          ~900 lines. The only non-trivial script. See §3.
js/backstage.js     Masonry + lazy load + caption reveal.
js/about.js         Cursor + text rise + rotating-place headline + photo cursor window.
js/mobius.js        js/bitl.js   Cursor only.

assets/images/      67 backstage photos, tile stills, PDF strips (mobius/, bitl/), silhouettes.
assets/icons/       Traced SVG line art used for the hover sketch effect.
assets/videos/      Hero video.
assets/fonts/       neuzeit-grotesk.
```

Every page is self-contained: one HTML, one CSS, one JS. There is **no shared stylesheet or
shared JS module** — this is deliberate (no bundler), so a fix to the cursor or the scroll
behaviour has to be applied per page. Copy/paste is the intended mechanism.

Each JS file has the same shape:

```js
(function () {
  "use strict";
  class Component {
    componentDidMount() { /* everything */ }
    componentWillUnmount() { /* teardown */ }
  }
  var __app = new Component();
  // booted on DOMContentLoaded, torn down on pagehide
})();
```

This is a leftover of the authoring environment. It is just an IIFE with a lifecycle pair —
treat `componentDidMount` as `main()`. Don't try to "modernise" it into modules unless you
also want to add a server/bundler; the site is hosted as flat files.

---

## 2. Conventions worth knowing before editing

- **Styles are mostly inline in the HTML.** The `.css` files hold only what inline styles
  can't express: pseudo-states, `@keyframes`, `@font-face`, blend modes, `!important`
  overrides, and media queries. If you change a colour and nothing happens, look for an
  `!important` rule in the CSS file — those win.
- **`css/*.css` `url()` paths are relative to the CSS file, not the document.** So it's
  `url('../assets/images/x.png')` in CSS but `assets/images/x.png` in HTML and in JS-built
  inline styles. This exact mistake once silently killed the custom cursor: a failed
  `mask-image` hides the element completely, with no console error.
- **`data-screen-label="Mobius"` / `"BitL"` / `"StrahL"` / `"Blind Watchmaker"`** on each
  tile is the key everything else looks up by. Don't rename.
- **Class prefixes:** `vg-` on the home page, `pg-` on the sub-pages. Same ideas, different
  namespaces.
- ID `vg-ball` / `pg-ball` is the custom cursor. `vg-reader` is the project overlay.
- Anything with `data-wire`, `data-trace`, `data-leak`, `data-leak-img` feeds the hover
  sketch + expand animation on a tile.

---

## 3. `js/home.js` — what each part does

Read in this order; it's roughly the file order.

### a. Reveal-on-scroll
`IntersectionObserver` adds `.vg-in` to `.vg-reveal`, then unobserves. Cheap, leave alone.

### b. `.vg-win` parallax  ← performance-critical
Each tile contains a `.vg-win` div holding a full-viewport background image. The div is
sized to `100vw × 100vh` and translated so the image stays anchored to the *viewport*, not
the tile — the tile becomes a moving window onto a fixed image.

Rules for touching this code:
- Size (`width`/`height`) is set **only on resize**, never per frame.
- Position is `transform: translate3d()` — **never `left`/`top`** (those trigger layout).
- All `getBoundingClientRect()` reads happen in one loop, all writes in a second loop.
  Interleaving them is layout thrash and was the original source of scroll jitter.
- Tiles more than one viewport away are skipped.

### c. `scrollJobs` — the single scroll scheduler
There is exactly **one** `scroll` listener on `window`. It coalesces into one
`requestAnimationFrame`, which runs every function pushed onto `scrollJobs`
(parallax sync, hero choreography, custom scrollbar).

**If you add scroll-reactive behaviour, push it onto `scrollJobs`. Do not add a new
`window.addEventListener('scroll', …)`.** Multiple scroll listeners each doing DOM reads is
what made the site lag for users on slower machines.

### d. `lite` mode — the perf escape hatch
Two effects are expensive: four full-viewport background layers, and a `backdrop-filter:
blur()` on the fixed nav (re-blurs on every scroll frame). Both are dropped when:

- `(hover: none)` — a real touch device, **or**
- `navigator.hardwareConcurrency <= 4`, **or**
- `prefers-reduced-motion: reduce`.

Two earlier triggers were **removed**, and shouldn't come back in the same form:

- `(pointer: coarse)` — also matches touchscreen laptops, which are perfectly capable.
  Use `(hover: none)` to mean "touch device".
- A startup FPS probe over the first 1.5s — that window is exactly when the hero video and
  four large JPEGs are decoding, so it labelled fast machines slow and permanently stripped
  the hover sketch and cursor morph. If you want an adaptive downgrade, sample a steady-state
  window well after `load`, and make it reversible.

That adds `.vg-lite` to `<html>`; the fallback rules are at the bottom of `css/home.css`.
On touch, the custom cursor and fake scrollbar are hidden and the native cursor returns
(see the `@media (pointer: coarse)` block).

**Any new expensive effect should have a `html.vg-lite` opt-out.**

### e. Glide scrolling — read this before touching the wheel handler
A mouse wheel fires **discrete notches** (`deltaY` ≈ ±100), which the browser applies as
jumps. That is what reads as "step by step" jitter. A trackpad or touchscreen fires many
small deltas and already glides natively with real momentum.

So the wheel handler eases **only the notches**:

```js
const isNotch = (e) => e.deltaMode === 1 || Math.abs(e.deltaY) >= 45;
```

- notch → `preventDefault()`, lerp `window.scrollTo()` toward a target (ease 0.16)
- anything else → `return` immediately, native scroll handles it untouched
- `lite` devices never get the listener attached at all

**The trap:** `html` has `scroll-behavior: smooth` for anchor links. While we drive the
position ourselves we force `scrollBehavior = 'auto'` and restore it when the lerp settles.
Without that, every `scrollTo()` frame starts its own competing smooth animation and the
result is *worse* jitter than doing nothing. An earlier version had exactly this bug.

Do not blanket-hijack all wheel events — that's what made the site lag for users on slower
machines, because it serialises every scroll frame through the JS main thread.

`this._lockScroll(true)` additionally attaches a temporary `preventDefault` on
`wheel`/`touchmove` while a project tile is mid-expand, removed straight after.

The reader overlay (`#vg-reader`) runs the same logic against its own `scrollTop`. Whether a
project is open is decided by `document.getElementById('vg-reader')`, **not** by the
`this._readerOpen` flag — that flag is assigned on a different `this` in one code path, and
trusting it made the reader completely unscrollable. Same for the `_lockScroll` blocker: the
page lock stays on for as long as a project is open, so it must skip events while the overlay
exists or it swallows the overlay's own scroll.

The custom cursor is centred with a trailing `translate(-50%,-50%)` in the same transform,
never by subtracting `offsetWidth/2`. Percentages resolve against the element's live size, so
it stays centred through the 0.8s silhouette morph. Sampling `offsetWidth` on an interval
instead made it jump ~20px mid-morph.
The sub-pages carry a trimmed copy of this (a `_glide()` method or an inline block).

### f. Custom cursor (`#vg-ball`)
A white 22px circle with `mix-blend-mode: difference`, `z-index: 2147483000`, followed by a
lerp in `requestAnimationFrame`.

- On hover over a tile it morphs into that project's silhouette via `mask-image`
  (`assets/images/<project>-silhouette.png`), sized per project in `css/home.css`.
- The four `#vg-ball-warm-*` divs are off-screen pre-warmers so the first hover doesn't
  stall while a mask decodes. They carry the mask inline (document-relative path).
- The loop caches `offsetWidth` and re-measures on a 120ms interval. **Never read
  `offsetWidth`/`getBoundingClientRect()` inside a per-frame loop** — that's a forced
  reflow 60×/sec.

### g. Hover sketch (`data-trace`)
On hover, an SVG line drawing is revealed outward from the cursor. Two modes:
`stroke-dashoffset` inking for real strokes, and a `clip-path: circle()` creep for artwork
whose "strokes" are filled outlines (looks jagged as dashes). Path lengths and centres are
precomputed during idle and baked in, so first hover costs ~3–4ms.

### h. Tile expand + reader
Clicking a tile grows it to fullscreen over ~1.05s, then fades in `#vg-reader` — a
`position: fixed` overlay containing the project's deck as a vertical strip of images.
`width`/`height` are set on every `<img>` so scroll height doesn't jump as images load;
images past the second are `loading="lazy"` + `decoding="async"`.
`BACK` plays the whole thing in reverse. The overlay scrolls natively.

### i. Custom scrollbar (`#vg-sb`)
Fades in near the right edge or on scroll. Draggable. Hidden on touch.

---

## 4. Perf rules of thumb for this codebase

1. One `scroll` listener, coalesced through one rAF. Push to `scrollJobs`.
2. Batch DOM reads, then DOM writes. Never alternate.
3. Animate `transform` and `opacity`. Not `left`, `top`, `width`, `height`.
4. No `offsetWidth` / `getBoundingClientRect()` inside a 60fps loop.
5. Keep `wheel` / `touchmove` listeners passive, or don't attach them.
6. `backdrop-filter` on anything fixed or sticky is expensive during scroll — give it a
   `html.vg-lite` fallback.
7. Test with CPU throttling (DevTools → Performance → 4× or 6× slowdown). The bugs here
   were all invisible at full speed.

---

## 5. Known gaps / TODO

- **Backstage captions are live.** `js/backstage.js` opens with a `CAPTIONS` map keyed by image
  basename (no extension, no `trim-` prefix); a tile's `data-caption` attribute overrides it.
  A missing entry simply shows no caption. The caption trails the cursor dot (`#bs-cap`) and
  flips side/vertical near the viewport edges. The old "67 ITEMS · UNSORTED" label is gone.
- **StrahL and Blind Watchmaker** have tiles, silhouettes and hover art, but no decks and
  no project pages. `mobius.html` / `bitl.html` are the templates to copy.
- **About headline needs eight photos.** The rotating word in "Hi! Vivan here from …" cycles
  eight places; each `.hi-item` carries `data-photo="assets/images/about/place-<name>.jpg"`
  and that photo fills the cursor window on hover (sketch treatment + crop marks). Drop the
  files in `assets/images/about/`: `place-cnc-lab`, `-studio`, `-field`, `-print-lab`,
  `-home-desk`, `-bed`, `-wood-lab`, `-traffic`. The words fan in from 26° below, darken as
  they rise into position over 1.1s, hold 2.8s, then fade upward.
- **About page portrait is a placeholder.**
- Project taglines on the tiles still say "One-line tagline to fill in".
- Sub-pages (`about`, `backstage`, `mobius`, `bitl`) don't have `lite` mode. If any of them
  turns out to lag, port §3d across.
- Deep links: the reader is in-document (`#mobius`), and the standalone `mobius.html` /
  `bitl.html` pages duplicate that content. Two paths to the same material — worth
  consolidating at some point.

---

## 6. Division of labour

Code, performance, refactors, browser bugs → Claude Code, in this repo.
Layout, type, colour, motion feel, new pages/sections → the design tool.

If a design change lands, it arrives as replacement `css/*.css`, `js/*.js` and `*.html`
files. Diff rather than overwrite if you've made code changes in the meantime — the design
side does not see your commits.
