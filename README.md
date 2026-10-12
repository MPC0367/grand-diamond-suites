# Grand Diamond Suites, a redesign concept

An unofficial redesign concept for the Grand Diamond Suites Hotel website (Pratunam,
Bangkok), made by [O2 Design Studio](https://o2-designstudio.com/).

**This is not the hotel's official website.** The official site is
[granddiamondsuites.com](https://www.granddiamondsuites.com/).

The hotel's name, logo and photographs belong to their owners. Details about the hotel
were read from the hotel's public website and booking page on 8 October 2026 and may be
out of date. Nothing here has been confirmed by the hotel. Every page says it is a concept
and asks search engines not to index it.

Live preview: https://mpc0367.github.io/grand-diamond-suites/

## What it is

A static website in English and Thai: a home page, a suites overview, six suite pages, a
suite comparison, dining, facilities, location, gallery, offers, contact, questions,
privacy and booking terms, with a 404 page and a root page that picks the language. No
framework and no third-party script. Fonts, photographs and the street map are served by
the site itself.

The map is a drawing of central Bangkok in the site's own palette. `tools/map.mjs` draws it
from OpenStreetMap data (fetched once by `tools/map-data.mjs`) as a small pyramid of square
pictures, which the site serves itself. They are kept in `docs/map`, as the photographs are
in `docs/media`: both folders are written by their own tools and left alone by the build. It opens on the streets around the hotel and can be
dragged and zoomed: out to the whole of central Bangkok, about ten kilometres across, and in
to about half a metre to a pixel around the hotel. Its places are marked with an icon for
the kind of place, and a marker opens a small card that says what the icon means, what the
place is and how far it is: on a tap on a phone, and on a click, on hover or on keyboard
focus on a laptop.

The map has one part that comes from elsewhere: a satellite view, whose images the
visitor's browser fetches from Esri's World Imagery service, and only after the visitor has
chosen that view. Esri asks those who use its maps to register and keep to its terms. Build
with `SITE_MAP_SATELLITE=off` to leave the satellite view out, and the site then asks
nothing of any other site; `SITE_MAP_TOKEN` adds an API key to the requests, and
`SITE_MAP_TILES` names another imagery service.

The site does not take bookings. Its stay planner builds a link to the hotel's own booking
page that carries the arrival date, the number of nights, the number of adults and the
ages of any children, and nothing else. Where a request is more than that page was seen to
take in one search when it was last read (12 October 2026: 31 nights, or 8 guests), the
planner does not shorten it. It offers the booking page with the request as entered, or an
enquiry with the dates and guests filled in.

The site does not send enquiries either. Its contact page writes a message in the
visitor's own browser, for them to copy or to open in their own email application. It sets
no cookies and loads no analytics. Each page declares a content security policy that
allows only the site's own files; the two pages that carry the map also allow pictures
from the imagery service.

Where two of the hotel's own sources disagree (for example the area of the Penthouse
Suite), the page says so beside the figure. Those points are kept in one list,
`src/data/verification.mjs`, which the build checks and prints from.

## Layout of the repository

| Path | Purpose |
| --- | --- |
| `src/data/` | Hotel facts, the six suites, photographs and nearby places, in English and Thai |
| `src/content/` | Page wording, questions and airport routes |
| `src/i18n/ui.mjs` | Interface words |
| `src/templates/` | HTML templates |
| `src/assets/` | One stylesheet, one script, fonts, logos and the map plates |
| `tools/` | Build, local server and checks, plus the scripts that made the images, map and logo files |
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
resolving, the same pages in both languages, a sound verification list, and a stylesheet
and a script of under 25 KB each when compressed.

Browser checks (every page at ten screen sizes, behaviour, a set of acceptance scenarios
for the planner, the enquiry, comparison, gallery, keyboard use, text size and failure
states, and an axe-core accessibility scan of every page, dialog and state) need the tool
dependencies, a build (it writes the page list the checks read) and the local server
running. They drive Microsoft Edge, which must be installed. A full run takes about half
an hour. Add `--quick` for two screen sizes, `--only=sweep`, `behaviour`, `acceptance`,
`axe` or `lab` for one part, or `--engine=webkit` to use Safari's engine (run
`npx playwright install webkit` once first). The checks stop every request to any other
site, so they never contact the hotel:

```bash
npm install
```

```bash
node tools/check.mjs
```

Only the build, the server and the checks run from a clone. The image, map, logo and
sharing-image scripts read the studio's own working copies of the originals, which are not
in this repository; they are kept as a record of how the files were made. With a copy of
the originals, set `GDS_ORIGINALS` to its folder before running `tools/images.mjs` or
`tools/social-card.mjs`. The built photographs in `docs/media` are in the repository, so a
clone builds and runs without them.

## Photographs and map

The photographs are the hotel's own, taken from its public website and resized for the
web. They are used here for an unofficial concept only. The street map is drawn from
OpenStreetMap data, © OpenStreetMap contributors, available under the Open Database
License. The satellite view, in a build that has it, shows Esri World Imagery (source:
Esri, Vantor, Earthstar Geographics, and the GIS User Community); none of it is stored in
this repository.

## Earlier version

The first concept (a single dark page with a three.js diamond) is kept at git tag `v1.0`.
