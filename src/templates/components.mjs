/* Shared building blocks. Every function takes the page context `c` first:
   c.lang, c.other, c.l(l10n), c.t(key, vars), c.href(path), c.altHref,
   c.asset(path), c.media(id), c.page, c.config, c.hotel */
import { html, raw, e, attrs, cx } from "../lib/html.mjs";
import { icon, O2_MARK_PATH } from "./icons.mjs";
import { suiteList } from "../data/suites.mjs";

/* ---------- pictures ---------- */

const srcset = (c, m, ext) => m[ext].map((w) => `${c.asset(`media/${m.file}-${w}.${ext}`)} ${w}w`).join(", ");
export const srcsetOf = srcset;

/** Responsive photograph. `sizes` must describe the rendered width. */
export function pic(c, id, { sizes = "100vw", eager = false, high = false, focal = null, alt = null } = {}) {
  const m = c.media(id);
  const [fx, fy] = focal || m.focal;
  return html`<picture><source type="image/avif" srcset="${srcset(c, m, "avif")}" sizes="${sizes}"><source type="image/webp" srcset="${srcset(c, m, "webp")}" sizes="${sizes}"><img src="${c.asset(`media/${m.file}-${m.jpg}.jpg`)}" width="${m.w}" height="${m.h}" alt="${alt === null ? c.l(m.alt) : alt}" loading="${eager ? "eager" : "lazy"}" decoding="async"${high ? raw(' fetchpriority="high"') : ""} style="--fx:${Math.round(fx * 100)}%;--fy:${Math.round(fy * 100)}%${m.focalNarrow ? `;--fxn:${Math.round(m.focalNarrow[0] * 100)}%` : ""}"></picture>`;
}

/** A framed photograph that opens the viewer. `group` ties photographs into one set. */
export function shot(c, id, { ratio = "32", sizes = "100vw", group = "page", eager = false, caption = true, suiteLink = true, cls = "" } = {}) {
  const m = c.media(id);
  const suite = m.suite ? suiteList.find((s) => s.slug === m.suite) : null;
  const cap = c.l(m.caption);
  const label = suite ? `${c.l(suite.name)}: ${cap}` : cap;
  return html`<figure class="${cx("shot", cls)}" data-group="${m.group}"${suite ? raw(` data-suite="${e(suite.slug)}"`) : ""}>
    <div class="frame frame--${ratio}">
      <button type="button" class="zoomable" data-viewer="${group}" data-id="${m.id}" aria-label="${c.t("viewPhoto")}: ${label}">${pic(c, id, { sizes, eager })}</button>
    </div>
    ${caption ? html`<figcaption><span>${suite ? html`<b>${c.l(suite.name)}${c.lang === "th" ? "" : "."}</b> ` : ""}${cap}</span>${suite && suiteLink ? html`<a class="link" href="${c.href(`suites/${suite.slug}/`)}">${c.t("seeSuite")}<span class="sr-only">: ${c.l(suite.name)}</span></a>` : ""}</figcaption>` : ""}
  </figure>`;
}

/** Data the viewer needs for every photograph on the page (printed once, as JSON). */
export function viewerData(c, ids) {
  const out = {};
  for (const id of ids) {
    const m = c.media(id);
    const suite = m.suite ? suiteList.find((s) => s.slug === m.suite) : null;
    out[id] = {
      f: m.file, wa: m.avif, ww: m.webp, j: m.jpg,
      w: m.w, h: m.h,
      fx: Math.round(m.focal[0] * 100), fy: Math.round(m.focal[1] * 100),
      alt: c.l(m.alt),
      ...(m.focalNarrow ? { fxn: Math.round(m.focalNarrow[0] * 100) } : {}),
      cap: (suite ? c.l(suite.name) + c.t("stop") : "") + c.l(m.caption),
      capShort: c.l(m.caption),
      href: suite && c.page.path !== `suites/${suite.slug}/` ? c.href(`suites/${suite.slug}/`) : null,
    };
  }
  return out;
}

