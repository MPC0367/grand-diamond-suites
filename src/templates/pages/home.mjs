/* Home: the opening photograph, the stay planner, three reasons, the suite
   selector, the address, dining, facilities, a few photographs, the
   essentials and the closing invitation. */
import { html, raw } from "../../lib/html.mjs";
import { icon, KIND_ICON } from "../icons.mjs";
import { pic, shot, planner, bookButton, bookingUrl, arrowLink, sectionHead, eyebrow, finder, faqList, mapPlate, hoursTable, addressCard, srcsetOf, newTab, newTabNote } from "../components.mjs";
import { home as T } from "../../content/home.mjs";
import { suites } from "../../data/suites.mjs";
import { NEAR_HOME } from "../../data/places.mjs";
import { faqItems, placeDistance, placesIn, marked } from "./shared.mjs";

/* the opening photograph fills the screen; site.js uses the same value for the later slides */
const HERO_SIZES = "100vw";

export const homeDef = {
  id: "home",
  path: "",
  meta: (c) => ({ title: c.l(T.title), description: c.l(T.description) }),
  render(c) {
    const slides = T.hero.slides.map((s) => {
      const m = c.media(s.photo);
      const suite = s.suite ? suites[s.suite] : null;
      return { m, name: suite ? c.l(suite.name) : c.l(s.name), cap: c.l(m.caption), href: suite ? c.href(`suites/${suite.slug}/`) : "" };
    });
    const first = slides[0];
    const near = placesIn(NEAR_HOME);

    const hero = html`<section class="hero" data-hero aria-labelledby="hero-title">
  <div class="hero__media">
    <div class="hero__slide is-on" data-name="${first.name}" data-cap="${first.cap}" data-href="${first.href}">${pic(c, first.m.id, { sizes: HERO_SIZES, eager: true, high: true, focal: first.m.focal })}</div>
    ${slides.slice(1).map((s) => html`<div class="hero__slide" data-photo="${s.m.id}" data-name="${s.name}" data-cap="${s.cap}" data-href="${s.href}" aria-hidden="true"></div>`)}
  </div>
  <div class="wrap hero__in">
    <div class="hero__panel">
      ${eyebrow(c, c.l(T.hero.eyebrow))}
      <h1 class="display" id="hero-title">${marked(c, T.hero.title)}</h1>
      <p class="hero__sub">${c.l(T.hero.sub)}</p>
      <div class="hero__actions">
        <a class="btn btn--paper" href="#plan" data-prefer-dock data-hero-cta>${c.t("checkDates")}${icon("down")}</a>
        <a class="btn btn--line-light" href="#find-your-space">${c.l(T.hero.explore)}${icon("arrow")}</a>
      </div>
      <p class="hero__more">${arrowLink(c, c.href("suites/compare/"), c.l(T.hero.compare))}</p>
    </div>
    <div class="hero__foot">
      <p class="hero__meta"><span>${c.l(T.hero.street)}</span><span class="js-only" data-clock data-fmt="${c.t("localTime")}" hidden></span><span class="js-only" data-sunset data-fmt="${c.t("sunset")}" hidden></span></p>
      <div class="hero__label">
        <p class="plate"><span class="plate__k">${c.t("pictured")}</span><span class="plate__name" data-hero-name>${first.href ? html`<a href="${first.href}">${first.name}</a>` : first.name}</span><span class="plate__cap" data-hero-cap>${first.cap}</span></p>
        <div class="slide-ctl js-only" data-hero-ctl>
          <span class="slide-count" data-hero-count aria-hidden="true">01 / ${String(slides.length).padStart(2, "0")}</span>
          <span class="slide-bars" aria-hidden="true">${slides.map((s, i) => html`<i${i === 0 ? raw(' class="is-on"') : ""}></i>`)}</span>
          <button type="button" class="icon-btn" data-hero-prev aria-label="${c.t("prevPhoto")}">${icon("prev")}</button>
          <button type="button" class="icon-btn" data-hero-pause aria-label="${c.t("pause")}">${icon("pause")}${icon("play")}</button>
          <button type="button" class="icon-btn" data-hero-next aria-label="${c.t("nextPhoto")}">${icon("next")}</button>
        </div>
        <span class="sr-only" aria-live="polite" data-hero-live></span>
      </div>
    </div>
  </div>
</section>`;

    /* the one stay planner on this page: the opening button and the phone bar both lead here */
    const dock = html`<section class="planner-zone" id="plan" tabindex="-1">
  <div class="wrap" data-dock>${planner(c, { id: "hp" })}</div>
</section>`;

    const reasons = html`<section class="section section--tight" aria-labelledby="reasons-title">
  <div class="wrap">
    <h2 class="sr-only" id="reasons-title">${c.l(T.reasons.heading)}</h2>
    <div class="reasons">
      ${T.reasons.items.map((r, i) => html`<div class="reason reveal" data-d="${i}">
        <h3 class="reason__k">${/^\d+$/.test(c.l(r.key)) ? html`<span data-count="${c.l(r.key)}">${c.l(r.key)}</span>` : c.l(r.key)} <small>${c.l(r.unit)}</small></h3>
        <p>${c.l(r.text)}</p>
        ${arrowLink(c, r.href, c.l(r.link))}
      </div>`)}
    </div>
  </div>
</section>`;

    const find = html`<section class="section section--paper" id="find-your-space" aria-labelledby="finder-title">
  <div class="wrap">
    ${sectionHead(c, {
      eyebrowText: c.l(T.finder.eyebrow), title: marked(c, T.finder.title), lead: c.l(T.finder.lead), id: "finder-title", num: "01",
      side: html`<p class="small muted">${c.l(T.finder.aside)}</p>${arrowLink(c, c.href("suites/compare/"), c.l(T.finder.compare))}`,
    })}
    ${finder(c, { idPrefix: "f", headingLevel: 3, eagerFirst: false })}
  </div>
</section>`;

    const band = html`<section class="band on-deep on-photo" aria-labelledby="band-title">
  <div class="band__media">${pic(c, T.band.photo, { sizes: "100vw" })}</div>
  <div class="wrap band__in">
    <div class="band__grid">
      <h2 class="band__title reveal" id="band-title">${c.l(T.band.title)}</h2>
      <div class="band__note reveal" data-d="1">
        <p><b>${c.l(T.band.noteHead)}</b>${c.l(T.band.note)}</p>
        ${arrowLink(c, c.href("suites/penthouse-suite/"), c.l(T.band.link))}
      </div>
    </div>
  </div>
</section>`;

    const address = html`<section class="section" id="address" aria-labelledby="address-title">
  <div class="wrap">
    ${sectionHead(c, {
      eyebrowText: c.l(T.address.eyebrow), title: marked(c, T.address.title), lead: c.l(T.address.lead), id: "address-title", num: "02",
      side: arrowLink(c, c.href("location/"), c.l(T.address.explore)),
    })}
    <div class="split split--map">
      <div class="split__media reveal">${mapPlate(c, near)}</div>
      <div class="split__body reveal" data-d="1">
        ${addressCard(c, { id: "home-addr" })}
        <div class="near-block">
          <h3 class="label">${c.l(T.address.nearHead)}</h3>
          <ul class="near">
            ${near.map((p) => html`<li data-near="${p.id}"><span class="near__n" aria-hidden="true">${icon(KIND_ICON[p.kind])}</span><b>${c.l(p.name)}</b><span>${placeDistance(c, p)}</span></li>`)}
          </ul>
          <p class="small muted">${c.t("straightNote")}</p>
        </div>
      </div>
    </div>
  </div>
</section>`;

    const ploy = html`<section class="section section--paper" id="ploy" aria-labelledby="ploy-title">
  <div class="wrap split split--flip">
    <div class="split__media reveal">${shot(c, "ploy-restaurant-dining-room", { group: "home", sizes: "(min-width: 900px) 56vw, 100vw" })}</div>
    <div class="split__body reveal" data-d="1">
      ${eyebrow(c, c.l(T.ploy.eyebrow), "03")}
      <h2 id="ploy-title">${c.l(T.ploy.title)}</h2>
      <p class="lead">${c.l(T.ploy.lead)}</p>
      <div class="hours-card">
        <p class="live js-only" data-serving="${JSON.stringify(c.hotel.dining.services.map((s) => ({ n: c.l(s.name), o: s.opens, c: s.closes })))}" data-fmt="${c.t("servingNow")}" hidden></p>
        ${hoursTable(c, { caption: c.l(T.ploy.hoursCaption), lastOrder: c.l(T.ploy.lastOrder) })}
      </div>
      <p class="small muted">${c.l(T.ploy.breakfast)}</p>
      <p>${arrowLink(c, c.href("dining/"), c.l(T.ploy.link))}</p>
    </div>
  </div>
</section>`;

    /* facilities: a dark chapter of photograph cards, then everything else the hotel lists */
    const facPhoto = { pool: "hotel-pool-loungers", fitness: "hotel-fitness-centre", dining: "ploy-restaurant-breakfast-poolside", meetings: "hotel-meeting-room" };
    const facCards = c.hotel.facilities.filter((f) => facPhoto[f.key] && f.text);
    const facilities = html`<section class="section section--deep on-deep" id="facilities" aria-labelledby="fac-title">
  <div class="wrap">
    ${sectionHead(c, {
      eyebrowText: c.l(T.facilities.eyebrow), title: c.l(T.facilities.title), lead: c.l(T.facilities.lead), id: "fac-title", num: "04",
      side: arrowLink(c, c.href("facilities/"), c.l(T.facilities.link)),
    })}
    <ul class="fac-cards">
      ${facCards.map((f, i) => html`<li class="fac-card reveal" data-d="${i % 3}">
        ${shot(c, facPhoto[f.key], { ratio: "43", group: "home", caption: false, sizes: "(min-width: 1100px) 24vw, (min-width: 640px) 46vw, 100vw" })}
        <h3 class="fac-card__t">${c.l(f.name)}</h3>
        <p>${c.l(f.text)}</p>
      </li>`)}
    </ul>
    <ul class="fac-tags" aria-label="${c.l(T.facilities.eyebrow)}">
      ${c.hotel.facilities.map((f) => html`<li>${c.l(f.name)}</li>`)}
    </ul>
  </div>
</section>`;

    const gallery = html`<section class="section section--paper" id="look-around" aria-labelledby="gal-title">
  <div class="wrap">
    ${sectionHead(c, {
      eyebrowText: c.l(T.gallery.eyebrow), title: c.l(T.gallery.title), lead: c.l(T.gallery.lead), id: "gal-title", num: "05",
      side: arrowLink(c, c.href("gallery/"), c.l(T.gallery.link)),
    })}
    <div class="reel" data-reel>
      <div class="reel__track" data-reel-track>
        ${T.gallery.photos.map((id) => shot(c, id, { group: "home", ratio: "43", sizes: "(min-width: 900px) 40vw, 82vw" }))}
      </div>
      <div class="reel__ctl js-only">
        <button type="button" class="round-btn" data-reel-prev aria-label="${c.t("prevPhotos")}">${icon("prev")}</button>
        <button type="button" class="round-btn" data-reel-next aria-label="${c.t("nextPhotos")}">${icon("next")}</button>
      </div>
    </div>
  </div>
</section>`;

    const essentials = html`<section class="section" id="essentials" aria-labelledby="ess-title">
  <div class="wrap cols-rail">
    <div class="cols-rail__head">
      ${eyebrow(c, c.l(T.essentials.eyebrow), "06")}
      <h2 id="ess-title">${c.l(T.essentials.title)}</h2>
      <p class="lead">${c.l(T.essentials.lead)}</p>
      <p>${arrowLink(c, c.href("faq/"), c.l(T.essentials.link))}</p>
    </div>
    <div>${faqList(c, faqItems(c, T.essentials.ids))}</div>
  </div>
</section>`;

    const towers = c.media(T.closing.photo);
    const closing = html`<section class="section section--deep on-deep" aria-labelledby="closing-title">
  <div class="wrap closing">
    <div class="closing__body">
      <h2 class="closing__title" id="closing-title">${marked(c, T.closing.title)}</h2>
      <p>${c.l(T.closing.text)}</p>
      <div class="closing__actions">
        ${bookButton(c, { cls: "btn btn--paper" })}
        <a class="btn btn--line-light" href="${c.href("contact/")}">${c.l(T.closing.contact)}</a>
      </div>
    </div>
    <figure class="reveal">
      <div class="frame frame--43">${pic(c, towers.id, { sizes: "(min-width: 900px) 40vw, 100vw" })}</div>
      <figcaption>${c.l(towers.caption)}</figcaption>
    </figure>
  </div>
</section>`;

    const chapters = [["find-your-space", T.finder.eyebrow], ["address", T.address.eyebrow], ["ploy", T.ploy.eyebrow], ["facilities", T.facilities.eyebrow], ["look-around", T.gallery.eyebrow], ["essentials", T.essentials.eyebrow]];
    const rail = html`<nav class="rail js-only" aria-label="${c.t("onThisPage")}" data-rail>
  <ol>${chapters.map(([id, name], i) => html`<li><a href="#${id}"><span class="rail__n">${String(i + 1).padStart(2, "0")}</span><span class="rail__t">${c.l(name)}</span></a></li>`)}</ol>
</nav>`;

    return {
      main: html`${hero}${dock}${reasons}${find}${band}${address}${ploy}${facilities}${gallery}${essentials}${closing}${rail}`,
      preloadImage: { srcset: srcsetOf(c, first.m, "avif"), sizes: HERO_SIZES },
    };
  },
};
