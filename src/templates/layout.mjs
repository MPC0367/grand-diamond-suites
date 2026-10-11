/* The document shell every page shares. */
import { html, raw, e } from "../lib/html.mjs";
import { conceptStrip, header, menuDialog, plannerDialog, viewerDialog, footer, mobileBar } from "./components.mjs";

/** Strings the browser script needs, in the page's language. */
function clientStrings(c) {
  const keys = [
    "msgNeedBoth", "msgPast", "msgOrder", "msgLong", "msgInvalid", "msgAdjusted", "msgNights", "msgNight", "to",
    "adultsOne", "adultsMany", "childrenOne", "childrenMany", "msgAges", "photoOf", "copied", "copyFailed", "pause", "play", "showing", "photosShown",
    "sep", "stop", "msgStay",
  ];
  const out = {};
  for (const k of keys) out[k] = c.t(k);
  return out;
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
    },
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
<link rel="icon" href="${c.asset("img/favicon.png")}" type="image/png">
${fonts.map((f) => html`<link rel="preload" href="${c.asset("fonts/" + f)}" as="font" type="font/woff2" crossorigin>`)}
${preloadImage ? html`<link rel="preload" as="image" imagesrcset="${preloadImage.srcset}" imagesizes="${preloadImage.sizes}" type="image/avif" fetchpriority="high">` : ""}
<link rel="stylesheet" href="${c.asset("css/site.css")}?v=${c.stamp}">
<script>(function(d){var h=d.documentElement;h.classList.remove("no-js");h.classList.add("js");try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)h.classList.add("anim")}catch(e){}})(document)</script>
${jsonld ? html`<script type="application/ld+json">${raw(JSON.stringify(jsonld).replace(/</g, "\\u003c"))}</script>` : ""}
</head>
<body${bodyClass ? raw(` class="${e(bodyClass)}"`) : ""}>
<a class="skip" href="#main">${c.t("skip")}</a>
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
<script src="${c.asset("js/site.js")}?v=${c.stamp}" defer onerror="document.documentElement.className='no-js'"></script>
</body>
</html>
`;
}
