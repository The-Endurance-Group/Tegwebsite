/* Concept real estate pages: count up numbers marked data-count when they scroll into view. */
(function () {
  var els = document.querySelectorAll('[data-rh-count]');
  if (!els.length) return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) return;
  function run(el) {
    var end = parseInt(el.getAttribute('data-rh-count'), 10);
    var pre = el.getAttribute('data-rh-prefix') || '', suf = el.getAttribute('data-rh-suffix') || '';
    var start = null, dur = 1200;
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(end * e).toLocaleString('en-US') + suf;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
  }, { threshold: 0.6 });
  els.forEach(function (el) { io.observe(el); });
})();

/* Play the "Not a product" animation when it scrolls into view (ported from the landing page). */
(function () {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var s = document.getElementById('premium');
  if (!s) return;
  s.classList.add('pm-ready');
  new IntersectionObserver(function (e) {
    var r = e[0].intersectionRatio;
    if (r >= 0.35) s.classList.add('pm-play');
    else if (r === 0) s.classList.remove('pm-play');
  }, { threshold: [0, 0.35] }).observe(s);
})();
