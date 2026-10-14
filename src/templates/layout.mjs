/* The document shell every page shares. */
import { createHash } from "node:crypto";
import { html, raw, e } from "../lib/html.mjs";
import { conceptStrip, header, menuDialog, plannerDialog, viewerDialog, footer, mobileBar } from "./components.mjs";
import { suiteList } from "../data/suites.mjs";

/** The opening, once a visit: the logo's diamond drawn facet by facet, then catching the light, and the
    name writing itself. Hidden from assistive technology and never in the way of the pointer; the head
    script decides whether it shows, and the stylesheet lifts it on a fixed clock. */
function intro() {
  return raw(`<div class="intro-screen" aria-hidden="true">
<div class="intro-mark">
<svg class="intro-gem" viewBox="-6 -10 112 66" focusable="false"><defs><linearGradient id="intro-soft"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="intro-shine" maskUnits="userSpaceOnUse" x="-6" y="-10" width="112" height="66"><rect class="intro-band" x="-46" y="-12" width="30" height="76" fill="url(#intro-soft)"/></mask></defs><path class="intro-face" mask="url(#intro-shine)" d="M22 2H78L94 17L50 53L6 17Z"/><g class="intro-lines"><path pathLength="1" d="M22 2H78L94 17L50 53L6 17Z"/><path pathLength="1" d="M6 17H94"/><path pathLength="1" d="M22 2L27 17L50 53"/><path pathLength="1" d="M78 2L73 17L50 53"/></g><g class="intro-glow" mask="url(#intro-shine)"><path d="M22 2H78L94 17L50 53L6 17Z"/><path d="M6 17H94"/><path d="M22 2L27 17L50 53"/><path d="M78 2L73 17L50 53"/></g><path class="intro-spark" d="M88-8L89.7-3.2 94.5-1.5 89.7.2 88 5 86.3.2 81.5-1.5 86.3-3.2Z"/></svg>
<svg class="intro-word" viewBox="0 0 1000 132" lang="en" focusable="false"><text x="500" y="104" text-anchor="middle" textLength="992" lengthAdjust="spacingAndGlyphs"><tspan style="--i:0">G</tspan><tspan style="--i:1">r</tspan><tspan style="--i:2">a</tspan><tspan style="--i:3">n</tspan><tspan style="--i:4">d</tspan> <tspan style="--i:5">D</tspan><tspan style="--i:6">i</tspan><tspan style="--i:7">a</tspan><tspan style="--i:8">m</tspan><tspan style="--i:9">o</tspan><tspan style="--i:10">n</tspan><tspan style="--i:11">d</tspan></text></svg>
<p class="intro-sub" lang="en">Suites Hotel</p>
</div>
</div>`);
}

/** Strings the browser script needs, in the page's language. */
function clientStrings(c) {
  const keys = [
    "msgNeedBoth", "msgNeedIn", "msgNeedOut", "msgPast", "msgOrder", "msgLong", "msgParty", "msgInvalid", "msgAdjusted", "msgNights", "msgNight", "to",
    "adultsOne", "adultsMany", "childrenOne", "childrenMany", "msgAges", "photoOf", "copied", "copyFailed", "pause", "play", "reelPause", "reelPlay", "showing", "photosShown",
    "sep", "stop", "msgStay",
    "recoverNoteLong", "recoverNoteParty", "recoverNoteAsk", "notSelected", "datesPartial", "datesRange", "nightsOne", "nightsMany",
    "agedList", "agesNeeded", "and", "ageUnder1Short", "ageYears", "msgCleared", "fitOver", "fitOthers", "fitRooms", "photoFailed",
  ];
  const out = {};
  for (const k of keys) out[k] = c.t(k);
  return out;
}

/* The one script written into the page itself. It marks the page as scripted before anything is drawn,
   and takes the mark back if the main script never arrives, so the plain version of every control returns. */
const HEAD_SCRIPT = '(function(d){var h=d.documentElement;h.classList.remove("no-js");h.classList.add("js");try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)h.classList.add("anim")}catch(e){}try{if(h.classList.contains("anim")&&!sessionStorage.getItem("gd:intro")){sessionStorage.setItem("gd:intro","1");h.classList.add("intro");var g=function(){h.classList.add("intro-go")};setTimeout(g,350);if(d.fonts)d.fonts.load(\'400 1em "Newsreader"\').then(g,g)}}catch(e){}addEventListener("load",function(){if(!window.__gd)h.className="no-js"})})(document)';
const sha = (text) => "'sha256-" + createHash("sha256").update(text).digest("base64") + "'";

