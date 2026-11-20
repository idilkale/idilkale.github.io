# İdil Kale · Portfolio

Source for [idilkale.com](https://www.idilkale.com): UI/UX & product designer and human-AI interaction researcher.

Plain HTML, CSS and JavaScript, served by GitHub Pages. No build step.

## Structure

| Page | File |
|---|---|
| Home | `index.html` |
| My Works (case studies + side projects) | `works.html` |
| My Research | `research.html` |
| My Path (education, experience, toolbox) | `path.html` |
| Case studies | `rts.html`, `signature.html`, `armoni.html`, `vr-lab.html`, `unisphere.html` |
| Side projects | `friend.html`, `hepsisurada.html`, `crexrtive.html`, `digital-sun.html`, `crisis-type.html`, `catastrophe.html`, `the-ocean.html`, `monogram.html` |

- `site.css`: the whole design system (tab nav, type, bands, case-study blocks, galleries).
- `site.js`: back-to-top, the "Who I am" carousel, the side-project gallery and the skills tabs.
- `assets/`: images made for this design (portrait cut-out, share image, web-sized Armoni mockups).
- Project folders (`RTS/`, `SIGnature/`, `armoni/`, …) hold the original project media.
- `about.html`, `playground.html`, `fontplay.html`, `works-ui-ux.html`, `works-other.html` only redirect old links to the new pages.

## Design tokens

Colors live as CSS variables at the top of `site.css` (`--band` berry, `--display` pink, `--paper`, `--ink`).
Keep body text on the berry band light (`--band-ink`); dark text there fails contrast.

Fonts: League Gothic (display), Newsreader (serif), IBM Plex Mono (labels), General Sans (body).
