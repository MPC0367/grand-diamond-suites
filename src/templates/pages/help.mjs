/* Offers, contact, questions, privacy, booking terms, the 404 page and the
   bare-address page. */
import { html, raw, e } from "../../lib/html.mjs";
import { icon } from "../icons.mjs";
import { planner, bookButton, arrowLink, sectionHead, eyebrow, pageTop, closingCta, faqList, addressCard, newTab, o2Credit } from "../components.mjs";
import { offersPage as O, contactPage as K, faqPage as Q, privacyPage as PV, termsPage as TM, notFoundPage as NF } from "../../content/pages.mjs";
import { home } from "../../content/home.mjs";
import { faqGroups } from "../../content/faq.mjs";
import { suiteList } from "../../data/suites.mjs";
import { faqItems, rich, marked } from "./shared.mjs";

const closing = (c) => closingCta(c, { title: marked(c, home.closing.title), text: c.l(home.closing.text), contactLabel: c.l(home.closing.contact) });

/* ---------- /offers/ ---------- */

export const offersDef = {
  id: "offers",
  path: "offers/",
  meta: (c) => ({ title: c.l(O.title), description: c.l(O.description) }),
  render(c) {
    return {
      viewer: false,
      main: html`${pageTop(c, { trail: [{ label: c.t("offers") }], eyebrowText: c.l(O.eyebrow), title: marked(c, O.h1), lead: c.l(O.lead) })}
<section class="section section--paper section--flush-top" aria-labelledby="how-title">
  <div class="wrap cols-rail">
    <div class="cols-rail__head">
      <h2 id="how-title">${c.l(O.howHead)}</h2>
    </div>
    <div class="stack stack--lg">
      <ol class="steps">${c.l(O.steps).map((s) => html`<li>${s}</li>`)}</ol>
      <div class="planner-block--narrow">${planner(c, { id: "op", compact: true })}</div>
    </div>
  </div>
</section>
<section class="section" aria-labelledby="why-title">
  <div class="wrap duo">
    <div class="duo__item">
      <h2 class="h3" id="why-title">${c.l(O.whyHead)}</h2>
      <p class="muted">${c.l(O.why)}</p>
      <a class="arrow-link" href="${c.hotel.links.officialOffers[c.lang]}" target="_blank" rel="noopener">${c.l(O.official)}${icon("out")}${newTab(c)}</a>
    </div>
    <div class="duo__item">
      <h2 class="h3">${c.l(O.longHead)}</h2>
      <p class="muted">${c.l(O.long)}</p>
      <a class="arrow-link" href="${c.href("contact/")}?about=long">${c.l(O.enquire)}${icon("arrow")}</a>
    </div>
  </div>
</section>
${closing(c)}`,
    };
  },
};

/* ---------- /contact/ ---------- */

