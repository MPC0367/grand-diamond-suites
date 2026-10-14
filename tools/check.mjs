/* Quality checks in a real browser (Edge, through Playwright).

   Part 1, the sweep: every page in both languages at ten viewport sizes.
     no failed request, no script error, no sideways scroll, nothing wider
     than the screen outside a scrolling box, every image loaded, nothing
     left hidden by the reveal effect, no request to another site, no
     content-policy refusal, no cookie, and the concept safeguards in place.
   Part 2, behaviour: the stay planner and its booking link, dialogs, the
     suite selector, the photograph viewer, comparison, the map explorer,
     its markers, zoom and satellite view, gallery filter, enquiry helper,
     language switch, old section links,
     the 404 page, no JavaScript, reduced motion and keyboard basics.
   Part 2b, regression cases found in review.
   Part 2c, the acceptance scenarios of the second audit. Each check is
     named "AC-nn ..." after the scenario it answers, and the results are
     written, grouped by scenario, to _private/qa/acceptance.json.
   Part 3, accessibility scan (axe-core, WCAG 2.2 A and AA rules) on every
     page at a phone and a desktop width, and on the three dialogs.
   Part 4, lab figures: bytes transferred and the largest-paint element for
     the main pages. Timings come from a local server, so only the sizes
     are meaningful; they are recorded, not judged.

   Nothing here contacts the hotel's website: every request outside the
   local server is stopped, and recorded so the checks can read where a
   link would have gone. The one live look at the booking page is
   tools/probe-booking.mjs, run by hand and sparingly.

   Usage: node tools/check.mjs [--base=http://localhost:8321/grand-diamond-suites/] [--quick]
          [--only=sweep|behaviour|acceptance|axe|lab] [--block=<part of a block name>] [--engine=webkit] */
import { chromium, webkit } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a === "--" + name || a.startsWith("--" + name + "="));
  if (!hit) return dflt;
  return hit.includes("=") ? hit.slice(name.length + 3) : true;
};
const BASE = String(arg("base", "http://localhost:8321/grand-diamond-suites/")).replace(/\/?$/, "/");
const ORIGIN = new URL(BASE).origin;
const quick = !!arg("quick", false);
const only = arg("only", null);
const engine = arg("engine", "chromium"); /* "webkit" runs the same checks in Safari's engine */
const edge = engine !== "webkit";
const runs = (part) => !only || only === part || (only === "behaviour" && part === "acceptance");

const report = JSON.parse(await readFile("_private/build-report.json", "utf8"));
const routes = report.pages.map((p) => p.path);
const VIEWPORTS = quick
  ? [[390, 844], [1440, 900]]
  : [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [844, 390], [1920, 1080]];

const fails = [], failed = [], passes = [], notes = [];
const show = !!arg("show", false);   /* --show prints every check as it passes, to see where a block stops */
const ok = (name) => { passes.push(name); if (show) console.log("  ok " + name); };
const bad = (name, detail) => { fails.push(`${name}: ${detail}`); failed.push({ name, detail }); console.log("  x " + name + ": " + detail); };
const expect = (cond, name, detail = "") => (cond ? ok(name) : bad(name, String(detail || "failed").slice(0, 400)));
const note = (name, text) => { notes.push({ name, text: String(text) }); };
/* one scenario failing with an exception must not stop the others */
/* --block=<text> runs only the blocks whose name contains it, for working on one part */
const pick = arg("block", null);
const block = async (name, fn) => { if (pick && !name.includes(String(pick))) return; try { await fn(); } catch (e) { bad(name, "stopped: " + String(e && e.message ? e.message : e).split("\n")[0].slice(0, 300)); } };

const browser = edge ? await chromium.launch({ channel: "msedge", headless: true }) : await webkit.launch();
const browserVersion = browser.version();
const mob = edge ? true : undefined; /* Playwright's WebKit has no mobile emulation switch */

const BOOK = "https://www.granddiamondsuites.com/booking";
const BOOK_TH = "https://www.granddiamondsuites.com/th/booking";
const everyLeave = []; /* every attempt to leave for another site, across the whole run */

async function newContext(opts = {}) {
  const ctx = await browser.newContext({ locale: "en-GB", timezoneId: "Asia/Bangkok", ...opts });
  ctx.setDefaultTimeout(9000);
  ctx.outside = [];
  ctx.on("request", (r) => {
    const u = r.url();
    if (/^https?:/.test(u) && !u.startsWith(ORIGIN)) { const o = { url: u, nav: r.isNavigationRequest(), method: r.method(), referer: r.headers().referer || "" }; ctx.outside.push(o); everyLeave.push(o); }
  });
  /* stay on the local server: the hotel's site and any other host are never contacted */
  await ctx.route((url) => !String(url).startsWith(ORIGIN), (route) => route.abort());
  return ctx;
}
const leaves = (ctx) => ctx.outside.filter((o) => o.nav).map((o) => o.url);
/* a booking link opens a new tab; the request is stopped, the tab is closed, the address stays on record */
async function closePopups(ctx, keep) {
  await keep.waitForTimeout(450);
  for (const p of ctx.pages()) if (p !== keep) await p.close().catch(() => {});
}

function watch(page, bucket) {
  page.on("pageerror", (e) => bucket.push("script error: " + String(e).slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|ERR_BLOCKED|ERR_ABORTED|net::|Failed to load resource/.test(m.text())) bucket.push("console: " + m.text().slice(0, 160)); });
  page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) bucket.push(r.status() + " " + r.url().slice(BASE.length)); });
}

/* the handles of one planner: "#plan" on the home page, "#stay" on a suite page, "#plan-dialog" for the sheet */
const plannerAt = (page, scope, id) => ({
  in: `#${id}-in`, out: `#${id}-out`, ad: `#${id}-ad`, ch: `#${id}-ch`, age: (i) => `#${id}-age${i}`,
  go: `${scope} [data-go]`, clear: `${scope} [data-clear-dates]`, book: `${scope} [data-recover-book]`, ask: `${scope} [data-recover-ask]`,
  href: () => page.getAttribute(`${scope} [data-go]`, "href"),
  msg: async () => (await page.textContent(`#${id}-msg`)).trim(),
  dates: async () => (await page.textContent(`${scope} [data-h-dates]`)).trim(),
  guests: async () => (await page.textContent(`${scope} [data-h-guests]`)).trim(),
  recovering: () => page.isVisible(`${scope} [data-recover]`),
  bookHref: () => page.getAttribute(`${scope} [data-recover-book]`, "href"),
  askHref: () => page.evaluate((s) => document.querySelector(s).href, `${scope} [data-recover-ask]`),
  focusId: () => page.evaluate(() => (document.activeElement && (document.activeElement.id || document.activeElement.getAttribute("data-recover-book") !== null && "recover-book")) || ""),
});

const bkkToday = () => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const o = {}; p.forEach((x) => (o[x.type] = x.value));
  return `${o.year}-${o.month}-${o.day}`;
};
const addDays = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const TODAY = bkkToday();

/* ------------------------------------------------------------------ */
/* Part 1: the sweep                                                    */
/* ------------------------------------------------------------------ */
if (runs("sweep")) {
  console.log(`Sweep: ${routes.length} pages x ${VIEWPORTS.length} viewports`);
  let cookies = 0;
  const outsideOnLoad = new Set();
  for (const [w, h] of VIEWPORTS) {
    const phone = w < 700 || h < 500;
    const ctx = await newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: phone ? mob : undefined, hasTouch: phone });
    await ctx.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + (e.blockedURI || "inline"))); });
    const page = await ctx.newPage();
    let problems = 0;
    for (const route of routes) {
      const errs = [];
      const onErr = (e) => errs.push("script error: " + String(e).slice(0, 160));
      const onCon = (m) => { if (m.type() === "error" && !/net::|Failed to load resource/.test(m.text())) errs.push("console: " + m.text().slice(0, 160)); };
      const onRes = (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) errs.push(r.status() + " " + r.url().slice(BASE.length)); };
      page.on("pageerror", onErr); page.on("console", onCon); page.on("response", onRes);
      const res = await page.goto(BASE + route, { waitUntil: "load" });
      if (!res || res.status() !== 200) errs.push("status " + (res ? res.status() : "none"));
      /* walk the page so lazy images load and reveals run */
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(h * 0.85)) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(70); }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(260);
      const info = await page.evaluate(async () => {
        const vw = document.documentElement.clientWidth;
        const meta = (sel) => { const m = document.querySelector(sel); return m ? m.getAttribute("content") || "" : null; };
        const strip = document.querySelector(".concept-strip");
        const out = {
          overflow: document.documentElement.scrollWidth > vw + 1, wide: [], images: [], hidden: 0, h1: document.querySelectorAll("h1").length, lang: document.documentElement.lang,
          robots: meta('meta[name="robots"]'), canonical: !!document.querySelector('link[rel="canonical"]'), ld: document.querySelectorAll('script[type="application/ld+json"]').length,
          strip: !!strip && strip.getClientRects().length > 0 && strip.tagName === "ASIDE" && !!strip.getAttribute("aria-label") && !strip.closest("header, main, footer, nav"),
          stripText: strip ? strip.textContent.trim() : "", og: meta('meta[property="og:image"]'), ogAlt: meta('meta[property="og:image:alt"]'),
          csp: (window.__csp || []).slice(0, 3), policy: meta('meta[http-equiv="Content-Security-Policy"]'), cookie: document.cookie,
          crumbs: !!document.querySelector(".crumbs a"), footer: document.querySelectorAll("#footer-nav a").length,
        };
        const inScroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
        for (const el of document.querySelectorAll("body *")) {
          if (el.closest("dialog:not([open])")) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if ((r.right > vw + 1 || r.left < -1) && !inScroller(el) && getComputedStyle(el).position !== "fixed") out.wide.push((el.className && String(el.className).slice(0, 40)) || el.tagName);
        }
        /* photographs inside a closed selector panel are not rendered, so the browser rightly leaves them unloaded */
        const imgs = [...document.querySelectorAll("img")].filter((i) => !i.closest("dialog") && i.getAttribute("src") && i.getClientRects().length > 0);
        await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((res) => { i.addEventListener("load", res); i.addEventListener("error", res); setTimeout(res, 4000); }))));
        for (const i of imgs) if (!(i.complete && i.naturalWidth > 0)) out.images.push(i.currentSrc || i.src);
        out.hidden = [...document.querySelectorAll(".reveal")].filter((e) => getComputedStyle(e).opacity === "0").length;
        return out;
      });
      const lang = route.slice(0, 2);
      if (info.overflow) errs.push("page scrolls sideways");
      if (info.wide.length) errs.push("wider than the screen: " + [...new Set(info.wide)].slice(0, 4).join(", "));
      if (info.images.length) errs.push("image not loaded: " + info.images.slice(0, 2).join(", "));
      if (info.hidden) errs.push(info.hidden + " block(s) still hidden by the reveal effect");
      if (info.h1 !== 1) errs.push("H1 count " + info.h1);
      if (info.lang !== lang) errs.push("html lang is " + info.lang);
      /* the concept safeguards (AC-56), the share card (AC-58) and the content policy (AC-62), on every page */
      if (report.mode === "preview" || report.mode === undefined) {
        if (!/noindex/.test(info.robots || "")) errs.push("no noindex");
        if (info.canonical || info.ld) errs.push("canonical or structured data on a concept page");
        if (!info.strip) errs.push("concept notice missing, hidden or inside a landmark");
        if (!/^https:\/\/[^/]+\/.*assets\/img\/social-card-concept-(en|th)\.jpg$/.test(info.og || "") || !(info.og || "").endsWith(`-${lang}.jpg`)) errs.push("share image is not the concept card for this language: " + info.og);
        if (!(lang === "en" ? /unofficial/i : /ไม่เป็นทางการ/).test(info.ogAlt || "")) errs.push("share image description does not say unofficial");
      }
      if (!/default-src 'self'/.test(info.policy || "") || /script-src[^;]*'unsafe-inline'/.test(info.policy || "")) errs.push("content policy missing or loosened");
      if (info.csp.length) errs.push("content policy refused: " + info.csp.join(", "));
      if (info.cookie) { errs.push("a cookie was set"); cookies++; }
      if (route.length > 3 && !info.crumbs) errs.push("no breadcrumb");
      if (info.footer < 8) errs.push("footer navigation has " + info.footer + " links");
      page.off("pageerror", onErr); page.off("console", onCon); page.off("response", onRes);
      if (errs.length) { problems++; bad(`sweep ${w}x${h} ${route}`, errs.join(" | ")); } else ok(`sweep ${w}x${h} ${route}`);
    }
    ctx.outside.forEach((o) => outsideOnLoad.add(o.url));
    cookies += (await ctx.cookies()).length;
    console.log(`  ${w}x${h}: ${routes.length - problems}/${routes.length} clean`);
    await ctx.close();
  }
  expect(outsideOnLoad.size === 0, "AC-62 privacy: loading and scrolling every page asks nothing of any other site", [...outsideOnLoad].slice(0, 3).join(", "));
  expect(cookies === 0, "AC-62 privacy: no cookie is set on any page", String(cookies));
  ok("AC-41 navigation: all " + routes.length + " routes answer, each with its breadcrumb and footer navigation (sweep)");
  ok("AC-56 preview: every page carries noindex, the concept notice outside the landmarks, and no canonical or structured data (sweep)");
  ok("AC-58 share card: every page points to the concept card for its own language by a full address (sweep)");
  ok("AC-48 reflow: no page scrolls sideways at 320 wide, or in landscape at 844 by 390 (sweep)");
  /* the sweep's own findings decide these four; a failing sweep line is listed above and fails the run */
}

