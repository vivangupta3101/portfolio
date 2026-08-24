# Vivan Gupta — Portfolio (static export)

Plain HTML / CSS / JS. No build step, no framework, no dependencies.

## Run locally

Open the folder in VS Code and serve it over a local web server (the pages fetch
SVGs with `fetch()`, so `file://` will not work):

    npx serve .
    # or: python3 -m http.server 8000
    # or: VS Code → Live Server extension → "Go Live"

Then open http://localhost:3000 (or whichever port your server prints).

## Deploy

Static host, no configuration needed. Upload the whole folder as-is:

- **GitHub Pages** — push the folder contents to the repo (or a `/docs` folder)
  and enable Pages. `.nojekyll` is included so folders are served verbatim.
- **Cloudflare Pages / Netlify / Vercel** — framework preset "None",
  build command empty, output/publish directory = this folder.

## Structure

    index.html          Home — hero video, marquee, 12 project rows,
                        hover sketch traces, in-page project reader
    backstage.html      Backstage — 67-photo masonry collage, cursor-trailing captions
    watchmaker.html     Blind Watchmaker — cover + 12-page deck
    about.html          About — rotating-place headline, manifesto, contact footer
    mobius.html         Möbius deck (also opens in-page from the home grid)
    bitl.html           BitL deck (ditto)

    css/<page>.css      One stylesheet per page (@font-face, keyframes, resets)
    js/<page>.js        One script per page (all interaction and animation)

    assets/images/      Photos, logos, silhouettes, deck strips
      mobius/           Möbius deck page renders
      bitl/             BitL deck page renders
    assets/videos/      Hero background video
    assets/icons/       Hand-drawn SVG line artwork used by the hover traces
    assets/fonts/       See note below

All paths are relative — the site works from a subdirectory
(e.g. `username.github.io/portfolio/`) without changes.

## Fonts

Loaded from CDNs, so `assets/fonts/` is empty by design:

- **Jost** and **Press Start 2P** — Google Fonts (`<link>` in each page head)
- **neuzeit-grotesk** — Adobe Typekit (`@font-face` in `css/home.css`)

To self-host, drop the font files into `assets/fonts/` and repoint the
`@font-face` `src` in the stylesheet.

## Notes

- Each page's JavaScript is a single `Component` class; `componentDidMount()`
  runs on `DOMContentLoaded`. Behaviour, timing and easing are unchanged from
  the source design.
- Clicking a project on the home page opens the deck **in-page** (expanding
  rectangle → scrollable reader → shrinking rectangle on BACK).
  `mobius.html` and `bitl.html` are the same decks as standalone pages.
- Some image filenames contain spaces; browsers and all four hosts above
  handle them. Rename them only if you also update the references in
  `backstage.html`.
