/* Suites: the selector, all six at a glance, what every suite includes, the
   six suite pages and the comparison. */
import { html, raw, e } from "../../lib/html.mjs";
import { icon } from "../icons.mjs";
import { pic, shot, planner, bookButton, arrowLink, sectionHead, eyebrow, finder, pageTop, closingCta, suiteSpecs, areaText, areaValue, unlisted, srcsetOf } from "../components.mjs";
import { suitesPage as S, suitePage as P, comparePage as C } from "../../content/pages.mjs";
import { home } from "../../content/home.mjs";
import { suites, suiteList } from "../../data/suites.mjs";
import { marked } from "./shared.mjs";

const closing = (c) => closingCta(c, { title: marked(c, home.closing.title), text: c.l(home.closing.text), contactLabel: c.l(home.closing.contact) });

/* ---------- /suites/ ---------- */

export const suitesDef = {
  id: "suites",
  path: "suites/",
  meta: (c) => ({ title: c.l(S.title), description: c.l(S.description) }),
  render(c) {
    const cards = html`<div class="cards cards--3">
      ${suiteList.map((s) => html`<article class="card reveal">
        <a class="card__media" href="${c.href(`suites/${s.slug}/`)}" tabindex="-1" aria-hidden="true"><div class="frame frame--32">${pic(c, s.photos[1], { sizes: "(min-width: 1100px) 30vw, (min-width: 700px) 46vw, 100vw", alt: "" })}</div></a>
        <div class="card__body">
          <h3 class="card__title"><a href="${c.href(`suites/${s.slug}/`)}">${c.l(s.name)}</a></h3>
          <ul class="card__facts">
            <li>${areaValue(c, s)}</li>
            <li>${c.l(s.bedsShort)}</li>
            ${s.occupancy ? html`<li>${c.t("upToGuests", { n: s.occupancy })}</li>` : ""}
          </ul>
          <p>${c.l(s.line)}</p>
        </div>
      </article>`)}
    </div>`;

    return {
      main: html`${pageTop(c, { trail: [{ label: c.t("suites") }], eyebrowText: c.l(S.eyebrow), title: marked(c, S.h1), lead: c.l(S.lead), extra: html`<p class="small muted">${c.l(S.aside)}</p>` })}
<section class="section section--paper section--flush-top" aria-label="${c.t("suites")}">
  <div class="wrap">${finder(c, { idPrefix: "f", headingLevel: 2 })}</div>
</section>
<section class="section" aria-labelledby="all-title">
  <div class="wrap">
    ${sectionHead(c, { title: c.l(S.allHead), id: "all-title", side: arrowLink(c, c.href("suites/compare/"), c.t("compare")) })}
    ${cards}
  </div>
</section>
<section class="section section--paper" aria-labelledby="every-title">
  <div class="wrap cols-rail">
    <div class="cols-rail__head">
      <h2 id="every-title">${c.l(S.everyHead)}</h2>
      <p class="lead">${c.l(S.everyLead)}</p>
    </div>
    <ul class="ticks ticks--2">${c.hotel.inEverySuite.map((x) => html`<li>${c.l(x)}</li>`)}</ul>
  </div>
</section>
<section class="section" aria-labelledby="decide-title">
  <div class="wrap">
    <div class="callout callout--wide">
      <h2 class="h3" id="decide-title">${c.l(S.compareHead)}</h2>
      <p>${c.l(S.compareText)}</p>
      <p>${arrowLink(c, c.href("suites/compare/"), c.t("compare"))}</p>
    </div>
  </div>
</section>
${closing(c)}`,
    };
  },
};

/* ---------- /suites/<slug>/ ---------- */