/* ---------- small pieces ---------- */

export const arrowLink = (c, href, label, extra = {}) =>
  html`<a class="arrow-link" href="${href}"${attrs(extra)}>${label}${icon("arrow")}</a>`;

export const extAttrs = { target: "_blank", rel: "noopener" };

export const newTab = (c) => html`<span class="sr-only"> (${c.t("newTab")})</span>`;

export function eyebrow(c, text) {
  return html`<p class="eyebrow">${text}</p>`;
}

export function sectionHead(c, { eyebrowText, title, lead = null, side = null, id = null, level = 2 }) {
  const tag = level === 1 ? "h1" : "h2";
  return html`<div class="${cx("section-head", side && "section-head--split")}">
    <div class="section-head__main" style="display:grid;gap:18px">
      ${eyebrowText ? eyebrow(c, eyebrowText) : ""}
      <${raw(tag)}${id ? raw(` id="${e(id)}"`) : ""}>${title}</${raw(tag)}>
      ${lead ? html`<p class="lead">${lead}</p>` : ""}
    </div>
    ${side ? html`<div class="section-head__side">${side}</div>` : ""}
  </div>`;
}

export function crumbs(c, trail) {
  return html`<nav aria-label="${c.t("breadcrumb")}"><ol class="crumbs">
    ${trail.map((t, i) => i === trail.length - 1
      ? html`<li><span aria-current="page">${t.label}</span></li>`
      : html`<li><a href="${t.href}">${t.label}</a></li>`)}
  </ol></nav>`;
}

/* ---------- area text ---------- */

export function areaText(c, suite) {
  const a = suite.area;
  const num = a.min === a.max ? String(a.min) : `${a.min} ${c.lang === "th" ? "ถึง" : "to"} ${a.max}`;
  return `${a.approx ? c.t("approx") + " " : ""}${num} ${c.t("sqm")}`;
}

const upFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const lowFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
/** The area as a value standing on its own (a table cell, a key fact): it starts with a capital. */
export const areaValue = (c, suite) => upFirst(areaText(c, suite));

export const unlisted = (c) => html`<span class="unlisted">${c.t("notListed")}</span>`;

/* ---------- booking ---------- */

export function bookingUrl(c) {
  return c.hotel.booking.page[c.lang];
}

/** The stay planner. With JavaScript it builds a link to the hotel's official
    booking page carrying the arrival date, nights and adults. Without it, the
    form is hidden and a plain link with one honest sentence takes its place. */
