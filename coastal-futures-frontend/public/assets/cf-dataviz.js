/* Coastal Futures — accessible SVG dataviz module (audit v5 §B3).

   A small, dependency-free chart library tuned to the Coastal Futures system :
   teal-family palette, tabular figures, hairline grids, no heavy shadows, brand
   easing on reveal. Every chart is built the same accessible way :

     - the <svg> is aria-hidden + focusable="false" (decorative for AT),
     - a visually-hidden <table class="cf-dv-sr"> carries the same data for screen
       readers and as a no-JS / print fallback,
     - lines use vector-effect:non-scaling-stroke so they stay crisp when the SVG is
       stretched responsively (preserveAspectRatio=none on area/line).

   Eight chart types : area, bars, hbars, groupedBars, stackedBars, donut, progress,
   bullet. Each renders into a container element you pass in :

     CFDataviz.area(el, { labels:['Avr','Mai',…], series:[{name, values, color}],
                          yMax, yTicks, caption });

   Honest-by-default : pass real values. At launch most programme series are 0 with a
   target line; sourced context series carry their own caption. Back-end devs : feed it
   from your metrics API; the module only draws. */
(function(){
  var C={
    teal:'#0A6B5E', soft:'#12B396', bright:'#3ECBB0', deep:'#063D34',
    sand:'#B8823A', sandDeep:'#8A5512', blue:'#2A6FDB',
    ink:'#0C2420', mute:'#5C7B76', faint:'#92ACA7', hair:'#DCE9E6', hairS:'#B4CDC8'
  };
  var SERIES=[C.teal,C.bright,C.sand,C.blue,C.soft,C.deep];

  function css(){
    if(document.getElementById('cf-dv-css')) return;
    var s=document.createElement('style'); s.id='cf-dv-css';
    s.textContent=
    '.cf-dv{font-family:var(--font-sans,system-ui);}'+
    '.cf-dv svg{display:block;width:100%;height:auto;overflow:visible;}'+
    '.cf-dv .cf-dv-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}'+
    '.cf-dv-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px;}'+
    '.cf-dv-legend span{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-mute,#5C7B76);font-feature-settings:"tnum";}'+
    '.cf-dv-legend i{width:11px;height:11px;border-radius:3px;flex:0 0 auto;}'+
    '.cf-dv-xlab{font-size:11px;fill:var(--ink-faint,#92ACA7);font-feature-settings:"tnum";}'+
    '.cf-dv-ylab{font-size:11px;fill:var(--ink-faint,#92ACA7);font-feature-settings:"tnum";}'+
    '.cf-dv-val{font-size:11.5px;fill:var(--ink-2,#244440);font-weight:600;font-feature-settings:"tnum";}'+
    '.cf-dv-grid{stroke:var(--hair,#DCE9E6);stroke-width:1;}';
    document.head.appendChild(s);
  }
  function fmt(n){ try{ return Number(n).toLocaleString('fr-FR'); }catch(e){ return ''+n; } }
  function el(tag,attrs,kids){
    var n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    if(attrs) for(var k in attrs){ if(attrs[k]!=null) n.setAttribute(k,attrs[k]); }
    if(kids) kids.forEach(function(c){ if(c) n.appendChild(c); });
    return n;
  }
  function svg(w,h,opts){
    var a={viewBox:'0 0 '+w+' '+h, width:w, height:h, 'aria-hidden':'true', focusable:'false', role:'presentation',
           style:'width:100%;height:auto;display:block;overflow:visible;aspect-ratio:'+w+' / '+h+';'};
    if(opts&&opts.par) a.preserveAspectRatio=opts.par;
    return el('svg',a);
  }
  function mount(elm, node, srTable, caption){
    elm.classList.add('cf-dv'); elm.innerHTML='';
    if(caption){ node.setAttribute('aria-hidden','true'); }
    elm.appendChild(node);
    if(srTable) elm.appendChild(srTable);
  }
  function srTable(caption, headers, rows){
    var t=document.createElement('table'); t.className='cf-dv-sr';
    var cap=document.createElement('caption'); cap.textContent=caption||''; t.appendChild(cap);
    var thead=document.createElement('thead'), trh=document.createElement('tr');
    headers.forEach(function(h){ var th=document.createElement('th'); th.scope='col'; th.textContent=h; trh.appendChild(th); });
    thead.appendChild(trh); t.appendChild(thead);
    var tb=document.createElement('tbody');
    rows.forEach(function(r){ var tr=document.createElement('tr'); r.forEach(function(c,i){ var cell=document.createElement(i===0?'th':'td'); if(i===0) cell.scope='row'; cell.textContent=c; tr.appendChild(cell); }); tb.appendChild(tr); });
    t.appendChild(tb); return t;
  }
  function legend(items){
    var d=document.createElement('div'); d.className='cf-dv-legend';
    items.forEach(function(it){ var s=document.createElement('span'); s.innerHTML='<i style="background:'+it.color+'"></i>'+it.label; d.appendChild(s); });
    return d;
  }
  function niceMax(v){ if(v<=0) return 1; var p=Math.pow(10,Math.floor(Math.log10(v))); var f=v/p; var n=f<=1?1:f<=2?2:f<=5?5:10; return n*p; }

  /* ---------- 1. AREA / multi-line ---------- */
  function area(elm, cfg){
    css();
    var W=560,H=240, padL=8,padR=8,padT=14,padB=26;
    var iw=W-padL-padR, ih=H-padT-padB;
    var labels=cfg.labels||[], series=cfg.series||[];
    var allMax=cfg.yMax||Math.max(1, series.reduce(function(m,s){ return Math.max(m, Math.max.apply(null,s.values.concat([0]))); },0));
    var yMax=cfg.yMax||niceMax(allMax);
    var ticks=cfg.yTicks||4;
    var n=labels.length, step=n>1?iw/(n-1):iw;
    function X(i){ return padL+step*i; }
    function Y(v){ return padT+ih-(v/yMax)*ih; }
    var g=svg(W,H,{par:'none'});
    // gridlines + y labels (text NOT scaled -> render via separate non-scaling? keep in viewBox but par none distorts text; use HTML axis instead)
    for(var t=0;t<=ticks;t++){
      var yy=padT+ih-(ih/ticks)*t;
      g.appendChild(el('line',{x1:padL,y1:yy,x2:W-padR,y2:yy,class:'cf-dv-grid','vector-effect':'non-scaling-stroke'}));
    }
    series.forEach(function(s,si){
      var col=s.color||SERIES[si%SERIES.length];
      var dPath='', aPath='';
      s.values.forEach(function(v,i){ var x=X(i),y=Y(v); dPath+=(i?'L':'M')+x+' '+y+' '; });
      aPath=dPath+'L'+X(s.values.length-1)+' '+(padT+ih)+' L'+X(0)+' '+(padT+ih)+' Z';
      if(s.fill!==false){
        var gid='cfdvg'+si+Math.random().toString(36).slice(2,6);
        var defs=el('defs',null,[ el('linearGradient',{id:gid,x1:0,y1:0,x2:0,y2:1},[
          el('stop',{offset:'0%','stop-color':col,'stop-opacity':'.22'}),
          el('stop',{offset:'100%','stop-color':col,'stop-opacity':'0'})
        ])]);
        g.appendChild(defs);
        g.appendChild(el('path',{d:aPath,fill:'url(#'+gid+')',stroke:'none'}));
      }
      g.appendChild(el('path',{d:dPath,fill:'none',stroke:col,'stroke-width':s.dashed?2:2.4,'stroke-linejoin':'round','stroke-linecap':'round','vector-effect':'non-scaling-stroke','stroke-dasharray':s.dashed?'5 5':null}));
    });
    // wrapper with HTML axis (so text isn't distorted by par=none)
    var wrap=document.createElement('div');
    wrap.style.cssText='position:relative;padding-left:42px;padding-bottom:20px;';
    var yax=document.createElement('div');
    yax.style.cssText='position:absolute;left:0;top:'+padT+'px;bottom:'+(padB+0)+'px;width:38px;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;padding-right:8px;font-size:11px;color:var(--ink-faint,#92ACA7);font-feature-settings:"tnum";';
    for(var tj=ticks;tj>=0;tj--){ var d=document.createElement('div'); d.textContent=fmt(Math.round(yMax/ticks*tj)); yax.appendChild(d); }
    var xax=document.createElement('div');
    xax.style.cssText='position:absolute;left:42px;right:0;bottom:0;display:flex;justify-content:space-between;font-size:11px;color:var(--ink-faint,#92ACA7);font-feature-settings:"tnum";';
    labels.forEach(function(l){ var d=document.createElement('div'); d.textContent=l; xax.appendChild(d); });
    var holder=document.createElement('div'); holder.appendChild(g);
    wrap.appendChild(yax); wrap.appendChild(holder); wrap.appendChild(xax);

    var rows=labels.map(function(l,i){ return [l].concat(series.map(function(s){ return fmt(s.values[i]); })); });
    var sr=srTable(cfg.caption||'', [cfg.xLabel||'Période'].concat(series.map(function(s){return s.name;})), rows);
    elm.classList.add('cf-dv'); elm.innerHTML=''; elm.appendChild(wrap);
    if(series.length>1) elm.appendChild(legend(series.map(function(s,si){ return {label:s.name,color:s.color||SERIES[si%SERIES.length]}; })));
    elm.appendChild(sr);
  }

  /* ---------- 2. VERTICAL BARS (with optional target line) ---------- */
  function bars(elm, cfg){
    css();
    var labels=cfg.labels||[], values=cfg.values||[];
    var W=560,H=240, padL=8,padR=8,padT=16,padB=42;
    var iw=W-padL-padR, ih=H-padT-padB;
    var yMax=cfg.yMax||niceMax(Math.max.apply(null,values.concat([cfg.target||0,1])));
    var n=values.length, slot=iw/n, bw=Math.min(cfg.barWidth||46, slot*0.6);
    var g=svg(W,H);
    for(var t=0;t<=4;t++){ var yy=padT+ih-(ih/4)*t; g.appendChild(el('line',{x1:padL,y1:yy,x2:W-padR,y2:yy,class:'cf-dv-grid','vector-effect':'non-scaling-stroke'})); }
    values.forEach(function(v,i){
      var x=padL+slot*i+slot/2-bw/2, h=(v/yMax)*ih, y=padT+ih-h;
      var col=(cfg.colors&&cfg.colors[i])||C.teal;
      g.appendChild(el('rect',{x:x,y:y,width:bw,height:Math.max(h,0),rx:5,fill:col}));
      g.appendChild(el('text',{x:x+bw/2,y:y-7,'text-anchor':'middle',class:'cf-dv-val'},[txt(fmt(v))]));
      g.appendChild(el('text',{x:x+bw/2,y:padT+ih+18,'text-anchor':'middle',class:'cf-dv-xlab'},[txt(labels[i])]));
    });
    if(cfg.target){
      var ty=padT+ih-(cfg.target/yMax)*ih;
      g.appendChild(el('line',{x1:padL,y1:ty,x2:W-padR,y2:ty,stroke:C.sand,'stroke-width':1.6,'stroke-dasharray':'6 5','vector-effect':'non-scaling-stroke'}));
      g.appendChild(el('text',{x:W-padR,y:ty-6,'text-anchor':'end',class:'cf-dv-val',fill:C.sandDeep},[txt((cfg.targetLabel||'Cible')+' '+fmt(cfg.target))]));
    }
    var rows=labels.map(function(l,i){ return [l, fmt(values[i])]; });
    elm.classList.add('cf-dv'); elm.innerHTML=''; elm.appendChild(g);
    elm.appendChild(srTable(cfg.caption||'', [cfg.xLabel||'Catégorie', cfg.yLabel||'Valeur'], rows));
  }

  /* ---------- 3. HORIZONTAL BARS ---------- */
  function hbars(elm, cfg){
    css();
    var items=cfg.items||[];
    var rowH=cfg.rowH||34, gap=12, padL=4, labelW=cfg.labelW||150, valW=54;
    var W=560, H=items.length*(rowH+gap)+6;
    var max=cfg.max||niceMax(Math.max.apply(null,items.map(function(i){return i.value;}).concat([1])));
    var trackW=W-labelW-valW-padL;
    var g=svg(W,H);
    items.forEach(function(it,i){
      var y=i*(rowH+gap)+6;
      g.appendChild(el('text',{x:padL,y:y+rowH/2+4,class:'cf-dv-xlab',style:'fill:var(--ink-2,#244440);font-size:12.5px;'},[txt(it.label)]));
      g.appendChild(el('rect',{x:labelW,y:y,width:trackW,height:rowH,rx:6,fill:'var(--canvas-soft,#F8FBFA)',stroke:C.hair}));
      var w=Math.max((it.value/max)*trackW,2);
      g.appendChild(el('rect',{x:labelW,y:y,width:w,height:rowH,rx:6,fill:it.color||C.teal}));
      g.appendChild(el('text',{x:W-2,y:y+rowH/2+4,'text-anchor':'end',class:'cf-dv-val'},[txt(fmt(it.value)+(cfg.unit||''))]));
    });
    elm.classList.add('cf-dv'); elm.innerHTML=''; elm.appendChild(g);
    elm.appendChild(srTable(cfg.caption||'', [cfg.xLabel||'Catégorie', cfg.yLabel||'Valeur'], items.map(function(i){return [i.label,fmt(i.value)+(cfg.unit||'')];})));
  }

  /* ---------- 4. GROUPED BARS (objectif vs réalisé) ---------- */
  function groupedBars(elm, cfg){
    css();
    var labels=cfg.labels||[], groups=cfg.groups||[];
    var W=560,H=250, padL=8,padR=8,padT=16,padB=46;
    var iw=W-padL-padR, ih=H-padT-padB;
    var yMax=cfg.yMax||niceMax(groups.reduce(function(m,gp){return Math.max(m,Math.max.apply(null,gp.values.concat([0])));},1));
    var n=labels.length, slot=iw/n, gw=slot*0.6, bw=gw/groups.length;
    var g=svg(W,H);
    for(var t=0;t<=4;t++){ var yy=padT+ih-(ih/4)*t; g.appendChild(el('line',{x1:padL,y1:yy,x2:W-padR,y2:yy,class:'cf-dv-grid','vector-effect':'non-scaling-stroke'})); }
    labels.forEach(function(l,i){
      var gx=padL+slot*i+slot/2-gw/2;
      groups.forEach(function(gp,gi){
        var v=gp.values[i]||0, h=(v/yMax)*ih, x=gx+bw*gi, y=padT+ih-h;
        g.appendChild(el('rect',{x:x,y:y,width:bw-3,height:Math.max(h,0),rx:4,fill:gp.color||SERIES[gi]}));
      });
      g.appendChild(el('text',{x:padL+slot*i+slot/2,y:padT+ih+18,'text-anchor':'middle',class:'cf-dv-xlab'},[txt(l)]));
    });
    elm.classList.add('cf-dv'); elm.innerHTML=''; elm.appendChild(g);
    elm.appendChild(legend(groups.map(function(gp,gi){return {label:gp.name,color:gp.color||SERIES[gi]};})));
    var rows=labels.map(function(l,i){ return [l].concat(groups.map(function(gp){return fmt(gp.values[i]||0);})); });
    elm.appendChild(srTable(cfg.caption||'', [cfg.xLabel||'Indicateur'].concat(groups.map(function(gp){return gp.name;})), rows));
  }

  /* ---------- 5. STACKED BARS ---------- */
  function stackedBars(elm, cfg){
    css();
    var labels=cfg.labels||[], series=cfg.series||[];
    var W=560,H=250, padL=8,padR=8,padT=16,padB=46;
    var iw=W-padL-padR, ih=H-padT-padB;
    var totals=labels.map(function(_,i){ return series.reduce(function(s,se){return s+(se.values[i]||0);},0); });
    var yMax=cfg.yMax||niceMax(Math.max.apply(null,totals.concat([1])));
    var n=labels.length, slot=iw/n, bw=Math.min(48, slot*0.6);
    var g=svg(W,H);
    for(var t=0;t<=4;t++){ var yy=padT+ih-(ih/4)*t; g.appendChild(el('line',{x1:padL,y1:yy,x2:W-padR,y2:yy,class:'cf-dv-grid','vector-effect':'non-scaling-stroke'})); }
    labels.forEach(function(l,i){
      var x=padL+slot*i+slot/2-bw/2, acc=0;
      series.forEach(function(se,si){
        var v=se.values[i]||0, h=(v/yMax)*ih; acc+=h;
        var y=padT+ih-acc;
        g.appendChild(el('rect',{x:x,y:y,width:bw,height:Math.max(h,0),rx:si===series.length-1?4:0,fill:se.color||SERIES[si]}));
      });
      g.appendChild(el('text',{x:x+bw/2,y:padT+ih+18,'text-anchor':'middle',class:'cf-dv-xlab'},[txt(l)]));
    });
    elm.classList.add('cf-dv'); elm.innerHTML=''; elm.appendChild(g);
    elm.appendChild(legend(series.map(function(se,si){return {label:se.name,color:se.color||SERIES[si]};})));
    var rows=labels.map(function(l,i){ return [l].concat(series.map(function(se){return fmt(se.values[i]||0);})); });
    elm.appendChild(srTable(cfg.caption||'', [cfg.xLabel||'Catégorie'].concat(series.map(function(se){return se.name;})), rows));
  }

  /* ---------- 6. DONUT ---------- */
  function donut(elm, cfg){
    css();
    var slices=cfg.slices||[]; var total=slices.reduce(function(s,x){return s+x.value;},0)||1;
    var W=240,H=240, cx=120,cy=120, r=92, rin=58;
    var g=svg(W,H); var a0=-Math.PI/2;
    if(slices.reduce(function(s,x){return s+x.value;},0)===0){
      g.appendChild(el('circle',{cx:cx,cy:cy,r:(r+rin)/2,fill:'none',stroke:C.hair,'stroke-width':r-rin}));
    } else slices.forEach(function(sl,i){
      var frac=sl.value/total, a1=a0+frac*Math.PI*2;
      var large=(a1-a0)>Math.PI?1:0;
      var x0=cx+r*Math.cos(a0), y0=cy+r*Math.sin(a0), x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
      var xi0=cx+rin*Math.cos(a1), yi0=cy+rin*Math.sin(a1), xi1=cx+rin*Math.cos(a0), yi1=cy+rin*Math.sin(a0);
      var d='M'+x0+' '+y0+' A'+r+' '+r+' 0 '+large+' 1 '+x1+' '+y1+' L'+xi0+' '+yi0+' A'+rin+' '+rin+' 0 '+large+' 0 '+xi1+' '+yi1+' Z';
      g.appendChild(el('path',{d:d,fill:sl.color||SERIES[i%SERIES.length]}));
      a0=a1;
    });
    if(cfg.centerTop||cfg.centerLabel){
      g.appendChild(el('text',{x:cx,y:cy-2,'text-anchor':'middle',style:'font-family:var(--font-display);font-weight:300;font-size:30px;fill:var(--ink,#0C2420);font-feature-settings:"tnum";'},[txt(cfg.centerTop||'')]));
      g.appendChild(el('text',{x:cx,y:cy+18,'text-anchor':'middle',style:'font-size:12px;fill:var(--ink-mute,#5C7B76);'},[txt(cfg.centerLabel||'')]));
    }
    var wrap=document.createElement('div'); wrap.style.cssText='display:flex;align-items:center;gap:22px;flex-wrap:wrap;';
    var gh=document.createElement('div'); gh.style.cssText='width:200px;max-width:48%;flex:0 0 auto;'; gh.appendChild(g);
    var lg=document.createElement('div'); lg.className='cf-dv-legend'; lg.style.flexDirection='column';
    slices.forEach(function(sl,i){ var s=document.createElement('span'); s.innerHTML='<i style="background:'+(sl.color||SERIES[i%SERIES.length])+'"></i>'+sl.label+' <b style="color:var(--ink,#0C2420);margin-left:4px;font-feature-settings:\'tnum\'">'+fmt(sl.value)+(cfg.unit||'')+'</b>'; lg.appendChild(s); });
    wrap.appendChild(gh); wrap.appendChild(lg);
    elm.classList.add('cf-dv'); elm.innerHTML=''; elm.appendChild(wrap);
    elm.appendChild(srTable(cfg.caption||'', [cfg.xLabel||'Catégorie', cfg.yLabel||'Valeur'], slices.map(function(s){return [s.label,fmt(s.value)+(cfg.unit||'')];})));
  }

  /* ---------- 7. PROGRESS RING (avancement vers la cible) ---------- */
  function progress(elm, cfg){
    css();
    var val=cfg.value||0, target=cfg.target||100, pct=Math.max(0,Math.min(1,val/target));
    var W=200,H=200,cx=100,cy=100,r=78,sw=16;
    var circ=2*Math.PI*r, off=circ*(1-pct);
    var g=svg(W,H);
    g.appendChild(el('circle',{cx:cx,cy:cy,r:r,fill:'none',stroke:C.hair,'stroke-width':sw}));
    g.appendChild(el('circle',{cx:cx,cy:cy,r:r,fill:'none',stroke:cfg.color||C.teal,'stroke-width':sw,'stroke-linecap':'round','stroke-dasharray':circ,'stroke-dashoffset':off,transform:'rotate(-90 '+cx+' '+cy+')'}));
    g.appendChild(el('text',{x:cx,y:cy-2,'text-anchor':'middle',style:'font-family:var(--font-display);font-weight:300;font-size:34px;fill:var(--ink,#0C2420);font-feature-settings:"tnum";'},[txt(Math.round(pct*100)+'%')]));
    g.appendChild(el('text',{x:cx,y:cy+20,'text-anchor':'middle',style:'font-size:12px;fill:var(--ink-mute,#5C7B76);font-feature-settings:"tnum";'},[txt(fmt(val)+' / '+fmt(target))]));
    var wrap=document.createElement('div'); wrap.style.cssText='display:flex;align-items:center;gap:20px;flex-wrap:wrap;';
    var gh=document.createElement('div'); gh.style.cssText='width:160px;flex:0 0 auto;'; gh.appendChild(g);
    wrap.appendChild(gh);
    if(cfg.label){ var lab=document.createElement('div'); lab.style.cssText='font-size:13.5px;color:var(--ink-mute,#5C7B76);max-width:240px;line-height:1.5;'; lab.textContent=cfg.label; wrap.appendChild(lab); }
    elm.classList.add('cf-dv'); elm.innerHTML=''; elm.appendChild(wrap);
    elm.appendChild(srTable(cfg.caption||'', ['Indicateur','Réalisé','Cible','Avancement'], [[cfg.name||'Avancement', fmt(val), fmt(target), Math.round(pct*100)+'%']]));
  }

  /* ---------- 8. BULLET (réalisé vs cible, par ligne) ---------- */
  function bullet(elm, cfg){
    css();
    var items=cfg.items||[]; var rowH=22, gap=22, labelW=cfg.labelW||168, valW=92, padT=4;
    var W=560, H=items.length*(rowH+gap)+padT;
    var trackW=W-labelW-valW;
    var g=svg(W,H);
    items.forEach(function(it,i){
      var y=padT+i*(rowH+gap);
      var max=it.target||niceMax(it.value)||1;
      g.appendChild(el('text',{x:0,y:y+rowH/2+4,class:'cf-dv-xlab',style:'fill:var(--ink-2,#244440);font-size:12.5px;'},[txt(it.label)]));
      g.appendChild(el('rect',{x:labelW,y:y+4,width:trackW,height:rowH-8,rx:5,fill:'var(--canvas-soft,#F8FBFA)',stroke:C.hair}));
      var w=Math.max((it.value/max)*trackW, it.value>0?3:0);
      if(w>0) g.appendChild(el('rect',{x:labelW,y:y+4,width:w,height:rowH-8,rx:5,fill:it.color||C.teal}));
      // target marker
      var tx=labelW+trackW; // target at 100% of track (track == target)
      g.appendChild(el('line',{x1:tx-1,y1:y,x2:tx-1,y2:y+rowH,stroke:C.sandDeep,'stroke-width':2.4,'vector-effect':'non-scaling-stroke'}));
      g.appendChild(el('text',{x:W,y:y+rowH/2+4,'text-anchor':'end',class:'cf-dv-val'},[txt(fmt(it.value)+' / '+fmt(it.target))]));
    });
    elm.classList.add('cf-dv'); elm.innerHTML=''; elm.appendChild(g);
    elm.appendChild(legend([{label:(cfg.realLabel||'Réalisé'),color:C.teal},{label:(cfg.targetLabel||'Cible'),color:C.sandDeep}]));
    elm.appendChild(srTable(cfg.caption||'', ['Indicateur','Réalisé','Cible'], items.map(function(i){return [i.label,fmt(i.value),fmt(i.target)];})));
  }

  function txt(s){ return document.createTextNode(s==null?'':String(s)); }

  window.CFDataviz={ palette:C, series:SERIES, area:area, bars:bars, hbars:hbars, groupedBars:groupedBars, stackedBars:stackedBars, donut:donut, progress:progress, bullet:bullet };
})();
