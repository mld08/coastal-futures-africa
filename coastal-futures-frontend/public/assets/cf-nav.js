/* ============================================================
   Coastal Futures — Public navbar behaviour
   Scroll elevation · globe language popover · mobile drawer.
   Language switching reuses the page's existing cf-i18n engine
   by driving the hidden [data-cf-lang] toggle (footer), so all
   data-i18n content re-renders exactly as before.
   ============================================================ */
(function(){
  /* Swallow the benign cross-document view-transition "skipped" rejection
     (fired by @view-transition navigation when a transition is interrupted). */
  window.addEventListener('unhandledrejection',function(e){
    var r=e&&e.reason; var m=((r&&(r.message||r))||'')+'';
    if(m.indexOf('Transition was skipped')>=0){ e.preventDefault(); }
  });
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }
  ready(function(){
    var nav=document.getElementById('cfNav');

    /* ---- scroll elevation ---- */
    if(nav){
      var onScroll=function(){ nav.classList.toggle('scrolled',(window.pageYOffset||document.documentElement.scrollTop||0)>4); };
      onScroll(); window.addEventListener('scroll',onScroll,{passive:true});
    }

    /* ---- current language helpers ---- */
    function curLang(){ return document.documentElement.lang==='en' ? 'en' : 'fr'; }
    function applyLang(target){
      if(curLang()===target) return;
      var tog=document.querySelector('[data-cf-lang]');
      if(tog){ tog.click(); }                       // reuse existing i18n engine (2-language flip)
      else { try{ localStorage.setItem('cf-lang',target); }catch(e){} document.documentElement.lang=target; }
      syncLang();
    }
    var EXTRA={ espace:{fr:'Mon espace',en:'My space'}, partners:{fr:'Partenaires',en:'Partners'}, press:{fr:'Espace presse',en:'Press room'}, sitemap:{fr:'Plan du site',en:'Sitemap'} };
    function syncLang(){
      var l=curLang();
      document.querySelectorAll('.lang-opt').forEach(function(b){ b.classList.toggle('active',b.getAttribute('data-lang')===l); });
      document.querySelectorAll('[data-mob-lang]').forEach(function(b){ b.classList.toggle('active',b.getAttribute('data-mob-lang')===l); });
      document.querySelectorAll('[data-nav-espace]').forEach(function(e){ e.textContent=EXTRA.espace[l]; });
      document.querySelectorAll('[data-nav-espace-p]').forEach(function(e){ var k=e.getAttribute('data-nav-espace-p'); if(EXTRA[k]) e.textContent=EXTRA[k][l]; });
    }
    syncLang();
    try{ new MutationObserver(syncLang).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}

    /* ---- globe language popover ---- */
    var glob=document.getElementById('cfGlob'), pop=document.getElementById('cfLangPop');
    if(glob&&pop){
      var openPop=function(o){ pop.hidden=!o; glob.classList.toggle('on',o); glob.setAttribute('aria-expanded',o?'true':'false'); };
      glob.addEventListener('click',function(e){ e.stopPropagation(); openPop(pop.hidden); });
      pop.querySelectorAll('.lang-opt').forEach(function(b){ b.addEventListener('click',function(){ applyLang(b.getAttribute('data-lang')); openPop(false); }); });
      document.addEventListener('click',function(e){ if(!pop.hidden && !pop.contains(e.target) && e.target!==glob && !glob.contains(e.target)) openPop(false); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !pop.hidden) openPop(false); });
    }

    /* ---- mobile drawer ---- */
    var burger=document.getElementById('cfBurger'), mob=document.getElementById('cfMob'),
        scrim=document.getElementById('cfScrim'), mobX=document.getElementById('cfMobX');
    if(burger&&mob&&scrim){
      var openMob=function(o){
        mob.classList.toggle('open',o); scrim.classList.toggle('show',o);
        burger.setAttribute('aria-expanded',o?'true':'false');
        document.body.style.overflow=o?'hidden':'';
      };
      burger.addEventListener('click',function(){ openMob(!mob.classList.contains('open')); });
      if(mobX) mobX.addEventListener('click',function(){ openMob(false); });
      scrim.addEventListener('click',function(){ openMob(false); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape' && mob.classList.contains('open')) openMob(false); });
      mob.querySelectorAll('.mob-links a').forEach(function(a){ a.addEventListener('click',function(){ openMob(false); }); });
      mob.querySelectorAll('[data-mob-lang]').forEach(function(b){ b.addEventListener('click',function(){ applyLang(b.getAttribute('data-mob-lang')); }); });

      /* ---- §2.3 — "Mon espace"/profil belong in the burger, never on the reduced navbar ----
         The CTA and the signed-in profile pill are hidden from the bar exactly when the burger
         is shown (keyed off the burger's real visibility, so every per-page breakpoint is covered).
         Before hiding, we guarantee the drawer exposes "Mon espace" so this is recomposition,
         not amputation. */
      (function(){
        if(!mob.querySelector('[data-nav-espace]')){
          var src=document.querySelector('.nav-cta[data-nav-espace]')||document.querySelector('[data-nav-espace]');
          var foot=mob.querySelector('.mob-foot')||mob.querySelector('.mob-links');
          if(foot){
            var a=document.createElement('a');
            a.href=(src&&src.getAttribute&&src.getAttribute('href'))||'connexion.html';
            a.className='mob-cta';
            a.innerHTML='<i class="ti ti-user-circle"></i><span data-nav-espace>'+(((src&&src.textContent)||'Mon espace').trim())+'</span>';
            a.addEventListener('click',function(){ openMob(false); });
            foot.appendChild(a);
            syncLang();
          }
        }
        function ctaEls(){ return document.querySelectorAll('.cf-nav .nav-cta, .cf-nav .nav-profile'); }
        function syncCta(){
          var mobile=getComputedStyle(burger).display!=='none';
          ctaEls().forEach(function(el){ el.style.display=mobile?'none':''; });
        }
        syncCta();
        window.addEventListener('resize',syncCta,{passive:true});
      })();
    }
  });
})();