export function planner(c, { id, compact = false, suite = null } = {}) {
  const b = c.hotel.booking;
  const opts = [];
  for (let n = 1; n <= b.maxAdults; n++) opts.push(html`<option value="${n}"${n === 2 ? raw(" selected") : ""}>${n === 1 ? c.t("adultsOne") : c.t("adultsMany", { n })}</option>`);
  const kidOpts = [];
  for (let n = 0; n <= b.maxChildren; n++) kidOpts.push(html`<option value="${n}">${n === 0 ? c.t("childrenNone") : n === 1 ? c.t("childrenOne") : c.t("childrenMany", { n })}</option>`);
  const ageOpts = [html`<option value="">${c.t("ageChoose")}</option>`];
  for (let n = 0; n <= b.maxChildAge; n++) ageOpts.push(html`<option value="${n}">${n === 0 ? c.t("ageUnder1") : c.t("ageYears", { n })}</option>`);
  const ages = [];
  for (let i = 1; i <= b.maxChildren; i++) ages.push(html`<div class="field field--age" data-age-field hidden>
          <label for="${id}-age${i}">${c.t("childAge", { i })}</label>
          <select id="${id}-age${i}" data-age aria-describedby="${id}-msg">${ageOpts}</select>
        </div>`);
  return html`<div class="planner-block">
    <form class="${cx("planner", compact && "planner--compact")}" data-planner novalidate autocomplete="off" action="${bookingUrl(c)}" method="get" target="_blank" rel="noopener noreferrer"${suite && suite.bookingRoomId ? raw(` data-room-type="${e(suite.bookingRoomId)}"`) : ""} aria-label="${c.t("planStay")}">
      <div class="planner__fields">
        <div class="field">
          <label for="${id}-in">${c.t("checkin")}</label>
          <input type="date" id="${id}-in" data-in autocomplete="off" data-hint="${c.t("dateHint")}" aria-describedby="${id}-msg">
        </div>
        <div class="field">
          <label for="${id}-out">${c.t("checkout")}</label>
          <input type="date" id="${id}-out" data-out autocomplete="off" data-hint="${c.t("dateHint")}" aria-describedby="${id}-msg">
        </div>
        <div class="field field--adults">
          <label for="${id}-ad">${c.t("adults")}</label>
          <select id="${id}-ad" data-adults>${opts}</select>
        </div>
        <div class="field field--kids">
          <label for="${id}-ch">${c.t("children")}</label>
          <select id="${id}-ch" data-kids>${kidOpts}</select>
        </div>
      </div>
      <div class="planner__ages" data-ages hidden>${ages}</div>
      <div class="planner__go">
        <a class="btn btn--ink" data-go href="${bookingUrl(c)}" target="_blank" rel="noopener noreferrer">${c.t(compact ? "continueBooking" : "checkAvailability")}${icon("out")}${newTab(c)}</a>
      </div>
    </form>
    <p class="planner__msg is-info" id="${id}-msg" data-msg role="status" aria-live="polite"></p>
    <div class="planner__plain">
      <a class="btn btn--ink" href="${bookingUrl(c)}" target="_blank" rel="noopener noreferrer">${c.t("checkAvailability")}${icon("out")}${newTab(c)}</a>
    </div>
    <p class="planner__note"><span class="js-only">${suite ? c.t("plannerSuite", { suite: c.l(suite.name) }) : c.t("plannerNote")}</span><span class="nojs-only">${c.t("plannerPlain")}</span></p>
  </div>`;
}

/** The planner as a dialog, reachable from the header and the phone bar on every page. */
export function plannerDialog(c) {
  return html`<dialog class="sheet" id="plan-dialog" aria-labelledby="plan-dialog-title">
    <div class="sheet__top">
      <h2 id="plan-dialog-title">${c.t("planStay")}</h2>
      <button type="button" class="close-btn" data-close>${c.t("close")}${icon("close")}</button>
    </div>
    <div class="sheet__body">${planner(c, { id: "pd", compact: true })}</div>
  </dialog>`;
}

/** Opens the planner dialog; without JavaScript it is a plain link to the booking page. */
export function bookButton(c, { cls = "btn btn--ink", label = null, iconName = null } = {}) {
  return html`<a class="${cls}" href="${bookingUrl(c)}" target="_blank" rel="noopener noreferrer" data-open-planner>${label || c.t("checkAvailability")}${iconName ? icon(iconName) : ""}</a>`;
}

/* ---------- header, menu, footer ---------- */

const NAV = [
  { key: "suites", path: "suites/" },
  { key: "dining", path: "dining/" },
  { key: "facilities", path: "facilities/" },
  { key: "location", path: "location/" },
];
const MORE = [
  { key: "gallery", path: "gallery/" },
  { key: "offers", path: "offers/" },
  { key: "contact", path: "contact/" },
  { key: "faq", path: "faq/" },
];

const isCurrent = (c, path) => c.page.path === path || (path !== "" && c.page.path.startsWith(path));

function langSwitch(c, idSuffix = "") {
  const cur = (code, label, name) => html`<span aria-current="true" lang="${code}" title="${name}">${label}</span>`;
  const alt = (code, label, name) => html`<a href="${c.altHref}" lang="${code}" hreflang="${code}" data-lang-switch title="${name}"><span class="sr-only">${name}: </span><span aria-hidden="true">${label}</span></a>`;
  const en = c.lang === "en" ? cur("en", "EN", "English") : alt("en", "EN", "English");
  const th = c.lang === "th" ? cur("th", "ไทย", "ภาษาไทย") : alt("th", "ไทย", "ภาษาไทย");
  return html`<div class="lang" role="group" aria-label="${c.t("language")}">${en}<span class="lang__sep" aria-hidden="true">/</span>${th}</div>`;
}