/* ------------------------------------------------------------------ */
/* Part 2: behaviour                                                    */
/* ------------------------------------------------------------------ */
if (runs("behaviour")) {
  console.log("Behaviour");
  /* ---------- desktop ---------- */
  await block("desktop behaviour", async () => {
    const ctx = await newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = []; watch(page, errs);

    await page.goto(BASE + "en/", { waitUntil: "load" });
    const hp = plannerAt(page, "#plan", "hp");

    expect((await hp.href()) === BOOK + "?adults=2", "planner: no dates gives adults only", await hp.href());
    expect((await hp.dates()) === "Not selected" && (await hp.guests()) === "2 adults", "planner: the summary says that no dates are selected", (await hp.dates()) + " / " + (await hp.guests()));

    const a = addDays(TODAY, 10), b = addDays(TODAY, 13);
    await page.fill(hp.in, a);
    await page.fill(hp.out, b);
    await page.selectOption(hp.ad, "3");
    expect((await hp.href()) === `${BOOK}?date=${a}&nights=3&adults=3`, "planner: date, nights, adults", await hp.href());
    expect(/\(3 nights\)$/.test(await hp.dates()) && (await hp.guests()) === "3 adults", "planner: summary of what is passed on", (await hp.dates()) + " / " + (await hp.guests()));

    await page.selectOption(hp.ch, "2");
    expect((await hp.guests()) === "3 adults, 2 children (ages needed)", "planner: summary says the ages are still needed", await hp.guests());
    await page.click(hp.go);
    await closePopups(ctx, page);
    expect(leaves(ctx).length === 0 && /age of each child/i.test(await hp.msg()), "planner: children need ages before leaving", await hp.msg());
    expect((await page.getAttribute(hp.age(1), "aria-invalid")) === "true", "planner: the empty age field is marked");
    await page.selectOption(hp.age(1), "5"); await page.selectOption(hp.age(2), "9");
    expect((await hp.href()) === `${BOOK}?date=${a}&nights=3&adults=3&children-age=5;9`, "planner: children by age", await hp.href());
    expect((await hp.guests()) === "3 adults, 2 children aged 5 and 9", "planner: summary names the children and their ages", await hp.guests());

    /* three children, the oldest allowed age */
    await page.selectOption(hp.ch, "3"); await page.selectOption(hp.age(3), "17");
    expect((await hp.href()).endsWith("children-age=5;9;17"), "planner: three children", await hp.href());
    await page.selectOption(hp.ch, "0");
    expect(!(await hp.href()).includes("children-age"), "planner: removing children removes them from the link", await hp.href());

    /* check-out on or before check-in is moved forward and said so */
    await page.fill(hp.in, addDays(TODAY, 20));
    expect((await page.inputValue(hp.out)) === addDays(TODAY, 21) && /moved/i.test(await hp.msg()), "planner: check-out follows check-in", (await page.inputValue(hp.out)) + " / " + (await hp.msg()));

    /* one date only */
    await page.fill(hp.out, "");
    await page.click(hp.go); await closePopups(ctx, page);
    expect(leaves(ctx).length === 0 && /check-out date/i.test(await hp.msg()), "planner: one date alone is refused", await hp.msg());

    /* a date in the past */
    await page.fill(hp.in, addDays(TODAY, -2));
    await page.fill(hp.out, addDays(TODAY, 2));
    await page.click(hp.go); await closePopups(ctx, page);
    expect(leaves(ctx).length === 0 && /earlier than today/i.test(await hp.msg()), "planner: a past date is refused", await hp.msg());

    /* same-day arrival is allowed */
    await page.fill(hp.in, TODAY);
    await page.fill(hp.out, addDays(TODAY, 1));
    expect((await hp.href()) === `${BOOK}?date=${TODAY}&nights=1&adults=3`, "planner: same-day arrival, one night", await hp.href());

    /* the stay follows the visitor to another page and language */
    await page.goto(BASE + "th/suites/family-suite/", { waitUntil: "load" });
    const sp = plannerAt(page, "#stay", "sp");
    expect((await page.inputValue(sp.in)) === TODAY && (await page.inputValue(sp.ad)) === "3", "planner: stay kept across pages");
    expect((await sp.href()) === `${BOOK_TH}?date=${TODAY}&nights=1&adults=3`, "planner: Thai pages hand over to the Thai booking page", await sp.href());

    /* a page with a planner of its own uses that one: the header button goes to it */
    await page.click(".header-cta");
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => !document.getElementById("plan-dialog").open && document.activeElement && document.activeElement.id === "sp-in"), "header button: on a suite page it goes to that page's planner");

    /* every other page opens the planner as a sheet; Escape closes it and focus returns */
    await page.goto(BASE + "th/dining/", { waitUntil: "load" });
    await page.click(".header-cta");
    expect(await page.evaluate(() => document.getElementById("plan-dialog").open), "dialog: header button opens the planner");
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id === "pd-in"), "dialog: focus moves into the planner");
    expect((await page.inputValue("#pd-in")) === TODAY && (await page.inputValue("#pd-ad")) === "3", "dialog: it shows the stay already chosen");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => !document.getElementById("plan-dialog").open && document.activeElement.classList.contains("header-cta")), "dialog: Escape closes it and focus returns");

    /* More menu */
    await page.click("[data-more]");
    expect(await page.evaluate(() => !document.getElementById("more-panel").hidden), "header: More opens");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.getElementById("more-panel").hidden && document.activeElement.hasAttribute("data-more")), "header: Escape closes More and returns focus");

    /* suite selector, thumbnails, viewer */
    await page.goto(BASE + "en/suites/", { waitUntil: "load" });
    await page.click('.finder__tab[data-suite="family-suite"]');
    expect(await page.evaluate(() => [...document.querySelectorAll(".finder__panel")].filter((p) => !p.hidden).length === 1 && !document.getElementById("f-family-suite").hidden), "selector: one suite open at a time");
    await page.click("#f-family-suite .thumb:nth-child(3)");
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => /family-suite-king-bed-wardrobes/.test(document.querySelector("#f-family-suite .stage__frame img").currentSrc)), "selector: thumbnail changes the large photograph");
    expect((await page.textContent("#f-family-suite [data-stage-count]")).includes("3 of 5"), "selector: counter follows");
    await page.click("#f-family-suite [data-stage-open]");
    expect(await page.evaluate(() => document.getElementById("viewer").open), "viewer: opens from the selector");
    expect((await page.textContent("#viewer [data-count]")).trim() === "Photograph 3 of 5", "viewer: starts on the chosen photograph", await page.textContent("#viewer [data-count]"));
    await page.keyboard.press("ArrowRight");
    expect((await page.textContent("#viewer [data-count]")).trim() === "Photograph 4 of 5", "viewer: arrow keys move");
    expect((await page.getAttribute("#viewer [data-img]", "alt")).length > 20, "viewer: the photograph is described");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => !document.getElementById("viewer").open), "viewer: Escape closes");

    /* suite page */
    await page.goto(BASE + "en/suites/penthouse-suite/", { waitUntil: "load" });
    await page.click(".mosaic__main .zoomable");
    expect((await page.textContent("#viewer [data-count]")).trim() === "Photograph 1 of 6", "suite page: viewer holds all six photographs");
    await page.keyboard.press("Escape");

    /* comparison link carries two suites */
    await page.click('a.arrow-link[href*="compare/?a=penthouse-suite"]');
    await page.waitForLoadState("load");
    expect(/a=penthouse-suite&b=executive-suite/.test(page.url()), "suite page: comparison link names both suites", page.url());

    /* map explorer */
    await page.goto(BASE + "en/location/", { waitUntil: "load" });
    await page.click('[data-explorer] [data-filter="transport"]');
    expect(await page.evaluate(() => [...document.querySelectorAll(".place")].filter((p) => !p.hidden).length) === 4, "explorer: filter shows four transport places");
    expect((await page.textContent("[data-explorer] [data-count]")).trim() === "4 shown", "explorer: count is announced");
    expect(await page.evaluate(() => document.querySelectorAll(".pin.is-dim").length === 8 && document.querySelectorAll(".pin:disabled").length === 8), "explorer: other pins are switched off");
    await page.click('[data-explorer] [data-filter="all"]');
    await page.click('.pin[data-pin="erawan"]');
    expect(await page.evaluate(() => { const r = document.querySelector('.place[data-place="erawan"]'); return r.querySelector(".place__btn").getAttribute("aria-expanded") === "true" && !r.querySelector(".place__more").hidden && document.querySelector('.pin[data-pin="erawan"]').getAttribute("aria-pressed") === "true"; }), "explorer: a pin opens its place in the list");
    await page.click('.place[data-place="platinum"] .place__btn');
    expect(await page.evaluate(() => document.querySelector('.pin[data-pin="platinum"]').getAttribute("aria-pressed") === "true" && document.querySelector('.pin[data-pin="erawan"]').getAttribute("aria-pressed") === "false"), "explorer: the list drives the pins");
    expect(await page.evaluate(() => [...document.querySelectorAll(".place__more a")].every((x) => /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=13\.7504126%2C100\.5385094&destination=/.test(x.href))), "explorer: every place has directions from the hotel's coordinates");

    /* gallery */
    await page.goto(BASE + "en/gallery/", { waitUntil: "load" });
    expect(await page.evaluate(() => document.querySelectorAll(".gallery .shot").length) === 38, "gallery: all 38 photographs");
    await page.click('[data-gallery] [data-filter="dining"]');
    expect(await page.evaluate(() => [...document.querySelectorAll(".gallery .shot")].filter((s) => !s.classList.contains("is-hidden")).length) === 2 && /filter=dining/.test(page.url()), "gallery: filter narrows and is kept in the address");
    await page.click(".gallery .shot:not(.is-hidden) .zoomable");
    expect((await page.textContent("#viewer [data-count]")).trim() === "Photograph 1 of 2", "gallery: viewer follows the filter");
    await page.keyboard.press("Escape");
    await page.reload({ waitUntil: "load" });
    expect(await page.evaluate(() => document.querySelector('[data-filter="dining"]').getAttribute("aria-pressed") === "true"), "gallery: filter survives a reload");

    /* enquiry helper */
    await page.goto(BASE + "en/contact/?about=meeting&suite=deluxe-suite", { waitUntil: "load" });
    expect(await page.evaluate(() => document.querySelector('input[name="intent"][value="meeting"]').checked && document.getElementById("enq-suite").value === "Deluxe Suite"), "enquiry: the link preselects subject and suite");
    await page.fill("#enq-arrive", ""); await page.fill("#enq-depart", "");
    await page.click("[data-enquiry-prepare]");
    expect((await page.textContent("#enq-message-err")).length > 5 && await page.evaluate(() => document.querySelector("[data-enquiry-out]").hidden), "enquiry: an empty question is refused");
    await page.fill("#enq-email", "not-an-email"); await page.fill("#enq-message", "Is the room free for twelve people?");
    await page.click("[data-enquiry-prepare]");
    expect((await page.textContent("#enq-email-err")).length > 5, "enquiry: a malformed email is refused");
    await page.fill("#enq-email", "guest@example.com"); await page.fill("#enq-name", "A Guest");
    await page.click("[data-enquiry-prepare]");
    const text = await page.textContent("[data-enquiry-text]");
    expect(/Hello Grand Diamond Suites Hotel,/.test(text) && /Enquiry: A meeting/.test(text) && /twelve people/.test(text) && /guest@example\.com/.test(text), "enquiry: the message is written", text.slice(0, 120));
    const mail = await page.getAttribute("[data-enquiry-mail]", "href");
    expect(mail.startsWith("mailto:reservation@granddiamondsuites.com?subject=") && mail.includes("body="), "enquiry: opens in the visitor's own email app", mail.slice(0, 80));
    expect(await page.evaluate(() => sessionStorage.getItem("gd:enquiry") === null && [...Object.keys(sessionStorage)].every((k) => !/message|email|name/.test(k))), "enquiry: nothing typed is stored");

    /* language switch keeps the page, the query and the anchor */
    await page.goto(BASE + "en/suites/penthouse-suite/?x=1#photos-title", { waitUntil: "load" });
    await page.click(".header-tools [data-lang-switch]");
    await page.waitForLoadState("load");
    expect(page.url() === BASE + "th/suites/penthouse-suite/?x=1#photos-title", "language: same page, query and anchor", page.url());
    expect(await page.evaluate(() => localStorage.getItem("gd:lang")) === "th", "language: the choice is remembered for the bare address");
    await page.goto(BASE, { waitUntil: "load" }); await page.waitForTimeout(300);
    expect(page.url() === BASE + "th/", "bare address: goes to the remembered language", page.url());
    await page.goto(BASE + "?lang=en#suites", { waitUntil: "load" }); await page.waitForTimeout(300);
    expect(page.url() === BASE + "en/suites/", "bare address: an old section link reaches its page", page.url());

    /* questions */
    await page.goto(BASE + "en/faq/#q-parking", { waitUntil: "load" });
    expect(await page.evaluate(() => document.getElementById("q-parking").open), "questions: a direct link opens its answer");

    /* hero controls */
    await page.goto(BASE + "en/", { waitUntil: "load" });
    await page.click("[data-hero-next]");
    await page.waitForTimeout(400);
    expect((await page.textContent("[data-hero-name]")).trim() === "Penthouse Suite" && (await page.textContent("[data-hero-count]")).trim() === "02 / 03", "hero: next shows the second photograph and names it");
    expect((await page.getAttribute("[data-hero-pause]", "aria-label")) === "Play the photographs", "hero: choosing a photograph stops the sequence");
    expect(await page.evaluate(() => { const i = document.querySelector(".hero__slide.is-on img"); return i && i.complete && i.naturalWidth > 0; }), "hero: the second photograph loaded");
    /* the hero button is a link to the planner on the page */
    await page.click("[data-hero-cta]");
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => { const r = document.getElementById("plan").getBoundingClientRect(); return document.activeElement.id === "hp-in" && r.top < innerHeight && r.bottom > 0; }), "hero: Check dates goes to the planner and puts the keyboard in its first field");

    /* keyboard: first Tab is the skip link, and it works */
    await page.goto(BASE + "en/dining/", { waitUntil: "load" });
    if (edge) {
      /* Safari's engine leaves links out of the Tab order unless the visitor turns that on, so this is checked in Edge only */
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement.classList.contains("skip")), "keyboard: skip link is first");
      await page.keyboard.press("Enter");
      expect(await page.evaluate(() => location.hash === "#main"), "keyboard: skip link goes to the content");
    }

    /* 404 */
    const res = await page.goto(BASE + "en/no-such-page/", { waitUntil: "load" });
    expect(res.status() === 404 && /This page is not here/.test(await page.textContent("h1")), "404: served with the site's own page");
    expect(await page.evaluate((b) => [...document.querySelectorAll("a[href]")].filter((x) => !/^(https?:|mailto:|tel:|#)/.test(x.getAttribute("href"))).every((x) => x.getAttribute("href").startsWith(new URL(b).pathname)), BASE), "404: links work from any depth");

    const real = errs.filter((x) => !/no-such-page|status of 404/.test(x));
    expect(real.length === 0, "desktop: no script errors or failed requests during the tests", real.slice(0, 3).join(" | "));
    await ctx.close();
  });

  /* ---------- phone ---------- */
  await block("phone behaviour", async () => {
    const ctx = await newContext({ viewport: { width: 390, height: 844 }, isMobile: mob, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = []; watch(page, errs);
    await page.goto(BASE + "en/", { waitUntil: "load" });
    expect(await page.evaluate(() => !document.querySelector("[data-mcta]").classList.contains("is-on")), "phone: booking bar waits while the hero button is on screen");
    await page.evaluate(() => window.scrollTo(0, 3200)); await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.querySelector("[data-mcta]").classList.contains("is-on")), "phone: booking bar appears after the hero");
    /* the home page has its own planner: the bar goes to it, and steps aside while it is on screen */
    await page.tap("[data-mcta] [data-open-planner]");
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => { const z = document.getElementById("plan"); const r = z.getBoundingClientRect(); return !document.getElementById("plan-dialog").open && r.top < innerHeight - 120 && r.bottom > 120 && (document.activeElement === z || z.contains(document.activeElement)); }), "phone: on the home page the bar goes to the planner on the page");
    expect(await page.evaluate(() => !document.querySelector("[data-mcta]").classList.contains("is-on")), "phone: the bar steps aside while the page's planner is on screen");
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
    await page.tap("[data-open-menu]");
    expect(await page.evaluate(() => document.getElementById("menu").open && document.querySelectorAll("#menu .menu__list a").length === 8), "phone: menu opens with all eight destinations");
    await page.tap("#menu [data-close]");
    expect(await page.evaluate(() => !document.getElementById("menu").open), "phone: menu closes");

    /* a page without a planner of its own: the bar opens the sheet */
    await page.goto(BASE + "en/dining/", { waitUntil: "load" });
    await page.evaluate(() => window.scrollTo(0, 1400)); await page.waitForTimeout(400);
    await page.tap("[data-mcta] [data-open-planner]");
    expect(await page.evaluate(() => document.getElementById("plan-dialog").open), "phone: booking bar opens the planner sheet");
    expect(await page.evaluate(() => !document.querySelector("[data-mcta]").classList.contains("is-on")), "phone: the bar hides behind a dialog");
    await page.tap("#plan-dialog [data-close]");

    /* selector as an accordion */
    await page.goto(BASE + "en/suites/", { waitUntil: "load" });
    await page.tap('.finder__tab[data-suite="deluxe-suite"]');
    expect(await page.evaluate(() => !document.getElementById("f-deluxe-suite").hidden && document.getElementById("f-junior-suite").hidden), "phone: selector opens one suite and closes the other");
    await page.tap('.finder__tab[data-suite="deluxe-suite"]');
    expect(await page.evaluate(() => document.getElementById("f-deluxe-suite").hidden), "phone: an open suite can be closed");

    /* comparison shows two suites at a time */
    await page.goto(BASE + "en/suites/compare/?a=family-suite&b=penthouse-suite", { waitUntil: "load" });
    expect(await page.evaluate(() => { const vis = [...document.querySelectorAll(".compare thead th[data-col]")].filter((t) => getComputedStyle(t).display !== "none").map((t) => t.getAttribute("data-col")); return vis.join() === "family-suite,penthouse-suite"; }), "phone: comparison shows the two suites named in the link");

    /* the map pans inside its own box and starts on the hotel */
    await page.goto(BASE + "en/location/", { waitUntil: "load" });
    await page.waitForTimeout(300);
    const pan = await page.evaluate(() => { const p = document.querySelector("[data-view]"); const pin = p.querySelector(".pin--hotel").getBoundingClientRect(), box = p.getBoundingClientRect(), all = p.querySelector("[data-pins]").getBoundingClientRect(); return { over: all.width > box.width + 20, covers: all.left <= box.left + 1 && all.right >= box.right - 1 && all.top <= box.top + 1 && all.bottom >= box.bottom - 1, tab: p.tabIndex, name: (p.getAttribute("aria-label") || "").length > 20, centred: Math.abs((pin.left + pin.width / 2) - (box.left + box.width / 2)) < 30, page: document.documentElement.scrollWidth <= innerWidth, touch: getComputedStyle(p).touchAction }; });
    expect(pan.over && pan.covers && pan.tab === 0 && pan.name && pan.centred && pan.page, "phone: the map fills its window, starts on the hotel, has more to either side, and is reachable by keyboard", JSON.stringify(pan));
    expect(pan.touch === "pan-y", "phone: before it is zoomed, an up or down swipe on the map still scrolls the page", pan.touch);
    await page.tap('.place[data-place="jim-thompson"] .place__btn');
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => { const p = document.querySelector("[data-view]"); const pin = p.querySelector('[data-pin="jim-thompson"]').getBoundingClientRect(), box = p.getBoundingClientRect(); return pin.left >= box.left && pin.right <= box.right && pin.top >= box.top && pin.bottom <= box.bottom; }), "phone: choosing a place brings its pin into view");
    await page.tap('[data-zoom="in"]'); await page.waitForTimeout(500);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-view]")).touchAction) === "none", "phone: once zoomed in, one finger moves the map in any direction");
    await page.tap('[data-zoom="reset"]'); await page.waitForTimeout(500);
    await page.locator('.pin[data-pin="platinum"]').scrollIntoViewIfNeeded();
    const yPin = await page.evaluate(() => scrollY);
    await page.tap('.pin[data-pin="platinum"]'); await page.waitForTimeout(600);
    expect(await page.evaluate((y) => { const p = document.querySelector('.pin[data-pin="platinum"]'), r = document.querySelector('.place[data-place="platinum"]'); return Math.abs(scrollY - y) < 4 && p.getAttribute("aria-pressed") === "true" && getComputedStyle(p.querySelector(".pin__card")).visibility === "visible" && r.querySelector(".place__btn").getAttribute("aria-expanded") === "true"; }, yPin), "phone: tapping a marker opens its card and its row, without scrolling the page away from the map");
    const docked = (id = "platinum") => page.evaluate((id) => { const p = document.querySelector('.pin[data-pin="' + id + '"]'), c = p.querySelector(".pin__card"), cs = getComputedStyle(c), r = c.getBoundingClientRect(), v = document.querySelector("[data-view]").getBoundingClientRect(), m = p.getBoundingClientRect(), head = document.querySelector(".site-header").getBoundingClientRect().bottom, bar = document.querySelector(".mcta"), barTop = bar && bar.classList.contains("is-on") ? bar.getBoundingClientRect().top : innerHeight; return { shown: cs.visibility === "visible" && cs.opacity === "1", pressed: p.getAttribute("aria-pressed"), row: document.querySelector('.place[data-place="' + id + '"] .place__btn').getAttribute("aria-expanded"), docked: p.classList.contains("is-docked"), over: p.classList.contains("is-over"), inside: r.left >= v.left - 0.5 && r.right <= v.right + 0.5 && r.top >= v.top - 0.5 && r.bottom <= v.bottom + 0.5, offMarker: r.bottom <= m.top + 0.5 || r.top >= m.bottom - 0.5, wide: Math.round(r.width / v.width * 100) / 100, seen: r.top >= Math.max(v.top, head) - 0.5 && r.bottom <= Math.min(v.bottom, barTop) + 0.5, edge: Math.round(Math.min(Math.abs(r.top - Math.max(v.top, head)), Math.abs(Math.min(v.bottom, barTop) - r.bottom))), mark: getComputedStyle(c.querySelector(".pin__x")).display, kind: c.querySelector(".pin__kind").textContent.trim(), far: c.querySelector(".pin__far").textContent.trim() }; }, id);
    const d1 = await docked();
    expect(d1.shown && d1.docked && !d1.over && d1.inside && d1.seen && d1.offMarker && d1.wide > 0.9 && d1.edge <= 10 && d1.mark !== "none" && d1.kind === "Shopping" && /straight line/.test(d1.far), "phone: the tapped marker's card says what the icon means and what the place is; it lies whole along an edge of the map, clear of its marker, with a mark to show it can be put away", JSON.stringify(d1));
    await page.tap('.pin[data-pin="platinum"]'); await page.waitForTimeout(400);
    const d2 = await docked();
    expect(!d2.shown && d2.pressed === "false" && d2.row === "false", "phone: tapping the same marker again puts its card away, and nothing is left showing as if a finger were still pointing", JSON.stringify(d2));
    await page.tap('.pin[data-pin="platinum"]'); await page.waitForTimeout(400);
    const d3 = await docked();
    await page.tap('.pin[data-pin="platinum"] .pin__name'); await page.waitForTimeout(400);
    const d4 = await docked();
    expect(d3.shown && d3.pressed === "true" && !d4.shown && d4.pressed === "false", "phone: a tap on the card itself puts it away", JSON.stringify([d3.shown, d4.shown, d4.pressed]));
    await page.tap('.pin[data-pin="platinum"]'); await page.waitForTimeout(400);
    const mapSpot = await page.evaluate(() => { const v = document.querySelector("[data-view]"), r = v.getBoundingClientRect(); for (let y = 0.2; y < 0.8; y += 0.05) for (let x = 0.2; x < 0.8; x += 0.05) { const px = r.left + r.width * x, py = r.top + r.height * y, t = document.elementFromPoint(px, py); if (t && v.contains(t) && !t.closest("button, a, p")) return [px, py]; } return null; });
    const d5 = await docked();
    await page.touchscreen.tap(mapSpot[0], mapSpot[1]); await page.waitForTimeout(400);
    const d6 = await docked();
    expect(d5.shown && !d6.shown && d6.pressed === "false", "phone: a tap on the map itself puts the card away", JSON.stringify([d5.shown, d6.shown, d6.pressed]));
    /* with the lower part of the map out of sight (under the booking bar and off the screen) the card still opens where it can be seen */
    await page.evaluate(() => { const v = document.querySelector("[data-view]").getBoundingClientRect(); window.scrollBy(0, v.bottom - innerHeight - 70); });
    await page.waitForTimeout(800);
    const seenPin = await page.evaluate(() => { const v = document.querySelector("[data-view]").getBoundingClientRect(), head = document.querySelector(".site-header").getBoundingClientRect().bottom, bar = document.querySelector(".mcta"), barTop = bar && bar.classList.contains("is-on") ? bar.getBoundingClientRect().top : innerHeight; for (const p of document.querySelectorAll("[data-map] .pin[data-pin]")) { const r = p.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; if (r.top > Math.max(v.top, head) + 6 && r.bottom < Math.min(v.bottom, barTop) - 6 && r.left > v.left + 6 && r.right < v.right - 6 && document.elementFromPoint(x, y) === p) return { id: p.getAttribute("data-pin"), at: [x, y], cut: Math.round(v.bottom - barTop) }; } return null; });
    await page.touchscreen.tap(seenPin.at[0], seenPin.at[1]); await page.waitForTimeout(450);
    const b1 = await docked(seenPin.id);
    await page.evaluate(() => window.scrollBy(0, -90)); await page.waitForTimeout(700);
    const b2 = await docked(seenPin.id);
    expect(seenPin.cut > 40 && b1.shown && b1.seen && b1.offMarker && b2.shown && b2.seen && b2.offMarker, "phone: with part of the map out of sight (under the booking bar or off the screen) the card opens in the part that can be seen, and is set there again after the page is scrolled", JSON.stringify([seenPin, [b1.shown, b1.seen, b1.offMarker, b1.edge], [b2.shown, b2.seen, b2.offMarker, b2.edge]]));
    /* The booking bar switched on with no scroll at all (as when a field is left) while a card lies where the bar
       will rest: the card is set again at once, above where the bar will rest, not where the bar is caught half
       way in. The map's bottom edge is put behind the bar's place, and a marker high on the map is used, so that
       the card lies along the bottom (a card along the top would cover a marker that high). */
    await page.evaluate(() => { document.querySelector("[data-map]").__map.choose(""); const v = document.querySelector("[data-view]").getBoundingClientRect(); window.scrollBy(0, v.bottom - (innerHeight - 30)); });
    await page.waitForTimeout(900);
    const topPin = await page.evaluate(() => { const v = document.querySelector("[data-view]").getBoundingClientRect(), head = document.querySelector(".site-header").getBoundingClientRect().bottom; for (const p of document.querySelectorAll("[data-map] .pin[data-pin]")) { const r = p.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; if (r.top > Math.max(v.top, head) + 2 && y < v.top + 100 && r.left > v.left + 6 && r.right < v.right - 6 && document.elementFromPoint(x, y) === p) return { id: p.getAttribute("data-pin"), at: [x, y] }; } return null; });
    const cardAndBar = () => page.evaluate((id) => { const c = document.querySelector('.pin[data-pin="' + id + '"] .pin__card').getBoundingClientRect(), bar = document.querySelector(".mcta"); return { cardBottom: Math.round(c.bottom), barRests: innerHeight - bar.offsetHeight, barNow: Math.round(bar.getBoundingClientRect().top) }; }, topPin.id);
    await page.touchscreen.tap(topPin.at[0], topPin.at[1]); await page.waitForTimeout(450);
    await page.evaluate((id) => { document.querySelector(".mcta").classList.remove("is-on"); document.querySelector("[data-map]").__map.place(id); }, topPin.id); await page.waitForTimeout(450);
    const low = await cardAndBar();
    await page.evaluate(() => document.querySelector(".mcta").classList.add("is-on")); await page.waitForTimeout(60);
    const early = await cardAndBar();
    await page.waitForTimeout(500);
    const b4 = await docked(topPin.id);
    expect(low.cardBottom > low.barRests && early.cardBottom <= early.barRests && b4.shown && b4.seen && b4.offMarker, "phone: when the booking bar slides in over an open card, the card is set above where the bar will rest, at once and with no scroll", JSON.stringify([low, early, b4.seen]));

    /* touch targets: nothing under 24 by 24 anywhere, and the controls a thumb is aimed at reach 44 */
    for (const route of ["en/", "en/suites/compare/", "en/contact/", "th/suites/luxury-suite/", "th/location/"]) {
      await page.goto(BASE + route, { waitUntil: "load" });
      const sizes = await page.evaluate(() => {
        const tiny = [], low = [];
        for (const el of document.querySelectorAll("a, button, select, input, summary, textarea")) {
          if (el.closest("dialog:not([open])") || el.closest(".faq__a")) continue;
          const inText = el.tagName === "A" && !!el.closest("p, address, figcaption, li.reason, dd, small, td, .note") && !/\bbtn\b|arrow-link/.test(el.className);
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const s = getComputedStyle(el);
          if (s.visibility === "hidden" || s.display === "none" || el.classList.contains("skip") || (el.type === "radio" && s.opacity === "0")) continue;
          const tag = (String(el.className).split(" ")[0] || el.tagName) + " " + Math.round(r.width) + "x" + Math.round(r.height);
          if (!inText && (r.height < 24 || r.width < 24)) tiny.push(tag);
          if (/\bbtn\b|chip|close-btn|menu-btn|finder__tab|place__btn|textbtn/.test(el.className) || /^(SELECT|INPUT|TEXTAREA|SUMMARY)$/.test(el.tagName)) { if (r.height < 43.5) low.push(tag); }
        }
        return { tiny, low };
      });
      expect(sizes.tiny.length === 0, `phone: no control smaller than 24 by 24 on ${route}`, sizes.tiny.slice(0, 5).join(" | "));
      expect(sizes.low.length === 0, `phone: buttons, chips and fields are at least 44 high on ${route}`, [...new Set(sizes.low)].slice(0, 6).join(" | "));
    }
    expect(errs.length === 0, "phone: no script errors or failed requests during the tests", errs.slice(0, 3).join(" | "));
    await ctx.close();
  });

  /* ---------- without JavaScript ---------- */
  await block("no JavaScript", async () => {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + "en/", { waitUntil: "load" });
    expect(await page.evaluate(() => document.documentElement.className === "no-js"), "no JavaScript: page knows");
    expect(await page.isVisible(".planner__plain a") && !(await page.isVisible("form.planner")), "no JavaScript: the planner becomes one plain booking link");
    expect((await page.getAttribute(".planner__plain a", "href")) === BOOK, "no JavaScript: the link goes to the official booking page");
    expect(await page.evaluate(() => [...document.querySelectorAll(".finder__panel")].every((p) => getComputedStyle(p).display !== "none")), "no JavaScript: all six suites are open");
    expect(await page.evaluate(() => [...document.querySelectorAll(".reveal")].every((e) => getComputedStyle(e).opacity === "1")), "no JavaScript: nothing waits for an effect");
    expect(await page.isVisible('.header-tools a.menu-btn[href="#footer-nav"]') || await page.isVisible('.nav a.nav__link[href="#footer-nav"]'), "no JavaScript: More and Menu lead to the footer links");
    expect(await page.evaluate(() => { const a = document.querySelector("[data-hero-cta]"); return a.getAttribute("href") === "#plan" && !!document.getElementById("plan"); }), "no JavaScript: the hero button is a plain link to the planner on the page");
    await page.goto(BASE + "en/location/", { waitUntil: "load" });
    expect(await page.evaluate(() => [...document.querySelectorAll(".place__more")].every((p) => getComputedStyle(p).display !== "none") && document.querySelectorAll(".place").length === 12), "no JavaScript: every place and its details are listed");
    await page.goto(BASE + "en/suites/compare/", { waitUntil: "load" });
    expect(await page.evaluate(() => [...document.querySelectorAll(".compare thead th[data-col]")].every((t) => getComputedStyle(t).display !== "none")), "no JavaScript: the comparison shows all six suites");
    await page.goto(BASE + "en/contact/", { waitUntil: "load" });
    expect(await page.isVisible(".note.nojs-only") && !(await page.isVisible("[data-enquiry]")), "no JavaScript: the enquiry helper steps aside for plain contact details");
    expect(await page.isVisible('main a[href^="tel:"]') && await page.isVisible('main a[href^="mailto:"]'), "no JavaScript: telephone and email are plain links on the contact page");
    await page.goto(BASE, { waitUntil: "load" });
    expect(await page.isVisible('a[href="en/"]') && await page.isVisible('a[href="th/"]'), "no JavaScript: the bare address offers both languages");
    await ctx.close();
  });

  /* ---------- reduced motion ---------- */
  await block("reduced motion", async () => {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(BASE + "en/", { waitUntil: "load" });
    expect(await page.evaluate(() => !document.documentElement.classList.contains("anim")), "reduced motion: reveal effect is off");
    await page.waitForTimeout(8200);
    expect((await page.textContent("[data-hero-count]")).trim() === "01 / 03", "reduced motion: the hero does not advance by itself");
    expect((await page.getAttribute("[data-hero-pause]", "aria-label")) === "Play the photographs", "reduced motion: the sequence starts paused");
    await ctx.close();
  });

  /* ---------- the hero advances by itself otherwise, and pauses on request ---------- */
  await block("hero sequence", async () => {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "th/", { waitUntil: "load" });
    await page.waitForTimeout(8800);
    expect((await page.textContent("[data-hero-count]")).trim() === "02 / 03", "hero: advances after seven seconds");
    await page.click("[data-hero-pause]");
    await page.waitForTimeout(7600);
    expect((await page.textContent("[data-hero-count]")).trim() === "02 / 03", "hero: pause holds the photograph");
    expect((await page.getAttribute("html", "lang")) === "th" && /เลือกวันเข้าพัก/.test(await page.textContent(".hero__actions")), "Thai: page language and wording");
    await ctx.close();
  });

  /* ---------- the opening: once a visit, about two seconds, never in the way ---------- */
  await block("opening animation", async () => {
    const shown = (p) => p.evaluate(() => { const s = document.querySelector(".intro-screen"); const cs = s && getComputedStyle(s); return !!cs && cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.05; });
    const ctx = await newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "en/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
    const first = await page.evaluate(() => { const s = document.querySelector(".intro-screen"), cs = getComputedStyle(s), hit = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return { cls: document.documentElement.className, hidden: s.getAttribute("aria-hidden"), pointer: cs.pointerEvents, through: !!hit && !hit.closest(".intro-screen"), words: s.textContent.replace(/\s+/g, " ").trim() }; });
    expect((await shown(page)) && /\bintro\b/.test(first.cls) && first.hidden === "true" && first.pointer === "none" && first.through && first.words === "Grand Diamond Suites Hotel", "opening: plays on the first page of a visit, hidden from screen readers, and a click passes through it to the page", JSON.stringify(first));
    await page.waitForTimeout(2750);
    expect(!(await shown(page)), "opening: gone within three seconds");
    await page.goto(BASE + "en/suites/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
    expect(!(await shown(page)) && !(await page.evaluate(() => document.documentElement.classList.contains("intro"))), "opening: plays only once a visit (not again on the next page)");
    await ctx.close();
    for (const [label, opts, init] of [["with reduced motion", { reducedMotion: "reduce" }, null], ["without JavaScript", { javaScriptEnabled: false }, null], ["with storage refused", {}, () => { const deny = { get() { throw new Error("denied"); } }; try { Object.defineProperty(window, "sessionStorage", deny); } catch (e) {} }]]) {
      const c2 = await newContext({ viewport: { width: 1280, height: 800 }, ...opts });
      if (init) await c2.addInitScript(init);
      const p2 = await c2.newPage();
      await p2.goto(BASE + "th/", { waitUntil: "domcontentloaded" });
      await p2.waitForTimeout(250);
      expect(!(await shown(p2)), `opening: not shown ${label}`);
      await c2.close();
    }
  });

  /* ---------- the home page's photo reel: it drifts on its own, without end ---------- */
  await block("home gallery reel", async () => {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "en/", { waitUntil: "load" });
    await page.evaluate(() => document.querySelector("[data-reel]").scrollIntoView({ block: "center" }));
    await page.mouse.move(5, 5);
    await page.waitForTimeout(700);
    const x = () => page.evaluate(() => document.querySelector("[data-reel-track]").scrollLeft);
    const x0 = await x(); await page.waitForTimeout(1500); const x1 = await x();
    expect(x1 - x0 > 20, "reel: drifts on its own", JSON.stringify({ x0, x1 }));
    const copies = await page.evaluate(() => {
      const all = [...document.querySelector("[data-reel-track]").children], cs = all.filter((c) => c.classList.contains("is-copy"));
      return { all: all.length, copies: cs.length, hidden: cs.every((c) => c.getAttribute("aria-hidden") === "true"), ids: cs.some((c) => c.querySelector("[id]")), tabbable: cs.some((c) => [...c.querySelectorAll("a, button")].some((e) => e.tabIndex !== -1)) };
    });
    expect(copies.copies > 2 && copies.copies * 2 === copies.all && copies.hidden && !copies.ids && !copies.tabbable, "reel: the copy that closes the loop is hidden from screen readers and the Tab key, and repeats no id", JSON.stringify(copies));
    /* without end: brought to just before the copy, it carries on from the first photograph */
    const setW = await page.evaluate(() => { const t = document.querySelector("[data-reel-track]"), n = t.children.length / 2; return t.children[n].offsetLeft - t.children[0].offsetLeft; });
    await page.evaluate((w) => { document.querySelector("[data-reel-track]").scrollLeft = w - 15; }, setW);
    await page.waitForTimeout(1500);
    const x2 = await x();
    expect(x2 < 200, "reel: reaching the copy, it carries on from the first photograph, without end", JSON.stringify({ setW, x2 }));
    /* it holds under the mouse, and a click opens the photograph under the pointer; the count is the page's own photographs, copies left out */
    const box = await page.locator("[data-reel-track]").boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height * 0.35;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(400); const h0 = await x(); await page.waitForTimeout(1200); const h1 = await x();
    expect(Math.abs(h1 - h0) <= 1, "reel: holds still while the mouse is over it", JSON.stringify({ h0, h1 }));
    const target = await page.evaluate(([px, py]) => { const b = document.elementFromPoint(px, py)?.closest("[data-viewer]"); return b ? { id: b.getAttribute("data-id"), copy: !!b.closest(".is-copy") } : null; }, [cx, cy]);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(900);
    const v = await page.evaluate(() => { const dlg = document.getElementById("viewer"), img = dlg.querySelector("[data-img]"), ids = new Set([...document.querySelectorAll('[data-viewer="home"]')].filter((b) => !b.closest(".is-copy")).map((b) => b.getAttribute("data-id"))); return { open: dlg.open, src: (img.currentSrc || img.src || "").split("/media/")[1], count: dlg.querySelector("[data-count]").textContent, n: ids.size }; });
    expect(!!target && v.open && v.src.startsWith(target.id + "-") && new RegExp(" of " + v.n + "$").test(v.count), "reel: a click on a photograph opens it in the viewer, and the copies add nothing to the count", JSON.stringify({ target, v }));
    await page.mouse.move(5, 5);
    const o0 = await x(); await page.waitForTimeout(900); const o1 = await x();
    expect(Math.abs(o1 - o0) <= 1, "reel: holds while a photograph is open", JSON.stringify({ o0, o1 }));
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    /* closed with Escape, focus is back on the photograph; once the mouse moves elsewhere the drift resumes */
    await page.mouse.move(5, 5); await page.mouse.move(9, 9);
    const e0 = await x(); await page.waitForTimeout(1200); const e1 = await x();
    expect(e1 - e0 > 15, "reel: after the viewer is closed with Escape, it drifts again once the mouse moves away", JSON.stringify({ e0, e1 }));
    /* the pause button stops it for good, and play starts it again */
    await page.click("[data-reel-pause]"); await page.mouse.move(5, 5);
    const p0 = await x(); await page.waitForTimeout(1300); const p1 = await x();
    const said = await page.getAttribute("[data-reel-pause]", "aria-label");
    expect(Math.abs(p1 - p0) <= 1 && said === "Play the gallery", "reel: the pause button stops it, and then offers to play it", JSON.stringify({ p0, p1, said }));
    await page.click("[data-reel-pause]"); await page.mouse.move(5, 5);
    await page.waitForTimeout(1400);
    const q0 = await x(); await page.waitForTimeout(1200); const q1 = await x();
    expect(q1 - q0 > 15 && (await page.getAttribute("[data-reel-pause]", "aria-label")) === "Pause the gallery", "reel: play starts it again", JSON.stringify({ q0, q1 }));
    await ctx.close();
    /* with reduced motion it starts stopped, and says it can be played */
    const still = await newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const sp = await still.newPage();
    await sp.goto(BASE + "th/", { waitUntil: "load" });
    await sp.evaluate(() => document.querySelector("[data-reel]").scrollIntoView({ block: "center" }));
    await sp.mouse.move(5, 5);
    await sp.waitForTimeout(500);
    const r0 = await sp.evaluate(() => document.querySelector("[data-reel-track]").scrollLeft); await sp.waitForTimeout(1300);
    const r1 = await sp.evaluate(() => document.querySelector("[data-reel-track]").scrollLeft);
    expect(r0 === r1 && (await sp.getAttribute("[data-reel-pause]", "aria-label")) === "เลื่อนแกลเลอรีอัตโนมัติ", "reel: with reduced motion it starts stopped (Thai page)", JSON.stringify({ r0, r1 }));
    await still.close();
  });

  /* ---------- the neighbourhood map ---------- */
  await block("map", async () => {
    const ctx = await newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = []; watch(page, errs);
    await page.goto(BASE + "en/", { waitUntil: "load" });
    await page.locator("[data-map]").scrollIntoViewIfNeeded();
    await page.evaluate(() => { const r = document.querySelector("[data-map]").getBoundingClientRect(); window.scrollBy(0, r.top - 140); });
    await page.waitForTimeout(400);
    /* where the map is: its scale, where its frame sits in the window, and where the hotel is */
    const state = () => page.evaluate(() => {
      const el = document.querySelector("[data-map]"), v = el.querySelector("[data-view]").getBoundingClientRect(), all = el.querySelector("[data-pins]").getBoundingClientRect(), h = el.querySelector(".pin--hotel").getBoundingClientRect();
      return { scale: all.width / v.width, left: all.left - v.left, top: all.top - v.top, right: all.right - v.right, bottom: all.bottom - v.bottom, hx: h.left + h.width / 2 - v.left, hy: h.top + h.height / 2 - v.top, vw: v.width, vh: v.height, zoomed: el.classList.contains("is-zoomed"), sat: el.classList.contains("is-sat") };
    });
    /* every marker sits on the point of the picture it belongs to, at its own size */
    const aligned = () => page.evaluate(() => {
      const el = document.querySelector("[data-map]"), r = el.querySelector("[data-raster]").getBoundingClientRect();
      return [...el.querySelectorAll(".pin[data-pin]")].every((p) => { const x = parseFloat(p.style.getPropertyValue("--x")) / 100, y = parseFloat(p.style.getPropertyValue("--y")) / 100, w = p.offsetWidth, left = p.offsetLeft, top = p.offsetTop, lay = el.querySelector("[data-pins]").getBoundingClientRect(); return w === 34 && Math.abs(lay.left + left - (r.left + x * r.width)) < 1.5 && Math.abs(lay.top + top - (r.top + y * r.height)) < 1.5; });
    });
    /* a spot of the map with no marker or control over it, to drag from */
    const blank = () => page.evaluate(() => { const v = document.querySelector("[data-view]"), r = v.getBoundingClientRect(); for (let y = 0.7; y > 0.2; y -= 0.07) for (let x = 0.3; x < 0.8; x += 0.07) { const px = r.left + r.width * x, py = r.top + r.height * y, t = document.elementFromPoint(px, py); if (t && v.contains(t) && !t.closest("button, a, p")) return [px, py]; } return null; });

    /* as it opened, before anything below moves it */
    const atOpen = { ...(await state()), out: await page.isEnabled('[data-zoom="out"]'), back: await page.isDisabled('[data-zoom="reset"]'), in: await page.isEnabled('[data-zoom="in"]'), aligned: await aligned() };

    /* markers */
    const pins = await page.evaluate(() => [...document.querySelectorAll("[data-map] .pin[data-pin]")].map((p) => ({ label: p.getAttribute("aria-label"), text: p.textContent.trim(), svg: !!p.querySelector("svg"), tag: p.tagName, name: p.querySelector(".pin__name").textContent, shown: getComputedStyle(p.querySelector(".pin__card")).visibility })));
    expect(pins.length === 5 && pins.every((p) => p.tag === "BUTTON" && p.svg && !/^\s*\d/.test(p.label) && !/^\s*\d/.test(p.text) && p.label.startsWith(p.name + ", ") && p.shown === "hidden"), "map: every marker is an icon named after its place and its kind, and none carries a number", JSON.stringify(pins.slice(0, 2)));
    expect(await page.evaluate(() => document.querySelector(".near").tagName === "UL" && [...document.querySelectorAll(".near li")].every((li) => !!li.querySelector(".near__n svg") && !/^\s*\d/.test(li.textContent))), "map: the list beside it carries the same icons and is not numbered");
    expect(await page.evaluate(() => { const n = document.querySelector(".mapplate__note"); return n.getClientRects().length > 0 && n.textContent.trim().startsWith("Choose a marker to see what it is."); }), "map card: a line under the map says that a marker can be chosen");
    /* A marker's card: what the icon means, the place's name, what the place is and how far it is. With a
       mouse it opens when the marker is pointed at and stays when the marker is chosen. */
    const cardOf = (id) => page.evaluate((id) => {
      const p = document.querySelector('.pin[data-pin="' + id + '"]'), c = p.querySelector(".pin__card"), cs = getComputedStyle(c), r = c.getBoundingClientRect(), v = document.querySelector("[data-view]").getBoundingClientRect(), m = p.getBoundingClientRect();
      const about = document.getElementById(p.getAttribute("aria-describedby"));
      return {
        shown: cs.visibility === "visible" && cs.opacity === "1",
        inside: r.left >= v.left - 0.5 && r.right <= v.right + 0.5 && r.top >= v.top - 0.5 && r.bottom <= v.bottom + 0.5,
        offMarker: r.bottom <= m.top + 0.5 || r.top >= m.bottom - 0.5,
        kind: c.querySelector(".pin__kind").textContent.trim(), kindIcon: c.querySelector(".pin__kind svg").getAttribute("class"), icon: p.querySelector(":scope > svg").getAttribute("class"),
        name: c.querySelector(".pin__name").textContent.trim(), what: c.querySelector(".pin__what").textContent.trim(), far: c.querySelector(".pin__far").textContent.trim(),
        said: about ? about.textContent.replace(/\s+/g, " ").trim() : "", pressed: p.getAttribute("aria-pressed"),
        rect: [r.left, r.top, r.right, r.bottom], at: [m.left + m.width / 2, m.top + m.height / 2],
      };
    }, id);
    const shownCards = () => page.evaluate(() => [...document.querySelectorAll("[data-map] .pin[data-pin]")].filter((p) => { const cs = getComputedStyle(p.querySelector(".pin__card")); return cs.visibility === "visible" && cs.opacity === "1"; }).map((p) => p.getAttribute("data-pin")).join());
    const away = async () => { await page.mouse.move(8, 300); await page.waitForTimeout(220); };
    const KIND = { shopping: ["Shopping", "i-cart"], transport: ["Transport", "i-train"], culture: ["Culture", "i-landmark"] };
    const homePins = await page.evaluate(() => [...document.querySelectorAll("[data-map] .pin[data-pin]")].map((p) => [p.getAttribute("data-pin"), p.getAttribute("data-kind")]));
    const cards = [];
    for (const [id, kind] of homePins) {
      await page.hover(`.pin[data-pin="${id}"]`); await page.waitForTimeout(280);
      cards.push({ id, ...(await cardOf(id)), group: kind, only: await shownCards(), lit: await page.evaluate((id) => document.querySelector('[data-near="' + id + '"]').classList.contains("is-lit"), id) });
      await away();
    }
    expect(cards.length === 5 && cards.every((c) => c.shown && c.only === c.id && c.lit), "map card: pointing at a marker with the mouse opens its card, only that one, and lights its row in the list", JSON.stringify(cards.map((c) => [c.id, c.shown, c.only, c.lit])));
    expect(cards.every((c) => c.kind === KIND[c.group][0] && c.kindIcon === KIND[c.group][1] && c.icon === KIND[c.group][1]), "map card: it says in a word what the icon means (Shopping, Transport or Culture), beside the marker's own icon", JSON.stringify(cards.map((c) => [c.id, c.kind, c.icon, c.kindIcon])));
    expect(cards.every((c) => c.name.length > 3 && c.what.length > 15 && /^About [\d.,]+ (m|km) from the hotel, in a straight line$/.test(c.far) && c.said === c.what + " " + c.far), "map card: it names the place, says what it is and how far it is in a straight line, and a screen reader is given the same as the marker's description", JSON.stringify(cards.map((c) => [c.name, c.far, c.said === c.what + " " + c.far])));
    expect(cards.every((c) => c.inside && c.offMarker), "map card: it lies whole inside the map's window, and never over its own marker", JSON.stringify(cards.map((c) => [c.id, c.inside, c.offMarker])));

    /* the mouse may move from the marker onto the card and read it there */
    await page.hover('.pin[data-pin="centralworld"]'); await page.waitForTimeout(280);
    const cw1 = await cardOf("centralworld");
    await page.mouse.move(cw1.at[0], cw1.rect[3] <= cw1.at[1] ? cw1.rect[3] - 14 : cw1.rect[1] + 14, { steps: 8 }); await page.waitForTimeout(280);
    expect((await shownCards()) === "centralworld", "map card: the mouse can move from the marker onto its card and the card stays, so it can be read under magnification", await shownCards());
    await page.keyboard.press("Escape"); await page.waitForTimeout(280);
    const escaped = await shownCards();
    await away();
    await page.hover('.pin[data-pin="centralworld"]'); await page.waitForTimeout(280);
    expect(escaped === "" && (await shownCards()) === "centralworld", "map card: Escape puts a card away without the mouse having to move, and pointing at the marker again brings it back", escaped);
    await away();

    /* A card must not shut off the markers it lies over. The pair is looked for afresh, with the card open:
       which side a card takes depends on where the map is at that moment. */
    const UNDER = "map card: a marker lying under another marker's card can still be pointed at and chosen (the marker takes over from the card)";
    let took = "no marker lies under another marker's card on this map";
    for (const [aId] of homePins) {
      await away();
      await page.hover(`.pin[data-pin="${aId}"]`); await page.waitForTimeout(300);
      const pair = await page.evaluate((aId) => { const A = document.querySelector('.pin[data-pin="' + aId + '"]'), r = A.querySelector(".pin__card").getBoundingClientRect(); for (const B of document.querySelectorAll("[data-map] .pin[data-pin]")) { if (B === A) continue; const m = B.getBoundingClientRect(), x = m.left + m.width / 2, y = m.top + m.height / 2; if (x > r.left + 4 && x < r.right - 4 && y > r.top + 4 && y < r.bottom - 4) return { b: B.getAttribute("data-pin"), at: [x, y] }; } return null; }, aId);
      if (!pair) continue;
      await page.mouse.move(pair.at[0], pair.at[1], { steps: 14 }); await page.waitForTimeout(340);
      const now = await shownCards();
      await page.mouse.click(pair.at[0], pair.at[1]); await page.waitForTimeout(300);
      const chose = [(await cardOf(aId)).pressed, (await cardOf(pair.b)).pressed].join();
      took = aId + " over " + pair.b + ": showing " + now + ", chosen " + chose;
      expect(now === pair.b && chose === "false,true", UNDER, took);
      await page.mouse.click(pair.at[0], pair.at[1]);
      took = "";
      break;
    }
    if (took) expect(false, UNDER, took);
    await away();

    /* choosing keeps the card; one card at a time; a drag leaves it, a plain click on the map puts it away */
    await page.click('.pin[data-pin="centralworld"]'); await away();
    expect((await shownCards()) === "centralworld" && (await cardOf("centralworld")).pressed === "true", "map card: choosing a marker keeps its card open after the mouse has gone", await shownCards());
    await page.hover('.pin[data-pin="ratchaprarop"]'); await page.waitForTimeout(280);
    const oneCard = await shownCards();
    await away();
    expect(oneCard === "ratchaprarop" && (await shownCards()) === "centralworld", "map card: one card shows at a time: the chosen one steps aside while another marker is pointed at, and returns after", oneCard + " then " + await shownCards());
    const bg1 = await blank();
    await page.mouse.move(bg1[0], bg1[1]); await page.mouse.down(); await page.mouse.move(bg1[0] + 60, bg1[1] + 12, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(280);
    const afterDrag = await shownCards();
    const bg2 = await blank();
    await page.mouse.click(bg2[0], bg2[1]); await page.waitForTimeout(280);
    expect(afterDrag === "centralworld" && (await shownCards()) === "" && (await cardOf("centralworld")).pressed === "false", "map card: dragging the map leaves the card open, and a plain click on the map itself puts it away", afterDrag + " then " + await shownCards());
    await page.click('.pin[data-pin="centralworld"]'); await page.waitForTimeout(220);
    await page.click('.pin[data-pin="centralworld"]'); await away();
    expect((await shownCards()) === "" && (await cardOf("centralworld")).pressed === "false", "map card: choosing the same marker again puts its card away", await shownCards());

    /* the keyboard */
    await page.focus("[data-view]"); await page.keyboard.press("Tab"); await page.waitForTimeout(500);
    const kb = await page.evaluate(() => document.activeElement.getAttribute("data-pin"));
    const kbShown = await shownCards(), kbCard = kb ? await cardOf(kb) : {};
    await page.keyboard.press("Escape"); await page.waitForTimeout(280);
    const kbShut = await shownCards();
    await page.keyboard.press("Enter"); await page.waitForTimeout(320);
    const kbOpen = await shownCards(), kbPressed = kb ? (await cardOf(kb)).pressed : "";
    await page.keyboard.press("Escape"); await page.waitForTimeout(280);
    expect(!!kb && kbShown === kb && kbCard.inside && kbShut === "" && kbOpen === kb && kbPressed === "true" && (await shownCards()) === "" && (await cardOf(kb)).pressed === "false", "map card: with the keyboard, Tab to a marker shows its card, Escape puts it away, Enter opens it and keeps it, and Escape closes it again", JSON.stringify([kb, kbShown, kbShut, kbOpen, kbPressed, await shownCards()]));
    await page.evaluate(() => document.activeElement.blur());

    /* the list beside the map */
    await page.click('[data-near="platinum"]'); await away();
    expect(await page.evaluate(() => document.querySelector('.pin[data-pin="platinum"]').getAttribute("aria-pressed") === "true" && document.querySelector('.pin[data-pin="centralworld"]').getAttribute("aria-pressed") === "false") && (await shownCards()) === "platinum", "map: choosing a row in the list chooses its marker and opens its card", await shownCards());
    expect(await page.evaluate(() => { const n = document.querySelector('.pin[data-pin="platinum"] .pin__card'), a = n.getBoundingClientRect(), b = document.querySelector("[data-map] .pin--hotel").getBoundingClientRect(); return !document.querySelector("[data-map] .pin-label") && !/Grand Diamond Suites/.test(document.querySelector("[data-pins]").textContent) && !(a.left < b.right - 4 && a.right > b.left + 4 && a.top < b.bottom - 4 && a.bottom > b.top + 4); }), "map: the hotel is marked by its diamond alone, with no name written on the map, and the card of the place right beside it does not cover the diamond");
    await page.click('[data-near="platinum"]'); await away();

    /* Zoom and movement. The map is a drawing of central Bangkok that opens with the hotel's neighbourhood
       filling its window: OPEN is how many times the whole drawing is enlarged at that moment. */
    const OPEN = await page.evaluate(() => +document.querySelector("[data-map]").getAttribute("data-open"));
    const tilesNow = () => page.evaluate(() => { const got = (sel) => [...document.querySelectorAll(sel + " img.is-in")].map((i) => new URL(i.src)); const b = got(".mapplate__grid--base"), n = got(".mapplate__grid--names"); const lv = (list) => [...new Set(list.map((u) => u.pathname.split("/").slice(-2)[0]))].sort().join(); return { base: b.length, names: n.length, baseLevels: lv(b), nameLevels: lv(n.filter((u) => u.pathname.includes("/map/en/"))), own: [...b, ...n].every((u) => u.origin === location.origin), under: !!document.querySelector(".mapplate__under") }; });
    expect(OPEN >= 3 && Math.abs(atOpen.scale - OPEN) < 0.02 && !atOpen.zoomed && atOpen.hx > 60 && atOpen.hx < atOpen.vw - 60 && atOpen.left < -200 && atOpen.top < -200 && atOpen.right > 200 && atOpen.bottom > 200 && atOpen.out && atOpen.back && atOpen.in && atOpen.aligned, "map: it opens on the hotel's neighbourhood with the markers in place, and with map to spare on every side and room to zoom out and in", JSON.stringify(atOpen));
    /* the card checks above may have moved the map to bring a marker into the window: back to where it opened */
    if (await page.isEnabled('[data-zoom="reset"]')) { await page.click('[data-zoom="reset"]'); await page.waitForTimeout(500); }
    const s0 = await state();
    expect(Math.abs(s0.hx - atOpen.hx) < 2 && Math.abs(s0.hy - atOpen.hy) < 2 && Math.abs(s0.scale - OPEN) < 0.02, "map: Back to the hotel returns to exactly where it opened", JSON.stringify([atOpen.hx, atOpen.hy, s0.hx, s0.hy]));
    await page.waitForTimeout(700);
    const t0 = await tilesNow();
    expect(t0.base >= 4 && t0.names >= 1 && t0.baseLevels === "3" && t0.nameLevels === "3" && t0.own && t0.under, "map: the drawing and its names arrive as squares from this site, at the level that suits the zoom, over a small picture of the whole area", JSON.stringify(t0));
    /* it can be moved at once, in any direction, without zooming first */
    const first = await blank();
    await page.mouse.move(first[0], first[1]); await page.mouse.down(); await page.mouse.move(first[0] - 150, first[1] + 90, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(250);
    const sA = await state();
    expect(Math.abs(sA.left - s0.left + 150) < 3 && Math.abs(sA.top - s0.top - 90) < 3 && Math.abs(sA.scale - OPEN) < 0.02 && await aligned() && await page.isEnabled('[data-zoom="reset"]'), "map: as it opens it can be dragged at once, in any direction, by as much as the pointer moves", JSON.stringify([s0.left, s0.top, sA.left, sA.top]));
    await page.click('[data-zoom="reset"]'); await page.waitForTimeout(450);
    await page.click('[data-zoom="in"]'); await page.waitForTimeout(450);
    const s1 = await state();
    expect(Math.abs(s1.scale - 1.8 * OPEN) < 0.1 && s1.zoomed && Math.abs((s1.hx - s1.vw / 2) - 1.8 * (s0.hx - s0.vw / 2)) < 4 && await aligned() && await page.isEnabled('[data-zoom="out"]'), "map: the zoom button enlarges the map about its centre, and the markers follow at their own size", JSON.stringify(s1));
    const from = await blank();
    await page.mouse.move(from[0], from[1]); await page.mouse.down(); await page.mouse.move(from[0] + 120, from[1] + 50, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(250);
    const s2 = await state();
    expect(Math.abs(s2.left - s1.left - 120) < 3 && Math.abs(s2.top - s1.top - 50) < 3 && Math.abs(s2.scale - s1.scale) < 0.01 && await aligned(), "map: dragging moves the map by as much as the pointer moved", JSON.stringify([s1.left, s1.top, s2.left, s2.top]));
    /* many short drags inside the window, down and to the right: a drag that leaves the window makes some browsers scroll the page */
    const haul = async (n) => { for (let i = 0; i < n; i++) { const g = await blank(), v = await page.locator("[data-view]").boundingBox(); await page.mouse.move(g[0], g[1]); await page.mouse.down(); await page.mouse.move(v.x + v.width - 8, v.y + v.height - 8, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(110); } };
    await haul(18);
    const s3 = await state();
    expect(Math.abs(s3.left) < 0.5 && Math.abs(s3.top) < 0.5 && s3.right >= 0 && s3.bottom >= 0, "map: it stops at its own edge, so the window never shows an empty strip", JSON.stringify(s3));
    await page.click('[data-zoom="reset"]'); await page.waitForTimeout(450);
    const s4 = await state();
    expect(Math.abs(s4.scale - OPEN) < 0.02 && Math.abs(s4.hx - s0.hx) < 2 && Math.abs(s4.hy - s0.hy) < 2 && await page.isDisabled('[data-zoom="reset"]') && (await page.getAttribute('[data-zoom="reset"]', "aria-label")) === "Back to the hotel", "map: Back to the hotel puts it back as it opened", JSON.stringify(s4));
    /* zooming out: the whole of central Bangkok, every marker in the window */
    for (let i = 0; i < 6; i++) { if (await page.isDisabled('[data-zoom="out"]')) break; await page.click('[data-zoom="out"]'); await page.waitForTimeout(380); }
    await page.waitForTimeout(800);
    const out = { ...(await state()), pins: await page.evaluate(() => { const v = document.querySelector("[data-view]").getBoundingClientRect(); return [...document.querySelectorAll("[data-map] .pin[data-pin], [data-map] .pin--hotel")].every((p) => { const r = p.getBoundingClientRect(); return r.left >= v.left && r.right <= v.right && r.top >= v.top && r.bottom <= v.bottom; }); }), km: await page.evaluate(() => +document.querySelector("[data-map]").getAttribute("data-ground") / 1000), tiles: await tilesNow() };
    expect(Math.abs(out.scale - 1) < 0.01 && !out.zoomed && Math.abs(out.left) < 1 && Math.abs(out.top) < 1 && Math.abs(out.right) < 1 && Math.abs(out.bottom) < 1 && out.pins && out.km > 8 && await page.isDisabled('[data-zoom="out"]') && await aligned(), "map: it zooms out to the whole of central Bangkok, about ten kilometres across, with every marker in the window", JSON.stringify(out));
    expect(/^[01](,[01])?$/.test(out.tiles.baseLevels.replace(/,3$/, "")) && /^[01]$/.test(out.tiles.nameLevels) && out.tiles.own, "map: zoomed out, it is drawn from the coarser levels made for that scale, with their own names", JSON.stringify(out.tiles));
    const seenPlaces = () => page.evaluate(() => [...document.querySelectorAll("[data-map] .pin[data-pin]")].filter((p) => getComputedStyle(p).visibility !== "hidden").length);
    const farOut = { places: await seenPlaces(), ...(await page.evaluate(() => ({ hotel: getComputedStyle(document.querySelector("[data-map] .pin--hotel")).visibility }))) };
    await page.click('[data-near="centralworld"]'); await page.waitForTimeout(800);
    const backIn = { scale: (await state()).scale, places: await seenPlaces(), shown: await shownCards() };
    expect(farOut.places === 0 && farOut.hotel === "visible" && Math.abs(backIn.scale - OPEN) < 0.05 && backIn.places === 5 && backIn.shown === "centralworld", "map: zoomed out, where the places would lie on top of one another, only the hotel is marked; choosing a place in the list brings the map back in on it", JSON.stringify([farOut, backIn]));
    await page.click('[data-near="centralworld"]'); await away();
    await page.click('[data-zoom="reset"]'); await page.waitForTimeout(500);

    /* the wheel belongs to the page until the map has been clicked, or Ctrl is held */
    await page.mouse.move(8, 300); await page.waitForTimeout(150);
    const spot = await blank();
    await page.mouse.move(spot[0], spot[1]);
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 120); await page.waitForTimeout(300);
    const plain = { ...(await state()), y: await page.evaluate(() => scrollY), hint: await page.isVisible("[data-map-hint]"), text: (await page.textContent("[data-map-hint]")).trim() };
    expect(Math.abs(plain.scale - OPEN) < 0.02 && plain.y > y0 && plain.hint && /Click the map/.test(plain.text) && /Ctrl/.test(plain.text), "map: before it has been clicked, the wheel scrolls the page and the map says how to zoom", JSON.stringify(plain));
    await page.evaluate((y) => window.scrollTo(0, y), y0); await page.waitForTimeout(200);
    await page.mouse.move(spot[0], spot[1]);
    await page.keyboard.down("Control"); await page.mouse.wheel(0, -240); await page.keyboard.up("Control"); await page.waitForTimeout(300);
    const wheeled = { ...(await state()), y: await page.evaluate(() => scrollY) };
    expect(wheeled.scale > OPEN * 1.4 && wheeled.y === y0 && await aligned(), "map: Ctrl and the wheel zoom the map and leave the page where it is", JSON.stringify(wheeled));
    await page.click('[data-zoom="reset"]'); await page.waitForTimeout(450);
    const spotB = await blank();
    await page.mouse.click(spotB[0], spotB[1]); await page.waitForTimeout(150);
    await page.mouse.wheel(0, -240); await page.waitForTimeout(300);
    const engaged = { ...(await state()), y: await page.evaluate(() => scrollY) };
    await page.mouse.move(8, 300); await page.waitForTimeout(150);
    await page.mouse.move(spotB[0], spotB[1]);
    await page.mouse.wheel(0, 120); await page.waitForTimeout(300);
    const released = { ...(await state()), y: await page.evaluate(() => scrollY) };
    expect(engaged.scale > OPEN * 1.4 && engaged.y === y0 && Math.abs(released.scale - engaged.scale) < 0.01 && released.y > y0, "map: once the map has been clicked the wheel zooms it, until the mouse leaves it, when the wheel is the page's again", JSON.stringify([engaged.scale, engaged.y, released.scale, released.y, y0]));
    await page.evaluate((y) => window.scrollTo(0, y), y0); await page.waitForTimeout(200);

    /* keyboard */
    await page.focus("[data-view]");
    await page.keyboard.press("0"); await page.waitForTimeout(800);
    const yk = await page.evaluate(() => scrollY);
    const home = await state();
    for (let i = 0; i < 6; i++) { await page.keyboard.press("-"); await page.waitForTimeout(480); }
    await page.keyboard.press("ArrowDown"); await page.waitForTimeout(350);
    const atRest = { ...(await state()), y: await page.evaluate(() => scrollY) };
    expect(Math.abs(home.scale - OPEN) < 0.02 && Math.abs(atRest.scale - 1) < 0.01 && atRest.y > yk, "map: 0 goes back to the hotel; and with nothing more to show in that direction, an arrow key scrolls the page as usual", JSON.stringify([home.scale, atRest]));
    await page.evaluate((y) => window.scrollTo(0, y), yk);
    await page.focus("[data-view]");
    await page.keyboard.press("0"); await page.waitForTimeout(800);
    await page.keyboard.press("+"); await page.waitForTimeout(700);
    const k1 = await state();
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(700);
    const k2 = { ...(await state()), y: await page.evaluate(() => scrollY) };
    await page.keyboard.press("ArrowDown"); await page.waitForTimeout(700);
    const k2b = { ...(await state()), y: await page.evaluate(() => scrollY) };
    await page.keyboard.press("-"); await page.waitForTimeout(700);
    const k3 = await state();
    expect(Math.abs(k1.scale - 1.6 * OPEN) < 0.1 && k2.left < k1.left - 40 && k2b.top < k2.top - 40 && Math.abs(k2b.y - yk) < 2 && Math.abs(k3.scale - OPEN) < 0.05, "map: plus and minus zoom it and the arrow keys move it, from the keyboard", JSON.stringify([k1.scale, k1.left, k2.left, k2b.top, k3.scale]));
    const role = await page.evaluate(() => { const v = document.querySelector("[data-view]"); return [v.tabIndex, v.getAttribute("role"), v.getAttribute("aria-label")]; });
    expect(role[0] === 0 && role[1] === "group" && /arrow keys/.test(role[2]) && /plus and minus/.test(role[2]) && /0 goes back to the hotel/.test(role[2]), "map: its window is a named stop for the keyboard that says which keys work", role.join(" | "));
    await page.keyboard.press("0"); await page.waitForTimeout(450);

    /* double click, and the closest zoom */
    const dc = await blank();
    await page.mouse.dblclick(dc[0], dc[1]); await page.waitForTimeout(500);
    expect(Math.abs((await state()).scale - 2 * OPEN) < 0.1, "map: a double click zooms in on that spot");
    await page.click('[data-zoom="reset"]'); await page.waitForTimeout(450);
    for (let i = 0; i < 8; i++) { if (await page.isDisabled('[data-zoom="in"]')) break; await page.click('[data-zoom="in"]'); await page.waitForTimeout(380); }
    await page.waitForTimeout(1100);
    const far = await page.evaluate(() => { const el = document.querySelector("[data-map]"), all = el.querySelector("[data-pins]").getBoundingClientRect(); return { metres: +el.getAttribute("data-ground") / all.width, inOff: el.querySelector('[data-zoom="in"]').disabled }; });
    const tFar = await tilesNow();
    expect(far.inOff && far.metres > 0.5 && far.metres < 0.6 && await aligned(), "map: around the hotel, zooming in stops at about half a metre of ground to a pixel", JSON.stringify(far));
    expect(/5$/.test(tFar.baseLevels) && tFar.nameLevels === "5" && tFar.own, "map: zoomed right in, it is drawn from the finest level, with that level's names", JSON.stringify(tFar));
    /* at that depth it can be moved only as far as the finely drawn middle goes */
    await haul(18);
    const wall = await page.evaluate(() => { const el = document.querySelector("[data-map]"), v = el.querySelector("[data-view]").getBoundingClientRect(), all = el.querySelector("[data-pins]").getBoundingClientRect(); const L = el.getAttribute("data-levels").split(";").map((t) => t.split(/[:,]/).map(Number)).pop(); return { x: (v.left - all.left) / all.width, y: (v.top - all.top) / all.height, zx: L[1] * 0.4 / 2 ** L[0], zy: L[2] * (8 / 15) / 2 ** L[0] }; });
    expect(Math.abs(wall.x - wall.zx) < 0.0005 && Math.abs(wall.y - wall.zy) < 0.0005 && wall.zx > 0.2, "map: zoomed right in, it can be moved as far as the finely drawn middle goes and no further, so it is never shown blurred", JSON.stringify(wall));
    /* and far from the hotel, zooming in stops sooner */
    for (let i = 0; i < 8; i++) { if (await page.isDisabled('[data-zoom="out"]')) break; await page.click('[data-zoom="out"]'); await page.waitForTimeout(330); }
    const corner = await page.evaluate(() => { const r = document.querySelector("[data-view]").getBoundingClientRect(); return [r.left + r.width * 0.9, r.top + r.height * 0.88]; });
    for (let i = 0; i < 6; i++) { await page.mouse.dblclick(corner[0], corner[1]); await page.waitForTimeout(520); }
    const farAway = await page.evaluate(() => { const el = document.querySelector("[data-map]"), all = el.querySelector("[data-pins]").getBoundingClientRect(); return { metres: +el.getAttribute("data-ground") / all.width, inOff: el.querySelector('[data-zoom="in"]').disabled }; });
    expect(farAway.inOff && farAway.metres > 1.1 && farAway.metres < 1.6, "map: far from the hotel, where only the coarser levels are drawn, zooming in stops at about a metre and a third to a pixel", JSON.stringify(farAway));

    /* satellite: nothing is asked of anyone until it is chosen */
    await page.click('[data-zoom="reset"]'); await page.waitForTimeout(500);
    const before = ctx.outside.length;
    expect(before === 0, "map: moving, zooming and choosing markers ask nothing of any other site", ctx.outside.slice(0, 2).map((o) => o.url).join(" "));
    /* a build may be made without the satellite view (SITE_MAP_SATELLITE=off): then there is no switch to test,
       and what is checked instead is that nothing of it is left on the page */
    const hasSat = await page.evaluate(() => document.querySelector("[data-map]").hasAttribute("data-sat"));
    let frame = null;
    if (hasSat) {
      frame = await page.evaluate(() => { const el = document.querySelector("[data-map]"), b = el.getAttribute("data-bounds").split(",").map(Number); const col = (lon, z) => (lon + 180) / 360 * 2 ** z, row = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z; }; const out = {}; for (let z = 15; z <= 19; z++) out[z] = [Math.floor(col(b[0], z)), Math.floor(col(b[2], z)), Math.floor(row(b[3], z)), Math.floor(row(b[1], z))]; return { tiles: out, url: el.getAttribute("data-sat"), min: +el.getAttribute("data-sat-min"), max: +el.getAttribute("data-sat-max") }; });
      await page.click('[data-layer="sat"]'); await page.waitForTimeout(1200);
      const asked = ctx.outside.slice(before);
      const pattern = new RegExp("^" + frame.url.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace("\\{z\\}", "{z}").replace("\\{x\\}", "{x}").replace("\\{y\\}", "{y}").replace("{z}", "(?<z>\\d+)").replace("{y}", "(?<y>\\d+)").replace("{x}", "(?<x>\\d+)") + "$");
      const inFrame = asked.every((o) => { const m = pattern.exec(o.url); if (!m) return false; const z = +m.groups.z, t = frame.tiles[z]; return z >= frame.min && z <= frame.max && t && +m.groups.x >= t[0] && +m.groups.x <= t[1] && +m.groups.y >= t[2] && +m.groups.y <= t[3]; });
      expect(asked.length >= 4 && asked.length <= 40 && inFrame && asked.every((o) => !o.nav && o.method === "GET"), "map: choosing Satellite asks the one imagery service for the squares in view, at a sensible zoom, and for nothing else", asked.length + " requests, e.g. " + (asked[0] || {}).url);
      expect(asked.every((o) => o.referer === ""), "map: those requests do not say which page they came from", [...new Set(asked.map((o) => o.referer))].join(" "));
      const sat = await page.evaluate(() => { const el = document.querySelector("[data-map]"); return { cls: el.classList.contains("is-sat"), seg: [...el.querySelectorAll(".mapseg button")].map((b) => b.getAttribute("aria-pressed")).join(), credit: el.querySelector("[data-credit-sat]").hidden ? "" : el.querySelector("[data-credit-sat]").textContent, osm: el.querySelector("[data-credit-map]").getClientRects().length > 0, names: [...el.querySelectorAll(".mapplate__grid--names img")].filter((i) => new URL(i.src).origin === location.origin && /\/map\/en\/\d\/\d+_\d+\.webp$/.test(i.src)).length, namesLight: /invert/.test(getComputedStyle(el.querySelector(".mapplate__grid--names")).filter), drawn: el.querySelector(".mapplate__grid--base").hidden, tiles: !el.querySelector("[data-tiles]").hidden }; });
      expect(sat.cls && sat.seg === "false,true" && /^Imagery: Esri/.test(sat.credit) && sat.osm && sat.tiles, "map: the switch shows which view is on, and the imagery's own credit appears beside the map data credit", JSON.stringify(sat));
      expect(sat.names >= 1 && sat.namesLight && sat.drawn && await aligned(), "map: the street names are laid over the satellite images from this site's own squares, turned light, and the markers stay in place", JSON.stringify(sat));
      /* in this test every request to another site is stopped, which is also what a visitor offline would meet */
      const failed = await page.evaluate(() => { const f = document.querySelector("[data-sat-fail]"); return { shown: !f.hidden && f.getClientRects().length > 0, text: f.textContent.replace(/\s+/g, " ").trim(), role: f.getAttribute("role") }; });
      expect(failed.shown && /^The satellite images could not be loaded\.\s*Back to the map$/.test(failed.text) && failed.role === "alert", "map: if the images cannot be loaded the map says so and offers the way back", JSON.stringify(failed));
      await page.click("[data-sat-fail] [data-layer]"); await page.waitForTimeout(300);
      const backTo = await page.evaluate(() => { const el = document.querySelector("[data-map]"); return { cls: el.classList.contains("is-sat"), fail: el.querySelector("[data-sat-fail]").hidden, tiles: el.querySelector("[data-tiles]").hidden, credit: el.querySelector("[data-credit-sat]").hidden, focus: document.activeElement.getAttribute("data-layer") + "/" + document.activeElement.getAttribute("aria-pressed"), plate: !el.querySelector(".mapplate__grid--base").hidden && getComputedStyle(el.querySelector(".mapplate__under")).visibility === "visible" }; });
      expect(!backTo.cls && backTo.fail && backTo.tiles && backTo.credit && backTo.focus === "map/true" && backTo.plate, "map: Back to the map restores the drawn map and hands the keyboard to the view switch", JSON.stringify(backTo));
      await page.click('[data-layer="sat"]'); await page.waitForTimeout(400);
      const n1 = ctx.outside.length;
      await page.reload({ waitUntil: "load" }); await page.waitForTimeout(700);
      await page.goto(BASE + "en/location/", { waitUntil: "load" }); await page.waitForTimeout(700);
      expect(ctx.outside.length === n1 && await page.evaluate(() => !document.querySelector("[data-map]").classList.contains("is-sat") && document.querySelector('.mapseg [data-layer="map"]').getAttribute("aria-pressed") === "true"), "map: the choice of Satellite is not remembered, so a new page asks nothing of the imagery service");
    } else {
      const off = await page.evaluate(() => { const el = document.querySelector("[data-map]"); return { left: el.querySelectorAll(".mapseg, [data-layer], [data-tiles], [data-names-img], [data-sat-fail], [data-credit-sat]").length, zoom: el.querySelectorAll(".mapzoom button").length, note: document.querySelector(".mapplate__note").textContent.trim(), named: /arcgis|esri/i.test(document.documentElement.outerHTML), credit: el.querySelector("[data-credit-map]").getClientRects().length > 0 }; });
      expect(off.left === 0 && off.zoom === 3 && off.credit && off.note === "Choose a marker to see what it is." && !off.named, "map, built without the satellite view: there is no view switch, the zoom buttons and the map data credit remain, and the page does not name the imagery service", JSON.stringify(off));
      await page.goto(BASE + "en/location/", { waitUntil: "load" }); await page.waitForTimeout(700);
      expect(ctx.outside.length === 0, "map, built without the satellite view: nothing is asked of any other site", ctx.outside.slice(0, 2).map((o) => o.url).join(" "));
    }

    /* the location page: twelve markers, three kinds, matched to the list by icon and by pointing */
    const loc = await page.evaluate(() => { const kinds = {}; document.querySelectorAll("[data-map] .pin[data-pin]").forEach((p) => { const k = p.getAttribute("data-kind"), i = p.querySelector("svg").getAttribute("class"); (kinds[k] = kinds[k] || new Set()).add(i); }); const rows = [...document.querySelectorAll(".place")]; return { pins: document.querySelectorAll("[data-map] .pin[data-pin]").length, kinds: Object.keys(kinds).sort().map((k) => k + ":" + [...kinds[k]].join("+")).join(" "), rowsMatch: rows.every((r) => r.querySelector(".place__n svg").getAttribute("class") === document.querySelector('.pin[data-pin="' + r.getAttribute("data-place") + '"] svg').getAttribute("class")), chips: [...document.querySelectorAll(".chip--kind")].map((ch) => ch.getAttribute("data-filter") + ":" + ch.querySelector("svg").getAttribute("class")).join(" "), numbered: rows.some((r) => /^\s*\d/.test(r.textContent)), list: document.querySelector(".places").tagName }; });
    expect(loc.pins === 12 && loc.kinds === "culture:i-landmark shopping:i-cart transport:i-train" && loc.rowsMatch && loc.chips === "shopping:i-cart transport:i-train culture:i-landmark" && !loc.numbered && loc.list === "UL", "map: on the location page each kind of place has one icon, used on its markers, its rows and its filter", JSON.stringify(loc));
    await page.locator("[data-map]").scrollIntoViewIfNeeded();
    await page.hover('.place[data-place="bacc"] .place__btn'); await page.waitForTimeout(250);
    expect(await page.evaluate(() => { const p = document.querySelector('.pin[data-pin="bacc"]'); return p.classList.contains("is-lit") && getComputedStyle(p.querySelector(".pin__card")).visibility === "visible"; }), "map: pointing at a row in the list lights its marker and shows its card");
    const all12 = await page.evaluate(() => [...document.querySelectorAll("[data-map] .pin[data-pin]")].map((p) => { const c = p.querySelector(".pin__card"), about = document.getElementById(p.getAttribute("aria-describedby")); return { id: p.getAttribute("data-pin"), kind: c.querySelector(".pin__kind").textContent.trim(), same: c.querySelector(".pin__kind svg").getAttribute("class") === p.querySelector(":scope > svg").getAttribute("class"), name: c.querySelector(".pin__name").textContent.trim(), row: document.querySelector('.place[data-place="' + p.getAttribute("data-pin") + '"] .place__name').textContent.trim(), what: c.querySelector(".pin__what").textContent.trim(), far: c.querySelector(".pin__far").textContent.trim(), said: !!about && about.textContent.replace(/\s+/g, " ").trim().length > 40, label: p.getAttribute("aria-label") }; }));
    expect(all12.length === 12 && all12.every((c) => ["Shopping", "Transport", "Culture"].includes(c.kind) && c.same && c.name === c.row && c.label === c.name + ", " + c.kind && c.what.length > 15 && /[.]$/.test(c.what) && /^About [\d.,]+ (m|km) from the hotel, in a straight line$/.test(c.far) && c.said), "map card: each of the twelve markers on the location page has a card with its kind, its name as the list has it, a line on what it is, and its distance", JSON.stringify(all12.filter((c) => !(c.same && c.name === c.row && c.said)).slice(0, 2)));
    await page.mouse.move(8, 300); await page.waitForTimeout(200);
    const rowAndPin = () => page.evaluate(() => document.querySelector('.place[data-place="bacc"] .place__btn').getAttribute("aria-expanded") + "," + document.querySelector('.pin[data-pin="bacc"]').getAttribute("aria-pressed"));
    await page.click('.pin[data-pin="bacc"]'); await page.waitForTimeout(700);
    const rowOpened = await rowAndPin();
    await page.click('.pin[data-pin="bacc"]'); await page.waitForTimeout(400);
    expect(rowOpened === "true,true" && (await rowAndPin()) === "false,false", "map card: on the location page a marker opens its row in the list along with its card, and choosing it again closes both", rowOpened + " then " + await rowAndPin());
    await page.mouse.move(8, 300);

    /* what a page may load: the imagery service is allowed on the two pages that have the map, and nowhere else */
    const policy = async (route) => { await page.goto(BASE + route, { waitUntil: "domcontentloaded" }); return page.evaluate(() => (/img-src ([^;]+)/.exec(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content) || [])[1]); };
    const pol = { home: await policy("en/"), location: await policy("th/location/"), dining: await policy("en/dining/"), contact: await policy("th/contact/") };
    if (hasSat) expect(pol.home === "'self' data: " + new URL(frame.url).origin && pol.location === pol.home && pol.dining === "'self' data:" && pol.contact === "'self' data:", "map: the content policy admits pictures from the imagery service on the home and location pages only", JSON.stringify(pol));
    else expect(Object.values(pol).every((p) => p === "'self' data:"), "map, built without the satellite view: no page's content policy admits a picture from anywhere but the site itself", JSON.stringify(pol));
    await page.goto(BASE + "en/privacy/", { waitUntil: "load" });
    const priv = (await page.textContent("main")).replace(/\s+/g, " ");
    if (hasSat) expect(/The map and its satellite view/.test(priv) && /fetches the satellite images directly from Esri/.test(priv) && /Nothing is asked of Esri unless you choose the satellite view, and the choice is not remembered/.test(priv) && !/loads nothing from a map service/.test(priv), "AC-62 privacy text: the privacy page says what the satellite view sends, to whom, and that it happens only on request");
    else expect(!/Esri|satellite/i.test(priv) && /Three things do involve information about your visit/.test(priv) && /Moving it, zooming it and choosing a place on it ask nothing of any map service/.test(priv), "AC-62 privacy text: built without the satellite view, the privacy page names no imagery service, counts three things and says the map asks nothing of any map service");
    expect(errs.length === 0, "map: no script error", errs.slice(0, 3).join(" | "));
    await ctx.close();

    /* fingers. Edge only: the touches are sent through the browser's own input pipeline (a DevTools call that
       Playwright's WebKit does not have), so the browser decides, as it would on a phone, which movements are
       the page's and which are the map's. */
    if (edge) {
      const phone = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const tp = await phone.newPage();
      const terrs = []; watch(tp, terrs);
      await tp.goto(BASE + "en/location/", { waitUntil: "load" });
      await tp.evaluate(() => { const r = document.querySelector("[data-view]").getBoundingClientRect(); window.scrollBy(0, r.top - 140); });
      await tp.waitForTimeout(500);
      const cdp = await phone.newCDPSession(tp);
      const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p, i) => ({ x: Math.round(p[0]), y: Math.round(p[1]), id: i })) });
      const st = () => tp.evaluate(() => { const el = document.querySelector("[data-map]"), v = el.querySelector("[data-view]").getBoundingClientRect(), all = el.querySelector("[data-pins]").getBoundingClientRect(); return { scale: Math.round(all.height / v.height * 100) / 100, left: Math.round(all.left - v.left), top: Math.round(all.top - v.top), y: Math.round(scrollY), touch: getComputedStyle(el.querySelector("[data-view]")).touchAction }; });
      const free = await tp.evaluate(() => { const v = document.querySelector("[data-view]"), r = v.getBoundingClientRect(); for (let y = 0.75; y > 0.3; y -= 0.06) for (let x = 0.35; x < 0.7; x += 0.06) { const px = r.left + r.width * x, py = r.top + r.height * y, ok = [[0, 0], [-45, 0], [45, 0]].every(([dx, dy]) => { const t = document.elementFromPoint(px + dx, py + dy); return t && v.contains(t) && !t.closest("button, a, p"); }); if (ok) return [px, py]; } return null; });
      const drag = async (from, dx, dy, steps = 8) => { await touch("touchStart", [from]); for (let i = 1; i <= steps; i++) { await touch("touchMove", [[from[0] + dx * i / steps, from[1] + dy * i / steps]]); await tp.waitForTimeout(16); } await touch("touchEnd", []); await tp.waitForTimeout(350); };
      /* a marker's card under a real finger: a tap opens it, a second tap closes it, a drag leaves it, a tap on the map closes it */
      const tapAt = async (pt) => { await touch("touchStart", [pt]); await tp.waitForTimeout(40); await touch("touchEnd", []); await tp.waitForTimeout(450); };
      const findFree = () => tp.evaluate(() => { const v = document.querySelector("[data-view]"), r = v.getBoundingClientRect(); for (let y = 0.75; y > 0.1; y -= 0.06) for (let x = 0.35; x < 0.7; x += 0.06) { const px = r.left + r.width * x, py = r.top + r.height * y, ok = [[0, 0], [-45, 0], [45, 0]].every(([dx, dy]) => { const t = document.elementFromPoint(px + dx, py + dy); return t && v.contains(t) && !t.closest("button, a, p"); }); if (ok) return [px, py]; } return null; });
      const aPin = await tp.evaluate(() => { const v = document.querySelector("[data-view]").getBoundingClientRect(); for (const p of document.querySelectorAll("[data-map] .pin[data-pin]")) { const r = p.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; if (r.left > v.left + 6 && r.right < v.right - 6 && r.top > v.top + 6 && r.bottom < v.bottom - 6 && document.elementFromPoint(x, y) === p) return { id: p.getAttribute("data-pin"), at: [x, y] }; } return null; });
      const cardNow = () => tp.evaluate((id) => { const p = document.querySelector('.pin[data-pin="' + id + '"]'), cs = getComputedStyle(p.querySelector(".pin__card")), r = p.getBoundingClientRect(); return { shown: cs.visibility === "visible" && cs.opacity === "1", pressed: p.getAttribute("aria-pressed"), over: p.classList.contains("is-over"), docked: p.classList.contains("is-docked"), at: [r.left + r.width / 2, r.top + r.height / 2] }; }, aPin.id);
      await tapAt(aPin.at); const c1 = await cardNow();
      await tapAt(aPin.at); const c2 = await cardNow();
      expect(c1.shown && c1.pressed === "true" && c1.docked && !c1.over && !c2.shown && c2.pressed === "false", "map, touch: a tap on a marker opens its card, and a second tap puts it away with nothing left showing", JSON.stringify([aPin.id, c1, c2]));
      await tapAt(aPin.at);
      await drag(await findFree(), 50, 0); const c3 = await cardNow();
      await tapAt(await findFree()); const c4 = await cardNow();
      expect(c3.shown && c3.pressed === "true" && !c4.shown && c4.pressed === "false", "map, touch: moving the map with a finger leaves the card open, and a tap on the map itself puts it away", JSON.stringify([c3, c4]));
      await tp.goto(BASE + "en/location/", { waitUntil: "load" });
      await tp.evaluate(() => { const r = document.querySelector("[data-view]").getBoundingClientRect(); window.scrollBy(0, r.top - 140); });
      await tp.waitForTimeout(500);
      const OPEN = await tp.evaluate(() => +document.querySelector("[data-map]").getAttribute("data-open"));
      const a0 = await st();
      await drag(free, 110, 0);
      const a1 = await st();
      expect(Math.abs(a0.scale - OPEN) < 0.02 && a1.left - a0.left > 70 && a1.left - a0.left < 125 && Math.abs(a1.top - a0.top) < 2 && Math.abs(a1.y - a0.y) < 3, "map, touch: one finger dragged sideways moves the map with it and leaves the page still", JSON.stringify([a0, a1]));
      await drag(free, 0, -170);
      const a2 = { ...(await st()), hint: await tp.evaluate(() => { const h = document.querySelector("[data-map-hint]"); return h.hidden ? "" : h.textContent.trim(); }) };
      expect(a2.y - a1.y > 90 && a2.left === a1.left && a2.top === a1.top && Math.abs(a2.scale - OPEN) < 0.02, "map, touch: as it opens, one finger swiped up over the map scrolls the page and leaves the map alone", JSON.stringify([a1, a2]));
      expect(a2.hint === "Use two fingers to move the map", "map, touch: and the map then says that two fingers move it", a2.hint);
      /* two fingers moved together move the map, in any direction, and the page stays where it is */
      await tp.evaluate(() => { const r = document.querySelector("[data-view]").getBoundingClientRect(); window.scrollBy(0, r.top - 140); });
      await tp.waitForTimeout(500);
      const two = await findFree(), b0 = await st();
      await touch("touchStart", [[two[0] - 35, two[1]], [two[0] + 35, two[1]]]);
      for (let i = 1; i <= 10; i++) { await touch("touchMove", [[two[0] - 35, two[1] - i * 9], [two[0] + 35, two[1] - i * 9]]); await tp.waitForTimeout(16); }
      await touch("touchEnd", []); await tp.waitForTimeout(400);
      const b1 = await st();
      expect(b1.top - b0.top < -60 && b1.top - b0.top > -100 && Math.abs(b1.y - b0.y) < 3 && Math.abs(b1.scale / b0.scale - 1) < 0.06, "map, touch: two fingers moved up together move the map up with them, and the page stays put", JSON.stringify([b0, b1]));
      await tp.evaluate(() => { const r = document.querySelector("[data-view]").getBoundingClientRect(); window.scrollBy(0, r.top - 140); });
      await tp.waitForTimeout(400);
      const mid = await findFree(), before3 = await st();
      await touch("touchStart", [[mid[0] - 30, mid[1]], [mid[0] + 30, mid[1]]]);
      for (let i = 1; i <= 10; i++) { await touch("touchMove", [[mid[0] - 30 - i * 6, mid[1]], [mid[0] + 30 + i * 6, mid[1]]]); await tp.waitForTimeout(16); }
      await touch("touchEnd", []); await tp.waitForTimeout(400);
      const a3 = await st();
      expect(a3.scale / before3.scale > 2.4 && a3.scale / before3.scale < 3.4 && a3.touch === "none", "map, touch: two fingers moved apart zoom the map by as much as they moved (three times, here)", JSON.stringify([before3.scale, a3]));
      const y3 = a3.y;
      await drag(mid, 0, -80);
      const a4 = await st();
      expect(a4.top - a3.top < -50 && Math.abs(a4.y - y3) < 3 && a4.scale === a3.scale, "map, touch: once zoomed in, one finger moves the map up and down and the page stays put", JSON.stringify([a3, a4]));
      expect(terrs.length === 0, "map, touch: no script error", terrs.join(" | "));
      await phone.close();
    }

    /* a narrow window with a mouse (a small window, or a page zoomed to 400%): the card lies along the map's
       edge, where the mouse could not follow it, so pointing opens nothing and a click does */
    const narrow = await newContext({ viewport: { width: 600, height: 800 } });
    const np = await narrow.newPage();
    await np.goto(BASE + "en/", { waitUntil: "load" });
    await np.locator("[data-map]").scrollIntoViewIfNeeded(); await np.waitForTimeout(1000);
    const nPin = await np.evaluate(() => { const v = document.querySelector("[data-view]").getBoundingClientRect(); for (const p of document.querySelectorAll("[data-map] .pin[data-pin]")) { const r = p.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; if (r.left > v.left + 6 && r.right < v.right - 6 && r.top > v.top + 6 && r.bottom < v.bottom - 6 && y > 80 && y < innerHeight - 20 && document.elementFromPoint(x, y) === p) return { id: p.getAttribute("data-pin"), at: [x, y] }; } return null; });
    const nCard = () => np.evaluate((id) => { const p = document.querySelector('.pin[data-pin="' + id + '"]'), c = p.querySelector(".pin__card"), cs = getComputedStyle(c), r = c.getBoundingClientRect(), v = document.querySelector("[data-view]").getBoundingClientRect(); return { shown: cs.visibility === "visible" && cs.opacity === "1", docked: p.classList.contains("is-docked"), inside: r.left >= v.left - 0.5 && r.right <= v.right + 0.5 && r.top >= v.top - 0.5 && r.bottom <= v.bottom + 0.5, onScreen: r.top >= 0 && r.bottom <= innerHeight }; }, nPin.id);
    await np.mouse.move(nPin.at[0], nPin.at[1], { steps: 4 }); await np.waitForTimeout(320);
    const nw1 = await nCard();
    await np.mouse.click(nPin.at[0], nPin.at[1]); await np.waitForTimeout(380);
    const nw2 = await nCard();
    expect(!nw1.shown && nw2.shown && nw2.docked && nw2.inside && nw2.onScreen, "map card: in a narrow window with a mouse, pointing opens nothing that the mouse could not reach, and a click opens the card along the map's edge, whole and on the screen", JSON.stringify([nPin, nw1, nw2]));
    await narrow.close();

    /* without JavaScript: a picture with icon markers, and none of the controls */
    const noScript = await newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const bare = await noScript.newPage();
    await bare.goto(BASE + "en/location/", { waitUntil: "load" });
    const nj = await bare.evaluate(() => { const el = document.querySelector("[data-map]"), v = el.querySelector("[data-view]"); return { img: el.querySelector(".mapplate__img").getClientRects().length > 0, pins: el.querySelectorAll(".pin[data-pin] > svg").length, tools: el.querySelector(".mapplate__tools").getClientRects().length, note: document.querySelector(".mapplate__note").getClientRects().length, scrolls: v.scrollWidth > v.clientWidth, page: document.documentElement.scrollWidth <= innerWidth }; });
    expect(nj.img && nj.pins === 12 && nj.tools === 0 && nj.note === 0 && nj.scrolls && nj.page, "no JavaScript: the map is a picture with icon markers that scrolls sideways in its box, with no dead controls", JSON.stringify(nj));
    await bare.focus('.pin[data-pin="platinum"]');
    expect(await bare.evaluate(() => { const c = document.querySelector('.pin[data-pin="platinum"] .pin__card'); return getComputedStyle(c).visibility === "visible" && /Shopping/.test(c.textContent) && /straight line/.test(c.textContent); }), "no JavaScript: a marker still shows its card, above it, when it is focused or pointed at");
    await noScript.close();
  });
}


