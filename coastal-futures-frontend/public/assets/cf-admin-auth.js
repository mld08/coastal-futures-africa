/* Coastal Futures — admin identity, roles and access control.
   Replaces the old "everyone is the super admin, no login" behaviour.

   The session is set by connexion-admin.html (or invitation-admin.html) :
     cf-admin-auth  = "1"
     cf-admin-role  = super | content | country | moderator
     cf-admin-name  / cf-admin-email / cf-admin-country
   Back-end devs : replace this localStorage session with a real signed session +
   server-side authorisation. The role -> allowed-pages map below is the single
   source of truth for what each console can see.

   Two things happen here :
   1) GUARD  : if there is no admin session, or the role is not allowed on THIS page,
      we redirect (to the admin login, or back to the role's dashboard).
   2) CHROME : the sidebar is filtered to the role's pages and the identity
      (name, initials, role label, top-bar role chip) is rewritten from the session.
   The inline <script id="cf-admin-guard"> in each page <head> does the pre-render
   redirect so a forbidden page never flashes; this file does the chrome + a
   second guard pass once the DOM is parsed. */
(function(){
  var ROLES={
    super:   {fr:'Super administratrice',en:'Super administrator', icon:'ti-rosette-discount-check', color:'#0A6B5E', all:true},
    content: {fr:'Admin contenu',         en:'Content admin',        icon:'ti-edit',                  color:'#2A6FDB',
              pages:['admin-console','admin-contenus','admin-editeur-contenu','admin-editeur-evenement','admin-appels','admin-mediatheque','admin-site','admin-editeur-page','admin-annuaires','admin-newsletter','admin-messagerie']},
    country: {fr:'Coordinateur pays',     en:'Country coordinator',  icon:'ti-map-pin',               color:'#B8823A',
              pages:['admin-console','admin-candidatures','admin-projets','admin-indicateurs','admin-carte','admin-appels','admin-moderation','admin-mediatheque','admin-messagerie']},
    moderator:{fr:'Modérateur',           en:'Moderator',            icon:'ti-shield-check',          color:'#8F2A1A',
              pages:['admin-console','admin-moderation','admin-messagerie']}
  };
  /* demo directory — also used by connexion-admin.html. In production these come
     from the accounts table; access is by invitation only (invitation-admin.html). */
  var DIRECTORY={
    'saifi.dawalbethamit@africagovernanceinstitute.org':   {role:'super',     name:'Saïfi Dawalbet Hamit'},
    'ousmane.ba@africagovernanceinstitute.org':    {role:'content',   name:'Ousmane Bâ'},
    'aminata.sow@africagovernanceinstitute.org':   {role:'country',   name:'Aminata Sow', country:'Sénégal'},
    'kofi.mensah@africagovernanceinstitute.org':   {role:'moderator', name:'Kofi Mensah'}
  };
  window.CFAdmin={ROLES:ROLES,DIRECTORY:DIRECTORY,
    /* single source of truth for accounts : seeds + activated invitations.
       connexion-admin.html and admin-utilisateurs.html both read this (audit #13/#25/#39). */
    directory:function(){
      var dir={};
      Object.keys(DIRECTORY).forEach(function(k){ dir[k]=Object.assign({},DIRECTORY[k]); });
      try{ if(window.CFCol){ CFCol.all('admin_invites').forEach(function(inv){
        if(inv&&inv.used&&inv.email){ dir[String(inv.email).toLowerCase()]={role:inv.role,name:inv.name||inv.email,country:inv.country||''}; }
      }); } }catch(e){}
      return dir;
    },
    session:function(){
      try{
        if(localStorage.getItem('cf-admin-auth')!=='1') return null;
        var role=localStorage.getItem('cf-admin-role');
        if(!role||!ROLES[role]) return null;        // fail-closed : unknown/missing role => no access
        var name=localStorage.getItem('cf-admin-name');
        if(!name) return null;
        return {role:role, name:name,
                email:localStorage.getItem('cf-admin-email')||'', country:localStorage.getItem('cf-admin-country')||''};
      }catch(e){ return null; }                      // never fall open to super on error
    },
    can:function(role,page){ var r=ROLES[role]; if(!r) return false; if(r.all) return true; return r.pages.indexOf(page)>=0; },
    logout:function(){ try{['cf-admin-auth','cf-admin-role','cf-admin-name','cf-admin-email','cf-admin-country','cf-admin-since'].forEach(function(k){localStorage.removeItem(k);});}catch(e){} window.location.href='connexion-admin.html'; }
  };

  function page(){ return (location.pathname.split('/').pop()||'admin-console.html').replace(/\.html$/,''); }
  function initials(n){ return (n||'').split(/\s+/).map(function(x){return x[0]||'';}).join('').slice(0,2).toUpperCase(); }
  function lang(){ return document.documentElement.lang==='en'?'en':'fr'; }

  var cur0=page();
  // Only guarded admin consoles run the guard/chrome. Login + invitation pages just
  // need the CFAdmin API (DIRECTORY/ROLES/can) exposed above.
  if(!/^admin-/.test(cur0)) return;

  var sess=window.CFAdmin.session();

  /* ---- GUARD (second pass; the inline head guard handles the no-flash case) ---- */
  if(!sess){
    try{ localStorage.setItem('cf-admin-next', (location.pathname.split('/').pop()||'admin-console.html')); }catch(e){}
    window.location.replace('connexion-admin.html'); return;
  }
  var cur=page();
  if(!window.CFAdmin.can(sess.role,cur)){
    // role landed on a page it may not see -> send to its dashboard
    window.location.replace('admin-console.html'); return;
  }

  function applyChrome(){
    var R=ROLES[sess.role];
    // sidebar : hide nav items the role cannot reach
    [].slice.call(document.querySelectorAll('.side-nav .nav-item')).forEach(function(it){
      var href=it.getAttribute('href');
      if(!href){ return; } // current page (div.on) — always keep
      var p=href.replace(/\.html$/,'');
      if(/^admin-/.test(p) && !window.CFAdmin.can(sess.role,p)){ it.style.display='none'; }
    });
    // drop section headers that now have no visible items under them
    [].slice.call(document.querySelectorAll('.side-nav .side-sec')).forEach(function(sec){
      var n=sec.nextElementSibling, any=false;
      while(n && !n.classList.contains('side-sec')){ if(n.classList && n.classList.contains('nav-item') && n.style.display!=='none'){ any=true; break; } n=n.nextElementSibling; }
      if(!any) sec.style.display='none';
    });
    // identity in the sidebar footer
    var su=document.querySelector('.side-user');
    if(su){
      var av=su.querySelector('.av'); if(av){ av.textContent=initials(sess.name); av.style.background=R.color; }
      var un=su.querySelector('.un'); if(un) un.textContent=sess.name;
      var ur=su.querySelector('.ur'); if(ur){ ur.textContent=R[lang()]+(sess.country?(' · '+sess.country):''); ur.setAttribute('data-admin-role',''); }
    }
    // top-bar role chip(s)
    [].slice.call(document.querySelectorAll('.tb-role')).forEach(function(chip){
      var ic=chip.querySelector('i'); if(ic) ic.className='ti '+R.icon;
      var sp=chip.querySelector('span');
      var label=R[lang()]+(sess.country?(' · '+sess.country):'');
      if(sp) sp.textContent=label; else { chip.lastChild && chip.lastChild.nodeType===3 ? chip.lastChild.nodeValue=label : chip.appendChild(document.createTextNode(label)); }
      chip.setAttribute('data-admin-role','');
    });
    // any opt-in placeholders
    [].slice.call(document.querySelectorAll('[data-admin-name]')).forEach(function(el){ el.textContent=sess.name; });
    [].slice.call(document.querySelectorAll('[data-admin-rolelabel]')).forEach(function(el){ el.textContent=R[lang()]; });
    // logout bindings
    [].slice.call(document.querySelectorAll('.side-user .lo,[data-cf-logout]')).forEach(function(el){
      el.setAttribute('href','connexion-admin.html');
      el.addEventListener('click',function(e){ e.preventDefault(); window.CFAdmin.logout(); });
    });
    // re-text the role label on language change (admin pages toggle html[lang])
    try{ new MutationObserver(function(){
      var L=lang(), lbl=R[L]+(sess.country?(' · '+sess.country):'');
      var ur=document.querySelector('.side-user .ur[data-admin-role]'); if(ur) ur.textContent=lbl;
      [].slice.call(document.querySelectorAll('.tb-role[data-admin-role] span')).forEach(function(s){ s.textContent=lbl; });
    }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
  }
  if(document.readyState!=='loading') applyChrome(); else document.addEventListener('DOMContentLoaded',applyChrome);
})();
