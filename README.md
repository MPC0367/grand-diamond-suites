# Grand Diamond Suites, a redesign concept

An unofficial redesign concept for the Grand Diamond Suites Hotel website (Pratunam,
Bangkok), made by [O2 Design Studio](https://o2-designstudio.com/).

**This is not the hotel's official website.** The official site is
[granddiamondsuites.com](https://www.granddiamondsuites.com/).

The hotel's name and photographs belong to their owners. Details about the hotel were
compiled by the studio from the hotel's public website and may be out of date. The
photographs are loaded from the image CDN that serves the official website and are not
stored in this repository. The page asks search engines not to index it.

Live preview: https://mpc0367.github.io/grand-diamond-suites/

## What is here

| File | Purpose |
| --- | --- |
| `index.html` | The page, written in English |
| `i18n.js` | Thai strings, swapped in by the EN / ไทย toggle |
| `styles.css` | Design system and layout |
| `main.js` | Menu, booking bar, image lightbox, GSAP motion |
| `scene.js` | The three.js diamond in the hero |

A static site with no build step. GSAP, Lenis and three.js load from jsDelivr, and the
page stays readable and navigable if they fail to load.

## Run it locally

Serve the folder with any static server and open `index.html`.
