/* Coastal Futures — member notification behaviour (audit U1).
   The dashboard .notif items were static (cursor:default, no handler) — clicking did
   nothing. This makes every notification keyboard/click-actionable: it routes to the
   relevant in-app page (inferred from its text, or an explicit data-href), marks itself
   read, and keeps the bell dot in sync. Member-space register only (entrepreneur/mentor). */
(function(){
  function route(txt){
    var t=(txt||'').toLowerCase();
    if(/candidature|application|dossier/.test(t)) return 'suivi-candidature.html';
    if(/mentor|mentorat/.test(t)) return 'espace-mentors.html';
    if(/appel|call ouvert|open call|fonds/.test(t)) return 'espace-appels.html';
    if(/labellis|certified|projet|project/.test(t)) return 'fiche-projet.html';
    if(/message|réponse|reply/.test(t)) return (document.body.getAttribute('data-msg-page')||'messagerie.html');
    if(/événement|event|atelier|webinaire/.test(t)) return 'evenement.html';
    if(/ressource|guide|replay|modèle/.test(t)) return 'espace-ressources.html';
    return '';
  }
  function dotEls(){ return [].slice.call(document.querySelectorAll('.tb-icon .dot, #cfBellDot, .bell .dot')); }
  function syncDot(){ var any=document.querySelector('.notif.unread'); dotEls().forEach(function(d){ d.style.display=any?'':'none'; }); }
  function wire(n){
    if(n.__wired) return; n.__wired=true;
    var href=n.getAttribute('data-href')||route(n.textContent);
    n.style.cursor='pointer';
    n.setAttribute('role','link'); n.setAttribute('tabindex','0');
    function go(){ n.classList.remove('unread'); syncDot(); if(href) setTimeout(function(){ window.location.href=href; },80); }
    n.addEventListener('click',go);
    n.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } });
  }
  function init(){ [].slice.call(document.querySelectorAll('.notif')).forEach(wire); syncDot(); }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded',init);
})();
