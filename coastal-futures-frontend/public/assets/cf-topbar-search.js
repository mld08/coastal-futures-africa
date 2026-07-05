/* Coastal Futures — mobile search affordance (audit livraison 15, §1.3).
   A pill-radius input stretched to full width reads as an oval on a phone and eats
   the topbar. On mobile we hide the inline field (CSS) and expose a 44x44 magnifier
   button that opens a full-width search overlay (top sheet). Desktop is unchanged.
   Loaded on the two pages that carry a topbar search field. */
(function(){
  var search=document.querySelector('.topbar .tb-search');
  if(!search) return;
  var input=search.querySelector('input');
  var en=document.documentElement.lang==='en';

  // trigger button (reuses .tb-icon styling), placed just before the inline field
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='tb-icon tb-searchbtn';
  btn.setAttribute('aria-label', en?'Search':'Rechercher');
  btn.setAttribute('aria-haspopup','dialog');
  btn.innerHTML='<i class="ti ti-search"></i>';
  // group the trigger with the right-side action icons when present, else drop it where the field was
  var rightCluster=search.closest('.topbar') ? search.closest('.topbar').querySelector('.tb-right, .tb-r') : null;
  if(rightCluster){ rightCluster.insertBefore(btn, rightCluster.firstChild); }
  else { search.parentNode.insertBefore(btn, search); }

  // overlay
  var ov=document.createElement('div');
  ov.className='cf-searchov';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-modal','true');
  ov.setAttribute('aria-label', en?'Search':'Rechercher');
  ov.hidden=true;
  ov.innerHTML='<div class="cf-searchov-bar"><i class="ti ti-search"></i>'+
    '<input type="search" autocomplete="off"><button type="button" class="cf-searchov-x" aria-label="'+(en?'Close':'Fermer')+'"><i class="ti ti-x"></i></button></div>';
  /* Some embeddings throttle the compositor so CSS transitions never advance,
     which would leave the opacity-faded overlay stuck invisible. We drive the
     visible state directly (class + the [hidden] attribute) and disable the
     transition so the overlay always renders. */
  ov.style.transition='none';
  document.body.appendChild(ov);
  var ovInput=ov.querySelector('input');
  var ovBar=ov.querySelector('.cf-searchov-bar'); if(ovBar) ovBar.style.transition='none';
  if(input&&input.placeholder) ovInput.placeholder=input.placeholder;
  ovInput.setAttribute('aria-label', en?'Search':'Rechercher');

  var lastFocus=null;
  function open(){
    lastFocus=document.activeElement;
    ov.hidden=false;
    ov.classList.add('show');
    setTimeout(function(){ try{ ovInput.focus(); }catch(e){} }, 30);
  }
  function close(){
    ov.classList.remove('show');
    ov.hidden=true;
    if(lastFocus&&lastFocus.focus) lastFocus.focus(); else btn.focus();
  }
  btn.addEventListener('click',open);
  ov.querySelector('.cf-searchov-x').addEventListener('click',close);
  ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!ov.hidden) close(); });
})();