/* ------------------------------------------------------------------ */
/* Part 2b: cases found in review, kept as regression checks            */
/* ------------------------------------------------------------------ */
if (runs("behaviour")) {
  console.log("Regression cases");
  /* the map was blurred on a sharp screen when its drawing was enlarged with scale(): at rest it must be laid
     out at its true size, the same as the marker layer, and only moved */
  await block("map at rest is laid out at true size", async () => {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(BASE + "en/", { waitUntil: "load" });
    await page.evaluate(() => document.querySelector("[data-map]").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1200);
    const rest = () => page.evaluate(() => { const r = document.querySelector("[data-raster]"), p = document.querySelector("[data-pins]"); return { t: r.style.transform, rw: r.getBoundingClientRect().width, pw: p.getBoundingClientRect().width }; });
    const a = await rest();
    await page.click('[data-map] [data-zoom="in"]'); await page.waitForTimeout(900);
    const b = await rest();
    const ok2 = (q) => !/scale/.test(q.t) && Math.abs(q.rw - q.pw) < 1;
    expect(ok2(a) && ok2(b) && b.rw > a.rw * 1.5, "map: at rest the drawing is laid out at its true size (no scale), on the opening view and after a zoom", JSON.stringify({ a, b }));
    await ctx.close();
  });

  await block("regression: planner and enquiry", async () => {
    const ctx = await newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const hp = plannerAt(page, "#plan", "hp");

    /* one child with no age yet is not the same as no children */
    await page.goto(BASE + "en/", { waitUntil: "load" });
    await page.selectOption(hp.ch, "1");
    expect(await page.isVisible(hp.age(1)), "planner: choosing one child shows its age field");
    await page.click(hp.go); await closePopups(ctx, page);
    expect(leaves(ctx).length === 0 && await page.evaluate(() => document.activeElement.id === "hp-age1"), "planner: a missing age stops the handoff and takes focus");

    /* stepping the children back down leaves a complete link */
    const a = addDays(TODAY, 30), b = addDays(TODAY, 33);
    await page.fill(hp.in, a); await page.fill(hp.out, b); await page.selectOption(hp.ad, "3");
    await page.selectOption(hp.ch, "2"); await page.selectOption(hp.ch, "1"); await page.selectOption(hp.ch, "0");
    expect((await hp.href()) === `${BOOK}?date=${a}&nights=3&adults=3`, "planner: children 2, 1, 0 leaves dates and adults in the link", await hp.href());

    /* every booking link withholds the referrer */
    expect(await page.evaluate(() => [...document.querySelectorAll('a[href*="granddiamondsuites.com/booking"], a[href*="granddiamondsuites.com/th/booking"]')].every((x) => /noreferrer/.test(x.rel) && /noopener/.test(x.rel))), "booking links: no referrer is sent to the hotel");

    /* Back shows the stay as it is now */
    await page.goto(BASE + "en/suites/family-suite/", { waitUntil: "load" });
    await page.selectOption("#sp-ad", "4"); await page.selectOption("#sp-ch", "2"); await page.selectOption("#sp-age1", "5"); await page.selectOption("#sp-age2", "9");
    await page.goBack({ waitUntil: "load" }); await page.waitForTimeout(400);
    expect((await page.inputValue(hp.ad)) === "4" && (await page.inputValue(hp.ch)) === "2" && (await hp.href()).endsWith("adults=4&children-age=5;9"), "planner: after Back the form and the link agree with the stay", (await page.inputValue(hp.ad)) + " / " + (await hp.href()));

    /* the Thai summary reads as Thai */
    await page.goto(BASE + "th/", { waitUntil: "load" });
    const thDates = await hp.dates(), thGuests = await hp.guests();
    expect(/คืน/.test(thDates) && /ผู้ใหญ่ 4 ท่าน/.test(thGuests) && /เด็ก 2 คน อายุ 5 ปี และ 9 ปี/.test(thGuests) && !/[A-Za-z]/.test(thDates + thGuests), "planner: the Thai summary reads as Thai", thDates + " / " + thGuests);

    /* map explorer: a filter closes what it hides */
    await page.goto(BASE + "en/location/", { waitUntil: "load" });
    await page.click('.pin[data-pin="platinum"]');
    await page.click('[data-explorer] [data-filter="culture"]');
    expect(await page.evaluate(() => document.querySelectorAll('.place__btn[aria-expanded="true"]').length === 0 && document.querySelectorAll('.pin[aria-pressed="true"]').length === 0), "explorer: filtering closes a hidden place and releases its pin");

    /* enquiry helper */
    await page.goto(BASE + "en/contact/", { waitUntil: "load" });
    await page.fill("#enq-arrive", addDays(TODAY, 40)); await page.fill("#enq-depart", addDays(TODAY, 41));
    await page.click("[data-enquiry-prepare]");
    expect(/\(1 night\)/.test(await page.textContent("[data-enquiry-text]")), "enquiry: one night is singular");
    await page.fill("#enq-message", "A change");
    expect(await page.evaluate(() => document.querySelector("[data-enquiry-out]").hidden), "enquiry: editing the form withdraws the earlier message");
    const before = page.url();
    await page.evaluate(() => { const f = document.querySelector("[data-enquiry]"); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event("submit", { cancelable: true })); });
    await page.waitForTimeout(300);
    expect(page.url() === before && ctx.outside.length === 0 && await page.evaluate(() => { const f = document.querySelector("[data-enquiry]"); return !f.hasAttribute("action") && !f.querySelector('[type="submit"]') && !document.querySelector("[data-enquiry-out]").hidden; }), "enquiry: the form has nowhere to submit to, and a submit only prepares the message");
    await page.goto(BASE + "th/contact/", { waitUntil: "load" });
    await page.fill("#enq-message", "ขอสอบถามรายละเอียดห้องพักสำหรับครอบครัวที่เดินทางพร้อมผู้สูงอายุและเด็กเล็ก ".repeat(6));
    await page.click("[data-enquiry-prepare]");
    const longMail = await page.getAttribute("[data-enquiry-mail]", "href");
    expect(!longMail.includes("&body=") && longMail.length < 2000, "enquiry: a long message is not forced into the mail address", String(longMail.length));
    await ctx.close();
  });
  await block("regression: phone sheet and comparison address", async () => {
    /* phone: the planner sheet always fits, and the booking bar comes back after Escape */
    const ctx = await newContext({ viewport: { width: 320, height: 568 }, isMobile: mob, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE + "en/dining/", { waitUntil: "load" });
    await page.evaluate(() => window.scrollTo(0, 1400)); await page.waitForTimeout(350);
    await page.click("[data-mcta] [data-open-planner]");
    await page.selectOption("#pd-ch", "3");
    const sheet = await page.evaluate(() => { const d = document.getElementById("plan-dialog"); const r = d.getBoundingClientRect(); return { top: Math.round(r.top), fits: r.bottom <= innerHeight + 1, scrolls: d.scrollHeight > d.clientHeight, close: d.querySelector("[data-close]").getBoundingClientRect().top >= 0 }; });
    expect(sheet.top >= 0 && sheet.fits && sheet.close, "phone: the planner sheet stays on screen with three children", JSON.stringify(sheet));
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.querySelector("[data-mcta]").classList.contains("is-on")), "phone: the booking bar returns after Escape");

    /* comparison: the address follows the pickers through a language switch */
    await page.goto(BASE + "en/suites/compare/?a=family-suite&b=junior-suite", { waitUntil: "load" });
    await page.selectOption("[data-pick-b]", "penthouse-suite");
    expect(/a=family-suite&b=penthouse-suite/.test(page.url()), "comparison: the address follows the pickers", page.url());
    await page.click(".header-tools [data-lang-switch]"); await page.waitForLoadState("load");
    expect(/th\/suites\/compare\/\?a=family-suite&b=penthouse-suite/.test(page.url()) && (await page.inputValue("[data-pick-b]")) === "penthouse-suite", "comparison: the choice survives a language switch", page.url());
    await ctx.close();
  });
  await block("regression: found on the live site", async () => {
    const ctx = await newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.route("**/hotel-towers-at-night*", (r) => r.abort());
    await page.goto(BASE + "en/", { waitUntil: "load" });
    const frame = await page.evaluate(() => { const f = document.querySelector(".closing figure"); f.scrollIntoView(); const r = f.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    expect(frame[0] >= 480 && frame[1] >= 360, "home: the closing photograph's frame holds its size before the photograph arrives", frame.join(" by "));
    expect(await page.evaluate(() => document.querySelectorAll("[data-open-planner]").length > 0 && document.querySelectorAll("[data-open-planner] [data-newtab-note]").length === 0), "booking buttons: no new-tab notice once the planner opens in the page");
    await ctx.close();

    const plain = await newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
    const bare = await plain.newPage();
    await bare.goto(BASE + "th/suites/junior-suite/", { waitUntil: "load" });
    expect(await bare.evaluate(() => { const a = [...document.querySelectorAll("a[data-open-planner]")]; const out = a.filter((x) => !x.getAttribute("href").startsWith("#")); return out.length > 0 && out.every((x) => x.target === "_blank" && !!x.querySelector("[data-newtab-note]")) && a.filter((x) => x.getAttribute("href").startsWith("#")).every((x) => !!document.getElementById(x.getAttribute("href").slice(1))); }), "no JavaScript: every booking button says it opens a new tab, and every Check dates link leads to a planner on the page");
    await plain.close();

    const phone = await newContext({ viewport: { width: 390, height: 844 }, isMobile: mob, hasTouch: true });
    const small = await phone.newPage();
    await small.goto(BASE + "en/", { waitUntil: "load" });
    await small.tap("[data-open-menu]"); await small.waitForTimeout(300);
    expect(await small.evaluate(() => { const m = document.getElementById("menu"); return m.open && document.activeElement === m.querySelector("[data-close]"); }), "phone: the menu opens with focus on Close, not on the logo");
    expect(await small.evaluate(() => scrollY) === 0, "phone: the Close button's autofocus does not move the page");
    /* from the open menu, "Check dates" goes to the page's planner and the menu does not pull focus back */
    await small.tap("#menu [data-open-planner]"); await small.waitForTimeout(1200);
    expect(await small.evaluate(() => { const z = document.getElementById("plan"); const r = z.getBoundingClientRect(); return !document.getElementById("menu").open && r.top < innerHeight && r.bottom > 0 && (document.activeElement === z || z.contains(document.activeElement)); }), "phone: Check dates in the menu closes it and goes to the planner");
    await phone.close();
  });
  if (edge) {
    /* web fonts that arrive late: the stand-in fonts hold the opening lines where they are.
       Edge only: Playwright's WebKit build for Windows resolves local("Georgia") but not a
       face name such as local("Georgia Italic"), so the italic and bold stand-ins never load
       there and the result says nothing about Safari. Safari needs a look on a real device. */
    const isWeb = (f) => /^"?(Newsreader|Manrope|Noto Sans Thai|Noto Serif Thai)"?$/.test(f);
    for (const [route, w, h] of [["en/", 1440, 900], ["en/", 1024, 768], ["en/", 390, 844], ["en/suites/", 1440, 900], ["en/location/", 390, 844], ["th/", 1440, 900], ["th/", 1024, 768], ["th/", 390, 844], ["th/location/", 390, 844]]) {
      await block(`late fonts: ${route} at ${w}`, async () => {
        const ctx = await newContext({ viewport: { width: w, height: h }, isMobile: w < 700 ? mob : undefined, hasTouch: w < 700 });
        const page = await ctx.newPage();
        await page.route("**/*.woff2", async (r) => { await new Promise((done) => setTimeout(done, 1300)); await r.continue(); });
        await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);
        const snap = () => page.evaluate(() => {
          const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.top + scrollY), Math.round(r.height)]; };
          return { h1: box("h1"), main: box("main")[0], first: box("main > :nth-child(2)"), web: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family) };
        });
        const before = await snap();
        await page.waitForTimeout(2200);
        const after = await snap();
        const held = before.main === after.main && Math.abs(before.h1[0] - after.h1[0]) <= 1 && Math.abs(before.h1[1] - after.h1[1]) <= 1 && (!before.first || Math.abs(before.first[0] - after.first[0]) <= 1);
        expect(!before.web.some(isWeb) && after.web.some(isWeb) && held, `AC-54 late fonts: ${route} at ${w} keeps its opening lines in place`, JSON.stringify({ before: [before.main, before.h1, before.first], after: [after.main, after.h1, after.first], early: before.web.filter(isWeb) }));
        await ctx.close();
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Part 2c: the acceptance scenarios of the second audit                */
/* ------------------------------------------------------------------ */
if (runs("acceptance")) {
  console.log("Acceptance scenarios");
  const desk = { viewport: { width: 1440, height: 900 } };
  const phoneOpts = { viewport: { width: 390, height: 844 }, isMobile: mob, hasTouch: true, deviceScaleFactor: 2 };
  /* a fresh tab has a fresh session, so every scenario starts from "2 adults, no dates" */
  const fresh = async (ctx, route) => { for (const p of ctx.pages()) await p.close().catch(() => {}); const page = await ctx.newPage(); await page.goto(BASE + route, { waitUntil: "load" }); return page; };

  /* ---------- AC-01 to AC-04: long stays, the night limit, large parties, more than one room ---------- */
  await block("AC-01 long stay", async () => {
    const ctx = await newContext(desk);
    let page = await fresh(ctx, "en/");
    const errs = []; watch(page, errs);
    let hp = plannerAt(page, "#plan", "hp");
    const a = addDays(TODAY, 20), b = addDays(TODAY, 60);
    await page.fill(hp.in, a); await page.fill(hp.out, b); await page.selectOption(hp.ad, "3");
    expect(await hp.recovering(), "AC-01 long stay: the two ways forward appear as soon as 40 nights are entered, before any button is pressed");
    const m = await hp.msg();
    expect(/limit of 31 nights/.test(m) && /For 40 nights/.test(m) && !/error|invalid|cannot/i.test(m), "AC-01 long stay: the message gives the limit and the request, not an error", m);
    expect((await hp.bookHref()) === `${BOOK}?date=${a}&nights=40&adults=3`, "AC-01 long stay: the booking-page route carries the request exactly as entered, nothing shortened", await hp.bookHref());
    expect((await hp.askHref()).endsWith("/en/contact/?about=long"), "AC-01 long stay: the second route is an enquiry about a long stay", await hp.askHref());
    expect((await hp.dates()).endsWith("(40 nights)") && (await page.inputValue(hp.out)) === b, "AC-01 long stay: the dates stay as entered", await hp.dates());
    await page.click(hp.go); await closePopups(ctx, page);
    expect(leaves(ctx).length === 0 && await page.evaluate(() => document.activeElement.hasAttribute("data-recover-book")), "AC-01 long stay: the main button opens nothing and puts the keyboard on the first way forward");
    await page.click(hp.book); await closePopups(ctx, page);
    expect(leaves(ctx).length === 1 && leaves(ctx)[0] === `${BOOK}?date=${a}&nights=40&adults=3`, "AC-01 long stay: the first route opens the official booking page once, with the 40 nights", leaves(ctx).join(" "));
    await page.click(hp.ask); await page.waitForLoadState("load");
    const enq = await page.evaluate(() => ({ url: location.pathname + location.search, intent: (document.querySelector('input[name="intent"]:checked') || {}).value, a: document.getElementById("enq-arrive").value, b: document.getElementById("enq-depart").value, party: document.getElementById("enq-party").value }));
    expect(enq.intent === "long" && enq.a === a && enq.b === b && enq.party === "3 adults" && !/20\d\d-/.test(enq.url), "AC-01 long stay: the enquiry opens about a long stay with the dates and guests filled in, and none of it in the address", JSON.stringify(enq));
    await page.click("[data-enquiry-prepare]");
    const text = await page.textContent("[data-enquiry-text]");
    expect(/Enquiry: A long stay/.test(text) && /\(40 nights\)/.test(text) && /Guests: 3 adults/.test(text), "AC-01 long stay: the prepared message states the 40 nights and the guests", text.slice(0, 200));

    /* the same on a suite page and in the sheet, in Thai */
    page = await fresh(ctx, "th/suites/deluxe-suite/");
    const sp = plannerAt(page, "#stay", "sp");
    await page.fill(sp.in, a); await page.fill(sp.out, b);
    expect(await sp.recovering() && (await sp.bookHref()) === `${BOOK_TH}?date=${a}&nights=40&adults=2` && (await sp.askHref()).endsWith("/th/contact/?about=long&suite=deluxe-suite") && /31 คืน/.test(await sp.msg()) && /40 คืน/.test(await sp.msg()), "AC-01 long stay: a suite page in Thai offers both routes, and the enquiry remembers the suite", (await sp.bookHref()) + " | " + (await sp.askHref()));
    await page.goto(BASE + "en/faq/", { waitUntil: "load" });
    await page.click(".header-cta");
    const pd = plannerAt(page, "#plan-dialog", "pd");
    expect(await pd.recovering() && (await pd.bookHref()) === `${BOOK}?date=${a}&nights=40&adults=2`, "AC-01 long stay: the planner sheet shows the same recovery for the same stay", await pd.bookHref());
    expect(errs.length === 0, "AC-01 long stay: no script error", errs.join(" | "));
    await ctx.close();
  });

  await block("AC-02 night limit", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    const a = addDays(TODAY, 14);
    for (const [n, valid] of [[30, true], [31, true], [32, false]]) {
      await page.fill(hp.out, ""); await page.fill(hp.in, a); await page.fill(hp.out, addDays(a, n));
      const href = await hp.href(), rec = await hp.recovering();
      if (valid) expect(href === `${BOOK}?date=${a}&nights=${n}&adults=2` && !rec && (await hp.msg()) === "", `AC-02 night limit: ${n} nights is passed on as a normal request`, href + " / " + (await hp.msg()));
      else expect(href === BOOK && rec && (await hp.bookHref()) === `${BOOK}?date=${a}&nights=${n}&adults=2` && /limit of 31 nights when it was checked/.test(await hp.msg()), `AC-02 night limit: ${n} nights is past the limit the booking page showed, and both routes are offered`, href + " / " + (await hp.msg()));
    }
    const boot = await page.evaluate(() => JSON.parse(document.getElementById("boot").textContent).booking);
    expect(boot.maxNights === 31 && boot.maxGuests === 8 && boot.maxAdults === 8, "AC-02 night limit: the limits come from the one hotel record (31 nights, 8 guests), not from the script", JSON.stringify(boot));
    await ctx.close();
  });

  await block("AC-03 large party", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    expect(await page.evaluate(() => [...document.querySelectorAll("#hp-ad option")].map((o) => o.value).join()) === "1,2,3,4,5,6,7,8", "AC-03 large party: adults can be chosen up to eight");
    for (const n of [7, 8]) {
      await page.selectOption(hp.ad, String(n));
      expect((await hp.href()) === `${BOOK}?adults=${n}` && (await hp.guests()) === `${n} adults` && !(await hp.recovering()), `AC-03 large party: ${n} adults are passed on as ${n}`, await hp.href());
    }
    const a = addDays(TODAY, 9), b = addDays(TODAY, 12);
    await page.fill(hp.in, a); await page.fill(hp.out, b);
    await page.selectOption(hp.ch, "2");
    const m = await hp.msg();
    expect(await hp.recovering() && /up to 8 guests at a time/.test(m) && /For 10 guests/.test(m), "AC-03 large party: ten guests are told the limit at once, before any age is asked for", m);
    expect((await page.inputValue(hp.ad)) === "8" && (await page.inputValue(hp.ch)) === "2" && (await hp.guests()) === "8 adults, 2 children (ages needed)", "AC-03 large party: the party stays as entered, nothing is reduced", await hp.guests());
    expect((await hp.bookHref()) === `${BOOK}?date=${a}&nights=3` && (await hp.href()) === BOOK, "AC-03 large party: the booking-page route carries the dates only, so no guest is silently dropped", await hp.bookHref());
    expect((await hp.askHref()).endsWith("/en/contact/?about=family") && /group stay/.test(await page.textContent(hp.ask)), "AC-03 large party: the second route is an enquiry about a group stay");
    await page.click(hp.go); await closePopups(ctx, page);
    expect(leaves(ctx).length === 0, "AC-03 large party: the main button does not open a search the booking page would cut down");
    await page.click(hp.ask); await page.waitForLoadState("load");
    const enq = await page.evaluate(() => ({ intent: (document.querySelector('input[name="intent"]:checked') || {}).value, party: document.getElementById("enq-party").value, a: document.getElementById("enq-arrive").value }));
    expect(enq.intent === "family" && enq.party === "8 adults, 2 children (ages needed)" && enq.a === a, "AC-03 large party: the enquiry opens with all ten guests and the dates", JSON.stringify(enq));
    await ctx.close();
  });

  await block("AC-04 more than one room", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    const noteText = (await page.textContent("#plan .planner__note")).replace(/\s+/g, " ");
    expect(/more than one room\? Add rooms on the booking page/i.test(noteText) && (await page.evaluate(() => document.querySelector("#plan [data-larger-party]").href)).endsWith("/en/contact/?about=family"), "AC-04 rooms: the planner says rooms are added on the booking page, and links to a group enquiry", noteText.slice(0, 220));
    await page.selectOption(hp.ad, "8"); await page.selectOption(hp.ch, "1");
    const rec = (await page.textContent("#plan [data-recover-note]")).replace(/\s+/g, " ");
    expect(/Only your dates are passed on\. Add each room and its guests on the booking page\./.test(rec) && /not a reservation/.test(rec), "AC-04 rooms: a party too large for one search is told exactly what is passed on and what to do there", rec);
    expect(!/room[s]? (is|are) available|we will|guarantee/i.test(noteText + rec), "AC-04 rooms: nothing promises availability or a room count");
    await ctx.close();
  });

  /* ---------- AC-05 to AC-11: the dates ---------- */
  await block("AC-05 empty dates", async () => {
    for (const [route, ids, opts] of [["en/", ["hp-in", "hp-out"], desk], ["th/suites/junior-suite/", ["sp-in", "sp-out"], phoneOpts], ["en/contact/", ["enq-arrive", "enq-depart"], phoneOpts]]) {
      const ctx = await newContext(opts);
      const page = await fresh(ctx, route);
      const state = (id) => page.evaluate((i) => {
        const el = document.getElementById(i), lab = el.parentNode.querySelector(".datebox__empty");
        const r = lab.getBoundingClientRect(), s = getComputedStyle(lab), own = getComputedStyle(el).color;
        return { value: el.value, cls: el.classList.contains("is-empty"), shown: s.display !== "none" && r.width > 20 && r.height > 8, text: lab.textContent.trim(), cut: lab.scrollWidth > lab.clientWidth + 1, ownHidden: /rgba\(.*,\s*0\)|transparent/.test(own) };
      }, id);
      for (const id of ids) {
        const e = await state(id);
        expect(e.value === "" && e.cls && e.shown && !e.cut && e.ownHidden && (route.startsWith("th") ? e.text === "เลือกวันที่" : e.text === "Add date"), `AC-05 empty dates: ${route} #${id} is empty in the page and says so on screen (${engine})`, JSON.stringify(e));
        await page.fill("#" + id, addDays(TODAY, id.endsWith("in") || id.endsWith("arrive") ? 5 : 8));
        const f = await state(id);
        expect(f.value !== "" && !f.cls && !f.shown && !f.ownHidden, `AC-05 empty dates: ${route} #${id} shows its date once one is chosen (${engine})`, JSON.stringify(f));
      }
      await ctx.close();
    }
    note("AC-05", "The empty state is drawn by the page itself rather than by the browser, so the same label shows in every browser. Checked here in " + (edge ? "Edge" : "Playwright's WebKit") + "; Safari on an iPhone or a Mac has not been looked at.");
  });

  await block("AC-06 clear dates", async () => {
    const ctx = await newContext(desk);
    let page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    expect(!(await page.isVisible(hp.clear)), "AC-06 clear dates: there is nothing to clear while no date is chosen");
    await page.fill(hp.in, addDays(TODAY, 6)); await page.fill(hp.out, addDays(TODAY, 9));
    await page.selectOption(hp.ad, "4"); await page.selectOption(hp.ch, "2"); await page.selectOption(hp.age(1), "0"); await page.selectOption(hp.age(2), "12");
    expect(await page.isVisible(hp.clear), "AC-06 clear dates: the action appears beside the dates");
    await page.click(hp.clear);
    const after = await page.evaluate(() => ({ a: document.getElementById("hp-in").value, b: document.getElementById("hp-out").value, ad: document.getElementById("hp-ad").value, ch: document.getElementById("hp-ch").value, k1: document.getElementById("hp-age1").value, k2: document.getElementById("hp-age2").value, focus: document.activeElement.id, stored: JSON.parse(sessionStorage.getItem("gd:stay")) }));
    expect(after.a === "" && after.b === "" && after.ad === "4" && after.ch === "2" && after.k1 === "0" && after.k2 === "12", "AC-06 clear dates: one press empties both dates and keeps the adults and each child's age", JSON.stringify(after));
    expect(after.stored.in === "" && after.stored.out === "" && after.stored.adults === 4 && after.stored.kids.join() === "0,12", "AC-06 clear dates: the remembered stay is cleared the same way", JSON.stringify(after.stored));
    expect((await hp.href()) === `${BOOK}?adults=4&children-age=0;12` && (await hp.dates()) === "Not selected" && /Dates cleared\. Your guests are unchanged\./.test(await hp.msg()) && after.focus === "hp-in", "AC-06 clear dates: the link, the summary and the status agree, and the keyboard is back in the first date", (await hp.href()) + " / " + (await hp.msg()));
    /* in the sheet, on another page */
    await page.goto(BASE + "en/facilities/", { waitUntil: "load" });
    await page.click(".header-cta");
    const pd = plannerAt(page, "#plan-dialog", "pd");
    expect((await page.inputValue(pd.in)) === "" && (await page.inputValue(pd.ad)) === "4" && (await page.inputValue(pd.age(2))) === "12", "AC-06 clear dates: the sheet on another page shows the cleared dates and the same guests");
    await page.fill(pd.in, addDays(TODAY, 3)); await page.fill(pd.out, addDays(TODAY, 4));
    await page.click(pd.clear);
    expect((await page.inputValue(pd.in)) === "" && (await page.inputValue(pd.out)) === "" && (await page.inputValue(pd.ch)) === "2" && (await pd.href()) === `${BOOK}?adults=4&children-age=0;12`, "AC-06 clear dates: the same action works inside the sheet");
    await ctx.close();
  });

  await block("AC-07 partial dates", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    await page.selectOption(hp.ad, "3");
    await page.fill(hp.in, addDays(TODAY, 6));
    expect((await hp.dates()) === "Incomplete: choose both dates" && (await hp.href()) === BOOK, "AC-07 partial dates: an arrival alone shows as incomplete, and the link carries no half request", await hp.dates());
    await page.click(hp.go); await closePopups(ctx, page);
    let st = await page.evaluate(() => ({ focus: document.activeElement.id, inv: document.getElementById("hp-out").getAttribute("aria-invalid"), other: document.getElementById("hp-in").getAttribute("aria-invalid"), by: document.getElementById("hp-out").getAttribute("aria-describedby") }));
    expect(leaves(ctx).length === 0 && /^Choose a check-out date, or clear the dates/.test(await hp.msg()) && st.focus === "hp-out" && st.inv === "true" && st.other === null && st.by === "hp-msg", "AC-07 partial dates: arrival only names the check-out field, marks it and moves the keyboard to it", (await hp.msg()) + " " + JSON.stringify(st));
    expect(await page.isVisible(hp.clear), "AC-07 partial dates: Clear dates is offered as the way to search without dates");
    await page.click(hp.clear);
    expect((await hp.href()) === `${BOOK}?adults=3`, "AC-07 partial dates: after clearing, the undated search with the same guests is ready", await hp.href());
    await page.fill(hp.out, addDays(TODAY, 9));
    await page.click(hp.go); await closePopups(ctx, page);
    st = await page.evaluate(() => ({ focus: document.activeElement.id, inv: document.getElementById("hp-in").getAttribute("aria-invalid") }));
    expect(leaves(ctx).length === 0 && /^Choose a check-in date, or clear the dates/.test(await hp.msg()) && st.focus === "hp-in" && st.inv === "true", "AC-07 partial dates: departure only names the check-in field", (await hp.msg()) + " " + JSON.stringify(st));
    await ctx.close();
  });

  await block("AC-08 date order", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    const a = addDays(TODAY, 10);
    await page.fill(hp.in, a); await page.fill(hp.out, addDays(TODAY, 13));
    await page.fill(hp.in, addDays(TODAY, 15));
    const m = await hp.msg();
    expect((await page.inputValue(hp.out)) === addDays(TODAY, 16) && /^Check-out moved to .* so that it stays after check-in\.$/.test(m) && (await page.getAttribute("#hp-msg", "role")) === "status", "AC-08 date order: a later check-in moves check-out one night on, and says so in a status message", m);
    expect((await hp.href()) === `${BOOK}?date=${addDays(TODAY, 15)}&nights=1&adults=2`, "AC-08 date order: the link matches the adjusted stay", await hp.href());
    for (const [label, out] of [["the same day", addDays(TODAY, 15)], ["an earlier day", addDays(TODAY, 12)]]) {
      await page.fill(hp.out, out);
      await page.click(hp.go); await closePopups(ctx, page);
      expect(leaves(ctx).length === 0 && (await hp.msg()) === "Check-out must be after check-in." && (await hp.href()) === BOOK && (await page.evaluate(() => document.activeElement.id)) === "hp-out", `AC-08 date order: a check-out on ${label} is refused with the reason, and nothing is changed silently`, await hp.msg());
    }
    await ctx.close();
  });

  await block("AC-09 past date", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    await page.selectOption(hp.ad, "3"); await page.selectOption(hp.ch, "1"); await page.selectOption(hp.age(1), "4");
    await page.fill(hp.in, addDays(TODAY, -1)); await page.fill(hp.out, addDays(TODAY, 2));
    await page.click(hp.go); await closePopups(ctx, page);
    const m = await hp.msg();
    expect(leaves(ctx).length === 0 && /^Check-in cannot be earlier than today in Bangkok, /.test(m) && (await hp.href()) === BOOK, "AC-09 past date: yesterday in Bangkok is refused, with today's date given", m);
    expect((await page.inputValue(hp.ad)) === "3" && (await page.inputValue(hp.ch)) === "1" && (await page.inputValue(hp.age(1))) === "4" && (await hp.guests()) === "3 adults, 1 child aged 4", "AC-09 past date: the guests are untouched", await hp.guests());
    expect((await page.getAttribute(hp.in, "min")) === TODAY, "AC-09 past date: the earliest date offered is today in Bangkok", await page.getAttribute(hp.in, "min"));
    await ctx.close();
  });

  await block("AC-10 calendar edges", async () => {
    const y = +TODAY.slice(0, 4);
    const ny = TODAY < `${y}-12-30` ? y : y + 1;
    let leap = y; while (!((leap % 4 === 0 && leap % 100 !== 0) || leap % 400 === 0) || `${leap}-02-28` < TODAY) leap++;
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    await page.fill(hp.in, `${ny}-12-30`); await page.fill(hp.out, `${ny + 1}-01-02`);
    expect((await hp.href()) === `${BOOK}?date=${ny}-12-30&nights=3&adults=2` && (await hp.dates()) === `30 December ${ny} to 2 January ${ny + 1} (3 nights)`, "AC-10 calendar: a stay across the new year counts three nights and names both years", (await hp.href()) + " / " + (await hp.dates()));
    await page.click(hp.clear);
    await page.fill(hp.in, `${leap}-02-28`); await page.fill(hp.out, `${leap}-03-01`);
    expect((await hp.href()) === `${BOOK}?date=${leap}-02-28&nights=2&adults=2` && (await hp.dates()) === `28 February to 1 March ${leap} (2 nights)`, "AC-10 calendar: 28 February to 1 March in a leap year is two nights", (await hp.href()) + " / " + (await hp.dates()));
    await page.click(hp.clear);
    await page.fill(hp.in, `${leap}-02-29`); await page.fill(hp.out, `${leap}-03-01`);
    expect((await hp.href()) === `${BOOK}?date=${leap}-02-29&nights=1&adults=2`, "AC-10 calendar: 29 February is a real arrival date", await hp.href());
    await ctx.close();
    /* a visitor whose own clock is on another day */
    for (const tz of ["America/Los_Angeles", "Pacific/Kiritimati", "Europe/London"]) {
      const far = await newContext({ ...desk, timezoneId: tz });
      const p2 = await fresh(far, "en/");
      const h2 = plannerAt(p2, "#plan", "hp");
      const a = addDays(TODAY, 1), b = addDays(TODAY, 3);
      await p2.fill(h2.in, TODAY); await p2.fill(h2.out, b);
      const first = await h2.href();
      await p2.fill(h2.out, ""); await p2.fill(h2.in, a); await p2.fill(h2.out, b);
      expect(first === `${BOOK}?date=${TODAY}&nights=3&adults=2` && (await h2.href()) === `${BOOK}?date=${a}&nights=2&adults=2` && (await p2.getAttribute(h2.in, "min")) === TODAY, `AC-10 calendar: with the visitor's clock in ${tz}, today in Bangkok is still the first date and each date is passed on as typed`, first + " / " + (await h2.href()));
      const shown = await h2.dates();
      expect(shown.includes(String(+a.slice(8))) && shown.includes(String(+b.slice(8))) && shown.endsWith("(2 nights)"), `AC-10 calendar: in ${tz} the summary shows the same calendar days`, shown);
      await p2.fill(h2.in, addDays(TODAY, -1));
      await p2.click(h2.go); await closePopups(far, p2);
      expect(leaves(far).length === 0 && /earlier than today in Bangkok/.test(await h2.msg()), `AC-10 calendar: in ${tz}, yesterday in Bangkok is refused`);
      await far.close();
    }
  });

  await block("AC-11 stale state", async () => {
    /* a stay remembered from an earlier visit whose arrival has passed */
    const ctx = await newContext(desk);
    await ctx.addInitScript((stay) => { try { if (!sessionStorage.getItem("gd:seeded")) { sessionStorage.setItem("gd:stay", stay); sessionStorage.setItem("gd:seeded", "1"); } } catch (e) {} }, JSON.stringify({ in: addDays(TODAY, -3), out: addDays(TODAY, 2), adults: 4, kids: ["6"] }));
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    expect((await page.inputValue(hp.in)) === "" && (await page.inputValue(hp.out)) === "" && (await page.inputValue(hp.ad)) === "4" && (await hp.href()) === `${BOOK}?adults=4&children-age=6` && (await hp.dates()) === "Not selected", "AC-11 stale state: a remembered arrival that has passed is dropped, the guests are kept, and the link carries no old date", (await hp.href()) + " / " + (await hp.dates()));
    await ctx.close();

    /* a tab left open across midnight in Bangkok */
    const late = await newContext(desk);
    const p2 = await late.newPage();
    await p2.clock.install({ time: new Date(TODAY + "T16:50:00Z") }); /* 23:50 in Bangkok */
    await p2.goto(BASE + "en/", { waitUntil: "load" });
    const h2 = plannerAt(p2, "#plan", "hp");
    await p2.fill(h2.in, TODAY); await p2.fill(h2.out, addDays(TODAY, 1));
    const beforeMidnight = await h2.href();
    await p2.clock.fastForward(20 * 60 * 1000); /* 00:10 the next day */
    await p2.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    const min = await p2.getAttribute(h2.in, "min");
    await p2.click(h2.go); await closePopups(late, p2);
    expect(beforeMidnight === `${BOOK}?date=${TODAY}&nights=1&adults=2` && min === addDays(TODAY, 1) && leaves(late).length === 0 && /earlier than today in Bangkok/.test(await h2.msg()), "AC-11 stale state: after midnight in Bangkok the earliest date moves on, and yesterday's arrival is stopped with the reason instead of being sent", beforeMidnight + " / min " + min + " / " + (await h2.msg()));
    await late.close();
  });

  /* ---------- AC-12 to AC-16: children, agreement between planners, repeated presses ---------- */
  await block("AC-12 to AC-14 children", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    await page.selectOption(hp.ch, "3");
    await page.selectOption(hp.age(1), "5"); await page.selectOption(hp.age(3), "9");
    await page.click(hp.go); await closePopups(ctx, page);
    const st = await page.evaluate(() => ({ focus: document.activeElement.id, a1: document.getElementById("hp-age1").getAttribute("aria-invalid"), a2: document.getElementById("hp-age2").getAttribute("aria-invalid"), a3: document.getElementById("hp-age3").getAttribute("aria-invalid"), label: document.querySelector('label[for="hp-age2"]').textContent.trim(), by: document.getElementById("hp-age2").getAttribute("aria-describedby") }));
    expect(leaves(ctx).length === 0 && st.focus === "hp-age2" && st.a2 === "true" && st.a1 === null && st.a3 === null && st.label === "Age of child 2" && st.by === "hp-msg" && (await hp.msg()) === "Choose the age of each child on the day of arrival.", "AC-12 child ages: the one missing age is the field that is marked, labelled, described and focused", JSON.stringify(st));
    expect((await hp.href()) === BOOK, "AC-12 child ages: no link with a child missing is offered", await hp.href());

    await page.selectOption(hp.age(1), "0"); await page.selectOption(hp.age(2), "6"); await page.selectOption(hp.age(3), "17");
    expect((await hp.href()) === `${BOOK}?adults=2&children-age=0;6;17` && (await hp.guests()) === "2 adults, 3 children aged under 1, 6 and 17", "AC-13 age edges: under 1, 6 and 17 are passed on as 0, 6 and 17", (await hp.href()) + " / " + (await hp.guests()));
    await page.selectOption(hp.age(2), "7");
    expect((await hp.href()) === `${BOOK}?adults=2&children-age=0;7;17`, "AC-13 age edges: 7 is passed on as 7", await hp.href());
    expect(await page.evaluate(() => [...document.querySelectorAll("#hp-age1 option")].map((o) => o.value).join()) === "," + Array.from({ length: 18 }, (_, i) => i).join(), "AC-13 age edges: every age from under 1 to 17 can be chosen, and none is preselected");
    const blockText = (await page.textContent("#plan .planner-block")).replace(/\s+/g, " ");
    expect(!/free|complimentary|extra bed|no charge/i.test(blockText), "AC-13 age edges: the planner makes no claim about free stays, meals or beds for children");

    await page.selectOption(hp.age(1), "5"); await page.selectOption(hp.age(2), "9"); await page.selectOption(hp.age(3), "17");
    await page.selectOption(hp.ch, "2");
    expect((await hp.href()) === `${BOOK}?adults=2&children-age=5;9`, "AC-14 child removal: removing the third child removes only the third age", await hp.href());
    await page.selectOption(hp.ch, "3");
    expect((await page.inputValue(hp.age(3))) === "" && (await page.inputValue(hp.age(1))) === "5" && (await page.inputValue(hp.age(2))) === "9" && (await hp.href()) === BOOK && (await hp.guests()) === "2 adults, 3 children (ages needed)", "AC-14 child removal: a child added back starts with no age, the other ages stay, and the link waits for the missing age", (await hp.href()) + " / " + (await hp.guests()));
    await page.selectOption(hp.age(3), "12");
    expect((await hp.href()) === `${BOOK}?adults=2&children-age=5;9;12`, "AC-14 child removal: the new age completes the link", await hp.href());
    await page.selectOption(hp.ch, "0");
    expect((await hp.href()) === `${BOOK}?adults=2` && (await hp.guests()) === "2 adults", "AC-14 child removal: no children leaves no ages in the link", await hp.href());
    await ctx.close();
  });

  await block("AC-15 agreement", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    const a = addDays(TODAY, 21), b = addDays(TODAY, 25);
    await page.fill(hp.in, a); await page.fill(hp.out, b); await page.selectOption(hp.ad, "3"); await page.selectOption(hp.ch, "1"); await page.selectOption(hp.age(1), "4");
    const want = `?date=${a}&nights=4&adults=3&children-age=4`;
    await page.goto(BASE + "en/gallery/", { waitUntil: "load" });
    await page.click(".header-cta");
    const pd = plannerAt(page, "#plan-dialog", "pd");
    expect((await pd.href()) === BOOK + want && (await pd.guests()) === "3 adults, 1 child aged 4", "AC-15 agreement: the sheet on another page shows the stay set on the home page", await pd.href());
    await page.selectOption(pd.ad, "5");
    await page.keyboard.press("Escape");
    await page.goto(BASE + "en/suites/executive-suite/", { waitUntil: "load" });
    const sp = plannerAt(page, "#stay", "sp");
    expect((await sp.href()) === `${BOOK}?date=${a}&nights=4&adults=5&children-age=4` && (await page.inputValue(sp.in)) === a, "AC-15 agreement: a change made in the sheet reaches the suite page's planner", await sp.href());
    await page.click(".header-tools [data-lang-switch]"); await page.waitForLoadState("load");
    expect((await sp.href()) === `${BOOK_TH}?date=${a}&nights=4&adults=5&children-age=4`, "AC-42 language: the stay is carried to the same page in Thai", await sp.href());
    await page.goto(BASE + "th/offers/", { waitUntil: "load" });
    const op = plannerAt(page, "#plan", "op");
    expect((await op.href()) === `${BOOK_TH}?date=${a}&nights=4&adults=5&children-age=4`, "AC-15 agreement: the planner on the rates page shows it too", await op.href());
    await page.goto(BASE + "en/", { waitUntil: "load" });
    expect((await hp.href()) === `${BOOK}?date=${a}&nights=4&adults=5&children-age=4` && (await page.inputValue(hp.ad)) === "5", "AC-15 agreement: back on the home page, the first planner has the latest stay", await hp.href());
    /* two planners on one page: the home page's own and the sheet */
    const both = await page.evaluate(() => { const d = document.getElementById("plan-dialog"); return [...document.querySelectorAll("[data-go]")].map((g) => g.getAttribute("href")).join(" ") + " | " + d.querySelector("[data-h-guests]").textContent; });
    expect(both === `${BOOK}?date=${a}&nights=4&adults=5&children-age=4 ${BOOK}?date=${a}&nights=4&adults=5&children-age=4 | 5 adults, 1 child aged 4`, "AC-15 agreement: every planner in the page carries the same link and summary", both);
    await ctx.close();

    const phone = await newContext(phoneOpts);
    const p2 = await fresh(phone, "en/suites/family-suite/");
    await p2.selectOption("#sp-ad", "4");
    await p2.goto(BASE + "en/location/", { waitUntil: "load" });
    await p2.evaluate(() => window.scrollTo(0, 1600)); await p2.waitForTimeout(400);
    await p2.tap("[data-mcta] [data-open-planner]");
    /* the sheet opens on the tap; on a slow run the question can be asked before it has */
    await p2.waitForFunction(() => document.getElementById("plan-dialog").open, null, { timeout: 3000 }).catch(() => {});
    expect((await p2.inputValue("#pd-ad")) === "4" && await p2.evaluate(() => document.getElementById("plan-dialog").open), "AC-15 agreement: the phone's booking bar opens the sheet with the stay set on a suite page");
    await phone.close();
  });

  await block("AC-16 repeated presses", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    const hp = plannerAt(page, "#plan", "hp");
    const a = addDays(TODAY, 7), b = addDays(TODAY, 9);
    await page.fill(hp.in, a); await page.fill(hp.out, b);
    await page.dblclick(hp.go); await closePopups(ctx, page);
    expect(leaves(ctx).length === 1 && leaves(ctx)[0] === `${BOOK}?date=${a}&nights=2&adults=2`, "AC-16 repeated presses: a double press opens the booking page once", leaves(ctx).join(" "));
    await page.waitForTimeout(1300);
    /* the address is set at the moment of the press, from the form as it is then */
    await page.selectOption(hp.ad, "4");
    await page.click(hp.go); await closePopups(ctx, page);
    expect(leaves(ctx).length === 2 && leaves(ctx)[1] === `${BOOK}?date=${a}&nights=2&adults=4`, "AC-16 repeated presses: a later press opens it again, with the stay as it is at that moment", leaves(ctx).join(" "));
    expect((await hp.guests()) === "4 adults" && (await page.inputValue(hp.in)) === a && (await hp.dates()).endsWith("(2 nights)"), "AC-20 return: after the booking page has opened, this page still shows the stay and can be used again", await hp.dates());
    const blockText = (await page.textContent("#plan .planner-block")).replace(/\s+/g, " ");
    expect(!/\b(booked|confirmed|reserved|success|thank you)\b/i.test(blockText) && /Booking continues on the hotel's official booking page/.test(blockText), "AC-20 return: nothing on this page says a booking was made; it says where booking continues", blockText.slice(0, 160));
    expect(await page.evaluate(() => !!document.querySelector('footer a[href^="tel:"]') && !!document.querySelector('#plan a[href*="contact/"]')), "AC-20 outage: if the booking page does not answer, the hotel's telephone and the enquiry page are one step away on the page left open");
    expect(everyLeave.filter((o) => o.nav).every((o) => o.url.startsWith("https://www.granddiamondsuites.com/")), "AC-62 destination: every address a booking control tried to open is on the hotel's own https site");
    await ctx.close();
  });

  /* ---------- AC-17 and AC-18: the suite in view ---------- */
  await block("AC-17 suitability", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/suites/luxury-suite/");
    const sp = plannerAt(page, "#stay", "sp");
    expect(!(await page.isVisible("#stay [data-fit]")), "AC-17 suitability: two adults in the Luxury Suite get no warning");
    await page.selectOption(sp.ad, "6");
    const fit = await page.evaluate(() => { const f = document.querySelector("#stay [data-fit]"); return { shown: !f.hidden && f.getClientRects().length > 0, text: f.textContent.replace(/\s+/g, " ").trim(), links: [...f.querySelectorAll("a")].map((x) => x.getAttribute("href").split("/suites/")[1]) }; });
    expect(fit.shown && /^The booking page lists the Luxury Suite for up to 2 guests, and your party is 6\./.test(fit.text), "AC-17 suitability: six adults on the Luxury Suite page are told what the booking page lists for it", fit.text);
    expect(fit.links.join() === "deluxe-suite/,executive-suite/,penthouse-suite/", "AC-17 suitability: the suites listed for six or more are offered as links, and no others", fit.links.join());
    expect(/more than one room/.test(fit.text) && /A listed total is not a promise that a suite is available\.$/.test(fit.text) && !/\bis available\b(?! )|\bavailable now\b|guarantee/i.test(fit.text.replace("is not a promise that a suite is available", "")), "AC-17 suitability: it also offers more than one room, and says a listed total is not availability", fit.text);
    expect((await sp.href()) === `${BOOK}?adults=6` && !(await sp.recovering()), "AC-17 suitability: the request itself is not blocked or changed", await sp.href());
    await page.selectOption(sp.ad, "2");
    expect(!(await page.isVisible("#stay [data-fit]")), "AC-17 suitability: the note leaves when the party fits again");
    await page.goto(BASE + "th/suites/junior-suite/", { waitUntil: "load" });
    await page.selectOption(sp.ad, "4");
    const th = await page.evaluate(() => { const f = document.querySelector("#stay [data-fit]"); return { text: f.textContent.replace(/\s+/g, " ").trim(), n: f.querySelectorAll("a").length }; });
    expect(/สูงสุด 3 ท่าน/.test(th.text) && /4 ท่าน/.test(th.text) && th.n === 4 && !/[A-Za-z]{3,}/.test(th.text), "AC-17 suitability: the Thai page says the same in Thai, with the four suites listed for four or more", JSON.stringify(th));
    await ctx.close();
  });

  await block("AC-18 suite mapping", async () => {
    const ctx = await newContext(desk);
    const page = await ctx.newPage();
    let allPlain = true; const seen = [];
    for (const lang of ["en", "th"]) for (const slug of ["junior-suite", "luxury-suite", "family-suite", "deluxe-suite", "executive-suite", "penthouse-suite"]) {
      await page.goto(BASE + `${lang}/suites/${slug}/`, { waitUntil: "load" });
      const r = await page.evaluate(() => { const b = document.querySelector("#stay .planner-block"); const row = [...b.querySelectorAll(".handoff dl > div")].pop(); return { h1: document.querySelector("h1").textContent.trim(), name: row.querySelector("dd").firstChild.textContent.trim(), small: row.querySelector("small").textContent.trim(), href: b.querySelector("[data-go]").getAttribute("href"), room: b.querySelector("form").getAttribute("data-room-type") }; });
      if (r.name !== r.h1 || !(lang === "en" ? /^Not passed on: select it again on the booking page$/ : /ไม่ได้ส่งต่อ/).test(r.small) || /room-type/.test(r.href) || r.room) { allPlain = false; seen.push(lang + "/" + slug + " " + JSON.stringify(r)); }
    }
    expect(allPlain, "AC-18 suite mapping: no suite has a confirmed room identifier, so no link carries one, and all twelve suite pages say the suite must be chosen again on the booking page", seen.slice(0, 2).join(" | "));
    await ctx.close();
    note("AC-18", "The hotel has not confirmed a room identifier for any suite, so none is enabled. The code path that would add one is exercised only by the build check that an identifier is digits; it has not been run against the booking page.");
  });

  /* ---------- AC-21 to AC-28: the enquiry ---------- */
  await block("AC-21 to AC-28 enquiry", async () => {
    const ctx = await newContext(desk);
    if (edge) await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
    let page = await fresh(ctx, "en/suites/family-suite/");
    const errs = []; watch(page, errs);
    const sp = plannerAt(page, "#stay", "sp");
    const a = addDays(TODAY, 30), b = addDays(TODAY, 34);
    await page.fill(sp.in, a); await page.fill(sp.out, b);
    await page.selectOption(sp.ch, "2"); await page.selectOption(sp.age(1), "4"); await page.selectOption(sp.age(2), "9");
    await page.click('#stay a[href*="contact/?about=stay"]'); await page.waitForLoadState("load");
    const pre = await page.evaluate(() => ({ url: location.search, a: document.getElementById("enq-arrive").value, b: document.getElementById("enq-depart").value, party: document.getElementById("enq-party").value, suite: document.getElementById("enq-suite").value, note: !document.querySelector("[data-party-note]").hidden, ro: document.getElementById("enq-party").readOnly || document.getElementById("enq-arrive").readOnly }));
    expect(pre.a === a && pre.b === b && pre.party === "2 adults, 2 children aged 4 and 9" && pre.suite === "Family Suite" && pre.note && !pre.ro && pre.url === "?about=stay&suite=family-suite", "AC-21 enquiry prefill: dates, adults, each child's age and the suite arrive filled in and editable; only the subject and suite are in the address", JSON.stringify(pre));
    await page.fill("#enq-party", "2 adults, 2 children aged 4 and 9, one cot");
    await page.fill("#enq-message", "Could the two single beds be made up as one?");
    const requestsBefore = ctx.outside.length;
    await page.click("[data-enquiry-prepare]");
    const text = await page.textContent("[data-enquiry-text]");
    expect(/Enquiry: A stay/.test(text) && /\(4 nights\)/.test(text) && /Guests: 2 adults, 2 children aged 4 and 9, one cot/.test(text) && /Suite of interest: Family Suite/.test(text) && /single beds/.test(text), "AC-21 enquiry prefill: the message carries the dates, the edited party, the suite and the question", text.slice(0, 260));

    /* AC-22: nothing is sent, and nothing says it was */
    const box = await page.evaluate(() => { const o = document.querySelector("[data-enquiry-out]"); const f = document.querySelector("[data-enquiry]"); return { badge: (o.querySelector(".badge") || {}).textContent, to: o.textContent.replace(/\s+/g, " "), focus: document.activeElement === o, action: f.getAttribute("action"), method: f.getAttribute("method"), mail: o.querySelector("[data-enquiry-mail]").getAttribute("href").slice(0, 7) }; });
    expect(box.badge === "Not sent" && /reservation@granddiamondsuites\.com/.test(box.to) && box.focus && box.action === null && box.mail === "mailto:", "AC-22 no hidden sending: the prepared message is marked Not sent, names the address it is for, and the form has no destination", JSON.stringify({ badge: box.badge, action: box.action }));
    if (edge) {
      await page.click("[data-enquiry-copy]"); await page.waitForTimeout(250);
      const clip = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
      const status = (await page.textContent("[data-enquiry-status]")).trim();
      expect(clip === text, "AC-23 draft freshness: what is copied is exactly the message on screen");
      expect(/copied/i.test(status) && !/\b(sent|delivered|received|reserved|booked)\b/i.test(status.replace(/not (been )?sent/gi, "")), "AC-22 no hidden sending: after copying, the status says copied and nothing more", status);
    }
    /* the email button: its own handler runs, the hand-off to an email application is held back so the test stays on the page */
    await page.evaluate(() => document.querySelector("[data-enquiry-mail]").addEventListener("click", (e) => e.preventDefault()));
    await page.click("[data-enquiry-mail]"); await page.waitForTimeout(200);
    const afterMail = await page.evaluate(() => ({ status: document.querySelector("[data-enquiry-status]").textContent.trim(), shown: !document.querySelector("[data-enquiry-out]").hidden, text: document.querySelector("[data-enquiry-text]").textContent.length, to: /reservation@granddiamondsuites\.com/.test(document.querySelector("[data-enquiry-out]").textContent) }));
    expect(afterMail.shown && afterMail.text === text.length && afterMail.to && /nothing goes to the hotel until you press send there\. If no app opens, copy the message and email it to the address above\.$/.test(afterMail.status) && !/\b(has been sent|was sent|message sent|delivered|received|reserved|booked)\b/i.test(afterMail.status), "AC-26 no email app: after the email button the message and the address are still on the page, with a note on what to do if nothing atOpen", afterMail.status);
    expect(ctx.outside.length === requestsBefore, "AC-22 no hidden sending: preparing, copying and the email button make no request to any server");

    /* AC-23: any edit withdraws the prepared message */
    const hiddenAfter = async (label, edit) => {
      await page.click("[data-enquiry-prepare]");
      const shown = await page.evaluate(() => !document.querySelector("[data-enquiry-out]").hidden);
      await edit();
      await page.waitForTimeout(80);
      expect(shown && await page.evaluate(() => document.querySelector("[data-enquiry-out]").hidden), `AC-23 draft freshness: changing ${label} withdraws the prepared message`);
    };
    await hiddenAfter("the question", () => page.type("#enq-message", " Thank you."));
    await hiddenAfter("a date", () => page.fill("#enq-depart", addDays(TODAY, 35)));
    await hiddenAfter("the subject", () => page.check('input[name="intent"][value="family"]', { force: true }));
    await hiddenAfter("the suite", () => page.selectOption("#enq-suite", { index: 5 }));
    await hiddenAfter("the name", () => page.fill("#enq-name", "A Guest"));
    await page.click("[data-enquiry-prepare]");
    const again = await page.textContent("[data-enquiry-text]");
    expect(/Enquiry: A family or group/.test(again) && /\(5 nights\)/.test(again) && /Thank you\./.test(again) && /A Guest/.test(again), "AC-23 draft freshness: preparing again gives a message that matches the form as it now stands", again.slice(0, 200));

    /* AC-27: each mistake is said beside its own field */
    page = await fresh(ctx, "en/contact/");
    expect(await page.evaluate(() => document.querySelectorAll('input[name="intent"]:checked').length === 1), "AC-27 validation: a subject is always chosen");
    await page.click("[data-enquiry-prepare]");
    let v = await page.evaluate(() => ({ focus: document.activeElement.id, err: document.getElementById("enq-message-err").textContent, inv: document.getElementById("enq-message").getAttribute("aria-invalid"), by: document.getElementById("enq-message").getAttribute("aria-describedby"), role: document.getElementById("enq-message-err").getAttribute("role"), out: document.querySelector("[data-enquiry-out]").hidden }));
    expect(v.focus === "enq-message" && v.err.length > 10 && v.inv === "true" && /enq-message-err/.test(v.by) && v.role === "alert" && v.out, "AC-27 validation: an empty enquiry is refused at the question field, which is marked and described by its error", JSON.stringify(v));
    await page.fill("#enq-message", "A question"); await page.fill("#enq-email", "guest@example"); await page.fill("#enq-arrive", addDays(TODAY, 9));
    await page.click("[data-enquiry-prepare]");
    v = await page.evaluate(() => ({ focus: document.activeElement.id, email: document.getElementById("enq-email-err").textContent, emailInv: document.getElementById("enq-email").getAttribute("aria-invalid"), dep: document.getElementById("enq-depart-err").textContent, depInv: document.getElementById("enq-depart").getAttribute("aria-invalid"), arr: document.getElementById("enq-arrive-err").textContent, msg: document.getElementById("enq-message-err").textContent }));
    expect(v.focus === "enq-email" && v.email.length > 5 && v.emailInv === "true" && v.dep.length > 5 && v.depInv === "true" && v.arr === "" && v.msg === "", "AC-27 validation: a malformed email and a missing departure are each said at their own field; the first takes the keyboard", JSON.stringify(v));
    await page.fill("#enq-email", "guest@example.com"); await page.fill("#enq-depart", addDays(TODAY, 7));
    await page.click("[data-enquiry-prepare]");
    v = await page.evaluate(() => ({ focus: document.activeElement.id, dep: document.getElementById("enq-depart-err").textContent, email: document.getElementById("enq-email-err").textContent, emailInv: document.getElementById("enq-email").getAttribute("aria-invalid") }));
    expect(v.focus === "enq-depart" && v.dep.length > 5 && v.email === "" && v.emailInv === null, "AC-27 validation: a departure before arrival is refused at the departure field, and the corrected email is cleared of its error", JSON.stringify(v));

    /* AC-24: a long message, in English and in Thai */
    for (const [lang, words] of [["en", "Please tell me about long stays, laundry, the kitchenette, parking and the quietest floor. "], ["th", "ขอสอบถามรายละเอียดห้องพักสำหรับครอบครัวที่เดินทางพร้อมผู้สูงอายุและเด็กเล็ก "]]) {
      page = await fresh(ctx, lang + "/contact/");
      const long = words.repeat(lang === "en" ? 24 : 7).trim();
      await page.fill("#enq-message", long);
      await page.click("[data-enquiry-prepare]");
      const l = await page.evaluate(() => ({ note: !document.querySelector("[data-enquiry-long]").hidden && document.querySelector("[data-enquiry-long]").getClientRects().length > 0, noteText: document.querySelector("[data-enquiry-long]").textContent.trim(), mail: document.querySelector("[data-enquiry-mail]").getAttribute("href"), text: document.querySelector("[data-enquiry-text]").textContent, status: document.querySelector("[data-enquiry-status]").textContent }));
      expect(l.note && l.noteText.length > 20 && !l.mail.includes("body=") && l.mail.length < 400 && l.status === "", `AC-24 long message (${lang}): the warning shows before anything is pressed, and the email link carries the subject only`, l.noteText.slice(0, 120));
      expect(l.text.includes(long), `AC-24 long message (${lang}): the whole message is still shown for copying`);
      if (edge) { await page.click("[data-enquiry-copy]"); await page.waitForTimeout(200); expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n") === l.text, `AC-24 long message (${lang}): the copy holds the whole message`); }
    }

    /* AC-28: nothing typed leaves the form */
    page = await fresh(ctx, "en/contact/?about=access");
    const seen = []; page.on("request", (r) => seen.push(r.url()));
    await page.fill("#enq-name", "Zebedee Quillfeather"); await page.fill("#enq-email", "zq@example.org"); await page.fill("#enq-phone", "0812345678"); await page.fill("#enq-message", "Step-free access, please: marmalade");
    await page.click("[data-enquiry-prepare]"); await page.waitForTimeout(200);
    const priv = await page.evaluate(() => { const dump = (s) => { try { return Object.keys(s).map((k) => k + "=" + s.getItem(k)).join(" "); } catch (e) { return ""; } }; return { url: location.href, session: dump(sessionStorage), local: dump(localStorage), cookie: document.cookie, title: document.title }; });
    const secret = /Zebedee|Quillfeather|zq@example|0812345678|marmalade/;
    expect(!secret.test(priv.url) && !secret.test(priv.session) && !secret.test(priv.local) && priv.cookie === "" && !seen.some((u) => secret.test(decodeURIComponent(u))), "AC-28 private draft: the name, email, telephone and question are in no address, no stored value, no cookie and no request", JSON.stringify(priv).slice(0, 200));
    await page.reload({ waitUntil: "load" });
    expect(await page.evaluate(() => ["enq-name", "enq-email", "enq-phone", "enq-message"].every((i) => document.getElementById(i).value === "")), "AC-28 private draft: a reload brings none of it back");
    expect(errs.length === 0, "AC-21 to AC-28 enquiry: no script error", errs.join(" | "));
    await ctx.close();

    /* AC-25: the clipboard refuses */
    const deny = await newContext(desk);
    await deny.addInitScript(() => { try { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) } }); } catch (e) {} });
    const p2 = await fresh(deny, "en/contact/");
    await p2.fill("#enq-message", "A question about breakfast");
    await p2.click("[data-enquiry-prepare]");
    await p2.click("[data-enquiry-copy]"); await p2.waitForTimeout(250);
    const d = await p2.evaluate(() => { const s = document.querySelector("[data-enquiry-status]"); return { cls: s.className, text: s.textContent.trim(), sel: String(getSelection()), pre: document.querySelector("[data-enquiry-text]").textContent, shown: !document.querySelector("[data-enquiry-out]").hidden }; });
    expect(/is-error/.test(d.cls) && d.text.length > 15 && d.shown && d.sel.replace(/\s+/g, " ").trim() === d.pre.replace(/\s+/g, " ").trim(), "AC-25 clipboard refused: the status says the copy did not happen, and the message is selected ready to copy by hand", d.text);
    await deny.close();
  });

  /* ---------- AC-29 to AC-34: finding and comparing suites ---------- */
  await block("AC-29 and AC-30 suites", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/suites/");
    const cards = await page.evaluate(() => [...document.querySelectorAll(".card")].filter((c) => c.querySelector(".card__title a")).map((c) => ({ name: c.querySelector(".card__title").textContent.trim(), href: c.querySelector(".card__title a").getAttribute("href"), facts: [...c.querySelectorAll(".card__facts li")].map((l) => l.textContent.trim()), compare: !!c.querySelector('a[href*="compare/"]'), line: (c.querySelector(".card__line") || {}).textContent || "" })));
    expect(cards.length === 6 && cards.every((c) => /\d\ssq\sm/.test(c.facts[0]) && c.facts.some((f) => /king|twin|single|bed/i.test(f)) && c.facts.some((f) => /guests/.test(f)) && c.compare && c.line.length > 10), "AC-29 six suites: each of the six cards gives size, beds, guests, a line on what sets it apart and a way to compare", JSON.stringify(cards.map((c) => c.name + ": " + c.facts.join(" / "))));
    expect(cards.filter((c) => c.facts.some((f) => /bathroom/.test(f))).length >= 4, "AC-29 six suites: bathrooms are counted on every card where the hotel publishes a count", String(cards.filter((c) => c.facts.some((f) => /bathroom/.test(f))).length));
    await page.goto(BASE + "en/suites/compare/", { waitUntil: "load" });
    const table = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".compare tbody tr")].map((tr) => ({ label: tr.querySelector("th").textContent.trim(), cells: [...tr.querySelectorAll("td")].map((td) => td.textContent.replace(/\s+/g, " ").trim()) }));
      return { cols: [...document.querySelectorAll(".compare thead th[data-col]")].map((t) => t.textContent.replace(/\s+/g, " ").trim()), rows, legend: document.querySelector(".compare-legend, .legend") ? document.querySelector(".compare-legend, .legend").textContent : document.querySelector("main").textContent };
    });
    expect(table.cols.length === 6 && ["Area", "Bedrooms", "Beds", "Bathrooms", "Living space", "Kitchenette", "Outdoor space", "Guests"].every((l) => table.rows.some((r) => r.label === l)), "AC-29 six suites: the comparison sets all six side by side on area, bedrooms, beds, bathrooms, living space, kitchenette, outdoor space and guests", table.rows.map((r) => r.label).join());
    const kitchen = table.rows.find((r) => r.label === "Kitchenette").cells, outdoor = table.rows.find((r) => r.label === "Outdoor space").cells;
    expect(kitchen.slice(0, 3).every((c) => /^Not listed/.test(c)) && outdoor.slice(0, 4).every((c) => /^Not listed/.test(c)), "AC-30 unknowns: a kitchenette or outdoor space the hotel does not list reads Not listed", kitchen.join(" | "));
    expect(table.rows.every((r) => r.cells.every((c) => c.length > 0 && !/^(no|none|n\/a|-|free|yes)$/i.test(c))), "AC-30 unknowns: no cell is blank, a bare yes or no, or free");
    expect(/“Not listed” means the hotel has not published this detail\. It does not mean the suite lacks it\./.test(table.legend.replace(/"/g, "“").replace(/“([^“]*)“/g, "“$1”")) || /Not listed.{1,3} means the hotel has not published this detail\. It does not mean the suite lacks it\./.test(table.legend), "AC-30 unknowns: the table says what Not listed means");
    await page.goto(BASE + "en/facilities/", { waitUntil: "load" });
    const access = (await page.textContent("main")).replace(/\s+/g, " ");
    expect(!/wheelchair accessible|fully accessible|accessible rooms? (is|are) available/i.test(access), "AC-30 unknowns: no accessibility assurance is made that the hotel has not published");
    await ctx.close();
  });

  await block("AC-31 to AC-34 comparison", async () => {
    const ctx = await newContext(phoneOpts);
    const page = await fresh(ctx, "en/suites/compare/?a=family-suite&b=penthouse-suite");
    const errs = []; watch(page, errs);
    const cols = () => page.evaluate(() => [...document.querySelectorAll(".compare thead th[data-col]")].filter((t) => getComputedStyle(t).display !== "none").map((t) => t.getAttribute("data-col")).join());
    await page.selectOption("[data-pick-a]", "penthouse-suite");
    const s = await page.evaluate(() => ({ a: document.querySelector("[data-pick-a]").value, b: document.querySelector("[data-pick-b]").value, status: document.querySelector("[data-compare-status]").textContent.trim(), role: document.querySelector("[data-compare-status]").getAttribute("role"), url: location.search }));
    expect(s.a === "penthouse-suite" && s.b === "family-suite" && (await cols()) === "family-suite,penthouse-suite", "AC-31 same suite twice: choosing the suite the other control holds swaps the two; neither choice is lost", JSON.stringify(s));
    expect(s.status === "Penthouse Suite was already the other choice, so the two have swapped places. Comparing Penthouse Suite with Family Suite." && s.role === "status", "AC-31 same suite twice: the swap and the resulting pair are announced", s.status);
    expect(s.url === "?a=penthouse-suite&b=family-suite", "AC-31 same suite twice: the address follows", s.url);
    await page.selectOption("[data-pick-b]", "deluxe-suite");
    expect((await page.textContent("[data-compare-status]")).trim() === "Comparing Penthouse Suite with Deluxe Suite.", "AC-31 same suite twice: an ordinary change announces the new pair", await page.textContent("[data-compare-status]"));

    await page.reload({ waitUntil: "load" });
    expect((await cols()) === "deluxe-suite,penthouse-suite" && (await page.inputValue("[data-pick-a]")) === "penthouse-suite", "AC-32 comparison address: the pair survives a reload");
    await page.click(".header-tools [data-lang-switch]"); await page.waitForLoadState("load");
    expect(/th\/suites\/compare\/\?a=penthouse-suite&b=deluxe-suite/.test(page.url()) && (await cols()) === "deluxe-suite,penthouse-suite", "AC-32 comparison address: the pair survives the switch to Thai", page.url());
    for (const [q, want] of [["?a=nonsense&b=%3Cscript%3Ealert(1)%3C/script%3E", "junior-suite,luxury-suite"], ["?a=penthouse-suite&b=penthouse-suite", "junior-suite,penthouse-suite"], ["?a=&b=", "junior-suite,luxury-suite"], ["?b=family-suite", "junior-suite,family-suite"]]) {
      const p2 = await ctx.newPage(); const e2 = []; watch(p2, e2);
      await p2.goto(BASE + "en/suites/compare/" + q, { waitUntil: "load" });
      const got = await p2.evaluate(() => [...document.querySelectorAll(".compare thead th[data-col]")].filter((t) => getComputedStyle(t).display !== "none").map((t) => t.getAttribute("data-col")).join());
      expect(got === want && e2.length === 0 && await p2.evaluate(() => !document.querySelector("main script") && document.querySelector("[data-pick-a]").value !== document.querySelector("[data-pick-b]").value), `AC-32 comparison address: ${q} settles on two different real suites`, got + " " + e2.join(" "));
      await p2.close();
    }

    for (const [w, h] of [[320, 568], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(BASE + "th/suites/compare/?a=luxury-suite&b=penthouse-suite", { waitUntil: "load" });
      const t = await page.evaluate(() => {
        const box = document.querySelector(".table-scroll"), heads = [...document.querySelectorAll(".compare thead th[data-col]")].filter((x) => getComputedStyle(x).display !== "none");
        const rowHeads = [...document.querySelectorAll(".compare tbody th")];
        return { doc: document.documentElement.scrollWidth <= innerWidth, heads: heads.map((x) => x.textContent.trim()), scope: heads.every((x) => x.getAttribute("scope") === "col") && rowHeads.every((x) => x.getAttribute("scope") === "row"), inner: box.scrollWidth - box.clientWidth, tab: box.tabIndex, role: box.getAttribute("role"), label: box.getAttribute("aria-label"), caption: !!document.querySelector(".compare caption") || !!document.querySelector(".compare").getAttribute("aria-labelledby") || !!document.querySelector(".compare").getAttribute("aria-label") };
      });
      expect(t.doc && t.heads.length === 2 && t.heads.every((x) => x.length > 3) && t.scope && t.caption, `AC-33 phone table: at ${w} wide two named columns with proper header cells, and the page does not scroll sideways`, JSON.stringify(t));
      expect(t.inner <= 4 ? t.tab === -1 : (t.tab === 0 && t.role === "region" && !!t.label), `AC-33 phone table: at ${w} wide the table ${t.inner <= 4 ? "fits without inner scrolling" : "scrolls in a box the keyboard can reach"}`, JSON.stringify(t));
    }
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(BASE + "en/suites/compare/?a=junior-suite&b=family-suite", { waitUntil: "load" });
    const rowsShown = () => page.evaluate(() => [...document.querySelectorAll(".compare tbody tr")].filter((tr) => !tr.hidden).map((tr) => tr.querySelector("th").textContent.trim()));
    const all = await rowsShown();
    await page.click("[data-diff]");
    const diff = await rowsShown();
    const d = await page.evaluate(() => ({ pressed: document.querySelector("[data-diff]").getAttribute("aria-pressed"), note: document.querySelector("[data-diff-note]").textContent.trim(), flags: [...document.querySelectorAll(".compare tbody tr")].filter((tr) => !tr.hidden).reduce((n, tr) => n + [...tr.querySelectorAll("td small.flag")].filter((f) => getComputedStyle(f.closest("td")).display !== "none").length, 0), hiddenFlags: [...document.querySelectorAll(".compare tbody tr")].filter((tr) => tr.hidden).reduce((n, tr) => n + [...tr.querySelectorAll("td small.flag")].filter((f) => f.closest("td").classList.contains("is-shown")).length, 0) }));
    expect(d.pressed === "true" && diff.length < all.length && !diff.includes("Area") && diff.includes("Beds") && /^\d+ rows? that reads? the same for both suites (is|are) hidden\.$/.test(d.note), "AC-34 differences only: rows that read the same for the two suites fold away, and the count is said", d.note + " / " + diff.join());
    expect(d.flags >= 2 && d.hiddenFlags === 0, "AC-34 differences only: no row carrying a note to check with the hotel is hidden", JSON.stringify(d));
    await page.click("[data-diff]");
    expect((await rowsShown()).join() === all.join() && (await page.getAttribute("[data-diff]", "aria-pressed")) === "false" && (await page.textContent("[data-diff-note]")).trim() === "", "AC-34 differences only: pressing again brings the whole table back");
    expect(errs.length === 0, "AC-31 to AC-34 comparison: no script error", errs.join(" | "));
    await ctx.close();
  });

  /* ---------- AC-35 to AC-38: gallery and viewer ---------- */
  await block("AC-35 and AC-36 gallery and viewer", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/gallery/");
    const chips = await page.evaluate(() => [...document.querySelectorAll("[data-gallery] [data-filter]")].map((c) => c.getAttribute("data-filter")));
    /* a room photograph names its suite and links to it; on that suite's own page the link is not offered */
    await page.click('[data-gallery] [data-filter="suites"]');
    await page.click(".gallery .shot:not(.is-hidden) .zoomable");
    const there = await page.evaluate(() => { const l = document.querySelector("#viewer [data-link]"); return { shown: !l.hidden && l.getClientRects().length > 0, href: l.getAttribute("href") || "", text: l.textContent.trim(), cap: document.querySelector("#viewer [data-cap]").textContent }; });
    await page.keyboard.press("Escape");
    const own = await ctx.newPage();
    await own.goto(BASE + "en/suites/junior-suite/", { waitUntil: "load" });
    await own.click(".mosaic__main .zoomable");
    const here = await own.evaluate(() => { const l = document.querySelector("#viewer [data-link]"); return { shown: !l.hidden && l.getClientRects().length > 0, cap: document.querySelector("#viewer [data-cap]").textContent }; });
    await own.close();
    expect(there.shown && /suites\/junior-suite\/$/.test(there.href) && there.text === "See this suite" && /^Junior Suite\. /.test(there.cap), "AC-36 viewer: in the gallery a room photograph names its suite and offers See this suite", JSON.stringify(there));
    expect(!here.shown && /^Junior Suite\. /.test(here.cap), "AC-36 viewer: on the suite's own page the photograph is named and the link to the same page is left out", JSON.stringify(here));
    let agree = true; const detail = [];
    for (const k of chips) {
      await page.click(`[data-gallery] [data-filter="${k}"]`);
      const g = await page.evaluate(() => ({ count: document.querySelector("[data-gallery] [data-count]").textContent.trim(), shown: [...document.querySelectorAll(".gallery .shot")].filter((s) => !s.classList.contains("is-hidden") && s.getClientRects().length > 0).length }));
      await page.click(".gallery .shot:not(.is-hidden) .zoomable");
      const v = (await page.textContent("#viewer [data-count]")).trim();
      await page.keyboard.press("Escape");
      if (g.count !== `${g.shown} photographs` || v !== `Photograph 1 of ${g.shown}`) agree = false;
      detail.push(`${k}: ${g.count}, ${g.shown} shown, ${v}`);
    }
    expect(agree && chips.length >= 4, "AC-35 gallery filter: for every category the count, the photographs on show and the viewer's sequence agree", detail.join(" | "));
    await page.click('[data-gallery] [data-filter="suites"]').catch(() => page.click(`[data-gallery] [data-filter="${chips[1]}"]`));
    const fifth = page.locator(".gallery .shot:not(.is-hidden) .zoomable").nth(4);
    await fifth.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    const y0 = await page.evaluate(() => scrollY);
    await fifth.click();
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    const back = await page.evaluate(() => ({ y: scrollY, pressed: [...document.querySelectorAll("[data-gallery] [data-filter]")].filter((c) => c.getAttribute("aria-pressed") === "true").length, q: location.search, focus: document.activeElement.classList.contains("zoomable") }));
    expect(Math.abs(back.y - y0) <= 2 && back.pressed === 1 && /filter=/.test(back.q), "AC-35 gallery filter: closing the viewer leaves the filter and the scroll position as they were", JSON.stringify(back) + " from " + y0);
    expect(back.focus && await page.evaluate((el) => document.activeElement === el, await fifth.elementHandle()), "AC-36 viewer: focus returns to the photograph that opened it, not to the one last viewed");
    await fifth.click();
    expect(await page.evaluate(() => { const v = document.getElementById("viewer"); return v.open && v.contains(document.activeElement); }), "AC-36 viewer: the keyboard is inside the viewer when it opens");
    const c0 = (await page.textContent("#viewer [data-count]")).trim();
    await page.keyboard.press("ArrowLeft");
    const c1 = (await page.textContent("#viewer [data-count]")).trim();
    await page.click("#viewer [data-next]");
    expect(c0 === "Photograph 5 of " + c0.split(" of ")[1] && c1.startsWith("Photograph 4 of") && (await page.textContent("#viewer [data-count]")).trim() === c0, "AC-36 viewer: the arrow keys and the on-screen arrows both move through the photographs", c0 + " / " + c1);
    await page.click("#viewer [data-close]"); await page.waitForTimeout(200);
    expect(await page.evaluate(() => !document.getElementById("viewer").open) && await page.evaluate((el) => document.activeElement === el, await fifth.elementHandle()), "AC-36 viewer: the Close button closes it and returns focus");
    await ctx.close();

    if (edge) {
      const phone = await newContext(phoneOpts);
      const p2 = await fresh(phone, "en/suites/penthouse-suite/");
      await p2.tap(".mosaic__main .zoomable");
      const swipe = (from, to) => p2.evaluate(([x0, x1]) => { const v = document.getElementById("viewer"); const mk = (x) => new Touch({ identifier: 1, target: v, clientX: x, clientY: 320 }); v.dispatchEvent(new TouchEvent("touchstart", { touches: [mk(x0)], changedTouches: [mk(x0)], bubbles: true })); v.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [mk(x1)], bubbles: true })); }, [from, to]);
      await swipe(300, 110);
      const s1 = (await p2.textContent("#viewer [data-count]")).trim();
      await swipe(110, 300);
      const s2 = (await p2.textContent("#viewer [data-count]")).trim();
      await swipe(200, 220);
      expect(s1 === "Photograph 2 of 6" && s2 === "Photograph 1 of 6" && (await p2.textContent("#viewer [data-count]")).trim() === "Photograph 1 of 6", "AC-36 viewer: a swipe left or right moves one photograph, and a small movement does nothing (touch events made by the test, not a finger)", s1 + " / " + s2);
      const close = await p2.evaluate(() => { const b = document.querySelector("#viewer [data-close]").getBoundingClientRect(); return Math.min(b.width, b.height); });
      expect(close >= 44, "AC-36 viewer: the Close button is at least 44 across on a phone", String(close));
      await phone.close();
    }
  });

  await block("AC-37 and AC-38 photographs that fail or arrive late", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/suites/penthouse-suite/");
    const errs = []; watch(page, errs);
    const order = await page.evaluate(() => { const V = JSON.parse(document.getElementById("boot").textContent).viewer; const ids = []; document.querySelectorAll('[data-viewer]').forEach((x) => { const id = x.getAttribute("data-id"); if (V[id] && ids.indexOf(id) < 0) ids.push(id); }); return ids.map((id) => ({ id, f: V[id].f, alt: V[id].alt })); });
    const second = order[1], third = order[2];
    let blocked = true;
    await page.route("**/media/" + second.f + "-*", (r) => (blocked ? r.abort() : r.continue()));
    await page.click(".mosaic__main .zoomable");
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(500);
    const f1 = await page.evaluate(() => { const v = document.getElementById("viewer"), f = v.querySelector("[data-fail]"); return { failed: v.classList.contains("is-failed"), shown: !f.hidden && f.getClientRects().length > 0, text: f.textContent.replace(/\s+/g, " ").trim(), retry: !!f.querySelector("[data-retry]"), file: (f.querySelector("a[data-file]") || {}).href || "", count: v.querySelector("[data-count]").textContent.trim(), imgHidden: getComputedStyle(v.querySelector("[data-img]")).visibility === "hidden", cap: v.querySelector("[data-cap]").textContent.trim().length }; });
    expect(f1.failed && f1.shown && /This photograph could not be loaded\./.test(f1.text) && f1.retry && f1.file.includes(second.f) && f1.imgHidden, "AC-37 failed photograph: the viewer says the photograph could not be loaded and offers Try again and the image file", JSON.stringify(f1));
    expect(f1.count === "Photograph 2 of 6" && f1.cap > 5, "AC-37 failed photograph: the caption and the count still say which photograph it is", f1.count);
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(600);
    const f2 = await page.evaluate(() => { const v = document.getElementById("viewer"), i = v.querySelector("[data-img]"); return { failed: v.classList.contains("is-failed"), fail: v.querySelector("[data-fail]").hidden, ok: i.complete && i.naturalWidth > 0, src: i.currentSrc, count: v.querySelector("[data-count]").textContent.trim() }; });
    expect(!f2.failed && f2.fail && f2.ok && f2.src.includes(third.f) && f2.count === "Photograph 3 of 6", "AC-37 failed photograph: the arrows still work and the next photograph shows normally", JSON.stringify(f2));
    await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(500);
    blocked = false;
    await page.click("#viewer [data-retry]"); await page.waitForTimeout(900);
    const f3 = await page.evaluate(() => { const v = document.getElementById("viewer"), i = v.querySelector("[data-img]"); return { failed: v.classList.contains("is-failed"), ok: i.complete && i.naturalWidth > 0, src: i.currentSrc }; });
    expect(!f3.failed && f3.ok && f3.src.includes(second.f), "AC-37 failed photograph: Try again loads it once it can be reached", JSON.stringify(f3));
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => !document.getElementById("viewer").open), "AC-37 failed photograph: Escape still closes the viewer");

    /* a slow photograph must not land under a later one's caption */
    await page.unroute("**/media/" + second.f + "-*");
    await page.route("**/media/" + second.f + "-*", async (r) => { await new Promise((done) => setTimeout(done, 1500)); await r.continue().catch(() => {}); });
    await page.click(".mosaic__main .zoomable");
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(2600);
    const r1 = await page.evaluate(() => { const v = document.getElementById("viewer"), i = v.querySelector("[data-img]"); return { src: i.currentSrc, alt: i.alt, count: v.querySelector("[data-count]").textContent.trim(), busy: v.classList.contains("is-loading") || v.classList.contains("is-failed") }; });
    expect(r1.src.includes(third.f) && r1.alt === third.alt && r1.count === "Photograph 3 of 6" && !r1.busy, "AC-38 quick switching: in the viewer, a slow second photograph does not replace the third once the visitor has moved on", JSON.stringify(r1));
    await page.keyboard.press("Escape");

    await page.goto(BASE + "en/suites/", { waitUntil: "load" });
    const thumbs = await page.evaluate(() => { const V = JSON.parse(document.getElementById("boot").textContent).viewer; return [...document.querySelectorAll("#f-junior-suite [data-thumb]")].map((t) => { const m = V[t.getAttribute("data-id")]; return { f: m.f, cap: m.capShort || m.cap, alt: m.alt }; }); });
    await page.route("**/media/" + thumbs[1].f + "-*", async (r) => { await new Promise((done) => setTimeout(done, 1500)); await r.continue().catch(() => {}); });
    await page.click("#f-junior-suite .thumb:nth-child(2)");
    await page.click("#f-junior-suite .thumb:nth-child(3)");
    await page.waitForTimeout(2600);
    const r2 = await page.evaluate(() => { const p = document.getElementById("f-junior-suite"), i = p.querySelector(".stage__frame img"); return { src: i.currentSrc, alt: i.alt, cap: p.querySelector("[data-stage-cap]").textContent.trim(), count: p.querySelector("[data-stage-count]").textContent.trim(), current: [...p.querySelectorAll("[data-thumb]")].findIndex((t) => t.getAttribute("aria-current") === "true"), busy: p.querySelector("[data-stage]").classList.contains("is-loading") }; });
    expect(r2.src.includes(thumbs[2].f) && r2.alt === thumbs[2].alt && r2.cap === thumbs[2].cap && /3 of/.test(r2.count) && r2.current === 2 && !r2.busy, "AC-38 quick switching: in the suite selector, the photograph, its description, the caption, the count and the marked thumbnail all belong to the last one chosen", JSON.stringify(r2));
    /* a thumbnail whose photograph cannot be fetched */
    await page.route("**/media/" + thumbs[3].f + "-*", (r) => r.abort());
    await page.click("#f-junior-suite .thumb:nth-child(4)"); await page.waitForTimeout(700);
    const r3 = await page.evaluate(() => { const p = document.getElementById("f-junior-suite"); return { cap: p.querySelector("[data-stage-cap]").textContent.trim(), busy: p.querySelector("[data-stage]").classList.contains("is-loading") }; });
    await page.click("#f-junior-suite .thumb:nth-child(1)"); await page.waitForTimeout(700);
    const r4 = await page.evaluate(() => { const p = document.getElementById("f-junior-suite"), i = p.querySelector(".stage__frame img"); return { ok: i.complete && i.naturalWidth > 0, cap: p.querySelector("[data-stage-cap]").textContent.trim() }; });
    expect(r3.cap === "This photograph could not be loaded." && !r3.busy && r4.ok && r4.cap === thumbs[0].cap, "AC-37 failed photograph: in the suite selector a photograph that cannot be fetched says so, and the other thumbnails still work", JSON.stringify([r3, r4]));
    const real = errs.filter((x) => !/media\//.test(x));
    expect(real.length === 0, "AC-37 and AC-38: no script error while photographs fail or arrive late", real.join(" | "));
    await ctx.close();
  });

  /* ---------- AC-39 and AC-40: location ---------- */
  await block("AC-39 and AC-40 location", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/location/");
    let agree = true; const seen = [];
    for (const k of ["all", "shopping", "transport", "culture", "all"]) {
      await page.click(`[data-explorer] [data-filter="${k}"]`);
      const s = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".place")].filter((p) => !p.hidden).map((p) => p.getAttribute("data-place")).sort().join(), pins: [...document.querySelectorAll(".pin[data-pin]")].filter((p) => !p.classList.contains("is-dim") && p.tagName === "BUTTON").map((p) => p.getAttribute("data-pin")).sort().join(), count: document.querySelector("[data-explorer] [data-count]").textContent.trim(), pressed: [...document.querySelectorAll("[data-explorer] [data-filter]")].filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.getAttribute("data-filter")).join() }));
      const n = s.rows ? s.rows.split(",").length : 0;
      if (s.rows !== s.pins || s.count !== `${n} shown` || s.pressed !== k) agree = false;
      seen.push(`${k}: ${n} rows, ${s.count}`);
    }
    expect(agree, "AC-39 location filter: for every filter the list, the lit pins, the count and the pressed chip agree", seen.join(" | "));
    await page.click('.pin[data-pin="mbk"]').catch(() => {});
    const open = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.place__btn[aria-expanded="true"]')].map((b) => b.closest(".place").getAttribute("data-place")).join(), pins: [...document.querySelectorAll('.pin[aria-pressed="true"]')].map((p) => p.getAttribute("data-pin")).join() }));
    expect(open.rows === open.pins && open.rows.split(",").length === 1, "AC-39 location filter: the open list row and the pressed pin are always the same place", JSON.stringify(open));
    const text = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".place")].every((p) => p.querySelector(".place__name").textContent.trim().length > 2 && /about|m\b|km/.test(p.querySelector(".place__dist").textContent) && !!p.querySelector('.place__more a[href*="google.com/maps/dir"]')), n: document.querySelectorAll(".place").length }));
    expect(text.rows && text.n === 12, "AC-39 location filter: every place is a line of text with its distance and a directions link, so the list works without the map");

    const arr = await page.evaluate(() => { const main = document.querySelector("main"); const t = main.textContent.replace(/\s+/g, " "); const card = document.querySelector(".taxi-card"); return { thName: (card.querySelector('[lang="th"]') || {}).textContent || "", copy: card.querySelector("[data-copy]").getAttribute("data-copy"), entrance: [...main.querySelectorAll("img")].some((i) => /entrance/i.test(i.alt)), hotelPin: !!document.querySelector(".pin--hotel"), straight: /Distances are straight lines, rounded, and a walking route is always longer\./.test(t), own: /Where the hotel gives a walking time, it is shown as the hotel's own\./.test(t), walks: (t.match(/[^.]*\bminutes?'? walk[^.]*\./gi) || []).concat(t.match(/[^.]*\bminute walk[^.]*\./gi) || []), maps: [...main.querySelectorAll('a[href*="google.com/maps"]')].every((x) => /13\.7504126/.test(decodeURIComponent(x.href)) || /Grand\+Diamond|Grand%20Diamond|query=/.test(x.href)) }; });
    expect(/[฀-๿]{6,}/.test(arr.thName) && /[฀-๿]{10,}/.test(arr.copy) && /10400/.test(arr.copy), "AC-40 arrival: the card for a driver gives the hotel's name and address in Thai, and the copy button holds both", arr.copy);
    expect(arr.entrance && arr.hotelPin, "AC-40 arrival: the entrance photograph and the hotel's pin are on the page");
    expect(arr.straight && arr.own && arr.walks.every((w) => /The hotel says:/.test(w) || /hotel's own|walking route is always longer/.test(w)), "AC-40 arrival: distances are labelled as straight lines, and every walking time on the page is quoted as the hotel's own words", arr.walks.join(" | ").slice(0, 300));
    await page.goto(BASE + "th/location/", { waitUntil: "load" });
    expect(await page.evaluate(() => { const c = document.querySelector(".taxi-card"); return /[฀-๿]{6,}/.test(c.textContent) && c.querySelector("[data-copy]").getAttribute("data-copy").length > 20; }), "AC-40 arrival: the same card is on the Thai page");
    await ctx.close();
  });

  /* ---------- AC-42 to AC-44: language ---------- */
  await block("AC-42 to AC-44 language", async () => {
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/gallery/?filter=dining");
    await page.click(".header-tools [data-lang-switch]"); await page.waitForLoadState("load");
    expect(page.url() === BASE + "th/gallery/?filter=dining" && await page.evaluate(() => document.querySelector('[data-filter="dining"]').getAttribute("aria-pressed") === "true"), "AC-42 language: the gallery keeps its page and its filter", page.url());
    await page.goto(BASE + "th/faq/#q-parking", { waitUntil: "load" });
    await page.click(".header-tools [data-lang-switch]"); await page.waitForLoadState("load");
    expect(page.url() === BASE + "en/faq/#q-parking" && await page.evaluate(() => document.getElementById("q-parking").open), "AC-42 language: a question stays open on the same question in the other language", page.url());
    let pairs = true; const off = [];
    for (const route of routes.filter((r) => r.startsWith("en/"))) {
      await page.goto(BASE + route, { waitUntil: "load" });
      const alt = await page.evaluate(() => document.querySelector(".header-tools [data-lang-switch]").href);
      if (alt !== BASE + "th/" + route.slice(3)) { pairs = false; off.push(route + " -> " + alt); }
    }
    expect(pairs, "AC-42 language: on all 18 English pages the switch leads to the same page in Thai, never to the home page", off.slice(0, 3).join(" | "));

    /* a typed enquiry is not carried over (it is never stored), so the visitor is asked first */
    await page.goto(BASE + "en/contact/", { waitUntil: "load" });
    await page.fill("#enq-message", "Half a question");
    let asked = ""; page.once("dialog", (d) => { asked = d.message(); d.dismiss(); });
    await page.click(".header-tools [data-lang-switch]"); await page.waitForTimeout(400);
    expect(asked.length > 20 && page.url() === BASE + "en/contact/" && (await page.inputValue("#enq-message")) === "Half a question", "AC-42 language: with an enquiry half typed, the switch asks before leaving, and staying keeps the text", asked);

    /* AC-43: the Thai interface reads as Thai, including what only a screen reader hears */
    await page.goto(BASE + "th/", { waitUntil: "load" });
    const hp = plannerAt(page, "#plan", "hp");
    const msgs = [];
    await page.fill(hp.in, addDays(TODAY, 4)); await page.click(hp.go); await closePopups(ctx, page); msgs.push(await hp.msg());
    await page.fill(hp.out, addDays(TODAY, 2)); await page.click(hp.go); await closePopups(ctx, page); msgs.push(await hp.msg());
    await page.fill(hp.out, addDays(TODAY, 50)); msgs.push(await hp.msg()); msgs.push((await page.textContent("#plan [data-recover]")).replace(/\s+/g, " ").trim());
    await page.click(hp.clear); msgs.push(await hp.msg());
    await page.selectOption(hp.ad, "8"); await page.selectOption(hp.ch, "1"); msgs.push(await hp.msg());
    await page.selectOption(hp.ad, "2"); await page.click(hp.go); await closePopups(ctx, page); msgs.push(await hp.msg());
    expect(msgs.every((m) => /[฀-๿]{4,}/.test(m) && !/[A-Za-z]{3,}/.test(m)), "AC-43 translation: every planner message, limit and recovery text on the Thai page is in Thai, with no English left in", msgs.map((m) => m.slice(0, 40)).join(" | "));
    let named = true; const stray = [];
    for (const route of ["th/", "th/suites/luxury-suite/", "th/suites/compare/", "th/location/", "th/gallery/", "th/contact/", "th/offers/", "th/dining/"]) {
      await page.goto(BASE + route, { waitUntil: "load" });
      const names = await page.evaluate(() => { const out = []; document.querySelectorAll("[aria-label], [title], img[alt], [placeholder]").forEach((el) => { ["aria-label", "title", "alt", "placeholder"].forEach((a) => { const v = el.getAttribute(a); if (v && v.trim()) out.push(v.trim()); }); }); return [...new Set(out)]; });
      for (const n of names) if (!/[฀-๿]/.test(n) && !/^(English|EN|LINE|Facebook|Instagram|TikTok|YouTube|Grand Diamond Suites Hotel|O2 Design Studio|Google Maps)\b/.test(n)) { named = false; stray.push(route + ": " + n); }
    }
    expect(named, "AC-43 translation: on the Thai pages every accessible name, tooltip and photograph description is in Thai (brand names apart)", stray.slice(0, 4).join(" | "));
    note("AC-43", "The build also refuses to finish if either language is missing a page, a string or a placeholder.");

    /* AC-44: Thai dates use Thai month names and the Gregorian year, the same year the link carries */
    await page.goto(BASE + "th/", { waitUntil: "load" });
    await page.click(hp.clear).catch(() => {});
    await page.selectOption(hp.ch, "0");
    const y = +TODAY.slice(0, 4) + 1;
    await page.fill(hp.in, `${y}-03-28`); await page.fill(hp.out, `${y}-04-02`);
    const th = { dates: await hp.dates(), href: await hp.href(), live: (await page.textContent("#plan [data-live]")).trim() };
    expect(th.dates === `28 มีนาคม ถึง 2 เมษายน ${y} (5 คืน)` && th.href === `${BOOK_TH}?date=${y}-03-28&nights=5&adults=2`, "AC-44 Thai dates: the summary gives Thai month names and the same year as the plain ISO date in the link", JSON.stringify(th));
    expect(th.live.includes(`28 มีนาคม ${y}`) && th.live.includes(`2 เมษายน ${y}`) && !/25[67]\d/.test(th.live + th.dates), "AC-44 Thai dates: the spoken summary uses the same convention, and no unmarked Buddhist-era year appears", th.live);
    const stamp = await page.evaluate(() => document.querySelector("footer").textContent.replace(/\s+/g, " "));
    expect(/\d{1,2} [\u0E00-\u0E7F.]+ 20\d\d/.test(stamp) && !/25[67]\d/.test(stamp), "AC-44 Thai dates: the footer's checked-on date follows the same convention", stamp.slice(0, 160));
    note("AC-44", "Thai pages give Thai month names with the Gregorian year throughout, and the build stops if a Buddhist-era year appears without being marked as one. The hotel's Thai booking page, when it was read on 12 October 2026, showed the chosen dates as day and month with no year, so the two cannot disagree. Whether the hotel would prefer Buddhist-era years is a question for it.");
    await ctx.close();
  });

  /* ---------- AC-45 and AC-46: keyboard ---------- */
  if (edge) await block("AC-45 and AC-46 keyboard", async () => {
    /* Edge only: Safari's engine keeps links out of the Tab order unless the visitor changes a setting */
    const ctx = await newContext(desk);
    let page = await fresh(ctx, "en/");
    const errs = []; watch(page, errs);
    /* planner */
    await page.focus("#hp-in");
    await page.keyboard.type("01022033");
    const dayFirst = (await page.inputValue("#hp-in")) === "2033-02-01";
    const keys = (iso) => { const [y, m, d] = iso.split("-"); return (dayFirst ? d + m : m + d) + y; };
    await page.click("#plan [data-clear-dates]");
    await page.focus("#hp-in");
    await page.keyboard.type(keys(addDays(TODAY, 12)));
    await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
    const second = await page.evaluate(() => document.activeElement.id);
    await page.keyboard.type(keys(addDays(TODAY, 14)));
    expect(second === "hp-out" && (await page.inputValue("#hp-in")) === addDays(TODAY, 12) && (await page.inputValue("#hp-out")) === addDays(TODAY, 14), "AC-45 keyboard: both dates can be typed with the number keys, a four-digit year included, and Tab moves from one to the other", (await page.inputValue("#hp-in")) + " " + (await page.inputValue("#hp-out")));
    /* the same on a suite page and in the sheet */
    for (const [route, id, open] of [["th/suites/family-suite/", "sp-in", null], ["en/dining/", "pd-in", ".header-cta"]]) {
      const p3 = await ctx.newPage();
      await p3.goto(BASE + route, { waitUntil: "load" });
      if (open) await p3.click(open);
      await p3.focus("#" + id);
      await p3.keyboard.type(keys(addDays(TODAY, 20)), { delay: 20 });
      expect((await p3.inputValue("#" + id)) === addDays(TODAY, 20), `AC-45 keyboard: a date typed into #${id} keeps its year`, await p3.inputValue("#" + id));
      await p3.close();
    }
    await page.focus("#hp-ad"); await page.keyboard.press("ArrowDown");
    await page.focus("#plan [data-go]"); await page.keyboard.press("Enter"); await closePopups(ctx, page);
    expect(leaves(ctx).length === 1 && leaves(ctx)[0] === `${BOOK}?date=${addDays(TODAY, 12)}&nights=2&adults=3`, "AC-45 keyboard: dates typed, adults changed and the booking page opened from the keyboard alone", leaves(ctx).join(" "));
    /* a walk through the whole home page with Tab: it never sticks, and it ends */
    const walk = async (p, max) => {
      const out = { steps: 0, stuck: [], unseen: [], covered: [], ended: false };
      let last = null, same = 0;
      for (let i = 0; i < max; i++) {
        await p.keyboard.press("Tab");
        const s = await p.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) return null;
          const b = el.getBoundingClientRect(), st = getComputedStyle(el);
          window.__n = window.__n || 0; if (!el.__k) el.__k = ++window.__n;
          const tag = (el.id ? "#" + el.id : "") + (el.className ? "." + String(el.className).split(" ")[0] : "") || el.tagName;
          /* the ring may be drawn on the control itself or, for a covered native control, on the label beside it */
          const ringOn = (x) => { const c = getComputedStyle(x); return (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) >= 1.5) || (c.boxShadow !== "none" && /\d+px/.test(c.boxShadow)); };
          const ring = ringOn(el) || (el.nextElementSibling && ringOn(el.nextElementSibling)) || [".field", ".control", "label"].some((q) => el.closest(q) && ringOn(el.closest(q))) || (el.classList.contains("zoomable") && getComputedStyle(el, "::after").boxShadow !== "none")
            /* a date field's calendar button is a stop of its own: the browser rings the button itself, and the field does not count as focused */
            || (el.type === "date" && !el.matches(":focus"));
          const inView = b.width > 0 && b.height > 0 && b.bottom > 2 && b.top < innerHeight - 2 && b.right > 2 && b.left < innerWidth - 2;
          const pts = [[b.left + b.width / 2, b.top + b.height / 2], [b.left + 3, b.top + 3], [b.right - 3, b.bottom - 3]].map(([x, y]) => [Math.min(Math.max(x, 1), innerWidth - 1), Math.min(Math.max(y, 1), innerHeight - 1)]);
          const over = pts.map(([x, y]) => document.elementFromPoint(x, y)).filter((t) => t && !(t === el || el.contains(t) || t.contains(el) || (el.labels && [...el.labels].some((l) => l.contains(t))) || (t.closest && t.closest(".datebox") === el.closest(".datebox") && el.closest(".datebox"))));
          const by = over.length === pts.length ? over[0] : null;
          return { tag, k: el.__k, ring: !!ring, inView, by: by ? (by.closest("header") ? "the header" : by.closest("[data-mcta]") ? "the booking bar" : by.closest(".concept-strip") ? "the concept notice" : (String(by.className).split(" ")[0] || by.tagName)) : "", fixed: st.position };
        });
        if (!s) { out.ended = true; break; }
        out.steps++;
        if (s.k === last) { same++; if (same >= 2) { out.stuck.push(s.tag); break; } } else same = 0;
        last = s.k;
        if (!s.ring || !s.inView) out.unseen.push(s.tag + (s.ring ? "" : " (no ring)") + (s.inView ? "" : " (off screen)"));
        if (s.by) out.covered.push(s.tag + " under " + s.by);
      }
      return out;
    };
    for (const [route, opts, label] of [["en/", desk, "desktop"], ["en/suites/luxury-suite/", desk, "desktop"], ["th/contact/", desk, "desktop"], ["en/suites/compare/", desk, "desktop"], ["en/location/", { viewport: { width: 390, height: 844 } }, "narrow window"], ["en/", { viewport: { width: 390, height: 844 } }, "narrow window"], ["th/offers/", { viewport: { width: 1024, height: 600 } }, "short window"]]) {
      const c2 = await newContext({ ...opts, reducedMotion: "reduce" });
      const p2 = await fresh(c2, route);
      await p2.waitForTimeout(300);
      const w = await walk(p2, 420);
      expect(w.ended && w.stuck.length === 0 && w.steps > 25, `AC-45 keyboard: Tab passes through all of ${route} (${label}, ${w.steps} stops) and out again, with no trap`, JSON.stringify({ ended: w.ended, stuck: w.stuck, steps: w.steps }));
      expect(w.unseen.length === 0, `AC-46 focus: every stop on ${route} (${label}) is on screen with a visible ring`, [...new Set(w.unseen)].slice(0, 5).join(" | "));
      expect(w.covered.length === 0, `AC-46 focus: no focused control on ${route} (${label}) sits under the header, the booking bar or the concept notice`, [...new Set(w.covered)].slice(0, 5).join(" | "));
      await c2.close();
    }
    /* menu, comparison, gallery and enquiry from the keyboard */
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto(BASE + "en/dining/", { waitUntil: "load" });
    await page.focus("[data-open-menu]"); await page.keyboard.press("Enter"); await page.waitForTimeout(200);
    const inMenu = await page.evaluate(() => document.getElementById("menu").open && document.getElementById("menu").contains(document.activeElement));
    for (let i = 0; i < 14; i++) await page.keyboard.press("Tab");
    const still = await page.evaluate(() => document.getElementById("menu").contains(document.activeElement) || document.activeElement === document.body);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    expect(inMenu && still && await page.evaluate(() => !document.getElementById("menu").open && document.activeElement.hasAttribute("data-open-menu")), "AC-45 keyboard: the menu opens with Enter, keeps Tab inside while open, closes with Escape and returns focus");
    await page.goto(BASE + "en/suites/compare/?a=junior-suite&b=family-suite", { waitUntil: "load" });
    await page.focus("[data-pick-b]"); await page.keyboard.press("ArrowDown");
    const picked = await page.inputValue("[data-pick-b]");
    await page.focus("[data-diff]"); await page.keyboard.press("Space");
    expect(picked !== "family-suite" && (await page.getAttribute("[data-diff]", "aria-pressed")) === "true" && (await page.textContent("[data-compare-status]")).includes("Comparing Junior Suite with"), "AC-45 keyboard: in the two-suite view a suite is changed with the arrow keys and the differences switch works with Space", picked);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + "en/gallery/", { waitUntil: "load" });
    await page.focus('[data-gallery] [data-filter="dining"]'); await page.keyboard.press("Enter");
    await page.focus(".gallery .shot:not(.is-hidden) .zoomable"); await page.keyboard.press("Enter");
    const vOpen = await page.evaluate(() => document.getElementById("viewer").open);
    await page.keyboard.press("ArrowRight");
    const vCount = (await page.textContent("#viewer [data-count]")).trim();
    await page.keyboard.press("Escape");
    expect(vOpen && vCount === "Photograph 2 of 2" && await page.evaluate(() => document.activeElement.classList.contains("zoomable")), "AC-45 keyboard: the gallery filters, opens a photograph, moves and closes from the keyboard", vCount);
    await page.goto(BASE + "en/contact/", { waitUntil: "load" });
    await page.focus('input[name="intent"][value="stay"]'); await page.keyboard.press("ArrowDown");
    await page.focus("#enq-message"); await page.keyboard.type("Is breakfast served on the terrace?");
    await page.focus("[data-enquiry-prepare]"); await page.keyboard.press("Enter"); await page.waitForTimeout(200);
    const k = await page.evaluate(() => ({ shown: !document.querySelector("[data-enquiry-out]").hidden, focus: document.activeElement === document.querySelector("[data-enquiry-out]"), text: document.querySelector("[data-enquiry-text]").textContent }));
    let t1 = 0, t2 = false;
    for (; t1 < 5 && !t2; t1++) { await page.keyboard.press("Tab"); t2 = await page.evaluate(() => document.activeElement.hasAttribute("data-enquiry-copy")); }
    await page.keyboard.press("Enter"); await page.waitForTimeout(250);
    t2 = t2 && (await page.textContent("[data-enquiry-status]")).trim().length > 5;
    expect(k.shown && k.focus && /Enquiry: A family or group/.test(k.text) && /terrace/.test(k.text) && t2, "AC-45 keyboard: the enquiry is chosen, written and prepared from the keyboard, and Tab then reaches Copy, which answers to Enter", JSON.stringify({ shown: k.shown, focus: k.focus, t1, t2 }));
    expect(errs.length === 0, "AC-45 keyboard: no script error", errs.join(" | "));
    await ctx.close();
    note("AC-46", "Checked in Edge with a hardware keyboard emulated by Playwright. How the page behaves when a phone's on-screen keyboard opens has not been looked at on a device.");
  });

  /* ---------- AC-48 to AC-50: zoom, spacing, contrast modes ---------- */
  await block("AC-48 and AC-49 zoom and spacing", async () => {
    /* text that a box cuts off: only boxes that really hide what overflows them count */
    const clipped = () => {
      const out = [];
      for (const el of document.querySelectorAll("a, button, label, select, summary, th, td, dt, dd, h1, h2, h3, h4, p, li, legend, .badge, .eyebrow, .chip, .datebox__empty, small")) {
        if (el.closest("dialog:not([open])") || el.closest(".sr-only, .skip, [hidden]") || !el.getClientRects().length) continue;
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || !el.textContent.trim()) continue;
        if (!/(hidden|clip)/.test(s.overflowX + " " + s.overflowY)) continue;
        if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) out.push((String(el.className).split(" ")[0] || el.tagName) + ": " + el.textContent.trim().slice(0, 30));
      }
      return { clipped: out, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    };
    const SPACING = "*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}";
    const sample = quick ? ["en/", "th/suites/compare/", "th/contact/"] : routes;
    for (const [w, h, phone] of [[390, 844, true], [1280, 800, false]]) {
      const ctx = await newContext({ viewport: { width: w, height: h }, isMobile: phone ? mob : undefined, hasTouch: phone });
      const page = await ctx.newPage();
      const worst = [];
      for (const route of sample) {
        await page.goto(BASE + route, { waitUntil: "load" });
        await page.addStyleTag({ content: SPACING });
        await page.waitForTimeout(120);
        const r = await page.evaluate(clipped);
        if (r.overflow) worst.push(route + ": scrolls sideways");
        if (r.clipped.length) worst.push(route + ": " + [...new Set(r.clipped)].slice(0, 3).join(", "));
      }
      expect(worst.length === 0, `AC-49 text spacing: with the wider spacing applied, nothing is cut off and no page scrolls sideways at ${w} wide (${sample.length} pages)`, worst.slice(0, 4).join(" | "));
      await ctx.close();
    }
    /* 200% zoom of a 1280 window is a 640 window; 400% is a 320 window, 256 tall on a 1280 by 1024 screen */
    for (const [w, h, label] of [[640, 400, "200% zoom"], [320, 256, "400% zoom"]]) {
      const ctx = await newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const worst = []; let room = 9999, roomAt = "";
      for (const route of sample) {
        await page.goto(BASE + route, { waitUntil: "load" });
        await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(260);
        const r = await page.evaluate(() => {
          const fixed = [...document.querySelectorAll("header.site-header, [data-mcta], .concept-strip")].filter((e) => { const s = getComputedStyle(e); return (s.position === "fixed" || s.position === "sticky") && e.getClientRects().length && (e.hasAttribute("data-mcta") ? e.classList.contains("is-on") : true); });
          const taken = fixed.reduce((n, e) => { const b = e.getBoundingClientRect(); return n + Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)); }, 0);
          return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, free: Math.round(innerHeight - taken) };
        });
        if (r.overflow) worst.push(route + ": scrolls sideways");
        if (r.free < room) { room = r.free; roomAt = route; }
      }
      expect(worst.length === 0, `AC-48 zoom: at ${label} (a ${w} by ${h} window) no page scrolls sideways`, worst.slice(0, 4).join(" | "));
      expect(room >= h * 0.5, `AC-48 zoom: at ${label} the fixed header and bar leave at least half the window for the page`, `${room}px of ${h} free on ${roomAt}`);
      note("AC-48", `${label}: least room left by fixed parts is ${room}px of ${h}, on ${roomAt}.`);
      await ctx.close();
    }
    /* text alone doubled: a second browser whose own default text size is 32 px instead of 16, which is what a
       reader's "larger text" setting does. The breakpoints are in em, so the page should take its narrower layouts. */
    if (edge) {
      const big = await chromium.launch({ channel: "msedge", headless: true, args: ["--blink-settings=defaultFontSize=32,defaultFixedFontSize=26"] });
      const worst = []; let rem = 0, menu = false;
      for (const [w, h] of [[1280, 800], [768, 1024]]) {
        const ctx = await big.newContext({ viewport: { width: w, height: h }, locale: "en-GB", timezoneId: "Asia/Bangkok" });
        await ctx.route((url) => !String(url).startsWith(ORIGIN), (route) => route.abort());
        const page = await ctx.newPage();
        for (const route of sample) {
          await page.goto(BASE + route, { waitUntil: "load" });
          await page.waitForTimeout(120);
          const r = await page.evaluate(clipped);
          if (r.overflow) worst.push(w + " " + route + ": scrolls sideways");
          if (r.clipped.length) worst.push(w + " " + route + ": " + [...new Set(r.clipped)].slice(0, 3).join(", "));
        }
        if (w === 1280) {
          rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
          menu = await page.evaluate(() => { const m = document.querySelector("[data-open-menu]"); return !!m && m.getClientRects().length > 0; });
          await mkdir("_private/qa/large-text", { recursive: true });
          for (const route of ["en/", "th/suites/compare/", "en/contact/"]) { await page.goto(BASE + route, { waitUntil: "load" }); await page.waitForTimeout(300); await page.screenshot({ path: `_private/qa/large-text/${route.replace(/\//g, "_").replace(/_$/, "")}.png` }); }
        }
        await ctx.close();
      }
      await big.close();
      expect(rem === 32 && menu, "AC-48 zoom: with the browser's text size doubled, a 1280 window takes the narrower layout (the menu button replaces the long navigation)", "root text " + rem + "px, menu button " + menu);
      expect(worst.length === 0, `AC-48 zoom: with the browser's text size doubled, nothing is cut off and no page scrolls sideways at 1280 or 768 wide (${sample.length} pages)`, worst.slice(0, 5).join(" | "));
      note("AC-48", "Text enlargement was tested with a browser whose default text size is 32 px (Edge started with that setting). Three screenshots are in _private/qa/large-text. A phone's system text-size setting was not tested on a device.");
    }
  });

  if (edge) await block("AC-50 forced colours", async () => {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 }, forcedColors: "active", colorScheme: "dark" });
    const page = await ctx.newPage();
    const errs = []; watch(page, errs);
    await mkdir("_private/qa/forced-colours", { recursive: true });
    for (const route of ["en/", "en/suites/compare/?a=luxury-suite&b=penthouse-suite", "th/contact/", "en/location/"]) {
      await page.goto(BASE + route, { waitUntil: "load" });
      const r = await page.evaluate(() => {
        const on = matchMedia("(forced-colors: active)").matches;
        const bare = [];
        for (const el of document.querySelectorAll(".btn, .chip, select, input:not([type=radio]):not([type=checkbox]), textarea, .close-btn, .menu-btn, .finder__tab, .place__btn")) {
          if (el.closest("dialog:not([open])") || !el.getClientRects().length) continue;
          const s = getComputedStyle(el);
          const edged = ["Top", "Bottom", "Left", "Right"].some((k) => s["border" + k + "Style"] !== "none" && parseFloat(s["border" + k + "Width"]) > 0) || (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.textDecorationLine.includes("underline");
          let boxed = false;
          for (let p = el.parentElement, i = 0; p && i < 4 && !boxed; p = p.parentElement, i++) { const b = getComputedStyle(p); boxed = ["Top", "Bottom", "Left", "Right"].filter((k) => b["border" + k + "Style"] !== "none" && parseFloat(b["border" + k + "Width"]) > 0).length >= 1 && p.matches(".field, .control, .place, .planner, .planner__fields, li"); }
          if (!edged && !boxed) bare.push(String(el.className).split(" ")[0] || el.tagName);
        }
        const pressed = [...document.querySelectorAll('[aria-pressed="true"], [aria-current="true"], [aria-expanded="true"]')].filter((e) => e.getClientRects().length).length;
        return { on, bare: [...new Set(bare)], pressed };
      });
      expect(r.on && r.bare.length === 0, `AC-50 forced colours: on ${route.split("?")[0]} every button, chip and field keeps an edge when the system replaces the colours`, r.bare.join(", "));
      await page.screenshot({ path: `_private/qa/forced-colours/${route.replace(/[/?&=]/g, "_").replace(/_$/, "") || "home"}.png` });
    }
    /* the planner's empty date label must still read */
    await page.goto(BASE + "en/", { waitUntil: "load" });
    const lab = await page.evaluate(() => { const l = document.querySelector("#hp-in + .datebox__empty"); const i = document.getElementById("hp-in"); return { label: getComputedStyle(l).display, own: getComputedStyle(i).color, bg: getComputedStyle(i).backgroundColor, canvas: getComputedStyle(document.body).backgroundColor }; });
    expect(lab.label === "none" && lab.own !== lab.canvas && !/rgba\(.*,\s*0\)|transparent/.test(lab.own), "AC-50 forced colours: an empty date shows the browser's own empty state in a system colour, with no second label drawn over it", JSON.stringify(lab));
    await page.focus("#hp-in");
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.getElementById("hp-in").closest(".field")); return s.outlineStyle + " " + s.outlineWidth; });
    expect(/^solid [23]px$/.test(ring), "AC-50 forced colours: a planner field in focus is outlined, since shadows are not drawn in this mode", ring);
    await page.screenshot({ path: "_private/qa/forced-colours/planner-focus.png", clip: { x: 0, y: 0, width: 1280, height: 800 } });
    expect(errs.length === 0, "AC-50 forced colours: no script error", errs.join(" | "));
    await ctx.close();
    note("AC-50", "Forced colours were emulated in Edge and four screenshots saved to _private/qa/forced-colours for a look by eye. Windows High Contrast itself was not switched on. Contrast in the normal colours is judged by the axe scan (Part 3), which cannot judge text over photographs.");
  });

  /* ---------- AC-51 and AC-52: scripts that fail, storage that refuses ---------- */
  await block("AC-51 script fails to arrive", async () => {
    const ctx = await newContext(desk);
    const page = await ctx.newPage();
    await page.route("**/assets/js/site*.js*", (r) => r.abort());
    await page.goto(BASE + "en/suites/deluxe-suite/", { waitUntil: "load" });
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => ({ cls: document.documentElement.className, plain: [...document.querySelectorAll(".planner__plain a")].filter((a) => a.getClientRects().length).map((a) => a.href), form: [...document.querySelectorAll("form.planner")].some((f) => f.getClientRects().length), reveal: [...document.querySelectorAll(".reveal")].every((e) => getComputedStyle(e).opacity === "1"), nav: [...document.querySelectorAll(".nav__list a")].filter((a) => a.getClientRects().length).length, cta: (() => { const a = document.querySelector(".header-cta"); return a.href + " " + a.target + " " + a.innerText.replace(/\s+/g, " ").trim() + " " + (a.querySelector("[data-newtab-note]") || { textContent: "" }).textContent.trim(); })(), tel: !!document.querySelector('footer a[href^="tel:"]'), specs: document.querySelectorAll(".specs dt").length }));
    expect(/\bno-js\b/.test(s.cls) && !/\bjs\b/.test(s.cls.replace("no-js", "")), "AC-51 script fails: when the script file does not arrive, the page puts itself back into its plain form", s.cls);
    expect(s.plain.length >= 1 && s.plain.every((h) => h === BOOK) && !s.form && s.reveal && s.nav >= 5 && s.tel && s.specs >= 7, "AC-51 script fails: the booking link, navigation, suite details and telephone are all there, and nothing waits for an effect", JSON.stringify(s));
    expect(/^https:\/\/www\.granddiamondsuites\.com\/booking _blank Check availability/.test(s.cta) && !/Check dates/.test(s.cta) && /new tab/.test(s.cta), "AC-51 script fails: the header button is a plain link to the booking page and says it opens a new tab", s.cta);
    await ctx.close();
  });

  await block("AC-52 storage", async () => {
    const ctx = await newContext(desk);
    await ctx.addInitScript(() => {
      const deny = { configurable: true, get() { throw new DOMException("The operation is insecure.", "SecurityError"); } };
      try { Object.defineProperty(window, "sessionStorage", deny); Object.defineProperty(window, "localStorage", deny); } catch (e) {}
    });
    const page = await ctx.newPage();
    const errs = []; watch(page, errs);
    await page.goto(BASE, { waitUntil: "load" }); await page.waitForTimeout(400);
    expect(/\/(en|th)\/$/.test(page.url()), "AC-52 storage refused: the bare address still reaches a language", page.url());
    await page.goto(BASE + "en/", { waitUntil: "load" });
    const refused = await page.evaluate(() => { try { return typeof window.sessionStorage; } catch (e) { return "refused"; } });
    const hp = plannerAt(page, "#plan", "hp");
    const a = addDays(TODAY, 8), b = addDays(TODAY, 10);
    await page.fill(hp.in, a); await page.fill(hp.out, b); await page.selectOption(hp.ad, "3");
    expect(refused === "refused" && (await hp.href()) === `${BOOK}?date=${a}&nights=2&adults=3` && (await hp.dates()).endsWith("(2 nights)"), "AC-52 storage refused: with storage blocked, planning on the page works as usual", refused + " " + (await hp.href()));
    await page.click(".nav__list a[href*='suites/']"); await page.waitForLoadState("load");
    await page.click('.finder__tab[data-suite="deluxe-suite"]');
    await page.setViewportSize({ width: 820, height: 900 });
    await page.goto(BASE + "en/suites/compare/?a=family-suite&b=deluxe-suite", { waitUntil: "load" });
    await page.selectOption("[data-pick-b]", "penthouse-suite");
    await page.click(".header-tools [data-lang-switch]"); await page.waitForLoadState("load");
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(/th\/suites\/compare\/\?a=family-suite&b=penthouse-suite/.test(page.url()), "AC-52 storage refused: navigation, the suite selector, comparison and the language switch all work", page.url());
    await page.goto(BASE + "en/contact/", { waitUntil: "load" });
    await page.fill("#enq-message", "A question"); await page.click("[data-enquiry-prepare]");
    expect(await page.evaluate(() => !document.querySelector("[data-enquiry-out]").hidden), "AC-52 storage refused: the enquiry helper works");
    expect(errs.length === 0, "AC-52 storage refused: no script error anywhere", errs.join(" | "));
    await ctx.close();

    /* values some other script, or an older version of this site, might have left behind */
    for (const [label, values, want] of [
      ["broken text", { "gd:stay": "{{not json", "gd:compare": "<img src=x>", "gd:suite": "{\"a\":1}" }, `${BOOK}?adults=2`],
      ["the wrong shapes", { "gd:stay": "[1,2,3]", "gd:compare": "\"x\"", "gd:suite": "42" }, `${BOOK}?adults=2`],
      ["impossible values", { "gd:stay": JSON.stringify({ in: "2026-13-45", out: "tomorrow", adults: "99", kids: ["a", -1, 300] }), "gd:compare": JSON.stringify(["penthouse-suite", "penthouse-suite"]) }, BOOK],
    ]) {
      const c2 = await newContext(desk);
      await c2.addInitScript((v) => { try { if (!sessionStorage.getItem("gd:seeded")) { Object.keys(v).forEach((k) => sessionStorage.setItem(k, v[k])); sessionStorage.setItem("gd:seeded", "1"); } } catch (e) {} }, values);
      const p2 = await c2.newPage(); const e2 = []; watch(p2, e2);
      await p2.goto(BASE + "en/", { waitUntil: "load" });
      const h2 = plannerAt(p2, "#plan", "hp");
      const st = { href: await h2.href(), ad: await p2.inputValue(h2.ad), a: await p2.inputValue(h2.in), guests: await h2.guests(), rec: await h2.recovering() };
      await p2.goto(BASE + "en/suites/compare/", { waitUntil: "load" });
      const pair = await p2.evaluate(() => document.querySelector("[data-pick-a]").value + "," + document.querySelector("[data-pick-b]").value);
      await p2.goto(BASE + "en/suites/", { waitUntil: "load" });
      const open = await p2.evaluate(() => [...document.querySelectorAll(".finder__panel")].filter((p) => !p.hidden).length);
      expect(e2.length === 0 && st.href === want && st.a === "" && pair.split(",")[0] !== pair.split(",")[1] && open === 1, `AC-52 stored values: ${label} in storage cause no error; the planner, comparison and selector fall back to something sound`, JSON.stringify({ ...st, pair, open, errs: e2 }));
      if (label === "impossible values") expect(st.ad === "8" && st.rec && /8 adults, 3 children \(ages needed\)/.test(st.guests), "AC-52 stored values: an impossible party is held to what the form can show and is then told the guest limit, not sent on", JSON.stringify(st));
      await c2.close();
    }
  });

  /* ---------- AC-53 to AC-55: photographs, stability, budgets ---------- */
  await block("AC-53 to AC-55 photographs and budgets", async () => {
    const sizes = [];
    for (const [label, opts, wantW] of [["phone, 390 at 2x", phoneOpts, [768, 1024]], ["desktop, 1440 at 1x", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, [1440]], ["large desktop, 1920 at 1x", { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, [1920]]]) {
      const ctx = await newContext(opts);
      const page = await ctx.newPage();
      const media = [];
      page.on("response", async (r) => { if (/\/media\//.test(r.url())) { let n = 0; try { n = (await r.body()).length; } catch (e) {} media.push({ url: r.url().split("/media/")[1], bytes: n, at: Date.now() }); } });
      await page.goto(BASE + "en/", { waitUntil: "load" });
      const loadAt = Date.now();
      await page.waitForTimeout(700);
      const hero = await page.evaluate(() => { const i = document.querySelector(".hero__slide.is-on img"); return { src: i.currentSrc.split("/media/")[1], pri: i.getAttribute("fetchpriority"), lazy: i.getAttribute("loading"), ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth, box: Math.round(i.getBoundingClientRect().width * devicePixelRatio) }; });
      const stem = hero.src.replace(/-\d+\.\w+$/, "");
      const heroReqs = media.filter((m) => m.url.startsWith(stem + "-") && m.at <= loadAt + 700);
      const width = +(/-(\d+)\.\w+$/.exec(hero.src) || [])[1];
      expect(hero.ok && hero.pri === "high" && hero.lazy !== "lazy", `AC-53 photographs: the first hero photograph is fetched with high priority and not lazily (${label})`, JSON.stringify(hero));
      expect(wantW.includes(width) && /\.(avif|webp)$/.test(hero.src), `AC-53 photographs: ${label} is given the ${wantW.join(" or ")} wide file in a modern format, not a larger one`, hero.src + " for a box " + hero.box + " device pixels wide");
      expect(heroReqs.length === 1, `AC-53 photographs: the hero photograph is fetched once, in one size and format (${label})`, heroReqs.map((m) => m.url).join(", "));
      const kb = heroReqs.length ? Math.round(heroReqs[0].bytes / 102.4) / 10 : 0;
      sizes.push(`${label}: ${hero.src} ${kb} KB`);
      if (label.startsWith("large")) note("AC-55", `The hero photograph on ${label} is ${kb} KB; the 100 KB budget is set for the phone and the common desktop size.`);
      else expect(kb > 0 && kb < 100, `AC-55 budget: the hero photograph is under 100 KB (${label})`, kb + " KB");
      const others = media.filter((m) => m.at <= loadAt && !m.url.startsWith(stem + "-"));
      note("AC-53", `${label}: hero ${hero.src} (${kb} KB); ${others.length} other photograph file(s) fetched before the load event.`);
      await ctx.close();
    }
    /* the stylesheet and the script, as the browser receives them from a server that compresses */
    const { gzipSync } = await import("node:zlib");
    for (const [name, file] of [["stylesheet", "assets/css/site.css"], ["script", "assets/js/site.js"]]) {
      const kb = Math.round(gzipSync(await readFile(path.join("docs", file))).length / 102.4) / 10;
      expect(kb < 25, `AC-55 budget: the ${name} is under 25 KB compressed`, kb + " KB");
      sizes.push(`${name}: ${kb} KB gzip`);
    }
    note("AC-55", sizes.join("; "));

    /* adding children's age rows moves what is below the planner, as any opened form section does; nothing else on the page jumps */
    const ctx = await newContext(desk);
    const page = await fresh(ctx, "en/");
    await page.evaluate(() => { window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: "layout-shift", buffered: false }); }).catch(() => {});
    await page.evaluate(() => document.getElementById("plan").scrollIntoView({ block: "center" })); await page.waitForTimeout(600);
    const top0 = await page.evaluate(() => document.querySelector("#plan .planner__fields").getBoundingClientRect().top);
    await page.selectOption("#hp-ch", "3"); await page.waitForTimeout(700);
    const s = await page.evaluate(() => ({ top: document.querySelector("#plan .planner__fields").getBoundingClientRect().top, shift: Math.round((window.__shift || 0) * 1000) / 1000 }));
    if (edge) expect(Math.abs(s.top - top0) <= 1 && s.shift <= 0.1, "AC-54 stability: showing three age fields leaves the planner's own fields where they are, and counts no unexpected shift", JSON.stringify({ moved: s.top - top0, shift: s.shift }));
    await ctx.close();
  });

  /* ---------- AC-58 to AC-63: share card, content, policy ---------- */
  await block("AC-58 share card files", async () => {
    const sharp = (await import("sharp")).default;
    for (const lang of ["en", "th"]) {
      const meta = await sharp(`docs/assets/img/social-card-concept-${lang}.jpg`).metadata();
      const kb = Math.round((await readFile(`docs/assets/img/social-card-concept-${lang}.jpg`)).length / 1024);
      expect(meta.width === 1200 && meta.height === 630 && meta.format === "jpeg" && kb < 400, `AC-58 share card: the ${lang} card is a 1200 by 630 JPEG of a sensible size`, `${meta.width}x${meta.height} ${meta.format} ${kb} KB`);
    }
    const ctx = await newContext(desk);
    const page = await ctx.newPage();
    const res = await page.goto(BASE + "assets/img/social-card-concept-en.jpg");
    expect(res.status() === 200 && /image\/jpeg/.test(res.headers()["content-type"] || ""), "AC-58 share card: the card is served as an image at the address the pages give");
    await page.goto(BASE + "th/dining/", { waitUntil: "load" });
    const m = await page.evaluate(() => { const g = (p) => (document.querySelector(`meta[property="${p}"], meta[name="${p}"]`) || { getAttribute: () => null }).getAttribute("content"); return { title: g("og:title"), desc: g("og:description"), w: g("og:image:width"), h: g("og:image:height"), card: g("twitter:card"), locale: g("og:locale"), url: g("og:url") }; });
    expect(m.w === "1200" && m.h === "630" && m.card === "summary_large_image" && /[฀-๿]/.test(m.title || "") && /[฀-๿]/.test(m.desc || ""), "AC-58 share card: a Thai page gives the card's size, a large-image card type and a Thai title and description", JSON.stringify(m));
    await ctx.close();
    note("AC-58", "The words drawn on the two cards (\"Unofficial design concept by O2 Design Studio. This is not the hotel's website.\" and the Thai equivalent) were read by eye from the image files. How each social network crops and caches the card was not tested: that needs the published address and each network's own preview tool.");
  });

  await block("AC-59 to AC-62 content and policy", async () => {
    const ctx = await newContext(desk);
    const page = await ctx.newPage();
    const errs = []; watch(page, errs);
    /* one record feeds every page: the check-in time, the night limit and the telephone agree everywhere they appear */
    const facts = { times: new Set(), limits: new Set(), tels: new Set() }; let withTime = 0;
    for (const route of routes) {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
      const t = await page.evaluate(() => ({ text: document.querySelector("main").textContent.replace(/\s+/g, " "), tels: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute("href")), boot: (() => { try { return JSON.parse(document.getElementById("boot").textContent).booking; } catch (e) { return {}; } })() }));
      const ci = t.text.match(/(?:Check-in|check-in from|เช็คอิน(?:ตั้งแต่| ตั้งแต่เวลา|ได้ตั้งแต่)?)\s*(?:from |เวลา )?(\d{1,2}[:.]\d{2})/g) || [];
      ci.forEach((x) => facts.times.add(/(\d{1,2}[:.]\d{2})/.exec(x)[1].replace(".", ":")));
      if (ci.length) withTime++;
      if (t.boot && t.boot.maxNights) facts.limits.add(t.boot.maxNights + "/" + t.boot.maxGuests + "/" + t.boot.maxAdults);
      t.tels.forEach((x) => facts.tels.add(x));
    }
    expect(facts.times.size <= 1 && facts.limits.size === 1 && facts.tels.size === 1, "AC-59 one source: the check-in time, the booking limits and the telephone number are the same on every page that gives them", JSON.stringify({ times: [...facts.times], limits: [...facts.limits], tels: [...facts.tels], pagesWithTime: withTime }));
    await page.goto(BASE + "en/suites/penthouse-suite/", { waitUntil: "load" });
    const pent = await page.evaluate(() => ({ flags: [...document.querySelectorAll("small.flag")].map((f) => f.textContent.replace(/\s+/g, " ").trim()), label: (document.querySelector("small.flag .sr-only") || {}).textContent }));
    await page.goto(BASE + "th/suites/compare/", { waitUntil: "load" });
    const cmp = await page.evaluate(() => [...document.querySelectorAll('td[data-col="penthouse-suite"] small.flag')].length);
    expect(pent.flags.some((f) => /booking page lists 200 sq m/.test(f)) && /To check with the hotel/.test(pent.label || "") && cmp >= 3, "AC-59 one source: where two of the hotel's sources disagree, the disagreement is printed beside the figure on the suite page and in the comparison, in both languages", JSON.stringify(pent.flags) + " / " + cmp);
    const queue = await readFile("_private/handover/verification-queue.md", "utf8").catch(() => "");
    expect(/0 confirmed/.test(queue.split("\n").slice(0, 8).join(" ")) && /conflicting|disagree/.test(queue), "AC-59 one source: the open questions for the hotel are written out from the same list at every build, and none is marked confirmed without a reviewer", queue.split("\n").slice(0, 6).join(" ").slice(0, 200));

    /* AC-61: no discount, guarantee or deadline is stated as this site's own */
    const claims = [];
    for (const route of routes) {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
      const text = await page.evaluate(() => document.querySelector("main").textContent.replace(/\s+/g, " "));
      for (const m of text.match(/[^.]*(\d+\s?% (off|discount)|best rate guarantee|lowest price|price match|guaranteed|limited time|\bends (on|soon)|book now and save|ส่วนลด\s?\d+\s?%|รับประกันราคา|ราคาดีที่สุด)[^.]*\./gi) || []) {
        if (!/(the hotel|booking page|hotel's|โรงแรม|หน้าจอง).{0,160}(says|lists|shows|states|advertis|publish|ระบุ|แจ้ง|แสดง)|(says|lists|shows|states|advertis|publish|ระบุ|แจ้ง|แสดง).{0,160}(the hotel|booking page|โรงแรม|หน้าจอง)|not a promise|no guarantee|does not guarantee|cannot guarantee|ไม่ได้รับประกัน|ไม่ได้ยืนยัน|ไม่รับประกัน/i.test(m)) claims.push(route + ": " + m.trim().slice(0, 140));
      }
    }
    expect(claims.length === 0, "AC-61 offers: no page states a discount, a guarantee or a deadline in this site's own voice", claims.slice(0, 3).join(" | "));
    await page.goto(BASE + "en/offers/", { waitUntil: "load" });
    const offers = (await page.textContent("main")).replace(/\s+/g, " ");
    expect(/booking page/.test(offers) && /rate/.test(offers) && !/฿\s?\d|THB\s?\d|\d[\d,]{2,}\s?(baht|THB)/i.test(offers), "AC-61 offers: the rates page sends the visitor to the booking page for rates and their conditions, and quotes no price of its own");

    /* AC-62: text a visitor types, or a link carries, is shown as text and never run */
    await page.goto(BASE + "en/contact/?about=%3Cimg%20src%3Dx%20onerror%3D%22window.__x%3D1%22%3E&suite=%22%3E%3Cscript%3Ewindow.__x%3D1%3C/script%3E", { waitUntil: "load" });
    await page.fill("#enq-name", '<img src=x onerror="window.__x=1">'); await page.fill("#enq-party", "<svg onload=window.__x=1>"); await page.fill("#enq-message", "<script>window.__x=1</script> & \"quotes\"");
    await page.click("[data-enquiry-prepare]"); await page.waitForTimeout(300);
    const x = await page.evaluate(() => ({ ran: window.__x, kids: document.querySelector("[data-enquiry-text]").children.length, text: document.querySelector("[data-enquiry-text]").textContent, injected: document.querySelectorAll("main script, main img[src='x'], main svg[onload]").length, intent: document.querySelectorAll('input[name="intent"]:checked').length }));
    expect(x.ran === undefined && x.kids === 0 && x.injected === 0 && x.text.includes('<img src=x onerror="window.__x=1">') && x.text.includes("<script>window.__x=1</script> & \"quotes\"") && x.intent === 1, "AC-62 safe text: markup typed into the enquiry, or put in its link, appears as plain text in the message and is never run", JSON.stringify({ ran: x.ran, kids: x.kids, injected: x.injected }));
    for (const u of ["en/gallery/?filter=%3Cimg%20src%3Dx%20onerror%3Dwindow.__x%3D1%3E", "en/suites/#suite-%3Cimg%20src=x%20onerror=window.__x=1%3E", "en/faq/#%3Cimg%20src=x%20onerror=window.__x=1%3E", "?lang=%3Cscript%3E#%3Cscript%3E"]) {
      await page.goto(BASE + u, { waitUntil: "load" }); await page.waitForTimeout(250);
      expect(await page.evaluate(() => window.__x === undefined && !document.querySelector("img[src='x']")), `AC-62 safe text: ${u.split("?")[0].split("#")[0] || "the bare address"} ignores markup in its address`);
    }
    /* the content policy really is in force: an inline script added to the page does not run */
    await page.goto(BASE + "en/", { waitUntil: "load" });
    const pol = await page.evaluate(async () => { const seen = []; document.addEventListener("securitypolicyviolation", (e) => { seen.push(e.violatedDirective); }); const s = document.createElement("script"); s.textContent = "window.__inline = 1"; document.head.appendChild(s); const i = new Image(); const blocked = new Promise((res) => { i.onerror = () => res(true); i.onload = () => res(false); setTimeout(() => res(null), 1500); }); i.src = "https://example.com/pixel.gif"; const img = await blocked; await new Promise((res) => setTimeout(res, 500)); return { ran: window.__inline, refused: seen.join(" "), img }; });
    expect(pol.ran === undefined && /script-src/.test(pol.refused) && /img-src/.test(pol.refused), "AC-62 content policy: a script injected into the page and an image from another site are both refused by the policy the page declares", JSON.stringify(pol));
    await page.goto(BASE + "en/privacy/", { waitUntil: "load" });
    const privacy = (await page.textContent("main")).replace(/\s+/g, " ");
    expect(/no cookies|does not set cookies|sets no cookie/i.test(privacy) && /analytics/i.test(privacy) && /email (app|application|program)/i.test(privacy) && /booking page/i.test(privacy) && /session|this tab|browser/i.test(privacy), "AC-62 privacy text: the privacy page covers cookies, analytics, the remembered stay, the enquiry leaving by the visitor's own email, and the hand-over to the booking page");
    expect(errs.filter((e) => !/Content Security Policy|Refused to|example\.com/.test(e)).length === 0, "AC-59 to AC-62: no script error", errs.join(" | ").slice(0, 300));
    await ctx.close();
    note("AC-62", "GitHub Pages cannot send response headers chosen by the site, so the content policy is a meta element; frame-ancestors, HSTS and a referrer policy header need a host that can set headers. Listed under production-only requirements.");
  });
}

/* ------------------------------------------------------------------ */
/* Part 3: accessibility scan                                           */
/* ------------------------------------------------------------------ */
const axeFindings = [];
if (runs("axe") && edge) {
  console.log("Accessibility scan (axe-core)");
  const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
  let total = 0;
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const ctx = await newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 });
    const page = await ctx.newPage();
    let clean = 0;
    const scan = async (label) => {
      const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of res.violations) axeFindings.push({ page: label, width: w, rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 5).map((n) => n.target.join(" ")) });
      if (res.violations.length) bad(`axe ${w} ${label}`, res.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`).join(", ")); else { ok(`axe ${w} ${label}`); clean++; }
    };
    for (const route of [...routes, "../404.html"]) {
      await page.goto(BASE + (route === "../404.html" ? "404.html" : route), { waitUntil: "load" });
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += 700) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(40); }
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
      await scan(route === "../404.html" ? "404" : route);
    }
    /* Each state is scanned at rest: a button caught half way through its colour change reads as a contrast fault. */
    const rest = () => page.waitForTimeout(350);
    await block(`axe ${w}: dialogs and states`, async () => {
      /* the three dialogs, open */
      await page.goto(BASE + "en/dining/", { waitUntil: "load" });
      if (w < 700) { await page.click("[data-open-menu]"); await rest(); await scan("dialog: menu"); await page.keyboard.press("Escape"); }
      await page.evaluate(() => { const d = document.getElementById("plan-dialog"); if (!d.open) d.showModal(); });
      await rest(); await scan("dialog: planner"); await page.keyboard.press("Escape");
      /* the states the second audit added: a stay past the limit, a party past the limit, a prepared enquiry, a failed photograph */
      await page.goto(BASE + "en/suites/luxury-suite/", { waitUntil: "load" });
      await page.fill("#sp-in", addDays(TODAY, 5)); await page.fill("#sp-out", addDays(TODAY, 50)); await page.selectOption("#sp-ad", "6");
      await rest(); await scan("state: stay past the night limit");
      await page.fill("#sp-out", addDays(TODAY, 7)); await page.selectOption("#sp-ch", "3");
      await rest(); await scan("state: party past the guest limit");
      await page.selectOption("#sp-ch", "0");
      await rest(); await scan("state: suite too small for the party");
      await page.click(".mosaic__main .zoomable"); await page.waitForTimeout(500);
      await scan("dialog: viewer"); await page.keyboard.press("Escape");
      await page.route("**/media/**", (r) => (/\.(webp|jpg)$/.test(r.request().url()) ? r.abort() : r.continue()));
      await page.click(".mosaic__main .zoomable"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(600);
      await scan("dialog: viewer, photograph failed"); await page.keyboard.press("Escape");
      await page.unroute("**/media/**");
      await page.goto(BASE + "th/contact/", { waitUntil: "load" });
      await page.click("[data-enquiry-prepare]");
      await rest(); await scan("state: enquiry refused");
      await page.fill("#enq-message", "ขอสอบถามเรื่องห้องพัก"); await page.click("[data-enquiry-prepare]");
      await rest(); await scan("state: enquiry prepared");
      await page.goto(BASE + "en/suites/compare/?a=junior-suite&b=family-suite", { waitUntil: "load" });
      /* the differences switch belongs to the two-suite view of narrower screens */
      if (await page.isVisible("[data-diff]")) { await page.click("[data-diff]"); await rest(); await scan("state: comparison, differences only"); }
      /* the map with a marker's card open (asked for after the audit), in both languages */
      for (const [route, id] of [["en/location/", "platinum"], ["th/", "centralworld"]]) {
        await page.goto(BASE + route, { waitUntil: "load" });
        await page.locator("[data-map]").scrollIntoViewIfNeeded();
        await page.evaluate((id) => document.querySelector("[data-map]").__map.reveal(id), id);
        await page.waitForTimeout(450);
        await page.evaluate((id) => document.querySelector('.pin[data-pin="' + id + '"]').click(), id);
        await page.waitForTimeout(500);
        const open = await page.evaluate((id) => { const cs = getComputedStyle(document.querySelector('.pin[data-pin="' + id + '"] .pin__card')); return cs.visibility === "visible" && cs.opacity === "1"; }, id);
        expect(open, `axe ${w}: the marker's card is open when ${route} is scanned`);
        await rest(); await scan("state: map, a marker's card open (" + route + ")");
      }
    });
    console.log(`  ${w} wide: ${clean} scans clean`);
    total += clean;
    await ctx.close();
  }
  expect(axeFindings.length === 0, "AC-50 contrast: axe finds no contrast, name, role or structure fault on any page, dialog or new state at a phone and a desktop width", `${axeFindings.length} finding(s)`);
  note("AC-50", `${total} axe scans clean (WCAG 2.2 A and AA rule sets). axe cannot judge text laid over photographs; the hero and closing overlays were looked at by eye.`);
  await mkdir("_private/qa", { recursive: true });
  await writeFile(path.join("_private/qa", "axe-report.json"), JSON.stringify({ ran: new Date().toISOString(), rules: TAGS, engine: "axe-core through @axe-core/playwright, in Microsoft Edge " + browserVersion, scans: total, findings: axeFindings }, null, 1), "utf8");
}

