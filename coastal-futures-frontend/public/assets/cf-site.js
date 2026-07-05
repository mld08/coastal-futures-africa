/* Coastal Futures — central client data layer.
   Back-end devs: replace the localStorage read/write below with your API.
   Every screen that includes this file + tags elements with [data-site="path"]
   hydrates from one source of truth, editable by the super admin (admin-site.html).

   LAUNCH REALITY (10 June 2026) — option C, validated by the client:
   the programme has just launched. Current impact figures DO NOT EXIST YET.
   kpi.*    = current values at launch (0 / seed). pays = 5 is a real fact.
   target.* = programme targets over the roadmap (April 2026 to March 2027).
   Audited surfaces (impact map, donor dashboard) read kpi.* (seed) and frame
   everything as "se remplira dès la collecte". Public marketing surfaces use
   target.* framed explicitly as objectives, never as results achieved. */
(function(){
  var KEY='cf-site';
  var SEED={
    kpi:{
      /* valeurs courantes au lancement : aucune donnée d'impact collectée */
      entrepreneurs:'0', projets:'0', beneficiaires:'0',
      mangroves:'0', dechets:'0', capital:'0',
      labellises:'0', pays:'5', mentors:'0'
    },
    target:{
      /* cibles programme — feuille de route avril 2026 → mars 2027 */
      entrepreneurs:'4000', pays:'5'
    },
    settings:{
      tagline:"4 000 jeunes entrepreneurs verts à former dans cinq nations côtières d'ici mars 2027.",
      email:'contact@africagovernanceinstitute.org'
    }
  };
  function deep(o){ return JSON.parse(JSON.stringify(o)); }
  function load(){
    try{ var s=localStorage.getItem(KEY); if(s){ var o=JSON.parse(s)||{}; return {kpi:Object.assign({},SEED.kpi,o.kpi||{}),target:Object.assign({},SEED.target,o.target||{}),settings:Object.assign({},SEED.settings,o.settings||{})}; } }catch(e){}
    return deep(SEED);
  }
  var data=load();
  window.CFSite={
    SEED:SEED,
    get:function(){ return data; },
    set:function(d){ data={kpi:Object.assign({},SEED.kpi,d.kpi||{}),target:Object.assign({},SEED.target,d.target||{}),settings:Object.assign({},SEED.settings,d.settings||{})}; try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){} return data; },
    reset:function(){ try{localStorage.removeItem(KEY);}catch(e){} data=load(); return data; },
    apply:apply
  };
  function valAt(obj,path){ var v=obj; for(var i=0;i<path.length;i++){ v=v&&v[path[i]]; } return v; }
  function apply(){
    [].forEach.call(document.querySelectorAll('[data-site]'),function(el){
      var path=el.getAttribute('data-site').split('.');
      var v=valAt(data,path); if(v==null) return;
      var seedv=valAt(SEED,path);
      // Only override when the super admin actually changed the value, so default
      // count-up animations and markup stay untouched out of the box.
      if((''+v)===(''+seedv)) return;
      el.textContent=v;
      if(el.hasAttribute('data-count')){ var n=parseInt((''+v).replace(/[^0-9]/g,''),10); if(!isNaN(n)) el.setAttribute('data-count',n); }
    });
  }
  if(document.readyState!=='loading') apply(); else document.addEventListener('DOMContentLoaded',apply);
  setTimeout(apply,1400); // re-assert after any count-up animation finishes
})();