export function conceptStrip(c) {
  if (c.config.mode !== "preview") return "";
  return html`<div class="concept-strip" role="note"><div class="wrap"><span><strong>${c.t("conceptStrip")}</strong></span><a href="${c.hotel.links.official[c.lang]}" target="_blank" rel="noopener">${c.t("conceptStripLink")}${newTab(c)}</a></div></div>`;
}

export function header(c) {
  const moreCurrent = MORE.some((m) => isCurrent(c, m.path));
  return html`<header class="site-header" id="top">
    <div class="wrap site-header__in">
      <a class="brand" href="${c.href("")}" aria-label="${c.l(c.hotel.name)}, ${c.t("home")}"><picture><source type="image/webp" srcset="${c.asset("img/logo-gold.webp")}"><img src="${c.asset("img/logo-gold.png")}" width="669" height="251" alt=""></picture></a>
      <nav class="nav" aria-label="${c.t("navMain")}">
        <ul class="nav__list">
          ${NAV.map((n) => html`<li><a class="nav__link" href="${c.href(n.path)}"${isCurrent(c, n.path) ? raw(' aria-current="page"') : ""}>${c.t(n.key)}</a></li>`)}
          <li class="more">
            <button type="button" class="nav__link js-only" aria-expanded="false" aria-controls="more-panel" data-more${moreCurrent ? raw(' data-current') : ""}>${c.t("more")}${icon("chev")}</button>
            <a class="nav__link nojs-only" href="#footer-nav">${c.t("more")}</a>
            <div class="more__panel" id="more-panel" hidden>
              ${MORE.map((n) => html`<a href="${c.href(n.path)}"${isCurrent(c, n.path) ? raw(' aria-current="page"') : ""}>${c.t(n.key)}</a>`)}
            </div>
          </li>
        </ul>
      </nav>
      <div class="header-tools">
        ${langSwitch(c)}
        ${bookButton(c, { cls: "btn btn--ink btn--sm header-cta", label: c.t("bookSuite") })}
        <button type="button" class="menu-btn js-only" aria-haspopup="dialog" aria-controls="menu" data-open-menu>${c.t("menu")}<span class="menu-btn__bars" aria-hidden="true"></span></button>
        <a class="menu-btn nojs-only" href="#footer-nav">${c.t("menu")}<span class="menu-btn__bars" aria-hidden="true"></span></a>
      </div>
    </div>
    <div class="progress" aria-hidden="true"><i></i></div>
  </header>`;
}

export function menuDialog(c) {
  const all = [...NAV, ...MORE];
  return html`<dialog class="menu" id="menu" aria-label="${c.t("menu")}">
    <div class="menu__top">
      <a class="brand" href="${c.href("")}" aria-label="${c.l(c.hotel.name)}, ${c.t("home")}"><picture><source type="image/webp" srcset="${c.asset("img/logo-gold.webp")}"><img src="${c.asset("img/logo-gold.png")}" width="669" height="251" alt=""></picture></a>
      <button type="button" class="close-btn" data-close>${c.t("close")}${icon("close")}</button>
    </div>
    <div class="menu__body">
      <nav aria-label="${c.t("navMain")}">
        <ul class="menu__list">
          ${all.map((n) => html`<li><a href="${c.href(n.path)}"${isCurrent(c, n.path) ? raw(' aria-current="page"') : ""}>${c.t(n.key)}${icon("arrow")}</a></li>`)}
        </ul>
      </nav>
      <div class="menu__foot">
        ${bookButton(c, { cls: "btn btn--ink btn--block" })}
        <a class="btn btn--line btn--block" href="${c.hotel.phone.href}">${icon("phone")}${c.hotel.phone.display}</a>
        ${langSwitch(c)}
      </div>
    </div>
  </dialog>`;
}

