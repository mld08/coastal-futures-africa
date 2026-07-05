/* Coastal Futures — moderation controller (audit #4 / #21b).
   Reads CFCol('moderation_queue'); the dead "Voir" now opens a drawer rendering the
   REAL reported object from its collection; decisions persist + are motivated + logged
   (CFAudit) + recompute counts. "Removed" actually archives the object (truthful, not a
   DOM card removal). Tabs/counters/badge calculated. Bilingual, re-renders on lang. */
(function(){
  if(!window.CFCol) return;
  function $(x){return document.getElementById(x);}
  var sess=(window.CFAdmin&&CFAdmin.session&&CFAdmin.session())||{name:'',role:''};
  function lang(){return document.documentElement.lang==='en'?'en':'fr';}
  function T(fr,en){return lang()==='en'?en:fr;}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function ini(n){return (n||'').split(/\s+/).map(function(x){return x[0]||'';}).join('').slice(0,2).toUpperCase();}
  function fmtDate(iso){try{var d=new Date(iso);return d.toLocaleDateString(lang()==='en'?'en-GB':'fr-FR',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString(lang()==='en'?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'});}catch(e){return iso||'';}}

  var KIND={profile:{fr:'Profil',en:'Profile',icon:'ti-user',col:'var(--teal-deep)'},news:{fr:'Contenu',en:'Content',icon:'ti-news',col:'var(--sand)'},application:{fr:'Projet',en:'Project',icon:'ti-plant-2',col:'var(--teal)'},project:{fr:'Projet',en:'Project',icon:'ti-plant-2',col:'var(--teal)'},message:{fr:'Message',en:'Message',icon:'ti-message-2',col:'#2A4D8F'}};
  var DEC={approved:{fr:'Approuvé',en:'Approved',cls:'bdg-info'},removed:{fr:'Retiré',en:'Removed',cls:'bdg-rej'},changes:{fr:'Modifications demandées',en:'Changes requested',cls:'bdg-warn'}};

  function resolveRef(it){
    var k=it.kind, r=it.refId;
    if(k==='profile'){ var e=CFCol.get('entrepreneurs',r); if(e) return {coll:'entrepreneurs',title:e.n,sub:e.s,pays:e.pays,kindLabel:T('Entrepreneur','Entrepreneur'),obj:e}; var m=CFCol.get('mentors',r); if(m) return {coll:'mentors',title:m.n,sub:m.org,pays:m.pays,kindLabel:T('Mentor','Mentor'),obj:m}; }
    if(k==='news'){ var n=CFCol.get('news',r); if(n) return {coll:'news',title:CFCol.t(n.title,lang()),sub:CFCol.t(n.excerpt,lang()),obj:n}; }
    if(k==='application'||k==='project'){ var a=CFCol.get('applications',r); if(a) return {coll:'applications',title:(a.projet&&a.projet.nom),sub:(a.candidat&&a.candidat.nom),pays:(a.candidat&&a.candidat.pays),obj:a}; }
    return null;
  }

  var state={tab:'pending'};
  var queue,emptyEl,tabPend,tabDone;

  function cardTitle(it,ref){ return ref?ref.title:CFCol.t(it.reason,lang()); }

  function render(){
    var all=CFCol.all('moderation_queue');
    var rows=all.filter(function(m){ return state.tab==='pending'?!m.resolved:m.resolved; });
    queue.innerHTML=rows.map(function(it){
      var ref=resolveRef(it); var K=KIND[it.kind]||KIND.message;
      var visual=(ref&&ref.coll==='news'&&ref.obj.img)?('<div class="thumb"><img src="'+esc(ref.obj.img)+'" alt=""></div>'):('<div class="av" style="background:'+K.col+'">'+(ref?esc(ini(ref.title)):'<i class="ti '+K.icon+'"></i>')+'</div>');
      var meta='<span><i class="ti '+K.icon+'"></i>'+T(K.fr,K.en)+'</span>'+(ref&&ref.pays?'<span><i class="ti ti-map-pin"></i>'+esc(ref.pays)+'</span>':'')+'<span><i class="ti ti-flag"></i>'+esc(it.reportedBy||'')+'</span><span><i class="ti ti-clock"></i>'+fmtDate(it.at)+'</span>';
      var rep='<div class="report"><i class="ti ti-flag"></i>'+esc(CFCol.t(it.reason,lang()))+'</div>';
      var foot;
      if(it.resolved){ var d=DEC[it.decision]||DEC.approved; foot='<div class="mod-f"><span class="bdg '+d.cls+'">'+T(d.fr,d.en)+'</span>'+(it.motif?'<span style="font:12.5px var(--font-sans);color:var(--ink-mute);align-self:center;">'+esc(it.motif)+'</span>':'')+'<button class="btn btn-light btn-sm" data-view="'+esc(it.id)+'"><i class="ti ti-eye"></i>'+T('Voir','View')+'</button></div>'; }
      else { foot='<div class="mod-f"><button class="btn btn-light btn-sm" data-view="'+esc(it.id)+'"><i class="ti ti-eye"></i>'+T('Voir','View')+'</button><button class="btn btn-light btn-sm" data-act="changes" data-id="'+esc(it.id)+'"><i class="ti ti-edit"></i>'+T('Demander des modifications','Request changes')+'</button><button class="btn btn-rej btn-sm" data-act="removed" data-id="'+esc(it.id)+'"><i class="ti ti-x"></i>'+T('Retirer','Remove')+'</button><button class="btn btn-ok btn-sm" data-act="approved" data-id="'+esc(it.id)+'"><i class="ti ti-check"></i>'+T('Approuver','Approve')+'</button></div>'; }
      return '<div class="mod'+(it.kind==='message'||it.kind==='news'?' flag':'')+'"><div class="mod-b">'+visual+'<div class="info"><div class="mh"><span class="mt">'+esc(cardTitle(it,ref))+'</span></div>'+(ref&&ref.sub?'<div class="ms">'+esc(ref.sub)+'</div>':'')+rep+'<div class="meta">'+meta+'</div></div></div>'+foot+'</div>';
    }).join('');
    var pend=all.filter(function(m){return !m.resolved;}).length, done=all.filter(function(m){return m.resolved;}).length;
    if(tabPend) tabPend.querySelector('.c').textContent=pend;
    if(tabDone) tabDone.querySelector('.c').textContent=done;
    emptyEl.classList.toggle('show', rows.length===0);
    bind();
  }
  function bind(){
    [].slice.call(queue.querySelectorAll('[data-view]')).forEach(function(b){ b.addEventListener('click',function(){ openDrawer(b.getAttribute('data-view')); }); });
    [].slice.call(queue.querySelectorAll('[data-act]')).forEach(function(b){ b.addEventListener('click',function(){ openModal(b.getAttribute('data-act'), b.getAttribute('data-id')); }); });
  }

  /* ---- drawer ---- */
  function openDrawer(id){
    var it=CFCol.get('moderation_queue',id); if(!it) return; var ref=resolveRef(it); var K=KIND[it.kind]||KIND.message;
    var body='<div class="ds-top"><div class="ds-av" style="background:'+K.col+'">'+(ref?esc(ini(ref.title)):'<i class="ti '+K.icon+'"></i>')+'</div><div style="min-width:0"><div class="ds-name">'+esc(cardTitle(it,ref))+'</div><div class="ds-proj">'+T(K.fr,K.en)+(ref&&ref.kindLabel?(' · '+ref.kindLabel):'')+'</div></div></div>';
    body+='<div class="ds-sec"><div class="ds-h">'+T('Signalement','Report')+'</div><div class="ds-prose">'+esc(CFCol.t(it.reason,lang()))+'</div><div class="ds-grid" style="margin-top:10px">'+kv(T('Signalé par','Reported by'),it.reportedBy)+kv(T('Date','Date'),fmtDate(it.at))+'</div></div>';
    if(ref){
      if(ref.coll==='entrepreneurs'||ref.coll==='mentors'){ var o=ref.obj; body+='<div class="ds-sec"><div class="ds-h">'+T('Objet signalé','Reported object')+'</div><div class="ds-grid">'+kv(T('Nom','Name'),o.n)+kv(ref.coll==='mentors'?T('Organisation','Organisation'):T('Structure','Structure'),o.s||o.org)+kv(T('Pays','Country'),o.pays)+kv(T('Statut','Status'),o.pub||'published')+'</div><div style="margin-top:12px"><a class="btn btn-light btn-sm" href="'+(ref.coll==='mentors'?'mentor.html':'profil-entrepreneur.html')+'?id='+esc(o.id)+'" target="_blank"><i class="ti ti-external-link"></i>'+T('Ouvrir le profil public','Open public profile')+'</a></div></div>'; }
      else if(ref.coll==='news'){ var n=ref.obj; body+='<div class="ds-sec"><div class="ds-h">'+T('Article concerné','Article concerned')+'</div><div class="ds-prose">'+esc(CFCol.t(n.excerpt,lang()))+'</div><div style="margin-top:12px"><a class="btn btn-light btn-sm" href="article.html?id='+esc(n.id)+'" target="_blank"><i class="ti ti-external-link"></i>'+T('Ouvrir l’article','Open article')+'</a></div></div>'; }
      else if(ref.coll==='applications'){ var a=ref.obj; body+='<div class="ds-sec"><div class="ds-h">'+T('Projet soumis','Submitted project')+'</div><div class="ds-grid">'+kv(T('Porteur','Lead'),a.candidat&&a.candidat.nom)+kv(T('Pays','Country'),a.candidat&&a.candidat.pays)+'</div><div class="ds-prose">'+esc(a.projet&&a.projet.description)+'</div></div>'; }
    } else { body+='<div class="ds-sec"><div class="ds-muted">'+T('Le contenu signalé est consultable dans la messagerie de l’équipe.','The reported content is available in the team inbox.')+'</div></div>'; }
    if(it.resolved){ var d=DEC[it.decision]||DEC.approved; body+='<div class="ds-sec"><div class="ds-h">'+T('Décision','Decision')+'</div><div class="ds-grid">'+kv(T('Issue','Outcome'),T(d.fr,d.en))+kv(T('Par','By'),it.by)+(it.decidedAt?kv(T('Le','On'),fmtDate(it.decidedAt)):'')+'</div>'+(it.motif?'<div class="ds-prose">'+esc(it.motif)+'</div>':'')+'</div>'; }
    $('modBody').innerHTML=body;
    $('modFoot').innerHTML = it.resolved ? '<span class="ds-muted">'+T('Décision enregistrée','Decision recorded')+'</span>'
      : '<button class="btn btn-rej btn-sm" data-fact="removed"><i class="ti ti-x"></i>'+T('Retirer','Remove')+'</button><button class="btn btn-light btn-sm" data-fact="changes"><i class="ti ti-edit"></i>'+T('Modifications','Changes')+'</button><button class="btn btn-ok btn-sm" data-fact="approved"><i class="ti ti-check"></i>'+T('Approuver','Approve')+'</button>';
    [].slice.call($('modFoot').querySelectorAll('[data-fact]')).forEach(function(b){ b.addEventListener('click',function(){ openModal(b.getAttribute('data-fact'),id); }); });
    $('modDrawerOv').classList.add('show'); $('modDrawer').classList.add('show'); $('modDrawer').setAttribute('aria-hidden','false');
  }
  function closeDrawer(){ $('modDrawerOv').classList.remove('show'); $('modDrawer').classList.remove('show'); $('modDrawer').setAttribute('aria-hidden','true'); }
  function kv(k,v){ return '<div class="ds-k">'+esc(k)+'</div><div class="ds-v">'+(v?esc(v):'<span class="ds-muted">—</span>')+'</div>'; }

  /* ---- decision modal ---- */
  var MODES={
    approved:{ic:'ti-circle-check',icbg:'var(--success-bg)',icfg:'var(--success)',req:false,btn:'btn-ok',action:'moderation.approve',title:function(){return T('Approuver','Approve');},sub:function(){return T('L’élément reste publié et le signalement est clos.','The item stays published and the report is closed.');},label:function(){return T('Note (optionnel)','Note (optional)');}},
    removed:{ic:'ti-circle-x',icbg:'var(--error-bg)',icfg:'var(--error)',req:true,btn:'btn-rej',action:'moderation.remove',title:function(){return T('Retirer l’élément','Remove the item');},sub:function(){return T('L’élément sera retiré du site public. Motif obligatoire.','The item will be removed from the public site. Reason required.');},label:function(){return T('Motif du retrait','Reason for removal')+' *';}},
    changes:{ic:'ti-edit',icbg:'var(--warning-bg)',icfg:'var(--warning)',req:true,btn:'btn-pri',action:'moderation.changes',title:function(){return T('Demander des modifications','Request changes');},sub:function(){return T('L’auteur est invité à corriger avant republication.','The author is asked to fix before re-publishing.');},label:function(){return T('Modifications demandées','Requested changes')+' *';}}
  };
  var ctx={};
  function openModal(mode,id){ var it=CFCol.get('moderation_queue',id); if(!it) return; var ref=resolveRef(it); var M=MODES[mode]; ctx={mode:mode,id:id};
    $('modIc').style.background=M.icbg; $('modIc').style.color=M.icfg; $('modIc').innerHTML='<i class="ti '+M.ic+'"></i>';
    $('modTitle').textContent=M.title(); $('modSub').textContent=M.sub();
    $('modRefT').textContent=cardTitle(it,ref); $('modRefS').textContent=CFCol.t(it.reason,lang());
    $('modLabel').textContent=M.label(); $('modNote').value=''; $('modField').classList.remove('invalid');
    $('modConfirm').className='btn '+M.btn; $('modConfirm').innerHTML='<i class="ti '+M.ic+'"></i>'+M.title();
    $('modOv').classList.add('show'); setTimeout(function(){ $('modNote').focus(); },60);
  }
  function closeModal(){ $('modOv').classList.remove('show'); }
  function applyDecision(){
    var M=MODES[ctx.mode]; var note=$('modNote').value.trim();
    if(M.req && !note){ $('modField').classList.add('invalid'); return; }
    var it=CFCol.get('moderation_queue',ctx.id); if(!it){ closeModal(); return; }
    CFCol.patch('moderation_queue',ctx.id,{resolved:true, decision:ctx.mode, by:sess.name||'Console', motif:note, decidedAt:new Date().toISOString()});
    // "removed" actually archives the object so the toast is truthful (audit #4)
    if(ctx.mode==='removed'){ var ref=resolveRef(it); if(ref&&(ref.coll==='news'||ref.coll==='entrepreneurs'||ref.coll==='mentors')){ try{ CFCol.patch(ref.coll, it.refId, {pub:'archived'}); }catch(e){} } }
    try{ CFAudit.log({action:M.action, target:{kind:'moderation',id:it.id,label:it.kind+' · '+it.refId}, note:note}); }catch(e){}
    closeModal(); if($('modDrawer').classList.contains('show')) openDrawer(ctx.id); render();
    toast(T('Décision enregistrée.','Decision recorded.'), ctx.mode==='removed');
  }

  /* ---- toast ---- */
  function toast(m,rej){ var t=$('toast'); $('toastMsg').textContent=m; t.querySelector('i').className='ti '+(rej?'ti-circle-x':'ti-circle-check'); t.style.borderLeftColor=rej?'var(--error)':'var(--success)'; t.querySelector('i').style.color=rej?'var(--error)':'var(--success)'; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); },2600); }

  function init(){
    queue=$('queue'); emptyEl=$('empty');
    tabPend=document.querySelector('.tabs button[data-tab="pending"]'); tabDone=document.querySelector('.tabs button[data-tab="done"]');
    [].slice.call(document.querySelectorAll('.tabs button')).forEach(function(b){ b.addEventListener('click',function(){ document.querySelectorAll('.tabs button').forEach(function(x){x.classList.remove('on');}); b.classList.add('on'); state.tab=b.getAttribute('data-tab'); render(); }); });
    $('modCancel').addEventListener('click',closeModal); $('modOv').addEventListener('click',function(e){ if(e.target===this) closeModal(); });
    $('modConfirm').addEventListener('click',applyDecision); $('modNote').addEventListener('input',function(){ $('modField').classList.remove('invalid'); });
    $('modDrawerOv').addEventListener('click',closeDrawer); $('modClose').addEventListener('click',closeDrawer);
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ closeModal(); closeDrawer(); } });
    render();
    try{ new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
  }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded',init);
})();
