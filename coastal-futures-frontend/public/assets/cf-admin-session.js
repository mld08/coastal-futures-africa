/* Coastal Futures — admin session lifecycle (audit v3 §S2 : expiry, multi-tab, a11y).
   Loaded on every guarded admin-* page AFTER cf-admin-auth.js (which owns identity +
   the role->page guard + logout). This module adds three things a sovereign-facing
   console is expected to have :

   1) IDLE EXPIRY      — after IDLE_MS of no interaction the session ends and the tab
                         returns to the admin login. A two-minute warning dialog lets
                         the operator stay signed in.
   2) ABSOLUTE EXPIRY  — regardless of activity, a session older than ABSOLUTE_MS
                         (from cf-admin-since) ends. Caps the blast radius of a stolen
                         laptop / shared machine.
   3) MULTI-TAB SYNC   — signing out (or expiring) in ANY tab signs out the others
                         within a frame, via the storage event. A role switch in one
                         tab reloads the others so chrome + permissions stay truthful.

   Shared activity clock : cf-admin-activity (ms) is written (throttled) on real input
   and is readable by every tab, so working in one tab keeps all tabs alive.

   Back-end devs : replace this with a real signed session + sliding-expiry cookie and
   a server push (or short-poll) for cross-device revocation. The thresholds below are
   the product spec; mirror them server-side (the client clock is advisory only). */
