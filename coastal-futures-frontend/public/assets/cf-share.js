/* Coastal Futures — share buttons.
   Wires up share clusters (.share a / .share .s-btn) and any [data-share] /
   "Partager" buttons so they actually open the right network or copy the link.
   No dead buttons. External network links open in a new tab (allowed: http).*/
(function(){
  function url(){ return location.href; }
  function title(){
    var h=document.querySelector('h1');
    return (h?h.textContent.trim():document.title)||document.title;
  }
  function toast(msg){
    var el=document.createElement('div');
    el.setAttribute('role','status');
    el.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(12px);z-index:9999;background:#0C2420;color:#fff;font-family:"DM Sans",system-ui,sans-serif;font-size:14px;padding:12px 18px;border-radius:100px;box-shadow:0 10px 30px rgba(6,61,52,.28);display:inline-flex;align-items:center;gap:9px;opacity:0;transition:opacity .2s ease,transform .2s ease;max-width:calc(100% - 32px);';
    el.innerHTML='<i class="ti ti-circle-check" style="color:#3ECBB0;font-size:18px;"></i><span></span>';
    el.querySelector('span').textContent=msg;
    document.body.appendChild(el);
    requestAnimationFrame(function(){el.style.opacity='1';el.style.transform='translateX(-50%) translateY(0)';});
    setTimeout(function(){el.style.opacity='0';el.style.transform='translateX(-50%) translateY(12px)';setTimeout(function(){el.remove();},220);},2200);
  }
  function open(u){ window.open(u,'_blank','noopener,noreferrer,width=620,height=560'); }
  function copy(){
    var t=url();
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(function(){toast(isEN()?'Link copied':'Lien copié');},function(){fallbackCopy(t);});
    } else { fallbackCopy(t); }
  }
  function fallbackCopy(t){
    try{var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast(isEN()?'Link copied':'Lien copié');}
    catch(e){toast(isEN()?'Copy failed':'Copie impossible');}
  }
  function isEN(){ return document.documentElement.lang==='en'; }
  function net(kind){
    var u=encodeURIComponent(url()), t=encodeURIComponent(title());
    if(kind==='linkedin') open('https://www.linkedin.com/sharing/share-offsite/?url='+u);
    else if(kind==='x') open('https://twitter.com/intent/tweet?url='+u+'&text='+t);
    else if(kind==='facebook') open('https://www.facebook.com/sharer/sharer.php?u='+u);
  }
  function kindOf(node){
    var i=node.querySelector('i');
    var cls=(i?i.className:'')+' '+(node.getAttribute('aria-label')||'')+' '+(node.getAttribute('title')||'')+' '+(node.getAttribute('data-share')||'');
    cls=cls.toLowerCase();
    if(cls.indexOf('linkedin')>=0) return 'linkedin';
    if(cls.indexOf('brand-x')>=0||/\bx\b/.test(node.getAttribute('aria-label')||'')||cls.indexOf('twitter')>=0||cls.indexOf(' x ')>=0||/sur x/.test(cls)) return 'x';
    if(cls.indexOf('facebook')>=0) return 'facebook';
    if(cls.indexOf('ti-link')>=0||cls.indexOf('copier')>=0||cls.indexOf('copy')>=0) return 'copy';
    if(cls.indexOf('ti-share')>=0||cls.indexOf('partager')>=0||cls.indexOf('share')>=0) return 'native';
    return null;
  }
  function nativeShare(){
    if(navigator.share){ navigator.share({title:title(),url:url()}).catch(function(){}); }
    else { copy(); }
  }
  function wire(node){
    if(node.__cfShare) return; node.__cfShare=true;
    var k=kindOf(node);
    if(!k) return;
    node.style.cursor='pointer';
    function go(e){ e.preventDefault();
      if(k==='copy') copy();
      else if(k==='native') nativeShare();
      else net(k);
    }
    node.addEventListener('click',go);
    node.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ go(e); } });
  }
  function init(){
    var nodes=[].slice.call(document.querySelectorAll('.share a, .share .s-btn, [data-share]'));
    // publication-style "Partager" buttons
    [].slice.call(document.querySelectorAll('.sub .btn, .btn')).forEach(function(b){
      var i=b.querySelector('i.ti-share');
      if(i && /partager|share/i.test(b.textContent)) nodes.push(b);
    });
    nodes.forEach(wire);
  }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded',init);
})();
