/* Dining, facilities, location and gallery. */
import { html, raw } from "../../lib/html.mjs";
import { icon } from "../icons.mjs";
import { pic, shot, bookButton, arrowLink, sectionHead, eyebrow, pageTop, leadPhoto, closingCta, mapPlate, hoursTable, addressCard, srcsetOf, newTab } from "../components.mjs";
import { diningPage as D, facilitiesPage as F, locationPage as L, galleryPage as G } from "../../content/pages.mjs";
import { home } from "../../content/home.mjs";
import { routes, routesMeta } from "../../content/routes.mjs";
import { media } from "../../data/media.mjs";
import { suiteList } from "../../data/suites.mjs";
import { places, placeDistance, placesIn, marked } from "./shared.mjs";

const closing = (c) => closingCta(c, { title: marked(c, home.closing.title), text: c.l(home.closing.text), contactLabel: c.l(home.closing.contact) });
const preload = (c, id) => ({ srcset: srcsetOf(c, c.media(id), "avif"), sizes: "100vw" });

/* ---------- /dining/ ---------- */

export const diningDef = {
  id: "dining",
  path: "dining/",
  meta: (c) => ({ title: c.l(D.title), description: c.l(D.description) }),
  render(c) {
    return {
      preloadImage: preload(c, "ploy-restaurant-dining-room"),
      main: html`${pageTop(c, { trail: [{ label: c.t("dining") }], eyebrowText: c.l(D.eyebrow), title: marked(c, D.h1), lead: c.l(D.lead) })}
${leadPhoto(c, "ploy-restaurant-dining-room")}
<section class="section" aria-labelledby="hours-title">
  <div class="wrap split split--flip">
    <div class="split__media reveal">${shot(c, "ploy-restaurant-breakfast-poolside", { group: "page", sizes: "(min-width: 900px) 56vw, 100vw" })}</div>
    <div class="split__body reveal" data-d="1">
      <h2 id="hours-title">${c.l(D.hoursHead)}</h2>
      ${hoursTable(c, { caption: c.l(D.hoursCaption), lastOrder: c.l(D.lastOrder) })}
      <p class="small muted">${c.t("sourceNote", { date: c.dateLong(c.config.factsChecked) })}</p>
    </div>
  </div>
</section>
<section class="section section--paper" aria-labelledby="know-title">
  <div class="wrap">
    <h2 class="sr-only" id="know-title">${c.l(D.knowHead)}</h2>
    <div class="trio">
      <div class="trio__item reveal">
        <h3 class="h3">${c.l(D.breakfastHead)}</h3>
        <p>${c.l(D.breakfast)}</p>
        ${bookButton(c, { cls: "arrow-link", label: c.t("checkAvailability"), iconName: "arrow" })}
      </div>
      <div class="trio__item reveal" data-d="1">
        <h3 class="h3">${c.l(D.dietHead)}</h3>
        <p>${c.l(D.diet)}</p>
        <a class="arrow-link" href="${c.href("contact/")}?about=dining">${c.l(D.ask)}${icon("arrow")}</a>
      </div>
      <div class="trio__item reveal" data-d="2">
        <h3 class="h3">${c.l(D.eveningHead)}</h3>
        <p>${c.l(D.evening)}</p>
        <a class="arrow-link" href="${c.hotel.phone.href}">${icon("phone")}${c.hotel.phone.display}</a>
      </div>
    </div>
  </div>
</section>
${closing(c)}`,
    };
  },
};

/* ---------- /facilities/ ---------- */

