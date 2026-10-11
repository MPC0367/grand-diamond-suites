/* Quality checks in a real browser (Edge, through Playwright).

   Part 1, the sweep: every page in both languages at ten viewport sizes.
     no failed request, no script error, no sideways scroll, nothing wider
     than the screen outside a scrolling box, every image loaded, nothing
     left hidden by the reveal effect.
   Part 2, behaviour: the stay planner and its booking link, dialogs, the
     suite selector, the photograph viewer, comparison, the map explorer,
     gallery filter, enquiry helper, language switch, old section links,
     the 404 page, no JavaScript, reduced motion and keyboard basics.
   Part 3, accessibility scan (axe-core, WCAG 2.2 A and AA rules) on every
     page at a phone and a desktop width, and on the three dialogs.
   Part 4, lab figures: bytes transferred and the largest-paint element for
     the main pages. Timings come from a local server, so only the sizes
     are meaningful; they are recorded, not judged.

   Nothing here contacts the hotel's website: every request outside the
   local server is blocked. The one live check of the booking page is
   tools/probe-booking.mjs, run by hand and sparingly.

   Usage: node tools/check.mjs [--base=http://localhost:8321/grand-diamond-suites/] [--quick] [--only=sweep|behaviour] [--engine=webkit] */
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
const quick = !!arg("quick", false);
const only = arg("only", null);
const engine = arg("engine", "chromium"); /* "webkit" runs the same checks in Safari's engine */

const report = JSON.parse(await readFile("_private/build-report.json", "utf8"));
const routes = report.pages.map((p) => p.path);
const VIEWPORTS = quick
  ? [[390, 844], [1440, 900]]
  : [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [844, 390], [1920, 1080]];

const fails = [], passes = [];
const ok = (name) => passes.push(name);
const bad = (name, detail) => { fails.push(`${name}: ${detail}`); console.log("  x " + name + ": " + detail); };
const expect = (cond, name, detail = "") => (cond ? ok(name) : bad(name, detail || "failed"));

const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "msedge", headless: true });

async function newContext(opts = {}) {
  const ctx = await browser.newContext({ locale: "en-GB", timezoneId: "Asia/Bangkok", ...opts });
  /* stay on the local server: the hotel's site and any other host are never contacted */
  await ctx.route((url) => !String(url).startsWith(new URL(BASE).origin), (route) => route.abort());
  return ctx;
}

function watch(page, bucket) {
  page.on("pageerror", (e) => bucket.push("script error: " + String(e).slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|ERR_BLOCKED|net::/.test(m.text())) bucket.push("console: " + m.text().slice(0, 160)); });
  page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) bucket.push(r.status() + " " + r.url().slice(BASE.length)); });
}

/* ------------------------------------------------------------------ */
/* Part 1: the sweep                                                    */
/* ------------------------------------------------------------------ */
if (only !== "behaviour") {
  console.log(`Sweep: ${routes.length} pages x ${VIEWPORTS.length} viewports`);
  for (const [w, h] of VIEWPORTS) {
    const phone = w < 700 || h < 500;
    const ctx = await newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: phone && engine !== "webkit" ? true : undefined, hasTouch: phone });
    const page = await ctx.newPage();
    let problems = 0;
    for (const route of routes) {
      const errs = [];
      const listeners = [];
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
        const out = { overflow: document.documentElement.scrollWidth > vw + 1, wide: [], images: [], hidden: 0, h1: document.querySelectorAll("h1").length, lang: document.documentElement.lang };
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
      if (info.overflow) errs.push("page scrolls sideways");
      if (info.wide.length) errs.push("wider than the screen: " + [...new Set(info.wide)].slice(0, 4).join(", "));
      if (info.images.length) errs.push("image not loaded: " + info.images.slice(0, 2).join(", "));
      if (info.hidden) errs.push(info.hidden + " block(s) still hidden by the reveal effect");
      if (info.h1 !== 1) errs.push("H1 count " + info.h1);
      if (info.lang !== route.slice(0, 2)) errs.push("html lang is " + info.lang);
      page.off("pageerror", onErr); page.off("console", onCon); page.off("response", onRes);
      if (errs.length) { problems++; bad(`sweep ${w}x${h} ${route}`, errs.join(" | ")); } else ok(`sweep ${w}x${h} ${route}`);
    }
    console.log(`  ${w}x${h}: ${routes.length - problems}/${routes.length} clean`);
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* Part 2: behaviour                                                    */
/* ------------------------------------------------------------------ */
const bkkToday = () => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const o = {}; p.forEach((x) => (o[x.type] = x.value));
  return `${o.year}-${o.month}-${o.day}`;
};
const addDays = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const TODAY = bkkToday();

