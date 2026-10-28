/* River View, your stay: the title arrives with the live check-in line, and answers open smoothly. */
(function () {
  'use strict';
  var RV = window.RV;
  if (!RV) return;
  var gsap = RV.gsap;
  var motion = RV.hasMotion && !RV.reduce;

  function hero() {
    var root = document.querySelector('[data-stay-hero]');
    if (!root || !motion) return;
    var loads = root.querySelectorAll('[data-load]');
    gsap.set(loads, { autoAlpha: 1 });
    var title = root.querySelector('h1');
    var split = window.SplitText ? new window.SplitText(title, { type: 'words,chars', charsClass: 'char', mask: 'lines' }) : null;
    var pic = root.querySelector('.stay-hero__pic');
    var tl = gsap.timeline({ delay: document.documentElement.classList.contains('is-arriving') ? 0.4 : 0.05 });
    tl.fromTo(pic, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath' }, 0)
      .fromTo(pic.querySelector('img'), { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out', immediateRender: true, clearProps: 'transform' }, 0.1)
      .fromTo(split ? split.chars : title, { yPercent: 105 }, { yPercent: 0, duration: 0.95, stagger: 0.04, ease: 'expo.out', immediateRender: true }, 0.15)
      .fromTo([loads[1], loads[2]], { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.1, immediateRender: true }, 0.45);
    gsap.to(pic.querySelector('img'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true } });
  }

  function faq() {
    var list = document.querySelector('[data-faq]');
    if (!list) return;
    list.querySelectorAll('details').forEach(function (d) {
      var summary = d.querySelector('summary');
      var body = d.querySelector('.faq__a');
      d.addEventListener('toggle', function () {
        if (!motion || !d.open) return;
        gsap.fromTo(body, { y: -10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out' });
      });
      summary.addEventListener('pointerdown', function () {
        if (motion) gsap.fromTo(summary, { scale: 0.99 }, { scale: 1, duration: 0.3, ease: 'expo.out' });
      });
    });
  }

  /* The Royal Room's pendant lamp: lit while check-in is open, and the visitor can switch it themselves. */
  function lamp() {
    var el = document.querySelector('[data-lamp]');
    if (!el || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var script = document.createElement('script');
      script.src = 'assets/js/scenes.js?v=3'; script.async = true;
      script.onload = function () {
        var api = window.RVScenes && window.RVScenes.lamp(el, { lit: RV.checkinOpen() });
        if (!api) return;
        var touched = false;
        el.addEventListener('click', function () { touched = true; api.toggle(); });
        setInterval(function () { if (!touched) api.set(RV.checkinOpen()); }, 60000);
      };
      document.body.appendChild(script);
    }, { rootMargin: '300px 0px' });
    io.observe(el);
  }

  RV.start(function () {
    hero();
    faq();
    lamp();
  });
})();
