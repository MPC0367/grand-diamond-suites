/* Grand Diamond Suites concept: browser behaviour.
   No library. Every feature starts from working HTML and leaves it working
   if this file fails to load: links stay links, all content is in the page. */
(function () {
  "use strict";

  /* tells the page's own small script that this file arrived; without it the page goes back to its plain version */
  window.__gd = 1;
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
  /* the same breakpoints as the stylesheet, in em so that they follow the reader's text size as it does */
  var wideEnough = function (em) { try { return matchMedia("(min-width: " + em + ")").matches; } catch (e) { return innerWidth >= parseFloat(em) * 16; } };

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
  /* "21 to 25 November 2026": the month and the year are said once when both dates share them */
  function showRange(a, b) {
    try {
      var f = new Intl.DateTimeFormat(boot.locale || "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
      var parts = function (iso) { var o = {}; f.formatToParts(new Date(toUTC(iso))).forEach(function (p) { if (p.type !== "literal") o[p.type] = p.value; }); return o; };
      var x = parts(a), y = parts(b), to = " " + (T.to || "to") + " ";
      if (!x.day || !x.month || !x.year) throw 0;
      if (x.year !== y.year) return x.day + " " + x.month + " " + x.year + to + y.day + " " + y.month + " " + y.year;
      if (x.month !== y.month) return x.day + " " + x.month + to + y.day + " " + y.month + " " + y.year;
      return x.day + to + y.day + " " + y.month + " " + y.year;
    } catch (e) { return showDate(a) + " " + (T.to || "to") + " " + showDate(b); }
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
      form: form, block: block,
      inp: $("[data-in]", form), out: $("[data-out]", form), ad: $("[data-adults]", form), kids: $("[data-kids]", form),
      agesBox: $("[data-ages]", form), ageFields: $$("[data-age-field]", form), ages: $$("[data-age]", form),
      go: $("[data-go]", form), msg: $("[data-msg]", block), live: $("[data-live]", block),
      recover: $("[data-recover]", block), rBook: $("[data-recover-book]", block), rAsk: $("[data-recover-ask]", block),
      rAskLabel: $("[data-recover-ask-label]", block), rNote: $("[data-recover-note]", block),
      hDates: $("[data-h-dates]", block), hGuests: $("[data-h-guests]", block), clear: $("[data-clear-dates]", block),
      fit: $("[data-fit]", block),
      room: form.getAttribute("data-room-type") || "",
      suite: block.getAttribute("data-suite") || "", suiteName: block.getAttribute("data-suite-name") || "",
      suiteMax: parseInt(block.getAttribute("data-suite-max"), 10) || 0
    };
  });
  var B = boot.booking || {};
  /* without the booking details the planners stay the plain links they are in the HTML */
  if (!B.page || !B.host) planners = [];
  /* a stay the visitor has set at some point; the enquiry helper offers it, and never a default */
  var stayStored = false;
  function loadStay() {
    var s = store.get("stay");
    stayStored = !!s && typeof s === "object" && !Array.isArray(s);
    if (!stayStored) s = {};
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
  var saveStay = function () { store.set("stay", stay); stayStored = true; };

  function nightsText(n) { return n === 1 ? T.nightsOne : fmt(T.nightsMany, { n: n }); }
  function agesText(kids) {
    var labels = kids.map(function (v) { return +v === 0 ? T.ageUnder1Short : fmt(T.ageYears, { n: +v }); });
    if (labels.length < 2) return labels.join("");
    return labels.slice(0, -1).join(T.sep || ", ") + (T.and || " and ") + labels[labels.length - 1];
  }
  /* "4 adults, 2 children aged 4 and 9": the party as a guest would say it */
  function guestsText(adults, kids) {
    var s = adultsText(adults);
    if (!kids.length) return s;
    s += (T.sep || ", ") + (kids.length === 1 ? T.childrenOne : fmt(T.childrenMany, { n: kids.length }));
    var known = kids.every(function (v) { return v !== "" && v !== null && !isNaN(parseInt(v, 10)); });
    return s + " " + (known ? fmt(T.agedList, { ages: agesText(kids) }) : "(" + T.agesNeeded + ")");
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
    if (params.adults) parts.push("adults=" + params.adults);
    if (params.adults && params.ages && params.ages.length) parts.push("children-age=" + params.ages.join(";"));
    return parts.length ? B.page + "?" + parts.join("&") : B.page;
  }

  /* One reading of the stay. state is one of:
       empty        no dates: the booking page opens with its own dates and these guests
       valid        dates and guests the booking page was seen to take as entered
       invalid      something to correct here (a missing age, half a date range, a past date)
       unsupported  a request the booking page does not take as entered (too many nights
                    or guests): nothing is shortened or dropped, two other routes are offered */
  function validate() {
    var today = bangkokToday();
    var res = { ok: true, state: "empty", field: null, ageIndex: -1, text: "", info: "", url: B.page, bypass: B.page, why: "", nights: 0, total: 0 };
    var a = stay.in, b = stay.out;
    var adults = Math.min(Math.max(parseInt(stay.adults, 10) || 2, 1), B.maxAdults);
    var ages = [];
    res.total = adults + stay.kids.length;
    var fail = function (field, text, i) { res.ok = false; res.state = "invalid"; res.field = field; res.text = text; res.ageIndex = i === undefined ? -1 : i; return res; };
    var n = 0;
    if (a || b) {
      if (!a) return fail("in", T.msgNeedIn || T.msgNeedBoth);
      if (!b) return fail("out", T.msgNeedOut || T.msgNeedBoth);
      if (isNaN(toUTC(a))) return fail("in", T.msgInvalid);
      if (isNaN(toUTC(b))) return fail("out", T.msgInvalid);
      if (a < today) return fail("in", fmt(T.msgPast, { date: showDate(today) }));
      n = nightsBetween(a, b);
      if (n < 1) return fail("out", T.msgOrder);
    }
    res.nights = n;
    /* more guests than one search takes: said at once, before any age is asked for. Only the dates travel. */
    if (res.total > (B.maxGuests || 99)) {
      res.ok = false; res.state = "unsupported"; res.why = "party";
      res.text = fmt(T.msgParty, { n: B.maxGuests, m: res.total });
      res.bypass = bookingLink({ date: n ? a : "", nights: n });
      return res;
    }
    for (var i = 0; i < stay.kids.length; i++) {
      var v = stay.kids[i];
      if (v === "" || v === null || isNaN(parseInt(v, 10)) || +v < 0 || +v > B.maxChildAge) return fail("age", T.msgAges, i);
      ages.push(parseInt(v, 10));
    }
    /* more nights than the booking page showed it takes: the dates and guests travel as entered, nothing is shortened */
    if (n > B.maxNights) {
      res.ok = false; res.state = "unsupported"; res.why = "long";
      res.text = fmt(T.msgLong, { n: B.maxNights, m: n });
      res.bypass = bookingLink({ date: a, nights: n, adults: adults, ages: ages });
      return res;
    }
    res.url = bookingLink({ date: n ? a : "", nights: n, adults: adults, ages: ages });
    if (n) {
      res.state = "valid";
      res.info = fmt(T.msgStay || "{s}. {a} to {b}", { s: fmt(n === 1 ? T.msgNight : T.msgNights, { n: n, a: guestsText(adults, ages) }), a: showDate(a), b: showDate(b) });
    } else res.info = guestsText(adults, ages);
    return res;
  }

  function datesLine() {
    var a = stay.in, b = stay.out;
    if (!a && !b) return T.notSelected;
    if (!a || !b || isNaN(toUTC(a)) || isNaN(toUTC(b))) return T.datesPartial;
    if (nightsBetween(a, b) < 1) return T.msgOrder;
    return fmt(T.datesRange, { r: showRange(a, b), n: nightsText(nightsBetween(a, b)) });
  }

  function paintFit(p, res) {
    if (!p.fit) return;
    var over = p.suiteMax && res.total > p.suiteMax && res.state !== "unsupported";
    p.fit.hidden = !over;
    if (!over) return;
    p.fit.textContent = fmt(T.fitOver, { suite: p.suiteName, n: p.suiteMax, m: res.total }) + " ";
    var others = (boot.suites || []).filter(function (s) { return s.o >= res.total && s.s !== p.suite; });
    if (others.length) {
      p.fit.appendChild(d.createTextNode(fmt(T.fitOthers, { m: res.total }) + " "));
      others.forEach(function (s, i) {
        var a = d.createElement("a"); a.className = "link"; a.href = s.h; a.textContent = s.n;
        p.fit.appendChild(a);
        p.fit.appendChild(d.createTextNode(i < others.length - 1 ? (T.sep || ", ") : (T.stop || ". ")));
      });
    }
    p.fit.appendChild(d.createTextNode(T.fitRooms));
  }

  function paintPlanners(note) {
    var today = bangkokToday();
    var res = validate();
    var unsupported = res.state === "unsupported";
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
      /* Set only when it changes. Writing a date field's min again, even to the same value, makes the browser
         rebuild the field, and a year being typed digit by digit is lost half way. */
      var outMin = stay.in && !isNaN(toUTC(stay.in)) ? addDays(stay.in, 1) : addDays(today, 1);
      if (p.inp.min !== today) p.inp.min = today;
      if (p.out.min !== outMin) p.out.min = outMin;
      /* until the details are valid the link stays a plain link to the booking page */
      p.go.href = res.ok ? withRoom(res.url, p.room) : B.page;
      [p.inp, p.out].forEach(function (el) { el.removeAttribute("aria-invalid"); el.closest(".field").classList.remove("is-invalid"); });
      if (p.msg) {
        p.msg.className = "planner__msg " + (unsupported ? "is-limit" : "is-info");
        p.msg.textContent = [note, unsupported ? res.text : ""].filter(Boolean).join(" ");
      }
      if (p.recover) {
        p.recover.hidden = !unsupported;
        if (unsupported) {
          var party = res.why === "party";
          p.rBook.href = res.bypass;
          p.rAsk.href = p.rAsk.getAttribute(party ? "data-ask-group" : "data-ask-long");
          if (p.rAskLabel) p.rAskLabel.textContent = p.rAsk.getAttribute(party ? "data-label-group" : "data-label-long");
          if (p.rNote) p.rNote.textContent = (party ? T.recoverNoteParty : T.recoverNoteLong) + " " + T.recoverNoteAsk;
        }
      }
      if (p.hDates) p.hDates.textContent = datesLine();
      if (p.hGuests) p.hGuests.textContent = guestsText(stay.adults, stay.kids);
      if (p.clear) p.clear.hidden = !(stay.in || stay.out);
      if (p.live) p.live.textContent = note ? "" : (res.ok && res.state === "valid" ? res.info : "");
      paintFit(p, res);
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
      saveStay();
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
    /* leaving for the booking page: the address is set at the moment of the click, so a link painted
       for an earlier state can never be followed, and a second click straight after is ignored */
    var leave = function (ev, link, url) {
      link.href = url;
      var now = Date.now();
      if (now - lastGo < 1200) { ev.preventDefault(); return; }
      lastGo = now;
    };
    p.go.addEventListener("click", function (ev) {
      read("go");
      var res = validate();
      if (res.state === "unsupported") {
        /* not an error to correct: show the two ways forward and put the keyboard on the first */
        ev.preventDefault(); paintPlanners();
        if (p.rBook) p.rBook.focus();
        return;
      }
      if (!res.ok) { ev.preventDefault(); showError(p, res); return; }
      leave(ev, p.go, withRoom(res.url, p.room));
    });
    if (p.rBook) p.rBook.addEventListener("click", function (ev) {
      var res = validate();
      if (res.state !== "unsupported") { ev.preventDefault(); paintPlanners(); return; }
      leave(ev, p.rBook, res.bypass);
    });
    if (p.clear) p.clear.addEventListener("click", function () {
      stay.in = ""; stay.out = "";
      saveStay();
      paintPlanners(T.msgCleared);
      p.inp.focus();
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
  /* a tab left open past midnight in Bangkok: the earliest date moves on, and a stay that has slipped into the past says so */
  d.addEventListener("visibilitychange", function () { if (!d.hidden && planners.length) paintPlanners(); });

  /* Reaching the stay planner. A page that has a planner of its own (the home page, a suite page, rates,
     how booking works) uses that one for every "Check dates" control: one planner on the page, and a
     suite page keeps its suite. Every other page opens the planner as a sheet. Without this script the
     controls are plain links: to the planner on the page, or to the hotel's booking page. */
  var planDialog = d.getElementById("plan-dialog");
  var dock = $("[data-dock]");
  var goDock = function () {
    if (!dock || !planners.length || dock.offsetParent === null) return false;
    dock.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    var coarse = false;
    try { coarse = matchMedia("(pointer: coarse)").matches; } catch (e) {}
    /* a keyboard lands in the first field; on a touch screen focusing a date field would open its picker unasked */
    var to = coarse ? (dock.hasAttribute("tabindex") ? dock : dock.closest("[tabindex]") || dock) : $("[data-in]", dock);
    if (to) to.focus({ preventScroll: true });
    return true;
  };
  $$("[data-prefer-dock]").forEach(function (a) {
    a.addEventListener("click", function (ev) { if (goDock()) ev.preventDefault(); });
  });
  $$("[data-open-planner]").forEach(function (a) {
    /* the control opens the planner in the page, so it no longer says it opens a new tab */
    if ((dock && planners.length) || (canDialog && planDialog)) { var note = $("[data-newtab-note]", a); if (note) note.parentNode.removeChild(note); }
    a.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
      var menu = d.getElementById("menu");
      var from = a;
      if (menu && menu.open) {
        from = $("[data-open-menu]");
        /* going to the planner on the page: the menu must not pull focus back to its button as it closes */
        if (dock && planners.length && dock.offsetParent !== null) openers = openers.filter(function (o) { return o.dlg !== menu; });
        menu.close();
      }
      if (goDock()) { ev.preventDefault(); return; }
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
  var overHead = $(".site-header[data-over]"), rail = $("[data-rail]"), railLinks = rail ? $$("a", rail) : [];
  var railFor = railLinks.map(function (a) { return d.getElementById(a.getAttribute("href").slice(1)); });
  var bar = $("[data-mcta]");
  var heroCta = $("[data-hero-cta]");
  function syncBar() {
    if (!bar) return;
    var show;
    if (heroCta) show = heroCta.getBoundingClientRect().bottom < 60;
    else show = (window.scrollY || root.scrollTop) > 240;
    /* while the page's own planner is on screen the bar would only point at what is already there */
    var dk = $("[data-dock]");
    if (show && dk && dk.offsetParent !== null) {
      var dr = dk.getBoundingClientRect();
      if (dr.top < innerHeight - 120 && dr.bottom > 120) show = false;
    }
    var ae = d.activeElement;
    if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName) && ae.getClientRects().length) show = false;
    if ($("dialog[open]")) show = false;
    bar.classList.toggle("is-on", !!show);
  }
  function reserveBar() {
    /* the width a classic scrollbar takes, so full-bleed parts can line up with the page column */
    root.style.setProperty("--sbw", Math.max(0, innerWidth - root.clientWidth) + "px");
    if (!bar) return;
    var small = !wideEnough("65em");
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
    var y = window.scrollY || root.scrollTop;
    if (overHead) overHead.classList.toggle("is-solid", y > 6);
    if (rail) {
      var at = -1;
      railFor.forEach(function (sec, i) { if (sec && sec.getBoundingClientRect().top < innerHeight * 0.45) at = i; });
      var last = railFor[railFor.length - 1];
      if (last && last.getBoundingClientRect().bottom < innerHeight * 0.3) at = -1;
      railLinks.forEach(function (a, i) { if (i === at) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      rail.classList.toggle("is-on", at > -1);
    }
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

  /* The time in Bangkok, and today's sunset at the hotel (the usual astronomical formula, to the minute,
     which is why it says "about"). */
  var clocks = $$("[data-clock]"), sunEl = $("[data-sunset]");
  if (clocks.length || sunEl) {
    var two = function (n) { return ("0" + n).slice(-2); };
    var tick2 = function () {
      try {
        var hm = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(new Date());
        clocks.forEach(function (el) { el.textContent = el.getAttribute("data-fmt").replace("{t}", hm); el.hidden = false; });
        /* Ploy Restaurant: which published service is on now, if any */
        var sv = $("[data-serving]");
        if (sv) {
          var mins = function (t) { return +t.slice(0, 2) * 60 + +t.slice(3, 5); }, nowM = mins(hm), on = null;
          JSON.parse(sv.getAttribute("data-serving")).forEach(function (s) { if (nowM >= mins(s.o) && nowM < mins(s.c)) on = s; });
          sv.hidden = !on;
          if (on) sv.textContent = sv.getAttribute("data-fmt").replace("{name}", on.n).replace("{end}", on.c);
        }
      } catch (e) {}
    };
    tick2(); setInterval(tick2, 20000);
    if (sunEl) {
      var now = new Date(), day = Math.floor((now - Date.UTC(now.getUTCFullYear(), 0, 0)) / 864e5), g = 2 * Math.PI / 365 * (day - 0.5), rd = Math.PI / 180;
      var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
      var dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
      var lat = 13.7504 * rd, ha = Math.acos(Math.cos(90.833 * rd) / (Math.cos(lat) * Math.cos(dec)) - Math.tan(lat) * Math.tan(dec)) / rd;
      var m = Math.round(720 - 4 * (100.5385 - ha) - eq + 420);
      sunEl.textContent = sunEl.getAttribute("data-fmt").replace("{t}", two(Math.floor(m / 60) % 24) + ":" + two(m % 60));
      sunEl.hidden = false;
    }
  }

  /* the suite count counts up once, as it comes into view */
  var counters = reduce ? [] : $$("[data-count]").filter(function (el) { return /^\d+$/.test(el.textContent); });
  var countPass = function () {
    counters = counters.filter(function (el) {
      if (el.getBoundingClientRect().top > innerHeight * 0.9) return true;
      var to = +el.getAttribute("data-count"), t0 = 0;
      var step = function (t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 1300); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      return false;
    });
  };
  if (counters.length) { counters.forEach(function (el) { if (el.getBoundingClientRect().top > innerHeight * 0.9) el.textContent = "0"; }); addEventListener("scroll", countPass, { passive: true }); countPass(); }
  /* the photo band moves a little slower than the page */
  var bands = reduce ? [] : $$(".band__media");
  if (bands.length) {
    var bandRaf = 0;
    var bandPass = function () {
      bandRaf = 0;
      bands.forEach(function (b) { var r = b.parentNode.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; b.style.transform = "translate3d(0," + ((r.top + r.height / 2 - innerHeight / 2) * -0.08).toFixed(1) + "px,0)"; });
    };
    addEventListener("scroll", function () { if (!bandRaf) bandRaf = requestAnimationFrame(bandPass); }, { passive: true });
    bandPass();
  }
  /* the reel: it drifts on its own, slowly and without end, and can still be swiped (touch), dragged
     (mouse) or moved a card at a time with its buttons. The photographs are followed by a copy of
     themselves, hidden from screen readers and the Tab key, and the strip steps back by one set's width
     as it reaches the copy, so the join never shows. A copy opens the viewer like its original (the
     viewer counts each photograph once). The drift holds while the mouse is over the strip, for a moment
     after a touch, a wheel or a button, while the keyboard is in it and while a photograph is open; the
     pause button stops it for good, and with reduced motion it starts stopped. */
  $$("[data-reel]").forEach(function (reel) {
    var track = $("[data-reel-track]", reel), pv = $("[data-reel-prev]", reel), nx = $("[data-reel-next]", reel), pa = $("[data-reel-pause]", reel);
    if (!track) return;
    var cards = [].slice.call(track.children), loop = cards.length > 2;
    if (loop) {
      cards.forEach(function (card) {
        var k = card.cloneNode(true);
        k.setAttribute("aria-hidden", "true"); k.classList.add("is-copy");
        $$("[id]", k).forEach(function (e) { e.removeAttribute("id"); });
        $$("[aria-describedby]", k).forEach(function (e) { e.removeAttribute("aria-describedby"); });
        $$("a, button, input, select, textarea, [tabindex]", k).forEach(function (e) { e.setAttribute("tabindex", "-1"); });
        track.appendChild(k);
      });
      reel.classList.add("is-loop");
    } else if (pa) pa.hidden = true;
    var setW = 0, pos = 0, going = false, grab = null, hover = false, held = false, restAt = 0, visible = false, auto = loop && !reduce, raf = 0, last = 0;
    var measureSet = function () { setW = loop ? track.children[cards.length].offsetLeft - cards[0].offsetLeft : 0; };
    var rest = function (ms) { restAt = Date.now() + (ms || 2500); };
    var by = function (dir) {
      var card = track.firstElementChild, step = card ? card.getBoundingClientRect().width + 18 : track.clientWidth * 0.8;
      if (setW) { var x = track.scrollLeft; if (dir > 0 && x + step >= setW) track.scrollLeft = x - setW; else if (dir < 0 && x - step < 0) track.scrollLeft = x + setW; }
      rest(1200);
      track.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
    };
    var ends = function () {
      if (setW) { if (pv) pv.disabled = false; if (nx) nx.disabled = false; return; }
      if (pv) pv.disabled = track.scrollLeft < 4; if (nx) nx.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4;
    };
    /* past the end of the first set, or back before its start: the same picture, one set along */
    var wrap = function () {
      if (!setW) return;
      var x = track.scrollLeft, dx = x >= setW ? -setW : x < 1 && !going ? setW : 0;
      if (!dx) return;
      track.scrollLeft = x + dx; pos = x + dx;
      if (grab) grab.left += dx;
    };
    if (pv) pv.addEventListener("click", function () { by(-1); });
    if (nx) nx.addEventListener("click", function () { by(1); });
    track.addEventListener("scroll", function () { wrap(); ends(); }, { passive: true });
    addEventListener("resize", function () { measureSet(); ends(); seen(); });
    track.addEventListener("pointerdown", function (ev) { if (ev.pointerType !== "mouse" || ev.button) return; grab = { x: ev.clientX, left: track.scrollLeft, moved: false }; });
    addEventListener("pointermove", function (ev) {
      /* a mouse in use: the keyboard's hold gives way (pointing at the strip holds it instead) */
      if (ev.pointerType === "mouse") held = false;
      if (!grab) return;
      var dx = ev.clientX - grab.x;
      if (!grab.moved && Math.abs(dx) > 6) { grab.moved = true; reel.classList.add("is-dragging"); }
      if (grab.moved) track.scrollLeft = grab.left - dx;
    });
    addEventListener("pointerup", function () {
      if (!grab) return;
      var moved = grab.moved; grab = null;
      if (!moved) return;
      setTimeout(function () { reel.classList.remove("is-dragging"); }, 0);
      /* settle on the nearest card */
      var card = track.firstElementChild, w = card ? card.getBoundingClientRect().width + 18 : 1;
      rest(1200);
      track.scrollTo({ left: Math.round(track.scrollLeft / w) * w, behavior: reduce ? "auto" : "smooth" });
    });
    track.addEventListener("dragstart", function (ev) { ev.preventDefault(); });
    track.addEventListener("pointerenter", function (ev) { if (ev.pointerType !== "touch") hover = true; });
    track.addEventListener("pointerleave", function (ev) { if (ev.pointerType !== "touch") hover = false; });
    ["touchstart", "touchmove", "wheel"].forEach(function (n) { track.addEventListener(n, function () { rest(); }, { passive: true }); });
    reel.addEventListener("focusin", function (ev) {
      if (!track.contains(ev.target)) return;
      var kb = true;
      try { kb = ev.target.matches(":focus-visible"); } catch (e) {}
      held = kb;
    });
    reel.addEventListener("focusout", function (ev) { if (!ev.relatedTarget || !track.contains(ev.relatedTarget)) held = false; });
    var frame = function (t) {
      raf = 0;
      if (!auto || !visible || d.hidden) { last = 0; going = false; return; }
      if (hover || held || grab || Date.now() < restAt || d.querySelector("dialog[open]") || !last) { pos = track.scrollLeft; going = false; }
      else {
        /* moved by something else meanwhile: carry on from there */
        if (Math.abs(track.scrollLeft - pos) > 2) pos = track.scrollLeft;
        pos += 30 * Math.min(50, t - last) / 1000;
        if (pos >= setW) pos -= setW;
        going = true; track.scrollLeft = pos;
      }
      last = t;
      raf = requestAnimationFrame(frame);
    };
    var kick = function () { if (!raf && auto && visible && !d.hidden) raf = requestAnimationFrame(frame); };
    var seen = function () { var r = reel.getBoundingClientRect(); visible = r.bottom > 0 && r.top < innerHeight; kick(); };
    var paintPa = function () { if (!pa) return; pa.classList.toggle("is-paused", !auto); pa.setAttribute("aria-label", auto ? T.reelPause : T.reelPlay); };
    if (pa) pa.addEventListener("click", function () { auto = !auto; paintPa(); kick(); });
    addEventListener("scroll", seen, { passive: true });
    d.addEventListener("visibilitychange", kick);
    measureSet(); ends(); paintPa(); seen();
    /* a swipe should find the next photographs already there: once the reel is near, they all load */
    var near = function () {
      if (reel.getBoundingClientRect().top > innerHeight * 1.5) return;
      $$("img[loading=lazy]", track).forEach(function (i) { i.loading = "eager"; });
      removeEventListener("scroll", near);
    };
    addEventListener("scroll", near, { passive: true }); near();
  });

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
          var so = d.createElement("source"); so.type = t[0]; so.sizes = "100vw"; so.srcset = setFor(m, t[1]); pic.appendChild(so);
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
      $$(".slide-bars i", hero).forEach(function (b, j) { b.classList.remove("is-on"); if (j === cur) { void b.offsetWidth; b.classList.add("is-on"); } });
      if (manual && kLive) kLive.textContent = s.getAttribute("data-name") + (T.stop || ". ") + s.getAttribute("data-cap");
    };
    var paintPause = function () {
      if (!pauseBtn) return;
      pauseBtn.setAttribute("aria-label", playing ? T.pause : T.play);
      pauseBtn.classList.toggle("is-paused", !playing);
      hero.classList.toggle("is-paused", !playing);
      hero.classList.toggle("is-running", playing);
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
    var wide = function () { return wideEnough("62.5em"); };
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
    var turn = 0, failed = false;
    thumbs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        var m = V[ids[i]];
        if (!m || (open.getAttribute("data-id") === ids[i] && !failed)) return;
        /* only the latest choice may finish: a slow photograph can never arrive under a later one's caption */
        var mine = ++turn;
        failed = false;
        thumbs.forEach(function (x) { x.removeAttribute("aria-current"); });
        t.setAttribute("aria-current", "true");
        open.setAttribute("data-id", ids[i]);
        stage.classList.add("is-loading");
        /* the photograph on show stays until its replacement is ready; the caption changes with the picture */
        var pic = img.parentNode;
        $$("source", pic).forEach(function (s) { s.srcset = setFor(m, s.type === "image/avif" ? "avif" : "webp"); });
        img.alt = m.alt; img.width = m.w; img.height = m.h;
        img.style.setProperty("--fx", m.fx + "%"); img.style.setProperty("--fy", m.fy + "%");
        img.src = jpgFor(m);
        var settle = function (ok) {
          if (mine !== turn) return;
          failed = !ok;
          stage.classList.remove("is-loading");
          if (cap) cap.textContent = ok ? (m.capShort || m.cap) : T.photoFailed;
          if (count) count.textContent = fmt(T.photoOf, { i: i + 1, n: ids.length });
          if (ok && !reduce) { img.classList.remove("is-fresh"); void img.offsetWidth; img.classList.add("is-fresh"); }
        };
        if (img.decode) img.decode().then(function () { settle(true); }, function () { settle(false); }); else settle(true);
      });
    });
  });

  /* viewer */
  var viewer = d.getElementById("viewer");
  if (viewer && canDialog) {
    var vImg = $("[data-img]", viewer), vCap = $("[data-cap]", viewer), vLink = $("[data-link]", viewer), vCount = $("[data-count]", viewer);
    var vFail = $("[data-fail]", viewer), vRetry = $("[data-retry]", viewer), vFile = $("[data-file]", viewer);
    var items = [], at = 0, vTurn = 0;
    /* the photograph is shown only once it has loaded for the choice still on screen, so a slow
       one can never sit under another's caption; a failed one says so and offers two ways on */
    var arrived = function (mine, ok) {
      if (mine !== vTurn) return;
      viewer.classList.remove("is-loading");
      viewer.classList.toggle("is-failed", !ok);
      if (vFail) vFail.hidden = ok;
    };
    vImg.addEventListener("load", function () { arrived(+vImg.getAttribute("data-turn"), true); });
    vImg.addEventListener("error", function () { if (vImg.getAttribute("src")) arrived(+vImg.getAttribute("data-turn"), false); });
    if (vRetry) vRetry.addEventListener("click", function () { paint(); });
    var paint = function () {
      var m = V[items[at]];
      if (!m) return;
      var mine = ++vTurn;
      viewer.classList.add("is-loading"); viewer.classList.remove("is-failed");
      if (vFail) vFail.hidden = true;
      if (vFile) vFile.href = jpgFor(m);
      vImg.setAttribute("data-turn", mine);
      vImg.removeAttribute("srcset"); vImg.removeAttribute("src");
      vImg.sizes = "100vw";
      vImg.width = m.w; vImg.height = m.h; vImg.alt = m.alt;
      vImg.srcset = setFor(m, "webp");
      vImg.src = jpgFor(m);
      if (vImg.complete && vImg.naturalWidth) arrived(mine, true);
      vCap.textContent = m.cap;
      /* "See this suite" is offered everywhere except on that suite's own page */
      var there = false;
      try { there = !!m.href && new URL(m.href, location.href).pathname === location.pathname; } catch (e) {}
      if (m.href && !there) { vLink.hidden = false; vLink.href = m.href; } else vLink.hidden = true;
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
    viewer.addEventListener("close", function () {
      vTurn++;
      vImg.removeAttribute("srcset"); vImg.removeAttribute("src");
      viewer.classList.remove("is-loading", "is-failed");
      if (vFail) vFail.hidden = true;
    });
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
    var cStatus = $("[data-compare-status]"), diffBtn = $("[data-diff]"), diffNote = $("[data-diff-note]");
    var names = {};
    $$("option", selA).forEach(function (o) { names[o.value] = o.textContent; });
    var saved = store.get("compare"), q = new URLSearchParams(location.search);
    var a0 = q.get("a") || (saved && saved[0]), b0 = q.get("b") || (saved && saved[1]);
    /* an address that names an unknown suite, or the same suite twice, falls back to the first two different ones */
    if (slugs.indexOf(a0) >= 0) selA.value = a0;
    if (slugs.indexOf(b0) >= 0) selB.value = b0;
    if (selA.value === selB.value) selB.value = slugs.filter(function (s) { return s !== selA.value; })[0];
    var pair = [selA.value, selB.value];
    /* rows that read the same in every column on show can be folded away, and brought back */
    var diffOn = false;
    var paintDiff = function () {
      if (!diffBtn) return;
      var hidden = 0;
      $$("tbody tr", cmp).forEach(function (tr) {
        var shown = $$("td", tr).filter(function (td) { return getComputedStyle(td).display !== "none"; });
        var same = shown.length > 1 && shown.every(function (td) { return td.textContent.trim() === shown[0].textContent.trim(); });
        tr.hidden = diffOn && same;
        if (tr.hidden) hidden++;
      });
      diffBtn.setAttribute("aria-pressed", diffOn ? "true" : "false");
      if (diffNote) diffNote.textContent = !diffOn ? "" : hidden ? fmt(diffNote.getAttribute(hidden === 1 ? "data-one" : "data-many"), { n: hidden }) : diffNote.getAttribute("data-none");
    };
    /* choosing the suite the other control already holds swaps the two, so neither choice is lost */
    var onPick = function (changed, other, i) {
      var swapped = changed.value === other.value;
      if (swapped) other.value = pair[i];
      pair = [selA.value, selB.value];
      paintCmp(true);
      paintDiff();
      if (cStatus) cStatus.textContent = fmt(cStatus.getAttribute(swapped ? "data-swapped" : "data-pair"), { a: names[selA.value], b: names[selB.value], c: names[changed.value] });
    };
    selA.addEventListener("change", function () { onPick(selA, selB, 0); });
    selB.addEventListener("change", function () { onPick(selB, selA, 1); });
    if (diffBtn) {
      diffBtn.addEventListener("click", function () { diffOn = !diffOn; paintDiff(); });
      addEventListener("resize", paintDiff);
    }
    paintCmp(false);
    paintDiff();
    /* a link to this comparison, for someone else to open */
    var shareBtn = $("[data-compare-share]"), shareOut = $("[data-compare-share-out]");
    if (shareBtn) shareBtn.addEventListener("click", function () {
      var u = location.href;
      try { var x = new URL(location.href); x.searchParams.set("a", selA.value); x.searchParams.set("b", selB.value); x.hash = ""; u = x.toString(); } catch (e) {}
      var say = function (key, show) {
        shareOut.className = "copy-status" + (key === "data-failed" ? " status is-error" : "");
        shareOut.textContent = shareOut.getAttribute(key) + (show ? " " + u : "");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { say("data-copied"); }, function () { say("data-failed", true); });
      else say("data-failed", true);
    });
  }

  /* ==================================================================== */
  /* The map                                                               */
  /* A drawing of central Bangkok (the frame) inside a window. It opens    */
  /* with the hotel's neighbourhood filling the window, and can be moved   */
  /* and zoomed, out to the whole frame and in to about half a metre to a  */
  /* pixel. The drawing is scaled; the markers move with it but keep their */
  /* size. Everything comes from this site, in squares ("tiles") fetched   */
  /* as they come into view, unless the visitor chooses the satellite view.*/
  /* ==================================================================== */
  $$("[data-map]").forEach(function (el) {
    var view = $("[data-view]", el), stage = $("[data-map-stage]", el), raster = $("[data-raster]", el), pinsEl = $("[data-pins]", el);
    if (!view || !stage || !raster || !pinsEl) return;
    var num = function (k, dflt) { var v = parseFloat(el.getAttribute(k)); return isNaN(v) ? dflt : v; };
    var list = function (k) { return (el.getAttribute(k) || "").split(";"); };
    var ratio = num("data-ratio", 4 / 3), ground = num("data-ground", 2000), hx = num("data-hx", 0.5), hy = num("data-hy", 0.5), open = num("data-open", 1);
    var FINEST = 0.55; /* metres of ground to one CSS pixel at the closest zoom */
    var UP = 1.6;      /* a level of the drawing is never shown at more than this many times its own size */
    /* laid: the zoom the drawing is laid out at; between rests it is scaled by s / laid */
    var laid = 1;
    var vw = 0, vh = 0, bw = 0, bh = 0, s = 1, sWas = 1, sMax = 1, cx = hx, cy = hy, tx = 0, ty = 0, home = null, anim = 0, settleT = 0, live = false;
    var pins = $$(".pin[data-pin]", pinsEl);
    var zIn = $('[data-zoom="in"]', el), zOut = $('[data-zoom="out"]', el), zHome = $('[data-zoom="reset"]', el);
    var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
    var at = function (p) { return [parseFloat(p.style.getPropertyValue("--x")) / 100, parseFloat(p.style.getPropertyValue("--y")) / 100]; };
    var afterMove = []; /* what else has to follow the map: its squares, and the satellite ones */
    /* The levels of the drawing: level k is the frame 640 x 2^k pixels wide, cut into squares of 256. The first
       four cover the frame; the deepest two cover its middle only (ZONE, in fractions of the frame). */
    var LV = list("data-levels").filter(Boolean).map(function (t) { var a = t.split(/[:,]/).map(Number); return { k: a[0], c0: a[1], r0: a[2], cols: a[3], rows: a[4] }; });
    var tileW = function (k) { return 0.4 / Math.pow(2, k); }, tileH = function (k) { return 8 / 15 / Math.pow(2, k); };
    var ZONE = LV.map(function (L) { return [L.c0 * tileW(L.k), L.r0 * tileH(L.k), (L.c0 + L.cols) * tileW(L.k), (L.r0 + L.rows) * tileH(L.k)]; });
    var TOP = LV.length - 1, WHOLE = 0;
    LV.forEach(function (L, i) { if (ZONE[i][0] <= 0.001 && ZONE[i][2] >= 0.999) WHOLE = i; });
    var inside = function (z, x, y) { return x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]; };
    /* how far in the map may go at a place: as far as the deepest level drawn there allows */
    var capAt = function (x, y) { var k = TOP; while (k > WHOLE && !inside(ZONE[k], x, y)) k--; return k === TOP ? sMax : Math.min(sMax, 640 * Math.pow(2, k) * UP / bw); };
    /* and, at a zoom, where it may be moved to: the part of the frame drawn finely enough for that zoom */
    var roomFor = function (S) { var k = TOP; while (k > WHOLE && bw * S <= 640 * Math.pow(2, k - 1) * UP) k--; return ZONE[k]; };

    function measure() {
      vw = view.clientWidth; vh = view.clientHeight;
      if (!vw || !vh) return false;
      bw = Math.max(vw, vh * ratio); bh = bw / ratio;
      sMax = Math.max(1, ground / bw / FINEST);
      stage.style.width = bw + "px"; stage.style.height = bh + "px";
      raster.style.width = (bw * laid).toFixed(2) + "px"; raster.style.height = (bh * laid).toFixed(2) + "px";
      return true;
    }
    function apply() {
      s = clamp(s, 1, sMax);
      /* zooming in stops where the drawing has no more to show at that place */
      if (LV.length && s > sWas + 1e-6) s = Math.min(s, Math.max(sWas, capAt(cx, cy)));
      sWas = s;
      var w = bw * s, h = bh * s, R = LV.length ? roomFor(s) : [0, 0, 1, 1];
      tx = clamp(vw / 2 - cx * w, Math.min(vw - R[2] * w, -R[0] * w), -R[0] * w); ty = clamp(vh / 2 - cy * h, Math.min(vh - R[3] * h, -R[1] * h), -R[1] * h);
      cx = (vw / 2 - tx) / w; cy = (vh / 2 - ty) / h;
      var move = "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px)";
      var k = s / laid;
      raster.style.transform = move + (Math.abs(k - 1) > 1e-5 ? " scale(" + k.toFixed(5) + ")" : "");
      pinsEl.style.width = w.toFixed(2) + "px"; pinsEl.style.height = h.toFixed(2) + "px"; pinsEl.style.transform = move;
      /* closer in than it opened: one finger then moves the map in every direction */
      el.classList.toggle("is-zoomed", s > open * 1.03);
      /* well out from where it opened, the places would lie on top of one another: only the hotel is marked */
      el.classList.toggle("is-far", s < open * 0.7);
      if (zIn) zIn.disabled = s >= capAt(cx, cy) - 0.001;
      if (zOut) zOut.disabled = s <= 1.001;
      if (zHome) zHome.disabled = !!home && Math.abs(s - home.s) < 0.005 && Math.abs(tx - home.tx) < 1 && Math.abs(ty - home.ty) < 1;
      /* a card that is on show follows its marker */
      pins.forEach(function (p) { if (shows(p)) placeCard(p); });
      afterMove.forEach(function (fn) { fn(false); });
      clearTimeout(settleT); settleT = setTimeout(settle, 140);
    }
    /* Where a marker's card goes. On a wide map it sits beside its marker, above or below: whichever side
       holds it whole, keeps clear of the hotel's own marker and of the controls, and covers the fewest other
       markers. On a small map (a phone) it lies along the bottom edge or the top one, clear of its own marker
       and over as few of the others as it can be, so it is always whole. */
    var keepClear = $$(".pin--hotel", pinsEl).concat($$(".mapseg, .mapzoom", el)), EDGE = 8, GAP = 10;
    var headEl = $(".site-header"), barEl = $(".mcta");
    var shows = function (p) { return p.getAttribute("aria-pressed") === "true" || p.classList.contains("is-lit") || p.classList.contains("is-over") || p === d.activeElement; };
    function placeCard(p) {
      var card = $(".pin__card", p);
      if (!card || !live) return;
      var q = at(p), px = tx + q[0] * bw * s, py = ty + q[1] * bh * s, r = p.offsetWidth / 2, dock = !wideEnough("43.75em");
      var wide = dock ? Math.min(vw - 2 * EDGE, 352) + "px" : "";
      if (card.style.width !== wide) card.style.width = wide;
      p.classList.toggle("is-docked", dock);
      var vr = view.getBoundingClientRect(), cw = card.offsetWidth, ch = card.offsetHeight;
      var X = cw > vw - 2 * EDGE ? (vw - cw) / 2 : clamp(px - cw / 2, EDGE, vw - EDGE - cw), Y;
      /* the part of the window that can be seen: not under the page's header, not under the phone's booking
         bar, not off the screen. If that part cannot hold the card, the whole window is used. The bar slides
         in and out, so it is taken where it will rest, not where it is caught on the way. */
      var lo = Math.max(0, (headEl ? headEl.getBoundingClientRect().bottom : 0) - vr.top);
      var hi = Math.min(vh, (barEl && barEl.classList.contains("is-on") ? innerHeight - barEl.offsetHeight : innerHeight) - vr.top);
      if (hi - lo < ch + 2 * EDGE) { lo = 0; hi = vh; }
      var over = function (top) {
        var n = 0;
        pins.forEach(function (o) { if (o === p || o.disabled) return; var k = at(o), ox = tx + k[0] * bw * s, oy = ty + k[1] * bh * s; if (ox > X - 12 && ox < X + cw + 12 && oy > top - 12 && oy < top + ch + 12) n++; });
        return n;
      };
      if (dock) {
        var edge = function (top) { return (py + r + 6 > top && py - r - 6 < top + ch ? 100 : 0) + over(top); };
        Y = edge(lo + EDGE) < edge(hi - EDGE - ch) ? lo + EDGE : hi - EDGE - ch;
        p.classList.remove("is-below");
      } else {
        var cost = function (top) {
          var c = top < lo + EDGE || top + ch > hi - EDGE ? 100 : 0;
          keepClear.forEach(function (k) { var b = k.getBoundingClientRect(); if (X < b.right - vr.left + 4 && X + cw > b.left - vr.left - 4 && top < b.bottom - vr.top + 4 && top + ch > b.top - vr.top - 4) c += k.parentNode === pinsEl ? 4 : 20; });
          return c + 6 * over(top);
        };
        var up = cost(py - r - GAP - ch), down = cost(py + r + GAP), below = down < up || (up >= 100 && down >= 100 && py < (lo + hi) / 2);
        Y = below ? py + r + GAP : py - r - GAP - ch;
        p.classList.toggle("is-below", below);
        card.style.setProperty("--caret", clamp(px - X, 14, cw - 14).toFixed(1) + "px");
      }
      var o = px - r + p.clientLeft, t = py - r + p.clientTop;
      card.style.setProperty("--cx", (X - o).toFixed(1) + "px"); card.style.setProperty("--cy", (Y - t).toFixed(1) + "px");
    }
    /* once the map is at rest: the squares now in view, at the level that suits the zoom */
    /* At rest the drawing is laid out at its true size and only moved, on whole device pixels. A layer
       enlarged with scale() can be drawn small and stretched by the browser, which reads as blur on a
       sharp screen; the scale is kept only for the moving, where it keeps zooming smooth. */
    function settle() {
      var dp = window.devicePixelRatio || 1, rx = Math.round(tx * dp) / dp, ry = Math.round(ty * dp) / dp;
      if (Math.abs(s - laid) > 1e-6) { laid = s; raster.style.width = (bw * s).toFixed(2) + "px"; raster.style.height = (bh * s).toFixed(2) + "px"; }
      raster.style.transform = pinsEl.style.transform = "translate(" + rx + "px," + ry + "px)";
      afterMove.forEach(function (fn) { fn(true); });
    }
    function glide(S, X, Y) {
      cancelAnimationFrame(anim);
      S = clamp(S, 1, sMax);
      if (reduce || !window.requestAnimationFrame) { s = S; cx = X; cy = Y; apply(); return; }
      var s0 = s, x0 = cx, y0 = cy, t0 = 0;
      var step = function (t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 240), e2 = 1 - Math.pow(1 - k, 3);
        s = s0 * Math.pow(S / s0, e2); cx = x0 + (X - x0) * e2; cy = y0 + (Y - y0) * e2;
        apply();
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    /* zoom about a point of the window, so that what is under the pointer or between two fingers stays there */
    function aim(S, px, py) {
      var fx = (px - tx) / (bw * s), fy = (py - ty) / (bh * s);
      S = clamp(S, 1, S > s ? Math.max(s, capAt(fx, fy)) : sMax);
      return [S, fx - (px - vw / 2) / (bw * S), fy - (py - vh / 2) / (bh * S)];
    }
    function zoomAbout(S, px, py) { var g = aim(S, px, py); s = g[0]; cx = g[1]; cy = g[2]; apply(); }
    /* bring a marker into the window if it is outside it or under the controls */
    function reveal(p) {
      var q = at(p), px = tx + q[0] * bw * s, py = ty + q[1] * bh * s;
      if (s < open * 0.7) glide(open, q[0], q[1]);   /* zoomed out, where the places are put away: back in, on this one */
      /* the controls lie over the top of a wide map; on a small one they sit beneath it */
      else if (px < 40 || px > vw - 40 || py < (wideEnough("43.75em") ? 96 : 40) || py > vh - 40) glide(s, q[0], q[1]);
    }
    function start() {
      el.classList.add("is-live");
      if (!measure()) { el.classList.remove("is-live"); return; }
      view.tabIndex = 0; view.setAttribute("role", "group"); view.setAttribute("aria-label", view.getAttribute("data-label") || "");
      if (!live) {
        live = true;
        /* the markers are placed on the wide frame from here on; without the script they sit on the picture of the neighbourhood */
        $$("[data-wx]", pinsEl).forEach(function (p) { p.style.setProperty("--x", p.getAttribute("data-wx")); p.style.setProperty("--y", p.getAttribute("data-wy")); });
        /* Where the neighbourhood fills the window exactly (a laptop), it opens on the middle of it, which is the
           picture the page showed until now. Where the window is narrower or shorter than that (a phone), it
           opens with the hotel in the middle. */
        var c = core || [0, 0, 1, 1];
        ox = bw > vw + 1 ? hx : (c[0] + c[2]) / 2;
        oy = bh > vh + 1 ? hy : (c[1] + c[3]) / 2;
        s = sWas = open; cx = ox; cy = oy; apply(); home = { s: s, tx: tx, ty: ty }; apply();
      } else apply();
    }
    var ox = hx, oy = hy;
    var goHome = function () { glide(open, ox, oy); };

    /* One short line over the map says how to do what was just tried: the wheel, or one finger. */
    var hint = $("[data-map-hint]", el), hints = {}, hintT = 0;
    var say2 = function (which) {
      if (!hint || (hints[which] || 0) >= 2) return;
      hints[which] = (hints[which] || 0) + 1;
      hint.textContent = hint.getAttribute("data-" + which) || hint.textContent;
      hint.hidden = false; clearTimeout(hintT); hintT = setTimeout(function () { hint.hidden = true; }, 1900);
    };
    /* dragging, and two fingers */
    var pts = {}, pinch = 0, tap = null, engaged = false;
    view.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse") engaged = true;   /* a click in the map: the wheel is the map's until the mouse leaves it */
      if (!live || ev.button > 0 || (ev.target.closest && ev.target.closest("button, a"))) return;
      tap = Object.keys(pts).length ? null : { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
      /* One finger, on a map no closer in than it opened, may be about to scroll the page. It is watched for
         its first few pixels: if it sets off sideways it moves the map, if up or down it is left to the page. */
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, wait: ev.pointerType === "touch" && !el.classList.contains("is-zoomed") };
      if (Object.keys(pts).length > 1) Object.keys(pts).forEach(function (k) { pts[k].wait = false; pts[k].page = false; });
      try { view.setPointerCapture(ev.pointerId); } catch (e) {}
      cancelAnimationFrame(anim); pinch = 0;
      el.classList.add("is-dragging");
    });
    view.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse" && !Object.keys(pts).length) engaged = false; });
    view.addEventListener("pointermove", function (ev) {
      var p = pts[ev.pointerId];
      if (!p) return;
      var dx = ev.clientX - p.x, dy = ev.clientY - p.y, ids = Object.keys(pts);
      p.x = ev.clientX; p.y = ev.clientY;
      if (tap && (tap.id !== ev.pointerId || Math.abs(ev.clientX - tap.x) + Math.abs(ev.clientY - tap.y) > 6)) tap = null;
      if (ids.length === 1) {
        if (p.wait) { var ax = Math.abs(ev.clientX - p.x0), ay = Math.abs(ev.clientY - p.y0); if (ax + ay < 10) return; p.wait = false; p.page = ay > ax; }
        if (p.page) return;
        cx -= dx / (bw * s); cy -= dy / (bh * s); apply(); return;
      }
      var a = pts[ids[0]], b = pts[ids[1]], r = view.getBoundingClientRect(), dist = Math.hypot(a.x - b.x, a.y - b.y);
      cx -= dx / 2 / (bw * s); cy -= dy / 2 / (bh * s); apply();
      if (pinch && dist) zoomAbout(s * dist / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch = dist;
    });
    var lift = function (ev) {
      if (!pts[ev.pointerId]) return;
      var alone = Object.keys(pts).length === 1;
      delete pts[ev.pointerId]; pinch = 0;
      if (!Object.keys(pts).length) el.classList.remove("is-dragging");
      /* a tap on the map itself, not a drag, puts the open card away */
      if (ev.type === "pointerup" && tap && tap.id === ev.pointerId) unchoose();
      /* the browser took one finger's swipe to scroll the page: say how the map is moved instead */
      if (ev.type === "pointercancel" && ev.pointerType === "touch" && alone) say2("touch");
      if (ev.type !== "lostpointercapture") tap = null;
    };
    view.addEventListener("pointerup", lift); view.addEventListener("pointercancel", lift); view.addEventListener("lostpointercapture", lift);
    /* Safari will otherwise start a drag of its own (of a picture, or of nothing at all) part of the way through
       a second drag of the map, and the map then stops following the mouse */
    view.addEventListener("dragstart", function (ev) { ev.preventDefault(); });
    /* two fingers on the map are the map's: they move and zoom it, and the page stays where it is */
    view.addEventListener("touchmove", function (ev) { if (live && ev.touches && ev.touches.length > 1 && ev.cancelable) ev.preventDefault(); }, { passive: false });
    /* The wheel scrolls the page, as everywhere else, until the map has been clicked or Ctrl is held (a pinch
       on a trackpad counts as that); then it zooms the map, for as long as the mouse stays on it. */
    view.addEventListener("wheel", function (ev) {
      if (!live) return;
      if (!(ev.ctrlKey || ev.metaKey || engaged)) { say2("wheel"); return; }
      ev.preventDefault();
      if (hint) hint.hidden = true;
      var r = view.getBoundingClientRect();
      zoomAbout(s * Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0025)), ev.clientX - r.left, ev.clientY - r.top);
    }, { passive: false });
    view.addEventListener("dblclick", function (ev) {
      if (!live || (ev.target.closest && ev.target.closest("button, a"))) return;
      var r = view.getBoundingClientRect(), g = aim(s * 2, ev.clientX - r.left, ev.clientY - r.top);
      glide(g[0], g[1], g[2]);
    });
    view.addEventListener("keydown", function (ev) {
      if (!live || ev.target !== view || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      var k = ev.key, step = 0.2 / s, w = bw * s, h = bh * s, R = roomFor(s);
      if (k === "+" || k === "=") glide(Math.min(s * 1.6, Math.max(s, capAt(cx, cy))), cx, cy);
      else if (k === "-" || k === "_") glide(s / 1.6, cx, cy);
      else if (k === "0") goHome();
      /* an arrow key moves the map only while there is map left on that side; otherwise it is the page's */
      else if (k === "ArrowLeft" && tx < -R[0] * w - 0.5) glide(s, cx - step, cy);
      else if (k === "ArrowRight" && tx > vw - R[2] * w + 0.5) glide(s, cx + step, cy);
      else if (k === "ArrowUp" && ty < -R[1] * h - 0.5) glide(s, cx, cy - step);
      else if (k === "ArrowDown" && ty > vh - R[3] * h + 0.5) glide(s, cx, cy + step);
      else return;
      ev.preventDefault();
    });
    /* focus on a marker must never scroll the window's own box: the map moves instead */
    view.addEventListener("scroll", function () { if (view.scrollLeft || view.scrollTop) { view.scrollLeft = 0; view.scrollTop = 0; } });
    pinsEl.addEventListener("focusin", function (ev) { var p = ev.target.closest ? ev.target.closest(".pin[data-pin]") : null; if (p && live) reveal(p); });
    if (zIn) zIn.addEventListener("click", function () { glide(Math.min(s * 1.8, Math.max(s, capAt(cx, cy))), cx, cy); });
    if (zOut) zOut.addEventListener("click", function () { glide(s / 1.8, cx, cy); });
    if (zHome) zHome.addEventListener("click", goHome);

    /* ---- the drawing, in squares ----
       Two layers of squares over a small picture of the whole frame: the drawing itself, and the names (one
       set for each language, on a clear ground, which also lie over the satellite images). A square is asked
       for when it comes into view, at the level whose size suits the zoom; levels already fetched stay
       underneath, so the map is never bare while a finer one arrives. */
    var squares = function (el2, url, has, alone) {
      var lv = {};
      return function (atRest) {
        if (!awake || el2.hidden) return;
        var fw = bw * s, K = clamp(Math.ceil(Math.log(fw / 640) / Math.LN2 - 1e-9), 0, TOP), w = bw * s, h = bh * s;
        /* no deeper than the drawing goes where the window is */
        while (K > WHOLE && !inside(ZONE[K], cx, cy)) K--;
        (alone ? [K] : [Math.min(K, WHOLE), K]).forEach(function (k) {
          var L = LV[k], tw = tileW(k), th = tileH(k), box = lv[k];
          if (!box) { box = lv[k] = { el: d.createElement("div"), have: {} }; box.el.style.cssText = "position:absolute;inset:0;z-index:" + k; el2.appendChild(box.el); }
          var i0 = Math.max(L.c0, Math.floor(-tx / w / tw)), i1 = Math.min(L.c0 + L.cols - 1, Math.floor((vw - tx) / w / tw - 1e-9));
          var j0 = Math.max(L.r0, Math.floor(-ty / h / th)), j1 = Math.min(L.r0 + L.rows - 1, Math.floor((vh - ty) / h / th - 1e-9));
          for (var i = i0; i <= i1; i++) for (var j = j0; j <= j1; j++) (function (i, j) {
            var id = i + "_" + j;
            if (box.have[id] || (has && has[k].charAt((j - L.r0) * L.cols + i - L.c0) !== "1")) return;
            box.have[id] = 1;
            var t = new Image();
            t.alt = ""; t.decoding = "async"; t.draggable = false;
            t.style.left = (i * tw * 100).toFixed(4) + "%"; t.style.top = (j * th * 100).toFixed(4) + "%";
            /* a hair wider than its square, so no seam shows between neighbours */
            t.style.width = "calc(" + (tw * 100).toFixed(4) + "% + 0.5px)"; t.style.height = "calc(" + (th * 100).toFixed(4) + "% + 0.5px)";
            t.onload = function () { t.classList.add("is-in"); };
            t.onerror = function () { delete box.have[id]; if (t.parentNode) t.parentNode.removeChild(t); };
            t.src = url + k + "/" + id + ".webp";
            box.el.appendChild(t);
          })(i, j);
        });
        /* names of one level only at a time; of the drawing, this level and the coarser ones under it */
        Object.keys(lv).forEach(function (k) {
          k = +k;
          if (alone) lv[k].el.style.display = k === K ? "" : "none";
          if (atRest && (k > K || (alone && k !== K) || (k < K && k !== Math.min(K, WHOLE) && k !== K - 1))) { el2.removeChild(lv[k].el); delete lv[k]; }
        });
      };
    };
    var layerOf = function (cls) { var x = d.createElement("div"); x.className = "mapplate__grid " + cls; raster.appendChild(x); return x; };
    if (LV.length) {
      var core = (el.getAttribute("data-core") || "0,0,1,1").split(",").map(Number), near = $("picture", raster);
      if (near) { near.style.left = core[0] * 100 + "%"; near.style.top = core[1] * 100 + "%"; near.style.width = (core[2] - core[0]) * 100 + "%"; near.style.height = (core[3] - core[1]) * 100 + "%"; }
      var baseEl = layerOf("mapplate__grid--base"), tilesBox = $("[data-tiles]", el), namesEl = layerOf("mapplate__grid--names");
      if (tilesBox) raster.insertBefore(tilesBox, namesEl);   /* satellite squares lie between the drawing and the names */
      afterMove.push(squares(baseEl, el.getAttribute("data-base"), null, false));
      afterMove.push(squares(namesEl, el.getAttribute("data-names"), list("data-have"), true));
    }
    /* Nothing of the wide map is fetched until the map is near the screen: a visitor who never scrolls to it
       is not made to download it. Until then the picture of the neighbourhood, which the page already has,
       stands in its place. */
    var awake = false;
    var wake = function () {
      if (awake || !live || !LV.length) return;
      var r = view.getBoundingClientRect();
      if (r.bottom < -innerHeight || r.top > innerHeight * 2) return;
      awake = true;
      var under = new Image();
      under.className = "mapplate__under"; under.alt = ""; under.decoding = "async"; under.draggable = false; under.src = el.getAttribute("data-under");
      raster.insertBefore(under, raster.firstChild);
      settle();
    };


    /* Markers. Pointing at one with a mouse, or reaching it with the keyboard, shows its card and lights its
       row in the list beside the map. Choosing it (a click, or a tap) keeps the card open; choosing it again,
       a tap on the map itself, or Escape puts the card away. A finger never counts as pointing: on a touch
       screen that state would stay behind after the tap. */
    var rowOf = function (id) { return $('[data-near="' + id + '"]') || $('.place[data-place="' + id + '"]'); };
    var choose = function (id) { pins.forEach(function (p) { p.setAttribute("aria-pressed", p.getAttribute("data-pin") === id ? "true" : "false"); }); };
    /* a page that has a fuller list beside the map (the location page) answers the choice itself */
    var say = function (from, id) { if (from.dispatchEvent(new CustomEvent("gd:pin", { bubbles: true, cancelable: true, detail: { id: id } }))) choose(id); };
    var chosen = function () { return pins.filter(function (p) { return p.getAttribute("aria-pressed") === "true"; })[0]; };
    function unchoose() { var p = chosen(); if (p) say(p, ""); return !!p; }
    var point = function (p, on) {
      var row = rowOf(p.getAttribute("data-pin"));
      p.classList.toggle("is-over", on);
      if (!on) p.classList.remove("is-shut");
      if (row) row.classList.toggle("is-lit", on);
      if (on) placeCard(p);
    };
    /* A card belongs to its marker, so the mouse can rest on it while it is read. It must not shut off the
       markers it lies over, though: when the mouse, on a card, comes to where another marker is, that marker
       takes over. */
    pinsEl.addEventListener("pointermove", function (ev) {
      var own = ev.pointerType !== "touch" && ev.target.closest && ev.target.closest(".pin__card") ? ev.target.closest(".pin") : null;
      if (!own || own.classList.contains("is-docked")) return;
      var vr = view.getBoundingClientRect(), mx = ev.clientX - vr.left, my = ev.clientY - vr.top;
      var next = pins.filter(function (o) { var k = at(o); return o !== own && !o.disabled && Math.hypot(tx + k[0] * bw * s - mx, ty + k[1] * bh * s - my) < o.offsetWidth / 2 + 2; })[0];
      if (next) { point(own, false); point(next, true); }
    });
    pins.forEach(function (p) {
      var id = p.getAttribute("data-pin"), row = rowOf(id);
      /* on a small map the card lies along an edge, where the mouse could not follow it: there it opens on a click, not on pointing */
      p.addEventListener("pointerenter", function (ev) { if (ev.pointerType !== "touch" && wideEnough("43.75em")) point(p, true); });
      p.addEventListener("pointerleave", function () { point(p, false); });
      p.addEventListener("focus", function () { if (row) row.classList.add("is-lit"); placeCard(p); });
      p.addEventListener("blur", function () { p.classList.remove("is-shut"); if (row) row.classList.remove("is-lit"); });
      p.addEventListener("click", function () {
        p.classList.remove("is-shut");
        say(p, p.getAttribute("aria-pressed") === "true" ? "" : id);
        placeCard(p);
      });
    });
    var scope = el.closest("[data-explorer]") || el;
    d.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape" && ev.key !== "Esc") return;
      var at2 = pins.filter(function (p) { return p.classList.contains("is-over") || p === d.activeElement; });
      if (!at2.length && !scope.contains(ev.target)) return;
      unchoose();
      at2.forEach(function (p) { p.classList.add("is-shut"); });
    });
    var byId = function (id) { return pins.filter(function (x) { return x.getAttribute("data-pin") === id; })[0]; };
    el.__map = {
      reveal: function (id) { var p = byId(id); if (p && live) reveal(p); },
      choose: function (id) { choose(id); var p = byId(id); if (p) placeCard(p); },
      /* a row in a list beside the map lights its marker: the card it shows is placed like any other */
      light: function (id, on) { var p = byId(id); if (!p) return; p.classList.toggle("is-lit", on); if (on) placeCard(p); },
      place: function (id) { var p = byId(id); if (p) placeCard(p); }
    };

    /* ---- satellite view ---- */
    var satUrl = el.getAttribute("data-sat"), tilesEl = $("[data-tiles]", el);
    if (satUrl && tilesEl) {
      var B = (el.getAttribute("data-bounds") || "").split(",").map(Number); /* west, south, east, north */
      var failBox = $("[data-sat-fail]", el), creditSat = $("[data-credit-sat]", el), baseGrid = $(".mapplate__grid--base", el);
      var zMin = num("data-sat-min", 16), zMax = num("data-sat-max", 18), layer = "map", levels = {}, got = 0, lost = 0, lastDraw = 0;
      var colOf = function (lon, z) { return (lon + 180) / 360 * Math.pow(2, z); };
      var rowAt = function (lat, z) { var r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z); };
      var draw = function (atRest) {
        if (layer !== "sat") return;
        var now = Date.now();
        if (!atRest && now - lastDraw < 220) return;
        lastDraw = now;
        /* the coarsest level whose squares are fine enough for the size the map is shown at */
        var need = bw * s * Math.min(window.devicePixelRatio || 1, 1.5) * 0.8, z = zMin;
        while (z < zMax && (colOf(B[2], z) - colOf(B[0], z)) * 256 < need) z++;
        var X0 = colOf(B[0], z), X1 = colOf(B[2], z), Y0 = rowAt(B[3], z), Y1 = rowAt(B[1], z), w = bw * s, h = bh * s;
        var i0 = Math.floor(X0 + (-tx / w) * (X1 - X0)), i1 = Math.floor(X0 + ((vw - tx) / w) * (X1 - X0) - 1e-9);
        var j0 = Math.floor(Y0 + (-ty / h) * (Y1 - Y0)), j1 = Math.floor(Y0 + ((vh - ty) / h) * (Y1 - Y0) - 1e-9);
        var lv = levels[z];
        if (!lv) { lv = levels[z] = { box: d.createElement("div"), have: {} }; lv.box.style.cssText = "position:absolute;inset:0;z-index:" + z; tilesEl.appendChild(lv.box); }
        for (var i = i0; i <= i1; i++) for (var j = j0; j <= j1; j++) (function (i, j) {
          var key = i + "/" + j;
          if (lv.have[key]) return;
          lv.have[key] = 1;
          var t = new Image();
          t.alt = ""; t.decoding = "async"; t.referrerPolicy = "no-referrer"; t.draggable = false;
          t.style.left = ((i - X0) / (X1 - X0) * 100).toFixed(4) + "%"; t.style.top = ((j - Y0) / (Y1 - Y0) * 100).toFixed(4) + "%";
          /* a hair wider than its square, so no seam shows between neighbours */
          t.style.width = "calc(" + (100 / (X1 - X0)).toFixed(4) + "% + 0.5px)"; t.style.height = "calc(" + (100 / (Y1 - Y0)).toFixed(4) + "% + 0.5px)";
          t.onload = function () { got++; t.classList.add("is-in"); };
          t.onerror = function () { lost++; delete lv.have[key]; if (t.parentNode) t.parentNode.removeChild(t); if (failBox && layer === "sat" && !got && lost >= 3) failBox.hidden = false; };
          t.src = satUrl.replace("{z}", z).replace("{x}", i).replace("{y}", j);
          lv.box.appendChild(t);
        })(i, j);
        /* keep this level and the coarsest one beneath it; let go of the rest */
        if (atRest) Object.keys(levels).forEach(function (k) { if (+k !== z && +k !== zMin) { tilesEl.removeChild(levels[k].box); delete levels[k]; } });
      };
      afterMove.push(draw);
      var setLayer = function (next, from) {
        layer = next;
        var sat = next === "sat";
        el.classList.toggle("is-sat", sat);
        $$("[data-layer][aria-pressed]", el).forEach(function (b2) { b2.setAttribute("aria-pressed", b2.getAttribute("data-layer") === next ? "true" : "false"); });
        tilesEl.hidden = !sat;
        if (baseGrid) baseGrid.hidden = sat;
        if (creditSat) creditSat.hidden = !sat;
        if (failBox) failBox.hidden = true;
        if (sat) { got = 0; lost = 0; draw(true); } else settle();
        /* the "Back to the map" button has just gone: hand the keyboard to the view switch */
        if (from && !from.hasAttribute("aria-pressed")) { var seg = $('[data-layer="' + next + '"][aria-pressed]', el); if (seg) seg.focus(); }
      };
      $$("[data-layer]", el).forEach(function (b2) { b2.addEventListener("click", function () { setLayer(b2.getAttribute("data-layer"), b2); }); });
    }

    start();
    wake();
    /* once the page has been scrolled, an open card is set again inside the part of the map that can now be seen */
    var again = function () { if (live) pins.forEach(function (p) { if (shows(p)) placeCard(p); }); }, scrollT = 0;
    addEventListener("scroll", function () { wake(); clearTimeout(scrollT); scrollT = setTimeout(again, 140); }, { passive: true });
    /* and at once when the booking bar is switched on or off, which can happen with no scroll at all */
    if (barEl && window.MutationObserver) new MutationObserver(again).observe(barEl, { attributes: true, attributeFilter: ["class"] });
    addEventListener("resize", function () { if (live) { if (measure()) apply(); } else start(); wake(); });
    addEventListener("load", function () { if (live) { if (measure()) apply(); } else start(); wake(); });
  });

  /* ==================================================================== */
  /* Location explorer: the list beside the map                            */
  /* ==================================================================== */
  var ex = $("[data-explorer]");
  if (ex) {
    var chips = $$("[data-filter]", ex), rows = $$(".place", ex), pins = $$("[data-pin]", ex), countEl = $("[data-count]", ex);
    var exMap = ($("[data-map]", ex) || {}).__map;
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
    var choose = function (id, from) {
      rows.forEach(function (r) {
        var btn = $(".place__btn", r), more = $(".place__more", r);
        var on = r.getAttribute("data-place") === id && btn.getAttribute("aria-expanded") !== "true";
        if (r.getAttribute("data-place") === id && from === "pin") on = true;
        btn.setAttribute("aria-expanded", on ? "true" : "false");
        more.hidden = !on;
        if (on && from === "pin") {
          if (r.hidden) filterTo("all");
          /* with the list beside the map, go to the row; with the list below it (a phone), stay on the map,
             where the marker now shows its card, and leave the row open for when the visitor scrolls down */
          if (wideEnough("62.5em")) {
            btn.focus({ preventScroll: true });
            var rr = r.getBoundingClientRect();
            if (rr.top < 90 || rr.bottom > innerHeight - 20) r.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
          }
        }
      });
      pins.forEach(function (p) {
        var row = rows.filter(function (r) { return r.getAttribute("data-place") === p.getAttribute("data-pin"); })[0];
        var on = !!(row && $(".place__btn", row).getAttribute("aria-expanded") === "true");
        p.setAttribute("aria-pressed", on ? "true" : "false");
        if (on && from === "list" && exMap) exMap.reveal(p.getAttribute("data-pin"));
        if (on && exMap) exMap.place(p.getAttribute("data-pin"));
      });
    };
    chips.forEach(function (ch) { ch.addEventListener("click", function () { filterTo(ch.getAttribute("data-filter")); }); });
    rows.forEach(function (r) {
      var pin = pins.filter(function (p) { return p.getAttribute("data-pin") === r.getAttribute("data-place"); })[0];
      $(".place__btn", r).addEventListener("click", function () { choose(r.getAttribute("data-place"), "list"); });
      /* pointing at a row lights its marker, so the two can be matched without numbers */
      if (pin) {
        var light = function (on) { return function () { if (exMap) exMap.light(pin.getAttribute("data-pin"), on); else pin.classList.toggle("is-lit", on); }; };
        r.addEventListener("pointerenter", function (ev) { if (ev.pointerType !== "touch") light(true)(); }); r.addEventListener("pointerleave", light(false));
        r.addEventListener("focusin", light(true)); r.addEventListener("focusout", light(false));
      }
    });
    ex.addEventListener("gd:pin", function (ev) { ev.preventDefault(); choose(ev.detail.id, "pin"); });
    rows.forEach(function (r) { $(".place__more", r).hidden = true; $(".place__btn", r).setAttribute("aria-expanded", "false"); });
    filterTo("all");
  }

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

  /* near-by rows on the home page: pointing at one lights its marker and shows its card; choosing one keeps it */
  $$("[data-near]").forEach(function (li) {
    var id = li.getAttribute("data-near"), pin = $('.pin[data-pin="' + id + '"]');
    if (!pin) return;
    var api = (pin.closest("[data-map]") || {}).__map;
    var on = function () { if (api) api.light(id, true); else pin.classList.add("is-lit"); }, off = function () { if (api) api.light(id, false); else pin.classList.remove("is-lit"); };
    li.addEventListener("pointerenter", function (ev) { if (ev.pointerType !== "touch") on(); }); li.addEventListener("pointerleave", off);
    li.addEventListener("click", function () { if (!api) return; api.choose(pin.getAttribute("aria-pressed") === "true" ? "" : id); api.reveal(id); });
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
    var mailLong = false, longNote = $("[data-enquiry-long]");
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
    var prepare = function (ev) {
      if (ev) ev.preventDefault();
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
      /* said before the email app is opened, not after: a long message travels by copy and paste */
      if (longNote) longNote.hidden = !mailLong;
      eStatus.className = "status"; eStatus.textContent = "";
      outBox.hidden = false;
      outBox.focus();
    };
    /* the form has no submit button and no address to submit to: preparing is a button press, or Enter in a one-line field */
    enq.addEventListener("submit", prepare);
    var prepBtn = $("[data-enquiry-prepare]", enq);
    if (prepBtn) prepBtn.addEventListener("click", prepare);
    enq.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && ev.target && ev.target.tagName === "INPUT" && ev.target.type !== "radio") prepare(ev);
    });
    /* an edited form withdraws the earlier message, so what is copied is always what is shown in the form */
    var withdraw = function (ev) {
      /* typing reports itself through "input"; "change" is listened to only for the controls that may not (a select, a radio, a date) */
      if (ev && ev.type === "change" && ev.target && ev.target.tagName !== "SELECT" && !/^(radio|date)$/.test(ev.target.type || "")) return;
      outBox.hidden = true; eStatus.textContent = "";
    };
    enq.addEventListener("input", withdraw); enq.addEventListener("change", withdraw);
    var selectText = function () {
      try { var r = d.createRange(); r.selectNodeContents(pre); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); pre.focus(); } catch (e) {}
    };
    copyBtn.addEventListener("click", function () {
      var ok = function () { eStatus.className = "status is-ok"; eStatus.textContent = L.copied; };
      /* no clipboard, or permission refused: the text is selected so the keyboard or a long press can copy it */
      var bad = function () { selectText(); eStatus.className = "status is-error"; eStatus.textContent = L.copyFailed; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pre.textContent).then(ok, bad); else bad();
    });
    mailBtn.addEventListener("click", function () { eStatus.className = "status"; eStatus.textContent = mailLong ? L.mailLong : L.mailHint; });
    /* each subject suggests what the hotel will need to know */
    var prompt = $("[data-enquiry-prompt]");
    var paintPrompt = function () {
      if (!prompt) return;
      var k = (enq.querySelector('input[name="intent"]:checked') || {}).value || "";
      var text = (L.prompts || {})[k] || "";
      prompt.textContent = text; prompt.hidden = !text;
    };
    $$('input[name="intent"]', enq).forEach(function (r) { r.addEventListener("change", paintPrompt); });
    var pre0 = new URLSearchParams(location.search).get("about");
    if (pre0 && enq.elements.intent) $$('input[name="intent"]', enq).forEach(function (r) { if (r.value === pre0) r.checked = true; });
    var su = new URLSearchParams(location.search).get("suite");
    if (su && enq.elements.suite) $$("option", enq.elements.suite).forEach(function (o) { if (o.getAttribute("data-slug") === su) enq.elements.suite.value = o.value; });
    /* a stay the visitor set in a planner is offered here, editable: dates, and who is travelling */
    if (stayStored) {
      if (stay.in && stay.out && enq.elements.arrive && !enq.elements.arrive.value) { enq.elements.arrive.value = stay.in; enq.elements.depart.value = stay.out; }
      var partyEl = enq.elements.party, partyNote = $("[data-party-note]");
      if (partyEl && !partyEl.value) {
        partyEl.value = guestsText(stay.adults, stay.kids);
        if (partyNote) partyNote.hidden = false;
      }
    }
    paintPrompt();
    hintDates();
    /* typed words are never stored, so changing language would lose them: say so first */
    var typed = function () { return ["name", "email", "phone", "message"].some(function (n) { return val(n) !== ""; }); };
    $$("[data-lang-switch]").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        if (typed() && !window.confirm(L.leaveDraft)) { ev.preventDefault(); ev.stopImmediatePropagation(); }
      }, true);
    });
  }
})();