export function o2Credit(c) {
  return html`<a class="o2-credit" href="${c.config.studio.url}" target="_blank" rel="noopener noreferrer" aria-label="${c.t("o2Label")}"><span class="o2-credit__lockup" lang="en"><svg class="o2-credit__mark" viewBox="0 0 158.1 129.7" aria-hidden="true" focusable="false"><path fill="currentColor" d="${O2_MARK_PATH}"/></svg>Design Studio</span></a>`;
}

export function footer(c) {
  const h = c.hotel;
  const col = (title, links) => html`<div class="footer-col"><h2>${title}</h2><ul>${links.map(([label, href, ext]) => html`<li><a href="${href}"${ext ? raw(' target="_blank" rel="noopener"') : ""}>${label}${ext ? newTab(c) : ""}</a></li>`)}</ul></div>`;
  return html`<footer class="site-footer on-deep">
    <div class="wrap">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="brand" href="${c.href("")}" aria-label="${c.l(h.name)}, ${c.t("home")}"><picture><source type="image/webp" srcset="${c.asset("img/logo-light.webp")}"><img src="${c.asset("img/logo-light.png")}" width="588" height="220" alt="" loading="lazy"></picture></a>
          <address>${c.l(h.address).map((line, i) => html`${i ? raw("<br>") : ""}${line}`)}</address>
          <p class="contact-lines">
            <a href="${h.phone.href}">${h.phone.display}</a>
            <a href="mailto:${h.email.address}">${h.email.address}</a>
          </p>
        </div>
        <nav class="footer-cols" id="footer-nav" aria-label="${c.t("navFooter")}" tabindex="-1">
          ${col(c.t("suites"), [...suiteList.map((s) => [c.l(s.name), c.href(`suites/${s.slug}/`)]), [c.t("compare"), c.href("suites/compare/")]])}
          ${col(c.t("hotel"), [[c.t("dining"), c.href("dining/")], [c.t("facilities"), c.href("facilities/")], [c.t("location"), c.href("location/")], [c.t("gallery"), c.href("gallery/")], [c.t("offers"), c.href("offers/")]])}
          ${col(c.t("help"), [[c.t("contact"), c.href("contact/")], [c.t("faq"), c.href("faq/")], [c.t("bookingTerms"), c.href("booking-terms/")], [c.t("privacy"), c.href("privacy/")]])}
          ${col(c.t("follow"), [["Facebook", h.links.facebook, true], ["Instagram", h.links.instagram, true], ["LINE", h.links.line, true]])}
        </nav>
      </div>
      <div class="footer-base">
        ${c.config.mode === "preview" ? html`<p>${c.t("conceptFooter", { date: c.dateLong(c.config.factsChecked) })} <a class="link" href="${h.links.official[c.lang]}" target="_blank" rel="noopener">granddiamondsuites.com${newTab(c)}</a></p>` : ""}
        <div class="footer-meta">
          <span>${c.config.mode === "preview" ? c.t("conceptCopy", { year: c.config.factsChecked.slice(0, 4) }) : html`© ${c.config.factsChecked.slice(0, 4)} ${c.l(h.name)}`}</span>
          ${langSwitch(c)}
        </div>
        ${o2Credit(c)}
      </div>
    </div>
  </footer>`;
}

/** Fixed bar on phones: one booking action and a call button. */
export function mobileBar(c) {
  return html`<div class="mcta" data-mcta>
    ${bookButton(c, { cls: "btn btn--ink" })}
    <a class="btn btn--line btn--call" href="${c.hotel.phone.href}" aria-label="${c.t("call")}: ${c.hotel.phone.display}">${icon("phone")}</a>
  </div>`;
}

