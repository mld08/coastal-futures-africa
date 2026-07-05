/* Coastal Futures — shared admin topbar chrome : notification bell + help menu,
   and a CALCULATED sidebar badge for pending applications (kills the hardcoded "18",
   audit #9 / #27 / #32). Loaded on every admin-* page AFTER cf-admin-auth.js, so the
   session + identity are already applied. Dependency-guarded : no-ops without CFCol.
   Back-end devs : the bell feed and counts come from CFNotif/CFCol; swap for a server
   feed scoped by role/country server-side. */
(function(){
  if(!/^admin-/.test((location.pathname.split('/').pop()||''))) return;
  var sess = (window.CFAdmin && CFAdmin.session && CFAdmin.session()) || null;
  if(!sess) return; // guard already redirected an invalid session

  function lang(){ return document.documentElement.lang==='en'?'en':'fr'; }
  function T(fr,en){ return lang()==='en'?en:fr; }
  function tf(field){ // {fr,en} or string
    if(field==null) return '';
    if(typeof field==='string') return field;
    return lang()==='en'?(field.en||field.fr||''):(field.fr||field.en||'');
  }
  function rel(iso){
    try{
      var d=new Date(iso), now=new Date(), s=Math.round((now-d)/1000);
      if(s<60) return T('à l’instant','just now');
      var m=Math.round(s/60); if(m<60) return T('il y a '+m+' min', m+' min ago');
      var h=Math.round(m/60); if(h<24) return T('il y a '+h+' h', h+' h ago');
      return d.toLocaleDateString(lang()==='en'?'en-GB':'fr-FR',{day:'numeric',month:'short'});
    }catch(e){ return ''; }
  }
  var KIND_ICON={application:'ti-file-text',moderation:'ti-shield-check',contact:'ti-mail',indicator:'ti-rosette-discount-check',message:'ti-messages',user:'ti-user'};

  /* ---- one-time CSS ---- */
  if(!document.getElementById('cf-admchrome-css')){
    var st=document.createElement('style'); st.id='cf-admchrome-css';
    st.textContent=
    '.cf-acg{position:relative;}'+
    '.cf-acg-btn{position:relative;width:40px;height:40px;border:1px solid var(--hair,#DCE9E6);background:#fff;border-radius:10px;color:var(--ink-2,#244440);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:border-color .16s,color .16s;}'+
    '.cf-acg-btn:hover{border-color:var(--teal,#0A6B5E);color:var(--teal,#0A6B5E);}'+
    '.cf-acg-btn i{font-size:20px;}'+
    '.cf-acg-dot{position:absolute;top:7px;right:8px;min-width:7px;height:7px;border-radius:100px;background:var(--error,#8F2A1A);box-shadow:0 0 0 2px #fff;}'+
    '.cf-acg-pop{position:absolute;top:48px;right:0;width:340px;max-width:calc(100vw - 32px);background:#fff;border:1px solid var(--hair,#DCE9E6);border-radius:14px;box-shadow:var(--shadow-2,0 8px 24px rgba(6,61,52,.12));padding:8px;z-index:60;display:none;}'+
    '.cf-acg-pop.show{display:block;}'+
    '.cf-acg-h{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 10px;}'+
    '.cf-acg-h b{font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--ink,#0C2420);}'+
    '.cf-acg-h a{font-family:var(--font-display);font-size:12.5px;font-weight:500;color:var(--teal,#0A6B5E);cursor:pointer;}'+
    '.cf-acg-list{max-height:340px;overflow:auto;}'+
    '.cf-acg-item{display:flex;gap:11px;padding:10px;border-radius:10px;color:inherit;cursor:pointer;text-decoration:none;}'+
    '.cf-acg-item:hover{background:var(--canvas-soft,#F8FBFA);}'+
    '.cf-acg-item .ic{width:34px;height:34px;flex:0 0 34px;border-radius:9px;background:var(--teal-bg,#EAF6F3);color:var(--teal,#0A6B5E);display:flex;align-items:center;justify-content:center;font-size:18px;}'+
    '.cf-acg-item.unread .ic{background:var(--teal,#0A6B5E);color:#fff;}'+
    '.cf-acg-item .tx{min-width:0;}'+
    '.cf-acg-item .tt{display:block;font-family:var(--font-sans);font-size:13px;line-height:1.4;color:var(--ink-2,#244440);}'+
    '.cf-acg-item.unread .tt{font-weight:600;color:var(--ink,#0C2420);}'+
    '.cf-acg-item .mt{display:block;font-family:var(--font-sans);font-size:11.5px;color:var(--ink-faint,#92ACA7);margin-top:2px;}'+
    '.cf-acg-empty{padding:22px 14px;text-align:center;font-family:var(--font-sans);font-size:13px;color:var(--ink-mute,#5C7B76);}'+
    '.cf-acg-sec{font-family:var(--font-display);font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-faint,#92ACA7);padding:8px 10px 4px;}'+
    '@media(max-width:640px){.cf-acg-btn{min-width:44px;min-height:44px;}}'+
    /* U4 : the dark admin sidebar must not show its own nested scrollbar — the page scrolls */
    '.app .side{scrollbar-width:none;}.app .side::-webkit-scrollbar{width:0;height:0;}'+
    '.app .side-nav{scrollbar-width:none;overflow-y:auto;}.app .side-nav::-webkit-scrollbar{width:0;height:0;}'+
    /* R-05 : visual scroll affordance on horizontally-scrolling admin tables.
       A fading shadow appears at whichever edge has hidden content, so the user
       on mobile knows the table scrolls (no column is ever hidden). */
    '.cf-tblshell{position:relative;}'+
    '.cf-tblshell>.cf-edge{position:absolute;top:0;bottom:0;width:26px;pointer-events:none;opacity:0;transition:opacity .18s var(--ease,cubic-bezier(.4,0,.2,1));z-index:4;}'+
    '.cf-tblshell>.cf-edge-l{left:0;background:linear-gradient(to right,rgba(6,61,52,.14),rgba(6,61,52,0));}'+
    '.cf-tblshell>.cf-edge-r{right:0;background:linear-gradient(to left,rgba(6,61,52,.14),rgba(6,61,52,0));}'+
    '.cf-tblshell>.cf-edge.on{opacity:1;}';
    document.head.appendChild(st);
  }

  var tbr=document.querySelector('.tb-r');
  if(!tbr){
    // some admin topbars have no right cluster — build one so bell/help always land
    var tb=document.querySelector('.topbar');
    if(tb){
      tbr=document.createElement('div');
      tbr.className='tb-r cf-acg-rcluster';
      tbr.style.cssText='display:flex;align-items:center;gap:12px;margin-left:auto;';
      tb.appendChild(tbr);
    }
  }

  /* ---- calculated sidebar badges (replaces hardcoded "18" / "7") ---- */
  function pendingApps(){ try{ return CFCol.count('applications',function(a){ return ['submitted','review','incomplete'].indexOf(a.status)>=0; }); }catch(e){ return 0; } }
  function pendingMod(){ try{ return CFCol.count('moderation_queue',function(m){ return !m.resolved; }); }catch(e){ return 0; } }
  /* ---- ONE canonical sidebar, rendered identically on EVERY admin page ----
     Root cause of the incoherence the user reported : each page hard-coded its own
     .side-nav, so the order drifted ("Contenu du site" 2nd here, last there), items
     were present on some pages and missing on others, and the label was sometimes
     "Contenu et indicateurs", sometimes "Contenu du site". We now define the list and
     its order ONCE; role scoping via CFAdmin.can; the active item (including editor
     sub-pages) is highlighted; calculated badges replace the old hard-coded "18"/"7". */
  var NAV=[
    {sec:{fr:'Pilotage',en:'Steering'}, items:[
      {href:'admin-console.html',      page:'admin-console',      icon:'ti-layout-dashboard',        fr:'Tableau de bord',          en:'Dashboard'},
      {href:'admin-contenus.html',     page:'admin-contenus',     icon:'ti-news',                    fr:'Gestion de contenu',       en:'Content management'},
      {href:'admin-annuaires.html',    page:'admin-annuaires',    icon:'ti-address-book',            fr:'Annuaires',                en:'Directories'},
      {href:'admin-site.html',         page:'admin-site',         icon:'ti-browser',                 fr:'Contenu du site',          en:'Site content'},
      {href:'admin-utilisateurs.html', page:'admin-utilisateurs', icon:'ti-users',                   fr:'Utilisateurs et rôles',    en:'Users and roles'},
      {href:'admin-appels.html',       page:'admin-appels',       icon:'ti-speakerphone',            fr:'Appels à candidatures',    en:'Calls for applications'},
      {href:'admin-candidatures.html', page:'admin-candidatures', icon:'ti-file-text',               fr:'Candidatures',             en:'Applications', badge:'apps'},
      {href:'admin-projets.html',      page:'admin-projets',      icon:'ti-plant-2',                 fr:'Projets et indicateurs',   en:'Projects and indicators'},
      {href:'admin-indicateurs.html',  page:'admin-indicateurs',  icon:'ti-rosette-discount-check',  fr:'Validation des indicateurs',en:'Indicator validation'},
      {href:'admin-mediatheque.html',  page:'admin-mediatheque',  icon:'ti-photo',                   fr:'Médiathèque',             en:'Media library'},
      {href:'admin-carte.html',        page:'admin-carte',        icon:'ti-map-2',                   fr:"Carte d'impact",            en:'Impact map'},
      {href:'admin-newsletter.html',   page:'admin-newsletter',   icon:'ti-mail',                    fr:'Newsletter',               en:'Newsletter'},
      {href:'admin-messagerie.html',   page:'admin-messagerie',   icon:'ti-messages',                fr:'Messagerie',               en:'Messaging'}
    ]},
    {sec:{fr:'Gouvernance',en:'Governance'}, items:[
      {href:'admin-moderation.html',   page:'admin-moderation',   icon:'ti-shield-check',            fr:'Modération',               en:'Moderation', badge:'mod'},
      {href:'admin-permissions.html',  page:'admin-permissions',  icon:'ti-key',                     fr:'Permissions',              en:'Permissions'},
      {href:'admin-journal-audit.html',page:'admin-journal-audit',icon:'ti-history',                 fr:"Journal d'audit",           en:'Audit log'},
      {href:'admin-parametres.html',   page:'admin-parametres',   icon:'ti-settings',                fr:'Paramètres système',        en:'System settings'}
    ]}
  ];
  /* editor sub-pages highlight their parent section */
  var PARENT={'admin-editeur-contenu':'admin-contenus','admin-editeur-evenement':'admin-contenus','admin-editeur-page':'admin-site'};
  function renderSidebar(){
    var nav=document.querySelector('.side-nav'); if(!nav||!window.CFAdmin) return;
    var cur=(location.pathname.split('/').pop()||'').replace(/\.html$/,'');
    var active=PARENT[cur]||cur;
    var html='';
    NAV.forEach(function(group){
      var vis=group.items.filter(function(it){ return CFAdmin.can(sess.role,it.page); });
      if(!vis.length) return;
      html+='<div class="side-sec">'+T(group.sec.fr,group.sec.en)+'</div>';
      vis.forEach(function(it){
        var label=T(it.fr,it.en);
        var badge=it.badge?'<span class="badge tnum" data-badge="'+it.badge+'" style="display:none"></span>':'';
        var inner='<i class="ti '+it.icon+'"></i><span>'+label+'</span>'+badge;
        html+=(it.page===active)
          ? '<div class="nav-item on" data-tip="'+label+'">'+inner+'</div>'
          : '<a class="nav-item" href="'+it.href+'" data-tip="'+label+'">'+inner+'</a>';
      });
    });
    nav.innerHTML=html;
    // keep the mobile drawer closing when a link is tapped
    [].slice.call(nav.querySelectorAll('a.nav-item')).forEach(function(a){ a.addEventListener('click',function(){ var s=document.querySelector('.app .side'); if(s)s.classList.remove('open'); var sc=document.querySelector('.cf-appscrim'); if(sc)sc.classList.remove('show'); }); });
  }
  function setBadge(key,n){ var b=document.querySelector('.side-nav [data-badge="'+key+'"]'); if(!b) return; if(n>0){ b.textContent=String(n); b.style.display=''; } else { b.style.display='none'; } }
  function refreshBadge(){ setBadge('apps',pendingApps()); setBadge('mod',pendingMod()); }

  /* ---- bell + help (only where there is a topbar) ---- */
  function openPop(which){
    [bellPop,helpPop].forEach(function(p){ if(p) p.classList.toggle('show', p===which); });
  }
  function closeAll(){ [bellPop,helpPop].forEach(function(p){ if(p) p.classList.remove('show'); }); }

  var bellWrap,bellBtn,bellPop,bellDot, helpWrap,helpBtn,helpPop;
  function renderBell(){
    if(!bellPop) return;
    var list=CFNotif.visible(sess.role,sess.country);
    var unread=list.filter(function(n){ return !n.read; }).length;
    bellDot.style.display=unread>0?'block':'none';
    var html='<div class="cf-acg-h"><b>'+T('Notifications','Notifications')+'</b>'+(unread>0?'<a data-acg-allread>'+T('Tout marquer lu','Mark all read')+'</a>':'')+'</div><div class="cf-acg-list">';
    if(!list.length){ html+='<div class="cf-acg-empty">'+T('Aucune notification pour le moment.','No notifications yet.')+'</div>'; }
    else list.forEach(function(n){
      var ic=KIND_ICON[n.kind]||'ti-bell';
      html+='<a class="cf-acg-item'+(n.read?'':' unread')+'" '+(n.href?('href="'+n.href+'"'):'')+' data-acg-id="'+n.id+'"><span class="ic"><i class="ti '+ic+'"></i></span><span class="tx"><span class="tt">'+tf(n.title)+'</span><span class="mt">'+rel(n.at)+'</span></span></a>';
    });
    html+='</div>';
    bellPop.innerHTML=html;
    var ar=bellPop.querySelector('[data-acg-allread]');
    if(ar) ar.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); CFNotif.markAllRead(sess.role,sess.country); renderBell(); });
    [].slice.call(bellPop.querySelectorAll('[data-acg-id]')).forEach(function(a){
      a.addEventListener('click',function(){ CFNotif.markRead(this.getAttribute('data-acg-id')); /* navigation proceeds if href */ });
    });
  }
  function buildHelp(){
    var R=(window.CFAdmin&&CFAdmin.ROLES[sess.role])||{};
    var items=[
      {href:'admin-journal-audit.html',i:'ti-history',fr:'Journal d’audit',en:'Audit log'},
      {href:'methodologie-indicateurs.html',i:'ti-ruler-2',fr:'Méthodologie des indicateurs',en:'Indicator methodology'},
      {href:'contact.html',i:'ti-lifebuoy',fr:'Contacter le support',en:'Contact support'}
    ];
    var html='<div class="cf-acg-h"><b>'+T('Aide','Help')+'</b></div><div class="cf-acg-list">'+
      '<a class="cf-acg-item" data-acg-tour><span class="ic"><i class="ti ti-route"></i></span><span class="tx"><span class="tt">'+T('Revoir la visite guidée','Replay the guided tour')+'</span><span class="mt">'+(R[lang()]||'')+'</span></span></a>';
    items.forEach(function(it){
      html+='<a class="cf-acg-item" href="'+it.href+'"><span class="ic"><i class="ti '+it.i+'"></i></span><span class="tx"><span class="tt">'+T(it.fr,it.en)+'</span></span></a>';
    });
    html+='</div>';
    helpPop.innerHTML=html;
    var tour=helpPop.querySelector('[data-acg-tour]');
    if(tour) tour.addEventListener('click',function(e){ e.preventDefault(); closeAll(); if(typeof window.cfTourStart==='function') window.cfTourStart(); });
  }

  if(tbr){
    // help
    helpWrap=document.createElement('div'); helpWrap.className='cf-acg';
    helpBtn=document.createElement('button'); helpBtn.className='cf-acg-btn'; helpBtn.type='button';
    helpBtn.setAttribute('aria-label',T('Aide','Help')); helpBtn.innerHTML='<i class="ti ti-help-circle"></i>';
    helpPop=document.createElement('div'); helpPop.className='cf-acg-pop';
    helpWrap.appendChild(helpBtn); helpWrap.appendChild(helpPop);
    // bell
    bellWrap=document.createElement('div'); bellWrap.className='cf-acg';
    bellBtn=document.createElement('button'); bellBtn.className='cf-acg-btn'; bellBtn.type='button';
    bellBtn.setAttribute('aria-label',T('Notifications','Notifications'));
    bellBtn.innerHTML='<i class="ti ti-bell"></i><span class="cf-acg-dot" style="display:none"></span>';
    bellDot=bellBtn.querySelector('.cf-acg-dot');
    bellPop=document.createElement('div'); bellPop.className='cf-acg-pop';
    bellWrap.appendChild(bellBtn); bellWrap.appendChild(bellPop);
    // keep help + bell on ONE horizontal row regardless of the page's .tb-r layout (audit U2)
    try{ var cs=getComputedStyle(tbr); if(cs.display!=='flex'){ tbr.style.display='flex'; tbr.style.alignItems='center'; if(cs.gap==='normal'||!cs.gap) tbr.style.gap='12px'; } }catch(e){}
    var grp=document.createElement('div'); grp.className='cf-acg-group'; grp.style.cssText='display:flex;align-items:center;gap:10px;';
    grp.appendChild(helpWrap); grp.appendChild(bellWrap);
    tbr.insertBefore(grp, tbr.firstChild);

    buildHelp(); renderBell();
    bellBtn.addEventListener('click',function(e){ e.stopPropagation(); var open=bellPop.classList.contains('show'); closeAll(); if(!open){ renderBell(); bellPop.classList.add('show'); } });
    helpBtn.addEventListener('click',function(e){ e.stopPropagation(); var open=helpPop.classList.contains('show'); closeAll(); if(!open){ buildHelp(); helpPop.classList.add('show'); } });
    document.addEventListener('click',function(e){ if(!e.target.closest('.cf-acg')) closeAll(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeAll(); });
  }

  renderSidebar();
  refreshBadge();

  /* ---- R-05 : edge-shadow scroll indicator on admin tables ---- */
  function initScrollEdges(){
    var sels='.tbl-wrap,.tablecard,.tbl-scroll';
    [].slice.call(document.querySelectorAll(sels)).forEach(function(c){
      if(c.__cfEdge) return;
      var ox;
      try{ ox=getComputedStyle(c).overflowX; }catch(e){ return; }
      if(!/(auto|scroll)/.test(ox)) return;            // only real horizontal scrollers
      c.__cfEdge=true;
      var shell=document.createElement('div'); shell.className='cf-tblshell';
      if(c.parentNode){ c.parentNode.insertBefore(shell,c); shell.appendChild(c); }
      var l=document.createElement('div'); l.className='cf-edge cf-edge-l';
      var r=document.createElement('div'); r.className='cf-edge cf-edge-r';
      shell.appendChild(l); shell.appendChild(r);
      function upd(){
        var max=c.scrollWidth-c.clientWidth;
        if(max<=2){ l.classList.remove('on'); r.classList.remove('on'); return; }
        l.classList.toggle('on', c.scrollLeft>2);
        r.classList.toggle('on', c.scrollLeft<max-2);
      }
      c.addEventListener('scroll',upd,{passive:true});
      window.addEventListener('resize',upd);
      c.__cfEdgeUpd=upd;
      // tables often render their rows after chrome loads, or get filtered : recompute
      try{ new MutationObserver(upd).observe(c,{childList:true,subtree:true}); }catch(e){}
      upd(); setTimeout(upd,300); setTimeout(upd,1000);
    });
  }
  initScrollEdges();
  // a card may switch to overflow:auto only below its breakpoint : re-scan on resize
  var reTO=null;
  window.addEventListener('resize',function(){ clearTimeout(reTO); reTO=setTimeout(initScrollEdges,200); });

  // language reactivity
  try{ new MutationObserver(function(){ renderSidebar(); refreshBadge(); if(bellPop&&bellPop.classList.contains('show')) renderBell(); if(helpPop&&helpPop.classList.contains('show')) buildHelp(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
})();
