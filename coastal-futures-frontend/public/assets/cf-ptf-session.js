/* Coastal Futures — expiration de session simulée pour l'espace bailleurs (PTF).
   Maquette : l'authentification est simulée (BACKEND.md). Ce script ajoute une
   péremption de session crédible côté client :
     - inactivité : 30 minutes
     - durée absolue : 8 heures depuis la connexion
   À l'expiration, purge des clés PTF et retour à la connexion avec ?expired=1.
   À brancher tel quel sur l'auth serveur réelle le moment venu. */
(function () {
  var INACT = 30 * 60 * 1000;     // 30 min d'inactivité
  var ABS = 8 * 60 * 60 * 1000;   // 8 h absolues
  var K_LAST = 'cf-ptf-last', K_SINCE = 'cf-ptf-since';

  function authed() { try { return localStorage.getItem('cf-ptf-auth') === '1'; } catch (e) { return false; } }
  if (!authed()) return;

  function num(k) { var v = parseInt(localStorage.getItem(k), 10); return isNaN(v) ? 0 : v; }
  function set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  var now = Date.now();
  var since = num(K_SINCE); if (!since) { since = now; set(K_SINCE, since); }
  var last = num(K_LAST); if (!last) { last = now; }

  function expire() {
    try {
      localStorage.removeItem('cf-ptf-auth');
      localStorage.removeItem(K_SINCE);
      localStorage.removeItem(K_LAST);
      localStorage.removeItem('cf-auth');
    } catch (e) {}
    location.replace('connexion-bailleur.html?expired=1');
  }

  if (now - since > ABS || now - last > INACT) { expire(); return; }

  set(K_LAST, now);
  var t = now;
  function touch() { var n = Date.now(); if (n - t > 15000) { t = n; set(K_LAST, n); } }
  ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, touch, { passive: true });
  });
  setInterval(function () {
    var n = Date.now();
    if (n - num(K_LAST) > INACT || n - num(K_SINCE) > ABS) expire();
  }, 60000);
})();
