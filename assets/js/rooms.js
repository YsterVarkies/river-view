/* River View rooms: four doors, a room finder, and every photograph in a lightbox. */
(function () {
  'use strict';
  var RV = window.RV;
  if (!RV) return;
  var gsap = RV.gsap;
  var motion = RV.hasMotion && !RV.reduce;
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function doors() {
    var root = document.querySelector('[data-doors]');
    if (!root) return;
    var name = root.querySelector('[data-fit]');
    RV.fit(name);
    window.addEventListener('resize', function () { RV.fit(name); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { RV.fit(name); });
    if (!motion) return;
    gsap.set($$('[data-load]', root), { autoAlpha: 1 });
    var split = window.SplitText ? new window.SplitText(name, { type: 'chars', charsClass: 'char' }) : null;
    name.style.clipPath = 'inset(-40% -5% 0 -5%)';
    var row = root.querySelector('.hero__row');
    var items = $$('.door', root);
    var tl = gsap.timeline({ delay: document.documentElement.classList.contains('is-arriving') ? 0.4 : 0.05 });
    tl.fromTo(items, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, stagger: 0.08, ease: 'expo.out', immediateRender: true, clearProps: 'clipPath' }, 0)
      .fromTo($$('.door img', root), { scale: 1.3 }, { scale: 1, duration: 1.8, stagger: 0.08, ease: 'expo.out', immediateRender: true, clearProps: 'transform' }, 0)
      .fromTo($$('.door__label', root), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.07, immediateRender: true }, 0.45)
      .fromTo(split ? split.chars : name, { yPercent: 102 }, { yPercent: 0, duration: 0.95, stagger: 0.035, immediateRender: true }, 0.3)
      .fromTo(row.children, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, immediateRender: true }, 0.5);
    // Leaving the doors: the name sinks back below the kerb and the doors close to dark.
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true } })
      .to(name, { yPercent: 40, ease: 'none' }, 0)
      .to(row, { autoAlpha: 0, y: -30, ease: 'none', duration: 0.4 }, 0);
  }

  function finder() {
    var root = document.querySelector('[data-finder]');
    if (!root) return;
    var chips = $$('[data-need]', root);
    var items = $$('.finder__rooms li', root);
    var doorsEls = $$('[data-door]');
    var result = root.querySelector('[data-finder-result]');
    var join = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
    function update() {
      var needs = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; }).map(function (c) { return c.getAttribute('data-need'); });
      var fits = [];
      items.forEach(function (li) {
        var has = li.getAttribute('data-has').split(' ');
        var ok = needs.every(function (n) { return has.indexOf(n) > -1; });
        var label = li.querySelector('a').textContent.trim();
        li.classList.toggle('is-off', !ok);
        if (ok) fits.push(label);
        doorsEls.forEach(function (d) { if (d.getAttribute('data-door') === label.toLowerCase()) d.classList.toggle('is-dim', !ok); });
        if (ok && needs.length && motion) gsap.fromTo(li, { x: -10 }, { x: 0, duration: 0.6, ease: 'expo.out' });
      });
      if (!needs.length) result.textContent = 'All four rooms are shown.';
      else if (!fits.length) result.textContent = 'No single room has all of these. Try one less.';
      else if (fits.length === 1) result.textContent = 'The ' + fits[0] + ' Room fits.';
      else result.textContent = join(fits) + ' fit.';
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
        update();
      });
    });
  }

  function lightbox() {
    var lb = document.querySelector('[data-lightbox]');
    if (!lb) return;
    var stage = lb.querySelector('[data-lb-stage]');
    var count = lb.querySelector('[data-lb-count]');
    var cap = lb.querySelector('[data-lb-cap]');
    var prev = lb.querySelector('[data-lb-prev]');
    var next = lb.querySelector('[data-lb-next]');
    var close = lb.querySelector('[data-lb-close]');
    var group = [], index = 0, opener = null;

    function render(dir) {
      var item = group[index];
      var img = new Image();
      img.decoding = 'async';
      img.alt = item.alt;
      img.src = item.src;
      var old = stage.querySelector('img');
      stage.appendChild(img);
      if (old) old.remove();
      if (motion) gsap.fromTo(img, { x: dir * 50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' });
      count.textContent = (index + 1) + ' of ' + group.length + '  ';
      cap.textContent = item.title;
    }
    function step(dir) { index = (index + dir + group.length) % group.length; render(dir); }
    function open(items, i, from) {
      group = items; index = i; opener = from;
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add('is-open'); setTimeout(function () { close.focus(); }, 30); });
      render(0);
      if (RV.lenis) RV.lenis.stop();
      document.documentElement.style.overflow = 'hidden';
    }
    function shut() {
      lb.classList.remove('is-open');
      setTimeout(function () { lb.hidden = true; stage.innerHTML = ''; }, 320);
      if (RV.lenis) RV.lenis.start();
      document.documentElement.style.overflow = '';
      if (opener) opener.focus();
    }
    $$('[data-gallery]').forEach(function (g) {
      var title = g.getAttribute('data-gallery');
      var btns = $$('button[data-full]', g);
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          // Only photographs that are showing: on a phone some are hidden.
          var shown = btns.filter(function (x) { return x.offsetParent !== null; });
          var items = shown.map(function (x) { return { src: x.getAttribute('data-full'), alt: x.querySelector('img').alt, title: title }; });
          open(items, shown.indexOf(b), b);
        });
      });
    });
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    close.addEventListener('click', shut);
    stage.addEventListener('click', function (e) { if (e.target === stage) shut(); });
    var x0 = null;
    stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    stage.addEventListener('pointerup', function (e) { if (x0 !== null && Math.abs(e.clientX - x0) > 50) step(e.clientX < x0 ? 1 : -1); x0 = null; });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') shut();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Tab') {
        var f = [prev, next, close];
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }

  RV.start(function () {
    doors();
    finder();
    lightbox();
  });
})();
