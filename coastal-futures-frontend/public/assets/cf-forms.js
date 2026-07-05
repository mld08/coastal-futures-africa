/* Coastal Futures — public form capture.
   Newsletter sign-ups -> CFCol('subscribers'); contact messages -> CFCol('contact_messages').
   Runs in the capture phase so it reads field values BEFORE each page's own submit
   handler clears them. Validation mirrors the on-page handlers (no double UI).
   Back-end devs: replace CFCol (localStorage) with a POST to your API. */
(function(){
  function uid(p){ return p+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function page(){ return location.pathname.split('/').pop()||'index.html'; }
  function addSub(email,src){
    if(!window.CFCol||!emailOk(email)) return;
    var list=CFCol.all('subscribers');
    if(list.some(function(s){return (s.email||'').toLowerCase()===email.toLowerCase();})) return; // dedupe
    CFCol.upsert('subscribers',{id:uid('sub'),email:email,date:new Date().toISOString(),source:src||page()});
  }
  function start(){
    // Backend réel (VITE_USE_API=true) : la capture publique passe par les
    // contrôleurs React (newsletter/contact) qui POSTent au backend. On
    // neutralise cette capture localStorage pour éviter un double envoi.
    if(window.CFApi && CFApi.useApi) return;
    if(!window.CFCol) return;
    // Footer newsletter (universal)
    var nf=document.getElementById('cfnForm');
    if(nf) nf.addEventListener('submit',function(){ var e=document.getElementById('cfnEmail'); addSub((e&&e.value||'').trim(),'newsletter · '+page()); },true);
    // Contact-page newsletter
    var nf2=document.getElementById('newsForm');
    if(nf2) nf2.addEventListener('submit',function(){ var e=nf2.querySelector('[name=nemail]'); addSub((e&&e.value||'').trim(),'newsletter · contact'); },true);
    // Contact message
    var cf=document.getElementById('contactForm');
    if(cf) cf.addEventListener('submit',function(){
      function val(n){ var el=cf.querySelector('[name='+n+']'); return el?(el.value||'').trim():''; }
      var email=val('email'), msg=val('message');
      if(!emailOk(email)||!msg) return; // let the page handler flag invalid; only store complete messages
      CFCol.upsert('contact_messages',{id:uid('msg'),name:val('nom'),email:email,org:val('org'),pays:val('pays'),sujet:val('sujet'),message:msg,date:new Date().toISOString(),read:false});
    },true);
  }
  if(document.readyState!=='loading') start(); else document.addEventListener('DOMContentLoaded',start);
})();