/* ------------------------------------------------------------------ */
/* Part 4: lab figures                                                  */
/* ------------------------------------------------------------------ */
if (runs("lab") && edge) {
  console.log("Lab figures");
  const lab = [];
  for (const [name, w, h, mobile] of [["phone", 390, 844, true], ["desktop", 1440, 900, false]]) {
    for (const route of ["en/", "en/suites/", "en/suites/penthouse-suite/", "en/suites/compare/", "en/location/", "en/gallery/", "en/contact/", "th/"]) {
      const ctx = await newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
      const page = await ctx.newPage();
      let bytes = 0, requests = 0; const byType = {};
      page.on("requestfinished", async (req) => {
        try { const z = await req.sizes(); const n = z.responseBodySize + z.responseHeadersSize; bytes += n; requests++; const t = req.resourceType(); byType[t] = (byType[t] || 0) + n; } catch (e) {}
      });
      await page.addInitScript(() => { window.__lcp = null; try { new PerformanceObserver((l) => { const e = l.getEntries().pop(); window.__lcp = { t: Math.round(e.startTime), el: e.element ? (e.element.tagName + (e.element.currentSrc ? " " + e.element.currentSrc.split("/").pop() : "")) : "" }; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch (e) {} });
      await page.goto(BASE + route, { waitUntil: "load" });
      await page.waitForTimeout(700);
      const atLoad = bytes;
      await page.waitForTimeout(2500);
      const lcp = await page.evaluate(() => window.__lcp);
      const cls = await page.evaluate(() => new Promise((res) => { let v = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch (e) {} setTimeout(() => res(Math.round(v * 1000) / 1000), 300); }));
      lab.push({ profile: name, route, requests, kbAtLoad: Math.round(atLoad / 1024), kbAfter3s: Math.round(bytes / 1024), byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])), largestPaint: lcp, layoutShift: cls });
      await ctx.close();
    }
  }
  await mkdir("_private/qa", { recursive: true });
  await writeFile(path.join("_private/qa", "lab-report.json"), JSON.stringify({ ran: new Date().toISOString(), note: "Local server, no network shaping, no compression: sizes are an upper bound, timings are not field data.", pages: lab }, null, 1), "utf8");
  for (const r of lab) console.log(`  ${r.profile.padEnd(7)} ${r.route.padEnd(28)} ${String(r.kbAtLoad).padStart(4)} KB at load, ${String(r.kbAfter3s).padStart(4)} KB after 3 s, shift ${r.layoutShift}`);
  const worst = Math.max(...lab.map((r) => r.layoutShift));
  expect(worst <= 0.1, "AC-54 stability: no measured page shifts its layout by more than 0.1 while loading", String(worst));
  const heaviest = lab.slice().sort((a, b) => b.kbAtLoad - a.kbAtLoad)[0];
  note("AC-54", `Largest layout shift while loading: ${worst}. Measured in Edge against a local server, so it is lab evidence, not what visitors experience.`);
  note("AC-55", `Heaviest measured page at load: ${heaviest.route} on ${heaviest.profile}, ${heaviest.kbAtLoad} KB uncompressed transfer from the local server.`);
}