export const contactDef = {
  id: "contact",
  path: "contact/",
  meta: (c) => ({ title: c.l(K.title), description: c.l(K.description) }),
  render(c) {
    const h = c.hotel;
    const labels = {};
    for (const [k, v] of Object.entries(K.js)) labels[k] = c.l(v);
    labels.intents = {};
    for (const [k, v] of Object.entries(K.intents)) labels.intents[k] = c.l(v);
    const opt = html`<span class="hint"> (${c.l(K.optional)})</span>`;
    const control = (name, label, input, { hint = null, optional = false } = {}) => html`<div class="control">
        <label for="enq-${name}">${label}${optional ? opt : ""}</label>
        ${input}
        ${hint ? html`<span class="hint" id="enq-${name}-hint">${hint}</span>` : ""}
        <span class="err" id="enq-${name}-err" role="alert"></span>
      </div>`;

    const form = html`<form class="form js-only" data-enquiry data-to="${h.email.address}" data-labels="${JSON.stringify(labels)}" novalidate onsubmit="return false">
      <fieldset class="control">
        <legend>${c.l(K.about)}</legend>
        <div class="radios">
          ${Object.entries(K.intents).map(([k, v], i) => html`<label class="radio"><input type="radio" name="intent" value="${k}"${i === 0 ? raw(" checked") : ""}><span>${c.l(v)}</span></label>`)}
        </div>
      </fieldset>
      <div class="form__row form__row--2">
        ${control("name", c.l(K.name), html`<input type="text" id="enq-name" name="name" autocomplete="name">`, { optional: true })}
        ${control("email", c.l(K.emailL), html`<input type="email" id="enq-email" name="email" autocomplete="email" inputmode="email" aria-describedby="enq-email-err">`, { optional: true })}
      </div>
      <div class="form__row form__row--3">
        ${control("phone", c.l(K.phoneL), html`<input type="tel" id="enq-phone" name="phone" autocomplete="tel" inputmode="tel">`, { optional: true })}
        ${control("arrive", c.l(K.arrive), html`<input type="date" id="enq-arrive" name="arrive" data-hint="${c.t("dateHint")}" aria-describedby="enq-arrive-err">`, { optional: true })}
        ${control("depart", c.l(K.depart), html`<input type="date" id="enq-depart" name="depart" data-hint="${c.t("dateHint")}" aria-describedby="enq-depart-err">`, { optional: true })}
      </div>
      <div class="form__row form__row--2">
        ${control("party", c.l(K.party), html`<input type="text" id="enq-party" name="party" aria-describedby="enq-party-hint">`, { hint: c.l(K.partyHint), optional: true })}
        ${control("suite", c.l(K.suite), html`<select id="enq-suite" name="suite"><option value="">${c.l(K.noSuite)}</option>${suiteList.map((s) => html`<option value="${c.l(s.name)}" data-slug="${s.slug}">${c.l(s.name)}</option>`)}</select>`, { optional: true })}
      </div>
      ${control("message", c.l(K.message), html`<textarea id="enq-message" name="message" rows="5" aria-describedby="enq-message-hint enq-message-err"></textarea>`, { hint: c.l(K.messageHint) })}
      <div><button type="submit" class="btn btn--ink">${c.l(K.prepare)}${icon("arrow")}</button></div>
    </form>
    <div class="compose" data-enquiry-out tabindex="-1" role="region" aria-labelledby="enq-ready" hidden>
      <h3 class="h3" id="enq-ready">${c.l(K.readyHead)}</h3>
      <p class="small muted">${c.l(K.readyNote)}</p>
      <pre data-enquiry-text tabindex="0" role="group" aria-labelledby="enq-ready"></pre>
      <div class="compose__actions">
        <button type="button" class="btn btn--ink" data-enquiry-copy>${icon("copy")}${c.l(K.copy)}</button>
        <a class="btn btn--line" data-enquiry-mail href="mailto:${h.email.address}">${icon("mail")}${c.l(K.mail)}</a>
      </div>
      <p class="status" data-enquiry-status role="status" aria-live="polite"></p>
    </div>
    <p class="note nojs-only">${c.l(K.nojs)}</p>`;

    return {
      viewer: false,
      main: html`${pageTop(c, { trail: [{ label: c.t("contact") }], eyebrowText: c.l(K.eyebrow), title: marked(c, K.h1), lead: c.l(K.lead) })}
<section class="section section--paper section--flush-top">
  <div class="wrap contact-grid">
    <div class="stack stack--lg">
      <h2 class="h3">${c.l(K.directHead)}</h2>
      <ul class="channels">
        <li><span class="label">${c.t("phone")}</span><a class="big" href="${h.phone.href}">${h.phone.display}</a></li>
        <li><span class="label">${c.t("email")}</span><a class="big big--long" href="mailto:${h.email.address}">${h.email.address}</a></li>
        <li><span class="label">${c.t("follow")}</span>
          <span class="channels__links">
            <a class="link" href="${h.links.line}" target="_blank" rel="noopener">LINE${newTab(c)}</a>
            <a class="link" href="${h.links.facebook}" target="_blank" rel="noopener">Facebook${newTab(c)}</a>
            <a class="link" href="${h.links.instagram}" target="_blank" rel="noopener">Instagram${newTab(c)}</a>
          </span>
        </li>
      </ul>
      ${addressCard(c, { id: "contact-addr", extra: html`<p>${arrowLink(c, c.href("location/"), c.t("location"))}</p>` })}
    </div>
    <div class="stack stack--lg" id="enquiry">
      <div class="stack">
        <h2 class="h3">${c.l(K.composeHead)}</h2>
        <p class="muted">${c.l(K.composeLead)}</p>
      </div>
      ${form}
    </div>
  </div>
</section>
${closing(c)}`,
    };
  },
};

