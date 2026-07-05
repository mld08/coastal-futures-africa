/* Coastal Futures — guided walkthrough engine (first login).
   Declare steps on the page BEFORE this script:
     window.CF_TOUR = {
       key: 'cf-tour-entrepreneur',          // localStorage key (per role)
       steps: [
         { sel:'.side-nav', place:'right', icon:'ti-compass',
           fr:{t:'…', b:'…'}, en:{t:'…', b:'…'} },
         { center:true, icon:'ti-confetti', fr:{...}, en:{...} }   // no sel => centered card
       ]
     };
   Auto-starts once per browser when logged in (cf-auth) and key not yet stored.
   Manual restart: any element with [data-cf-tour-start] (e.g. a help-menu item). */
(function(){
  var cfg = window.CF_TOUR;
  if(!cfg || !cfg.steps || !cfg.steps.length) return;
  var KEY = cfg.key || 'cf-tour';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function lang(){ try{ return localStorage.getItem('cf-lang')==='en' ? 'en' : 'fr'; }catch(e){ return 'fr'; } }
  function L(){ return lang()==='en' ? {skip:'Skip tutorial',back:'Back',next:'Next',done:'Got it',step:'Step',of:'of'}
                                     : {skip:'Passer le tutoriel',back:'Précédent',next:'Suivant',done:'C\u2019est parti',step:'Étape',of:'sur'}; }

  var steps = cfg.steps, i = 0, root, scrim, ring, pop, started=false;

  function build(){
    root = document.createElement('div');
    root.className = 'cf-tour-root';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label', lang()==='en'?'Guided tour':'Visite guidée');
    scrim = document.createElement('div'); scrim.className='cf-tour-scrim';
    ring  = document.createElement('div'); ring.className='cf-tour-ring';
    pop   = document.createElement('div'); pop.className='cf-tour-pop';
    pop.innerHTML =
      '<span class="cf-tour-arrow"></span>'+
      '<div class="cf-tour-meta"><span class="cf-tour-step"></span><span class="cf-tour-dots"></span></div>'+
      '<div class="cf-tour-ic"><i class="ti"></i></div>'+
      '<h3></h3><p></p>'+
      '<div class="cf-tour-foot"><button type="button" class="cf-tour-skip"></button>'+
      '<div class="cf-tour-nav"><button type="button" class="cf-tour-btn cf-tour-back"></button>'+
      '<button type="button" class="cf-tour-btn cf-tour-next"></button></div></div>';
    root.appendChild(scrim); root.appendChild(ring); root.appendChild(pop);
    document.body.appendChild(root);

    // dots
    var dots = pop.querySelector('.cf-tour-dots');
    for(var d=0; d<steps.length; d++){ dots.appendChild(document.createElement('b')); }

    pop.querySelector('.cf-tour-skip').addEventListener('click', finish);
    pop.querySelector('.cf-tour-back').addEventListener('click', function(){ go(i-1); });
    pop.querySelector('.cf-tour-next').addEventListener('click', function(){ i>=steps.length-1 ? finish() : go(i+1); });
    // block clicks on the dimmed area but allow Esc to skip
    scrim.addEventListener('click', function(e){ e.stopPropagation(); });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, {passive:true});
  }

  function onKey(e){
    if(!started) return;
    if(e.key==='Escape'){ finish(); }
    else if(e.key==='ArrowRight'){ i<steps.length-1 ? go(i+1) : finish(); }
    else if(e.key==='ArrowLeft' && i>0){ go(i-1); }
  }

  function ensureVisible(el, cb){
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if(r.top < 90 || r.bottom > vh - 40){
      var target = window.scrollY + r.top - (vh/2 - r.height/2);
      window.scrollTo({ top: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
      setTimeout(cb, reduce ? 0 : 360);
    } else { cb(); }
  }

  function place(){
    var s = steps[i];
    var el = s.center ? null : document.querySelector(s.sel);
    if(el){
      var br = el.getBoundingClientRect();
      var offscreen = (br.width===0 && br.height===0) ||
        br.right <= 4 || br.left >= window.innerWidth - 4 ||
        br.bottom <= 4 || br.top >= window.innerHeight - 4;
      if(offscreen) el = null; // hidden or off-canvas (e.g. collapsed sidebar on mobile)
    }
    if(s.center || !el){
      ring.classList.remove('show');
      scrim.classList.add('show');
      pop.classList.add('center');
      pop.removeAttribute('data-place');
      requestAnimationFrame(function(){ pop.classList.add('show'); });
      return;
    }
    scrim.classList.remove('show');
    pop.classList.remove('center');
    var pad = s.pad==null ? 8 : s.pad;
    var r = el.getBoundingClientRect();
    var top = r.top - pad, left = r.left - pad, w = r.width + pad*2, h = r.height + pad*2;
    ring.style.top = top+'px'; ring.style.left = left+'px';
    ring.style.width = w+'px'; ring.style.height = h+'px';
    ring.style.borderRadius = (s.radius || 14)+'px';
    ring.classList.add('show');

    // choose placement
    var vw = window.innerWidth, vh = window.innerHeight, pw = pop.offsetWidth||340, ph = pop.offsetHeight||220, gap = 18;
    var pref = s.place || 'bottom';
    var order = [pref,'bottom','top','right','left'];
    var chosen = pref, pt=0, pl=0;
    for(var k=0;k<order.length;k++){
      var pc = order[k];
      if(pc==='bottom' && top+h+gap+ph <= vh-12){ chosen='bottom'; break; }
      if(pc==='top'    && top-gap-ph >= 12){ chosen='top'; break; }
      if(pc==='right'  && left+w+gap+pw <= vw-12){ chosen='right'; break; }
      if(pc==='left'   && left-gap-pw >= 12){ chosen='left'; break; }
      chosen = pc;
    }
    var cx = left + w/2, cy = top + h/2;
    if(chosen==='bottom'){ pt = top+h+gap; pl = cx - pw/2; }
    else if(chosen==='top'){ pt = top-gap-ph; pl = cx - pw/2; }
    else if(chosen==='right'){ pl = left+w+gap; pt = cy - ph/2; }
    else { pl = left-gap-pw; pt = cy - ph/2; }
    pl = Math.max(12, Math.min(pl, vw - pw - 12));
    pt = Math.max(12, Math.min(pt, vh - ph - 12));
    pop.style.top = pt+'px'; pop.style.left = pl+'px';
    pop.setAttribute('data-place', chosen);

    // arrow position along the shared edge
    var arrow = pop.querySelector('.cf-tour-arrow');
    if(chosen==='bottom' || chosen==='top'){
      var ax = Math.max(16, Math.min(cx - pl, pw - 16));
      arrow.style.left = ax+'px'; arrow.style.top=''; arrow.style.removeProperty('right');
    } else {
      var ay = Math.max(16, Math.min(cy - pt, ph - 16));
      arrow.style.top = ay+'px'; arrow.style.left=''; arrow.style.removeProperty('bottom');
    }
    requestAnimationFrame(function(){ pop.classList.add('show'); });
  }

  function reflow(){ if(started && !steps[i].center) place(); }

  function render(){
    var s = steps[i], t = (lang()==='en' ? s.en : s.fr) || s.fr || {};
    var l = L();
    pop.querySelector('.cf-tour-step').textContent = l.step+' '+(i+1)+' '+l.of+' '+steps.length;
    var dots = pop.querySelectorAll('.cf-tour-dots b');
    for(var d=0; d<dots.length; d++){ dots[d].classList.toggle('on', d===i); }
    var ic = pop.querySelector('.cf-tour-ic i');
    ic.className = 'ti ' + (s.icon || 'ti-point-filled');
    pop.querySelector('h3').textContent = t.t || '';
    pop.querySelector('p').textContent = t.b || '';
    pop.querySelector('.cf-tour-skip').textContent = l.skip;
    var back = pop.querySelector('.cf-tour-back');
    back.textContent = l.back; back.style.display = i===0 ? 'none' : '';
    var next = pop.querySelector('.cf-tour-next');
    next.innerHTML = i>=steps.length-1 ? l.done : (l.next+' <i class="ti ti-arrow-right"></i>');
  }

  function go(n){
    if(n<0 || n>=steps.length) return;
    i = n;
    pop.classList.remove('show');
    render();
    var s = steps[i];
    var el = s.center ? null : document.querySelector(s.sel);
    if(el){ ensureVisible(el, place); } else { place(); }
  }

  function start(){
    if(started) return;
    started = true;
    if(!root) build();
    root.hidden = false;
    document.documentElement.style.overflow='hidden';
    i = 0; render();
    var el = steps[0].center ? null : document.querySelector(steps[0].sel);
    if(el){ ensureVisible(el, place); } else { place(); }
  }

  function finish(){
    started = false;
    try{ localStorage.setItem(KEY,'1'); }catch(e){}
    document.documentElement.style.overflow='';
    if(root){ pop.classList.remove('show'); ring.classList.remove('show'); scrim.classList.remove('show');
      setTimeout(function(){ if(root) root.hidden = true; }, reduce?0:280); }
  }

  // expose manual restart
  window.cfTourStart = function(){ try{ localStorage.removeItem(KEY); }catch(e){} start(); };
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-cf-tour-start]');
    if(t){ e.preventDefault(); window.cfTourStart(); }
  });

  // auto-start on first login
  function maybeAuto(){
    var seen=false, auth=true;
    try{ seen = localStorage.getItem(KEY)==='1'; }catch(e){}
    try{ auth = localStorage.getItem('cf-auth')==='1'; }catch(e){}
    if(seen || !auth) return;
    // attendre la fin du splash de connexion s'il est présent, sinon démarrer normalement
    setTimeout(function(){
      var sp = document.querySelector('.cf-splash');
      if(sp){
        var go = function(){ setTimeout(start, 160); };
        sp.addEventListener('transitionend', go, { once:true });
        setTimeout(function(){ if(!started) go(); }, 3200); // filet de sécurité
      } else {
        setTimeout(start, reduce ? 200 : 700);
      }
    }, 90);
  }
  if(document.readyState==='complete' || document.readyState==='interactive'){ maybeAuto(); }
  else { window.addEventListener('DOMContentLoaded', maybeAuto); }
})();