export const facilitiesDef = {
  id: "facilities",
  path: "facilities/",
  meta: (c) => ({ title: c.l(F.title), description: c.l(F.description) }),
  render(c) {
    const fac = (key) => c.hotel.facilities.find((f) => f.key === key);
    const pool = fac("pool"), fit = fac("fitness");
    const rest = c.hotel.facilities.filter((f) => !f.lead);
    return {
      preloadImage: preload(c, "hotel-pool-and-tower"),
      main: html`${pageTop(c, { trail: [{ label: c.t("facilities") }], eyebrowText: c.l(F.eyebrow), title: marked(c, F.h1), lead: c.l(F.lead) })}
${leadPhoto(c, "hotel-pool-and-tower")}
<section class="section" aria-labelledby="pool-title">
  <div class="wrap split">
    <div class="split__media reveal">${shot(c, "hotel-pool-loungers", { group: "page", sizes: "(min-width: 900px) 56vw, 100vw" })}</div>
    <div class="split__body reveal" data-d="1">
      <h2 id="pool-title">${c.l(pool.name)}</h2>
      <p class="lead">${c.l(pool.text)}</p>
    </div>
  </div>
</section>
<section class="section section--paper" aria-labelledby="fit-title">
  <div class="wrap split split--flip">
    <div class="split__media reveal">${shot(c, "hotel-fitness-centre", { group: "page", sizes: "(min-width: 900px) 56vw, 100vw" })}</div>
    <div class="split__body reveal" data-d="1">
      <h2 id="fit-title">${c.l(fit.name)}</h2>
      <p class="lead">${c.l(fit.text)}</p>
    </div>
  </div>
</section>
<section class="section" aria-labelledby="services-title">
  <div class="wrap">
    ${sectionHead(c, { title: c.l(F.directoryHead), id: "services-title" })}
    <ul class="fac-list fac-list--flush">
      ${rest.map((f) => html`<li>${icon(f.icon)}<div><b>${c.l(f.name)}</b>${f.text ? html`<span>${c.l(f.text)}</span>` : ""}</div></li>`)}
    </ul>
    <div class="notes notes--gap">
      <p class="note">${c.l(F.hoursNote)}</p>
      <p class="note">${c.l(F.parkingNote)}</p>
    </div>
  </div>
</section>
<section class="section section--paper" aria-labelledby="meet-title">
  <div class="wrap split">
    <div class="split__media reveal">${shot(c, "hotel-meeting-room", { group: "page", sizes: "(min-width: 900px) 56vw, 100vw" })}</div>
    <div class="split__body reveal" data-d="1">
      <h2 id="meet-title">${c.l(F.meetingsHead)}</h2>
      <p>${c.l(F.meetings)}</p>
      <p><a class="btn btn--line" href="${c.href("contact/")}?about=meeting">${c.l(F.meetingsAsk)}${icon("arrow")}</a></p>
    </div>
  </div>
</section>
<section class="section" aria-labelledby="green-title">
  <div class="wrap">
    <div class="callout callout--wide">
      <h2 class="h3" id="green-title">${icon("leaf", "callout__icon")}${c.l(F.greenHead)}</h2>
      <p>${c.l(F.green)}</p>
    </div>
  </div>
</section>
${closing(c)}`,
    };
  },
};

/* ---------- /location/ ---------- */