if (only !== "sweep") {
  console.log("Behaviour");
  /* ---------- desktop ---------- */
  {
    const ctx = await newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = []; watch(page, errs);
    const popups = []; ctx.on("page", (p) => { if (p !== page) popups.push(p); });

    await page.goto(BASE + "en/", { waitUntil: "load" });
    const go = "#hp-in >> xpath=ancestor::form//a[@data-go]";
    const href = () => page.getAttribute(go, "href");
    const msg = () => page.textContent("#hp-msg");

    expect((await href()) === "https://www.granddiamondsuites.com/booking?adults=2", "planner: no dates gives adults only", await href());

    const a = addDays(TODAY, 10), b = addDays(TODAY, 13);
    await page.fill("#hp-in", a);
    await page.fill("#hp-out", b);
    await page.selectOption("#hp-ad", "3");
    expect((await href()) === `https://www.granddiamondsuites.com/booking?date=${a}&nights=3&adults=3`, "planner: date, nights, adults", await href());
    expect(/3 nights, 3 adults/.test(await msg()), "planner: summary line", await msg());

    await page.selectOption("#hp-ch", "2");
    const before = popups.length;
    await page.click(go);
    await page.waitForTimeout(250);
    expect(popups.length === before && /age of each child/i.test(await msg()), "planner: children need ages before leaving", await msg());
    expect((await page.getAttribute("#hp-age1", "aria-invalid")) === "true", "planner: the empty age field is marked");
    await page.selectOption("#hp-age1", "5"); await page.selectOption("#hp-age2", "9");
    expect((await href()) === `https://www.granddiamondsuites.com/booking?date=${a}&nights=3&adults=3&children-age=5;9`, "planner: children by age", await href());
    expect(/2 children/.test(await msg()), "planner: summary names the children", await msg());

    /* three children, the oldest allowed age */
    await page.selectOption("#hp-ch", "3"); await page.selectOption("#hp-age3", "17");
    expect((await href()).endsWith("children-age=5;9;17"), "planner: three children", await href());
    await page.selectOption("#hp-ch", "0");
    expect(!(await href()).includes("children-age"), "planner: removing children removes them from the link", await href());

    /* check-out on or before check-in is moved forward and said so */
    await page.fill("#hp-in", addDays(TODAY, 20));
    expect((await page.inputValue("#hp-out")) === addDays(TODAY, 21) && /moved/i.test(await msg()), "planner: check-out follows check-in", (await page.inputValue("#hp-out")) + " / " + (await msg()));

    /* more than 30 nights */
    await page.fill("#hp-out", addDays(TODAY, 60));
    const n1 = popups.length; await page.click(go); await page.waitForTimeout(200);
    expect(popups.length === n1 && /30 nights/.test(await msg()), "planner: over 30 nights is refused with a reason", await msg());
    expect((await href()) === "https://www.granddiamondsuites.com/booking", "planner: an invalid stay leaves a plain booking link", await href());

    /* one date only */
    await page.fill("#hp-out", "");
    const n2 = popups.length; await page.click(go); await page.waitForTimeout(200);
    expect(popups.length === n2 && /both dates/i.test(await msg()), "planner: one date alone is refused", await msg());

    /* a date in the past */
    await page.fill("#hp-in", addDays(TODAY, -2));
    await page.fill("#hp-out", addDays(TODAY, 2));
    const n3 = popups.length; await page.click(go); await page.waitForTimeout(200);
    expect(popups.length === n3 && /earlier than today/i.test(await msg()), "planner: a past date is refused", await msg());

    /* same-day arrival is allowed */
    await page.fill("#hp-in", TODAY);
    await page.fill("#hp-out", addDays(TODAY, 1));
    expect((await href()) === `https://www.granddiamondsuites.com/booking?date=${TODAY}&nights=1&adults=3`, "planner: same-day arrival, one night", await href());

    /* the stay follows the visitor to another page and language */
    await page.goto(BASE + "th/suites/family-suite/", { waitUntil: "load" });
    expect((await page.inputValue("#sp-in")) === TODAY && (await page.inputValue("#sp-ad")) === "3", "planner: stay kept across pages");
    expect((await page.getAttribute("#sp-in >> xpath=ancestor::form//a[@data-go]", "href")) === `https://www.granddiamondsuites.com/th/booking?date=${TODAY}&nights=1&adults=3`, "planner: Thai pages hand over to the Thai booking page");

    /* header button opens the planner dialog, Escape closes it, focus returns */
    await page.click(".header-cta");
    expect(await page.evaluate(() => document.getElementById("plan-dialog").open), "dialog: header button opens the planner");
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id === "pd-in"), "dialog: focus moves into the planner");
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
    await page.waitForTimeout(500);
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
    await page.click(".section-head .arrow-link[href*='compare']");
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
    await page.click("[data-enquiry] button[type=submit]");
    expect((await page.textContent("#enq-message-err")).length > 5 && await page.evaluate(() => document.querySelector("[data-enquiry-out]").hidden), "enquiry: an empty question is refused");
    await page.fill("#enq-email", "not-an-email"); await page.fill("#enq-message", "Is the room free for twelve people?");
    await page.click("[data-enquiry] button[type=submit]");
    expect((await page.textContent("#enq-email-err")).length > 5, "enquiry: a malformed email is refused");
    await page.fill("#enq-email", "guest@example.com"); await page.fill("#enq-name", "A Guest");
    await page.click("[data-enquiry] button[type=submit]");
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

    /* keyboard: first Tab is the skip link, and it works */
    await page.goto(BASE + "en/dining/", { waitUntil: "load" });
    if (engine !== "webkit") {
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
  }

  /* ---------- phone ---------- */
  {
    const ctx = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = []; watch(page, errs);
    await page.goto(BASE + "en/", { waitUntil: "load" });
    expect(await page.evaluate(() => !document.querySelector("[data-mcta]").classList.contains("is-on")), "phone: booking bar waits while the hero button is on screen");
    await page.evaluate(() => window.scrollTo(0, 2400)); await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.querySelector("[data-mcta]").classList.contains("is-on")), "phone: booking bar appears after the hero");
    await page.tap("[data-mcta] [data-open-planner]");
    expect(await page.evaluate(() => document.getElementById("plan-dialog").open), "phone: booking bar opens the planner sheet");
    expect(await page.evaluate(() => !document.querySelector("[data-mcta]").classList.contains("is-on")), "phone: the bar hides behind a dialog");
    await page.tap("#plan-dialog [data-close]");
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
    await page.tap("[data-open-menu]");
    expect(await page.evaluate(() => document.getElementById("menu").open && document.querySelectorAll("#menu .menu__list a").length === 8), "phone: menu opens with all eight destinations");
    await page.tap("#menu [data-close]");
    expect(await page.evaluate(() => !document.getElementById("menu").open), "phone: menu closes");

    /* selector as an accordion */
    await page.goto(BASE + "en/suites/", { waitUntil: "load" });
    await page.tap('.finder__tab[data-suite="deluxe-suite"]');
    expect(await page.evaluate(() => !document.getElementById("f-deluxe-suite").hidden && document.getElementById("f-junior-suite").hidden), "phone: selector opens one suite and closes the other");
    await page.tap('.finder__tab[data-suite="deluxe-suite"]');
    expect(await page.evaluate(() => document.getElementById("f-deluxe-suite").hidden), "phone: an open suite can be closed");

    /* comparison shows two suites at a time */
    await page.goto(BASE + "en/suites/compare/?a=family-suite&b=penthouse-suite", { waitUntil: "load" });
    expect(await page.evaluate(() => { const vis = [...document.querySelectorAll(".compare thead th[data-col]")].filter((t) => getComputedStyle(t).display !== "none").map((t) => t.getAttribute("data-col")); return vis.join() === "family-suite,penthouse-suite"; }), "phone: comparison shows the two suites named in the link");
    await page.selectOption("[data-pick-a]", "penthouse-suite");
    expect(await page.evaluate(() => document.querySelector("[data-pick-b]").value !== "penthouse-suite" && [...document.querySelectorAll(".compare thead th[data-col]")].filter((t) => getComputedStyle(t).display !== "none").length === 2), "phone: the same suite cannot be picked twice");

    /* the map pans inside its own box and starts on the hotel */
    await page.goto(BASE + "en/location/", { waitUntil: "load" });
    await page.waitForTimeout(300);
    const pan = await page.evaluate(() => { const p = document.querySelector("[data-pan]"); const pin = p.querySelector(".pin--hotel").getBoundingClientRect(), box = p.getBoundingClientRect(); return { over: p.scrollWidth > p.clientWidth, tab: p.tabIndex, centred: Math.abs((pin.left + pin.width / 2) - (box.left + box.width / 2)) < 30, page: document.documentElement.scrollWidth <= innerWidth }; });
    expect(pan.over && pan.tab === 0 && pan.centred && pan.page, "phone: map scrolls in its box, starts on the hotel, reachable by keyboard", JSON.stringify(pan));
    await page.tap('.place[data-place="jim-thompson"] .place__btn');
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => { const p = document.querySelector("[data-pan]"); const pin = p.querySelector('[data-pin="jim-thompson"]').getBoundingClientRect(), box = p.getBoundingClientRect(); return pin.left >= box.left && pin.right <= box.right; }), "phone: choosing a place brings its pin into view");

    /* touch targets */
    await page.goto(BASE + "en/", { waitUntil: "load" });
    const small = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("a, button, select, input, summary")) {
        if (el.closest("dialog:not([open])") || el.closest(".faq__a") || el.closest("p, address, figcaption, li.reason") && el.tagName === "A" && !el.className) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none") continue;
        if (r.height < 24 || r.width < 24) out.push((el.className || el.tagName) + " " + Math.round(r.width) + "x" + Math.round(r.height));
      }
      return out;
    });
    expect(small.length === 0, "phone: no control smaller than 24 by 24", small.slice(0, 5).join(" | "));
    expect(errs.length === 0, "phone: no script errors or failed requests during the tests", errs.slice(0, 3).join(" | "));
    await ctx.close();
  }

  /* ---------- without JavaScript ---------- */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + "en/", { waitUntil: "load" });
    expect(await page.evaluate(() => document.documentElement.className === "no-js"), "no JavaScript: page knows");
    expect(await page.isVisible(".planner__plain a") && !(await page.isVisible("form.planner")), "no JavaScript: the planner becomes one plain booking link");
    expect((await page.getAttribute(".planner__plain a", "href")) === "https://www.granddiamondsuites.com/booking", "no JavaScript: the link goes to the official booking page");
    expect(await page.evaluate(() => [...document.querySelectorAll(".finder__panel")].every((p) => getComputedStyle(p).display !== "none")), "no JavaScript: all six suites are open");
    expect(await page.evaluate(() => [...document.querySelectorAll(".reveal")].every((e) => getComputedStyle(e).opacity === "1")), "no JavaScript: nothing waits for an effect");
    expect(await page.isVisible('.header-tools a.menu-btn[href="#footer-nav"]') || await page.isVisible('.nav a.nav__link[href="#footer-nav"]'), "no JavaScript: More and Menu lead to the footer links");
    await page.goto(BASE + "en/location/", { waitUntil: "load" });
    expect(await page.evaluate(() => [...document.querySelectorAll(".place__more")].every((p) => getComputedStyle(p).display !== "none") && document.querySelectorAll(".place").length === 12), "no JavaScript: every place and its details are listed");
    await page.goto(BASE + "en/suites/compare/", { waitUntil: "load" });
    expect(await page.evaluate(() => [...document.querySelectorAll(".compare thead th[data-col]")].every((t) => getComputedStyle(t).display !== "none")), "no JavaScript: the comparison shows all six suites");
    await page.goto(BASE + "en/contact/", { waitUntil: "load" });
    expect(await page.isVisible(".note.nojs-only") && !(await page.isVisible("[data-enquiry]")), "no JavaScript: the enquiry helper steps aside for plain contact details");
    await page.goto(BASE, { waitUntil: "load" });
    expect(await page.isVisible('a[href="en/"]') && await page.isVisible('a[href="th/"]'), "no JavaScript: the bare address offers both languages");
    await ctx.close();
  }

  /* ---------- reduced motion ---------- */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(BASE + "en/", { waitUntil: "load" });
    expect(await page.evaluate(() => !document.documentElement.classList.contains("anim")), "reduced motion: reveal effect is off");
    await page.waitForTimeout(8200);
    expect((await page.textContent("[data-hero-count]")).trim() === "01 / 03", "reduced motion: the hero does not advance by itself");
    expect((await page.getAttribute("[data-hero-pause]", "aria-label")) === "Play the photographs", "reduced motion: the sequence starts paused");
    await ctx.close();
  }

  /* ---------- the hero advances by itself otherwise, and pauses on request ---------- */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "th/", { waitUntil: "load" });
    await page.waitForTimeout(8800);
    expect((await page.textContent("[data-hero-count]")).trim() === "02 / 03", "hero: advances after seven seconds");
    await page.click("[data-hero-pause]");
    await page.waitForTimeout(7600);
    expect((await page.textContent("[data-hero-count]")).trim() === "02 / 03", "hero: pause holds the photograph");
    expect((await page.getAttribute("html", "lang")) === "th" && /ตรวจสอบห้องว่าง/.test(await page.textContent(".hero__actions")), "Thai: page language and wording");
    await ctx.close();
  }
}