/* ---------- /faq/ ---------- */

export const faqDef = {
  id: "faq",
  path: "faq/",
  meta: (c) => ({ title: c.l(Q.title), description: c.l(Q.description) }),
  render(c) {
    const items = faqItems(c);
    const plain = (s) => s.replace(/<[^>]+>/g, "");
    return {
      viewer: false,
      jsonld: {
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: items.map((q) => ({ "@type": "Question", name: c.l(q.q), acceptedAnswer: { "@type": "Answer", text: c.l(q.a).map(plain).join(" ") } })),
      },
      main: html`${pageTop(c, {
        trail: [{ label: c.t("faq") }], eyebrowText: c.l(Q.eyebrow), title: marked(c, Q.h1), lead: c.l(Q.lead),
        extra: html`<nav class="toc" aria-label="${c.l(Q.jump)}">${faqGroups.map((g) => html`<a class="chip" href="#${g.id}">${c.l(g.title)}</a>`)}</nav>`,
      })}
<section class="section section--paper section--flush-top">
  <div class="wrap">
    <div class="faq-groups">
      ${faqGroups.map((g) => html`<section class="faq-group" aria-labelledby="${g.id}">
        <h2 id="${g.id}">${c.l(g.title)}</h2>
        ${faqList(c, items.filter((q) => q.group === g.id))}
      </section>`)}
    </div>
  </div>
</section>
<section class="section" aria-labelledby="more-title">
  <div class="wrap">
    <div class="callout callout--wide">
      <h2 class="h3" id="more-title">${c.l(Q.moreHead)}</h2>
      <p>${c.l(Q.more)}</p>
      <div class="closing__actions">
        <a class="btn btn--ink" href="${c.href("contact/")}">${c.t("contact")}${icon("arrow")}</a>
        <a class="btn btn--line" href="${c.hotel.phone.href}">${icon("phone")}${c.hotel.phone.display}</a>
      </div>
    </div>
  </div>
</section>
${closing(c)}`,
    };
  },
};

/* ---------- /privacy/ and /booking-terms/ ---------- */

function textPage(c, T, { key, trailLabel }) {
  const preview = c.config.mode === "preview";
  const sections = T.sections.filter((s) => preview || !s.preview);
  return html`${pageTop(c, { trail: [{ label: trailLabel }], eyebrowText: c.l(T.eyebrow), title: marked(c, T.h1), lead: c.l(T.lead), split: false })}
<section class="section section--paper section--flush-top">
  <div class="wrap">
    <div class="text-page">
      ${sections.map((s, i) => html`<section aria-labelledby="${key}-${i + 1}">
        <h2 id="${key}-${i + 1}">${c.l(s.h)}</h2>
        ${c.l(s.p).map((p) => html`<p>${raw(rich(c, p))}</p>`)}
      </section>`)}
    </div>
  </div>
</section>`;
}

export const privacyDef = {
  id: "privacy",
  path: "privacy/",
  meta: (c) => ({ title: c.l(PV.title), description: c.l(PV.description) }),
  render: (c) => ({ viewer: false, main: html`${textPage(c, PV, { key: "privacy", trailLabel: c.t("privacy") })}${closing(c)}` }),
};

export const termsDef = {
  id: "booking-terms",
  path: "booking-terms/",
  meta: (c) => ({ title: c.l(TM.title), description: c.l(TM.description) }),
  render: (c) => ({
    viewer: false,
    main: html`${textPage(c, TM, { key: "terms", trailLabel: c.t("bookingTerms") })}
<section class="section" aria-labelledby="go-title">
  <div class="wrap cols-rail">
    <div class="cols-rail__head"><h2 id="go-title">${c.t("planStay")}</h2></div>
    <div class="planner-block--narrow">${planner(c, { id: "tp", compact: true })}</div>
  </div>
</section>
${closing(c)}`,
  }),
};

