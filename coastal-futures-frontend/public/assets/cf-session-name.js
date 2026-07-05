/* Coastal Futures — member identity from session (audit livraison 15, §1.2 / §2).
   The connected member name + initials come from localStorage (cf-name), set at
   login (connexion.html). No hardcoded demo identity ("Aminata Diallo", "Dr Asante")
   is ever shown. Loaded near </body> on member-space pages only (entrepreneur +
   mentor). Donor (PTF) and admin spaces have their own identity sources and are not
   touched here. */
(function(){
  function read(){ var n=''; try{ n=(localStorage.getItem('cf-name')||'').trim(); }catch(e){} return n; }
  function initials(n){
    var p=n.split(/\s+/).filter(Boolean).map(function(s){return s.charAt(0);});
    return (p.join('').slice(0,2).toUpperCase())||'CF';
  }
  function apply(){
    var nm=read(); if(!nm) nm='Mon espace';
    var ini=initials(nm);
    var nameSel=['.tb-user .un','.side-user .un','.um-id .un'];
    var avSel=['.tb-user .av','.side-user .av','.um-id .av'];
    nameSel.forEach(function(sel){ [].slice.call(document.querySelectorAll(sel)).forEach(function(el){ el.textContent=nm; }); });
    avSel.forEach(function(sel){ [].slice.call(document.querySelectorAll(sel)).forEach(function(el){ el.textContent=ini; }); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
  // keep in sync across tabs (logout / re-login in another tab)
  window.addEventListener('storage',function(e){ if(e.key==='cf-name'||e.key==='cf-auth') apply(); });
})();
