/* Coastal Futures — derived KPI layer (audit v7 §V7-1).
   THE missing link : figures the platform produces ITSELF must be COMPUTED from its
   own collections, never retyped by hand. A retyped number is a second source of
   truth that will drift from the real count — exactly the incoherence everything
   else tries to remove.

   Rule of the house :
     · a DERIVABLE figure is never entered  -> computed here from CFCol
     · a FIELD figure (mangrove hectares, tonnes of waste, beneficiaries) is entered
       then validated through the admin-indicateurs draft->submitted->validated->published flow.

   DERIVED keys (auto)   : candidatures, entrepreneurs, projets, labellises, mentors, inscrits
   FIELD keys (manual)   : mangroves, dechets, beneficiaires, capital, pays

   This module reads CFCol, writes the derived keys into CFSite (so admin-indicateurs,
   the donor dashboard and the report all read ONE source), hydrates any [data-derive]
   element on the page, and recomputes on storage events (multi-tab) + collection
   changes. Load AFTER cf-site.js and cf-collections.js. */
(function(){
  if(!window.CFSite || !window.CFCol){ return; }

  /* application statuses that count as an accompanied / trained entrepreneur.
     At launch none are accepted yet, so this is honestly 0. */
  var ACCEPTED = ['accepted','incubation','labellise','certified'];

  function cnt(name, pred){ try{ return CFCol.count(name, pred); }catch(e){ return 0; } }

  /* ---- Registre projets réel (partagé carte publique / admin-projets / admin-carte) ----
     Les projets vivent dans cf-map-projects (pas dans CFCol('projects'), vide). On lit
     ce registre, on normalise le statut FR (« Labellisé », « En incubation », « Soumis »)
     et on EXCLUT les hubs jeunesse (type 'hub') : ce sont des infrastructures du
     programme, pas des projets entrepreneuriaux labellisables. */
  function mapProjects(){
    var arr=[];
    try{ var raw=localStorage.getItem('cf-map-projects'); if(raw){ arr=JSON.parse(raw)||[]; } }catch(e){}
    if(!Array.isArray(arr) || !arr.length){ try{ arr=CFCol.all('projects')||[]; }catch(e){ arr=[]; } } // repli
    return Array.isArray(arr)?arr:[];
  }
  function isVenture(p){ return String((p&&p.type)||'').toLowerCase()!=='hub'; }
  function statutOf(p){
    var s=String((p&&(p.statut||p.status))||'').toLowerCase();
    if(s.indexOf('labell')>=0 || s.indexOf('certif')>=0) return 'labellise';
    if(s.indexOf('incub')>=0) return 'incubation';
    if(s.indexOf('soumis')>=0 || s.indexOf('submit')>=0) return 'soumis';
    if(s.indexOf('revue')>=0 || s.indexOf('review')>=0) return 'revue';
    return s;
  }
  function ventures(){ return mapProjects().filter(isVenture); }

  /* one rule per derived key. Every rule is a pure count over a collection, so the
     number can only ever equal what the platform actually holds. */
  var RULES = {
    /* every application ever submitted, accumulated (one record per submission). */
    candidatures : function(){ return cnt('applications'); },
    /* entrepreneurs accompanied = applications admitted into the programme. */
    entrepreneurs: function(){ return cnt('applications', function(a){ return ACCEPTED.indexOf(a.status) >= 0; }); },
    /* projets actifs = projets (hors hub) admis au programme (labellisés ou en incubation). */
    projets      : function(){ return ventures().filter(function(p){ var s=statutOf(p); return s==='labellise' || s==='incubation'; }).length; },
    /* projets ayant obtenu la labellisation. */
    labellises   : function(){ return ventures().filter(function(p){ return statutOf(p)==='labellise'; }).length; },
    /* published mentor profiles in the directory. */
    mentors      : function(){ return cnt('mentors', function(m){ return (m.pub||'published')==='published'; }); },
    /* registered members only (entrepreneurs + mentors) — staff (super/team/moderator)
       and demo @example.* accounts are NOT members and must never inflate this figure
       (audit v8 §V8-2). At launch the seeded accounts are all demo -> 0, honest. */
    inscrits     : function(){ return cnt('users', function(u){
      var role=(u&&u.role)||''; if(role!=='entrepreneur' && role!=='mentor') return false;
      if(/@example\./i.test((u&&u.email)||'')) return false;
      return true;
    }); }
  };
  var DERIVED_KEYS = Object.keys(RULES);

  /* ---- Family B : field measures, aggregated from per-project entries (addendum) ----
     A field KPI (mangrove hectares, tonnes of waste, beneficiaries) is never a typed total.
     It is the sum of the VALIDATED measures entered at source, per project, by the country
     coordinator. cf-derive sums them and writes cf-site.kpi.* ; no human consolidates. Until
     the project registry carries measures, this sums to nothing and the manually-validated
     value (admin-indicateurs) is left untouched, so the current path keeps working. */
  var FIELD_KEYS = ['mangroves','dechets','beneficiaires','foyers','emplois'];
  function aggregateFieldMeasures(){
    var sums={}, has={};
    function consume(ms){
      (ms||[]).forEach(function(m){
        if(!m) return;
        var st=m.status||'validated';
        if(st!=='validated' && st!=='published') return;   // only validated measures reach the donor
        var k=m.metric; if(FIELD_KEYS.indexOf(k)<0) return;
        var v=parseFloat(m.value); if(isNaN(v)) return;
        sums[k]=(sums[k]||0)+v; has[k]=true;
      });
    }
    try{
      (CFCol.all('projects')||[]).forEach(function(p){ consume(p&&p.measures); });
    }catch(e){}
    /* B-05 : the live project registry lives in cf-map-projects (admin-projets /
       admin-carte / public map share it). Sum the per-project validated measures
       entered there too, so the donor KPIs reflect what coordinators record. */
    try{
      var raw=localStorage.getItem('cf-map-projects');
      if(raw){ (JSON.parse(raw)||[]).forEach(function(p){ consume(p&&p.measures); }); }
    }catch(e){}
    return {sums:sums, has:has};
  }

  function compute(){
    var o = {};
    DERIVED_KEYS.forEach(function(k){ o[k] = RULES[k](); });
    return o;
  }

  function fmt(n){
    var en = document.documentElement.lang === 'en';
    var v = Number(n); if(isNaN(v)) return ''+n;
    return v.toLocaleString(en ? 'en-US' : 'fr-FR');
  }

  /* hydrate [data-derive="key"] elements directly. The element holds ONLY the number;
     units (ha, t…) live in sibling nodes so formatting never eats them. */
  function hydrate(derived){
    [].forEach.call(document.querySelectorAll('[data-derive]'), function(el){
      var k = el.getAttribute('data-derive');
      if(!(k in derived)) return;
      var v = derived[k];
      el.textContent = fmt(v);
      if(el.hasAttribute('data-count')) el.setAttribute('data-count', v);
    });
  }

  /* write the derived keys into CFSite WITHOUT touching field keys or targets, so the
     same number shows on the donor dashboard (data-site), the report and the console. */
  function persist(derived){
    try{
      var d = CFSite.get();
      var kpi = {};
      Object.keys(d.kpi||{}).forEach(function(k){ kpi[k] = d.kpi[k]; });
      DERIVED_KEYS.forEach(function(k){ kpi[k] = String(derived[k]); });
      // Family B : overwrite a field key ONLY when validated project measures exist to sum,
      // so we never zero out a manually-validated value before the project registry carries data.
      var fb=aggregateFieldMeasures();
      FIELD_KEYS.forEach(function(k){ if(fb.has[k]) kpi[k]=String(fb.sums[k]); });
      CFSite.set({ kpi: kpi, target: d.target, settings: d.settings });
      if(CFSite.apply) CFSite.apply();
    }catch(e){}
  }

  function run(){
    var derived = compute();
    persist(derived);
    hydrate(derived);
    return derived;
  }

  window.CFDerive = {
    DERIVED_KEYS : DERIVED_KEYS,
    FIELD_KEYS   : FIELD_KEYS,
    isDerived    : function(k){ return DERIVED_KEYS.indexOf(k) >= 0; },
    isField      : function(k){ return FIELD_KEYS.indexOf(k) >= 0; },
    fieldAggregated : function(k){ return !!aggregateFieldMeasures().has[k]; }, // true once projects carry validated measures
    values       : compute,        // raw map { key: number }
    recompute    : run             // recompute + persist + hydrate
  };

  if(document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);

  /* multi-tab : another tab edited a collection -> recompute here too. */
  try{
    window.addEventListener('storage', function(e){
      if(e.key && (e.key.indexOf('cf-col-') === 0 || e.key === 'cf-site' || e.key === 'cf-map-projects')) run();
    });
  }catch(e){}

  /* re-format derived numbers (thousands separator) when the language flips. */
  try{
    new MutationObserver(function(){ hydrate(compute()); })
      .observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
  }catch(e){}
})();
