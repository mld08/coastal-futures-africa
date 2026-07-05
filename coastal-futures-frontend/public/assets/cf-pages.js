/* Coastal Futures — page content hydration (audit v11, FIX-02).
   The companion of cf-collections.js for PAGE content. Any public element marked
     data-block="pageId.blockId"        -> rendered in full from the block's type
     data-block="pageId.blockId.field"  -> that one field injected (text or html)
   is hydrated from CFCol('pages'). Text fields carry {fr,en}; the right language is
   chosen from <html lang> and re-applied on language toggle and on cross-tab edits.
   Everything injected as HTML passes through CFSan so a stored value can never run
   script. If a block is absent (store not yet overridden) the element keeps its
   hard-coded fallback markup, so the site degrades gracefully without the CMS.
   Back-end devs : swap CFCol for an API read; rendering stays identical. */
(function(){
  if(!window.CFCol){ return; }
  function lang(){ return document.documentElement.lang==='en'?'en':'fr'; }
  function esc(s){ return window.CFSan?CFSan.text(s):String(s==null?'':s); }
  function safeHtml(s){ return window.CFSan?CFSan.html(s):String(s==null?'':s); }
  function safeUrl(u){ u=String(u==null?'':u).trim(); return /^\s*(javascript|vbscript|data):/i.test(u)?'#':u; }

  /* pick a {fr,en} value, or a base+Fr / base+En pair, out of a fields object */
  function pick(fields,base){
    if(!fields) return '';
    var L=lang();
    if(fields[base+'En']!=null||fields[base+'Fr']!=null){
      return (L==='en'&&fields[base+'En'])?fields[base+'En']:(fields[base+'Fr']||fields[base+'En']||'');
    }
    var v=fields[base];
    if(v&&typeof v==='object') return (L==='en'&&v.en)?v.en:(v.fr||v.en||'');
    return v==null?'':v;
  }

  /* ---- per-type whole-block renderers (return an HTML string) ---- */
  var RENDER={
    banner:function(f){
      var icon=esc(f.icon||'ti-info-circle');
      var body=safeHtml(pick(f,'body'));
      var label=esc(pick(f,'linkLabel'));
      var href=f.linkHref?safeUrl(f.linkHref):'';
      var link=(label&&href)?(' <a href="'+esc(href)+'">'+label+'</a>'):'';
      return '<i class="ti '+icon+'" aria-hidden="true"></i><p>'+body+link+'</p>';
    },
    section:function(f){
      var t=esc(pick(f,'title')), b=safeHtml(pick(f,'body'));
      return (t?'<h2>'+t+'</h2>':'')+b;
    }
  };

  /* index : pageId.blockId -> {block, page} for fast lookup */
  function index(){
    var map={};
    try{ CFCol.published('pages').forEach(function(p){
      (p.blocks||[]).forEach(function(b){ map[p.id+'.'+b.bid]=b; });
    }); }catch(e){}
    return map;
  }

  function applyOne(el,map){
    var ref=el.getAttribute('data-block'); if(!ref) return;
    var parts=ref.split('.');
    var blk=map[parts[0]+'.'+parts[1]]; if(!blk) return;          // no override -> keep fallback
    var f=blk.fields||{};
    if(parts.length>=3){                                          // field-level injection
      var key=parts.slice(2).join('.');
      var val=pick(f,key.replace(/(Fr|En)$/,''));
      if(/html|body|rich/i.test(key)) el.innerHTML=safeHtml(val); else el.textContent=val;
      return;
    }
    var r=RENDER[blk.type];                                       // whole-block render
    if(r) el.innerHTML=r(f);
  }

  function render(){
    var map=index();
    [].slice.call(document.querySelectorAll('[data-block]')).forEach(function(el){ applyOne(el,map); });
  }

  // initial paint (after DOM ready) + re-paint on language toggle + cross-tab edits
  function boot(){ render(); }
  if(document.readyState!=='loading') boot(); else document.addEventListener('DOMContentLoaded',boot);
  try{ new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
  window.addEventListener('storage',function(e){ if(!e.key||e.key==='cf-col-pages') render(); });

  window.CFPages={ render:render, get:function(id){ try{ return CFCol.get('pages',id); }catch(e){ return null; } } };
})();
