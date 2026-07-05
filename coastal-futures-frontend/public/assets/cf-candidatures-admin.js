/* Coastal Futures — admin candidatures controller (audit #3 / #21 / #34 / #36).
   Reads + decides applications from CFCol('applications'). Every decision persists
   (CFCol.patch), is motivated, appended to the dossier history, and journaled
   (CFAudit). The dead eye button now opens a full DOSSIER drawer; the dead pend/done
   tabs, counters, search, filter and reassignment are all real. Canonical statuses :
   submitted | review | incomplete | accepted | rejected. Labelling is a PROJECT
   status, never an application status. Bilingual + re-renders on html[lang] change. */
(function(){
  if(!window.CFCol) return;
  var sess=(window.CFAdmin&&CFAdmin.session&&CFAdmin.session())||{name:'',role:'',country:''};

  function lang(){ return document.documentElement.lang==='en'?'en':'fr'; }
  function T(fr,en){ return lang()==='en'?en:fr; }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function initials(n){ return (n||'').split(/\s+/).map(function(x){return x[0]||'';}).join('').slice(0,2).toUpperCase(); }
  function shortName(n){ var p=(n||'').split(/\s+/); return p.length>1?(p[0][0]+'. '+p.slice(1).join(' ')):n; }

  var ST={
    submitted:{fr:'Soumise',en:'Submitted',cls:'bdg-pend'},
    review:{fr:'En revue',en:'Under review',cls:'bdg-pend'},
    incomplete:{fr:'À compléter',en:'To complete',cls:'bdg-incmp'},
    accepted:{fr:'Acceptée',en:'Accepted',cls:'bdg-live'},
    rejected:{fr:'Rejetée',en:'Rejected',cls:'bdg-rej'}
  };
  var PEND=['submitted','review','incomplete'], DONE=['accepted','rejected'];
  var SECTORS={energie:{fr:'Énergie renouvelable',en:'Renewable energy'},recyclage:{fr:'Recyclage et économie circulaire',en:'Recycling and circular economy'},mangroves:{fr:'Restauration de mangroves',en:'Mangrove restoration'},agriculture:{fr:'Agriculture résiliente',en:'Resilient agriculture'},entreprise:{fr:'Entreprise verte',en:'Green enterprise'}};

  function statusBadge(s){ var d=ST[s]||ST.submitted; return '<span class="bdg '+d.cls+'"><span class="dot"></span>'+T(d.fr,d.en)+'</span>'; }
  function appelTitle(id){ var c=CFCol.get('calls',id); if(!c) return T('Appel non spécifié','Unspecified call'); return CFCol.t(c.title,lang()); }
  function sectorLabel(code){ var s=SECTORS[code]; return s?T(s.fr,s.en):(code||''); }
  function fmtDate(iso){ try{ var d=new Date(iso); return d.toLocaleDateString(lang()==='en'?'en-GB':'fr-FR',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return iso||''; } }
  function fmtSize(b){ if(!b) return ''; var kb=b/1024; if(kb<1024) return Math.round(kb)+' Ko'; return (kb/1024).toFixed(1).replace('.',T(',','.'))+' Mo'; }

  var state={tab:'pend', q:'', status:''};

  function list(){
    var all=CFCol.all('applications');
    // country coordinators only see their country
    if(sess.role==='country' && sess.country){ all=all.filter(function(a){ return (a.candidat&&a.candidat.pays)===sess.country; }); }
    return all;
  }
  function filtered(){
    var arr=list().filter(function(a){ return (state.tab==='pend'?PEND:DONE).indexOf(a.status)>=0; });
    if(state.status) arr=arr.filter(function(a){ return a.status===state.status; });
    if(state.q){ var q=state.q.toLowerCase(); arr=arr.filter(function(a){
      return ((a.candidat&&a.candidat.nom||'')+' '+(a.projet&&a.projet.nom||'')+' '+appelTitle(a.appelId)).toLowerCase().indexOf(q)>=0; }); }
    return arr;
  }

  /* ---------- rows ---------- */
  var rowsEl,emptyEl,pendCap,tabPend,tabDone;
  function render(){
    var arr=filtered();
    rowsEl.innerHTML=arr.map(function(a){
      var c=a.candidat||{}, p=a.projet||{};
      var actions = DONE.indexOf(a.status)>=0
        ? '<span class="row-done '+(a.status==='accepted'?'ok':'rj')+'"><i class="ti '+(a.status==='accepted'?'ti-circle-check':'ti-circle-x')+'"></i>'+T(ST[a.status].fr,ST[a.status].en)+'</span>'
        : '<div class="c-act"><span class="ib view" data-view title="'+T('Voir le dossier','View application')+'"><i class="ti ti-eye"></i></span><span class="ib ok" data-ok title="'+T('Approuver','Approve')+'"><i class="ti ti-check"></i></span><span class="ib rej" data-rej title="'+T('Rejeter','Reject')+'"><i class="ti ti-x"></i></span></div>';
      var assignedTo=a.assignee?('<span class="a">'+initials(a.assignee)+'</span>'+shortName(a.assignee)):('<span class="a">?</span>'+T('Non assigné','Unassigned'));
      return '<div class="crow" data-id="'+esc(a.id)+'">'+
        '<div class="c-ent"><div class="av">'+esc(initials(c.nom))+'</div><div style="min-width:0"><div class="en">'+esc(c.nom||'')+'</div><div class="es">'+esc(p.nom||'')+'</div></div></div>'+
        '<div class="c-appel">'+esc(appelTitle(a.appelId))+'</div>'+
        '<div class="c-date tnum">'+esc(fmtDate(a.submittedAt))+'</div>'+
        '<div class="c-st">'+statusBadge(a.status)+'</div>'+
        '<div class="c-assign">'+assignedTo+'</div>'+
        actions+
      '</div>';
    }).join('');
    emptyEl.style.display=arr.length?'none':'block';

    var pend=list().filter(function(a){return PEND.indexOf(a.status)>=0;}).length;
    var done=list().filter(function(a){return DONE.indexOf(a.status)>=0;}).length;
    if(tabPend) tabPend.querySelector('.cnt').textContent=pend;
    if(tabDone) tabDone.querySelector('.cnt').textContent=done;
    if(pendCap) pendCap.innerHTML='<b class="tnum">'+pend+'</b> '+T('à traiter','to process');
    bindRows();
  }
  function bindRows(){
    [].slice.call(rowsEl.querySelectorAll('.crow')).forEach(function(row){
      var id=row.getAttribute('data-id');
      row.addEventListener('click',function(e){
        if(e.target.closest('[data-ok]')) return openModal('accept',id);
        if(e.target.closest('[data-rej]')) return openModal('reject',id);
        openDossier(id);
      });
    });
  }

  /* ---------- decision modal (accept / reject / complement) ---------- */
  var overlay=document.getElementById('overlay'),mIc=document.getElementById('mIc'),mTitle=document.getElementById('mTitle'),mSub=document.getElementById('mSub'),mEn=document.getElementById('mEn'),mEs=document.getElementById('mEs'),mAv=document.getElementById('mAv'),mLabel=document.getElementById('mLabel'),mNote=document.getElementById('mNote'),mField=document.getElementById('mField'),mConfirm=document.getElementById('mConfirm'),mErr=document.getElementById('mErr');
  var ctx={};
  var MODES={
    accept:{icbg:'var(--success-bg)',icfg:'var(--success)',ic:'ti-circle-check',req:false,status:'accepted',action:'application.accept',
      title:function(){return T('Approuver la candidature','Approve application');}, sub:function(){return T("La candidature sera acceptée. L'entrepreneur en sera informé.",'The application will be accepted. The applicant will be informed.');},
      label:function(){return T('Note pour l’entrepreneur','Note for the applicant')+' <span style="color:var(--ink-faint);font-weight:400">('+T('optionnel','optional')+')</span>';}, btn:function(){return '<i class="ti ti-check"></i>'+T('Approuver','Approve');}, btncls:'btn-ok'},
    reject:{icbg:'var(--error-bg)',icfg:'var(--error)',ic:'ti-circle-x',req:true,status:'rejected',action:'application.reject',
      title:function(){return T('Rejeter la candidature','Reject application');}, sub:function(){return T("L'entrepreneur sera notifié du rejet et de son motif.",'The applicant will be notified of the rejection and its reason.');},
      label:function(){return T('Motif du rejet','Reason for rejection')+' <span class="req">*</span>';}, btn:function(){return '<i class="ti ti-x"></i>'+T('Confirmer le rejet','Confirm rejection');}, btncls:'btn-rej'},
    complement:{icbg:'var(--warning-bg)',icfg:'var(--warning)',ic:'ti-file-alert',req:true,status:'incomplete',action:'application.request_complement',
      title:function(){return T('Demander un complément','Request more information');}, sub:function(){return T('Le dossier passe « à compléter ». Précisez ce qui manque.','The file becomes "to complete". Specify what is missing.');},
      label:function(){return T('Éléments à compléter','Information to provide')+' <span class="req">*</span>';}, btn:function(){return '<i class="ti ti-send"></i>'+T('Envoyer la demande','Send the request');}, btncls:'btn-pri'}
  };
  function openModal(mode,id){
    var a=CFCol.get('applications',id); if(!a) return; var c=a.candidat||{};
    ctx={mode:mode,id:id};
    var M=MODES[mode];
    mIc.style.background=M.icbg; mIc.style.color=M.icfg; mIc.innerHTML='<i class="ti '+M.ic+'"></i>';
    mTitle.textContent=M.title(); mSub.textContent=M.sub();
    mEn.textContent=c.nom||''; mEs.textContent=(a.projet&&a.projet.nom||'')+' · '+appelTitle(a.appelId); mAv.textContent=initials(c.nom);
    mLabel.innerHTML=M.label(); mNote.value=''; mNote.placeholder=mode==='accept'?T('Commentaire de validation…','Validation comment…'):T('Expliquez…','Explain…');
    mConfirm.className='btn '+M.btncls; mConfirm.innerHTML=M.btn();
    if(mErr) mErr.textContent=T('Ce champ est requis.','This field is required.');
    mField.classList.remove('invalid');
    overlay.classList.add('show'); setTimeout(function(){ mNote.focus(); },60);
  }
  function closeModal(){ overlay.classList.remove('show'); }
  function applyDecision(){
    var M=MODES[ctx.mode]; var note=mNote.value.trim();
    if(M.req && !note){ mField.classList.add('invalid'); return; }
    var a=CFCol.get('applications',ctx.id); if(!a){ closeModal(); return; }
    var hist=(a.history||[]).concat([{at:new Date().toISOString(), by:sess.name||'Console', action:M.status, note:note}]);
    var patched=CFCol.patch('applications',ctx.id,{status:M.status, history:hist});
    var evTotal=(a.evaluation&&typeof a.evaluation.total==='number')?a.evaluation.total:null;
    try{ CFAudit.log({action:M.action, target:{kind:'application',id:a.id,label:(a.candidat&&a.candidat.nom)+' · '+(a.projet&&a.projet.nom)}, before:{status:a.status}, after:{status:M.status, score:evTotal}, note:note+(evTotal!=null?(' · '+T('note pondérée ','weighted score ')+evTotal+'/100'):'')}); }catch(e){}
    closeModal();
    if(dossierOpenId===ctx.id) renderDossier(ctx.id); // keep drawer in sync
    render();
    toast(decisionMsg(ctx.mode,a), ctx.mode==='reject');
  }
  function decisionMsg(mode,a){
    var nm=(a.candidat&&a.candidat.nom)||'';
    if(mode==='accept') return T('Candidature de '+nm+' acceptée.','Application from '+nm+' accepted.');
    if(mode==='reject') return T('Candidature de '+nm+' rejetée.','Application from '+nm+' rejected.');
    return T('Complément demandé à '+nm+'.','More information requested from '+nm+'.');
  }

  /* ---------- dossier drawer ---------- */
  var dossier=document.getElementById('dossier'),dossierOv=document.getElementById('dossierOverlay'),dossierBody=document.getElementById('dossierBody'),dossierOpenId=null;
  function dirNames(){
    var names=[]; try{ var d=CFAdmin.directory(); Object.keys(d).forEach(function(k){ if(names.indexOf(d[k].name)<0) names.push(d[k].name); }); }catch(e){}
    return names;
  }
  function openDossier(id){ dossierOpenId=id; renderDossier(id); dossierOv.classList.add('show'); dossier.classList.add('show'); dossier.setAttribute('aria-hidden','false'); }
  function closeDossier(){ dossierOpenId=null; dossierOv.classList.remove('show'); dossier.classList.remove('show'); dossier.setAttribute('aria-hidden','true'); }
  function renderDossier(id){
    var a=CFCol.get('applications',id); if(!a){ closeDossier(); return; }
    var c=a.candidat||{}, p=a.projet||{};
    var pend=PEND.indexOf(a.status)>=0;
    var pieces=(a.pieces||[]).map(function(f,idx){ var icon=f.type==='pdf'?'ti-file-type-pdf':(/(png|jpe?g|gif|webp)/.test(f.type||'')?'ti-photo':'ti-file'); return '<div class="ds-file" data-piece="'+idx+'"><i class="ti '+icon+'"></i><span class="fn">'+esc(f.name)+'</span><span class="fs tnum">'+esc(fmtSize(f.size))+'</span><button type="button" class="ds-fbtn" data-prev title="'+T('Aperçu','Preview')+'"><i class="ti ti-eye"></i></button><button type="button" class="ds-fbtn" data-dl title="'+T('Télécharger','Download')+'"><i class="ti ti-download"></i></button></div>'; }).join('')||'<div class="ds-muted">'+T('Aucune pièce jointe.','No attachment.')+'</div>';
    var comps=(a.complements||[]).map(function(x){ var label=(typeof x==='string')?x:(x.text||x.name||''); var dt=x.at?(' · '+fmtDate(x.at)):''; return '<div class="ds-file"><i class="ti ti-message-2"></i><span class="fn">'+esc(label)+'</span><span class="fs tnum">'+esc(dt)+'</span></div>'; }).join('');
    var hist=(a.history||[]).slice().reverse().map(function(h){
      var lbl=ST[h.action]?T(ST[h.action].fr,ST[h.action].en):h.action;
      return '<div class="ds-tl"><div class="ds-tl-dot"></div><div><div class="ds-tl-h">'+esc(lbl)+' · <span class="ds-muted">'+esc(h.by||'')+'</span></div><div class="ds-tl-d tnum">'+esc(fmtDate(h.at))+'</div>'+(h.note?'<div class="ds-tl-n">'+esc(h.note)+'</div>':'')+'</div></div>';
    }).join('');
    var assignOpts=['<option value="">'+T('Non assigné','Unassigned')+'</option>'].concat(dirNames().map(function(n){ return '<option value="'+esc(n)+'"'+(a.assignee===n?' selected':'')+'>'+esc(n)+'</option>'; })).join('');

    dossierBody.innerHTML=
      '<div class="ds-top"><div class="ds-av">'+esc(initials(c.nom))+'</div><div style="min-width:0"><div class="ds-name">'+esc(c.nom||'')+'</div><div class="ds-proj">'+esc(p.nom||'')+'</div></div>'+statusBadge(a.status)+'</div>'+
      '<div class="ds-sec"><div class="ds-h">'+T('Identité','Identity')+'</div><div class="ds-grid">'+
        kv(T('E-mail','Email'),c.email)+kv(T('Genre','Gender'),c.genre)+kv(T('Pays','Country'),c.pays)+kv(T('Ville','City'),c.ville)+'</div></div>'+
      '<div class="ds-sec"><div class="ds-h">'+T('Projet','Project')+'</div><div class="ds-grid">'+
        kv(T('Intitulé','Name'),p.nom)+kv(T('Stade','Stage'),p.stade)+kv(T('Secteur','Sector'),sectorLabel(p.secteur))+kv(T('Appel ciblé','Targeted call'),appelTitle(a.appelId))+'</div>'+
        (p.description?'<div class="ds-prose">'+esc(p.description)+'</div>':'')+'</div>'+
      '<div class="ds-sec"><div class="ds-h">'+T('Motivation','Motivation')+'</div><div class="ds-prose">'+esc(a.motivation||'')+'</div></div>'+
      '<div class="ds-sec"><div class="ds-h">'+T('Besoins prioritaires','Priority needs')+'</div><div class="ds-prose">'+esc(a.besoins||'')+'</div></div>'+
      evalSection(a)+
      '<div class="ds-sec"><div class="ds-h">'+T('Pièces jointes','Attachments')+'</div>'+pieces+(comps?('<div class="ds-subh">'+T('Compléments reçus','Received complements')+'</div>'+comps):'')+'</div>'+
      '<div class="ds-sec"><div class="ds-h">'+T('Assignation','Assignment')+'</div><div class="selwrap"><select id="dsAssign">'+assignOpts+'</select></div></div>'+
      '<div class="ds-sec"><div class="ds-h">'+T('Historique','History')+'</div><div class="ds-timeline">'+(hist||('<div class="ds-muted">'+T('Aucun événement.','No event.')+'</div>'))+'</div></div>';

    // footer actions
    var foot=document.getElementById('dossierFoot');
    foot.innerHTML = pend
      ? '<button class="btn btn-rej" data-ds="reject"><i class="ti ti-x"></i>'+T('Rejeter','Reject')+'</button>'+
        '<button class="btn btn-light" data-ds="complement"><i class="ti ti-file-alert"></i>'+T('Demander un complément','Request info')+'</button>'+
        '<button class="btn btn-ok" data-ds="accept"><i class="ti ti-check"></i>'+T('Approuver','Approve')+'</button>'
      : '<span class="ds-decided">'+statusBadge(a.status)+' '+T('Décision enregistrée','Decision recorded')+'</span>';
    [].slice.call(foot.querySelectorAll('[data-ds]')).forEach(function(b){ b.addEventListener('click',function(){ openModal(b.getAttribute('data-ds'),id); }); });
    var sel=document.getElementById('dsAssign');
    if(sel) sel.addEventListener('change',function(){
      var prev=a.assignee||''; CFCol.patch('applications',id,{assignee:this.value});
      try{ CFAudit.log({action:'application.assign', target:{kind:'application',id:id,label:(c.nom||'')}, before:{assignee:prev}, after:{assignee:this.value}}); }catch(e){}
      render(); toast(T('Dossier réassigné.','Application reassigned.'));
    });
    // attachment preview / download wiring
    [].slice.call(dossierBody.querySelectorAll('.ds-file[data-piece]')).forEach(function(row){
      var f=(a.pieces||[])[parseInt(row.getAttribute('data-piece'),10)];
      var pv=row.querySelector('[data-prev]'), dl=row.querySelector('[data-dl]');
      if(pv) pv.addEventListener('click',function(e){ e.stopPropagation(); previewPiece(f); });
      if(dl) dl.addEventListener('click',function(e){ e.stopPropagation(); downloadPiece(f); });
    });
    // evaluation grid wiring : score buttons, live weighted total, save + journal
    var evWraps=dossierBody.querySelectorAll('.ev-scores[data-crit]');
    if(evWraps.length){
      var liveScores=Object.assign({}, (a.evaluation&&a.evaluation.scores)||{});
      function refreshTotal(){ var el=document.getElementById('evTotal'); if(el) el.textContent=computeTotal(CFCol.all('selection_criteria'), liveScores)+' / 100'; }
      [].forEach.call(evWraps,function(w){
        var cid=w.getAttribute('data-crit');
        [].forEach.call(w.querySelectorAll('button[data-score]'),function(b){
          b.addEventListener('click',function(){
            liveScores[cid]=parseInt(b.getAttribute('data-score'),10);
            [].forEach.call(w.querySelectorAll('button'),function(x){x.classList.remove('on');});
            b.classList.add('on'); refreshTotal();
          });
        });
      });
      var save=document.getElementById('evSave');
      if(save) save.addEventListener('click',function(){
        var crits=CFCol.all('selection_criteria');
        var total=computeTotal(crits, liveScores);
        var cm=document.getElementById('evComment');
        var ev={scores:liveScores, comment:(cm?cm.value:'').trim(), total:total, by:sess.name||'Console', at:new Date().toISOString()};
        CFCol.patch('applications',id,{evaluation:ev});
        try{ CFAudit.log({action:'application.evaluate', target:{kind:'application',id:id,label:(c.nom||'')}, after:{total:total}, note:T('Note pondérée ','Weighted score ')+total+'/100'}); }catch(e){}
        toast(T('Évaluation enregistrée : ','Evaluation saved: ')+total+'/100');
        renderDossier(id);
      });
    }
  }
  function kv(k,v){ return '<div class="ds-k">'+esc(k)+'</div><div class="ds-v">'+(v?esc(v):'<span class="ds-muted">—</span>')+'</div>'; }

  /* ---------- attachment preview / download (audit fix) ----------
     Real uploads carry their bytes (dataUrl, stored at submit) so they preview and download for
     real. Seed/legacy pieces with no bytes fall back to a branded placeholder so the action is
     never dead. */
  function placeholderUrl(name){
    try{
      var c=document.createElement('canvas'); c.width=840; c.height=1100; var x=c.getContext('2d');
      x.fillStyle='#F8FBFA'; x.fillRect(0,0,840,1100);
      x.fillStyle='#0A6B5E'; x.fillRect(0,0,840,14);
      x.fillStyle='#0C2420'; x.font='600 30px "Plus Jakarta Sans",sans-serif'; x.fillText('Coastal Futures Network',60,110);
      x.fillStyle='#5C7B76'; x.font='400 18px "DM Sans",sans-serif'; x.fillText(lang()==='en'?'Demonstration document':'Document de démonstration',60,150);
      x.fillStyle='#244440'; x.font='600 22px "DM Sans",sans-serif'; x.fillText((name||'').slice(0,46),60,230);
      x.fillStyle='#92ACA7'; x.font='400 14px "DM Sans",sans-serif'; x.fillText(lang()==='en'?'Preview not available: this demo file carries no data.':'Aperçu indisponible : ce fichier de démonstration ne contient pas de données.',60,270);
      return c.toDataURL('image/png');
    }catch(e){ return 'data:text/plain,'+encodeURIComponent(name||'document'); }
  }
  function pieceUrl(f){ return (f&&f.dataUrl)?f.dataUrl:placeholderUrl(f&&f.name); }
  function previewPiece(f){ var u=pieceUrl(f); var w=window.open(); if(w){ w.document.write('<title>'+esc(f&&f.name||'')+'</title><body style="margin:0;background:#0C2420;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="'+u+'" style="max-width:100%;max-height:100vh" onerror="location.href=\''+u+'\'"></body>'); w.document.close(); } else { location.href=u; } }
  function downloadPiece(f){ var u=pieceUrl(f); var aEl=document.createElement('a'); aEl.href=u; aEl.download=(f&&f.name)||'document'; document.body.appendChild(aEl); aEl.click(); aEl.remove(); }

  /* ---------- evaluation grid (audit v9 B4) ----------
     The decision rests on a structured grid, not a free-form note : each selection
     criterion is scored 0-5, weighted by its published weight, and the candidate's own
     self-assessment is shown beside it. The weighted total is persisted and journaled, so
     it can later feed aggregated indicators (average sustainability, employment potential). */
  function computeTotal(crits,scores){ var t=0; crits.forEach(function(c){ var s=scores[c.id]; if(typeof s==='number') t+=(s/5)*(c.weight||0); }); return Math.round(t); }
  function evalSection(a){
    var crits=CFCol.all('selection_criteria'); if(!crits.length) return '';
    var pend=PEND.indexOf(a.status)>=0;
    var ev=a.evaluation||{scores:{},comment:''};
    var self=a.selfAssessment||{};
    var body=crits.map(function(c){
      var sc=(ev.scores&&ev.scores[c.id]!=null)?ev.scores[c.id]:null;
      var selfTxt=self[c.id];
      var scores=pend
        ? '<div class="ev-scores" data-crit="'+esc(c.id)+'">'+[0,1,2,3,4,5].map(function(n){return '<button type="button" data-score="'+n+'"'+(sc===n?' class="on"':'')+'>'+n+'</button>';}).join('')+'</div>'
        : '<div class="ev-ro">'+T('Note','Score')+' : <b>'+(sc==null?'—':(sc+' / 5'))+'</b></div>';
      return '<div class="ev-crit">'+
        '<div class="ev-crit-h"><span class="t">'+esc(CFCol.t(c.title,lang()))+'</span><span class="w">'+(c.weight||0)+'%</span></div>'+
        (selfTxt?('<div class="ev-self"><span class="lab">'+T('Réponse du candidat','Applicant answer')+'</span>'+esc(selfTxt)+'</div>'):('<div class="ev-self muted">'+T('Le candidat n’a pas renseigné ce critère.','The applicant did not fill this criterion.')+'</div>'))+
        scores+
      '</div>';
    }).join('');
    var totalNow=computeTotal(crits, ev.scores||{});
    var totalBox='<div class="ev-total"><span class="l">'+T('Note pondérée','Weighted score')+'</span><span class="v" id="evTotal">'+totalNow+' / 100</span></div>';
    var foot=pend
      ? '<textarea class="ev-comment" id="evComment" placeholder="'+T('Commentaire d’évaluation…','Evaluation comment…')+'">'+esc(ev.comment||'')+'</textarea><button class="btn btn-pri ev-save" id="evSave"><i class="ti ti-rosette-discount-check"></i>'+T('Enregistrer l’évaluation','Save evaluation')+'</button>'
      : (ev.comment?('<div class="ev-self"><span class="lab">'+T('Commentaire','Comment')+'</span>'+esc(ev.comment)+'</div>'):'');
    return '<div class="ds-sec"><div class="ds-h">'+T('Évaluation sur les critères','Criteria evaluation')+'</div>'+body+totalBox+foot+'</div>';
  }
  function injectEvalCss(){ if(document.getElementById('cf-eval-css')) return; var s=document.createElement('style'); s.id='cf-eval-css'; s.textContent='.ev-crit{border:1px solid var(--hair);border-radius:10px;padding:13px 15px;margin-bottom:10px;}.ev-crit-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}.ev-crit-h .t{font-family:var(--font-display);font-weight:600;font-size:14px;color:var(--ink);}.ev-crit-h .w{font-family:var(--font-display);font-weight:600;font-size:11px;color:var(--teal);font-feature-settings:"tnum";}.ev-self{font-family:var(--font-sans);font-size:12.5px;color:var(--ink-2);background:var(--canvas-soft);border-radius:8px;padding:8px 10px;margin:8px 0;line-height:1.5;white-space:pre-wrap;}.ev-self.muted{color:var(--ink-faint);}.ev-self .lab{display:block;font-family:var(--font-display);font-weight:600;color:var(--ink-faint);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;}.ev-scores{display:flex;gap:6px;margin-top:4px;}.ev-scores button{flex:1;border:1px solid var(--hair-strong);background:#fff;border-radius:8px;padding:7px 0;font-family:var(--font-display);font-weight:600;font-size:13px;color:var(--ink-mute);cursor:pointer;transition:all .14s var(--ease);font-feature-settings:"tnum";}.ev-scores button:hover{border-color:var(--teal);color:var(--teal);}.ev-scores button.on{background:var(--teal);border-color:var(--teal);color:#fff;}.ev-ro{font-family:var(--font-sans);font-size:13px;color:var(--ink-2);}.ev-total{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;background:var(--teal-bg);border-radius:10px;margin:12px 0 4px;}.ev-total .l{font-family:var(--font-display);font-weight:600;font-size:13px;color:var(--teal-deep);}.ev-total .v{font-family:var(--font-display);font-weight:700;font-size:18px;color:var(--teal-deep);font-feature-settings:"tnum";}.ev-comment{width:100%;font-family:var(--font-sans);font-size:13px;color:var(--ink);border:1px solid var(--hair-strong);border-radius:8px;padding:9px 11px;min-height:60px;resize:vertical;margin-top:8px;box-sizing:border-box;}.ev-comment:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-bg);}.ev-save{margin-top:10px;}.ds-file{display:flex;align-items:center;gap:10px;}.ds-file .fn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.ds-fbtn{width:30px;height:30px;border-radius:8px;border:1px solid var(--hair-strong);background:#fff;color:var(--ink-mute);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:16px;transition:all .14s var(--ease);flex-shrink:0;}.ds-fbtn:hover{border-color:var(--teal);color:var(--teal);background:var(--teal-bg2);}'; document.head.appendChild(s); }

  /* ---------- toast ---------- */
  function toast(msg,rej){var w=document.getElementById('toastWrap');var t=document.createElement('div');t.className='toast'+(rej?' rej':'');t.innerHTML='<i class="ti '+(rej?'ti-circle-x':'ti-circle-check')+'"></i><span>'+esc(msg)+'</span>';w.appendChild(t);requestAnimationFrame(function(){requestAnimationFrame(function(){t.classList.add('show');});});setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},300);},3400);}

  /* ---------- wire ---------- */
  function init(){
    injectEvalCss();
    rowsEl=document.getElementById('rows'); emptyEl=document.getElementById('empty'); pendCap=document.getElementById('pendCap');
    tabPend=document.querySelector('.tab[data-tab="pend"]'); tabDone=document.querySelector('.tab[data-tab="done"]');
    document.getElementById('mCancel').addEventListener('click',closeModal);
    overlay.addEventListener('click',function(e){ if(e.target===overlay) closeModal(); });
    mConfirm.addEventListener('click',applyDecision);
    mNote.addEventListener('input',function(){ mField.classList.remove('invalid'); });
    dossierOv.addEventListener('click',closeDossier);
    var dx=document.getElementById('dossierClose'); if(dx) dx.addEventListener('click',closeDossier);
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ closeModal(); closeDossier(); } });
    // tabs
    [].slice.call(document.querySelectorAll('.tab')).forEach(function(t){ t.addEventListener('click',function(){
      document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active');}); t.classList.add('active');
      state.tab=t.getAttribute('data-tab'); render();
    }); });
    // search + filter
    var sb=document.getElementById('searchBox'); if(sb) sb.addEventListener('input',function(){ state.q=this.value; render(); });
    var ff=document.getElementById('statusFilter'); if(ff) ff.addEventListener('change',function(){ state.status=this.value; render(); });
    render();
    try{ new MutationObserver(function(){ render(); if(dossierOpenId) renderDossier(dossierOpenId); rebuildFilterLabels(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
  }
  function rebuildFilterLabels(){
    var ff=document.getElementById('statusFilter'); if(!ff) return;
    var v=ff.value;
    ff.innerHTML='<option value="">'+T('Tous les statuts','All statuses')+'</option>'+
      ['submitted','review','incomplete','accepted','rejected'].map(function(s){return '<option value="'+s+'">'+T(ST[s].fr,ST[s].en)+'</option>';}).join('');
    ff.value=v;
  }
  if(document.readyState!=='loading') { rebuildFilterLabels(); init(); }
  else document.addEventListener('DOMContentLoaded',function(){ rebuildFilterLabels(); init(); });
})();
