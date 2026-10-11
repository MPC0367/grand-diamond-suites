# Grand Diamond Suites, a redesign concept

An unofficial redesign concept for the Grand Diamond Suites Hotel website (Pratunam,
Bangkok), made by [O2 Design Studio](https://o2-designstudio.com/).

**This is not the hotel's official website.** The official site is
[granddiamondsuites.com](https://www.granddiamondsuites.com/).

The hotel's name, logo and photographs belong to their owners. Details about the hotel
were read from the hotel's public website and booking page on 8 October 2026 and may be
out of date. Every page says it is a concept and asks search engines not to index it.

Live preview: https://mpc0367.github.io/grand-diamond-suites/

## What it is

A static website in English and Thai: a home page, six suite pages, a suite comparison,
dining, facilities, location, gallery, offers, contact, questions, privacy, booking terms
and a 404 page. No framework and no third-party script. Fonts, photographs and the street
map are served by the site itself.

The site does not take bookings. Its stay planner builds a link to the hotel's own booking
page that carries the arrival date, the number of nights, the number of adults and the
ages of any children, and nothing else.

## Layout of the repository

| Path | Purpose |
| --- | --- |
| `src/data/` | Hotel facts, the six suites, photographs and nearby places, in English and Thai |
| `src/content/` | Page wording, questions and airport routes |
| `src/i18n/ui.mjs` | Interface words |
| `src/templates/` | HTML templates |
| `src/assets/` | One stylesheet, one script, fonts, logos and the map plates |
| `tools/` | Build, image processing, map drawing, local server and checks |
| `docs/` | The built site. GitHub Pages serves this folder. |

## Build and run

Node 20 or newer.

```bash
node tools/build.mjs
```

```bash
node tools/serve.mjs 8321
```

Then open http://localhost:8321/grand-diamond-suites/

The build checks its own output and stops if a check fails: one H1 per page, headings in
order, no duplicate ids, every image described and sized, every internal link and anchor
resolving, and the same pages in both languages.

Browser checks (every page at ten screen sizes, behaviour, and an axe-core accessibility
scan of every page and dialog) need the tool dependencies and the local server running.
Add `--engine=webkit` to run them in Safari's engine, or `--quick` for two screen sizes:

```bash
npm install
```

```bash
node tools/check.mjs
```

## Photographs and map

The photographs are the hotel's own, taken from its public website and resized for the
web. They are used here for an unofficial concept only. The street map is drawn from
OpenStreetMap data, © OpenStreetMap contributors, available under the Open Database
License.

## Earlier version

The first concept (a single dark page with a three.js diamond) is kept at git tag `v1.0`.
