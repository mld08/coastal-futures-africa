/* Coastal Futures — admin inbox controller (audit #22c / #22d).
   The home for the member↔team threads written by the users-page composer and by
   members. Reply writes a message as the SESSION (verified team). Close/reopen is an
   ADMIN-only action here (members can't close their own thread). Everything persists to
   CFCol('threads'/'messages') + journals. Bilingual, re-renders on html[lang]. */
(function(){
  if(!window.CFCol) return;
  function $(x){return document.getElementById(x);}
  var sess=(window.CFAdmin&&CFAdmin.session&&CFAdmin.session())||{name:'Équipe',role:''};
  function lang(){return document.documentElement.lang==='en'?'en':'fr';}
  function T(fr,en){return lang()==='en'?en:fr;}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function ini(n){return (n||'').split(/\s+/).map(function(x){return x[0]||'';}).join('').slice(0,2).toUpperCase();}
  function isTeam(from){ return !!(from&&(from.verified===true||['team','super','content','country','moderator'].indexOf(from.role)>=0)); }
  function fmtTime(iso){try{var d=new Date(iso);return d.toLocaleTimeString(lang()==='en'?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
  function fmtDay(iso){try{var d=new Date(iso);return d.toLocaleDateString(lang()==='en'?'en-GB':'fr-FR',{day:'numeric',month:'short'});}catch(e){return '';}}

  var state={filter:'all', open:null};
  function msgsOf(tid){ return CFCol.all('messages').filter(function(m){return m.threadId===tid;}).sort(function(a,b){return new Date(a.at)-new Date(b.at);}); }
  function lastMsg(tid){ var m=msgsOf(tid); return m[m.length-1]||null; }
  function unread(tid){ return CFCol.all('messages').filter(function(m){return m.threadId===tid && !m.read && !isTeam(m.from);}).length; }
  function subj(t){ return CFCol.t(t.subject,lang())||t.with||''; }
  function buildBubbles(msgs){
    var bubbles='', lastDay='';
    msgs.forEach(function(m){ var day=fmtDay(m.at); if(day!==lastDay){ bubbles+='<div class="m-day">'+day+'</div>'; lastDay=day; }
      var team=isTeam(m.from);
      bubbles+='<div class="m-row'+(team?' me':'')+'"><div class="m-bub">'+esc(m.body)+'<span class="m-meta">'+(team?(esc(m.from.name)+(m.from.verified?' <i class="ti ti-rosette-discount-check vchk"></i>':'')+' · '):'')+fmtTime(m.at)+'</span></div></div>';
    });
    return bubbles;
  }

  function renderList(){
    var threads=CFCol.all('threads').slice().sort(function(a,b){ var la=lastMsg(a.id),lb=lastMsg(b.id); return new Date((lb&&lb.at)||0)-new Date((la&&la.at)||0); });
    if(state.filter==='unread') threads=threads.filter(function(t){return unread(t.id)>0;});
    else if(state.filter==='closed') threads=threads.filter(function(t){return t.closed;});
    var list=$('mList');
    if(!threads.length){ list.innerHTML='<div class="m-empty">'+T('Aucune conversation.','No conversation.')+'</div>'; }
    else list.innerHTML=threads.map(function(t){
      var lm=lastMsg(t.id), u=unread(t.id);
      var prev=lm?((isTeam(lm.from)?(T('Vous : ','You: ')):'')+lm.body):'';
      return '<button class="m-item'+(state.open===t.id?' on':'')+'" data-tid="'+esc(t.id)+'"><div class="m-av">'+esc(ini(t.with))+'</div><div class="m-it"><div class="m-ih"><span class="m-nm">'+esc(t.with)+'</span><span class="m-tm tnum">'+(lm?fmtDay(lm.at):'')+'</span></div><div class="m-sub">'+esc(subj(t))+'</div><div class="m-prev">'+esc(prev).slice(0,60)+'</div></div>'+(u>0?'<span class="m-badge tnum">'+u+'</span>':'')+(t.closed?'<span class="m-lock"><i class="ti ti-lock"></i></span>':'')+'</button>';
    }).join('');
    [].slice.call(list.querySelectorAll('[data-tid]')).forEach(function(b){ b.addEventListener('click',function(){ openThread(b.getAttribute('data-tid')); }); });
    // filter counts
    var fc=$('fUnread'); if(fc){ var n=CFCol.all('threads').filter(function(t){return unread(t.id)>0;}).length; fc.textContent=n; fc.style.display=n?'':'none'; }
  }

  function openThread(tid){
    state.open=tid;
    // mark incoming messages read
    CFCol.all('messages').forEach(function(m){ if(m.threadId===tid && !m.read && !isTeam(m.from)){ CFCol.patch('messages',m.id,{read:true}); } });
    renderList(); renderConv();
    var wrap=document.querySelector('.messenger'); if(wrap) wrap.classList.add('conv-open');
  }
  function renderConv(){
    var t=CFCol.get('threads',state.open);
    var conv=$('mConv');
    if(!t){ conv.innerHTML='<div class="m-placeholder"><i class="ti ti-messages"></i><div>'+T('Sélectionnez une conversation.','Select a conversation.')+'</div></div>'; return; }
    var msgs=msgsOf(t.id);
    var bubbles=buildBubbles(msgs);
    var composer = t.closed
      ? '<div class="m-closed"><i class="ti ti-lock"></i>'+T('Conversation close. Rouvrez-la pour répondre.','Conversation closed. Reopen it to reply.')+'</div>'
      : '<div class="m-composer"><textarea id="mInput" placeholder="'+T('Écrire une réponse…','Write a reply…')+'" rows="1"></textarea><button class="btn btn-pri btn-sm" id="mSend"><i class="ti ti-send"></i>'+T('Envoyer','Send')+'</button></div>';
    conv.innerHTML=
      '<div class="m-chead"><button class="m-back" id="mBack" aria-label="Retour"><i class="ti ti-arrow-left"></i></button><div class="m-av">'+esc(ini(t.with))+'</div><div class="m-cht"><div class="m-cn">'+esc(t.with)+'</div><div class="m-cs">'+esc(subj(t))+(t.withEmail?(' · '+esc(t.withEmail)):'')+'</div></div>'+
        '<button class="btn btn-light btn-sm" id="mClose">'+(t.closed?('<i class="ti ti-lock-open"></i>'+T('Rouvrir','Reopen')):('<i class="ti ti-lock"></i>'+T('Clore','Close')))+'</button></div>'+
      '<div class="m-stream" id="mStream">'+bubbles+'</div>'+composer;
    var stream=$('mStream'); if(stream){ stream.setAttribute('data-n', String(msgs.length)); stream.scrollTop=stream.scrollHeight; }
    var back=$('mBack'); if(back) back.addEventListener('click',function(){ state.open=null; var w=document.querySelector('.messenger'); if(w) w.classList.remove('conv-open'); renderList(); renderConv(); });
    var send=$('mSend'); if(send) send.addEventListener('click',sendReply);
    var inp=$('mInput'); if(inp){ inp.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendReply(); } }); inp.addEventListener('input',function(){ this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,140)+'px'; }); inp.focus(); }
    var cl=$('mClose'); if(cl) cl.addEventListener('click',function(){ toggleClose(t.id); });
  }
  function sendReply(){
    var inp=$('mInput'); if(!inp) return; var body=inp.value.trim(); if(!body) return;
    CFCol.push('messages',{id:'msg-'+Date.now().toString(36),threadId:state.open,from:{name:sess.name,role:sess.role,verified:true},at:new Date().toISOString(),body:body,read:true});
    try{ CFAudit.log({actor:{name:sess.name,role:sess.role},action:'message.reply',target:{kind:'thread',id:state.open}}); }catch(e){}
    renderConv(); renderList();
  }
  function toggleClose(tid){
    var t=CFCol.get('threads',tid); if(!t) return; var now=!t.closed;
    CFCol.patch('threads',tid,{closed:now, closedBy:now?{name:sess.name,role:sess.role}:null});
    try{ CFAudit.log({actor:{name:sess.name,role:sess.role},action:now?'thread.close':'thread.reopen',target:{kind:'thread',id:tid,label:t.with}}); }catch(e){}
    renderConv(); renderList();
  }

  // ---- polling « temps réel » (backend API) ---------------------------
  // Rafraîchit fils + messages toutes les POLL_PERIOD ms (onglet visible) en
  // FUSIONNANT (union par id) : on ne perd pas une réponse tout juste envoyée.
  // Seul le flux #mStream de la conversation ouverte est mis à jour -> le
  // composer et son texte en cours de saisie sont préservés.
  var POLL_PERIOD=5000, polling=false;
  function apiOn(){ return !!(window.CFApi && window.CFApi.useApi); }
  function mergeCol(name, fresh){
    try{
      var local=CFCol.all(name)||[];
      var ids={}; fresh.forEach(function(x){ if(x&&x.id) ids[x.id]=1; });
      var extra=local.filter(function(x){ return x&&x.id&&!ids[x.id]; }); // local-only (optimiste)
      localStorage.setItem('cf-col-'+name, JSON.stringify(fresh.concat(extra)));
    }catch(e){}
  }
  function updateStream(){
    if(!state.open) return;
    var t=CFCol.get('threads',state.open); if(!t) return;
    var stream=$('mStream'); if(!stream) return;               // fil clos -> pas de flux à MAJ
    // marquer lus les nouveaux messages entrants (le fil est ouvert)
    CFCol.all('messages').forEach(function(m){ if(m.threadId===state.open && !m.read && !isTeam(m.from)){ try{ CFCol.patch('messages',m.id,{read:true}); }catch(e){} } });
    var msgs=msgsOf(t.id);
    if(String(msgs.length)===(stream.getAttribute('data-n')||'')) return; // rien de nouveau
    var nearBottom=stream.scrollTop+stream.clientHeight >= stream.scrollHeight-48, prev=stream.scrollTop;
    stream.innerHTML=buildBubbles(msgs);
    stream.setAttribute('data-n', String(msgs.length));
    stream.scrollTop = nearBottom ? stream.scrollHeight : prev;
  }
  function pollRefresh(){
    if(polling || !apiOn() || document.hidden) return;
    polling=true;
    Promise.all([ CFApi.get('/threads').catch(function(){return null;}), CFApi.get('/messages').catch(function(){return null;}) ])
      .then(function(r){
        var changed=false;
        if(Array.isArray(r[0])){ mergeCol('threads', r[0]); changed=true; }
        if(Array.isArray(r[1])){ mergeCol('messages', r[1]); changed=true; }
        if(changed){ renderList(); updateStream(); }
      }).then(function(){ polling=false; }, function(){ polling=false; });
  }
  function startPolling(){
    setInterval(function(){ if(document.visibilityState==='visible') pollRefresh(); }, POLL_PERIOD);
    document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible') pollRefresh(); });
  }

  function init(){
    [].slice.call(document.querySelectorAll('.m-filter [data-f]')).forEach(function(b){ b.addEventListener('click',function(){ document.querySelectorAll('.m-filter [data-f]').forEach(function(x){x.classList.remove('on');}); b.classList.add('on'); state.filter=b.getAttribute('data-f'); renderList(); }); });
    renderList(); renderConv();
    if(apiOn()) startPolling();
    try{ new MutationObserver(function(){ renderList(); renderConv(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']}); }catch(e){}
  }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded',init);
})();
