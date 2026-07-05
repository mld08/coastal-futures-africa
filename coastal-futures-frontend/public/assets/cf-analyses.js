/* Coastal Futures — donor "Le défi en données" analytics (audit v5 §B3 demo).
   Renders the analyses-bailleur page with CFDataviz. Every figure here is REAL and
   SOURCED (TDR context : GIEC, CPI 2023, demographics) or an honest launch value
   (programme objectives : 0 réalisé vs a stated target). Nothing is fabricated : at
   launch the only numeric programme target defined is 4 000 entrepreneurs to train,
   so the programme charts show 0 against that target, never invented results.
   Bilingual : re-renders on <html lang> change. */
(function(){
  if(!window.CFDataviz){ return; }
  var P=CFDataviz.palette;
  function en(){ return document.documentElement.lang==='en'; }
  function set(id,txt){ var e=document.getElementById(id); if(e) e.textContent=txt; }
  // Audit v7 §V7-7 : the entrepreneurs target is read from cf-site.target, the single
  // source. If the programme target changes, every trajectory here follows it, instead of
  // a hard-coded 4 000 that could silently diverge (the 500/4 000 trap).
  function tgtEnt(){ try{ var t=window.CFSite&&CFSite.get().target.entrepreneurs; var n=parseInt((''+(t||'4000')).replace(/[^0-9]/g,''),10); return n||4000; }catch(e){ return 4000; } }

  var COPY={
    fr:{
      chip:'Lecture confidentielle · accès PTF',
      h1:'Le défi en données',
      lead:'Le contexte qui justifie le programme, en chiffres sourcés. Données de cadrage, non des résultats.',
      intro:'Coastal Futures part d’un constat : les jeunes d’Afrique de l’Ouest ne sont pas les victimes du changement climatique, ils en sont les bâtisseurs de solutions. Les indicateurs ci-dessous situent l’enjeu. Les résultats du programme, eux, seront publiés dès la première collecte, validés et sourcés.',
      foot:'Données de contexte issues du document de cadrage (TDR) · les indicateurs de résultat seront publiés dès la collecte · Institut Africain de la Gouvernance',
      print:'Le défi en données · Coastal Futures Network · Institut Africain de la Gouvernance. Données de contexte sourcées ; les indicateurs de résultat seront publiés dès la première collecte.'
    },
    en:{
      chip:'Confidential reading · donor access',
      h1:'The challenge in data',
      lead:'The context that justifies the programme, in sourced figures. Framing data, not results.',
      intro:'Coastal Futures starts from one conviction: young West Africans are not the victims of climate change, they are its solution-builders. The indicators below frame the stake. Programme results will be published from the first data collection, validated and sourced.',
      foot:'Context data from the framing document (TOR) · result indicators will be published from first collection · Africa Governance Institute',
      print:'The challenge in data · Coastal Futures Network · Africa Governance Institute. Sourced context data; result indicators will be published from the first collection.'
    }
  };

  var CARDS=[
    { k:1, type:'bars',
      fr:{kk:'financement climatique', t:'Un financement très en deçà du besoin', d:'L’Afrique subit environ 15 % des pertes économiques mondiales liées au climat, mais capte moins de 5,5 % des financements climatiques dédiés.', s:'Climate Policy Initiative, 2023'},
      en:{kk:'climate finance', t:'Funding far below the need', d:'Africa bears about 15% of global climate-related economic losses, yet captures less than 5.5% of dedicated climate finance.', s:'Climate Policy Initiative, 2023'},
      cfg:function(L){ return {
        labels: en()?['Share of losses','Climate finance captured']:['Part des pertes','Financements captés'],
        values:[15,5.5], colors:[P.teal,P.sand], target:null, yMax:20,
        yLabel:'%', caption: en()?'Africa: share of global climate losses vs share of dedicated climate finance captured (%).':'Afrique : part des pertes climatiques mondiales et part des financements climatiques dédiés captés (%).'
      }; },
      render:function(el,L){ CFDataviz.bars(el, L); var n=el.querySelectorAll('.cf-dv-val'); /* append % to value labels handled in caption */ }
    },
    { k:2, type:'donut',
      fr:{kk:'démographie', t:'Une population jeune, un dividende à activer', d:'Plus de 60 % des Ouest-Africains ont entre 15 et 35 ans. C’est la première ressource du programme.', s:'Document de cadrage Coastal Futures (TDR)'},
      en:{kk:'demographics', t:'A young population, a dividend to activate', d:'Over 60% of West Africans are aged 15 to 35. This is the programme’s primary resource.', s:'Coastal Futures framing document (TOR)'},
      cfg:function(){ return {
        slices: en()
          ?[{label:'Aged 15–35',value:60,color:P.teal},{label:'Other ages',value:40,color:P.hairS}]
          :[{label:'15 à 35 ans',value:60,color:P.teal},{label:'Autres tranches d’âge',value:40,color:P.hairS}],
        unit:' %', centerTop:'60 %', centerLabel: en()?'aged 15–35':'15–35 ans',
        caption: en()?'Share of West Africans aged 15–35 versus other age groups (%).':'Part des Ouest-Africains âgés de 15 à 35 ans et des autres tranches d’âge (%).'
      }; }
    },
    { k:3, type:'area',
      fr:{kk:'littoral', t:'Un littoral sous pression', d:'Le niveau marin pourrait s’élever jusqu’à 60 cm d’ici 2100. Les cinq pays du programme sont des nations côtières.', s:'GIEC (projection, borne haute)'},
      en:{kk:'coastline', t:'A coastline under pressure', d:'Sea level could rise by up to 60 cm by 2100. The programme’s five countries are coastal nations.', s:'IPCC (projection, upper bound)'},
      cfg:function(){ return {
        labels:['2020','2040','2060','2080','2100'],
        series:[{ name: en()?'Sea-level rise (cm, projection)':'Élévation du niveau marin (cm, projection)', values:[0,14,30,44,60], color:P.blue, dashed:true }],
        yMax:60, yTicks:4,
        caption: en()?'Projected sea-level rise to 2100, smooth interpolation toward the IPCC upper bound of 60 cm.':'Élévation projetée du niveau marin d’ici 2100, interpolation vers la borne haute du GIEC (60 cm).'
      }; }
    },
    { k:4, type:'progress',
      fr:{kk:'agenda 2030', t:'Aligné sur sept objectifs de développement durable', d:'Le programme contribue directement à 7 des 17 ODD : 1, 4, 8, 13, 14, 15 et 17.', s:'Agenda 2030 des Nations unies'},
      en:{kk:'agenda 2030', t:'Aligned with seven sustainable development goals', d:'The programme directly contributes to 7 of the 17 SDGs: 1, 4, 8, 13, 14, 15 and 17.', s:'United Nations 2030 Agenda'},
      cfg:function(){ return {
        value:7, target:17, color:P.teal,
        name: en()?'SDGs aligned':'ODD alignés',
        label: en()?'SDGs 1, 4, 8, 13, 14, 15 and 17 — poverty, education, decent work, climate, oceans, land and partnerships.':'ODD 1, 4, 8, 13, 14, 15 et 17 — pauvreté, éducation, travail décent, climat, océans, terres et partenariats.',
        caption: en()?'Programme alignment: 7 of the 17 Sustainable Development Goals.':'Alignement du programme : 7 des 17 objectifs de développement durable.'
      }; }
    },
    { k:5, type:'bullet',
      fr:{kk:'objectifs au lancement', t:'Les objectifs, et où nous en sommes', d:'Le programme s’est lancé le 10 juin 2026. Le réalisé est à zéro : il se construira cohorte après cohorte.', s:'Cadre de résultats Coastal Futures · réalisé au 8 juin 2026'},
      en:{kk:'objectives at launch', t:'The targets, and where we stand', d:'The programme launched on 10 June 2026. Achieved is at zero: it will build cohort after cohort.', s:'Coastal Futures results framework · achieved as of 8 June 2026'},
      cfg:function(){ var T=tgtEnt(); return {
        items: en()
          ?[{label:'Green entrepreneurs trained',value:0,target:T},{label:'Operational youth hubs',value:0,target:5},{label:'Countries engaged',value:5,target:5}]
          :[{label:'Entrepreneurs verts formés',value:0,target:T},{label:'Hubs jeunesse opérationnels',value:0,target:5},{label:'Pays engagés',value:5,target:5}],
        realLabel: en()?'Achieved':'Réalisé', targetLabel: en()?'Target':'Cible',
        caption: en()?'Programme objectives and current achievement at launch.':'Objectifs du programme et réalisé courant au lancement.'
      }; }
    },
    { k:6, type:'area',
      fr:{kk:'trajectoire de formation', t:'La trajectoire vers 4 000 entrepreneurs formés', d:'Cible de formation sur la feuille de route avril 2026 à mars 2027. La courbe « réalisé » se remplira à mesure des cohortes ; la trajectoire cible est indicative.', s:'Feuille de route Coastal Futures · cible 4 000'},
      en:{kk:'training trajectory', t:'The trajectory toward 4,000 entrepreneurs trained', d:'Training target over the April 2026 to March 2027 roadmap. The “achieved” line fills in cohort by cohort; the target trajectory is indicative.', s:'Coastal Futures roadmap · target 4,000'},
      cfg:function(){ var T=tgtEnt(); var tr=[0,.2,.5,.8,1].map(function(f){return Math.round(T*f);}); return {
        labels: en()?['Apr 26','Jul 26','Oct 26','Jan 27','Mar 27']:['Avr 26','Juil 26','Oct 26','Janv 27','Mars 27'],
        series:[
          { name: en()?'Indicative target trajectory':'Trajectoire cible (indicative)', values:tr, color:P.sand, dashed:true, fill:false },
          { name: en()?'Achieved':'Réalisé', values:[0,0,0,0,0], color:P.teal }
        ],
        yMax:T, yTicks:4,
        caption: en()?'Indicative target trajectory toward '+T.toLocaleString('en-US')+' entrepreneurs trained, against the achieved figure (0 at launch).':'Trajectoire cible indicative vers '+T.toLocaleString('fr-FR')+' entrepreneurs formés, face au réalisé (0 au lancement).'
      }; }
    }
  ];

  function render(){
    var L=en()?COPY.en:COPY.fr;
    set('advChip',L.chip); set('advH1',L.h1); set('advLead',L.lead);
    set('advIntro',L.intro); set('advFoot',L.foot); set('advPrint',L.print);
    document.title = en()?'Coastal Futures | The challenge in data':'Coastal Futures | Le défi en données';
    CARDS.forEach(function(c){
      var t=en()?c.en:c.fr;
      set('k'+c.k,t.kk); set('t'+c.k,t.t); set('d'+c.k,t.d); set('s'+c.k,t.s);
      var el=document.getElementById('chart'+c.k); if(!el) return;
      var cfg=c.cfg(); 
      try{ CFDataviz[c.type](el, cfg); }catch(e){ /* fail-soft */ }
    });
  }

  render();
  try{ new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
})();