export const locationDef = {
  id: "location",
  path: "location/",
  meta: (c) => ({ title: c.l(L.title), description: c.l(L.description) }),
  render(c) {
    const h = c.hotel;
    const entrance = c.media("hotel-entrance");
    const kindName = (k) => c.l(L.kinds[k]);
    const origin = `${h.coords.lat}%2C${h.coords.lon}`;
    const dirTo = (p) => `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${p.lat}%2C${p.lon}&travelmode=walking`;

    const list = html`<ol class="places">
      ${places.map((p, i) => html`<li class="place" data-place="${p.id}" data-kind="${p.kind}">
        <button type="button" class="place__btn js-only" aria-expanded="false" aria-controls="place-${p.id}">
          <span class="place__n" aria-hidden="true">${i + 1}</span>
          <span><span class="place__name">${c.l(p.name)}</span><span class="place__kind">${kindName(p.kind)}</span></span>
          <span class="place__dist">${placeDistance(c, p)}</span>
        </button>
        <div class="place__btn place__btn--static nojs-only">
          <span class="place__n" aria-hidden="true">${i + 1}</span>
          <span><span class="place__name">${c.l(p.name)}</span><span class="place__kind">${kindName(p.kind)}</span></span>
          <span class="place__dist">${placeDistance(c, p)}</span>
        </div>
        <div class="place__more" id="place-${p.id}">
          <p>${c.l(p.what)}</p>
          ${p.hotelSays ? html`<p><b>${c.t("hotelSays")}:</b> ${c.l(p.hotelSays)}</p>` : ""}
          ${p.source ? html`<p class="small">${c.t("sourceLabel")}: ${c.l(p.source)}</p>` : ""}
          <p><a class="link" href="${dirTo(p)}" target="_blank" rel="noopener">${c.t("directionsFrom")}<span class="sr-only">: ${c.l(p.name)}</span>${newTab(c)}</a></p>
        </div>
      </li>`)}
    </ol>`;

    return {
      main: html`${pageTop(c, { trail: [{ label: c.t("location") }], eyebrowText: c.l(L.eyebrow), title: marked(c, L.h1), lead: c.l(L.lead) })}
<section class="section section--paper section--flush-top" aria-labelledby="arrive-title">
  <div class="wrap split split--map">
    <div class="split__media reveal">
      <figure class="shot" data-group="hotel">
        <div class="frame frame--32"><button type="button" class="zoomable" data-viewer="page" data-id="${entrance.id}" aria-label="${c.t("viewPhoto")}: ${c.l(entrance.caption)}">${pic(c, entrance.id, { sizes: "(min-width: 900px) 56vw, 100vw", eager: true })}</button></div>
        <figcaption>${c.l(L.entranceCap)}</figcaption>
      </figure>
    </div>
    <div class="split__body reveal" data-d="1">
      <h2 id="arrive-title">${c.l(L.arriveHead)}</h2>
      ${addressCard(c, { id: "loc-addr", showOther: c.lang === "en", extra: html`<p class="small muted">${c.l(L.addressNote)}</p>` })}
      <ul class="linklist">
        <li><a class="arrow-link" href="${h.links.mapListing}" target="_blank" rel="noopener">${c.t("viewOnMap")}${icon("out")}${newTab(c)}</a></li>
        <li><a class="arrow-link" href="${h.phone.href}">${icon("phone")}${h.phone.display}</a></li>
      </ul>
    </div>
  </div>
</section>
<section class="section" id="explore" aria-labelledby="explore-title">
  <div class="wrap">
    ${sectionHead(c, { title: c.l(L.exploreHead), id: "explore-title", lead: c.l(L.exploreLead) })}
    <div class="explorer" data-explorer>
      <div class="explorer__map">${mapPlate(c, places, { interactive: true })}</div>
      <div class="explorer__list">
        <div class="explorer__filters js-only" role="group" aria-label="${c.l(L.exploreHead)}">
          <button type="button" class="chip" data-filter="all" aria-pressed="true">${c.t("all")}</button>
          ${["shopping", "transport", "culture"].map((k) => html`<button type="button" class="chip" data-filter="${k}" aria-pressed="false">${kindName(k)}</button>`)}
          <span class="filterbar__count" data-count role="status" aria-live="polite"></span>
        </div>
        ${list}
        <p class="small muted">${c.t("straightNote")} ${c.t("sourceMap", { date: c.dateLong(c.config.factsChecked) })}</p>
      </div>
    </div>
  </div>
</section>
<section class="section section--paper" id="airports" aria-labelledby="air-title">
  <div class="wrap">
    ${sectionHead(c, { title: c.l(L.airportsHead), id: "air-title", lead: c.l(L.airportsLead) })}
    <div class="routes">
      ${routes.map((r) => {
        const p = placesIn([r.place])[0];
        return html`<article class="route reveal">
          <p class="label">${icon("plane", "route__icon")}${r.code}</p>
          <h3 class="h3">${c.l(r.title)}</h3>
          <p><b>${c.l(r.mode)}${c.lang === "th" ? "" : "."}</b>${r.intro ? html` ${c.l(r.intro)}` : ""}</p>
          <ol>${c.l(r.steps).map((s) => html`<li>${c.fmt(s, { d: placeDistance(c, p) })}</li>`)}</ol>
          ${r.alt ? html`<p>${c.l(r.alt)}</p>` : ""}
          <p class="small muted">${c.l(r.note)}</p>
        </article>`;
      })}
    </div>
    <p class="small muted routes__note">${c.fmt(c.l(routesMeta.checkedNote), { date: c.dateLong(routesMeta.checked) })}</p>
  </div>
</section>
<section class="section" aria-labelledby="access-title">
  <div class="wrap">
    <div class="callout callout--wide">
      <h2 class="h3" id="access-title">${c.l(L.accessHead)}</h2>
      <p>${c.l(L.access)}</p>
      <p><a class="arrow-link" href="${c.href("contact/")}?about=access">${c.l(L.accessAsk)}${icon("arrow")}</a></p>
    </div>
  </div>
</section>
${closing(c)}`,
    };
  },
};