await browser.close();
await mkdir("_private/qa", { recursive: true });
const stampNow = new Date().toISOString();
const browserName = edge ? `Microsoft Edge ${browserVersion} (Chromium) through Playwright, headless` : `WebKit ${browserVersion} (Safari's engine) through Playwright, headless`;
await writeFile(path.join("_private/qa", edge ? "check-report.json" : "check-report-webkit.json"), JSON.stringify({ ran: stampNow, base: BASE, browser: browserName, only: only || "everything", viewports: VIEWPORTS, routes: routes.length, passed: passes.length, failed: fails.length, fails }, null, 1), "utf8");

/* the acceptance scenarios, grouped: which checks answered each, and how they went */
if (runs("acceptance")) {
  const by = {};
  const add = (name, pass, detail) => { const m = /^AC-(\d\d)/.exec(name); if (!m) return; (by["AC-" + m[1]] = by["AC-" + m[1]] || { passed: 0, failed: 0, checks: [], notes: [] }); by["AC-" + m[1]][pass ? "passed" : "failed"]++; by["AC-" + m[1]].checks.push({ pass, name: name.replace(/^AC-\d\d\s*/, ""), ...(detail ? { detail } : {}) }); };
  passes.forEach((n) => add(n, true));
  failed.forEach((f) => add(f.name, false, f.detail));
  notes.forEach((n) => { const k = n.name.slice(0, 5); (by[k] = by[k] || { passed: 0, failed: 0, checks: [], notes: [] }).notes.push(n.text); });
  const ordered = Object.fromEntries(Object.keys(by).sort().map((k) => [k, by[k]]));
  await writeFile(path.join("_private/qa", edge ? "acceptance.json" : "acceptance-webkit.json"), JSON.stringify({ ran: stampNow, base: BASE, browser: browserName, only: only || "everything", scenarios: ordered }, null, 1), "utf8");
}
console.log(`\n${browserName}`);
console.log(`${passes.length} checks passed, ${fails.length} failed.`);
if (fails.length) process.exit(1);
