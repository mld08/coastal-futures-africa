/* Coastal Futures — content sanitisation (audit v3 §S0.1 / S1).
   Article bodies (and other store fields) are injected via innerHTML. Since the editor
   now writes those fields from human input, they MUST be sanitised or a stored <script>/
   <img onerror> would run on every public visitor (stored XSS). Two helpers:
     CFSan.text(s)  — strict escape for non-HTML values (titles, names, captions, tags…)
     CFSan.html(s)  — allow-list sanitiser for rich article bodies (keeps p, h2, blockquote…
                      strips script, iframe, inline event handlers, javascript URLs, etc.)
   Back-end note (BACKEND.md): replace with DOMPurify + server-side sanitisation. */
(function(){
  var OKTAG={P:1,H2:1,H3:1,H4:1,UL:1,OL:1,LI:1,BLOCKQUOTE:1,CITE:1,STRONG:1,EM:1,B:1,I:1,A:1,
    FIGURE:1,FIGCAPTION:1,IMG:1,BR:1,SPAN:1,DIV:1,HR:1};
  // class allow-list so the editorial blocks (drop-cap, pullquote, keyfacts, figure) survive
  var OKCLASS=/^(drop|pullquote|keyfacts|kf-h|kf-grid|kf-item|n|l|tnum|art-figure|art-gallery|inline)$/;
  var OKATTR={href:1,src:1,alt:1,title:1};
  function badUrl(v){ return /^\s*(javascript|vbscript):/i.test(v||''); }
  function clean(node){
    [].slice.call(node.childNodes).forEach(function(c){
      if(c.nodeType===1){
        if(!OKTAG[c.tagName]){ c.replaceWith(document.createTextNode(c.textContent||'')); return; }
        [].slice.call(c.attributes).forEach(function(a){
          var n=a.name.toLowerCase();
          if(n==='class'){ // keep only allow-listed classes
            var kept=(a.value||'').split(/\s+/).filter(function(k){return OKCLASS.test(k);});
            if(kept.length) c.setAttribute('class',kept.join(' ')); else c.removeAttribute('class');
            return;
          }
          if(!OKATTR[n]){ c.removeAttribute(a.name); return; }
          if((n==='href'||n==='src') && badUrl(a.value)) c.removeAttribute(a.name);
        });
        clean(c);
      } else if(c.nodeType===8){ c.remove(); } // strip comments
    });
  }
  window.CFSan={
    text:function(s){ return (s==null?'':String(s)).replace(/[&<>"'\/]/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c]; }); },
    html:function(s){ var d=document.createElement('div'); d.innerHTML=String(s==null?'':s); clean(d); return d.innerHTML; }
  };
})();