export function viewerDialog(c) {
  return html`<dialog class="viewer" id="viewer" aria-label="${c.t("viewer")}">
    <div class="viewer__top">
      <span class="viewer__count" data-count></span>
      <button type="button" class="close-btn" data-close>${c.t("close")}${icon("close")}</button>
    </div>
    <div class="viewer__stage">
      <img data-img alt="" decoding="async">
      <button type="button" class="icon-btn viewer__nav viewer__nav--prev" data-prev aria-label="${c.t("prevPhoto")}">${icon("prev")}</button>
      <button type="button" class="icon-btn viewer__nav viewer__nav--next" data-next aria-label="${c.t("nextPhoto")}">${icon("next")}</button>
    </div>
    <p class="viewer__cap"><span data-cap aria-live="polite" aria-atomic="true"></span><a data-link hidden>${c.t("seeSuite")}</a></p>
  </dialog>`;
}

/* ---------- suite pieces ---------- */

/** Specification rows shared by the selector and the suite page. */
export function suiteSpecs(c, s) {
  const row = (label, value, small = null) => html`<div><dt>${label}</dt><dd>${value}${small ? html`<small>${small}</small>` : ""}</dd></div>`;
  return html`<dl class="specs">
    ${row(c.t("area"), areaValue(c, s))}
    ${row(c.t("beds"), c.l(s.beds))}
    ${row(c.t("bathrooms"), s.bathrooms.count ? String(s.bathrooms.count) : (s.bathrooms.detail ? c.l(s.bathrooms.detail) : unlisted(c)), s.bathrooms.count && s.bathrooms.detail ? c.l(s.bathrooms.detail) : null)}
    ${row(c.t("living"), s.living ? c.l(s.living) : unlisted(c))}
    ${row(c.t("kitchen"), s.kitchen ? c.l(s.kitchen) : unlisted(c))}
    ${row(c.t("outdoor"), s.outdoor ? c.l(s.outdoor) : unlisted(c))}
    ${row(c.t("occupancy"), s.occupancy ? c.t("occupancyValue", { n: s.occupancy }) : unlisted(c), s.occupancy ? c.t("occupancySource") : null)}
  </dl>`;
}

/** "Find your space": six suites, one open at a time. Without JavaScript all six are open. */
export function finder(c, { idPrefix = "f", headingLevel = 3, eagerFirst = true } = {}) {
  const H = raw("h" + headingLevel);
  return html`<div class="finder" data-finder>
    ${suiteList.map((s, i) => {
      const first = c.media(s.photos[0]);
      const pid = `${idPrefix}-${s.slug}`;
      return html`<div class="finder__item">
        <${H} style="margin:0;font:inherit"><button type="button" class="finder__tab" id="${pid}-tab" aria-expanded="${i === 0 ? "true" : "false"}" aria-controls="${pid}" data-suite="${s.slug}">
          <span class="finder__mark" aria-hidden="true"></span>
          <span><span class="finder__name">${c.l(s.name)}</span><span class="finder__meta">${areaValue(c, s)}${c.t("sep")}${c.lang === "en" ? lowFirst(c.l(s.bedsShort)) : c.l(s.bedsShort)}</span></span>
          ${icon("chev", "finder__chev")}
        </button></${H}>
        <div class="finder__panel" id="${pid}" role="region" aria-labelledby="${pid}-tab"${i === 0 ? "" : raw(" hidden")}>
          <div class="stage" data-stage>
            <div class="stage__frame">
              <button type="button" class="zoomable" data-viewer="suite-${s.slug}" data-id="${first.id}" data-stage-open aria-label="${c.t("viewPhoto")}: ${c.l(s.name)}">${pic(c, first.id, { sizes: "(min-width: 1000px) 56vw, 100vw", eager: eagerFirst && i === 0 })}</button>
            </div>
            <p class="stage__cap"><span data-stage-cap>${c.l(first.caption)}</span><b data-stage-count>${c.t("photoOf", { i: 1, n: s.photos.length })}</b></p>
            <div class="thumbs" role="group" aria-label="${c.l(s.name)}">
              ${s.photos.map((id, j) => {
                const m = c.media(id);
                return html`<button type="button" class="thumb" data-thumb data-id="${m.id}" aria-label="${c.t("showPhoto", { i: j + 1 })}: ${c.l(m.caption)}"${j === 0 ? raw(' aria-current="true"') : ""}><img src="${c.asset(`media/${m.file}-${m.webp[0]}.webp`)}" width="${m.webp[0]}" height="${Math.round(m.webp[0] * m.h / m.w)}" alt="" loading="lazy" decoding="async"></button>`;
              })}
            </div>
          </div>
          <div class="finder__detail">
            <div class="finder__sum">
              <p class="lead" style="font-size:1.0625rem;color:var(--ink-2)">${c.l(s.summary)}</p>
              <div class="finder__actions">
                <a class="btn btn--ink" href="${c.href(`suites/${s.slug}/`)}">${c.t("exploreSuite", { suite: c.l(s.name) })}${icon("arrow")}</a>
                ${bookButton(c, { cls: "btn btn--line", label: c.t("checkDates") })}
              </div>
            </div>
            ${suiteSpecs(c, s)}
          </div>
        </div>
      </div>`;
    })}
  </div>`;
}