/* ------------------------------------------------------------------ */
/* Part 2b: cases found in review, kept as regression checks            */
/* ------------------------------------------------------------------ */
if (only !== "sweep") {
  console.log("Regression cases");
  {
    const ctx = await newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const popups = []; ctx.on("page", (p) => { if (p !== page) popups.push(p); });
    const go = "#hp-in >> xpath=ancestor::form//a[@data-go]";
    const href = () => page.getAttribute(go, "href");

    /* one child with no age yet is not the same as no children */
    await page.goto(BASE + "en/", { waitUntil: "load" });
    await page.selectOption("#hp-ch", "1");
    expect(await page.isVisible("#hp-age1"), "planner: choosing one child shows its age field");
    await page.click(go); await page.waitForTimeout(200);
    expect(popups.length === 0 && await page.evaluate(() => document.activeElement.id === "hp-age1"), "planner: a missing age stops the handoff and takes focus");

    /* stepping the children back down leaves a complete link */
    const a = addDays(TODAY, 30), b = addDays(TODAY, 33);
    await page.fill("#hp-in", a); await page.fill("#hp-out", b); await page.selectOption("#hp-ad", "3");
    await page.selectOption("#hp-ch", "2"); await page.selectOption("#hp-ch", "1"); await page.selectOption("#hp-ch", "0");
    expect((await href()) === `https://www.granddiamondsuites.com/booking?date=${a}&nights=3&adults=3`, "planner: children 2, 1, 0 leaves dates and adults in the link", await href());

    /* every booking link withholds the referrer */
    expect(await page.evaluate(() => [...document.querySelectorAll('a[href*="granddiamondsuites.com/booking"], a[href*="granddiamondsuites.com/th/booking"]')].every((x) => /noreferrer/.test(x.rel) && /noopener/.test(x.rel))), "booking links: no referrer is sent to the hotel");

    /* Back shows the stay as it is now */
    await page.goto(BASE + "en/suites/family-suite/", { waitUntil: "load" });
    await page.selectOption("#sp-ad", "4"); await page.selectOption("#sp-ch", "2"); await page.selectOption("#sp-age1", "5"); await page.selectOption("#sp-age2", "9");
    await page.goBack({ waitUntil: "load" }); await page.waitForTimeout(400);
    expect((await page.inputValue("#hp-ad")) === "4" && (await page.inputValue("#hp-ch")) === "2" && (await href()).endsWith("adults=4&children-age=5;9"), "planner: after Back the form and the link agree with the stay", (await page.inputValue("#hp-ad")) + " / " + (await href()));

    /* Thai summary carries no Latin punctuation */
    await page.goto(BASE + "th/", { waitUntil: "load" });
    const thMsg = await page.textContent("#hp-msg");
    expect(/ตั้งแต่วันที่/.test(thMsg) && !/[,.]\s/.test(thMsg), "planner: Thai summary reads as Thai", thMsg);

    /* map explorer: a filter closes what it hides */
    await page.goto(BASE + "en/location/", { waitUntil: "load" });
    await page.click('.pin[data-pin="platinum"]');
    await page.click('[data-explorer] [data-filter="culture"]');
    expect(await page.evaluate(() => document.querySelectorAll('.place__btn[aria-expanded="true"]').length === 0 && document.querySelectorAll('.pin[aria-pressed="true"]').length === 0), "explorer: filtering closes a hidden place and releases its pin");

    /* enquiry helper */
    await page.goto(BASE + "en/contact/", { waitUntil: "load" });
    await page.fill("#enq-arrive", addDays(TODAY, 40)); await page.fill("#enq-depart", addDays(TODAY, 41));
    await page.click("[data-enquiry] button[type=submit]");
    expect(/\(1 night\)/.test(await page.textContent("[data-enquiry-text]")), "enquiry: one night is singular");
    await page.fill("#enq-message", "A change");
    expect(await page.evaluate(() => document.querySelector("[data-enquiry-out]").hidden), "enquiry: editing the form withdraws the earlier message");
    await page.evaluate(() => { document.getElementById("enq-arrive").value = "2026-13-45"; });
    expect(await page.evaluate(() => document.querySelector("[data-enquiry]").getAttribute("onsubmit") === "return false"), "enquiry: the form can never submit to a server");
    await page.goto(BASE + "th/contact/", { waitUntil: "load" });
    await page.fill("#enq-message", "ขอสอบถามรายละเอียดห้องพักสำหรับครอบครัวที่เดินทางพร้อมผู้สูงอายุและเด็กเล็ก ".repeat(6));
    await page.click("[data-enquiry] button[type=submit]");
    const longMail = await page.getAttribute("[data-enquiry-mail]", "href");
    expect(!longMail.includes("&body=") && longMail.length < 2000, "enquiry: a long message is not forced into the mail address", String(longMail.length));
    await ctx.close();
  }
  {
    /* phone: the planner sheet always fits, and the booking bar comes back after Escape */
    const ctx = await newContext({ viewport: { width: 320, height: 568 }, isMobile: engine !== "webkit" ? true : undefined, hasTouch: true });
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
  }
  {
    /* found on the live site after publishing */
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
    expect(await bare.evaluate(() => { const a = [...document.querySelectorAll("a[data-open-planner]")]; return a.length > 0 && a.every((x) => x.target === "_blank" && !!x.querySelector("[data-newtab-note]")); }), "no JavaScript: every booking button says it opens a new tab");
    await plain.close();

    const phone = await newContext({ viewport: { width: 390, height: 844 }, isMobile: engine !== "webkit" ? true : undefined, hasTouch: true });
    const small = await phone.newPage();
    await small.goto(BASE + "en/", { waitUntil: "load" });
    await small.tap("[data-open-menu]"); await small.waitForTimeout(300);
    expect(await small.evaluate(() => { const m = document.getElementById("menu"); return m.open && document.activeElement === m.querySelector("[data-close]"); }), "phone: the menu opens with focus on Close, not on the logo");
    expect(await small.evaluate(() => scrollY) === 0, "phone: the Close button's autofocus does not move the page");
    await phone.close();
  }
  if (engine !== "webkit") {
    /* web fonts that arrive late: the stand-in fonts hold the opening lines where they are.
       Edge only: Playwright's WebKit build for Windows resolves local("Georgia") but not a
       face name such as local("Georgia Italic"), so the italic and bold stand-ins never load
       there and the result says nothing about Safari. Safari needs a look on a real device. */
    const isWeb = (f) => /^"?(Newsreader|Manrope|Noto Sans Thai|Noto Serif Thai)"?$/.test(f);
    for (const [route, w, h] of [["en/", 1440, 900], ["en/", 1024, 768], ["en/", 390, 844], ["en/suites/", 1440, 900], ["en/location/", 390, 844], ["th/", 1440, 900], ["th/", 1024, 768], ["th/", 390, 844], ["th/location/", 390, 844]]) {
      const ctx = await newContext({ viewport: { width: w, height: h }, isMobile: w < 700 && engine !== "webkit" ? true : undefined, hasTouch: w < 700 });
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
      expect(!before.web.some(isWeb) && after.web.some(isWeb) && held, `late fonts: ${route} at ${w} keeps its opening lines in place`, JSON.stringify({ before: [before.main, before.h1, before.first], after: [after.main, after.h1, after.first], early: before.web.filter(isWeb) }));
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Part 3: accessibility scan                                           */
/* ------------------------------------------------------------------ */
const axeFindings = [];
if (!only && engine !== "webkit") {
  console.log("Accessibility scan (axe-core)");
  const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
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
    /* the three dialogs, open */
    await page.goto(BASE + "en/suites/penthouse-suite/", { waitUntil: "load" });
    if (w < 700) { await page.click("[data-open-menu]"); await scan("dialog: menu"); await page.keyboard.press("Escape"); }
    await page.evaluate(() => document.querySelector(".header-cta, [data-mcta] [data-open-planner]").click()); await page.waitForTimeout(200);
    await page.evaluate(() => { const d = document.getElementById("plan-dialog"); if (!d.open) d.showModal(); });
    await scan("dialog: planner"); await page.keyboard.press("Escape");
    await page.click(".mosaic__main .zoomable"); await page.waitForTimeout(300);
    await scan("dialog: viewer"); await page.keyboard.press("Escape");
    console.log(`  ${w} wide: ${clean} scans clean`);
    await ctx.close();
  }
  await mkdir("_private/qa", { recursive: true });
  await writeFile(path.join("_private/qa", "axe-report.json"), JSON.stringify({ ran: new Date().toISOString(), rules: TAGS, engine: "axe-core through @axe-core/playwright, in Microsoft Edge", findings: axeFindings }, null, 1), "utf8");
}

/* ------------------------------------------------------------------ */
/* Part 4: lab figures                                                  */
/* ------------------------------------------------------------------ */
if (!only && engine !== "webkit") {
  console.log("Lab figures");
  const lab = [];
  for (const [name, w, h, mobile] of [["phone", 390, 844, true], ["desktop", 1440, 900, false]]) {
    for (const route of ["en/", "en/suites/", "en/suites/penthouse-suite/", "en/location/", "en/gallery/", "th/"]) {
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
  await writeFile(path.join("_private/qa", "lab-report.json"), JSON.stringify({ ran: new Date().toISOString(), note: "Local server, no network shaping: sizes are meaningful, timings are not field data.", pages: lab }, null, 1), "utf8");
  for (const r of lab) console.log(`  ${r.profile.padEnd(7)} ${r.route.padEnd(28)} ${String(r.kbAtLoad).padStart(4)} KB at load, ${String(r.kbAfter3s).padStart(4)} KB after 3 s, shift ${r.layoutShift}`);
  const worst = Math.max(...lab.map((r) => r.layoutShift));
  expect(worst <= 0.1, "lab: no page shifts its layout by more than 0.1", String(worst));
}

await browser.close();
await mkdir("_private/qa", { recursive: true });
const stampNow = new Date().toISOString();
await writeFile(path.join("_private/qa", engine === "webkit" ? "check-report-webkit.json" : "check-report.json"), JSON.stringify({ ran: stampNow, base: BASE, browser: engine === "webkit" ? "WebKit (Safari's engine) through Playwright, headless" : "Microsoft Edge (Chromium) through Playwright, headless", viewports: VIEWPORTS, routes: routes.length, passed: passes.length, failed: fails.length, fails }, null, 1), "utf8");
console.log(`\n${passes.length} checks passed, ${fails.length} failed.`);
if (fails.length) process.exit(1);
