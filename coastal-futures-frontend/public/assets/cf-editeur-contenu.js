/* Coastal Futures — article editor controller (audit #19 / #20).
   Replaces the dead toolbar + the lossy save. The toolbar now drives the
   contenteditable (execCommand + pullquote/keyfacts/figure inserts that emit the
   EXACT article.html markup). Every field is editable, loaded, and saved; save is
   NON-DESTRUCTIVE (merge upsert) and protects the original author. Honest save state,
   beforeunload dirty-guard, 30s autosave draft, real preview, CFAudit on save. */
(function(){
  if(!window.CFCol) return;
  function $(x){return document.getElementById(x);}
  var sess=(window.CFAdmin&&CFAdmin.session&&CFAdmin.session())||{name:'Équipe programme',role:''};
  var CAT={impact:{fr:'Impact',en:'Impact'},evenement:{fr:'Événement',en:'Event'},energie:{fr:'Énergie',en:'Energy'},circulaire:{fr:'Économie circulaire',en:'Circular economy'},hub:{fr:'Hub jeunesse',en:'Youth hub'}};
  var PAYS={all:'Régional',senegal:'Sénégal',ghana:'Ghana',guinee:'Guinée-Conakry',liberia:'Liberia',sierraleone:'Sierra Leone'};
  function lang(){return document.documentElement.lang==='en'?'en':'fr';}
  function T(fr,en){return lang()==='en'?en:fr;}

  /* ---- media options : stock photos + CFCol('media') ---- */
  function mediaOptions(){
    var opts=[
      'assets/photos/Hero.jpg','assets/photos/Hero-2.jpg','assets/photos/Mangrove.jpg','assets/photos/Solar.jpg',
      'assets/photos/Recycling.jpg','assets/photos/Agriculture.jpg','assets/photos/Fishing.jpg','assets/photos/Young-Entrepreneur.jpg'
    ].map(function(p){return {src:p,name:p.split('/').pop().replace(/\.(jpg|png|svg|webp)$/,''),alt:''};});
    try{ CFCol.all('media').forEach(function(m){ var s=m.src||m.dataUrl; if(s) opts.push({src:s,name:m.name||(m.src?m.src.split('/').pop():'media'),alt:CFCol.t(m.alt,lang())}); }); }catch(e){}
    return opts;
  }
  function fillSelect(sel,val){ if(!sel)return; sel.innerHTML=''; mediaOptions().forEach(function(o){var op=document.createElement('option');op.value=o.src;op.textContent=o.name;sel.appendChild(op);}); if(val) sel.value=val; }

  /* ---- active rich-text pane ---- */
  var activeRte=$('bFr');
  [].slice.call(document.querySelectorAll('.rte')).forEach(function(r){ r.addEventListener('focus',function(){ activeRte=r; }); });
  function focusRte(){ if(activeRte){ activeRte.focus(); } }

  /* ---- toolbar ---- */
  function exec(cmd,val){ document.execCommand(cmd,false,val||null); }
  function inlineLinks(){ [].slice.call(activeRte.querySelectorAll('a:not(.inline)')).forEach(function(a){a.className='inline';}); }
  function handleCmd(cmd){
    focusRte();
    if(cmd==='bold') exec('bold');
    else if(cmd==='italic') exec('italic');
    else if(cmd==='h2') exec('formatBlock','H2');
    else if(cmd==='ul') exec('insertUnorderedList');
    else if(cmd==='ol') exec('insertOrderedList');
    else if(cmd==='quote') exec('insertHTML','<div class="pullquote"><blockquote>'+T('Citation marquante…','Pull quote…')+'</blockquote><cite>'+T('Source','Source')+'</cite></div><p><br></p>');
    else if(cmd==='keyfacts') exec('insertHTML','<div class="keyfacts"><div class="kf-h"><i class="ti ti-info-circle"></i>'+T('L’essentiel','Key facts')+'</div><div class="kf-grid"><div class="kf-item"><div class="n tnum">00</div><div class="l">'+T('Légende','Label')+'</div></div><div class="kf-item"><div class="n tnum">00</div><div class="l">'+T('Légende','Label')+'</div></div><div class="kf-item"><div class="n tnum">00</div><div class="l">'+T('Légende','Label')+'</div></div></div></div><p><br></p>');
    else if(cmd==='link'){ var u=prompt(T('Adresse du lien (https://…)','Link URL (https://…)'),'https://'); if(u){ exec('createLink',u); inlineLinks(); } }
    else if(cmd==='image'){ openMedia('insert'); }
    markDirty();
  }
  [].slice.call(document.querySelectorAll('.rtb button[data-cmd]')).forEach(function(b){ b.addEventListener('mousedown',function(e){e.preventDefault();}); b.addEventListener('click',function(){ handleCmd(b.getAttribute('data-cmd')); }); });

  /* ---- media picker ---- */
  var mediaTarget=null;
  function openMedia(target){ mediaTarget=target; var g=$('mediaGrid'); g.innerHTML=mediaOptions().map(function(o){return '<button type="button" class="mthumb" data-src="'+o.src+'" data-alt="'+(o.alt||'').replace(/"/g,'&quot;')+'"><img src="'+o.src+'" alt=""><span>'+o.name+'</span></button>';}).join(''); [].slice.call(g.querySelectorAll('.mthumb')).forEach(function(b){ b.addEventListener('click',function(){ chooseMedia(b.getAttribute('data-src'),b.getAttribute('data-alt')); }); }); $('mediaOv').classList.add('show'); }
  function closeMedia(){ $('mediaOv').classList.remove('show'); }
  function chooseMedia(src,alt){
    if(mediaTarget==='cover'){ $('coverSel').value=src; $('coverImg').src=src; }
    else if(mediaTarget==='hero'){ if($('heroSel')) $('heroSel').value=src; if($('heroPrev')) $('heroPrev').src=src; }
    else { focusRte(); exec('insertHTML','<div class="art-figure"><figure><img src="'+src+'" alt=""><figcaption>'+(alt||T('Légende de l’image','Image caption'))+'</figcaption></figure></div><p><br></p>'); }
    closeMedia(); markDirty();
  }
  $('mediaClose').addEventListener('click',closeMedia);
  $('mediaOv').addEventListener('click',function(e){ if(e.target===this) closeMedia(); });
  $('coverPick').addEventListener('click',function(){ openMedia('cover'); });
  if($('heroPick')) $('heroPick').addEventListener('click',function(){ openMedia('hero'); });

  /* ---- tags ---- */
  function tags(){ return [].slice.call($('tagWrap').querySelectorAll('.tag')).map(function(t){return t.firstChild.nodeValue.trim();}).filter(Boolean); }
  function addTag(v){ v=(v||'').trim(); if(!v) return; var s=document.createElement('span'); s.className='tag'; s.appendChild(document.createTextNode(v)); var i=document.createElement('i'); i.className='ti ti-x'; s.appendChild(i); $('tagWrap').insertBefore(s,$('tagInput')); markDirty(); }
  function bindTagRemovers(){ [].slice.call($('tagWrap').querySelectorAll('.tag i')).forEach(function(x){ x.onclick=function(){ x.parentNode.remove(); markDirty(); }; }); }
  $('tagInput').addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===','){ e.preventDefault(); addTag(this.value); this.value=''; bindTagRemovers(); } });

  /* ---- featured toggle ---- */
  var featured=false;
  function setFeatured(v){ featured=!!v; $('featChip').classList.toggle('on',featured); }
  $('featChip').addEventListener('click',function(){ setFeatured(!featured); markDirty(); });

  /* ---- load (edit) or blank (new) ---- */
  var params=new URLSearchParams(location.search); var id=params.get('id'); var isNew=!id; var original=null;
  if($('coverSel')&&!$('coverSel').value) $('coverSel').value='assets/photos/Hero.jpg';
  if($('heroSel')&&!$('heroSel').value) $('heroSel').value='assets/photos/Hero.jpg';
  function readMinAuto(){ var words=(activeRte&&activeRte.textContent||'').trim().split(/\s+/).filter(Boolean).length; return Math.max(1,Math.round(words/200))||4; }

  if(!isNew){
    original=CFCol.get('news',id);
    if(original){ var it=original;
      $('tFr').value=CFCol.t(it.title,'fr'); $('tEn').value=(it.title&&it.title.en)||'';
      $('slug').value=it.id; $('slug').__touched=true;
      if($('exFr')) $('exFr').value=(it.excerpt&&it.excerpt.fr)||''; if($('exEn')) $('exEn').value=(it.excerpt&&it.excerpt.en)||'';
      $('bFr').innerHTML=(it.body&&it.body.fr)||('<p>'+CFCol.t(it.excerpt,'fr')+'</p>');
      $('bEn').innerHTML=(it.body&&it.body.en)||'<p></p>';
      if(it.catCode&&CAT[it.catCode]) $('catSel').value=it.catCode;
      if(it.paysCode) $('countrySel').value=it.paysCode;
      if(it.date) $('dateF').value=it.date;
      if(it.img){$('coverImg').src=it.img; $('coverSel').value=it.img;}
      if(it.heroImg&&$('heroSel')){$('heroSel').value=it.heroImg; if($('heroPrev'))$('heroPrev').src=it.heroImg;}
      if($('roleInp')) $('roleInp').value=(it.role&&(it.role.fr||it.role))||'';
      if($('readMinInp')) $('readMinInp').value=it.readMin||readMinAuto();
      if($('heroCapInp')) $('heroCapInp').value=(it.heroCaption&&(it.heroCaption.fr||it.heroCaption))||'';
      if($('schedF')) $('schedF').value=it.scheduledAt||'';
      (it.tags||[]).forEach(function(tg){ addTag(CFCol.t(tg,'fr')); });
      setFeatured(it.featured);
    }
  } else {
    $('tFr').value=''; $('tEn').value=''; $('slug').value=''; $('bFr').innerHTML='<p></p>'; $('bEn').innerHTML='<p></p>';
    if($('dateF')) $('dateF').value=new Date().toISOString().slice(0,10);
    if($('readMinInp')) $('readMinInp').value=4;
  }
  bindTagRemovers();
  $('edTitle').textContent=isNew?T('Nouvel article','New article'):T('Éditer l’article','Edit article');
  $('tFr').addEventListener('input',function(){ if(!$('slug').__touched){ $('slug').value=CFCol.slug($('tFr').value); } });
  $('slug').addEventListener('input',function(){ this.__touched=true; });

  /* author note */
  function refreshAuthorNote(){ var an=$('authorNote'); if(!an) return; var a=(original&&original.author)||sess.name; an.textContent=a+(original&&original.author&&original.author!==sess.name?(' · '+T('modifié par ','edited by ')+sess.name):''); }
  refreshAuthorNote();

  /* ---- save state + dirty guard + autosave ---- */
  var dirty=false, lastSavedAt=null, savedOnce=!isNew, autosaveTimer=null;
  function setState(){
    var ic=$('saveState').querySelector('i'), tx=$('saveTxt');
    if(dirty){ ic.className='ti ti-point-filled'; ic.style.color='var(--warning)'; tx.textContent=T('Modifications non enregistrées','Unsaved changes'); }
    else if(lastSavedAt){ ic.className='ti ti-check'; ic.style.color='var(--success)'; tx.textContent=T('Enregistré à ','Saved at ')+lastSavedAt; }
    else if(savedOnce){ ic.className='ti ti-circle'; ic.style.color='var(--ink-faint)'; tx.textContent=T('Enregistré','Saved'); }
    else { ic.className='ti ti-circle'; ic.style.color='var(--ink-faint)'; tx.textContent=T('Jamais enregistré','Never saved'); }
  }
  function markDirty(){ dirty=true; setState(); }
  function markClean(){ dirty=false; lastSavedAt=new Date().toLocaleTimeString(lang()==='en'?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'}); savedOnce=true; setState(); }
  ['tFr','tEn','slug','exFr','exEn','catSel','countrySel','dateF','coverSel','heroSel','roleInp','readMinInp','heroCapInp','schedF'].forEach(function(idn){ var el=$(idn); if(el) el.addEventListener('input',markDirty); if(el) el.addEventListener('change',markDirty); });
  ['bFr','bEn'].forEach(function(idn){ var el=$(idn); if(el) el.addEventListener('input',markDirty); });
  window.addEventListener('beforeunload',function(e){ if(dirty){ e.preventDefault(); e.returnValue=''; return ''; } });
  setState();

  function buildObj(pub){
    var tFr=$('tFr').value.trim();
    var slug=$('slug').value.trim()||CFCol.slug(tFr); var catCode=$('catSel').value, paysCode=$('countrySel').value;
    var obj={ id:id||slug, pub:pub,
      date:$('dateF').value||new Date().toISOString().slice(0,10),
      cat:CAT[catCode]||{fr:'Actualité',en:'News'}, catCode:catCode,
      country:PAYS[paysCode]||'Régional', paysCode:paysCode,
      img:$('coverSel').value,
      title:{fr:tFr}, body:{fr:(window.CFSan?CFSan.html($('bFr').innerHTML):$('bFr').innerHTML)}, excerpt:{fr:($('exFr').value.trim()||firstPara($('bFr').innerHTML))},
      tags:tags(),
      readMin:parseInt($('readMinInp').value,10)||readMinAuto(),
      featured:featured
    };
    var tEn=$('tEn').value.trim(); if(tEn) obj.title.en=tEn;
    var enBody=$('bEn').innerHTML; if(enBody && enBody.replace(/<[^>]*>/g,'').trim()){ obj.body.en=(window.CFSan?CFSan.html(enBody):enBody); }
    if($('exEn').value.trim()) obj.excerpt.en=$('exEn').value.trim();
    if($('heroSel')&&$('heroSel').value) obj.heroImg=$('heroSel').value;
    var rl=$('roleInp').value.trim(); if(rl) obj.role={fr:rl,en:(original&&original.role&&original.role.en)||rl};
    var hc=$('heroCapInp').value.trim(); if(hc) obj.heroCaption={fr:hc,en:(original&&original.heroCaption&&original.heroCaption.en)||hc};
    var sc=$('schedF').value; if(sc){ obj.scheduledAt=sc; if(pub==='published'&&new Date(sc)>new Date()){ obj.pub='scheduled'; } }
    // author : set only on creation; never overwritten on edit
    if(isNew && !original){ obj.author=sess.name; }
    return obj;
  }
  function firstPara(html){var d=document.createElement('div');d.innerHTML=html||'';var p=d.querySelector('p');var t=(p?p.textContent:d.textContent)||'';return t.trim().replace(/\s+/g,' ').slice(0,180);}

  function save(pub,silent){
    var tFr=$('tFr').value.trim(); if(!tFr){ if(!silent){ alert(T('Le titre en français est requis.','The French title is required.')); $('tFr').focus(); } return false; }
    var obj=buildObj(pub);
    var saved=CFCol.upsert('news',obj); // merge : preserves any field this editor doesn't touch
    try{ CFAudit.log({action:isNew?'content.create':'content.edit', target:{kind:'news',id:obj.id,label:tFr}, after:{pub:obj.pub}}); }catch(e){}
    if(isNew){ isNew=false; id=obj.id; original=saved; var p=new URLSearchParams(location.search); p.set('id',id); history.replaceState(null,'','?'+p.toString()); refreshAuthorNote(); }
    markClean();
    return true;
  }
  $('pubBtn').addEventListener('click',function(){ if(save('published')) location.href='admin-contenus.html'; });
  $('draftBtn').addEventListener('click',function(){ save('draft'); });
  $('previewBtn').addEventListener('click',function(){ save('draft',true); var s=$('slug').value.trim()||id; window.open('article.html?id='+encodeURIComponent(s)+'&preview=1','_blank'); });
  // autosave draft every 30s when dirty
  setInterval(function(){ if(dirty && $('tFr').value.trim()){ save($('draftBtn')?($('pubBtn')&&false?'published':'draft'):'draft',true); } },30000);

  // re-render save-state label on language change
  try{ new MutationObserver(setState).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
})();