/* ---------- faq ---------- */

export function faqList(c, items) {
  return html`<div class="faq">
    ${items.map((q) => html`<details id="q-${q.id}">
      <summary>${c.l(q.q)}</summary>
      <div class="faq__a">${c.l(q.a).map((p) => html`<p>${raw(p)}</p>`)}</div>
    </details>`)}
  </div>`;
}

/* ---------- map ---------- */

/** Static street map with pins placed from coordinates at build time.
    The drawing is this site's own render of OpenStreetMap data (tools/map.mjs). */
export function mapPlate(c, places, { interactive = true } = {}) {
  const map = c.map;
  const files = map.files[c.lang];
  const pos = (lat, lon) => {
    const [x, y] = map.project(lat, lon);
    return `--x:${x.toFixed(2)};--y:${y.toFixed(2)}`;
  };
  const hp = c.hotel.coords;
  const [hx] = map.project(hp.lat, hp.lon);
  return html`<div class="mapplate" data-map>
    <div class="mapplate__pan" data-pan data-cx="${hx.toFixed(2)}" data-label="${c.t("mapPan")}">
      <div class="mapplate__canvas">
        <picture>
          <source type="image/webp" srcset="${c.asset("img/" + files.webp[0])} 960w, ${c.asset("img/" + files.webp[1])} 1600w" sizes="(min-width: 1000px) 56vw, (min-width: 700px) 92vw, 680px">
          <img class="mapplate__img" src="${c.asset("img/" + files.jpg)}" width="${map.width}" height="${map.height}" alt="${c.t("mapAlt")}" loading="lazy" decoding="async">
        </picture>
        <div class="mapplate__pins">
          <span class="pin pin--hotel" style="${pos(hp.lat, hp.lon)}" aria-hidden="true"></span>
          <span class="pin-label" style="${pos(hp.lat, hp.lon)}" aria-hidden="true">${c.t("hotelPin")}</span>
          ${places.map((p, i) => interactive
            ? html`<button type="button" class="pin" style="${pos(p.lat, p.lon)}" data-pin="${p.id}" data-kind="${p.kind}" aria-pressed="false" aria-label="${i + 1}. ${c.l(p.name)}">${i + 1}</button>`
            : html`<span class="pin" style="${pos(p.lat, p.lon)}" data-pin="${p.id}" aria-hidden="true">${i + 1}</span>`)}
        </div>
      </div>
    </div>
    <p class="mapplate__credit">${raw(c.lang === "th"
      ? 'ข้อมูลแผนที่ © ผู้ร่วมพัฒนา <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap<span class="sr-only"> (เปิดในแท็บใหม่)</span></a>'
      : 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap<span class="sr-only"> (opens in a new tab)</span></a> contributors')}</p>
  </div>`;
}

/* ---------- distances ---------- */

/** A straight-line distance, rounded so it never reads as more exact than it is. */
export function distText(c, metres) {
  if (metres >= 975) return `${c.t("approx")} ${c.t("km", { n: String(Math.round(metres / 100) / 10) })}`;
  const step = 50;
  return `${c.t("approx")} ${c.t("metres", { n: Math.max(step, Math.round(metres / step) * step) })}`;
}

