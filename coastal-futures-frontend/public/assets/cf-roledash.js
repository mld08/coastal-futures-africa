/* Coastal Futures — per-role admin dashboard (audit v4).
   Extracted from the inline admin-console script and made REAL :

   1) ROLE-AWARE     — a content / country / moderator admin who opens the console now
                       lands directly on THEIR dashboard, with the "preview by role" bar
                       hidden (they cannot impersonate other roles). Only the super admin
                       keeps the preview selector, defaulting to the full super view.
   2) LIVE COUNTS    — the headline figures (applications to process, moderation queue,
                       profiles to validate, drafts) are computed from CFCol, not hard-
                       coded, so they track the same data the rest of the console writes.
                       The country coordinator's figures are scoped to their own country.

   Loaded LAST on admin-console.html, after cf-collections.js (CFCol) and
   cf-admin-auth.js (CFAdmin). Back-end devs : the role + country come from the signed
   session; the counts come from your API, scoped server-side by role/country. */
(function(){
  var sv=document.getElementById('superView'), rv=document.getElementById('roleView');
  if(!sv||!rv) return;
  var current='super';
  function en(){return document.documentElement.lang==='en';}
  function E(fr,eng){return en()?eng:fr;}

  /* ---- live counts (fail-soft to a sensible default if CFCol is absent) ---- */
  var APP_OPEN=['submitted','review','incomplete'];
  function n(v,fb){ return (typeof v==='number'&&!isNaN(v))?v:fb; }
  function appsOpen(country){
    try{ return CFCol.count('applications',function(a){
      var ok=APP_OPEN.indexOf(a.status)>=0; if(!ok) return false;
      if(country){ return ((a.candidat&&a.candidat.pays)||a.pays)===country; }
      return true;
    }); }catch(e){ return null; }
  }
  function modOpen(){ try{ return CFCol.count('moderation_queue',function(m){ return !m.resolved; }); }catch(e){ return null; } }
  function profilesToValidate(){ try{ return CFCol.count('moderation_queue',function(m){ return m.kind==='profile' && !m.resolved; }); }catch(e){ return null; } }
  function drafts(){ try{ return CFCol.count('news',function(a){ return a.pub && a.pub!=='published'; })+CFCol.count('events',function(a){ return a.pub && a.pub!=='published'; }); }catch(e){ return null; } }
  function publishedCount(){ try{ return CFCol.count('news',function(a){return (a.pub||'published')==='published';})+CFCol.count('events',function(a){return (a.pub||'published')==='published';}); }catch(e){ return null; } }

  /* ---- status badge for an application (harmonised vocabulary) ---- */
  var STB={submitted:['bdg-teal','Soumise','Submitted'],review:['bdg-pend','En revue','In review'],incomplete:['bdg-pend','À compléter','Incomplete'],accepted:['bdg-live','Acceptée','Accepted'],rejected:['bdg-rej','Rejetée','Rejected']};
  function stBadge(s){ var m=STB[s]||['bdg-pend','Soumise','Submitted']; return '<span class="bdg '+m[0]+'">'+E(m[1],m[2])+'</span>'; }
  function dts(iso){ if(!iso) return ''; var d=new Date(iso); if(isNaN(d)) return (''+iso).slice(0,10); return d.toLocaleDateString(en()?'en-GB':'fr-FR',{day:'numeric',month:'short'}); }
  function emptyRow(msg){ return '<div class="row"><div class="ri" style="background:'+TEAL+'color:'+TC+'"><i class="ti ti-inbox"></i></div><div><div class="rt"><b>'+msg+'</b></div><div class="rd">'+E('Cette liste se remplira dès la collecte.','This list will fill in as data is collected.')+'</div></div></div>'; }
  /* application rows pulled from the REAL applications collection (no fabricated people) */
  function appRows(country){
    var apps=[]; try{ apps=CFCol.all('applications'); }catch(e){}
    if(country) apps=apps.filter(function(a){ return ((a.candidat&&a.candidat.pays)||a.pays)===country; });
    apps=apps.filter(function(a){ return APP_OPEN.indexOf(a.status)>=0; });
    if(!apps.length) return emptyRow(E('Aucune candidature à traiter','No applications to process'));
    return apps.slice(0,4).map(function(a){
      var nm=(a.candidat&&a.candidat.nom)||'—';
      var pj=(a.projet&&a.projet.nom)||'';
      return row('ti-file-text',TEAL,TC, nm+(pj?' — '+pj:''), E('Cohorte 2 · déposée le ','Cohort 2 · submitted ')+dts(a.submittedAt), stBadge(a.status));
    }).join('');
  }

  /* ---- presentational helpers (unchanged markup vocabulary) ---- */
  function widget(ic,bg,col,nv,label,delta,dcol){
    return '<div class="widget"><div class="wi" style="background:'+bg+';color:'+col+';"><i class="ti '+ic+'"></i></div><div class="n tnum">'+nv+'</div><div class="l">'+label+'</div>'+(delta?'<span class="delta" style="color:'+(dcol||'var(--ink-mute)')+'">'+delta+'</span>':'')+'</div>';
  }
  function row(ic,bg,col,title,sub,badge){
    return '<div class="row"><div class="ri" style="background:'+bg+';color:'+col+'"><i class="ti '+ic+'"></i></div><div><div class="rt"><b>'+title+'</b></div><div class="rd">'+sub+'</div></div>'+(badge?'<div class="rx">'+badge+'</div>':'')+'</div>';
  }
  function card(title,seeHref,seeLabel,body){
    return '<div class="card"><div class="card-h"><h3 class="display-sm">'+title+'</h3>'+(seeHref?'<a href="'+seeHref+'">'+seeLabel+'</a>':'')+'</div><div class="card-b">'+body+'</div></div>';
  }
  var TEAL='var(--teal-bg);',TC='var(--teal)',BLUEB='#EAF0FB;',BC='#2A4D8F',WB='var(--warning-bg);',WC='var(--warning)',EB='var(--error-bg);',EC='var(--error)',SB='var(--success-bg);',SC='var(--success)',SAB='#F5EEDF;',SAC='var(--sand-deep,#8A5512)';

  function viewContent(){
    var dr=n(drafts(),0), pc=n(publishedCount(),0);
    var w=widget('ti-news',TEAL,TC,dr,E('Contenus en attente','Pending content'),E('à publier','to publish'),'var(--ink-mute)')
      +widget('ti-send',BLUEB,BC,pc,E('Contenus publiés','Published content'),'',' ')
      +widget('ti-calendar-event',WB,WC,n((function(){try{return CFCol.count('events',function(e){return (e.pub||'published')==='published';});}catch(e){return 0;}})(),0),E('Événements à venir','Upcoming events'),'',' ')
      +widget('ti-language',TEAL,TC,'100%',E('Complétude bilingue','Bilingual completeness'),'',' ');
    // pending content = REAL unpublished news/events (none at launch -> honest empty state)
    var draftItems=[]; try{ draftItems=CFCol.all('news').concat(CFCol.all('events')).filter(function(x){return x.pub&&x.pub!=='published';}); }catch(e){}
    var pendingBody=draftItems.length
      ? draftItems.slice(0,3).map(function(x){ return row('ti-news',TEAL,TC, CFCol.t(x.title,en()?'en':'fr'), E('À relire avant publication','To review before publication'),'<span class="bdg bdg-pend">'+E('Brouillon','Draft')+'</span>'); }).join('')
      : emptyRow(E('Aucun contenu en attente','No content pending'));
    var pending=card(E('Contenus en attente de publication','Content awaiting publication'),'admin-contenus.html',E('Voir tout','See all'),pendingBody);
    // editorial calendar = REAL upcoming published events
    var evs=[]; try{ evs=CFCol.published('events').slice(0,3); }catch(e){}
    var calBody=evs.length
      ? evs.map(function(ev){ return row('ti-calendar-event',BLUEB,BC, CFCol.t(ev.title,en()?'en':'fr'), dts(ev.date)+' · '+CFCol.t(ev.place,en()?'en':'fr'),''); }).join('')
      : emptyRow(E('Aucun événement programmé','No event scheduled'));
    var cal=card(E('Calendrier éditorial','Editorial calendar'),'admin-editeur-evenement.html',E('Planifier','Schedule'),calBody);
    var actions=card(E('Actions rapides','Quick actions'),'',' ',
      row('ti-news',TEAL,TC,E('Nouvel article','New article'),E('Rédiger une actualité','Write a news item'),'<i class="ti ti-chevron-right" style="color:var(--ink-faint)"></i>')
      +row('ti-calendar-plus',BLUEB,BC,E('Nouvel événement','New event'),E('Programmer un événement','Schedule an event'),'<i class="ti ti-chevron-right" style="color:var(--ink-faint)"></i>')
      +row('ti-photo',SAB,SAC,E('Médiathèque','Media library'),E('Importer un média','Upload media'),'<i class="ti ti-chevron-right" style="color:var(--ink-faint)"></i>'));
    return '<div class="widgets">'+w+'</div><div class="grid"><div style="display:flex;flex-direction:column;gap:20px;">'+pending+cal+'</div><div style="display:flex;flex-direction:column;gap:20px;">'+actions+'</div></div>';
  }

  function viewCountry(pays){
    pays=pays||'Sénégal';
    var ap=n(appsOpen(pays),0);
    var w=widget('ti-file-text',WB,WC,ap,E('Candidatures · '+pays,'Applications · '+pays),E('à traiter','to process'),WC)
      +widget('ti-plant-2',TEAL,TC,'0',E('Projets · '+pays,'Projects · '+pays),E('dès labellisation','from certification'),'var(--ink-mute)')
      +widget('ti-building-community',BLUEB,BC,'1',E('Hub jeunesse','Youth hub'),'',' ')
      +widget('ti-news',SAB,SAC,'0',E('Contenus locaux','Local content'),E('à publier','to publish'),'var(--ink-mute)');
    var apps=card(E('Candidatures à traiter · '+pays,'Applications to process · '+pays),'admin-candidatures.html',E('Voir tout','See all'),appRows(pays));
    var proj=card(E('Projets du pays','Country projects'),'admin-projets.html',E('Voir tout','See all'),
      emptyRow(E('Aucun projet labellisé','No certified project yet')));
    var note='<div class="card"><div class="card-b"><div class="row"><div class="ri" style="background:'+BLUEB+'color:'+BC+'"><i class="ti ti-info-circle"></i></div><div><div class="rt"><b>'+E('Accès limité au '+pays,'Access limited to '+pays)+'</b></div><div class="rd">'+E("Vous gérez les candidatures, projets et contenus de votre pays. Les autres pays et les paramètres système ne sont pas accessibles.","You manage your country's applications, projects and content. Other countries and system settings are not accessible.")+'</div></div></div></div></div>';
    return '<div class="widgets">'+w+'</div><div class="grid"><div style="display:flex;flex-direction:column;gap:20px;">'+apps+proj+'</div><div style="display:flex;flex-direction:column;gap:20px;">'+note+'</div></div>';
  }

  function viewMod(){
    var mq=n(modOpen(),0), pv=n(profilesToValidate(),0);
    var w=widget('ti-flag',EB,EC,mq,E('Signalements','Reports'),E('à traiter','to handle'),EC)
      +widget('ti-user-check',TEAL,TC,pv,E('Profils à valider','Profiles to validate'),'',' ')
      +widget('ti-news',WB,WC,n((function(){try{return CFCol.count('moderation_queue',function(m){return m.kind==='news'&&!m.resolved;});}catch(e){return 0;}})(),0),E('Contenus à modérer','Content to moderate'),'',' ')
      +widget('ti-circle-check',SB,SC,n((function(){try{return CFCol.count('moderation_queue',function(m){return m.resolved;});}catch(e){return 0;}})(),0),E('Traités','Handled'),'',' ');
    // moderation queue rendered from the REAL queue collection
    var q=[]; try{ q=CFCol.all('moderation_queue').filter(function(m){return !m.resolved;}); }catch(e){}
    var KIND={message:['ti-message-2',EB,EC],profile:['ti-user',EB,EC],news:['ti-news',WB,WC],project:['ti-flag',WB,WC]};
    var queueBody=q.length
      ? q.slice(0,4).map(function(m){ var ic=KIND[m.kind]||['ti-flag',WB,WC]; return row(ic[0],ic[1],ic[2], CFCol.t(m.reason,en()?'en':'fr'), E('Signalé par ','Reported by ')+(m.reportedBy||'—'),'<span class="bdg bdg-pend">'+E('À traiter','To handle')+'</span>'); }).join('')
      : emptyRow(E('File de modération vide','Moderation queue empty'));
    var queue=card(E('File de modération','Moderation queue'),'admin-moderation.html',E('Voir tout','See all'),queueBody);
    // profiles awaiting validation = REAL profile reports in the queue
    var profItems=q.filter(function(m){return m.kind==='profile';});
    var profBody=profItems.length
      ? profItems.slice(0,3).map(function(m){ var p=null; try{p=CFCol.get('entrepreneurs',m.refId)||CFCol.get('mentors',m.refId);}catch(e){} var nm=(p&&p.n)||m.refId||'—'; var sub=p?((p.s||p.org||'')+(p.pays?' · '+p.pays:'')):''; return row('ti-user',TEAL,TC, nm+(sub?' — '+sub:''), E('Profil','Profile'),'<span class="bdg bdg-teal">'+E('À valider','To validate')+'</span>'); }).join('')
      : emptyRow(E('Aucun profil à valider','No profile to validate'));
    var profiles=card(E('Profils en attente de validation','Profiles awaiting validation'),'admin-moderation.html',E('Voir tout','See all'),profBody);
    return '<div class="widgets">'+w+'</div><div class="grid"><div style="display:flex;flex-direction:column;gap:20px;">'+queue+'</div><div style="display:flex;flex-direction:column;gap:20px;">'+profiles+'</div></div>';
  }

  /* country used by the country view : real session country when a coordinator is
     signed in, demo country (Sénégal) when the super admin previews the role. */
  function sessCountry(){ try{ var s=CFAdmin&&CFAdmin.session&&CFAdmin.session(); return (s&&s.country)||''; }catch(e){ return ''; } }
  function build(role){
    return role==='content'?viewContent():role==='country'?viewCountry(sessCountry()):role==='mod'?viewMod():'';
  }

  window.__cfApplyRole=function(role){
    current=role;
    if(role==='super'){ sv.hidden=false; rv.hidden=true; rv.innerHTML=''; rv.removeAttribute('data-screen-label'); }
    else { sv.hidden=true; rv.hidden=false; rv.setAttribute('data-screen-label','Dashboard '+role); rv.innerHTML=build(role); }
  };

  /* ---- role-bar hints (kept here so the page i18n can update them) ---- */
  var hintFR={super:"Accès total : contenu, utilisateurs, paramètres système, tous les pays.",content:"Gestion éditoriale : articles, événements, médiathèque. Pas d'accès aux utilisateurs ni au système.",country:"Limité à son pays : candidatures, projets et contenu local.",mod:"Validation des profils et contenus soumis, signalements. Sans accès aux paramètres."};
  var hintEN={super:"Full access: content, users, system settings, all countries.",content:"Editorial management: articles, events, media library. No access to users or system.",country:"Limited to their country: applications, projects and local content.",mod:"Validation of submitted profiles and content, reports. No access to settings."};
  window.__cfRoleHints={fr:hintFR,en:hintEN};

  function setHint(r){
    var h=document.getElementById('rbHint'); if(!h) return;
    h.textContent=window.__cfRoleHints[en()?'en':'fr'][r]||'';
  }
  [].slice.call(document.querySelectorAll('#roleseg button')).forEach(function(b){
    b.addEventListener('click',function(){
      [].slice.call(document.querySelectorAll('#roleseg button')).forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      var r=b.getAttribute('data-role'); setHint(r);
      window.__cfApplyRole(r);
    });
  });

  /* ---- role-awareness : non-super admins land on their own dashboard ---- */
  var DASH={super:'super',content:'content',country:'country',moderator:'mod'};
  var sess=null; try{ sess=CFAdmin&&CFAdmin.session&&CFAdmin.session(); }catch(e){}
  if(sess && sess.role && sess.role!=='super'){
    var dr=DASH[sess.role]||'super';
    // hide the preview bar : a scoped admin cannot impersonate other roles
    var bar=document.querySelector('.rolebar'); if(bar) bar.style.display='none';
    window.__cfApplyRole(dr);
  }

  /* re-render the active role view + hint on language change */
  try{ new MutationObserver(function(){
    if(current!=='super'){ rv.innerHTML=build(current); }
    var on=document.querySelector('#roleseg button.on'); if(on) setHint(on.getAttribute('data-role'));
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
})();
