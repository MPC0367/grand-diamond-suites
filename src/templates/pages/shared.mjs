/* Helpers used by more than one page template. */
import { html, raw, e } from "../../lib/html.mjs";
import { faq, faqLinks } from "../../content/faq.mjs";
import { places, placeById, metresBetween } from "../../data/places.mjs";
import { distText } from "../components.mjs";

/** Escape a sentence, then turn its {placeholders} into links and dates. */
export function rich(c, text) {
  return e(text).replace(/\{(\w+)\}/g, (m, k) => {
    if (k === "checked") return e(c.dateLong(c.config.factsChecked));
    const L = faqLinks[k];
    return L ? `<a class="link" href="${e(c.href(L.path))}">${e(c.l(L.text))}</a>` : m;
  });
}

/** Questions ready for faqList: answers escaped and linked for this page's language. */
export function faqItems(c, ids = null) {
  const list = ids ? ids.map((id) => { const q = faq.find((x) => x.id === id); if (!q) throw new Error("Unknown question: " + id); return q; }) : faq;
  return list.map((q) => ({ id: q.id, group: q.group, q: q.q, a: { [c.lang]: c.l(q.a).map((p) => rich(c, p)) } }));
}

/** Straight-line distance from the hotel, as text. */
export function placeDistance(c, p) {
  return distText(c, metresBetween(c.hotel.coords, p));
}

export const placesIn = (ids) => ids.map((id) => { const p = placeById.get(id); if (!p) throw new Error("Unknown place: " + id); return p; });

export { places };

/** Text that may carry the few inline tags the content files use (em, b, br). */
export const marked = (c, o) => raw(c.l(o));

/** A paragraph list. */
export const paras = (list) => list.map((p) => html`<p>${p}</p>`);
