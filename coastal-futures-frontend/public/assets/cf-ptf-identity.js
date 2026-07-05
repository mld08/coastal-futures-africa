/* Coastal Futures — identité du partenaire connecté (espace bailleurs).
   L'utilisateur représente SON institution : le nom affiché n'est pas codé en dur.
   Source (mockup) : localStorage, posé à la connexion par le backend le moment venu.
     cf-ptf-org       : nom de l'organisation (ex. « Agence … », « Délégation … »)
     cf-ptf-contact   : nom du point de contact (personne physique)
     cf-ptf-initials  : initiales d'avatar (sinon dérivées du nom)
   Défaut, sans organisation nommée (le TDR n'en nomme aucune) : persona générique
   « Partenaire technique et financier ». Remplit la barre supérieure, le menu de
   compte et, le cas échéant, l'en-tête « Mon organisation ». */
(function () {
  function ls(k) { try { return (localStorage.getItem(k) || '').trim(); } catch (e) { return ''; } }
  function initials(s) {
    var p = (s || '').trim().split(/\s+/).filter(Boolean);
    var i = (p[0] ? p[0][0] : '') + (p.length > 1 ? p[p.length - 1][0] : '');
    return (i || 'PF').toUpperCase().slice(0, 2);
  }
  var GENERIC = 'Partenaire technique et financier';
  var org = ls('cf-ptf-org');
  var named = !!org;
  var display = named ? org : GENERIC;
  var contact = ls('cf-ptf-contact');
  var av = ls('cf-ptf-initials') || (named ? initials(org) : 'PF');
  // libellé court pour la puce de la barre (évite de déborder)
  var short = named ? (org.length > 20 ? initials(org) + ' · ' + org.split(/\s+/)[0] : org) : 'Partenaire';

  function fill() {
    document.querySelectorAll('#cfUserBtn .un').forEach(function (e) { e.textContent = short; });
    document.querySelectorAll('#cfUserBtn .av, .um-id .av, .tb-user .av').forEach(function (e) { e.textContent = av; });
    document.querySelectorAll('.um-id .un').forEach(function (e) { e.textContent = display; });
    document.querySelectorAll('.um-id .ue').forEach(function (e) { e.textContent = contact || 'Espace bailleurs'; });
    // En-tête « Mon organisation » (espace-partenaire) si présent
    var oh = document.querySelector('[data-ptf-org-name]');
    if (oh) oh.textContent = display;
    var ot = document.querySelector('[data-ptf-org-tag]');
    if (ot) ot.textContent = named ? 'Partenaire technique et financier' : GENERIC;
    var oc = document.querySelector('[data-ptf-org-contact]');
    if (oc && contact) oc.textContent = contact;
    // Champs de formulaire (paramètres) : valeur d'input en lecture seule
    document.querySelectorAll('[data-ptf-org-value]').forEach(function (e) {
      if ('value' in e) e.value = display; else e.textContent = display;
    });
    if (contact) document.querySelectorAll('[data-ptf-contact-value]').forEach(function (e) {
      if ('value' in e) e.value = contact; else e.textContent = contact;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
  window.cfPtfIdentity = { org: display, contact: contact, initials: av, named: named };
})();
