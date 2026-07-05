/* Coastal Futures — page editor controller (audit v11, FIX-03).
   Mirrors the article editor (cf-editeur-contenu.js) : every block of a page is
   editable in BOTH languages, blocks reorder / add / remove, save is a MERGE
   upsert (never wipes untouched fields), each save logs to CFAudit and snapshots
   the previous blocks into the page history so an edit can be rolled back.
   Loaded with ?id=<pageId>. The shared "transparency banner" is the first page
   wired this way : edited once here, in sync on every annuaire. */
(function(){
  if(!window.CFCol){ return; }
  function $(x){ return document.getElementById(x); }
  function lang(){ return document.documentElement.lang==='en'?'en':'fr'; }
  function T(fr,en){ return lang()==='en'?en:fr; }
  function el(tag,cls,html){ var n=document.createElement(tag); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n; }
  var sess=(window.CFAdmin&&CFAdmin.session&&CFAdmin.session())||{name:'Équipe programme',role:''};

  /* ---- field metadata : labels + which bases are rich (body) ---- */
  var LBL={ body:{fr:'Texte du bloc',en:'Block text'}, title:{fr:'Titre',en:'Title'},
    linkLabel:{fr:'Libellé du lien',en:'Link label'}, linkHref:{fr:'Page de destination',en:'Destination page'},
    icon:{fr:'Icône (Tabler)',en:'Icon (Tabler)'}, intro:{fr:'Introduction',en:'Intro'} };
  function lblOf(base){ return (LBL[base]&&LBL[base][lang()])||base; }
  function isBody(base){ return /^(body|intro|desc|content|text)/i.test(base); }
  var TYPE_LABEL={ banner:{fr:'Bandeau',en:'Banner'}, section:{fr:'Section',en:'Section'},
    cta:{fr:'Appel à action',en:'Call to action'}, legal:{fr:'Texte légal',en:'Legal text'},
    stats:{fr:'Chiffres',en:'Stats'}, hero:{fr:'En-tête',en:'Hero'}, faq:{fr:'FAQ',en:'FAQ'} };
  var TEMPLATES={
    banner:{icon:'ti-info-circle',bodyFr:'',bodyEn:'',linkLabelFr:'',linkLabelEn:'',linkHref:''},
    section:{titleFr:'',titleEn:'',bodyFr:'',bodyEn:''},
    cta:{titleFr:'',titleEn:'',linkLabelFr:'',linkLabelEn:'',linkHref:''},
    legal:{titleFr:'',titleEn:'',bodyFr:'',bodyEn:''}
  };

  /* ---- load page ---- */
  var params=new URLSearchParams(location.search); var pid=params.get('id')||'shared';
  var page=CFCol.get('pages',pid);
  if(!page){ $('blocks').innerHTML='<div class="empty"><i class="ti ti-file-off"></i>'+T('Page introuvable.','Page not found.')+'</div>'; return; }
  // working copy of blocks (deep clone so cancel/unsaved never mutates the store)
  var blocks=JSON.parse(JSON.stringify(page.blocks||[]));

  $('edTitle').textContent=T('Éditer : ','Edit: ')+CFCol.t(page.title,lang());
  $('crumb').textContent=(page.kind==='shared'?T('Contenus partagés','Shared content'):T('Pages du site','Site pages'))+' · '+CFCol.t(page.title,lang());
  if($('pageNote')) $('pageNote').textContent=page.note?CFCol.t(page.note,lang()):(page.path?('coastalfutures.org/'+page.path):'');

  /* ---- save state ---- */
  var dirty=false,lastSavedAt=null;
  function setState(){ var ic=$('saveState').querySelector('i'),tx=$('saveTxt');
    if(dirty){ ic.className='ti ti-point-filled'; ic.style.color='var(--warning)'; tx.textContent=T('Modifications non enregistrées','Unsaved changes'); }
    else if(lastSavedAt){ ic.className='ti ti-check'; ic.style.color='var(--success)'; tx.textContent=T('Enregistré à ','Saved at ')+lastSavedAt; }
    else { ic.className='ti ti-circle'; ic.style.color='var(--ink-faint)'; tx.textContent=T('Aucune modification','No changes yet'); } }
  function markDirty(){ dirty=true; setState(); }
  window.addEventListener('beforeunload',function(e){ if(dirty){ e.preventDefault(); e.returnValue=''; } });

  /* ---- render block list ---- */
  function fieldGroups(fields){
    var keys=Object.keys(fields),done={},groups=[];
    keys.forEach(function(k){ if(done[k]) return; var m=k.match(/^(.*)(Fr|En)$/);
      if(m){ groups.push({base:m[1],bilingual:true}); done[m[1]+'Fr']=1; done[m[1]+'En']=1; }
      else { groups.push({base:k,bilingual:false}); done[k]=1; } });
    return groups;
  }
  function makeControl(base,langCode,val){
    var c;
    if(isBody(base)){ c=el('textarea','pe-ta'); c.rows=3; c.value=val||''; }
    else { c=el('input','pe-in'); c.type='text'; c.value=val||''; }
    c.setAttribute('data-fk', base+(langCode?(langCode==='en'?'En':'Fr'):''));
    c.addEventListener('input',markDirty);
    return c;
  }
  /* the public pages an admin can link to (chosen, not typed) */
  function publicPages(){ try{ return CFCol.all('pages').filter(function(p){ return p.kind==='page'&&p.path; }); }catch(e){ return []; } }
  function makePageSelect(val){
    var sel=document.createElement('select'); sel.className='pe-in'; sel.setAttribute('data-fk','linkHref');
    var o0=document.createElement('option'); o0.value=''; o0.textContent=T('Aucun lien','No link'); sel.appendChild(o0);
    var found=false;
    publicPages().forEach(function(p){ var o=document.createElement('option'); o.value=p.path; o.textContent=CFCol.t(p.title,lang()); if(val&&p.path===val){ o.selected=true; found=true; } sel.appendChild(o); });
    if(val && !found){ var oc=document.createElement('option'); oc.value=val; oc.textContent=val; oc.selected=true; sel.appendChild(oc); }
    sel.addEventListener('change',markDirty);
    return sel;
  }
  function renderBlock(b,i){
    var card=el('div','pe-card'); card.setAttribute('data-bid',b.bid);
    var tl=TYPE_LABEL[b.type]?TYPE_LABEL[b.type][lang()]:b.type;
    var head=el('div','pe-head');
    head.innerHTML='<div class="pe-htitle"><span class="pe-badge">'+tl+'</span><b>'+(CFCol.t(b.label,lang())||b.bid)+'</b></div>';
    var used=b.used?el('div','pe-used',(T('Affiché sur : ','Shown on: '))+CFCol.t(b.used,lang())):null;
    var act=el('div','pe-acts');
    var up=el('button','pe-ib','<i class="ti ti-arrow-up"></i>'); up.title=T('Monter','Move up'); up.disabled=(i===0);
    var dn=el('button','pe-ib','<i class="ti ti-arrow-down"></i>'); dn.title=T('Descendre','Move down'); dn.disabled=(i===blocks.length-1);
    var rm=el('button','pe-ib del','<i class="ti ti-trash"></i>'); rm.title=T('Supprimer','Remove');
    up.onclick=function(){ blocks.splice(i-1,0,blocks.splice(i,1)[0]); markDirty(); draw(); };
    dn.onclick=function(){ blocks.splice(i+1,0,blocks.splice(i,1)[0]); markDirty(); draw(); };
    rm.onclick=function(){ if(confirm(T('Supprimer ce bloc ?','Remove this block?'))){ blocks.splice(i,1); markDirty(); draw(); } };
    act.appendChild(up); act.appendChild(dn); act.appendChild(rm);
    head.appendChild(act); card.appendChild(head); if(used) card.appendChild(used);
    var body=el('div','pe-body');
    fieldGroups(b.fields).forEach(function(g){
      var wrap=el('div','pe-field');
      wrap.appendChild(el('label',null,lblOf(g.base)));
      if(g.bilingual){
        var row=el('div','pe-bi');
        ['fr','en'].forEach(function(lc){
          var col=el('div','pe-col');
          col.appendChild(el('span','pe-lang'+(lc==='en'?' en':''),lc.toUpperCase()));
          col.appendChild(makeControl(g.base,lc,b.fields[g.base+(lc==='en'?'En':'Fr')]));
          row.appendChild(col);
        });
        wrap.appendChild(row);
      } else if(g.base==='linkHref'){
        wrap.appendChild(makePageSelect(b.fields.linkHref));
        wrap.appendChild(el('div','pe-hint',T('La page de destination, choisie parmi les pages publiques du site.','The destination page, chosen from the site public pages.')));
      } else {
        wrap.appendChild(makeControl(g.base,'',b.fields[g.base]));
        if(g.base==='icon') wrap.appendChild(el('div','pe-hint',T('Nom d’une icône Tabler outline, ex. ti-info-circle.','A Tabler outline icon name, e.g. ti-info-circle.')));
      }
      body.appendChild(wrap);
    });
    card.appendChild(body);
    return card;
  }
  function harvest(){ // read DOM controls back into the working blocks
    [].slice.call(document.querySelectorAll('.pe-card')).forEach(function(card){
      var bid=card.getAttribute('data-bid'); var b=null; for(var i=0;i<blocks.length;i++){ if(blocks[i].bid===bid){ b=blocks[i]; break; } }
      if(!b) return;
      [].slice.call(card.querySelectorAll('[data-fk]')).forEach(function(c){ b.fields[c.getAttribute('data-fk')]=c.value; });
    });
  }
  function draw(){
    if(arguments[0]!==true) harvest();           // keep edits across reorders unless first paint
    var host=$('blocks'); host.innerHTML='';
    if(!blocks.length){ host.appendChild(el('div','empty','<i class="ti ti-stack-2"></i>'+T('Aucun bloc. Ajoutez-en un ci-dessous.','No blocks yet. Add one below.'))); }
    blocks.forEach(function(b,i){ host.appendChild(renderBlock(b,i)); });
  }
  draw(true);

  /* ---- add block ---- */
  var addMenu=$('addMenu');
  Object.keys(TEMPLATES).forEach(function(type){
    var b=el('button','pe-addopt','<i class="ti ti-plus"></i>'+TYPE_LABEL[type][lang()]);
    b.onclick=function(){ harvest(); blocks.push({bid:type+'-'+Date.now().toString(36), type:type,
      label:{fr:TYPE_LABEL[type].fr,en:TYPE_LABEL[type].en}, fields:JSON.parse(JSON.stringify(TEMPLATES[type]))});
      markDirty(); draw(true); addMenu.classList.remove('open'); };
    addMenu.appendChild(b);
  });
  $('addBtn').onclick=function(){ addMenu.classList.toggle('open'); };
  document.addEventListener('click',function(e){ if(!e.target.closest('.pe-add')) addMenu.classList.remove('open'); });

  /* ---- history panel ---- */
  function drawHistory(){
    var host=$('histList'); if(!host) return; var h=(page.history||[]);
    if(!h.length){ host.innerHTML='<div class="pe-hist-empty">'+T('Aucune version antérieure.','No earlier version.')+'</div>'; return; }
    host.innerHTML='';
    h.slice().reverse().forEach(function(v,ri){
      var idx=h.length-1-ri;
      var row=el('div','pe-hist');
      var d=new Date(v.at); var ds=isNaN(d)?v.at:d.toLocaleString(lang()==='en'?'en-GB':'fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      row.innerHTML='<div><div class="pe-hist-d">'+ds+'</div><div class="pe-hist-by">'+(v.by||'—')+'</div></div>';
      var rb=el('button','pe-restore','<i class="ti ti-history"></i>'+T('Restaurer','Restore'));
      rb.onclick=function(){ if(confirm(T('Restaurer cette version ? Les modifications non enregistrées seront perdues.','Restore this version? Unsaved changes will be lost.'))){ blocks=JSON.parse(JSON.stringify(v.blocks||[])); markDirty(); draw(true); } };
      row.appendChild(rb); host.appendChild(row);
    });
  }
  drawHistory();

  /* ---- sanitise + save ---- */
  function cleanBlocks(bl){
    return bl.map(function(b){ var nb=JSON.parse(JSON.stringify(b)); var f=nb.fields||{};
      Object.keys(f).forEach(function(k){ var base=k.replace(/(Fr|En)$/,'');
        if(isBody(base)){ f[k]=window.CFSan?CFSan.html(f[k]):f[k]; }
        else if(k==='linkHref'){ var u=String(f[k]||'').trim(); f[k]=/^\s*(javascript|vbscript|data):/i.test(u)?'':u; }
        else { f[k]=window.CFSan?CFSan.text(f[k]).replace(/&#47;/g,'/'):f[k]; } });
      return nb; });
  }
  function save(){
    harvest();
    var snapshots=(page.history||[]).slice(-9);          // keep last 10 incl. the new one
    snapshots.push({at:new Date().toISOString(), by:sess.name, blocks:page.blocks||[]});
    var clean=cleanBlocks(blocks);
    var obj={ id:page.id, blocks:clean, history:snapshots };   // merge upsert : title/path/kind/managed preserved
    var saved=CFCol.upsert('pages',obj);
    page=saved||Object.assign({},page,obj);
    blocks=JSON.parse(JSON.stringify(page.blocks||[]));
    try{ CFAudit.log({action:'page.edit', target:{kind:'pages',id:page.id,label:CFCol.t(page.title,'fr')}, after:{blocks:clean.length}}); }catch(e){}
    dirty=false; lastSavedAt=new Date().toLocaleTimeString(lang()==='en'?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'}); setState();
    drawHistory(); toast(T('Page publiée. À jour partout où ces blocs sont affichés.','Page published. Up to date everywhere these blocks appear.'));
  }
  $('saveBtn').addEventListener('click',save);

  /* preview : open a page that consumes these blocks */
  $('previewBtn').addEventListener('click',function(){ save(); var t=page.path||'annuaire-entrepreneurs.html'; window.open(t,'_blank'); });

  /* toast */
  var toastEl=$('toast'),tt; function toast(m){ if(!toastEl)return; $('toastMsg').textContent=m; toastEl.classList.add('show'); clearTimeout(tt); tt=setTimeout(function(){ toastEl.classList.remove('show'); },3000); }

  setState();
  try{ new MutationObserver(function(){ setState(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
})();
