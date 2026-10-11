/* Grand Diamond Suites concept: browser behaviour.
   No library. Every feature starts from working HTML and leaves it working
   if this file fails to load: links stay links, all content is in the page. */
(function () {
  "use strict";

  var d = document;
  var root = d.documentElement;
  var boot = {};
  try { boot = JSON.parse(d.getElementById("boot").textContent); } catch (e) { boot = { t: {}, viewer: {}, booking: {} }; }
  var T = boot.t || {};

  var $ = function (sel, el) { return (el || d).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || d).querySelectorAll(sel)); };
  var fmt = function (s, vars) { return String(s || "").replace(/\{(\w+)\}/g, function (_, k) { return vars && k in vars ? vars[k] : ""; }); };
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---- session memory (never personal text, never required) ---- */
  var store = {
    get: function (k) { try { return JSON.parse(sessionStorage.getItem("gd:" + k)); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem("gd:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---- dates: calendar days in Bangkok, arithmetic in UTC so no day shifts ---- */
  var ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  function bangkokToday() {
    try {
      var p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      return o.year + "-" + o.month + "-" + o.day;
    } catch (e) {
      var n = new Date(Date.now() + 7 * 3600 * 1000);
      return n.toISOString().slice(0, 10);
    }
  }
  function toUTC(iso) {
    var m = ISO.exec(iso || "");
    if (!m) return NaN;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var back = new Date(t);
    if (back.getUTCFullYear() !== +m[1] || back.getUTCMonth() !== +m[2] - 1 || back.getUTCDate() !== +m[3]) return NaN;
    return t;
  }
  function addDays(iso, n) { return new Date(toUTC(iso) + n * 86400000).toISOString().slice(0, 10); }
  function nightsBetween(a, b) { return Math.round((toUTC(b) - toUTC(a)) / 86400000); }
  function showDate(iso) {
    try { return new Intl.DateTimeFormat(boot.locale || "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(toUTC(iso))); }
    catch (e) { return iso; }
  }
  function adultsText(n) { return n === 1 ? T.adultsOne : fmt(T.adultsMany, { n: n }); }

  /* ---- dialogs ---- */
  var canDialog = typeof HTMLDialogElement === "function" && typeof HTMLDialogElement.prototype.showModal === "function";
  var openers = [];
  function openDialog(dlg, opener) {
    if (!dlg || !canDialog || dlg.open) return false;
    openers.push({ dlg: dlg, el: opener || d.activeElement });
    dlg.showModal();
    root.classList.add("has-dialog");
    return true;
  }
  function restoreFocus(dlg) {
    for (var i = openers.length - 1; i >= 0; i--) {
      if (openers[i].dlg !== dlg) continue;
      var el = openers[i].el;
      openers.splice(i, 1);
      if (el && el.isConnected && el.getClientRects().length && typeof el.focus === "function") el.focus({ preventScroll: true });
      return;
    }
  }
  $$("dialog").forEach(function (dlg) {
    dlg.addEventListener("close", function () {
      if (!$("dialog[open]")) root.classList.remove("has-dialog");
      syncBar();
      restoreFocus(dlg);
    });
    dlg.addEventListener("click", function (ev) { if (ev.target === dlg) dlg.close(); });
    $$("[data-close]", dlg).forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
  });

  /* ==================================================================== */
  /* Stay planner                                                          */
  /* One state for every planner on the page. The link it builds carries   */
  /* only what the booking provider documents and the booking page was     */
  /* seen to honour: date, nights, adults, children-age.                   */
  /* ==================================================================== */
  var planners = $$("[data-planner]").map(function (form) {
    var block = form.closest(".planner-block") || form.parentNode;
    return {
      form: form,
      inp: $("[data-in]", form), out: $("[data-out]", form), ad: $("[data-adults]", form), kids: $("[data-kids]", form),
      agesBox: $("[data-ages]", form), ageFields: $$("[data-age-field]", form), ages: $$("[data-age]", form),
      go: $("[data-go]", form), msg: $("[data-msg]", block),
      room: form.getAttribute("data-room-type") || ""
    };
  });
  var B = boot.booking || {};
  /* without the booking details the planners stay the plain links they are in the HTML */
  if (!B.page || !B.host) planners = [];
  function loadStay() {
    var s = store.get("stay");
    if (!s || typeof s !== "object" || Array.isArray(s)) s = {};
    var date = function (v) { return typeof v === "string" && !isNaN(toUTC(v)) ? v : ""; };
    var age = function (v) {
      var n = typeof v === "number" ? v : typeof v === "string" && /^\d{1,2}$/.test(v) ? +v : NaN;
      return n % 1 === 0 && n >= 0 && n <= B.maxChildAge ? String(n) : "";
    };
    var out = {
      in: date(s.in), out: date(s.out),
      adults: Math.min(Math.max(parseInt(s.adults, 10) || 2, 1), B.maxAdults || 2),
      kids: (Array.isArray(s.kids) ? s.kids : []).slice(0, B.maxChildren || 0).map(age)
    };
    /* a stay whose arrival has passed is dropped, not handed over */
    if (out.in && out.in < bangkokToday()) { out.in = ""; out.out = ""; }
    return out;
  }
  var stay = loadStay();
  var lastGo = 0;

  function guestsText(adults, kids) {
    var s = adultsText(adults);
    if (kids.length) s += (T.sep || ", ") + (kids.length === 1 ? T.childrenOne : fmt(T.childrenMany, { n: kids.length }));
    return s;
  }
  /* a room type is added only on a suite page whose suite has an identifier from the hotel */
  function withRoom(url, room) {
    return room && /^\d+(,\d+)*$/.test(room) && url !== B.page ? url + "&room-type=" + room : url;
  }

  /* values are whole numbers and ISO dates only, so the address is written plainly */
  function bookingLink(params) {
    try {
      var u = new URL(B.page);
      if (u.host !== B.host || u.protocol !== "https:") return B.page;
    } catch (e) { return B.page; }
    var parts = [];
    if (params.date) { parts.push("date=" + params.date); parts.push("nights=" + params.nights); }
    parts.push("adults=" + params.adults);
    if (params.ages && params.ages.length) parts.push("children-age=" + params.ages.join(";"));
    return B.page + "?" + parts.join("&");
  }

  function validate() {
    var today = bangkokToday();
    var res = { ok: true, field: null, ageIndex: -1, text: "", info: "", url: B.page };
    var a = stay.in, b = stay.out;
    var adults = Math.min(Math.max(parseInt(stay.adults, 10) || 2, 1), B.maxAdults);
    var ages = [];
    for (var i = 0; i < stay.kids.length; i++) {
      var v = stay.kids[i];
      if (v === "" || v === null || isNaN(parseInt(v, 10)) || +v < 0 || +v > B.maxChildAge) {
        res.ok = false; res.field = "age"; res.ageIndex = i; res.text = T.msgAges; return res;
      }
      ages.push(parseInt(v, 10));
    }
    /* no dates: the booking page opens with its own dates and these guests */
    if (!a && !b) { res.url = bookingLink({ adults: adults, ages: ages }); return res; }
    if (!a || !b) { res.ok = false; res.field = a ? "out" : "in"; res.text = T.msgNeedBoth; return res; }
    if (isNaN(toUTC(a))) { res.ok = false; res.field = "in"; res.text = T.msgInvalid; return res; }
    if (isNaN(toUTC(b))) { res.ok = false; res.field = "out"; res.text = T.msgInvalid; return res; }
    if (a < today) { res.ok = false; res.field = "in"; res.text = fmt(T.msgPast, { date: showDate(today) }); return res; }
    var n = nightsBetween(a, b);
    if (n < 1) { res.ok = false; res.field = "out"; res.text = T.msgOrder; return res; }
    if (n > B.maxNights) { res.ok = false; res.field = "out"; res.text = fmt(T.msgLong, { n: B.maxNights }); return res; }
    res.url = bookingLink({ date: a, nights: n, adults: adults, ages: ages });
    res.info = fmt(T.msgStay || "{s}. {a} to {b}", { s: fmt(n === 1 ? T.msgNight : T.msgNights, { n: n, a: guestsText(adults, ages) }), a: showDate(a), b: showDate(b) });
    return res;
  }

  function paintPlanners(note) {
    var today = bangkokToday();
    var res = validate();
    planners.forEach(function (p) {
      if (p.inp.value !== stay.in) p.inp.value = stay.in;
      if (p.out.value !== stay.out) p.out.value = stay.out;
      p.inp.classList.toggle("is-empty", !stay.in); p.out.classList.toggle("is-empty", !stay.out);
      if (String(p.ad.value) !== String(stay.adults)) p.ad.value = String(stay.adults);
      if (p.kids && String(p.kids.value) !== String(stay.kids.length)) p.kids.value = String(stay.kids.length);
      if (p.agesBox) {
        p.agesBox.hidden = stay.kids.length === 0;
        p.ageFields.forEach(function (f, i) {
          f.hidden = i >= stay.kids.length;
          f.classList.remove("is-invalid");
          var sel = p.ages[i];
          sel.removeAttribute("aria-invalid");
          var want = i < stay.kids.length ? String(stay.kids[i]) : "";
          if (sel.value !== want) sel.value = want;
        });
      }
      p.inp.min = today;
      p.out.min = stay.in && !isNaN(toUTC(stay.in)) ? addDays(stay.in, 1) : addDays(today, 1);
      /* until the details are valid the link stays a plain link to the booking page */
      p.go.href = res.ok ? withRoom(res.url, p.room) : B.page;
      [p.inp, p.out].forEach(function (el) { el.removeAttribute("aria-invalid"); el.closest(".field").classList.remove("is-invalid"); });
      if (p.msg) {
        p.msg.className = "planner__msg is-info";
        p.msg.textContent = note || (res.ok ? res.info : "");
      }
    });
    return res;
  }

  function showError(p, res) {
    var el = res.field === "in" ? p.inp : res.field === "out" ? p.out : p.ages[res.ageIndex];
    if (!el) return;
    el.setAttribute("aria-invalid", "true");
    el.closest(".field").classList.add("is-invalid");
    if (p.msg) { p.msg.className = "planner__msg is-error"; p.msg.textContent = res.text; }
    el.focus();
  }

  /* one child with no age yet must not look the same as no children */
  var staySig = function () { return JSON.stringify([stay.in, stay.out, stay.adults, stay.kids]); };
  planners.forEach(function (p) {
    function read(changed) {
      var note = "", before = staySig();
      stay.in = p.inp.value; stay.out = p.out.value; stay.adults = parseInt(p.ad.value, 10) || 2;
      if (p.kids) {
        var count = Math.min(parseInt(p.kids.value, 10) || 0, B.maxChildren);
        var next = [];
        for (var i = 0; i < count; i++) next.push(changed === "kids" ? (i < stay.kids.length ? stay.kids[i] : "") : p.ages[i].value);
        stay.kids = next;
      }
      if (changed === "in" && stay.in && !isNaN(toUTC(stay.in)) && stay.out && stay.out <= stay.in) {
        stay.out = addDays(stay.in, 1);
        note = fmt(T.msgAdjusted, { date: showDate(stay.out) });
      }
      if (staySig() === before) return;
      store.set("stay", stay);
      paintPlanners(note);
    }
    /* a date field reports a finished date through "input" in some browsers and "change" in others */
    ["input", "change"].forEach(function (evt) {
      p.inp.addEventListener(evt, function () { read("in"); });
      p.out.addEventListener(evt, function () { read("out"); });
    });
    p.ad.addEventListener("change", function () { read("ad"); });
    if (p.kids) p.kids.addEventListener("change", function () { read("kids"); });
    p.ages.forEach(function (sel) { sel.addEventListener("change", function () { read("age"); }); });
    p.go.addEventListener("click", function (ev) {
      read("go");
      var res = validate();
      if (!res.ok) { ev.preventDefault(); showError(p, res); return; }
      /* set at the moment of the click, so a link painted for an earlier state can never be followed */
      p.go.href = withRoom(res.url, p.room);
      var now = Date.now();
      if (now - lastGo < 1200) { ev.preventDefault(); return; }
      lastGo = now;
    });
    p.form.addEventListener("submit", function (ev) { ev.preventDefault(); p.go.click(); });
  });
  if (planners.length) paintPlanners();
  /* a page restored by the Back button shows the stay as it is now, not as it was when the page was left */
  addEventListener("pageshow", function (ev) {
    if (!ev.persisted || !planners.length) return;
    stay = loadStay();
    paintPlanners();
  });

  /* open the planner dialog from any booking button */
  var planDialog = d.getElementById("plan-dialog");
  var dock = $("[data-dock]");
  $$("[data-open-planner]").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
      /* on the home page the planner is already on screen for wide viewports */
      if (a.hasAttribute("data-prefer-dock") && dock && dock.offsetParent !== null && innerWidth >= 900) {
        ev.preventDefault();
        var first = $("[data-in]", dock);
        if (first) { first.focus({ preventScroll: true }); dock.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); }
        return;
      }
      var menu = d.getElementById("menu");
      var from = a;
      if (menu && menu.open) { from = $("[data-open-menu]"); menu.close(); }
      if (openDialog(planDialog, from)) {
        ev.preventDefault();
        var inp = $("[data-in]", planDialog);
        if (inp) inp.focus();
      }
    });
  });

  /* ==================================================================== */
  /* Header: menu, "More", progress line, language switch                  */
  /* ==================================================================== */
  $$("[data-open-menu]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (openDialog(d.getElementById("menu"), b)) return;
      var nav = d.getElementById("footer-nav");
      if (nav) { nav.scrollIntoView(); nav.focus({ preventScroll: true }); }
    });
  });

  var moreBtn = $("[data-more]");
  if (moreBtn) {
    var panel = d.getElementById("more-panel");
    var setMore = function (open, refocus) {
      moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
      panel.hidden = !open;
      if (!open && refocus) moreBtn.focus();
    };
    moreBtn.addEventListener("click", function () { setMore(panel.hidden); });
    d.addEventListener("click", function (ev) { if (!panel.hidden && !moreBtn.parentNode.contains(ev.target)) setMore(false); });
    d.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !panel.hidden) setMore(false, true); });
    moreBtn.parentNode.addEventListener("focusout", function (ev) {
      if (!panel.hidden && ev.relatedTarget && !moreBtn.parentNode.contains(ev.relatedTarget)) setMore(false);
    });
  }

  $$("[data-lang-switch]").forEach(function (a) {
    var base = a.getAttribute("href");
    var carry = function () { a.setAttribute("href", base + location.search + location.hash); };
    a.addEventListener("pointerdown", carry);
    a.addEventListener("focus", carry);
    a.addEventListener("click", function () {
      carry();
      try { localStorage.setItem("gd:lang", a.getAttribute("hreflang")); } catch (e) {}
    });
  });

  var progress = $(".progress");
  var bar = $("[data-mcta]");
  var heroCta = $("[data-hero-cta]");
  function syncBar() {
    if (!bar) return;
    var show;
    if (heroCta) show = heroCta.getBoundingClientRect().bottom < 60;
    else show = (window.scrollY || root.scrollTop) > 240;
    var ae = d.activeElement;
    if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName) && ae.getClientRects().length) show = false;
    if ($("dialog[open]")) show = false;
    bar.classList.toggle("is-on", !!show);
  }
  function reserveBar() {
    /* the width a classic scrollbar takes, so full-bleed parts can line up with the page column */
    root.style.setProperty("--sbw", Math.max(0, innerWidth - root.clientWidth) + "px");
    if (!bar) return;
    var small = innerWidth < 1040;
    root.style.setProperty("--mcta-h", small ? bar.offsetHeight + "px" : "0px");
  }
  d.addEventListener("focusin", syncBar);
  d.addEventListener("focusout", function () { setTimeout(syncBar, 60); });

  /* ==================================================================== */
  /* Reveal on first view (measured, never dependent on an observer)       */
  /* ==================================================================== */
  var pending = root.classList.contains("anim") ? $$(".reveal") : [];
  function revealPass(all) {
    if (!pending.length) return;
    var vh = innerHeight || root.clientHeight;
    pending = pending.filter(function (el) {
      if (all || el.getBoundingClientRect().top < vh * 0.93) { el.classList.add("is-in"); return false; }
      return true;
    });
  }

  var lastPass = 0, trailing = null;
  function onScroll() {
    var now = Date.now();
    if (now - lastPass < 40) {
      /* a single jump (an anchor link, a restored position) must not be lost to the throttle */
      if (!trailing) trailing = setTimeout(function () { trailing = null; onScroll(); }, 60);
      return;
    }
    lastPass = now;
    if (progress) {
      var max = root.scrollHeight - innerHeight;
      progress.style.setProperty("--p", max > 0 ? Math.min(1, Math.max(0, (window.scrollY || root.scrollTop) / max)).toFixed(4) : "0");
    }
    revealPass(false);
    syncBar();
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", function () { lastPass = 0; onScroll(); reserveBar(); });
  addEventListener("load", function () { lastPass = 0; onScroll(); reserveBar(); });
  onScroll(); reserveBar();
  /* a page that is never painted or scrolled must not keep content hidden */
  setTimeout(function () { if (d.visibilityState === "hidden") revealPass(true); }, 1500);
  setTimeout(function () { lastPass = 0; onScroll(); }, 600);

  /* ==================================================================== */
  /* Photographs: source sets, hero sequence, selector stage, viewer       */
  /* ==================================================================== */
  var V = boot.viewer || {};
  var mediaBase = boot.mediaBase || "";
  function setFor(m, ext) { return (ext === "avif" ? m.wa : m.ww).map(function (w) { return mediaBase + m.f + "-" + w + "." + ext + " " + w + "w"; }).join(", "); }
  function jpgFor(m) { return mediaBase + m.f + "-" + m.j + ".jpg"; }

  /* hero */
  var hero = $("[data-hero]");
  if (hero) {
    var slides = $$(".hero__slide", hero);
    var cur = 0, timer = null, playing = !reduce && slides.length > 1, userStopped = false, hydrated = false;
    var kName = $("[data-hero-name]", hero), kCap = $("[data-hero-cap]", hero), kCount = $("[data-hero-count]", hero), kLive = $("[data-hero-live]", hero);
    var pauseBtn = $("[data-hero-pause]", hero);
    var hydrate = function () {
      if (hydrated) return; hydrated = true;
      slides.forEach(function (s) {
        var m = V[s.getAttribute("data-photo") || ""];
        if (!m || s.firstChild) return;
        var pic = d.createElement("picture");
        [["image/avif", "avif"], ["image/webp", "webp"]].forEach(function (t) {
          var so = d.createElement("source"); so.type = t[0]; so.sizes = "(min-width: 900px) 58vw, 100vw"; so.srcset = setFor(m, t[1]); pic.appendChild(so);
        });
        var im = d.createElement("img");
        im.alt = m.alt; im.width = m.w; im.height = m.h; im.decoding = "async";
        im.style.setProperty("--fx", m.fx + "%"); im.style.setProperty("--fy", m.fy + "%");
        if (m.fxn !== undefined) im.style.setProperty("--fxn", m.fxn + "%");
        im.src = jpgFor(m);
        pic.appendChild(im); s.appendChild(pic);
      });
    };
    var show = function (i, manual) {
      hydrate();
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle("is-on", j === cur); s.setAttribute("aria-hidden", j === cur ? "false" : "true"); });
      var s = slides[cur];
      if (kName) {
        var href = s.getAttribute("data-href");
        kName.innerHTML = "";
        if (href) { var a = d.createElement("a"); a.href = href; a.textContent = s.getAttribute("data-name"); kName.appendChild(a); }
        else kName.textContent = s.getAttribute("data-name");
      }
      if (kCap) kCap.textContent = s.getAttribute("data-cap");
      if (kCount) kCount.textContent = ("0" + (cur + 1)).slice(-2) + " / " + ("0" + slides.length).slice(-2);
      if (manual && kLive) kLive.textContent = s.getAttribute("data-name") + (T.stop || ". ") + s.getAttribute("data-cap");
    };
    var paintPause = function () {
      if (!pauseBtn) return;
      pauseBtn.setAttribute("aria-label", playing ? T.pause : T.play);
      pauseBtn.classList.toggle("is-paused", !playing);
      hero.classList.toggle("is-paused", !playing);
    };
    var tick = function () {
      clearTimeout(timer);
      if (!playing || d.hidden) return;
      timer = setTimeout(function () {
        var r = hero.getBoundingClientRect();
        var held = kName && (kName.contains(d.activeElement) || kName.matches(":hover"));
        if (!held && r.bottom > 80 && r.top < innerHeight) show(cur + 1, false);
        tick();
      }, 7000);
    };
    var stop = function () { playing = false; userStopped = true; clearTimeout(timer); paintPause(); };
    var pv = $("[data-hero-prev]", hero), nx = $("[data-hero-next]", hero);
    if (pv) pv.addEventListener("click", function () { stop(); show(cur - 1, true); });
    if (nx) nx.addEventListener("click", function () { stop(); show(cur + 1, true); });
    if (pauseBtn) pauseBtn.addEventListener("click", function () {
      if (playing) stop(); else { playing = true; userStopped = false; paintPause(); tick(); }
    });
    d.addEventListener("visibilitychange", function () { if (!d.hidden && playing && !userStopped) tick(); else clearTimeout(timer); });
    if (slides.length < 2) { $$("[data-hero-ctl]", hero).forEach(function (el) { el.hidden = true; }); }
    paintPause();
    addEventListener("load", function () {
      setTimeout(function () {
        /* a visitor who asked the browser to save data gets the first photograph only, until they ask for more */
        if (navigator.connection && navigator.connection.saveData) { playing = false; paintPause(); }
        if (playing) { hydrate(); tick(); }
      }, 1200);
    });
  }

  /* selector */
  $$("[data-finder]").forEach(function (finder) {
    var tabs = $$(".finder__tab", finder);
    var wide = function () { return innerWidth >= 1000; };
    var select = function (tab, opts) {
      opts = opts || {};
      var wasOpen = tab.getAttribute("aria-expanded") === "true";
      if (wasOpen && wide()) return;
      tabs.forEach(function (t) {
        var open = t === tab ? !wasOpen || wide() : false;
        t.setAttribute("aria-expanded", open ? "true" : "false");
        d.getElementById(t.getAttribute("aria-controls")).hidden = !open;
      });
      store.set("suite", tab.getAttribute("data-suite"));
      if (!wide() && !opts.quiet) {
        var top = tab.getBoundingClientRect().top;
        if (top < 70 || top > innerHeight * 0.6) tab.scrollIntoView({ block: "start", behavior: "auto" });
      }
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (ev) {
        var to = null;
        if (ev.key === "ArrowDown") to = tabs[(i + 1) % tabs.length];
        else if (ev.key === "ArrowUp") to = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (ev.key === "Home") to = tabs[0];
        else if (ev.key === "End") to = tabs[tabs.length - 1];
        if (to) { ev.preventDefault(); to.focus(); if (wide()) select(to, { quiet: true }); }
      });
    });
    var wanted = (location.hash.match(/^#suite-([a-z-]+)$/) || [])[1] || store.get("suite");
    if (wanted) {
      var t0 = tabs.filter(function (t) { return t.getAttribute("data-suite") === wanted; })[0];
      if (t0 && t0.getAttribute("aria-expanded") !== "true") {
        tabs.forEach(function (t) { t.setAttribute("aria-expanded", "false"); d.getElementById(t.getAttribute("aria-controls")).hidden = true; });
        t0.setAttribute("aria-expanded", "true"); d.getElementById(t0.getAttribute("aria-controls")).hidden = false;
      }
    }
    /* a wide layout always shows one suite */
    addEventListener("resize", function () {
      if (wide() && !tabs.some(function (t) { return t.getAttribute("aria-expanded") === "true"; })) {
        tabs[0].setAttribute("aria-expanded", "true"); d.getElementById(tabs[0].getAttribute("aria-controls")).hidden = false;
      }
    });
  });

  /* stage: thumbnails change the large photograph in place */
  $$("[data-stage]").forEach(function (stage) {
    var open = $("[data-stage-open]", stage), img = $("img", open), cap = $("[data-stage-cap]", stage), count = $("[data-stage-count]", stage);
    var thumbs = $$("[data-thumb]", stage);
    var ids = thumbs.map(function (t) { return t.getAttribute("data-id"); });
    open.setAttribute("data-set", ids.join(","));
    thumbs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        var m = V[ids[i]];
        if (!m || open.getAttribute("data-id") === ids[i]) return;
        thumbs.forEach(function (x) { x.removeAttribute("aria-current"); });
        t.setAttribute("aria-current", "true");
        open.setAttribute("data-id", ids[i]);
        if (cap) cap.textContent = m.capShort || m.cap;
        if (count) count.textContent = fmt(T.photoOf, { i: i + 1, n: ids.length });
        var swap = function () {
          var pic = img.parentNode;
          $$("source", pic).forEach(function (s) { s.srcset = setFor(m, s.type === "image/avif" ? "avif" : "webp"); });
          img.alt = m.alt; img.width = m.w; img.height = m.h;
          img.style.setProperty("--fx", m.fx + "%"); img.style.setProperty("--fy", m.fy + "%");
          img.src = jpgFor(m);
          var done = function () { img.classList.remove("is-swapping"); };
          if (img.decode) img.decode().then(done, done); else done();
        };
        if (reduce) swap(); else { img.classList.add("is-swapping"); setTimeout(swap, 180); }
      });
    });
  });

  /* viewer */
  var viewer = d.getElementById("viewer");
  if (viewer && canDialog) {
    var vImg = $("[data-img]", viewer), vCap = $("[data-cap]", viewer), vLink = $("[data-link]", viewer), vCount = $("[data-count]", viewer);
    var items = [], at = 0;
    var paint = function () {
      var m = V[items[at]];
      if (!m) return;
      vImg.removeAttribute("srcset");
      vImg.sizes = "100vw";
      vImg.width = m.w; vImg.height = m.h; vImg.alt = m.alt;
      vImg.srcset = setFor(m, "webp");
      vImg.src = jpgFor(m);
      vCap.textContent = m.cap;
      if (m.href && m.href !== location.pathname) { vLink.hidden = false; vLink.href = m.href; } else vLink.hidden = true;
      vCount.textContent = fmt(T.photoOf, { i: at + 1, n: items.length });
      var one = items.length < 2;
      $("[data-prev]", viewer).hidden = one; $("[data-next]", viewer).hidden = one;
      [at + 1, at - 1].forEach(function (k) {
        var n = V[items[(k + items.length) % items.length]];
        if (n && !one) { var pre = new Image(); pre.sizes = "100vw"; pre.srcset = setFor(n, "webp"); }
      });
    };
    var step = function (n) { at = (at + n + items.length) % items.length; paint(); };
    d.addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest("[data-viewer]") : null;
      if (!b) return;
      var id = b.getAttribute("data-id");
      var set = b.getAttribute("data-set");
      if (set) items = set.split(",");
      else {
        var g = b.getAttribute("data-viewer");
        items = [];
        $$('[data-viewer="' + g + '"]').forEach(function (x) {
          var fig = x.closest(".shot");
          if (fig && fig.classList.contains("is-hidden")) return;
          var xid = x.getAttribute("data-id");
          if (items.indexOf(xid) < 0) items.push(xid);
        });
      }
      items = items.filter(function (x) { return V[x]; });
      at = Math.max(0, items.indexOf(id));
      if (!items.length) return;
      paint();
      openDialog(viewer, b);
    });
    $("[data-prev]", viewer).addEventListener("click", function () { step(-1); });
    $("[data-next]", viewer).addEventListener("click", function () { step(1); });
    viewer.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft") { ev.preventDefault(); step(-1); }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); step(1); }
    });
    var tx = null;
    viewer.addEventListener("touchstart", function (ev) { tx = ev.touches.length === 1 ? ev.changedTouches[0].clientX : null; }, { passive: true });
    viewer.addEventListener("touchend", function (ev) {
      if (tx === null || ev.touches.length || (window.visualViewport && visualViewport.scale > 1.01)) { tx = null; return; }
      var dx = ev.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 48) step(dx > 0 ? -1 : 1);
    }, { passive: true });
    viewer.addEventListener("close", function () { vImg.removeAttribute("srcset"); vImg.removeAttribute("src"); });
  }

  /* ==================================================================== */
  /* Compare: two suites side by side on narrow screens                    */
  /* ==================================================================== */
  var cmp = $("[data-compare]");
  if (cmp) {
    var selA = $("[data-pick-a]"), selB = $("[data-pick-b]");
    var slugs = $$("option", selA).map(function (o) { return o.value; });
    var paintCmp = function (push) {
      $$("[data-col]", cmp).forEach(function (cell) {
        var s = cell.getAttribute("data-col");
        cell.classList.toggle("is-shown", s === selA.value || s === selB.value);
      });
      store.set("compare", [selA.value, selB.value]);
      if (push) {
        try {
          var u = new URL(location.href);
          u.searchParams.set("a", selA.value); u.searchParams.set("b", selB.value);
          history.replaceState(null, "", u.toString());
        } catch (e) {}
      }
    };
    var fixSame = function (changed, other) {
      if (changed.value === other.value) other.value = slugs.filter(function (s) { return s !== changed.value; })[0];
    };
    var saved = store.get("compare"), q = new URLSearchParams(location.search);
    var a0 = q.get("a") || (saved && saved[0]), b0 = q.get("b") || (saved && saved[1]);
    if (slugs.indexOf(a0) >= 0) selA.value = a0;
    if (slugs.indexOf(b0) >= 0) selB.value = b0;
    fixSame(selA, selB);
    selA.addEventListener("change", function () { fixSame(selA, selB); paintCmp(true); });
    selB.addEventListener("change", function () { fixSame(selB, selA); paintCmp(true); });
    paintCmp(false);
  }

  /* ==================================================================== */
  /* Location explorer                                                     */
  /* ==================================================================== */
  var ex = $("[data-explorer]");
  if (ex) {
    var chips = $$("[data-filter]", ex), rows = $$(".place", ex), pins = $$("[data-pin]", ex), countEl = $("[data-count]", ex);
    var filterTo = function (kind) {
      var n = 0;
      chips.forEach(function (ch) { ch.setAttribute("aria-pressed", ch.getAttribute("data-filter") === kind ? "true" : "false"); });
      rows.forEach(function (r) {
        var on = kind === "all" || r.getAttribute("data-kind") === kind;
        r.hidden = !on;
        if (on) n++; else { $(".place__btn", r).setAttribute("aria-expanded", "false"); $(".place__more", r).hidden = true; }
      });
      pins.forEach(function (p) {
        var on = kind === "all" || p.getAttribute("data-kind") === kind;
        p.classList.toggle("is-dim", !on);
        if (p.tagName === "BUTTON") p.disabled = !on;
        if (!on) p.setAttribute("aria-pressed", "false");
      });
      if (countEl) countEl.textContent = fmt(T.showing, { n: n });
    };
    var panTo = function (pin) {
      var pan = pin.closest ? pin.closest("[data-pan]") : null;
      if (!pan || pan.scrollWidth - pan.clientWidth < 4) return;
      pan.scrollTo({ left: Math.max(0, pin.offsetLeft - pan.clientWidth / 2), behavior: reduce ? "auto" : "smooth" });
    };
    var choose = function (id, from) {
      rows.forEach(function (r) {
        var btn = $(".place__btn", r), more = $(".place__more", r);
        var on = r.getAttribute("data-place") === id && btn.getAttribute("aria-expanded") !== "true";
        if (r.getAttribute("data-place") === id && from === "pin") on = true;
        btn.setAttribute("aria-expanded", on ? "true" : "false");
        more.hidden = !on;
        if (on && from === "pin") {
          if (r.hidden) filterTo("all");
          btn.focus({ preventScroll: true });
          var rr = r.getBoundingClientRect();
          if (rr.top < 90 || rr.bottom > innerHeight - 20) r.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
        }
      });
      pins.forEach(function (p) {
        var row = rows.filter(function (r) { return r.getAttribute("data-place") === p.getAttribute("data-pin"); })[0];
        var on = !!(row && $(".place__btn", row).getAttribute("aria-expanded") === "true");
        p.setAttribute("aria-pressed", on ? "true" : "false");
        if (on && from === "list") panTo(p);
      });
    };
    chips.forEach(function (ch) { ch.addEventListener("click", function () { filterTo(ch.getAttribute("data-filter")); }); });
    rows.forEach(function (r) { $(".place__btn", r).addEventListener("click", function () { choose(r.getAttribute("data-place"), "list"); }); });
    pins.forEach(function (p) { if (p.tagName === "BUTTON") p.addEventListener("click", function () { choose(p.getAttribute("data-pin"), "pin"); }); });
    rows.forEach(function (r) { $(".place__more", r).hidden = true; $(".place__btn", r).setAttribute("aria-expanded", "false"); });
    filterTo("all");
  }

  $$("[data-pan]").forEach(function (pan) {
    var fit = function () {
      var over = pan.scrollWidth - pan.clientWidth;
      if (over > 4) {
        pan.tabIndex = 0; pan.setAttribute("role", "group"); pan.setAttribute("aria-label", pan.getAttribute("data-label") || "");
        if (!pan.hasAttribute("data-centred")) {
          pan.scrollLeft = Math.max(0, Math.min(over, pan.scrollWidth * (parseFloat(pan.getAttribute("data-cx")) || 50) / 100 - pan.clientWidth / 2));
          pan.setAttribute("data-centred", "");
        }
      } else { pan.removeAttribute("tabindex"); pan.removeAttribute("role"); pan.removeAttribute("aria-label"); }
    };
    fit();
    addEventListener("resize", fit);
    addEventListener("load", fit);
  });

  /* the comparison box is a tab stop only while it really scrolls */
  $$(".table-scroll").forEach(function (box) {
    var label = box.getAttribute("aria-label") || "";
    var fit = function () {
      if (box.scrollWidth - box.clientWidth > 4) { box.tabIndex = 0; box.setAttribute("role", "region"); box.setAttribute("aria-label", label); }
      else { box.removeAttribute("tabindex"); box.removeAttribute("role"); box.removeAttribute("aria-label"); }
    };
    fit();
    addEventListener("resize", fit);
    addEventListener("load", fit);
  });

  /* near-by rows on the home page light their pin */
  $$("[data-near]").forEach(function (li) {
    var pin = $('[data-pin="' + li.getAttribute("data-near") + '"]');
    if (!pin) return;
    var on = function () { pin.classList.add("is-lit"); }, off = function () { pin.classList.remove("is-lit"); };
    li.addEventListener("mouseenter", on); li.addEventListener("mouseleave", off);
    li.addEventListener("focusin", on); li.addEventListener("focusout", off);
  });

  /* copy the address */
  $$("[data-copy]").forEach(function (b) {
    var status = d.getElementById(b.getAttribute("aria-describedby") || "") || $("[data-copy-status]", b.parentNode.parentNode);
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      var ok = function () { if (status) { status.className = "copy-status"; status.textContent = T.copied; } };
      var bad = function () { if (status) { status.className = "copy-status status is-error"; status.textContent = T.copyFailed; } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, bad); else bad();
    });
  });

  var openFromHash = function () {
    var id = "";
    try { id = decodeURIComponent((location.hash || "").slice(1)); } catch (e) {}
    var el = id ? d.getElementById(id) : null;
    if (el && el.tagName === "DETAILS") el.open = true;
  };
  addEventListener("hashchange", openFromHash);
  openFromHash();

  /* ==================================================================== */
  /* Gallery filter                                                        */
  /* ==================================================================== */
  var gal = $("[data-gallery]");
  if (gal) {
    var gChips = $$("[data-filter]", gal), figs = $$(".shot", gal), gCount = $("[data-count]", gal);
    var apply = function (key, push) {
      var n = 0;
      if (!gChips.some(function (c) { return c.getAttribute("data-filter") === key; })) key = "all";
      gChips.forEach(function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-filter") === key ? "true" : "false"); });
      figs.forEach(function (f) {
        var on = key === "all" || f.getAttribute("data-group") === key;
        f.classList.toggle("is-hidden", !on); if (on) n++;
      });
      if (gCount) gCount.textContent = fmt(T.photosShown, { n: n });
      $$(".gallery-group", gal).forEach(function (g) { g.hidden = !$(".shot:not(.is-hidden)", g); });
      if (push) {
        try {
          var u = new URL(location.href);
          if (key === "all") u.searchParams.delete("filter"); else u.searchParams.set("filter", key);
          history.replaceState(null, "", u.toString());
        } catch (e) {}
      }
    };
    gChips.forEach(function (c) { c.addEventListener("click", function () { apply(c.getAttribute("data-filter"), true); }); });
    apply(new URLSearchParams(location.search).get("filter") || "all", false);
  }

  /* ==================================================================== */
  /* Enquiry composer: writes a message here, sends nothing                */
  /* ==================================================================== */
  var enq = $("[data-enquiry]");
  if (enq) {
    var outBox = $("[data-enquiry-out]"), pre = $("[data-enquiry-text]"), copyBtn = $("[data-enquiry-copy]"), mailBtn = $("[data-enquiry-mail]"), eStatus = $("[data-enquiry-status]");
    var L = JSON.parse(enq.getAttribute("data-labels"));
    var mailLong = false;
    var val = function (n) { var el = enq.elements[n]; return el ? String(el.value || "").trim() : ""; };
    var hintDates = function () { ["arrive", "depart"].forEach(function (n) { var el = enq.elements[n]; if (el) el.classList.toggle("is-empty", !el.value); }); };
    enq.addEventListener("input", hintDates); enq.addEventListener("change", hintDates);
    var setErr = function (name, text) {
      var el = enq.elements[name]; if (!el || !el.closest) return;
      var box = el.closest(".control"), err = $(".err", box);
      box.classList.toggle("is-invalid", !!text);
      if (text) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
      if (err) err.textContent = text || "";
    };
    enq.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var first = null, bad = function (n, t) { setErr(n, t); if (!first) first = enq.elements[n]; };
      ["email", "arrive", "depart", "message"].forEach(function (n) { setErr(n, ""); });
      var email = val("email"), a = val("arrive"), b = val("depart"), msg = val("message");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad("email", L.errEmail);
      var badDate = function (v) { return !!v && (isNaN(toUTC(v)) || v < "2000-01-01"); };
      if (badDate(a)) bad("arrive", T.msgInvalid);
      if (badDate(b)) bad("depart", T.msgInvalid);
      if (!badDate(a) && !badDate(b)) {
        if ((a && !b) || (!a && b)) bad(a ? "depart" : "arrive", L.errBoth);
        else if (a && b && b <= a) bad("depart", L.errOrder);
      }
      if (!msg && !a) bad("message", L.errMessage);
      if (first) { first.focus(); outBox.hidden = true; return; }
      var intent = (enq.querySelector('input[name="intent"]:checked') || {}).value || "";
      var lines = [L.greeting, ""];
      lines.push(L.subject + ": " + (L.intents[intent] || intent));
      if (a && b) { var nn = nightsBetween(a, b); lines.push(L.dates + ": " + showDate(a) + " " + L.to + " " + showDate(b) + " (" + nn + " " + (nn === 1 ? L.night : L.nights) + ")"); }
      if (val("party")) lines.push(L.party + ": " + val("party"));
      if (val("suite")) lines.push(L.suite + ": " + val("suite"));
      if (msg) { lines.push(""); lines.push(msg); }
      lines.push("");
      if (val("name")) lines.push(val("name"));
      if (email) lines.push(email);
      if (val("phone")) lines.push(val("phone"));
      var text = lines.join("\n");
      pre.textContent = text;
      /* mail handlers cut very long addresses, so a long message opens the app with its subject only */
      var subject = encodeURIComponent(L.mailSubject + ": " + (L.intents[intent] || intent));
      var body = encodeURIComponent(text.replace(/\n/g, "\r\n"));
      var mailBase = "mailto:" + enq.getAttribute("data-to") + "?subject=" + subject;
      mailLong = mailBase.length + 6 + body.length > 1900;
      mailBtn.href = mailLong ? mailBase : mailBase + "&body=" + body;
      eStatus.className = "status"; eStatus.textContent = "";
      outBox.hidden = false;
      outBox.focus();
    });
    /* an edited form withdraws the earlier message, so what is copied is always what is shown in the form */
    enq.addEventListener("input", function () { outBox.hidden = true; eStatus.textContent = ""; });
    copyBtn.addEventListener("click", function () {
      var ok = function () { eStatus.className = "status is-ok"; eStatus.textContent = L.copied; };
      var bad = function () { eStatus.className = "status is-error"; eStatus.textContent = L.copyFailed; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pre.textContent).then(ok, bad); else bad();
    });
    mailBtn.addEventListener("click", function () { eStatus.className = "status"; eStatus.textContent = mailLong ? L.mailLong : L.mailHint; });
    var pre0 = new URLSearchParams(location.search).get("about");
    if (pre0 && enq.elements.intent) $$('input[name="intent"]', enq).forEach(function (r) { if (r.value === pre0) r.checked = true; });
    var su = new URLSearchParams(location.search).get("suite");
    if (su && enq.elements.suite) $$("option", enq.elements.suite).forEach(function (o) { if (o.getAttribute("data-slug") === su) enq.elements.suite.value = o.value; });
    if (stay.in && stay.out && enq.elements.arrive && !enq.elements.arrive.value) { enq.elements.arrive.value = stay.in; enq.elements.depart.value = stay.out; }
    hintDates();
  }
})();
