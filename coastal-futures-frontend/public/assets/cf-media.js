/* Coastal Futures — câblage des photos réelles dans les emplacements data-media.
   Source unique de vérité : un identifiant data-media -> un fichier photo.
   Pose la photo en background-image (cover) sur le slot, masque les monogrammes
   et le voile mesh ::after, et alimente data-img des cartes médiathèque (lightbox).
   Les slots non mappés (annuaires dynamiques) restent en dégradé teal + monogramme. */
(function () {
  var B = 'assets/media/';

  // id data-media -> chemin relatif sous assets/media/
  var M = {
    /* a-propos.html */
    'apropos-frame-saint-louis': '05-stories/saint-louis-coastline.webp',
    'apropos-pays-senegal': '05-stories/story-senegal-solar-entrepreneur.webp',
    'apropos-pays-ghana': '05-stories/story-ghana-entrepreneur.webp',
    'apropos-pays-guinee': '05-stories/story-guinea-fishing.webp',
    'apropos-pays-liberia': '05-stories/story-liberia-mangrove.webp',
    'apropos-pays-sierraleone': '05-stories/story-sierra-leone-agriculture.webp',

    /* article.html */
    'article-hero-lancement-dakar': '01-events/launch-ceremony-wide.webp',
    'article-rel-mangrove': '07-library/scene-mangrove-restoration.webp',
    'article-rel-recyclage': '07-library/scene-recycling-sorting.webp',
    'article-rel-solaire': '07-library/scene-solar-minigrid.webp',

    /* ecosysteme.html */
    'hub-collage-entrepreneur': '06-hub/hub-founder-at-work-vertical.webp',
    'hub-collage-solaire': '06-hub/solar-panel-detail.webp',
    'hub-collage-mangrove': '06-hub/mangrove-planting-detail.webp',
    'hub-voice-portrait': '08-portraits/portrait-testimonial.webp',

    /* evenement.html */
    'event-hero-lancement-dakar': '01-events/launch-stage-panel.webp',
    'event-rel-webinaire': '01-events/webinar-online-session.webp',
    'event-rel-atelier': '01-events/workshop-in-room.webp',
    'event-rel-terrain': '01-events/field-day-outdoors.webp',

    /* evenements.html */
    'event-featured-lancement-dakar': '09-extras/extra-launch-signing.webp',

    /* fiche-hub.html */
    'hub-hero-freetown-climate': '06-hub/hub-freetown-in-action.webp',

    /* fiche-projet.html (mangrove) */
    'project-hero-mangrove-monrovia': '02-mangroves/mangrove-restoration-hero.webp',
    'project-terrain-mangrove-1': '02-mangroves/mangrove-planting-hands.webp',
    'project-terrain-mangrove-2': '02-mangroves/mangrove-nursery-saplings.webp',
    'project-terrain-mangrove-3': '02-mangroves/mangrove-restored-channel.webp',

    /* index.html */
    'home-portal-feature': '09-extras/extra-launch-signing.webp',

    /* mediatheque.html */
    'media-restauration-de-mangroves': '07-library/scene-mangrove-restoration.webp',
    'media-teaser-du-lancement-du-programme': '01-events/launch-ceremony-wide.webp',
    'media-mini-reseau-solaire': '07-library/scene-solar-minigrid.webp',
    'media-collecte-et-recyclage': '07-library/scene-recycling-sorting.webp',
    'media-communaute-de-peche': '07-library/scene-fishing-boats.webp',
    'media-temoignage-d-un-entrepreneur-labellise': '05-stories/story-senegal-solar-entrepreneur.webp',
    'media-agriculture-resiliente': '07-library/scene-resilient-farming.webp',
    'media-littoral-atlantique': '07-library/scene-coastline-aerial.webp',

    /* profil-mentor.html */
    'portrait-mentor-kwame-asante': '08-portraits/portrait-kwame-asante.webp',

    /* profil-startup.html */
    'startup-cover-dakar-solar': '03-solar/solar-array-aerial.webp',

    /* projet.html (solaire) */
    'project-hero-mini-reseaux-solaires': '03-solar/solar-minigrid-hero.webp',
    'project-gallery-solaire-1': '03-solar/solar-village-array.webp',
    'project-thumb-1': '03-solar/solar-installer-at-work.webp',
    'project-thumb-2': '03-solar/solar-array-aerial.webp',
    'project-thumb-3': '06-hub/solar-panel-detail.webp',
    'project-thumb-4': '03-solar/solar-village-array.webp',
    'project-sim-mangrove': '07-library/scene-mangrove-restoration.webp',
    'project-sim-recyclage': '07-library/scene-recycling-sorting.webp',
    'project-sim-agriculture': '07-library/scene-resilient-farming.webp'
  };

  // positionnement focal (sujet/visage décentré) — défaut "center"
  var POS = {
    'event-hero-lancement-dakar': 'center 38%',
    'apropos-pays-senegal': 'center 28%',
    'apropos-pays-guinee': 'center 30%',
    'apropos-pays-sierraleone': 'center 35%',
    'media-temoignage-d-un-entrepreneur-labellise': 'center 30%',
    'hub-collage-entrepreneur': 'center 24%',
    'startup-cover-dakar-solar': 'center 60%'
  };

  // styles globaux : retirer le voile mesh ::after et masquer les monogrammes
  function injectCss() {
    if (document.getElementById('cf-media-css')) return;
    var s = document.createElement('style');
    s.id = 'cf-media-css';
    s.textContent =
      '[data-media].cf-has-photo::after{display:none!important;}' +
      '[data-media].cf-has-photo>span:not(.pstat):not(.m-chip):not(.fchip):not(.chip):not([class*="bdg"]){opacity:0!important;transition:none!important;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function apply(el) {
    var id = el.getAttribute('data-media');
    if (!id || !M[id] || el.classList.contains('cf-has-photo')) return;
    var path = B + M[id];
    el.style.backgroundImage = "url('" + path + "')";
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = POS[id] || 'center';
    el.style.backgroundRepeat = 'no-repeat';
    el.classList.add('cf-has-photo');
    // médiathèque : alimente la lightbox (data-img de la figure parente)
    var fig = el.closest && el.closest('figure.m-card');
    if (fig && !fig.getAttribute('data-img')) fig.setAttribute('data-img', path);
  }

  function applyAll(root) {
    var nodes = (root || document).querySelectorAll('[data-media]');
    for (var i = 0; i < nodes.length; i++) apply(nodes[i]);
  }

  function init() {
    injectCss();
    applyAll(document);
    // contenu rendu par JS après coup (filtres médiathèque, etc.)
    setTimeout(function () { applyAll(document); }, 300);
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var a = muts[i].addedNodes;
          for (var j = 0; j < a.length; j++) {
            var n = a[j];
            if (n.nodeType !== 1) continue;
            if (n.hasAttribute && n.hasAttribute('data-media')) apply(n);
            if (n.querySelectorAll) applyAll(n);
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.cfMediaApply = applyAll;
})();
