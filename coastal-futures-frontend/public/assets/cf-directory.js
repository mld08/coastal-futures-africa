/* Coastal Futures — entrepreneurs directory layer (single source for the directory + profiles).
   Merges three sources into ONE list, deduplicated by person, so a newly created account or a
   freshly submitted application appears automatically, and every card routes to a DISTINCT
   profile rendered from that person's own data (no more single hard-coded startup).

     1. seed registrations  : the cohort-1 demo registrations shipped in the page
     2. applications (CFCol) : every submitted candidature becomes a directory entry
     3. users (CFCol)        : registered entrepreneur accounts without an application yet

   Load AFTER cf-collections.js. Exposes window.CFDir. */
(function(){
  var SECTORS={
    energie:{label:'Énergie renouvelable',color:'#0A6B5E'},
    mangroves:{label:'Restauration de mangroves',color:'#12B396'},
    recyclage:{label:'Recyclage et déchets',color:'#B8823A'},
    agriculture:{label:'Agriculture résiliente',color:'#3ECBB0'},
    entreprise:{label:'Entreprise verte',color:'#063D34'}
  };
  /* country -> capital, hub, map coordinates (for the profile facts + minimap) */
  var COUNTRY={
    'Sénégal':{ville:'Dakar',hub:'Climate Linguère Club',ll:[14.72,-17.46]},
    'Ghana':{ville:'Accra',hub:'Hub jeunesse Accra',ll:[5.56,-0.20]},
    'Guinée':{ville:'Conakry',hub:'Hub jeunesse Conakry',ll:[9.64,-13.58]},
    'Guinée-Conakry':{ville:'Conakry',hub:'Hub jeunesse Conakry',ll:[9.64,-13.58]},
    'Liberia':{ville:'Monrovia',hub:'Hub jeunesse Monrovia',ll:[6.30,-10.80]},
    'Sierra Leone':{ville:'Freetown',hub:'Craving 4 Development',ll:[8.48,-13.23]}
  };

  /* cohort-1 demo registrations (the public vitrine seed). Each is a DISTINCT profile. */
  var SEED=[
    {id:'aminata-diallo',name:'Aminata Diallo',structure:'Dakar Solar Solutions',sec:'energie',pays:'Sénégal',st:'Candidature soumise',av:'DS',
     desc:"Mini-réseaux solaires pour les villages de pêcheurs de la Petite Côte, là où le réseau national n'arrive pas : une énergie propre, fiable et locale."},
    {id:'mohamed-bangura',name:'Mohamed Bangura',structure:'Compost côtier',sec:'recyclage',pays:'Sierra Leone',st:'Candidature soumise',av:'CC',
     desc:"Collecte et valorisation des déchets organiques du littoral de Freetown en compost pour les maraîchers urbains."},
    {id:'kofi-mensah',name:'Kofi Mensah',structure:'ReCycle Accra',sec:'recyclage',pays:'Ghana',st:'Inscrit',av:'RA',
     desc:"Filière de collecte des plastiques côtiers d'Accra, transformés en matériaux de construction par des coopératives de jeunes."},
    {id:'james-tuah',name:'James Tuah',structure:'Mangrove Restore Initiative',sec:'mangroves',pays:'Liberia',st:'Candidature soumise',av:'MR',
     desc:"Restauration des mangroves de la côte de Mesurado avec les communautés riveraines, pour protéger le littoral et la pêche."},
    {id:'mariama-balde',name:'Mariama Baldé',structure:'Pêche bleue Conakry',sec:'entreprise',pays:'Guinée-Conakry',st:'Inscrit',av:'PB',
     desc:"Chaîne du froid solaire pour les femmes transformatrices de poisson de Conakry, réduisant les pertes après capture."},
    {id:'fatou-sarr',name:'Fatou Sarr',structure:'Téranga Agro',sec:'agriculture',pays:'Sénégal',st:'Candidature soumise',av:'TA',
     desc:"Agriculture maraîchère climato-résiliente sur la Petite Côte, avec irrigation économe et semences adaptées au sel."},
    {id:'ibrahim-koroma',name:'Ibrahim Koroma',structure:'AgriRésilience Freetown',sec:'agriculture',pays:'Sierra Leone',st:'Inscrit',av:'AF',
     desc:"Parcelles pilotes d'agriculture résiliente autour de Freetown, formant de jeunes agriculteurs aux pratiques agroécologiques."},
    {id:'ama-owusu',name:'Ama Owusu',structure:'Plastic to Build',sec:'recyclage',pays:'Ghana',st:'Candidature soumise',av:'PB',
     desc:"Transformation des déchets plastiques côtiers en briques et mobilier urbain pour les communautés d'Accra."},
    {id:'sekou-camara',name:'Sékou Camara',structure:'Solaire Conakry',sec:'energie',pays:'Guinée-Conakry',st:'Inscrit',av:'SC',
     desc:"Kits solaires domestiques en location-vente pour les quartiers non raccordés de Conakry."},
    {id:'grace-johnson',name:'Grace Johnson',structure:'Monrovia Eco Roots',sec:'mangroves',pays:'Liberia',st:'Candidature soumise',av:'ME',
     desc:"Pépinières communautaires de palétuviers et sensibilisation à la protection du littoral à Monrovia."},
    {id:'awa-ndoye',name:'Awa Ndoye',structure:'Sahel Clean Energy',sec:'energie',pays:'Sénégal',st:'Inscrit',av:'SE',
     desc:"Solutions d'accès à l'énergie propre pour les zones rurales du nord du Sénégal, portées par de jeunes techniciennes."},
    {id:'joseph-kamara',name:'Joseph Kamara',structure:'Blue Coast SL',sec:'entreprise',pays:'Sierra Leone',st:'Candidature soumise',av:'BC',
     desc:"Économie bleue durable à Freetown : tourisme côtier responsable et valorisation des ressources marines."}
  ];

  function norm(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  function initials(s){ var p=(s||'').trim().split(/\s+/); return ((p[0]&&p[0][0]||'')+(p[1]&&p[1][0]||'')).toUpperCase()||'CF'; }
  function isDemoEmail(e){ return /@example\./i.test(e||''); }

  /* map an application status to the directory's two public badges */
  function appBadge(status){
    if(status==='accepted'||status==='incubation'||status==='labellise'||status==='certified') return 'Inscrit';
    return 'Candidature soumise';
  }

  function fromApplication(a){
    var c=a.candidat||{}, p=a.projet||{};
    var name=c.nom||'';
    var sec=(p.secteur && SECTORS[p.secteur])?p.secteur:'entreprise';
    return {
      id:norm(name)||a.id,
      name:name,
      structure:p.nom||name,
      sec:sec,
      pays:c.pays||'Sénégal',
      st:appBadge(a.status),
      av:initials(p.nom||name),
      desc:p.description||'',
      motivation:a.motivation||'',
      submittedAt:a.submittedAt||a.appliedAt||'',
      source:'application', appId:a.id
    };
  }
  function fromUser(u){
    return {
      id:u.id||norm(u.name),
      name:u.name||'',
      structure:'',           // registered but no project filed yet
      sec:'entreprise',
      pays:u.pays||'Sénégal',
      st:'Inscrit',
      av:initials(u.name),
      desc:'',
      submittedAt:u.joinedAt||'',
      source:'user'
    };
  }
  /* admin-managed directory record (admin-annuaires.html writes CFCol('entrepreneurs')).
     Highest authority : overrides seed/application list fields and can retire a profile. */
  function tt(v){ if(v==null) return ''; if(typeof v==='string') return v; var l=(document.documentElement.lang==='en'?'en':'fr'); return (l==='en'&&v.en)?v.en:(v.fr||v.en||''); }
  function fromManaged(e){
    return {
      id:e.id||norm(e.n),
      name:e.n||'',
      structure:e.s||'',
      sec:(e.sec&&SECTORS[e.sec])?e.sec:'entreprise',
      pays:e.pays||'Sénégal',
      st:e.st||'Inscrit',
      av:e.av||initials(e.n),
      desc:tt(e.desc),
      pub:e.pub||'published',
      source:'managed'
    };
  }

  function build(){
    var out=[], byKey={};
    var rank={managed:4,application:3,seed:2,user:1};
    function add(entry){
      var k=norm(entry.name); if(!k) return;
      var prev=byKey[k];
      if(!prev){ byKey[k]=entry; out.push(entry); return; }
      // dedupe by person : the higher-ranked source overlays its non-empty fields
      // onto the existing record (so an admin edit can change the status without
      // wiping a richer description that only the seed had).
      if((rank[entry.source]||0) >= (rank[prev.source]||0)){
        var merged=Object.assign({},prev);
        Object.keys(entry).forEach(function(kk){ var v=entry[kk]; if(v!==''&&v!=null) merged[kk]=v; });
        merged.source=entry.source;
        var i=out.indexOf(prev); if(i>=0) out[i]=merged; byKey[k]=merged;
      }
    }
    function retire(name){ var k=norm(name); var prev=byKey[k]; if(prev){ var i=out.indexOf(prev); if(i>=0) out.splice(i,1); delete byKey[k]; } byKey[k]='__retired__'; }
    // 1) seed
    SEED.forEach(function(s){ add(Object.assign({source:'seed'},s)); });
    // 2) real submitted applications
    try{ (window.CFCol?CFCol.all('applications'):[]).forEach(function(a){ if(a&&a.candidat&&a.candidat.nom) add(fromApplication(a)); }); }catch(e){}
    // 3) registered entrepreneur accounts (skip demo @example seeds — already represented)
    try{ (window.CFCol?CFCol.all('users'):[]).forEach(function(u){ if(u&&u.role==='entrepreneur'&&!isDemoEmail(u.email)) add(fromUser(u)); }); }catch(e){}
    // 4) admin-managed records (highest authority : edits, new profiles, retirement)
    try{ (window.CFCol?CFCol.all('entrepreneurs'):[]).forEach(function(e){ if(!e||!e.n) return;
      if((e.pub||'published')!=='published'){ retire(e.n); return; }
      add(fromManaged(e)); }); }catch(e){}
    return out.filter(function(x){ return x!=='__retired__'; });
  }

  window.CFDir={
    SECTORS:SECTORS,
    country:function(pays){ return COUNTRY[pays]||{ville:'',hub:'Hub jeunesse',ll:[9,-12]}; },
    entrepreneurs:build,
    get:function(id){
      if(!id) return null;
      var list=build();
      for(var i=0;i<list.length;i++){ if(list[i].id===id) return list[i]; }
      // fallback: match by normalized name
      var n=norm(id);
      for(var j=0;j<list.length;j++){ if(norm(list[j].name)===n||norm(list[j].structure)===n) return list[j]; }
      return null;
    }
  };
})();