export function suiteDef(s) {
  return {
    id: "suite:" + s.slug,
    path: `suites/${s.slug}/`,
    meta: (c) => ({
      title: c.fmt(c.l(P.titleTpl), { name: c.l(s.name), area: areaText(c, s) }),
      description: c.fmt(c.l(P.descTpl), { name: c.l(s.name), area: areaText(c, s), line: c.l(s.line) }),
    }),
    render(c) {
      const ids = s.photos;
      const set = ids.join(",");
      const many = ids.length >= 5;
      const side = many ? ids.slice(1, 5) : ids.slice(1, 3);
      const shown = 1 + side.length;
      const tile = (id, i, opts = {}) => {
        const m = c.media(id);
        const last = opts.last && ids.length > shown;
        return html`<div class="${opts.main ? "frame mosaic__main" : "frame"}"><button type="button" class="zoomable" data-viewer="suite" data-set="${set}" data-id="${m.id}" aria-label="${last ? `${c.t("allPhotos", { n: ids.length })} (${c.t("viewPhoto")}: ${c.l(m.caption)})` : `${c.t("viewPhoto")}: ${c.l(m.caption)}`}">${pic(c, id, { sizes: opts.main ? "(min-width: 900px) 60vw, 100vw" : "(min-width: 900px) 20vw, 25vw", eager: !!opts.main, high: !!opts.main })}${last ? html`<span class="mosaic__all"><span class="mosaic__all-long">${c.t("allPhotos", { n: ids.length })}</span><span class="mosaic__all-short" aria-hidden="true">+${ids.length - shown}</span></span>` : ""}</button></div>`;
      };
      const idx = suiteList.indexOf(s);
      const prev = suiteList[(idx - 1 + suiteList.length) % suiteList.length];
      const next = suiteList[(idx + 1) % suiteList.length];
      const first = c.media(ids[0]);

      const bathValue = s.bathrooms.count ? String(s.bathrooms.count) : c.l(s.bathrooms.detail);
      const keyfacts = html`<dl class="keyfacts">
        <div><dt>${c.l(P.size)}</dt><dd>${areaValue(c, s)}</dd></div>
        <div><dt>${c.t("beds")}</dt><dd>${c.l(s.bedsShort)}</dd></div>
        <div><dt>${c.t("bathrooms")}</dt><dd${s.bathrooms.count ? "" : raw(' class="keyfacts__text"')}>${bathValue}${s.bathrooms.count && s.bathrooms.detail ? html`<small>${c.l(s.bathrooms.detail)}</small>` : ""}</dd></div>
        <div><dt>${c.t("occupancy")}</dt><dd>${c.t("occupancyValue", { n: s.occupancy })}<small>${c.t("occupancySource")}</small></dd></div>
      </dl>`;

      const notes = [
        ...s.notes.map((n) => c.l(n)),
        c.fmt(c.l(P.occupancyNote), { n: s.occupancy }),
        c.l(P.breakfastNote),
      ];

      return {
        preloadImage: { srcset: srcsetOf(c, first, "avif"), sizes: "(min-width: 900px) 60vw, 100vw" },
        main: html`${pageTop(c, {
          trail: [{ label: c.t("suites"), href: c.href("suites/") }, { label: c.l(s.name) }],
          eyebrowText: c.l(P.eyebrow), title: c.l(s.name), lead: c.l(s.line),
        })}
<div class="wrap">
  <div class="${many ? "mosaic mosaic--5" : "mosaic mosaic--3"}">
    <div class="mosaic__main-wrap">${tile(ids[0], 0, { main: true })}</div>
    <div class="mosaic__side">${side.map((id, i) => tile(id, i + 1, { last: i === side.length - 1 }))}</div>
  </div>
</div>
<div class="wrap section section--tight">
  <div class="suite-layout">
    <div class="suite-main">
      ${keyfacts}
      <section aria-labelledby="about-title" class="stack">
        <h2 id="about-title">${c.l(P.aboutHead)}</h2>
        <p class="lead">${c.l(s.summary)}</p>
      </section>
      <section aria-labelledby="listed-title" class="stack listed">
        <h2 id="listed-title">${c.l(P.listedHead)}</h2>
        <ul class="ticks">${s.features.map((x) => html`<li>${c.l(x)}</li>`)}</ul>
        ${suiteSpecs(c, s)}
        <p class="small muted">${c.t("sourceNote", { date: c.dateLong(c.config.factsChecked) })}</p>
      </section>
      <section aria-labelledby="know-title" class="stack">
        <h2 id="know-title">${c.l(P.knowHead)}</h2>
        <div class="notes">${notes.map((n) => html`<p class="note">${n}</p>`)}</div>
      </section>
      <section aria-labelledby="every-title" class="stack">
        <h2 id="every-title">${c.l(P.everyHead)}</h2>
        <ul class="ticks ticks--2">${c.hotel.inEverySuite.map((x) => html`<li>${c.l(x)}</li>`)}</ul>
      </section>
    </div>
    <aside class="suite-aside" aria-labelledby="aside-title">
      <div class="aside-card">
        <h2 id="aside-title">${c.l(P.asideHead)}</h2>
        ${planner(c, { id: "sp", compact: true, suite: s })}
        <a class="arrow-link" href="${c.href("contact/")}?about=stay&amp;suite=${s.slug}">${c.l(P.asideEnquire)}${icon("arrow")}</a>
      </div>
    </aside>
  </div>
</div>
<section class="section section--paper" aria-labelledby="photos-title">
  <div class="wrap">
    ${sectionHead(c, { title: c.l(P.photosHead), id: "photos-title", lead: c.l(P.photosNote) })}
    <div class="gallery gallery--fit">
      ${ids.map((id) => shot(c, id, { group: "suite-all", sizes: "(min-width: 1040px) 31vw, (min-width: 620px) 46vw, 100vw", suiteLink: false }))}
    </div>
  </div>
</section>
<section class="section" aria-labelledby="compare-title">
  <div class="wrap">
    ${sectionHead(c, { title: c.l(P.compareHead), id: "compare-title", side: arrowLink(c, c.href("suites/compare/") + `?a=${s.slug}&b=${s.compareWith[0].slug}`, c.l(P.compareAll)) })}
    <div class="duo">
      ${s.compareWith.map((x) => {
        const o = suites[x.slug];
        return html`<div class="duo__item">
          <h3 class="card__title"><a href="${c.href(`suites/${o.slug}/`)}">${c.l(o.name)}</a></h3>
          <ul class="card__facts"><li>${areaValue(c, o)}</li><li>${c.l(o.bedsShort)}</li></ul>
          <p class="muted">${c.l(x.why)}</p>
        </div>`;
      })}
    </div>
    <nav class="pager" aria-label="${c.t("suites")}">
      <a href="${c.href(`suites/${prev.slug}/`)}" rel="prev"><span>${c.l(P.prev)}</span><b>${c.l(prev.name)}</b></a>
      <a href="${c.href(`suites/${next.slug}/`)}" rel="next"><span>${c.l(P.next)}</span><b>${c.l(next.name)}</b></a>
    </nav>
  </div>
</section>
${closing(c)}`,
      };
    },
  };
}