/* ---------- /gallery/ ---------- */

export const galleryDef = {
  id: "gallery",
  path: "gallery/",
  meta: (c) => ({ title: c.l(G.title), description: c.l(G.description) }),
  render(c) {
    /* suites in the site's order, then dining, facilities and the building */
    const order = [
      ...suiteList.flatMap((s) => s.photos),
      ...media.filter((m) => m.group === "dining").map((m) => m.id),
      ...media.filter((m) => m.group === "facilities").map((m) => m.id),
      ...media.filter((m) => m.group === "hotel").map((m) => m.id),
    ];
    const missing = media.filter((m) => !order.includes(m.id));
    if (missing.length) throw new Error("Gallery is missing photographs: " + missing.map((m) => m.id).join(", "));
    const keys = ["all", "suites", "dining", "facilities", "hotel"];
    const groups = [
      ...suiteList.map((s) => ({ key: s.slug, title: c.l(s.name), href: c.href(`suites/${s.slug}/`), ids: s.photos })),
      ...["dining", "facilities", "hotel"].map((k) => ({ key: k, title: c.l(G.filters[k]), href: null, ids: media.filter((m) => m.group === k).map((m) => m.id) })),
    ];
    return {
      main: html`${pageTop(c, { trail: [{ label: c.t("gallery") }], eyebrowText: c.l(G.eyebrow), title: marked(c, G.h1), lead: c.l(G.lead) })}
<section class="section section--flush-top" aria-label="${c.t("photos")}">
  <div class="wrap" data-gallery>
    <div class="filterbar js-only" role="group" aria-label="${c.l(G.filterLabel)}">
      ${keys.map((k, i) => html`<button type="button" class="chip" data-filter="${k}" aria-pressed="${i === 0 ? "true" : "false"}">${c.l(G.filters[k])}</button>`)}
      <span class="filterbar__count" data-count role="status" aria-live="polite">${c.t("photosShown", { n: order.length })}</span>
    </div>
    ${groups.map((g, gi) => html`<section class="gallery-group" aria-labelledby="gal-${g.key}">
      <div class="gallery-group__head"><h2 class="h3" id="gal-${g.key}">${g.title}</h2>${g.href ? html`<a class="arrow-link" href="${g.href}">${c.t("seeSuite")}<span class="sr-only">: ${g.title}</span>${icon("arrow")}</a>` : ""}</div>
      <div class="gallery gallery--fit">${g.ids.map((id) => shot(c, id, { group: "gallery", sizes: "(min-width: 1040px) 46vw, (min-width: 620px) 46vw, 100vw", eager: gi === 0, suiteLink: false }))}</div>
    </section>`)}
  </div>
</section>
${closing(c)}`,
    };
  },
};
