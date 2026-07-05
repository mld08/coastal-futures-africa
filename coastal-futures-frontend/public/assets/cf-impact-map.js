/* Coastal Futures — shared impact-map renderer (canonical v4).
   Mirrors carte-impact.html: type-coloured pins, flat country tags, clusters, mangrove zones.
   Requires Leaflet (and leaflet.markercluster for clustering — falls back to a layerGroup).
   Usage:
     CFImpactMap.render(map, { cluster:true, mangrove:true, fit:true, onPin:fn });
*/
(function(){
  var TYPE = {
    entreprise:{label:'Entreprise verte', labelEn:'Green enterprise', color:'#063D34', icon:'ti-leaf'},
    hub:{label:'Hub jeunesse', labelEn:'Youth hub', color:'#3ECBB0', icon:'ti-building-community'},
    mangroves:{label:'Restauration de mangroves', labelEn:'Mangrove restoration', color:'#12B396', icon:'ti-trees'},
    recyclage:{label:'Recyclage et déchets', labelEn:'Recycling and waste', color:'#B8823A', icon:'ti-recycle'},
    energie:{label:'Énergie renouvelable', labelEn:'Renewable energy', color:'#0A6B5E', icon:'ti-bolt'}
  };
  var STATUT = { 'Partenaire d\'exécution':'bdg-live', 'Accord en cours':'bdg-pend', 'Labellisé':'bdg-live', 'En incubation':'bdg-pend', 'Soumis':'bdg-teal', 'Brouillon':'bdg-teal', 'Archivé':'bdg-teal' };

  // Youth-hub network at launch (10 June 2026) : no fabricated project pipeline.
  var COUNTRIES = [
    {name:'Sénégal', hub:'Climate Linguère Club', lat:14.9, lng:-14.4},
    {name:'Ghana', hub:'Hub jeunesse Coastal Futures', lat:7.6, lng:-1.2},
    {name:'Sierra Leone', hub:'Craving 4 Development', lat:8.7, lng:-11.9},
    {name:'Guinée-Conakry', hub:'Hub jeunesse Coastal Futures', lat:10.7, lng:-11.3},
    {name:'Liberia', hub:'Hub jeunesse Coastal Futures', lat:6.7, lng:-9.5}
  ];

  var projects = [
    {id:1, name:'Climate Linguère Club', type:'hub', pays:'Sénégal', ville:'Linguère', statut:'Partenaire d\'exécution', lat:15.40, lng:-15.12, impact:'Hub jeunesse · partenaire d\'exécution'},
    {id:2, name:'Craving 4 Development', type:'hub', pays:'Sierra Leone', ville:'Freetown', statut:'Partenaire d\'exécution', lat:8.48, lng:-13.23, impact:'Hub jeunesse · partenaire d\'exécution'},
    {id:3, name:'Hub jeunesse Coastal Futures — Ghana', type:'hub', pays:'Ghana', ville:'Accra', statut:'Accord en cours', lat:5.61, lng:-0.18, impact:'Accord d\'exécution en cours de signature'},
    {id:4, name:'Hub jeunesse Coastal Futures — Guinée', type:'hub', pays:'Guinée-Conakry', ville:'Conakry', statut:'Accord en cours', lat:9.64, lng:-13.58, impact:'Accord d\'exécution en cours de signature'},
    {id:5, name:'Hub jeunesse Coastal Futures — Liberia', type:'hub', pays:'Liberia', ville:'Monrovia', statut:'Accord en cours', lat:6.33, lng:-10.76, impact:'Accord d\'exécution en cours de signature'}
  ];
  try{ var _sp=localStorage.getItem('cf-map-projects'); if(_sp){ var _arr=JSON.parse(_sp); if(Array.isArray(_arr)&&_arr.length) projects=_arr; } }catch(e){}

  var MANGROVE = [
    {pays:'Guinée-Conakry', site:'Rio Nuñez & littoral de Conakry', ha:203000, lat:10.05, lng:-14.35},
    {pays:'Sénégal', site:'Delta du Saloum & Casamance', ha:118000, lat:13.55, lng:-16.5},
    {pays:'Sierra Leone', site:'Estuaire de la Sierra Leone & Yawri Bay', ha:104000, lat:8.45, lng:-13.05},
    {pays:'Liberia', site:'Mangroves de Mesurado & Marshall', ha:19000, lat:6.22, lng:-10.55},
    {pays:'Ghana', site:'Delta de la Volta & lagunes côtières', ha:14000, lat:5.85, lng:0.62}
  ];
  var MANG_EXTENT=[
    [[13.85,-16.86],[13.72,-16.55],[13.5,-16.45],[13.35,-16.6],[13.45,-16.82],[13.65,-16.9]],
    [[12.6,-16.85],[12.5,-16.55],[12.33,-16.5],[12.28,-16.72],[12.42,-16.88]],
    [[10.9,-14.9],[10.6,-14.4],[10.1,-14.2],[9.7,-13.7],[9.5,-13.4],[9.62,-13.25],[9.95,-13.55],[10.4,-14.15],[10.85,-14.7]],
    [[8.7,-13.3],[8.5,-12.95],[8.25,-12.8],[8.15,-13.05],[8.4,-13.25]],
    [[6.4,-10.85],[6.25,-10.6],[6.1,-10.4],[6.05,-10.6],[6.22,-10.8]],
    [[5.92,0.45],[5.78,0.7],[5.7,0.98],[5.82,1.0],[5.95,0.65]]
  ];

  function fmt(n){return (''+n).replace(/\B(?=(\d{3})+(?!\d))/g,'\u202f');}
  function isEn(){return (document.documentElement.lang==='en');}

  function pinIcon(type){
    var t=TYPE[type]||TYPE.entreprise;
    return L.divIcon({ className:'', html:'<div class="cf-pin2" style="--c:'+t.color+'"><i class="ti '+t.icon+'"></i></div>', iconSize:[30,30], iconAnchor:[15,15] });
  }
  function countryIcon(c){
    var nm=c.name.replace('-Conakry','');
    var w=Math.round(56+nm.length*7.4);
    return { icon:L.divIcon({className:'', html:'<div class="ctry-tag"><span class="cc"><i class="ti ti-building-community"></i></span><span class="cl">'+nm+'</span></div>', iconSize:[w,26], iconAnchor:[w/2,13]}), w:w };
  }

  function clusterGroup(){
    if(L.markerClusterGroup){
      return L.markerClusterGroup({
        showCoverageOnHover:false, maxClusterRadius:46, spiderfyOnMaxZoom:true, chunkedLoading:true,
        iconCreateFunction:function(cl){ var n=cl.getChildCount(); var s=n<10?'s':(n<25?'m':'l'); return L.divIcon({html:'<div class="cf-cluster '+s+'">'+n+'</div>', className:'', iconSize:null}); }
      });
    }
    return L.layerGroup();
  }

  function render(map, opts){
    opts = opts || {};
    var out = { markers:{}, ctryMarkers:{}, fmt:fmt, TYPE:TYPE, COUNTRIES:COUNTRIES, projects:projects };

    // Mangrove zones (clean teal extent + national figure labels)
    if(opts.mangrove){
      var gMang=L.layerGroup().addTo(map);
      var polys=MANG_EXTENT.map(function(poly){ var p=L.polygon(poly,{color:'#0A6B5E',weight:1,opacity:.5,fillColor:'#12B396',fillOpacity:.42,smoothFactor:1.4}); gMang.addLayer(p); return p; });
      MANGROVE.forEach(function(mg){
        var lab=L.marker([mg.lat,mg.lng],{keyboard:false,zIndexOffset:200,icon:L.divIcon({className:'',html:'<div style="display:flex;justify-content:center"><span class="mang-lab"><i class="ti ti-trees"></i>'+fmt(mg.ha)+' ha</span></div>',iconSize:[130,20],iconAnchor:[65,10]})});
        lab.bindPopup('<div class="pop"><div class="pt">'+mg.site+'</div><div class="pll"><i class="ti ti-map-pin"></i>'+mg.pays.replace('-Conakry','')+'</div><div class="pimp"><i class="ti ti-trees"></i>'+(isEn()?'Mangrove cover':'Couvert de mangrove')+' \u2248 '+fmt(mg.ha)+' ha</div><div class="pll" style="margin:0;font-size:11px;color:var(--ink-faint)">Source : Global Mangrove Watch (v3)</div></div>');
        gMang.addLayer(lab);
      });
      function syncMang(){ var z=map.getZoom(); var f=z<=6?.42:z>=10?0:.42*(10-z)/4; var o=z<=6?.55:z>=10?0:.55*(10-z)/4; polys.forEach(function(p){p.setStyle({fillOpacity:f,opacity:o});}); }
      map.on('zoomend', syncMang);
      out.gMang=gMang;
    }

    // Country tags
    if(opts.countryTags!==false){
      var gCountry=L.layerGroup().addTo(map);
      COUNTRIES.forEach(function(c){
        var ci=countryIcon(c);
        var m=L.marker([c.lat,c.lng],{icon:ci.icon, zIndexOffset:400, keyboard:false});
        m.on('click', function(){ if(opts.onCountry) opts.onCountry(c.name); });
        gCountry.addLayer(m); out.ctryMarkers[c.name]=m;
      });
      out.gCountry=gCountry;
    }

    // Project pins
    if(opts.projectPins!==false){
      var gProjects = (opts.cluster!==false) ? clusterGroup() : L.layerGroup();
      projects.forEach(function(p){
        var t=TYPE[p.type]||TYPE.entreprise;
        var m=L.marker([p.lat,p.lng], {icon:pinIcon(p.type), zIndexOffset:600});
        if(opts.popups!==false){
          var stCls=STATUT[p.statut]||'bdg-teal';
          var label=isEn()?t.labelEn:t.label;
          m.bindPopup('<div class="pop"><div class="pt">'+p.name+'</div>'+
            '<div class="pll"><i class="ti ti-map-pin"></i>'+p.ville+', '+p.pays.replace('-Conakry','')+'</div>'+
            '<div class="prow"><span class="bdg '+stCls+'"><span class="dot"></span>'+p.statut+'</span><span class="proj-type" style="color:'+t.color+'"><i class="ti '+t.icon+'" style="font-size:13px"></i>'+label+'</span></div>'+
            '<div class="pimp"><i class="ti ti-chart-bar"></i>'+p.impact+'</div>'+
            (opts.ficheHref!==null ? '<a class="pbtn" href="'+(opts.ficheHref||'fiche-hub.html')+'">'+(isEn()?'View hub':'Voir le hub')+' <i class="ti ti-arrow-right"></i></a>' : '')+
            '</div>');
        }
        if(opts.onPin) m.on('click', function(){ opts.onPin(p, m); });
        gProjects.addLayer(m); out.markers[p.id]=m;
      });
      map.addLayer(gProjects);
      out.gProjects=gProjects;
    }

    // Fit bounds to everything shown
    if(opts.fit!==false){
      var pts=[];
      projects.forEach(function(p){pts.push([p.lat,p.lng]);});
      COUNTRIES.forEach(function(c){pts.push([c.lat,c.lng]);});
      if(pts.length){ map.fitBounds(L.latLngBounds(pts).pad(0.12)); }
    }
    return out;
  }

  window.CFImpactMap = { TYPE:TYPE, STATUT:STATUT, COUNTRIES:COUNTRIES, projects:projects, MANGROVE:MANGROVE, fmt:fmt, pinIcon:pinIcon, countryIcon:countryIcon, render:render };
})();
