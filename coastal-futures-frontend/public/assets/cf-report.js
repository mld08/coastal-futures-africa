/* Coastal Futures — export du rapport bailleur.
   Le bouton « Exporter le rapport PDF » du tableau de bord ouvre la page de
   rapport dédiée, conçue print-first (rapport-impact.html) : document austère,
   textuel, structuré (cartouche de contrôle, cadre de résultats, annexes),
   identique en contenu pour tous, bilingue. L'ancienne approche window.print()
   de la page web (sortie rasterisée, sans texte) est retirée. */
(function () {
  function openReport() {
    try { window.open('rapport-impact.html', '_blank'); }
    catch (e) { window.location.href = 'rapport-impact.html'; }
  }
  function bind() {
    var ex = document.getElementById('exportBtn');
    if (ex && !ex.__cfReport) { ex.__cfReport = true; ex.addEventListener('click', openReport); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  window.cfOpenReport = openReport;
})();
