/* ═══════════════════════════════════════════════════════════
   GRAND DIAMOND SUITES — interaction & motion engine
   GSAP 3.13 (ScrollTrigger, SplitText) + Lenis
   Structure: plain-DOM chrome first (works with no libraries),
   then the motion layer, which requires gsap + ScrollTrigger.
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const preloader = document.getElementById("preloader");

  window.__gd = { heroProgress: 0, mouseX: 0, mouseY: 0, reduceMotion };

  let lenis = null; /* assigned by the motion layer if available */

  /* ════════════════════════════════════════════════
     LANGUAGE — English is authored in the HTML;
     Thai strings come from i18n.js and are applied
     before anything is split or measured.
     ════════════════════════════════════════════════ */
  const LANG_KEY = "gd-lang";
  let lang = "en";
  try { lang = localStorage.getItem(LANG_KEY) || "en"; } catch (e) { /* storage blocked */ }
  if (lang !== "en" && !(window.GD_I18N && window.GD_I18N[lang])) lang = "en";
  const dict = lang === "en" ? null : window.GD_I18N[lang];
  const t = (key, fallback) => (dict && dict[key]) || fallback;

  if (dict) {
    document.documentElement.lang = lang;
    if (dict["meta.title"]) document.title = dict["meta.title"];
    const md = document.querySelector('meta[name="description"]');
    if (md && dict["meta.desc"]) md.setAttribute("content", dict["meta.desc"]);
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = dict[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-suffix]").forEach((el) => {
      const v = dict[el.dataset.i18nSuffix];
      if (v != null) { el.dataset.suffix = v; el.textContent = (el.dataset.count || "") + v; }
    });
    const pn = document.getElementById("primaryNav");
    if (pn) pn.setAttribute("aria-label", t("aria.primaryNav", "Primary"));
    const o2 = document.getElementById("o2Credit");
    if (o2) o2.setAttribute("aria-label", t("foot.o2", "Website by O2 Design Studio (opens in a new tab)"));
  }

  document.querySelectorAll("[data-setlang]").forEach((btn) => {
    const active = btn.dataset.setlang === lang;
    btn.setAttribute("aria-pressed", String(active));
    btn.classList.toggle("is-active", active);
    btn.addEventListener("click", () => {
      const next = btn.dataset.setlang;
      if (next === lang) return;
      try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* still switch, just not persisted */ }
      try { sessionStorage.setItem("gd-skip-preloader", "1"); } catch (e) { /* full preloader then */ }
      /* soft veil out, then reload so fonts, splits and counters
         all rebuild cleanly on the translated document */
      const veil = document.createElement("div");
      veil.className = "lang-veil";
      document.body.appendChild(veil);
      requestAnimationFrame(() => veil.classList.add("is-on"));
      setTimeout(() => location.reload(), 420);
    });
  });

  /* ════════════════════════════════════════════════
     CHROME — navigation, menu, booking, progress.
     No animation library required for any of this.
     ════════════════════════════════════════════════ */

  const scrollTo = (target) => {
    if (lenis) { lenis.scrollTo(target, { offset: 0, duration: 1.4 }); return; }
    const el = typeof target === "string" ? document.querySelector(target) : null;
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  /* Menu overlay with focus management */
  const burger = document.getElementById("burger");
  const overlay = document.getElementById("menuOverlay");
  const mainEl = document.getElementById("main");
  const footerEl = document.querySelector(".footer");
  const canInert = "inert" in HTMLElement.prototype;
  let lastFocused = null;
  burger.setAttribute("aria-label", t("aria.openMenu", "Open menu"));

  const menuFocusables = () => [burger, ...overlay.querySelectorAll("a")];

  const openMenu = () => {
    lastFocused = document.activeElement;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    burger.classList.add("is-open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", t("aria.closeMenu", "Close menu"));
    document.body.classList.add("menu-open");
    if (canInert) { mainEl.inert = true; footerEl.inert = true; }
    if (lenis) lenis.stop();
    const first = overlay.querySelector("a");
    if (first) first.focus({ preventScroll: true });
  };

  function closeMenu() {
    if (!overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", t("aria.openMenu", "Open menu"));
    document.body.classList.remove("menu-open");
    if (canInert) { mainEl.inert = false; footerEl.inert = false; }
    if (lenis) lenis.start();
    (lastFocused && lastFocused.focus ? lastFocused : burger).focus({ preventScroll: true });
  }

  burger.addEventListener("click", () => overlay.classList.contains("is-open") ? closeMenu() : openMenu());
  overlay.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeMenu(); return; }
    /* trap Tab inside the open menu (burger + overlay links) */
    if (e.key === "Tab" && overlay.classList.contains("is-open")) {
      const items = menuFocusables();
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && (i === 0 || i === -1)) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });

  /* In-page anchors */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        closeMenu();
        scrollTo(id);
      }
    });
  });

  /* Booking bar — the form also has a native action fallback */
  const bookingBar = document.getElementById("bookingBar");
  if (bookingBar) {
    const inEl = document.getElementById("bbIn");
    const outEl = document.getElementById("bbOut");
    const iso = (d) => d.toISOString().split("T")[0];
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
    inEl.min = iso(today); inEl.value = iso(tomorrow);
    outEl.min = iso(tomorrow); outEl.value = iso(dayAfter);
    inEl.addEventListener("change", () => {
      const next = new Date(inEl.value); next.setDate(next.getDate() + 1);
      outEl.min = iso(next);
      if (outEl.value <= inEl.value) outEl.value = iso(next);
    });
    bookingBar.addEventListener("submit", (e) => {
      e.preventDefault();
      window.open("https://www.granddiamondsuites.com/booking", "_blank", "noopener");
    });
  }

  /* Back to top */
  document.getElementById("toTop").addEventListener("click", () => scrollTo(0));

  /* The concept flag steps aside once the footer's own statement is on screen */
  const conceptFlag = document.getElementById("conceptFlag");
  const footerLegal = document.querySelector(".footer-legal");
  if (conceptFlag && footerLegal) {
    const syncFlag = () => conceptFlag.classList.toggle("is-tucked", footerLegal.getBoundingClientRect().top < window.innerHeight - 8);
    window.addEventListener("scroll", syncFlag, { passive: true });
    window.addEventListener("resize", syncFlag);
    syncFlag();
  }

  /* Suites progress bar when the track scrolls natively
     (mobile always; desktop under reduced-motion / no-motion) */
  const track = document.getElementById("suitesTrack");
  const bar = document.getElementById("suitesBar");
  if (track && bar) {
    track.addEventListener("scroll", () => {
      const max = track.scrollWidth - track.clientWidth;
      if (max > 0) bar.style.transform = `scaleX(${track.scrollLeft / max})`;
    }, { passive: true });
  }

  /* ── Image catalogue lightbox: every photo on the page
        expands into one browsable, de-duplicated catalogue ── */
  const lightbox = document.getElementById("lightbox");
  if (lightbox) {
    const lbImg = document.getElementById("lbImg");
    const lbCaption = document.getElementById("lbCaption");
    const lbCount = document.getElementById("lbCount");
    const lbStage = document.getElementById("lbStage");
    const lbPrev = document.getElementById("lbPrev");
    const lbNext = document.getElementById("lbNext");
    const lbClose = document.getElementById("lbClose");
    const navEl = document.getElementById("nav");
    let idx = 0;
    let lbLastFocus = null;
    let hideTimer = null;

    lightbox.setAttribute("aria-label", t("lb.aria", "Gallery viewer"));
    lbPrev.setAttribute("aria-label", t("lb.prev", "Previous image"));
    lbNext.setAttribute("aria-label", t("lb.next", "Next image"));
    lbClose.setAttribute("aria-label", t("lb.close", "Close"));

    const slides = [];
    const fullSrc = (img) => img.dataset.full || img.currentSrc || img.src;
    const capElOf = (el) => el.classList.contains("suite-media")
      ? el.closest(".suite-card").querySelector("h3")
      : el.querySelector("figcaption");
    const pad = (n) => String(n).padStart(2, "0");
    const preload = (i) => { new Image().src = fullSrc(slides[(i + slides.length) % slides.length].img); };

    const apply = (i) => {
      const s = slides[idx = (i + slides.length) % slides.length];
      lbImg.src = fullSrc(s.img);
      lbImg.alt = s.img.alt;
      lbCaption.textContent = s.capEl ? s.capEl.textContent : "";
      lbCount.textContent = pad(idx + 1) + " / " + pad(slides.length);
      preload(idx + 1); preload(idx - 1);
    };

    const goTo = (i) => {
      lbStage.classList.add("is-swap");
      setTimeout(() => {
        apply(i);
        const settle = () => requestAnimationFrame(() => lbStage.classList.remove("is-swap"));
        if (lbImg.complete) settle();
        else lbImg.addEventListener("load", settle, { once: true });
      }, 200);
    };

    const isOpen = () => !lightbox.hidden;

    const openLb = (i) => {
      lbLastFocus = document.activeElement;
      clearTimeout(hideTimer);
      apply(i);
      lightbox.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => lightbox.classList.add("is-open")));
      document.body.classList.add("lb-open");
      if (canInert) { mainEl.inert = true; footerEl.inert = true; navEl.inert = true; }
      if (lenis) lenis.stop();
      lbClose.focus({ preventScroll: true });
    };

    const closeLb = () => {
      if (!isOpen()) return;
      lightbox.classList.remove("is-open");
      hideTimer = setTimeout(() => { lightbox.hidden = true; }, 400);
      document.body.classList.remove("lb-open");
      if (canInert) { mainEl.inert = false; footerEl.inert = false; navEl.inert = false; }
      if (lenis) lenis.start();
      if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus({ preventScroll: true });
    };

    document.querySelectorAll(".welcome-figure, .suite-media, .dining-figure, .gal-item").forEach((el) => {
      const img = el.querySelector("img");
      if (!img) return;
      const key = fullSrc(img);
      let i = slides.findIndex((s) => s.key === key);
      if (i === -1) { slides.push({ key, img, capEl: capElOf(el) }); i = slides.length - 1; }
      const slideIndex = i;
      const cap = capElOf(el);
      el.setAttribute("data-lb-source", "");
      el.setAttribute("aria-label", (cap ? cap.textContent + " — " : "") + t("gal.open", "View full image"));
      if (el.tagName !== "A") {
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLb(slideIndex); }
        });
      }
      el.addEventListener("click", (e) => { e.preventDefault(); openLb(slideIndex); });
    });

    lbPrev.addEventListener("click", () => goTo(idx - 1));
    lbNext.addEventListener("click", () => goTo(idx + 1));
    lbClose.addEventListener("click", closeLb);
    lightbox.querySelector("[data-lb-close]").addEventListener("click", closeLb);

    window.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowLeft") goTo(idx - 1);
      else if (e.key === "ArrowRight") goTo(idx + 1);
      else if (e.key === "Tab") {
        /* keep focus cycling through the three controls */
        const items = [lbPrev, lbNext, lbClose];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && (i === -1 || i === items.length - 1)) { e.preventDefault(); items[0].focus(); }
      }
    });

    /* swipe through the catalogue on touch */
    let touchX = null;
    lightbox.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 44) (dx > 0 ? goTo(idx - 1) : goTo(idx + 1));
    }, { passive: true });
  }

  /* ════════════════════════════════════════════════
     MOTION LAYER — requires gsap + ScrollTrigger.
     If either CDN file failed, degrade to a static,
     fully readable and navigable page.
     ════════════════════════════════════════════════ */
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    if (preloader) preloader.remove();
    document.body.classList.add("no-motion");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const hasSplit = typeof SplitText !== "undefined";
  if (hasSplit) gsap.registerPlugin(SplitText);

  /* Smooth scroll */
  if (!reduceMotion && typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ── Initial states (JS-only, so no-JS users see everything) ── */
  const heroLines = document.querySelectorAll(".hero-title .line-inner");
  const heroBits = document.querySelectorAll(".hero .reveal-up, .booking-bar, .scroll-cue");
  let introTl = null;
  if (!reduceMotion) {
    gsap.set(heroLines, { yPercent: 115 });
    gsap.set(heroBits, { autoAlpha: 0, y: 36 });
    gsap.set(".nav", { autoAlpha: 0, y: -16 });
    introTl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    introTl
      .to(".nav", { autoAlpha: 1, y: 0, duration: 0.8 }, 0.1)
      .to(heroLines, { yPercent: 0, duration: 1.2, stagger: 0.13 }, 0)
      .to(heroBits, { autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.08 }, 0.3);
  }

  const finishLoad = () => {
    document.body.classList.remove("is-loading");
    if (lenis) lenis.start();
    if (introTl) introTl.play();
  };

  /* ── Preloader (kept tight: ~2s total so LCP isn't hostage;
        skipped entirely right after a language switch) ── */
  let skipPre = false;
  try {
    skipPre = sessionStorage.getItem("gd-skip-preloader") === "1";
    sessionStorage.removeItem("gd-skip-preloader");
  } catch (e) { /* storage blocked — play the full preloader */ }

  if (preloader && !reduceMotion && !skipPre) {
    if (lenis) lenis.stop();
    document.body.classList.add("is-loading");

    const paths = preloader.querySelectorAll(".gem-path");
    paths.forEach((p) => {
      const L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
    });

    /* Put the gold veil's offset in GSAP's own percent channel —
       mixing it with the CSS translateY(100%) fallback would bake
       the percentage into pixels and strand the veil over the page. */
    gsap.set(".veil-a", { y: 0, yPercent: 100 });

    const count = { v: 0 };
    const countEl = document.getElementById("loadCount");
    const loadTl = gsap.timeline({
      onComplete: () => { preloader.remove(); finishLoad(); }
    });
    loadTl
      .to(paths, { strokeDashoffset: 0, duration: 1.05, ease: "power2.inOut", stagger: 0.08 }, 0)
      .to(count, {
        v: 100, duration: 1.2, ease: "power2.inOut",
        onUpdate: () => { if (countEl) countEl.textContent = Math.round(count.v); }
      }, 0)
      .to(".preloader-inner", { autoAlpha: 0, y: -26, duration: 0.4, ease: "power2.in" }, "+=0.05")
      .to(".veil-a", { yPercent: -100, duration: 0.75, ease: "expo.inOut" }, "-=0.1")
      .to(".veil-b", { yPercent: -100, duration: 0.75, ease: "expo.inOut" }, "<0.08");
  } else {
    if (preloader) preloader.remove();
    finishLoad();
  }

  /* ── Nav behaviour ─────────────────────────────── */
  const nav = document.getElementById("nav");
  let lastY = 0;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle("is-scrolled", y > 40);
      if (y > lastY && y > 300 && !document.body.classList.contains("menu-open")) {
        nav.classList.add("is-hidden");
      } else {
        nav.classList.remove("is-hidden");
      }
      lastY = y;
    }
  });

  gsap.to("#scrollProgress", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 }
  });

  /* ── Hero scroll hand-off to the WebGL scene ───── */
  ScrollTrigger.create({
    trigger: "#hero",
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => { window.__gd.heroProgress = self.progress; }
  });
  gsap.to(".hero-content", {
    yPercent: -18, autoAlpha: 0.25, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "72% top", scrub: true }
  });

  if (finePointer && !reduceMotion) {
    window.addEventListener("mousemove", (e) => {
      window.__gd.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      window.__gd.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ── Split-text reveals ────────────────────────── */
  const buildSplits = () => {
    if (!hasSplit || reduceMotion) return;
    document.querySelectorAll(".split-lines").forEach((el) => {
      const split = new SplitText(el, { type: "lines", mask: "lines", linesClass: "sl-line" });
      gsap.from(split.lines, {
        yPercent: 112, duration: 1.15, ease: "expo.out", stagger: 0.09,
        scrollTrigger: { trigger: el, start: "top 84%", once: true }
      });
    });
    document.querySelectorAll(".split-fade").forEach((el) => {
      const split = new SplitText(el, { type: "lines" });
      gsap.from(split.lines, {
        autoAlpha: 0, y: 22, duration: 0.9, ease: "power3.out", stagger: 0.07,
        scrollTrigger: { trigger: el, start: "top 86%", once: true }
      });
    });
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildSplits);
  else buildSplits();

  /* Soft reveals. Gallery items are excluded on purpose: their `y`
     belongs to the parallax tween, so they reveal with opacity only. */
  if (!reduceMotion) {
    gsap.utils.toArray(".fac-card, .loc-row, .welcome-figure, .dining-figure, .loc-card").forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0, y: 44, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true }
      });
    });
    gsap.utils.toArray(".gal-item").forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0, duration: 1.1, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true }
      });
    });
  }

  /* ── Stat counters (HTML holds final values for no-JS) ── */
  document.querySelectorAll(".stat-num").forEach((el) => {
    const target = parseFloat(el.dataset.count || "0");
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) return; /* keep the values already in the HTML */
    const obj = { v: 0 };
    el.textContent = "0" + suffix;
    gsap.to(obj, {
      v: target, duration: 1.6, ease: "power2.out",
      onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; },
      scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  });

  /* ── Suite-card hover zoom (GSAP owns the transform, so it
        composes with the parallax instead of fighting it) ── */
  if (finePointer && !reduceMotion) {
    gsap.utils.toArray(".suite-card").forEach((card) => {
      const img = card.querySelector(".suite-media img");
      if (!img) return;
      card.addEventListener("mouseenter", () => gsap.to(img, { scale: 1.07, duration: 1.1, ease: "power3.out" }));
      card.addEventListener("mouseleave", () => gsap.to(img, { scale: 1, duration: 0.9, ease: "power3.out" }));
    });
  }

  /* ── Suites: pinned horizontal voyage (desktop, motion OK) ── */
  const mm = gsap.matchMedia();

  mm.add("(min-width: 861px)", () => {
    if (reduceMotion) return; /* CSS gives the track native overflow-x in that case */
    const amount = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -amount(),
      ease: "none",
      scrollTrigger: {
        trigger: ".suites",
        start: "top top",
        end: () => "+=" + amount(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => { if (bar) bar.style.transform = `scaleX(${self.progress})`; }
      }
    });
    /* subtle per-card parallax while travelling */
    gsap.utils.toArray(".suite-media img").forEach((img) => {
      gsap.fromTo(img, { xPercent: -6 }, {
        xPercent: 6, ease: "none",
        scrollTrigger: { trigger: img.closest(".suite-card"), containerAnimation: tween, start: "left right", end: "right left", scrub: true }
      });
    });
    /* keyboard support: keep focused cards in view by driving the
       page scroll instead of letting the browser desync scrollLeft */
    const pinEl = document.getElementById("suitesPin");
    const onFocusIn = (e) => {
      const card = e.target.closest(".suite-card, .suite-end");
      if (!card) return;
      pinEl.scrollLeft = 0;
      const st = tween.scrollTrigger;
      const targetX = Math.min(amount(), Math.max(0, card.offsetLeft - (window.innerWidth - card.offsetWidth) / 2));
      const dest = st.start + targetX;
      if (lenis) lenis.scrollTo(dest, { immediate: true });
      else window.scrollTo(0, dest);
      ScrollTrigger.update();
    };
    track.addEventListener("focusin", onFocusIn);
    return () => {
      track.removeEventListener("focusin", onFocusIn);
      if (bar) bar.style.transform = "scaleX(0)";
    };
  });

  /* ── Parallax imagery (±7.5% stays inside the 18% overscan) ── */
  if (!reduceMotion) {
    document.querySelectorAll(".img-parallax img").forEach((img) => {
      gsap.fromTo(img, { yPercent: -7.5 }, {
        yPercent: 7.5, ease: "none",
        scrollTrigger: { trigger: img.closest(".img-parallax"), start: "top bottom", end: "bottom top", scrub: true }
      });
    });
    document.querySelectorAll(".gal-item").forEach((item) => {
      const speed = parseFloat(item.dataset.speed || "1");
      gsap.to(item, {
        y: () => (1 - speed) * 160, ease: "none",
        scrollTrigger: { trigger: ".gal-grid", start: "top bottom", end: "bottom top", scrub: true }
      });
    });
    gsap.set(".footer-watermark", { xPercent: -50, x: 0 }); /* keep centering in the percent channel */
    gsap.to(".footer-watermark", {
      yPercent: -22, ease: "none",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true }
    });
  }

  /* ── Marquee ───────────────────────────────────── */
  if (!reduceMotion) {
    gsap.to("#marqueeTrack", { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
  }

  /* ── Magnetic buttons ──────────────────────────── */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".magnetic").forEach((btn) => {
      const strength = 26;
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * strength;
        const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
        gsap.to(btn, { x, y, duration: 0.5, ease: "power3.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* Recalculate pinned distances once everything has loaded */
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