/* ---------- page furniture ---------- */

/** Breadcrumbs, eyebrow, the page's one H1 and its lead. */
export function pageTop(c, { trail, eyebrowText, title, lead = null, extra = null, split = true }) {
  return html`<div class="wrap page-top">
    ${crumbs(c, [{ label: c.t("home"), href: c.href("") }, ...trail])}
    <div class="${cx("lead-block", split && "lead-block--split")}">
      <div class="lead-block__text">
        ${eyebrowText ? eyebrow(c, eyebrowText) : ""}
        <h1>${title}</h1>
      </div>
      ${lead || extra ? html`<div class="lead-block__text">${lead ? html`<p class="lead">${lead}</p>` : ""}${extra || ""}</div>` : ""}
    </div>
  </div>`;
}

/** Full-width photograph under a page's lead, labelled with what it shows. */
export function leadPhoto(c, id, { group = "page" } = {}) {
  const m = c.media(id);
  return html`<div class="lead-photo">
    <div class="frame"><button type="button" class="zoomable" data-viewer="${group}" data-id="${m.id}" aria-label="${c.t("viewPhoto")}: ${c.l(m.caption)}">${pic(c, id, { sizes: "100vw", eager: true, high: true })}</button></div>
    <p class="plate"><span class="plate__k">${c.t("pictured")}</span><span class="plate__cap">${c.l(m.caption)}</span></p>
  </div>`;
}

/** The closing invitation shared by the inner pages. */
export function closingCta(c, { title, text, contactLabel }) {
  return html`<section class="section section--deep on-deep" aria-labelledby="closing-title">
    <div class="wrap closing closing--plain">
      <h2 class="closing__title" id="closing-title">${title}</h2>
      <div class="closing__body">
        <p>${text}</p>
        <div class="closing__actions">
          ${bookButton(c, { cls: "btn btn--paper", iconName: "out" })}
          <a class="btn btn--line-light" href="${c.href("contact/")}">${contactLabel}</a>
        </div>
      </div>
    </div>
  </section>`;
}

/** Ploy Restaurant's published opening times. */
export function hoursTable(c, { caption, lastOrder }) {
  const range = (a, b) => c.t("timeRange", { a, b });
  return html`<table class="hours">
    <caption class="label">${caption}</caption>
    <tbody>
      ${c.hotel.dining.services.map((s) => html`<tr>
        <th scope="row">${c.l(s.name)}<small>${c.l(s.note)}</small></th>
        <td>${range(s.opens, s.closes)}${s.lastOrder ? html`<small>${lastOrder.replace("{t}", s.lastOrder)}</small>` : ""}</td>
      </tr>`)}
    </tbody>
  </table>`;
}

/** The hotel's address as printed, with copy and directions. */
export function addressCard(c, { id, showOther = false, extra = null }) {
  const h = c.hotel;
  const other = c.other;
  return html`<div class="address-card">
    <p class="label">${c.t("address")}</p>
    <address>${c.l(h.address).map((line, i) => html`${i ? raw("<br>") : ""}${line}`)}</address>
    ${showOther ? html`<address class="address-card__alt" lang="${other}">${h.address[other].map((line, i) => html`${i ? raw("<br>") : ""}${line}`)}</address>` : ""}
    <div class="address-card__actions">
      <button type="button" class="btn btn--line btn--sm js-only" data-copy="${h.address.oneLine[c.lang]}" aria-describedby="${id}-status">${icon("copy")}${c.t("copyAddress")}</button>
      <a class="btn btn--ink btn--sm" href="${h.links.directions}" target="_blank" rel="noopener">${icon("pin")}${c.t("openDirections")}${newTab(c)}</a>
    </div>
    <p class="copy-status" id="${id}-status" role="status" aria-live="polite"></p>
    ${extra || ""}
  </div>`;
}
