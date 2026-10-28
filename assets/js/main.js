/* River View: shared behaviour for every page.
   Smooth scroll, navigation, page curtain, booking dialog, section entrances, and the live check-in line. */
(function () {
  'use strict';
  var d = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var hasMotion = !!(gsap && ST);
  var RV = (window.RV = { reduce: reduce, gsap: gsap, lenis: null, hasMotion: hasMotion });

  var TZ = 'Africa/Johannesburg';

  var arriving = false;
  try { arriving = !!sessionStorage.getItem('rv-arrive'); sessionStorage.removeItem('rv-arrive'); } catch (e) {}

  // No GSAP, or reduced motion: nothing is held back for an entrance.
  if (!hasMotion || reduce) d.classList.add('no-reveal');

  if (hasMotion) {
    gsap.registerPlugin(ST);
    if (window.SplitText) gsap.registerPlugin(window.SplitText);
    gsap.defaults({ ease: 'expo.out', duration: 0.9 });
  }

  /* ---------- Smooth scroll ---------- */
  if (hasMotion && window.Lenis && !reduce) {
    var lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
    RV.lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToEl(el, immediate) {
    if (!el) return;
    var offset = -(parseInt(getComputedStyle(d).getPropertyValue('--nav-h'), 10) || 72);
    if (RV.lenis) RV.lenis.scrollTo(el, { offset: offset, immediate: !!immediate, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset + offset, behavior: immediate || reduce ? 'auto' : 'smooth' });
  }
  RV.scrollToEl = scrollToEl;

  /* ---------- Navigation ---------- */
  var nav = document.querySelector('[data-nav]');
  var bar = document.querySelector('.progress span');
  var menu = document.querySelector('[data-menu]');
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var menuOpen = false;
  var lastY = 0;

  function onScroll(y, progress) {
    if (nav) {
      nav.classList.toggle('is-solid', y > window.innerHeight * 0.82 || d.hasAttribute('data-nav-solid'));
      var goingDown = y > lastY + 2, goingUp = y < lastY - 2;
      if (goingDown && y > window.innerHeight * 0.6 && !menuOpen) nav.classList.add('is-hidden');
      else if (goingUp || y < 80) nav.classList.remove('is-hidden');
    }
    if (bar) bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, progress)).toFixed(4) + ')';
    lastY = y;
  }
  function readScroll() {
    var max = Math.max(1, d.scrollHeight - window.innerHeight);
    var y = window.pageYOffset;
    onScroll(y, y / max);
  }
  if (RV.lenis) RV.lenis.on('scroll', function (l) { onScroll(l.scroll, l.progress); });
  else window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menuOpen = open;
    if (open) { menu.hidden = false; void menu.offsetWidth; }
    else setTimeout(function () { if (!menuOpen) menu.hidden = true; }, 560);
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (nav) { nav.classList.remove('is-hidden'); nav.classList.toggle('is-menu', open); }
    if (RV.lenis) open ? RV.lenis.stop() : RV.lenis.start();
    if (open) {
      var first = menu.querySelector('a');
      if (first) setTimeout(function () { first.focus(); }, 80);
      if (hasMotion && !reduce) gsap.fromTo(menu.querySelectorAll('.menu__links a'), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.06, duration: 0.8, delay: 0.15 });
    }
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });

  /* ---------- Booking dialog ---------- */
  var dialog = document.querySelector('[data-book-dialog]');
  function openBook(e) {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (e) e.preventDefault();
    if (menuOpen) setMenu(false);
    dialog.showModal();
    if (RV.lenis) RV.lenis.stop();
    if (hasMotion && !reduce) {
      gsap.fromTo(dialog, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out' });
      gsap.fromTo(dialog.querySelectorAll('.book__inner > *'), { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.05, duration: 0.6, delay: 0.08 });
    }
  }
  function closeBook() {
    if (!dialog || !dialog.open) return;
    var done = function () { dialog.close(); };
    if (hasMotion && !reduce) gsap.to(dialog, { y: 16, autoAlpha: 0, duration: 0.25, ease: 'power2.in', onComplete: done });
    else done();
  }
  if (dialog) {
    dialog.addEventListener('close', function () { if (RV.lenis) RV.lenis.start(); gsap && gsap.set(dialog, { clearProps: 'all' }); });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeBook(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeBook(); });
    var closer = dialog.querySelector('[data-book-close]');
    if (closer) closer.addEventListener('click', closeBook);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-book]');
    if (t && dialog) openBook(e);
  });
  RV.openBook = openBook;

  /* ---------- Page curtain ---------- */
  var curtain = document.querySelector('[data-curtain]');
  function sameSite(a) {
    return a.protocol === location.protocol && a.host === location.host;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || a.hasAttribute('data-book')) return;
    if (a.target === '_blank' || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!sameSite(a)) return;
    var samePage = a.pathname === location.pathname || (/\/$/.test(location.pathname) && /index\.html$/.test(a.pathname));
    if (samePage && a.hash) {
      var target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (target) { e.preventDefault(); if (menuOpen) setMenu(false); scrollToEl(target); history.replaceState(null, '', a.hash); }
      return;
    }
    if (samePage && !a.hash) {
      e.preventDefault(); if (menuOpen) setMenu(false);
      if (RV.lenis) RV.lenis.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!curtain || !hasMotion || reduce) return;
    e.preventDefault();
    try { sessionStorage.setItem('rv-arrive', '1'); } catch (err) {}
    var href = a.href, gone = false;
    var go = function () { if (!gone) { gone = true; window.location.href = href; } };
    gsap.fromTo(curtain, { y: 0, yPercent: 101 }, { y: 0, yPercent: 0, duration: 0.62, ease: 'power3.inOut', onComplete: go });
    // A page in a background tab gets no animation frames; leave anyway.
    setTimeout(go, 900);
    gsap.fromTo(curtain.querySelector('.curtain__name'), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, delay: 0.22 });
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && curtain && hasMotion) gsap.set(curtain, { y: 0, yPercent: 101 });
  });

  function liftCurtain() {
    if (!curtain || !hasMotion) return;
    if (arriving && !reduce) {
      gsap.set(curtain, { y: 0, yPercent: 0 });
      gsap.to(curtain, { yPercent: -101, duration: 0.85, ease: 'power3.inOut', delay: 0.05, onComplete: function () { gsap.set(curtain, { y: 0, yPercent: 101 }); } });
    } else {
      gsap.set(curtain, { y: 0, yPercent: 101 });
    }
  }

  /* ---------- Section entrances ----------
     Every [data-reveal] is hidden by the stylesheet before any script paints, so nothing shows and then
     jumps. When one nears the screen, its revealer puts the start state inline, marks it .is-in (which lifts
     the stylesheet's hiding) and plays it in, all in the same frame. */
  var revealers = {
    lines: function (el, delay) {
      var split = window.SplitText ? new window.SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'line' }) : null;
      if (!split) return gsap.fromTo(el, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, delay: delay, clearProps: 'transform,opacity,visibility' });
      return gsap.fromTo(split.lines, { yPercent: 105 }, {
        yPercent: 0, duration: 1.05, stagger: 0.09, delay: delay, ease: 'expo.out', immediateRender: true,
        onComplete: function () { split.revert(); },
      });
    },
    text: function (el, delay) {
      return gsap.fromTo(el, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, delay: delay, ease: 'expo.out', immediateRender: true, clearProps: 'transform,opacity,visibility' });
    },
    pic: function (el, delay) {
      var img = el.querySelector('img');
      gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
      if (img && !img.hasAttribute('data-parallax')) gsap.set(img, { scale: 1.18 });
      var tl = gsap.timeline({ delay: delay });
      tl.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.out', clearProps: 'clipPath' }, 0);
      if (img && !img.hasAttribute('data-parallax')) tl.to(img, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' }, 0);
      return tl;
    },
    list: function (el, delay) {
      var items = Array.prototype.slice.call(el.children);
      return gsap.fromTo(items.length ? items : el, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.06, delay: delay, ease: 'expo.out', immediateRender: true, clearProps: 'transform,opacity,visibility' });
    },
    row: function (el, delay) {
      var parts = Array.prototype.slice.call(el.querySelectorAll('.row__text > *'));
      var pic = el.querySelector('.row__pic .frame');
      var img = pic && pic.querySelector('img');
      gsap.set(parts, { y: 24, autoAlpha: 0 });
      if (pic) gsap.set(pic, { clipPath: 'inset(0% 0% 100% 0%)' });
      if (img) gsap.set(img, { scale: 1.2 });
      var tl = gsap.timeline({ delay: delay });
      tl.to(parts, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, 0);
      if (pic) {
        tl.to(pic, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.out', clearProps: 'clipPath' }, 0.12);
        tl.to(img, { scale: 1, duration: 1.5, ease: 'expo.out', clearProps: 'transform' }, 0.12);
      }
      return tl;
    },
  };
  function setupReveals(root) {
    if (!hasMotion || reduce) return;
    var els = (root || document).querySelectorAll('[data-reveal]');
    if (!els.length) return;
    ST.batch(els, {
      start: 'clamp(top 94%)',
      once: true,
      onEnter: function (batch) {
        batch.forEach(function (el, i) {
          var kind = el.getAttribute('data-reveal');
          if (!revealers[kind] || el.classList.contains('is-in')) return;
          el.classList.add('is-revealing');
          var tween = revealers[kind](el, i * 0.08);
          el.classList.add('is-in');
          var prev = tween.eventCallback('onComplete');
          tween.eventCallback('onComplete', function () {
            if (prev) prev.apply(this, arguments);
            el.classList.remove('is-revealing');
          });
        });
      },
    });
  }
  RV.revealers = revealers;

  /* ---------- Slow drift on large photographs ---------- */
  function setupParallax() {
    if (!hasMotion || reduce) return;
    document.querySelectorAll('[data-parallax]').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -5, scale: 1.12 }, {
        yPercent: 5, scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  /* ---------- Check-in line (South African Standard Time) ---------- */
  function sastParts(date) {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
    var h = 0, m = 0;
    parts.forEach(function (p) { if (p.type === 'hour') h = parseInt(p.value, 10) % 24; if (p.type === 'minute') m = parseInt(p.value, 10); });
    return { h: h, m: m, label: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') };
  }
  function span(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return (h ? h + ' h ' : '') + m + ' min';
  }
  function checkinLine(now) {
    var t = now.h * 60 + now.m, open = 14 * 60, close = 22 * 60;
    if (t >= open && t < close) return 'Check-in is open now, for another ' + span(close - t) + '.';
    if (t < open) return 'Check-in opens today at 14:00, in ' + span(open - t) + '.';
    return 'Check-in has closed for tonight. It opens again at 14:00.';
  }
  function tick() {
    var now = new Date();
    var p = sastParts(now);
    document.querySelectorAll('[data-checkin]').forEach(function (el) { el.textContent = checkinLine(p); });
    document.querySelectorAll('[data-checkin-title]').forEach(function (el) {
      var t = p.h * 60 + p.m;
      el.textContent = t >= 14 * 60 && t < 22 * 60 ? 'Check-in is open' : t < 14 * 60 ? 'Check-in opens at 14:00' : 'Check-in has closed';
    });
  }
  tick();
  setInterval(tick, 30000);
  RV.sastParts = sastParts;
  RV.checkinOpen = function () { var p = sastParts(new Date()), t = p.h * 60 + p.m; return t >= 14 * 60 && t < 22 * 60; };

  /* ---------- A name set to fill the width between the margins ---------- */
  RV.fit = function (el) {
    if (!el) return;
    el.style.fontSize = "";
    var range = document.createRange();
    range.selectNodeContents(el);
    var textW = range.getBoundingClientRect().width;
    var boxW = el.getBoundingClientRect().width;
    if (!textW || !boxW) return;
    var size = parseFloat(getComputedStyle(el).fontSize) * (boxW / textW);
    el.style.fontSize = Math.min(size, window.innerHeight * 0.38).toFixed(1) + "px";
  };

  /* ---------- Start: called by each page once its own scenes are set ---------- */
  RV.start = function (pageSetup) {
    try { if (typeof pageSetup === 'function') pageSetup(); } catch (err) { if (window.console) console.error(err); }
    setupReveals();
    setupParallax();
    RV.started = true;
    d.classList.add('ready');
    liftCurtain();
    if (hasMotion) {
      var settle = function () {
        ST.refresh();
        if (location.hash) {
          var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
          if (target) scrollToEl(target, true);
        }
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle); else settle();
      window.addEventListener('load', function () { ST.refresh(); });
    }
  };
})();