/** What a page may load and run. Everything comes from the site itself: one stylesheet, one script file,
    the script above (named by its hash), fonts and pictures. Nothing is fetched from anywhere else, and
    the only place a form on these pages may ever go is the hotel's own booking page. The one exception is
    a page that carries the neighbourhood map: it may also load pictures from the satellite imagery service
    named in the site's settings, which the script asks for only once a visitor chooses that view. Delivered in the
    page because the preview's host sets no headers; a production host should send it as a header and
    add frame-ancestors, which a page cannot set for itself. */
export function contentPolicy(c, { inline = HEAD_SCRIPT } = {}) {
  return [
    "default-src 'self'",
    "script-src 'self' " + sha(inline),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:" + (c.flags && c.flags.map && c.config.map.satellite.on ? " " + new URL(c.config.map.satellite.url).origin : ""),
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self' https://" + c.hotel.booking.allowedHost,
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function layout(c, { main, viewer = null, preloadImage = null, bodyClass = "", jsonld = null }) {
  const p = c.page;
  const preview = c.config.mode === "preview";
  const title = `${p.title} | ${c.t(preview ? "titleSuffixPreview" : "titleSuffix")}`;
  const boot = {
    lang: c.lang,
    booking: {
      page: c.hotel.booking.page[c.lang], host: c.hotel.booking.allowedHost,
      maxNights: c.hotel.booking.maxNights, maxAdults: c.hotel.booking.maxAdults,
      maxChildren: c.hotel.booking.maxChildren, maxChildAge: c.hotel.booking.maxChildAge,
      maxGuests: c.hotel.booking.maxGuests,
    },
    /* on a suite page the planner can point a larger party at the suites listed for more guests */
    ...(/^suites\/[a-z-]+-suite\/$/.test(p.path) ? { suites: suiteList.map((s) => ({ s: s.slug, n: c.l(s.name), o: s.occupancy, h: c.href(`suites/${s.slug}/`) })) } : {}),
    t: clientStrings(c),
    viewer: viewer || {},
    mediaBase: c.asset("media/"),
    locale: c.lang === "th" ? "th-TH-u-ca-gregory" : "en-GB",
  };
  const fonts = c.lang === "th"
    ? ["noto-sans-thai-thai.woff2", "noto-serif-thai-thai.woff2", "manrope-latin.woff2"]
    : ["manrope-latin.woff2", "newsreader-latin.woff2"];

  return "<!DOCTYPE html>\n" + html`<html lang="${c.lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${contentPolicy(c)}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${p.description}">
${preview ? raw('<meta name="robots" content="noindex, nofollow">') : ""}
${!preview ? html`<link rel="canonical" href="${c.absolute(c.lang, p.path)}">
<link rel="alternate" hreflang="en" href="${c.absolute("en", p.path)}">
<link rel="alternate" hreflang="th" href="${c.absolute("th", p.path)}">
<link rel="alternate" hreflang="x-default" href="${c.absolute("en", p.path)}">` : ""}
<meta name="theme-color" content="#F5F2EC">
<meta name="format-detection" content="telephone=no">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${p.description}">
<meta property="og:locale" content="${c.lang === "th" ? "th_TH" : "en_GB"}">
${c.config.origin ? html`<meta property="og:image" content="${c.config.origin}${c.config.basePath}assets/img/social-card.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">` : ""}
${preview && c.config.shareOrigin ? html`<meta property="og:image" content="${c.config.shareOrigin}${c.config.basePath}assets/img/social-card-concept-${c.lang}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${c.t("shareAlt")}">
<meta name="twitter:card" content="summary_large_image">` : ""}
<link rel="icon" href="${c.asset("img/favicon.png")}" type="image/png">
${fonts.map((f) => html`<link rel="preload" href="${c.asset("fonts/" + f)}" as="font" type="font/woff2" crossorigin>`)}
${preloadImage ? html`<link rel="preload" as="image" imagesrcset="${preloadImage.srcset}" imagesizes="${preloadImage.sizes}" type="image/avif" fetchpriority="high">` : ""}
<link rel="stylesheet" href="${c.asset("css/site.css")}?v=${c.stamp}">
<script>${raw(HEAD_SCRIPT)}</script>
${jsonld ? html`<script type="application/ld+json">${raw(JSON.stringify(jsonld).replace(/</g, "\\u003c"))}</script>` : ""}
</head>
<body${bodyClass ? raw(` class="${e(bodyClass)}"`) : ""}>
<a class="skip" href="#main">${c.t("skip")}</a>
${intro()}
${conceptStrip(c)}
${header(c)}
<main id="main" tabindex="-1">
${main}
</main>
${footer(c)}
${mobileBar(c)}
${menuDialog(c)}
${plannerDialog(c)}
${viewer ? viewerDialog(c) : ""}
<script type="application/json" id="boot">${raw(JSON.stringify(boot).replace(/</g, "\\u003c"))}</script>
<script src="${c.asset("js/site.js")}?v=${c.stamp}" defer></script>
</body>
</html>
`;
}