/* ---------- /suites/compare/ ---------- */

export const compareDef = {
  id: "compare",
  path: "suites/compare/",
  meta: (c) => ({ title: c.l(C.title), description: c.l(C.description) }),
  render(c) {
    const cell = (s, value, small = null) => html`<td data-col="${s.slug}">${value === null || value === undefined ? unlisted(c) : value}${small ? html`<small>${small}</small>` : ""}</td>`;
    const row = (label, fn) => html`<tr><th scope="row">${label}</th>${suiteList.map((s) => fn(s))}</tr>`;
    const opts = (sel) => suiteList.map((s, i) => html`<option value="${s.slug}"${i === sel ? raw(" selected") : ""}>${c.l(s.name)}</option>`);

    return {
      viewer: false,
      main: html`${pageTop(c, {
        trail: [{ label: c.t("suites"), href: c.href("suites/") }, { label: c.t("compare") }],
        eyebrowText: c.l(C.eyebrow), title: c.l(C.h1), lead: c.l(C.lead),
      })}
<section class="section section--flush-top section--paper" aria-labelledby="size-title">
  <div class="wrap cols-rail">
    <div class="cols-rail__head">
      <h2 id="size-title">${c.l(C.sizeHead)}</h2>
      <p class="small muted">${c.l(C.sizeNote)}</p>
    </div>
    <ol class="scale reveal">
      ${[...suiteList].sort((a, b) => a.area.max - b.area.max || a.area.min - b.area.min).map((s) => {
        const max = Math.max(...suiteList.map((x) => x.area.max));
        const to = (s.area.max / max) * 100, from = (s.area.min / max) * 100;
        return html`<li>
          <a class="scale__name" href="${c.href(`suites/${s.slug}/`)}">${c.l(s.name)}</a>
          <span class="scale__bar" aria-hidden="true"><i class="${s.area.approx ? "is-approx" : ""}" style="--to:${to.toFixed(2)};--from:${from.toFixed(2)}"></i></span>
          <span class="scale__v">${areaValue(c, s)}</span>
        </li>`;
      })}
    </ol>
  </div>
</section>
<section class="section" aria-labelledby="table-title">
  <div class="wrap">
    <h2 class="h3 compare-title" id="table-title">${c.l(C.tableHead)}</h2>
    <div class="compare-pick js-only">
      <label>${c.l(C.pickA)}<select data-pick-a>${opts(0)}</select></label>
      <label>${c.l(C.pickB)}<select data-pick-b>${opts(1)}</select></label>
    </div>
    <div class="table-scroll" tabindex="0" role="region" aria-label="${c.t("tableRegion")}">
      <table class="compare" data-compare>
        <caption class="sr-only">${c.l(C.caption)}</caption>
        <thead>
          <tr>
            <th scope="col"><span class="label">${c.l(C.feature)}</span></th>
            ${suiteList.map((s) => html`<th scope="col" data-col="${s.slug}"><a href="${c.href(`suites/${s.slug}/`)}">${c.l(s.name)}</a></th>`)}
          </tr>
        </thead>
        <tbody>
          ${row(c.t("area"), (s) => cell(s, areaValue(c, s)))}
          ${row(c.t("bedrooms"), (s) => cell(s, s.bedrooms === null ? null : String(s.bedrooms)))}
          ${row(c.t("beds"), (s) => cell(s, c.l(s.beds)))}
          ${row(c.t("bathrooms"), (s) => cell(s, s.bathrooms.count ? String(s.bathrooms.count) : c.l(s.bathrooms.detail), s.bathrooms.count && s.bathrooms.detail ? c.l(s.bathrooms.detail) : null))}
          ${row(c.t("living"), (s) => cell(s, s.living ? c.l(s.living) : null))}
          ${row(c.t("kitchen"), (s) => cell(s, s.kitchen ? c.l(s.kitchen) : null))}
          ${row(c.t("outdoor"), (s) => cell(s, s.outdoor ? c.l(s.outdoor) : null))}
          ${row(c.t("occupancy"), (s) => cell(s, c.t("occupancyValue", { n: s.occupancy })))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row"><span class="sr-only">${c.l(C.view)}</span></th>
            ${suiteList.map((s) => html`<td data-col="${s.slug}"><a class="arrow-link" href="${c.href(`suites/${s.slug}/`)}" aria-label="${c.l(C.view)}: ${c.l(s.name)}">${c.l(C.view)}${icon("arrow")}</a></td>`)}
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="scroll-hint small muted">${c.l(C.scrollHint)}</p>
    <div class="legend">
      <p>${c.l(C.legendUnlisted)}</p>
      <p>${c.l(C.legendLiving)}</p>
      <p>${c.fmt(c.l(C.legendGuests), { date: c.dateLong(c.config.factsChecked) })}</p>
    </div>
    <div class="compare-cta">
      ${bookButton(c, { cls: "btn btn--ink", iconName: "out" })}
      <a class="btn btn--line" href="${c.href("suites/")}">${c.t("suites")}${icon("arrow")}</a>
    </div>
  </div>
</section>
${closing(c)}`,
    };
  },
};