/* ---------- 404 ---------- */

export const notFound = {
  meta: (c) => ({ title: c.l(NF.title), description: c.l(NF.text) }),
  render(c) {
    const links = (lang) => {
      const base = c.config.basePath + lang + "/";
      const t = (k) => c.fmt(uiText(c, k, lang));
      return html`<ul class="linklist linklist--row">
        <li><a class="btn btn--ink" href="${base}">${t("goHome")}${icon("arrow")}</a></li>
        <li><a class="btn btn--line" href="${base}suites/">${t("suites")}</a></li>
        <li><a class="btn btn--line" href="${base}location/">${t("location")}</a></li>
        <li><a class="btn btn--line" href="${base}contact/">${t("contact")}</a></li>
      </ul>`;
    };
    return {
      main: html`<section class="section notfound">
  <div class="wrap notfound__in">
    <div class="stack stack--lg">
      <p class="eyebrow">404</p>
      <h1>${NF.h1.en}</h1>
      <p class="lead">${NF.text.en}</p>
      ${links("en")}
    </div>
    <div class="stack stack--lg" lang="th">
      <p class="eyebrow">404</p>
      <p class="h2">${NF.h1.th}</p>
      <p class="lead">${NF.text.th}</p>
      ${links("th")}
    </div>
  </div>
</section>`,
    };
  },
};

/* interface words in a named language, for the pages that show both */
import { ui } from "../../i18n/ui.mjs";
const uiText = (c, key, lang) => ui[key][lang];

/* ---------- the bare address ---------- */

/** A small standalone page at the site root. It sends the visitor to a
    language (a remembered choice first, then the browser's language, then
    English) and keeps the old one-page site's section links meaningful.
    Without JavaScript it is a plain choice of two links. */
export function rootPage({ config, stamp, hotel, t }) {
  const legacy = { "#suites": "suites/", "#dining": "dining/", "#facilities": "facilities/", "#location": "location/", "#gallery": "gallery/", "#reserve": "contact/", "#welcome": "", "#hero": "" };
  const preview = config.mode === "preview";
  return `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(hotel.name.en)}${preview ? ", unofficial concept" : ""}</title>
<meta name="description" content="${e(hotel.name.en)}, Bangkok. Choose English or Thai.">
${preview ? '<meta name="robots" content="noindex, nofollow">' : ""}
<meta name="theme-color" content="#F5F2EC">
<link rel="icon" href="assets/img/favicon.png" type="image/png">
<script>(function(){var map=${JSON.stringify(legacy)};var lang="en";try{var s=localStorage.getItem("gd:lang");if(s==="en"||s==="th")lang=s;else if(/^th\\b/i.test(navigator.language||""))lang="th"}catch(e){}try{var q=new URLSearchParams(location.search).get("lang");if(q==="en"||q==="th")lang=q}catch(e){}var h=(location.hash||"").toLowerCase();location.replace(lang+"/"+(map[h]||""))})();</script>
<link rel="stylesheet" href="assets/css/site.css?v=${stamp}">
</head>
<body>
<main class="center-page">
  <div class="center-page__in">
    <picture><source type="image/webp" srcset="assets/img/logo-gold.webp"><img src="assets/img/logo-gold.png" width="669" height="251" alt=""></picture>
    <h1 class="h2">${e(hotel.name.en)}</h1>
    ${preview ? `<p class="small muted">${e(t("conceptStrip", "en"))}</p><p class="small muted" lang="th">${e(t("conceptStrip", "th"))}</p>` : ""}
    <div class="choices">
      <a class="btn btn--ink" href="en/" lang="en" hreflang="en">English</a>
      <a class="btn btn--line" href="th/" lang="th" hreflang="th">ภาษาไทย</a>
    </div>
  </div>
</main>
</body>
</html>
`;
}
