/* River View home: the gate opens as you scroll in, the headline crosses the photograph, the rooms crossfade
   behind their cards, and guest ratings run across the page. */
(function () {
  'use strict';
  var RV = window.RV;
  if (!RV) return;
  var gsap = RV.gsap;
  var motion = RV.hasMotion && !RV.reduce;
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function hero() {
    var root = document.querySelector('[data-hero]');
    if (!root) return;
    var media = root.querySelector('.hero__media');
    var img = root.querySelector('[data-hero-img]');
    var name = root.querySelector('[data-hero-name]');
    var row = root.querySelector('[data-hero-row]');
    var dark = root.querySelector('[data-hero-dark]');
    RV.fit(name);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { RV.fit(name); });
    if (!motion) return;
    // The stylesheet holds [data-load] and the zoomed picture until the page is ready; take over with inline values first.
    gsap.set($$('[data-load]', root), { autoAlpha: 1 });

    var split = window.SplitText ? new window.SplitText(name, { type: 'words,chars', charsClass: 'char', wordsClass: 'word' }) : null;
    var chars = split ? split.chars : [name];
    var words = split ? split.words : [];
    name.style.clipPath = 'inset(-40% -5% 0 -5%)';

    // Arrival: the street settles, the name rises out of the kerb line.
    var load = gsap.timeline({ delay: document.documentElement.classList.contains('is-arriving') ? 0.4 : 0.05 });
    load.fromTo(media, { scale: 1.12 }, { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'transform' }, 0)
      .fromTo(chars, { yPercent: 102 }, { yPercent: 0, duration: 0.95, stagger: 0.032, ease: 'expo.out', immediateRender: true }, 0.08)
      .fromTo(row.children, { y: 16 }, { y: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out', immediateRender: true }, 0.05);

    // Scrolling in: the camera walks through the gate and the name parts like its two leaves.
    var tl = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top top-=1', end: '+=115%', pin: true, scrub: true, anticipatePin: 1 },
    });
    tl.to(img, { scale: 1.85, ease: 'none', duration: 1 }, 0)
      .to(row, { y: -36, autoAlpha: 0, ease: 'none', duration: 0.3 }, 0);
    if (words.length === 2) {
      tl.to(words[0], { xPercent: -62, ease: 'none', duration: 0.8 }, 0)
        .to(words[1], { xPercent: 62, ease: 'none', duration: 0.8 }, 0);
    }
    tl.to(name, { autoAlpha: 0, ease: 'none', duration: 0.35 }, 0.5)
      .to(dark, { opacity: 0.55, ease: 'none', duration: 0.5 }, 0.5);

    window.addEventListener('resize', function () { RV.fit(name); });
  }

  function intro() {
    var title = document.querySelector('[data-intro-title]');
    if (!title) return;
    // Each line gets an inner span that rises inside its own mask.
    title.querySelectorAll(':scope > span').forEach(function (line) {
      line.innerHTML = '<span class="intro__in">' + line.innerHTML + '</span>';
      line.classList.add('intro__mask');
    });
    if (!motion) return;
    var inner = $$('.intro__in', title);
    var tl = gsap.timeline({ scrollTrigger: { trigger: title, start: 'top 90%', once: true } });
    inner.forEach(function (line, i) {
      tl.fromTo(line, { yPercent: 108 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', immediateRender: true }, i * 0.1);
    });
    var frame = document.querySelector('[data-intro-frame]');
    if (frame) {
      gsap.fromTo(frame, { clipPath: 'inset(0% 0% 100% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', immediateRender: true, clearProps: 'clipPath',
        scrollTrigger: { trigger: frame, start: 'top 96%', once: true },
      });
    }
  }

  function showcase() {
    var root = document.querySelector('[data-showcase]');
    if (!root) return;
    var imgs = $$('[data-showcase-bg] img', root);
    var slips = $$('[data-slip]', root);
    var order = imgs.map(function (i) { return i.getAttribute('data-room'); });
    var current = 0, timer = null, hovering = false, inView = false;

    function show(key, instant) {
      var idx = order.indexOf(key);
      if (idx < 0) return;
      current = idx;
      imgs.forEach(function (img) {
        var on = img.getAttribute('data-room') === key;
        if (motion && !instant) gsap.to(img, { autoAlpha: on ? 1 : 0, duration: 1.6, ease: 'sine.inOut', overwrite: true });
        else { img.style.opacity = on ? 1 : 0; img.style.visibility = on ? 'visible' : 'hidden'; }
      });
      slips.forEach(function (s) { s.classList.toggle('is-active', s.getAttribute('data-slip') === key); });
    }
    function schedule() {
      clearTimeout(timer);
      if (!motion || hovering || !inView || document.hidden) return;
      timer = setTimeout(function () { show(order[(current + 1) % order.length]); schedule(); }, 5600);
    }
    imgs.forEach(function (img, i) { img.classList.remove('is-on'); img.style.opacity = i ? 0 : 1; img.style.visibility = i ? 'hidden' : 'visible'; });
    show(order[0], true);

    slips.forEach(function (s) {
      var key = s.getAttribute('data-slip');
      var link = s.querySelector('a');
      var enter = function () { hovering = true; clearTimeout(timer); show(key); };
      s.addEventListener('mouseenter', enter);
      if (link) link.addEventListener('focus', enter);
    });
    var list = root.querySelector('[data-slips]');
    if (list) {
      list.addEventListener('mouseleave', function () { hovering = false; schedule(); });
      list.addEventListener('focusout', function (e) { if (!list.contains(e.relatedTarget)) { hovering = false; schedule(); } });
    }
    new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; schedule(); }, { threshold: 0.35 }).observe(root);
    document.addEventListener('visibilitychange', schedule);

    if (motion) {
      gsap.fromTo(root.querySelectorAll('.slip'), { y: 60, scale: 0.96 }, {
        y: 0, scale: 1, duration: 1.2, stagger: 0.07, ease: 'expo.out', immediateRender: true,
        scrollTrigger: { trigger: root, start: 'top 70%', once: true },
      });
      gsap.fromTo(imgs, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  }

  /* ---------- Guest ratings run across the page, right to left ---------- */
  function marquee() {
    var root = document.querySelector('[data-marquee]');
    if (!root) return;
    var track = root.querySelector('.marquee__track');
    var btn = document.querySelector('[data-marquee-toggle]');
    if (RV.reduce || !track) { if (btn) btn.hidden = true; return; }
    // A second copy, hidden from assistive tech, makes the loop seamless.
    var copy = track.cloneNode(true);
    copy.removeAttribute('aria-label');
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('inert', '');
    copy.classList.add('marquee__track--copy');
    track.parentNode.appendChild(copy);
    var size = function () {
      var w = track.getBoundingClientRect().width;
      root.style.setProperty('--marquee-dur', Math.max(30, Math.round(w / 55)) + 's');
    };
    size();
    window.addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    root.classList.add('is-running');
    new IntersectionObserver(function (e) { root.classList.toggle('is-offscreen', !e[0].isIntersecting); }, { rootMargin: '80px' }).observe(root);
    if (btn) {
      btn.addEventListener('click', function () {
        var paused = root.classList.toggle('is-paused');
        btn.setAttribute('aria-pressed', String(paused));
        btn.textContent = paused ? 'Play scrolling' : 'Pause scrolling';
      });
    }
  }

  RV.start(function () {
    hero();
    intro();
    showcase();
    marquee();
  });
})();
