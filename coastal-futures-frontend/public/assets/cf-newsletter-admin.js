/* Coastal Futures — newsletter admin (audit livraison 14, partie A : A-03).
   Subscriber list (from the `subscribers` collection written by the public double
   opt-in form), bilingual composer, schedule/send, and campaign history. Every
   state change is persisted to CFCol and logged to CFAudit. The actual e-mail send
   (confirmation + campaigns) runs server-side : here we record state and simulate.
   Back-end devs : see BACKEND.md, single transactional e-mail module. */
(function(){
  if(!window.CFCol){ return; }
  var editId=null, editLang='fr';

  /* ---------- helpers ---------- */
  function el(id){ return document.getElementById(id); }
  function toast(m){ var t=el('toast'); el('toastMsg').textContent=m; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(function(){ t.classList.remove('show'); },2600); }
  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s){ return (s==null?'':String(s)).replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  function fmtDate(d){ if(!d) return '—'; try{ var x=new Date((d.length===10?d+'T00:00:00':d)); return x.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return d; } }
  function today(){ return new Date().toISOString().slice(0,10); }
  function subs(){ return CFCol.all('subscribers'); }
  function confirmedCount(){ return subs().filter(function(s){ return s.status==='confirmed'; }).length; }
  function audit(o){ try{ if(window.CFAudit) CFAudit.log(o); }catch(e){} }

  /* ---------- stats ---------- */
  function renderStats(){
    var a=subs();
    var conf=a.filter(function(s){return s.status==='confirmed';}).length;
    var pend=a.filter(function(s){return s.status==='pending';}).length;
    var unsub=a.filter(function(s){return s.status==='unsubscribed';}).length;
    var camps=CFCol.all('campaigns');
    var sent=camps.filter(function(c){return c.status==='sent';}).length;
    var html='';
    html+='<div class="stat"><div class="n tnum">'+conf+'</div><div class="l">abonnés confirmés</div></div>';
    html+='<div class="stat"><div class="n tnum">'+pend+'</div><div class="l">en attente de confirmation</div></div>';
    html+='<div class="stat"><div class="n tnum">'+unsub+'</div><div class="l">désinscrits</div></div>';
    html+='<div class="stat"><div class="n tnum">'+sent+'</div><div class="l">campagnes envoyées</div></div>';
    el('statline').innerHTML=html;
  }

  /* ---------- subscribers table ---------- */
  var STBDG={
    confirmed:'<span class="bdg bdg-live"><i class="ti ti-circle-check" style="font-size:12px;"></i>Confirmé</span>',
    pending:'<span class="bdg bdg-pend"><i class="ti ti-clock" style="font-size:12px;"></i>En attente</span>',
    unsubscribed:'<span class="bdg bdg-mute"><i class="ti ti-ban" style="font-size:12px;"></i>Désinscrit</span>'
  };
  function renderSubs(){
    var q=(el('q').value||'').trim().toLowerCase();
    var fs=el('fStatus').value, fl=el('fLang').value;
    var a=subs().filter(function(s){
      if(fs && s.status!==fs) return false;
      if(fl && (s.lang||'fr')!==fl) return false;
      if(q && (s.email||'').toLowerCase().indexOf(q)<0) return false;
      return true;
    });
    // newest first by createdAt
    a.sort(function(x,y){ return (y.createdAt||'').localeCompare(x.createdAt||''); });
    var tb=el('subBody'); tb.innerHTML='';
    el('subEmpty').style.display=a.length?'none':'block';
    a.forEach(function(s){
      var tr=document.createElement('tr');
      var lang=(s.lang==='en')?'EN':'FR';
      var resend=(s.status==='pending')?'<button class="iact" data-resend="'+escAttr(s.id)+'" title="Renvoyer la confirmation"><i class="ti ti-mail-forward"></i></button>':'';
      tr.innerHTML=
        '<td><span class="em">'+esc(s.email)+'</span></td>'+
        '<td><span class="lang-pill">'+lang+'</span></td>'+
        '<td>'+(STBDG[s.status]||esc(s.status))+'</td>'+
        '<td class="tnum">'+fmtDate(s.createdAt)+'</td>'+
        '<td><div class="rowact">'+resend+
          '<button class="iact del" data-del="'+escAttr(s.id)+'" title="Supprimer"><i class="ti ti-trash"></i></button>'+
        '</div></td>';
      tb.appendChild(tr);
    });
    [].slice.call(tb.querySelectorAll('[data-del]')).forEach(function(b){ b.addEventListener('click',function(){
      var id=b.getAttribute('data-del'), s=CFCol.get('subscribers',id);
      if(!s) return;
      if(confirm('Supprimer définitivement l\u2019abonné « '+s.email+' » ?')){
        CFCol.remove('subscribers',id);
        audit({action:'subscriber.delete',target:{kind:'subscriber',id:id,label:s.email},note:'Abonné supprimé'});
        renderStats(); renderSubs(); toast('Abonné supprimé');
      }
    }); });
    [].slice.call(tb.querySelectorAll('[data-resend]')).forEach(function(b){ b.addEventListener('click',function(){
      var id=b.getAttribute('data-resend'), s=CFCol.get('subscribers',id);
      if(!s) return;
      audit({action:'subscriber.resend',target:{kind:'subscriber',id:id,label:s.email},note:'E-mail de confirmation renvoyé'});
      toast('E-mail de confirmation renvoyé (simulé) à '+s.email);
    }); });
  }

  /* ---------- CSV export ---------- */
  function exportCsv(){
    var rows=[['email','langue','statut','consentement','inscrit_le','confirme_le','desinscrit_le']];
    subs().forEach(function(s){
      rows.push([s.email||'',(s.lang||'fr'),(s.status||''),(s.consent?'oui':'non'),(s.createdAt||''),(s.confirmedAt||''),(s.unsubscribedAt||'')]);
    });
    var csv=rows.map(function(r){ return r.map(function(c){ c=String(c); return /[",;\n]/.test(c)?('"'+c.replace(/"/g,'""')+'"'):c; }).join(','); }).join('\r\n');
    var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='coastal-futures-abonnes-'+today()+'.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); },1000);
    audit({action:'subscriber.export',note:'Export CSV de '+subs().length+' abonnés'});
    toast('Export CSV de '+subs().length+' abonnés');
  }

  /* ---------- campaigns history ---------- */
  var CSTBDG={
    sent:'<span class="bdg bdg-live"><i class="ti ti-send" style="font-size:12px;"></i>Envoyée</span>',
    scheduled:'<span class="bdg bdg-teal"><i class="ti ti-clock" style="font-size:12px;"></i>Programmée</span>',
    draft:'<span class="bdg bdg-pend"><i class="ti ti-edit" style="font-size:12px;"></i>Brouillon</span>'
  };
  function renderCamps(){
    var a=CFCol.all('campaigns');
    a.sort(function(x,y){ return (y.createdAt||'').localeCompare(x.createdAt||''); });
    var tb=el('campBody'); tb.innerHTML='';
    el('campEmpty').style.display=a.length?'none':'block';
    a.forEach(function(c){
      var tr=document.createElement('tr');
      var dateLabel=c.status==='sent'?('Envoyée le '+fmtDate(c.sentAt)):(c.status==='scheduled'?('Programmée le '+fmtDate(c.scheduledAt)):('Modifiée le '+fmtDate(c.updatedAt||c.createdAt)));
      var rec=(c.status==='sent'||c.status==='scheduled')?('<b class="tnum" style="font-family:var(--font-display);color:var(--ink);">'+(c.recipients||0)+'</b>'):'<span style="color:var(--ink-faint);">—</span>';
      var editBtn=(c.status==='sent')?'<button class="iact" data-dup="'+escAttr(c.id)+'" title="Dupliquer"><i class="ti ti-copy"></i></button>':'<button class="iact" data-edit="'+escAttr(c.id)+'" title="Modifier"><i class="ti ti-edit"></i></button>';
      var delBtn=(c.status==='sent')?'':'<button class="iact del" data-del="'+escAttr(c.id)+'" title="Supprimer"><i class="ti ti-trash"></i></button>';
      tr.innerHTML=
        '<td><span class="em">'+esc(CFCol.t(c.subject,'fr')||'(sans objet)')+'</span><div class="sub">'+esc((CFCol.t(c.body,'fr')||'').slice(0,72))+((CFCol.t(c.body,'fr')||'').length>72?'…':'')+'</div></td>'+
        '<td>'+(CSTBDG[c.status]||esc(c.status))+'</td>'+
        '<td class="tnum">'+dateLabel+'</td>'+
        '<td>'+rec+'</td>'+
        '<td><div class="rowact">'+editBtn+delBtn+'</div></td>';
      tb.appendChild(tr);
    });
    [].slice.call(tb.querySelectorAll('[data-edit]')).forEach(function(b){ b.addEventListener('click',function(){ openDrawer(b.getAttribute('data-edit')); }); });
    [].slice.call(tb.querySelectorAll('[data-dup]')).forEach(function(b){ b.addEventListener('click',function(){ openDrawer(b.getAttribute('data-dup'),true); }); });
    [].slice.call(tb.querySelectorAll('[data-del]')).forEach(function(b){ b.addEventListener('click',function(){
      var id=b.getAttribute('data-del'), c=CFCol.get('campaigns',id);
      if(!c) return;
      if(confirm('Supprimer cette campagne ?')){
        CFCol.remove('campaigns',id);
        audit({action:'campaign.delete',target:{kind:'campaign',id:id},note:'Campagne supprimée'});
        renderStats(); renderCamps(); toast('Campagne supprimée');
      }
    }); });
  }

  /* ---------- composer drawer ---------- */
  var draft={subject:{fr:'',en:''},body:{fr:'',en:''}};
  var drawer=el('drawer');
  function syncFromInputs(){ draft.subject[editLang]=el('fSubject').value; draft.body[editLang]=el('fBody').value; }
  function syncToInputs(){ el('fSubject').value=draft.subject[editLang]||''; el('fBody').value=draft.body[editLang]||''; el('ltSub').textContent=editLang.toUpperCase(); el('ltBody').textContent=editLang.toUpperCase(); renderPreview(); }
  function renderPreview(){
    var sub=draft.subject[editLang]||'', body=draft.body[editLang]||'';
    el('pvSub').textContent=sub||(editLang==='en'?'Campaign subject':'Objet de la campagne');
    el('pvBody').textContent=body||(editLang==='en'?'The newsletter body will appear here.':'Le corps de la lettre d\u2019information apparaîtra ici.');
    el('pvCta').textContent=editLang==='en'?'Explore the programme':'Découvrir le programme';
    el('pvFoot').innerHTML=(editLang==='en'
      ? 'You receive this email because you are subscribed to the Coastal Futures Network newsletter. <a href="#">Unsubscribe in one click</a>.'
      : 'Vous recevez cet e-mail car vous êtes inscrit à la newsletter de Coastal Futures Network. <a href="#">Se désinscrire en un clic</a>.');
    el('prevLang').textContent=editLang.toUpperCase();
  }
  function openDrawer(id,duplicate){
    editId=(id&&!duplicate)?id:null;
    var c=id?CFCol.get('campaigns',id):null;
    draft={subject:{fr:'',en:''},body:{fr:'',en:''}};
    if(c){
      draft.subject={fr:CFCol.t(c.subject,'fr'),en:(c.subject&&c.subject.en)||''};
      draft.body={fr:CFCol.t(c.body,'fr'),en:(c.body&&c.body.en)||''};
    }
    editLang='fr';
    [].slice.call(document.querySelectorAll('.langtabs button')).forEach(function(b){ b.classList.toggle('on',b.getAttribute('data-lt')==='fr'); });
    el('drTitle').textContent=duplicate?'Dupliquer la campagne':(id?'Modifier la campagne':'Nouvelle campagne');
    el('fSchedule').value=(c&&c.status==='scheduled'&&c.scheduledAt)?c.scheduledAt:'';
    el('audCount').textContent=confirmedCount();
    el('sendBtn').innerHTML='<i class="ti ti-send"></i>Envoyer';
    syncToInputs();
    drawer.classList.add('open'); requestAnimationFrame(function(){ drawer.classList.add('show'); });
  }
  function closeDrawer(){ drawer.classList.remove('show'); setTimeout(function(){ drawer.classList.remove('open'); },280); }

  function pair(o){ var r={fr:(o.fr||'').trim()}; if((o.en||'').trim()) r.en=o.en.trim(); return r; }
  function buildRecord(status){
    syncFromInputs();
    var subFr=(draft.subject.fr||'').trim();
    var id=editId||('camp-'+CFCol.slug(subFr||'campagne')+'-'+Date.now().toString(36));
    var prev=editId?CFCol.get('campaigns',editId):null;
    var rec={
      id:id,
      subject:pair(draft.subject),
      body:pair(draft.body),
      status:status,
      createdAt:(prev&&prev.createdAt)||today(),
      updatedAt:today()
    };
    return rec;
  }
  function validate(){
    syncFromInputs();
    if(!(draft.subject.fr||'').trim()){ el('fSubject').focus(); toast('L\u2019objet (FR) est requis'); return false; }
    if(!(draft.body.fr||'').trim()){ el('fBody').focus(); toast('Le corps (FR) est requis'); return false; }
    return true;
  }

  el('saveDraftBtn').addEventListener('click',function(){
    if(!(draft.subject.fr||el('fSubject').value||'').trim()){ syncFromInputs(); if(!(draft.subject.fr||'').trim()){ el('fSubject').focus(); toast('L\u2019objet (FR) est requis'); return; } }
    var rec=buildRecord('draft');
    CFCol.upsert('campaigns',rec);
    audit({action:'campaign.draft',target:{kind:'campaign',id:rec.id,label:CFCol.t(rec.subject,'fr')},note:'Brouillon de campagne enregistré'});
    closeDrawer(); renderStats(); renderCamps(); toast('Brouillon enregistré'); editId=null;
  });

  el('sendBtn').addEventListener('click',function(){
    if(!validate()) return;
    var sched=el('fSchedule').value;
    var future=sched && sched>today();
    var n=confirmedCount();
    var rec=buildRecord(future?'scheduled':'sent');
    rec.recipients=n;
    if(future){ rec.scheduledAt=sched; }
    else { rec.sentAt=today(); }
    CFCol.upsert('campaigns',rec);
    audit({action:future?'campaign.schedule':'campaign.send',target:{kind:'campaign',id:rec.id,label:CFCol.t(rec.subject,'fr')},note:(future?'Campagne programmée pour le '+sched:'Campagne envoyée')+' · '+n+' destinataires'});
    closeDrawer(); renderStats(); renderCamps();
    toast(future?('Campagne programmée pour le '+fmtDate(sched)+' · '+n+' destinataires'):('Envoi déclenché (simulé) vers '+n+' abonnés confirmés'));
    editId=null;
  });

  // language tabs
  [].slice.call(document.querySelectorAll('.langtabs button')).forEach(function(b){
    b.addEventListener('click',function(){
      syncFromInputs();
      editLang=b.getAttribute('data-lt');
      [].slice.call(document.querySelectorAll('.langtabs button')).forEach(function(x){ x.classList.toggle('on',x===b); });
      syncToInputs();
    });
  });
  el('fSubject').addEventListener('input',function(){ draft.subject[editLang]=this.value; renderPreview(); });
  el('fBody').addEventListener('input',function(){ draft.body[editLang]=this.value; renderPreview(); });

  // drawer close wiring
  [].slice.call(drawer.querySelectorAll('[data-close]')).forEach(function(b){ b.addEventListener('click',closeDrawer); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && drawer.classList.contains('open')) closeDrawer(); });

  el('newCampBtn').addEventListener('click',function(){ openDrawer(null); });
  el('newCampBtn2').addEventListener('click',function(){ openDrawer(null); });
  el('exportBtn').addEventListener('click',exportCsv);
  ['q','fStatus','fLang'].forEach(function(id){ var e=el(id); e.addEventListener('input',renderSubs); e.addEventListener('change',renderSubs); });

  // cross-tab : public form adds subscribers, other admin tabs change campaigns
  window.addEventListener('storage',function(e){ if(e.key==='cf-col-subscribers'){ renderStats(); renderSubs(); } if(e.key==='cf-col-campaigns'){ renderStats(); renderCamps(); } });

  renderStats(); renderSubs(); renderCamps();

  // mobile sidebar
  (function(){var side=document.querySelector(".app .side"),b=document.querySelector(".cf-appburger");if(!side||!b)return;var sc=document.createElement("div");sc.className="cf-appscrim";document.body.appendChild(sc);function o(){side.classList.add("open");sc.classList.add("show");}function c(){side.classList.remove("open");sc.classList.remove("show");}b.addEventListener("click",function(){side.classList.contains("open")?c():o();});sc.addEventListener("click",c);})();
})();