(function(){
  if(!/^admin-/.test((location.pathname.split('/').pop()||''))) return;
  if(!window.CFAdmin || !CFAdmin.session) return;
  var sess = CFAdmin.session();
  if(!sess) return; // an invalid session was already redirected by the guard

  var IDLE_MS     = 20*60*1000;   // sign out after 20 min idle
  var WARN_MS     =  2*60*1000;   // warn 2 min before idle expiry
  var ABSOLUTE_MS =  8*60*60*1000;// hard cap : 8 h since login
  var TICK_MS     = 10*1000;      // evaluate every 10 s
  var WRITE_MS    =  8*1000;      // throttle activity writes to shared clock

  var K_ACT='cf-admin-activity', K_SINCE='cf-admin-since', K_AUTH='cf-admin-auth',
      K_ROLE='cf-admin-role', K_REASON='cf-admin-end';

  function now(){ return Date.now(); }
  function getNum(k){ try{ var v=parseInt(localStorage.getItem(k)||'',10); return isNaN(v)?0:v; }catch(e){ return 0; } }
  function setAct(t){ try{ localStorage.setItem(K_ACT,String(t)); }catch(e){} }
  function lang(){ return document.documentElement.lang==='en'?'en':'fr'; }
  function T(fr,en){ return lang()==='en'?en:fr; }

  // seed clocks
  if(!getNum(K_SINCE)){ try{ localStorage.setItem(K_SINCE,String(now())); }catch(e){} }
  var lastWrite=0; setAct(now());

  /* ---------- accessible warning dialog ---------- */
  var dlg=null, titleEl=null, bodyEl=null, countEl=null, stayBtn=null, outBtn=null, lastFocus=null, countTimer=null;
  function css(){
    if(document.getElementById('cf-ses-css')) return;
    var s=document.createElement('style'); s.id='cf-ses-css';
    s.textContent=
    '.cf-ses-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(6,61,52,.46);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:20px;}'+
    '.cf-ses-ov.show{display:flex;}'+
    '.cf-ses{width:min(440px,100%);background:#fff;border:1px solid var(--hair,#DCE9E6);border-radius:20px;box-shadow:0 24px 60px rgba(6,61,52,.28);padding:26px 26px 22px;font-family:var(--font-sans,system-ui);}'+
    '.cf-ses-ic{width:46px;height:46px;border-radius:13px;background:var(--teal-bg,#EAF6F3);color:var(--teal,#0A6B5E);display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:15px;}'+
    '.cf-ses h2{font-family:var(--font-display,system-ui);font-weight:300;letter-spacing:-.02em;font-size:22px;line-height:1.18;color:var(--ink,#0C2420);margin:0 0 8px;}'+
    '.cf-ses p{font-size:14px;line-height:1.55;color:var(--ink-mute,#5C7B76);margin:0 0 6px;}'+
    '.cf-ses .cd{font-family:var(--font-display,system-ui);font-weight:600;color:var(--ink,#0C2420);font-feature-settings:"tnum";}'+
    '.cf-ses-row{display:flex;gap:10px;margin-top:20px;}'+
    '.cf-ses-row button{flex:1;min-height:44px;border-radius:100px;font-family:var(--font-display,system-ui);font-weight:600;font-size:14px;cursor:pointer;transition:background .16s,border-color .16s,color .16s;}'+
    '.cf-ses-stay{background:var(--teal,#0A6B5E);color:#fff;border:1px solid var(--teal,#0A6B5E);}'+
    '.cf-ses-stay:hover{background:var(--teal-deep,#063D34);}'+
    '.cf-ses-out{background:#fff;color:var(--ink-2,#244440);border:1px solid var(--hair-strong,#B4CDC8);}'+
    '.cf-ses-out:hover{border-color:var(--ink-faint,#92ACA7);}'+
    '@media(prefers-reduced-motion:reduce){.cf-ses-ov{backdrop-filter:none;-webkit-backdrop-filter:none;}}';
    document.head.appendChild(s);
  }
  function build(){
    css();
    var ov=document.createElement('div'); ov.className='cf-ses-ov';
    ov.innerHTML=
      '<div class="cf-ses" role="alertdialog" aria-modal="true" aria-labelledby="cfSesT" aria-describedby="cfSesB">'+
        '<div class="cf-ses-ic"><i class="ti ti-clock-exclamation"></i></div>'+
        '<h2 id="cfSesT"></h2>'+
        '<p id="cfSesB"></p>'+
        '<p aria-live="polite">'+T('Déconnexion automatique dans','Automatic sign-out in')+' <span class="cd" id="cfSesCd"></span>.</p>'+
        '<div class="cf-ses-row">'+
          '<button type="button" class="cf-ses-out" id="cfSesOut"></button>'+
          '<button type="button" class="cf-ses-stay" id="cfSesStay"></button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(ov);
    dlg=ov; titleEl=ov.querySelector('#cfSesT'); bodyEl=ov.querySelector('#cfSesB');
    countEl=ov.querySelector('#cfSesCd'); stayBtn=ov.querySelector('#cfSesStay'); outBtn=ov.querySelector('#cfSesOut');
    stayBtn.addEventListener('click',stay);
    outBtn.addEventListener('click',function(){ endSession('manual'); });
    ov.addEventListener('keydown',function(e){
      if(e.key==='Escape'){ e.preventDefault(); stay(); }
      if(e.key==='Tab'){ // simple focus trap between the two buttons
        var f=[outBtn,stayBtn], i=f.indexOf(document.activeElement);
        e.preventDefault(); f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus();
      }
    });
    retext();
  }
  function retext(){
    if(!dlg) return;
    titleEl.textContent=T('Votre session va expirer','Your session is about to expire');
    bodyEl.textContent=T('Par sécurité, vous serez déconnectée après une période d’inactivité.',
                         'For security, you will be signed out after a period of inactivity.');
    stayBtn.textContent=T('Rester connectée','Stay signed in');
    outBtn.textContent=T('Se déconnecter','Sign out');
  }
  var warned=false;
  function showWarn(){
    if(!dlg) build();
    if(dlg.classList.contains('show')) return;
    retext();
    lastFocus=document.activeElement;
    dlg.classList.add('show'); warned=true;
    stayBtn.focus();
    tickCountdown();
    countTimer=setInterval(tickCountdown,1000);
  }
  function hideWarn(){
    warned=false;
    if(countTimer){ clearInterval(countTimer); countTimer=null; }
    if(dlg && dlg.classList.contains('show')){
      dlg.classList.remove('show');
      try{ if(lastFocus && lastFocus.focus) lastFocus.focus(); }catch(e){}
    }
  }
  function tickCountdown(){
    var left=IDLE_MS-(now()-getNum(K_ACT));
    if(left<0) left=0;
    var m=Math.floor(left/60000), s=Math.floor((left%60000)/1000);
    if(countEl) countEl.textContent=(m>0?(m+' min '):'')+(s<10&&m>0?'0':'')+s+' s';
  }
  function stay(){ var t=now(); setAct(t); lastWrite=t; hideWarn(); }

  /* ---------- expiry ---------- */
  function endSession(reason){
    try{ localStorage.setItem(K_REASON,reason||'idle'); }catch(e){}
    try{ localStorage.removeItem(K_ACT); }catch(e){}
    // CFAdmin.logout clears the session keys (which fires storage in other tabs) and
    // redirects this tab to the admin login.
    if(window.CFAdmin && CFAdmin.logout) CFAdmin.logout();
    else { try{ localStorage.removeItem(K_AUTH); }catch(e){} location.replace('connexion-admin.html'); }
  }
  function evaluate(){
    var idleFor=now()-getNum(K_ACT);
    var age=now()-getNum(K_SINCE);
    if(idleFor>=IDLE_MS || (getNum(K_SINCE) && age>=ABSOLUTE_MS)){ endSession(age>=ABSOLUTE_MS?'absolute':'idle'); return; }
    if(idleFor>=IDLE_MS-WARN_MS){ showWarn(); }
    else if(warned){ hideWarn(); }
  }

  /* ---------- activity capture ---------- */
  function onActivity(){
    var t=now();
    if(warned) return;            // while warned, only the explicit button resets the clock
    if(t-lastWrite>=WRITE_MS){ setAct(t); lastWrite=t; }
  }
  ['pointerdown','keydown','wheel','touchstart','mousemove','scroll'].forEach(function(ev){
    window.addEventListener(ev,onActivity,{passive:true});
  });
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) evaluate(); });

  /* ---------- multi-tab sync ---------- */
  window.addEventListener('storage',function(e){
    if(!e.key) { return; }
    if(e.key===K_AUTH && e.newValue!=='1'){           // signed out elsewhere
      try{ localStorage.setItem(K_REASON, localStorage.getItem(K_REASON)||'multitab'); }catch(_){}
      location.replace('connexion-admin.html'); return;
    }
    if(e.key===K_ROLE && e.newValue && e.newValue!==sess.role){ // role switched elsewhere
      location.reload(); return;
    }
    if(e.key===K_ACT){ // another tab registered activity -> we're alive too
      if(warned){ var left=IDLE_MS-(now()-getNum(K_ACT)); if(left>IDLE_MS-WARN_MS) hideWarn(); }
    }
  });

  // language reactivity for the dialog copy
  try{ new MutationObserver(retext).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}

  setInterval(evaluate,TICK_MS);
  evaluate();
})();
