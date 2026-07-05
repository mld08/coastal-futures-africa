/* Coastal Futures — entrepreneurs & mentors directory admin (audit v10 P2).
   The two public directories (annuaire-entrepreneurs, annuaire-mentors) had NO admin
   screen : nobody could add a recruited mentor, fix a profile, retire an obsolete one.
   This screen gives the content role full CRUD over both collections, bilingual where
   the public is bilingual (the entrepreneur presentation), published / retired states,
   merge-non-destructive saves, and an audit entry per change. Entrepreneurs flow to the
   public directory + profiles through CFDir (which now merges CFCol('entrepreneurs')) ;
   mentors flow straight to annuaire-mentors (reads CFCol.published('mentors')). */
(function(){
  if(!window.CFCol) return;
  function $(x){ return document.getElementById(x); }
  function lang(){ return document.documentElement.lang==='en'?'en':'fr'; }
  function T(fr,en){ return lang()==='en'?en:fr; }
  function esc(s){ return window.CFSan?CFSan.text(s).replace(/&#47;/g,'/'):String(s==null?'':s); }
  var sess=(window.CFAdmin&&CFAdmin.session&&CFAdmin.session())||{name:'Équipe programme',role:''};

  var SEC={energie:'Énergie renouvelable',mangroves:'Restauration de mangroves',recyclage:'Recyclage et déchets',agriculture:'Agriculture résiliente',entreprise:'Entreprise verte'};
  var PAYS=['Sénégal','Ghana','Guinée-Conakry','Liberia','Sierra Leone'];
  var ST=['Inscrit','Candidature soumise'];
  var CAT={finance:'Finance verte et investissement',energie:'Énergie renouvelable',agriculture:'Agriculture et résilience',circulaire:'Économie circulaire',bleue:'Économie bleue et mangroves'};

  function initials(s){ var p=(s||'').trim().split(/\s+/); return ((p[0]&&p[0][0]||'')+(p[1]&&p[1][0]||'')).toUpperCase()||'CF'; }
  function slug(s){ return CFCol.slug(s); }
  function opts(arr,val,labels){ return arr.map(function(o){ var v=labels?o:o,l=labels?labels[o]:o; return '<option value="'+esc(v)+'"'+(val===v?' selected':'')+'>'+esc(l)+'</option>'; }).join(''); }
  function pubBadge(p){ return (p||'published')==='published'
    ? '<span class="bdg bdg-live"><i class="ti ti-check"></i>'+T('Publié','Published')+'</span>'
    : '<span class="bdg bdg-pend">'+T('Masqué','Hidden')+'</span>'; }

  /* ============ ENTREPRENEURS ============ */
  function drawEnt(){
    var q=($('entSearch')&&$('entSearch').value||'').trim().toLowerCase();
    var rows=CFCol.all('entrepreneurs').filter(function(e){ return !q||((e.n+' '+e.s).toLowerCase().indexOf(q)>=0); });
    var tb=$('entRows'); tb.innerHTML='';
    if(!rows.length){ tb.innerHTML='<tr><td colspan="6"><div class="empty"><i class="ti ti-user-search"></i>'+T('Aucun entrepreneur.','No entrepreneurs.')+'</div></td></tr>'; $('entCount').textContent='0'; return; }
    $('entCount').textContent=rows.length;
    rows.forEach(function(e){
      var tr=document.createElement('tr');
      tr.innerHTML='<td><div class="pn">'+esc(e.n)+'</div><div class="loc">'+esc(e.s||'')+'</div></td>'+
        '<td>'+esc(SEC[e.sec]||e.sec||'')+'</td>'+
        '<td>'+esc(e.pays||'')+'</td>'+
        '<td><span class="bdg bdg-teal">'+esc(e.st||'')+'</span></td>'+
        '<td>'+pubBadge(e.pub)+'</td>'+
        '<td><div class="rowact"><button class="iact" data-edit-ent="'+esc(e.id)+'" title="'+T('Éditer','Edit')+'"><i class="ti ti-edit"></i></button>'+
        '<button class="iact del" data-del-ent="'+esc(e.id)+'" title="'+T('Supprimer','Delete')+'"><i class="ti ti-trash"></i></button></div></td>';
      tb.appendChild(tr);
    });
    [].slice.call(tb.querySelectorAll('[data-edit-ent]')).forEach(function(b){ b.onclick=function(){ openEnt(b.getAttribute('data-edit-ent')); }; });
    [].slice.call(tb.querySelectorAll('[data-del-ent]')).forEach(function(b){ b.onclick=function(){ delRecord('entrepreneurs',b.getAttribute('data-del-ent')); }; });
  }
  function entForm(e){
    e=e||{};
    return '<div class="field"><label>'+T('Nom complet','Full name')+'</label><input id="f_n" value="'+esc(e.n||'')+'" placeholder="Aminata Diallo"></div>'+
      '<div class="field"><label>'+T('Structure / projet','Structure / project')+'</label><input id="f_s" value="'+esc(e.s||'')+'" placeholder="Dakar Solar Solutions"></div>'+
      '<div class="row2"><div class="field"><label>'+T('Secteur','Sector')+'</label><select id="f_sec">'+opts(Object.keys(SEC),e.sec||'energie',SEC)+'</select></div>'+
      '<div class="field"><label>'+T('Pays','Country')+'</label><select id="f_pays">'+opts(PAYS,e.pays||'Sénégal')+'</select></div></div>'+
      '<div class="field"><label>'+T('Statut','Status')+'</label><select id="f_st">'+opts(ST,e.st||'Inscrit')+'</select></div>'+
      '<div class="field"><label>'+T('Présentation (français)','Presentation (French)')+'</label><textarea id="f_descfr" rows="3" placeholder="'+T('Bio affichée sur la fiche…','Bio shown on the profile…')+'">'+esc(e.desc&&(e.desc.fr||(typeof e.desc==="string"?e.desc:""))||'')+'</textarea></div>'+
      '<div class="field"><label>'+T('Présentation (anglais)','Presentation (English)')+'</label><textarea id="f_descen" rows="3" placeholder="English bio…">'+esc(e.desc&&e.desc.en||'')+'</textarea></div>'+
      '<div class="swrow"><span class="l">'+T('Profil publié (visible dans l’annuaire)','Profile published (visible in the directory)')+'</span><label class="sw"><input type="checkbox" id="f_pub"'+((e.pub||'published')==='published'?' checked':'')+'><span class="tr"></span></label></div>';
  }
  function openEnt(id){
    var e=id?CFCol.get('entrepreneurs',id):null;
    $('drTitle').textContent=e?T('Éditer un entrepreneur','Edit entrepreneur'):T('Ajouter un entrepreneur','Add entrepreneur');
    $('drawerBody').innerHTML=entForm(e);
    $('drawerSave').onclick=function(){
      var n=$('f_n').value.trim(); if(!n){ $('f_n').focus(); return; }
      var s=$('f_s').value.trim();
      var obj={ id:(e&&e.id)||slug(n), pub:$('f_pub').checked?'published':'draft',
        n:n, s:s, sec:$('f_sec').value, pays:$('f_pays').value, st:$('f_st').value,
        av:(e&&e.av)||initials(s||n),
        desc:{fr:$('f_descfr').value.trim()} };
      var den=$('f_descen').value.trim(); if(den) obj.desc.en=den;
      CFCol.upsert('entrepreneurs',obj);
      try{ CFAudit.log({action:e?'directory.edit':'directory.create', target:{kind:'entrepreneurs',id:obj.id,label:n}, after:{pub:obj.pub}}); }catch(_){}
      closeDrawer(); drawEnt(); toast(e?T('Entrepreneur mis à jour','Entrepreneur updated'):T('Entrepreneur ajouté à l’annuaire','Entrepreneur added to the directory'));
    };
    openDrawer();
  }

  /* ============ MENTORS ============ */
  function drawMen(){
    var q=($('menSearch')&&$('menSearch').value||'').trim().toLowerCase();
    var rows=CFCol.all('mentors').filter(function(m){ return !q||((m.n+' '+m.org).toLowerCase().indexOf(q)>=0); });
    var tb=$('menRows'); tb.innerHTML='';
    if(!rows.length){ tb.innerHTML='<tr><td colspan="6"><div class="empty"><i class="ti ti-user-search"></i>'+T('Aucun mentor.','No mentors.')+'</div></td></tr>'; $('menCount').textContent='0'; return; }
    $('menCount').textContent=rows.length;
    rows.forEach(function(m){
      var dom=(m.cat||[]).map(function(c){ return (CAT[c]||c).split(' ')[0]; }).join(', ');
      var tr=document.createElement('tr');
      tr.innerHTML='<td><div class="pn">'+esc(m.n)+'</div><div class="loc">'+esc((m.exp||[]).join(' · '))+'</div></td>'+
        '<td>'+esc(m.org||'')+'</td>'+
        '<td>'+esc(m.pays||'')+'</td>'+
        '<td>'+esc(dom)+'</td>'+
        '<td>'+(m.dispo?'<span class="bdg bdg-live"><span class="d" style="width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block;"></span>'+T('Disponible','Available')+'</span>':'<span class="bdg bdg-pend">'+T('Indisponible','Unavailable')+'</span>')+' '+pubBadge(m.pub)+'</td>'+
        '<td><div class="rowact"><button class="iact" data-edit-men="'+esc(m.id)+'" title="'+T('Éditer','Edit')+'"><i class="ti ti-edit"></i></button>'+
        '<button class="iact del" data-del-men="'+esc(m.id)+'" title="'+T('Supprimer','Delete')+'"><i class="ti ti-trash"></i></button></div></td>';
      tb.appendChild(tr);
    });
    [].slice.call(tb.querySelectorAll('[data-edit-men]')).forEach(function(b){ b.onclick=function(){ openMen(b.getAttribute('data-edit-men')); }; });
    [].slice.call(tb.querySelectorAll('[data-del-men]')).forEach(function(b){ b.onclick=function(){ delRecord('mentors',b.getAttribute('data-del-men')); }; });
  }
  function menForm(m){
    m=m||{};
    var cats=Object.keys(CAT).map(function(c){ var on=(m.cat||[]).indexOf(c)>=0; return '<button type="button" class="chip-ck'+(on?' on':'')+'" data-cat="'+c+'"><i class="ti ti-check"></i>'+esc(CAT[c])+'</button>'; }).join('');
    var tags=(m.exp||[]).map(function(x){ return '<span class="tag">'+esc(x)+'<i class="ti ti-x"></i></span>'; }).join('');
    return '<div class="field"><label>'+T('Nom complet','Full name')+'</label><input id="m_n" value="'+esc(m.n||'')+'" placeholder="Dr Kwame Asante"></div>'+
      '<div class="field"><label>'+T('Organisation','Organisation')+'</label><input id="m_org" value="'+esc(m.org||'')+'" placeholder="Green Economy Institute, Accra"></div>'+
      '<div class="field"><label>'+T('Pays','Country')+'</label><select id="m_pays">'+opts(PAYS,m.pays||'Sénégal')+'</select></div>'+
      '<div class="field"><label>'+T('Domaines de mentorat','Mentoring areas')+'</label><div class="chips" id="m_cats">'+cats+'</div></div>'+
      '<div class="field"><label>'+T('Expertises (Entrée pour ajouter)','Expertise (Enter to add)')+'</label><div class="tagwrap" id="m_expwrap">'+tags+'<input class="taginput" id="m_expinput" placeholder="'+T('Ajouter…','Add…')+'"></div></div>'+
      '<div class="swrow"><span class="l">'+T('Disponible pour du mentorat','Available for mentoring')+'</span><label class="sw"><input type="checkbox" id="m_dispo"'+(m.dispo?' checked':'')+'><span class="tr"></span></label></div>'+
      '<div class="swrow"><span class="l">'+T('Profil publié','Profile published')+'</span><label class="sw"><input type="checkbox" id="m_pub"'+((m.pub||'published')==='published'?' checked':'')+'><span class="tr"></span></label></div>';
  }
  function openMen(id){
    var m=id?CFCol.get('mentors',id):null;
    $('drTitle').textContent=m?T('Éditer un mentor','Edit mentor'):T('Ajouter un mentor','Add mentor');
    $('drawerBody').innerHTML=menForm(m);
    // category chips
    [].slice.call($('m_cats').querySelectorAll('.chip-ck')).forEach(function(b){ b.onclick=function(){ b.classList.toggle('on'); }; });
    // expertise tags
    function bindTags(){ [].slice.call($('m_expwrap').querySelectorAll('.tag i')).forEach(function(x){ x.onclick=function(){ x.parentNode.remove(); }; }); }
    bindTags();
    $('m_expinput').addEventListener('keydown',function(ev){ if(ev.key==='Enter'||ev.key===','){ ev.preventDefault(); var v=this.value.trim(); if(v){ var s=document.createElement('span'); s.className='tag'; s.appendChild(document.createTextNode(v)); var i=document.createElement('i'); i.className='ti ti-x'; s.appendChild(i); $('m_expwrap').insertBefore(s,this); this.value=''; bindTags(); } } });
    $('drawerSave').onclick=function(){
      var n=$('m_n').value.trim(); if(!n){ $('m_n').focus(); return; }
      var cat=[].slice.call($('m_cats').querySelectorAll('.chip-ck.on')).map(function(b){ return b.getAttribute('data-cat'); });
      if(!cat.length) cat=['finance'];
      var exp=[].slice.call($('m_expwrap').querySelectorAll('.tag')).map(function(t){ return t.firstChild.nodeValue.trim(); }).filter(Boolean);
      var obj={ id:(m&&m.id)||slug(n), pub:$('m_pub').checked?'published':'draft',
        n:n, org:$('m_org').value.trim(), pays:$('m_pays').value, av:(m&&m.av)||initials(n),
        dispo:$('m_dispo').checked, cat:cat, exp:exp };
      CFCol.upsert('mentors',obj);
      try{ CFAudit.log({action:m?'directory.edit':'directory.create', target:{kind:'mentors',id:obj.id,label:n}, after:{pub:obj.pub}}); }catch(_){}
      closeDrawer(); drawMen(); toast(m?T('Mentor mis à jour','Mentor updated'):T('Mentor ajouté à l’annuaire','Mentor added to the directory'));
    };
    openDrawer();
  }

  /* ============ shared : delete, drawer, tabs, toast ============ */
  function delRecord(coll,id){
    var rec=CFCol.get(coll,id); if(!rec) return;
    if(!confirm(T('Supprimer définitivement « ','Permanently delete “')+rec.n+T(' » de l’annuaire ?','” from the directory?'))) return;
    CFCol.remove(coll,id);
    try{ CFAudit.log({action:'directory.delete', target:{kind:coll,id:id,label:rec.n}}); }catch(_){}
    coll==='entrepreneurs'?drawEnt():drawMen(); toast(T('Profil supprimé','Profile deleted'));
  }
  function openDrawer(){ var d=$('drawer'); d.classList.add('open'); requestAnimationFrame(function(){ d.classList.add('show'); }); }
  function closeDrawer(){ var d=$('drawer'); d.classList.remove('show'); setTimeout(function(){ d.classList.remove('open'); },280); }
  [].slice.call(document.querySelectorAll('#drawer [data-close]')).forEach(function(b){ b.onclick=closeDrawer; });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDrawer(); });

  // tabs
  function setTab(t){
    [].slice.call(document.querySelectorAll('.an-tab')).forEach(function(b){ b.classList.toggle('on',b.getAttribute('data-tab')===t); });
    $('panel-entrepreneurs').style.display=(t==='entrepreneurs')?'':'none';
    $('panel-mentors').style.display=(t==='mentors')?'':'none';
  }
  [].slice.call(document.querySelectorAll('.an-tab')).forEach(function(b){ b.onclick=function(){ setTab(b.getAttribute('data-tab')); }; });

  $('addEntBtn').onclick=function(){ openEnt(null); };
  $('addMenBtn').onclick=function(){ openMen(null); };
  if($('entSearch')) $('entSearch').addEventListener('input',drawEnt);
  if($('menSearch')) $('menSearch').addEventListener('input',drawMen);

  var toastEl=$('toast'),tt; function toast(m){ if(!toastEl)return; $('toastMsg').textContent=m; toastEl.classList.add('show'); clearTimeout(tt); tt=setTimeout(function(){ toastEl.classList.remove('show'); },2600); }

  setTab('entrepreneurs'); drawEnt(); drawMen();
})();
