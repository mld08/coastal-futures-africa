/* Coastal Futures — reveal safety guard.
   The per-page scroll-reveal animations set `.reveal{opacity:0}` and only add
   `.in` (opacity:1) when a window scroll/inView check fires. On some devices and
   embeddings that check never runs for content below the fold, leaving whole
   sections blank (notably the news list). This guard makes reveal bulletproof:
   1) an IntersectionObserver reveals each `.reveal` as it enters the viewport,
      independent of which element scrolls;
   2) an unconditional timeout safety net forces every remaining `.reveal` visible,
      so content can NEVER stay permanently hidden.
   It only ADDS `.in` (same contract as the page scripts), so it composes cleanly. */
(function () {
  function showAll() {
    var n = document.querySelectorAll('.reveal:not(.in)');
    for (var i = 0; i < n.length; i++) n[i].classList.add('in');
  }
  function setup() {
    try {
      if (!('IntersectionObserver' in window)) { showAll(); return; }
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('in');
            io.unobserve(entries[i].target);
          }
        }
      }, { root: null, rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
      var n = document.querySelectorAll('.reveal');
      for (var i = 0; i < n.length; i++) io.observe(n[i]);
    } catch (e) { showAll(); }
    // absolute safety net : never leave content invisible (covers late-injected rows too)
    setTimeout(showAll, 2200);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else { setup(); }
  window.addEventListener('load', function () { setTimeout(showAll, 600); });
  window.cfRevealAll = showAll;
})();
