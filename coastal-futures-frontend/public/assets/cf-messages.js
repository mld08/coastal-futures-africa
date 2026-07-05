/* Coastal Futures — messaging engine.
   Renders a real multi-conversation inbox into the app shell of messagerie.html.
   Bilingual (reads <html lang>, re-renders on change). Mock data, no backend. */
(function(){
  'use strict';
  function $(s,r){return (r||document).querySelector(s);}
  function lang(){return document.documentElement.lang==='en'?'en':'fr';}
  function L(o){return o?(o[lang()]||o.fr||''):'';}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  var T={
    fr:{messages:'Messages',search:'Rechercher une conversation',all:'Tous',unread:'Non lus',mentees:'Mentorés',mentorsf:'Mentors',
      newMsg:'Nouveau message',placeholder:'Écrire un message…',today:"aujourd'hui",yesterday:'hier',
      online:'En ligne',sent:'Envoyé',read:'Lu',newMessages:'Nouveaux messages',
      empty:'Sélectionnez une conversation',emptySub:'Choisissez une personne à gauche ou démarrez une nouvelle conversation.',
      noConv:'Aucune conversation',copy:'Copier le texte',report:'Signaler',copied:'Texte copié.',
      attach:'Joindre un fichier',viewProfile:'Voir le profil',schedule:'Planifier une session',convActions:'Options de la conversation',
      mute:'Couper les notifications',archive:'Archiver',block:'Bloquer',reportConv:'Signaler la conversation',
      closeConv:'Clore la conversation',reopenConv:'Rouvrir la conversation',closedNote:'Conversation close par l’équipe. Plus aucun message ne peut être envoyé.',closedToast:'Conversation close.',reopenToast:'Conversation rouverte.',
      newTitle:'Nouvelle conversation',newSearch:'Rechercher une personne…',
      gMentees:'Mes mentorés',gMentors:'Mentors',gTeam:'Équipe du programme',gPartners:'Partenaires',gEnt:'Entrepreneurs',
      reportTitle:'Signaler ce message',reportSub:'Notre équipe de modération examinera ce signalement de manière confidentielle.',
      r1:'Spam ou démarchage',r2:'Harcèlement ou abus',r3:'Contenu inapproprié',r4:'Fausse information',r5:'Autre',
      reportNote:'Précisions (facultatif)',cancel:'Annuler',submit:'Envoyer le signalement',reported:'Message signalé à la modération.',
      flagged:'Signalé',typing:'est en train d’écrire',attached:'Pièce jointe',startedAt:'Conversation démarrée',
      download:'Télécharger',you:'Vous',send:'Envoyer',back:'Retour',sessionToast:'Proposition de session envoyée.',
      verified:'Compte officiel vérifié · équipe du programme',
      lastSeen:'Vu',hrs:'il y a {n} h',min:'il y a {n} min',days:'il y a {n} j'},
    en:{messages:'Messages',search:'Search a conversation',all:'All',unread:'Unread',mentees:'Mentees',mentorsf:'Mentors',
      newMsg:'New message',placeholder:'Write a message…',today:'today',yesterday:'yesterday',
      online:'Online',sent:'Sent',read:'Read',newMessages:'New messages',
      empty:'Select a conversation',emptySub:'Pick someone on the left or start a new conversation.',
      noConv:'No conversation',copy:'Copy text',report:'Report',copied:'Text copied.',
      attach:'Attach a file',viewProfile:'View profile',schedule:'Schedule a session',convActions:'Conversation options',
      mute:'Mute notifications',archive:'Archive',block:'Block',reportConv:'Report conversation',
      closeConv:'Close the conversation',reopenConv:'Reopen the conversation',closedNote:'Conversation closed by the team. No further messages can be sent.',closedToast:'Conversation closed.',reopenToast:'Conversation reopened.',
      newTitle:'New conversation',newSearch:'Search a person…',
      gMentees:'My mentees',gMentors:'Mentors',gTeam:'Programme team',gPartners:'Partners',gEnt:'Entrepreneurs',
      reportTitle:'Report this message',reportSub:'Our moderation team will review this report confidentially.',
      r1:'Spam or solicitation',r2:'Harassment or abuse',r3:'Inappropriate content',r4:'Misinformation',r5:'Other',
      reportNote:'Details (optional)',cancel:'Cancel',submit:'Send report',reported:'Message reported to moderation.',
      flagged:'Reported',typing:'is typing',attached:'Attachment',startedAt:'Conversation started',
      download:'Download',you:'You',send:'Send',back:'Back',sessionToast:'Session proposal sent.',
      verified:'Verified official account · programme team',
      lastSeen:'Seen',hrs:'{n} h ago',min:'{n} min ago',days:'{n} d ago'}
  };
  function t(k){return T[lang()][k];}
  // Official programme / admin accounts (IAG team) get a blue verified check so members know they are legitimate.
  function verif(g){return g==='team'?' <span class="cf-verif" title="'+esc(t('verified'))+'" aria-label="'+esc(t('verified'))+'"><i class="ti ti-rosette-discount-check"></i></span>':'';}

  var ROLE=(window.CF_MSG_ROLE==='entrepreneur')?'ent':'mentor';
  var ME=ROLE==='ent'?{name:'Aminata Diallo',av:'AD',color:'#0A6B5E'}:{name:'Dr Kwame Asante',av:'KA',color:'#063D34'};

  // ---- Backend réel (VITE_USE_API=true) : conversations depuis l'API ----
  function apiOn(){ return !!(window.CFApi && window.CFApi.useApi); }
  function myName(){ return ME.name; } // nom complet, renseigné depuis /auth/me au boot
  function inits(n){ return String(n||'').trim().split(/\s+/).filter(Boolean).map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()||'?'; }
  function hhmm(iso){ try{ var d=new Date(iso); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }catch(e){ return ''; } }
  function convFromThread(th, allMsgs){
    var me=myName();
    var parts=th.participants||[];
    var other=parts.filter(function(p){ return (p.name||'')!==me; })[0] || {name: th['with']||'Équipe Coastal Futures', role:'team'};
    var group = other.role==='team'?'team':(other.role==='mentor'?'mentors':'ent');
    var msgs=(allMsgs||[]).filter(function(m){ return m.threadId===th.id; })
      .sort(function(a,b){ return new Date(a.at||0)-new Date(b.at||0); })
      .map(function(m){ var mine=!!(m.from&&m.from.name===me); return { from:mine?'me':'them', time:hhmm(m.at), read:!!m.read, text:{fr:m.body||'',en:m.body||''}, __id:m.id }; });
    return { id:th.id, name:other.name||th['with']||'Équipe', av:inits(other.name||th['with']), color:group==='team'?'#244440':'#0A6B5E',
      role: th.subject||{fr:'',en:''}, group:group, tag: group==='team'?{fr:'Équipe',en:'Team'}:{fr:'Contact',en:'Contact'},
      status:'online', unread: msgs.filter(function(m){return m.from==='them'&&!m.read;}).length, closed:!!th.closed, msgs:msgs };
  }
  function buildConvsFromApi(){
    return CFApi.get('/auth/me').catch(function(){return null;}).then(function(me){
      if(me&&me.user&&me.user.name){ ME.name=me.user.name; ME.av=inits(me.user.name); }
      return Promise.all([ CFApi.get('/threads').catch(function(){return [];}), CFApi.get('/messages').catch(function(){return [];}) ]);
    }).then(function(res){ return (res[0]||[]).map(function(th){ return convFromThread(th, res[1]||[]); }); });
  }

  // ---- data ------------------------------------------------------------
  var CONVS_ENT=[
    {id:'kwame',name:'Dr Kwame Asante',av:'KA',color:'#063D34',role:{fr:'Mentor · Finance verte',en:'Mentor · Green finance'},group:'mentors',tag:{fr:'Mon mentor',en:'My mentor'},status:'online',unread:0,
     msgs:[
      {from:'them',day:{fr:'5 juin 2026',en:'5 June 2026'},time:'10:24',text:{fr:'Bonjour Aminata, ravi de vous accompagner. Quel est votre objectif prioritaire ce trimestre ?',en:'Hello Aminata, glad to support you. What is your top priority this quarter?'}},
      {from:'me',time:'10:31',read:true,text:{fr:'Structurer un tour de financement pour raccorder 200 foyers de plus.',en:'Structuring a funding round to connect 200 more households.'}},
      {from:'them',time:'10:36',text:{fr:'Parfait. Je vous partage la trame de modèle financier, on la complète ensemble.',en:'Great. I am sharing the financial model template, we fill it together.'}},
      {from:'them',time:'10:37',kind:'file',file:{name:'modele-financier.xlsx',size:'412 Ko',icon:'ti-file-spreadsheet'}},
      {from:'me',time:'10:52',read:true,text:{fr:'Merci beaucoup, je regarde ça aujourd’hui.',en:'Thank you so much, I will look at it today.'}}
     ]},
    {id:'maty',name:'Saïfi Dawalbet Hamit',av:'SH',color:'#244440',role:{fr:'Coordination du programme · IAG',en:'Programme coordination · AGI'},group:'team',tag:{fr:'Équipe',en:'Team'},status:'online',unread:1,
     msgs:[ {from:'them',day:{fr:"aujourd'hui",en:'today'},time:'09:12',text:{fr:'Bonjour Aminata, votre candidature à la Cohorte 2 est bien complète. Le comité de labellisation se réunit le 8 juillet.',en:'Hello Aminata, your Cohort 2 application is complete. The certification committee meets on 8 July.'}} ]},
    {id:'awa',name:'Awa Faye',av:'AF',color:'#244440',role:{fr:'Support entrepreneurs · IAG',en:'Entrepreneur support · AGI'},group:'team',tag:{fr:'Support',en:'Support'},status:'offline',seenHrs:2,unread:0,
     msgs:[ {from:'me',day:{fr:'hier',en:'yesterday'},time:'14:02',read:true,text:{fr:'Bonjour, comment ajouter un document à mon profil ?',en:'Hello, how do I add a document to my profile?'}},
            {from:'them',time:'14:20',text:{fr:'Bonjour Aminata ! Depuis Mon profil, section Documents. Je reste disponible.',en:'Hi Aminata! From My profile, Documents section. I remain available.'}} ]},
    {id:'mariama',name:'Mariama Baldé',av:'MB',color:'#B8823A',role:{fr:'Entrepreneur · Pêche bleue Conakry',en:'Entrepreneur · Pêche bleue Conakry'},group:'ent',tag:{fr:'Contact accepté',en:'Accepted contact'},status:'offline',seenDays:1,unread:0,
     msgs:[ {from:'them',day:{fr:'2 juin 2026',en:'2 June 2026'},time:'18:30',text:{fr:'Merci d’avoir accepté ma demande de contact ! On échange sur le financement ?',en:'Thanks for accepting my contact request! Shall we chat about funding?'}},
            {from:'me',time:'18:45',read:true,text:{fr:'Avec plaisir Mariama, je te partage mon expérience cette semaine.',en:'Gladly Mariama, I will share my experience this week.'}} ]}
  ];
  var CONVS=ROLE==='ent'?CONVS_ENT:[
    {id:'aminata',name:'Aminata Diallo',av:'AD',color:'#0A6B5E',
     role:{fr:'Entrepreneur · Dakar Solar Solutions',en:'Entrepreneur · Dakar Solar Solutions'},
     group:'mentees',tag:{fr:'Mentorée',en:'Mentee'},status:'online',unread:0,
     msgs:[
      {from:'them',day:{fr:'5 juin 2026',en:'5 June 2026'},time:'10:24',text:{fr:'Bonjour Dr Asante, ravie de démarrer cet accompagnement sur Dakar Solar Solutions.',en:'Hello Dr Asante, glad to start this mentoring on Dakar Solar Solutions.'}},
      {from:'me',time:'10:28',read:true,text:{fr:'Bonjour Aminata. Quel est votre objectif prioritaire ce trimestre ?',en:'Hello Aminata. What is your top priority this quarter?'}},
      {from:'them',time:'10:31',text:{fr:'Structurer un tour de financement pour raccorder 200 foyers de plus.',en:'Structuring a funding round to connect 200 more households.'}},
      {from:'me',time:'10:36',read:true,text:{fr:'Parfait. Je vous partage la trame de modèle financier, on la complète ensemble.',en:'Great. I am sharing the financial model template, we fill it together.'}},
      {from:'me',time:'10:37',read:true,kind:'file',file:{name:'modele-financier.xlsx',size:'412 Ko',icon:'ti-file-spreadsheet'}},
      {from:'them',time:'10:52',text:{fr:'Merci beaucoup, je regarde ça aujourd’hui et je reviens vers vous.',en:'Thank you so much, I will look at it today and get back to you.'}}
     ]},
    {id:'awa',name:'Awa Ndoye',av:'AN',color:'#12B396',
     role:{fr:'Entrepreneur · Sahel Clean Energy',en:'Entrepreneur · Sahel Clean Energy'},
     group:'ent',tag:{fr:'Nouvelle demande',en:'New request'},status:'online',unread:3,
     msgs:[
      {from:'them',day:{fr:"aujourd'hui",en:'today'},time:'08:05',text:{fr:'Bonjour Dr Asante, merci d’avoir accepté ma demande de mentorat.',en:'Hello Dr Asante, thank you for accepting my mentoring request.'}},
      {from:'them',time:'08:06',text:{fr:'Je développe des kits solaires domestiques au Sénégal.',en:'I develop home solar kits in Senegal.'}},
      {from:'them',time:'08:07',text:{fr:'Quand seriez-vous disponible pour un premier échange ?',en:'When would you be available for a first call?'}}
     ]},
    {id:'kofi',name:'Kofi Mensah',av:'KM',color:'#12B396',
     role:{fr:'Entrepreneur · ReCycle Accra',en:'Entrepreneur · ReCycle Accra'},
     group:'mentees',tag:{fr:'Mentoré',en:'Mentee'},status:'online',unread:2,
     msgs:[
      {from:'me',day:{fr:'hier',en:'yesterday'},time:'17:10',read:true,text:{fr:'Kofi, avez-vous avancé sur les volumes collectés ce mois ?',en:'Kofi, did you make progress on this month’s collected volumes?'}},
      {from:'them',day:{fr:"aujourd'hui",en:'today'},time:'09:14',text:{fr:'Oui ! 6 tonnes collectées, +18% sur le mois.',en:'Yes! 6 tonnes collected, +18% over the month.'}},
      {from:'them',time:'09:15',text:{fr:'Je vous envoie le tableau de suivi cet après-midi.',en:'I will send you the tracking sheet this afternoon.'}}
     ]},
    {id:'maty',name:'Saïfi Dawalbet Hamit',av:'SH',color:'#244440',
     role:{fr:'Coordination du programme · IAG',en:'Programme coordination · AGI'},
     group:'team',tag:{fr:'Équipe',en:'Team'},status:'online',unread:1,
     msgs:[
      {from:'them',day:{fr:"aujourd'hui",en:'today'},time:'11:02',text:{fr:'Bonjour Dr Asante, l’atelier finance verte est confirmé le 12 juin à Accra. Pouvez-vous animer la session de 14 h ?',en:'Hello Dr Asante, the green finance workshop is confirmed on 12 June in Accra. Could you lead the 2 pm session?'}}
     ]},
    {id:'aisha',name:'Aïsha Bangura',av:'AB',color:'#063D34',
     role:{fr:'Mentor · Climate Adaptation Lab',en:'Mentor · Climate Adaptation Lab'},
     group:'mentors',tag:{fr:'Mentor',en:'Mentor'},status:'offline',seenMin:180,unread:0,
     msgs:[
      {from:'them',day:{fr:'2 juin 2026',en:'2 June 2026'},time:'15:40',text:{fr:'Kwame, on partage un mentoré sur l’agriculture résiliente. On se cale 20 min cette semaine ?',en:'Kwame, we share a mentee on resilient agriculture. Shall we sync 20 min this week?'}},
      {from:'me',time:'16:02',read:true,text:{fr:'Avec plaisir. Jeudi 11 h te convient ?',en:'Happy to. Does Thursday 11 am work for you?'}}
     ]},
    {id:'fatou',name:'Partenaire technique et financier',av:'PF',color:'#B8823A',
     role:{fr:'Partenaire technique et financier',en:'Technical and financial partner'},
     group:'partners',tag:{fr:'Partenaire',en:'Partner'},status:'offline',seenHrs:1,unread:0,
     msgs:[
      {from:'them',day:{fr:'1 juin 2026',en:'1 June 2026'},time:'09:30',text:{fr:'Dr Asante, merci pour le retour sur les indicateurs d’impact du portefeuille énergie.',en:'Dr Asante, thank you for the feedback on the energy portfolio impact indicators.'}},
      {from:'me',time:'09:48',read:true,text:{fr:'Avec plaisir. Je reste disponible pour la revue trimestrielle.',en:'My pleasure. I remain available for the quarterly review.'}}
     ]},
    {id:'james',name:'James Tuah',av:'JT',color:'#0A6B5E',
     role:{fr:'Entrepreneur · Mangrove Restore',en:'Entrepreneur · Mangrove Restore'},
     group:'mentees',tag:{fr:'Mentoré',en:'Mentee'},status:'offline',seenDays:1,unread:0,
     msgs:[
      {from:'them',day:{fr:'30 mai 2026',en:'30 May 2026'},time:'13:20',text:{fr:'Merci pour la session, les plants de mangrove sont en terre sur 2 hectares.',en:'Thanks for the session, the mangrove seedlings are planted over 2 hectares.'}},
      {from:'me',time:'13:25',read:true,text:{fr:'Excellent travail James. Documentez bien les taux de survie.',en:'Excellent work James. Document the survival rates carefully.'}}
     ]}
  ];

  // people available to start a NEW conversation (not all already in CONVS)
  var DIR_ENT=[
    {group:'mentors',name:'Dr Kwame Asante',av:'KA',color:'#063D34',sub:{fr:'Mentor · Finance verte',en:'Mentor · Green finance'},conv:'kwame'},
    {group:'team',name:'Saïfi Dawalbet Hamit',av:'SH',color:'#244440',sub:{fr:'Coordination du programme · IAG',en:'Programme coordination · AGI'},conv:'maty'},
    {group:'team',name:'Awa Faye',av:'AF',color:'#244440',sub:{fr:'Support entrepreneurs · IAG',en:'Entrepreneur support · AGI'},conv:'awa'},
    {group:'ent',name:'Mariama Baldé',av:'MB',color:'#B8823A',sub:{fr:'Contact accepté · Conakry',en:'Accepted contact · Conakry'},conv:'mariama'}
  ];
  var DIRECTORY=ROLE==='ent'?DIR_ENT:[
    {group:'mentees',name:'Aminata Diallo',av:'AD',color:'#0A6B5E',sub:{fr:'Dakar Solar Solutions · Sénégal',en:'Dakar Solar Solutions · Senegal'},conv:'aminata'},
    {group:'mentees',name:'Kofi Mensah',av:'KM',color:'#12B396',sub:{fr:'ReCycle Accra · Ghana',en:'ReCycle Accra · Ghana'},conv:'kofi'},
    {group:'mentees',name:'James Tuah',av:'JT',color:'#0A6B5E',sub:{fr:'Mangrove Restore · Liberia',en:'Mangrove Restore · Liberia'},conv:'james'},
    {group:'ent',name:'Mariama Baldé',av:'MB',color:'#12B396',sub:{fr:'Pêche bleue Conakry · Guinée',en:'Pêche bleue Conakry · Guinea'}},
    {group:'ent',name:'Ibrahim Koroma',av:'IK',color:'#0A6B5E',sub:{fr:'AgriRésilience · Sierra Leone',en:'AgriRésilience · Sierra Leone'}},
    {group:'mentors',name:'Aïsha Bangura',av:'AB',color:'#063D34',sub:{fr:'Climate Adaptation Lab · Freetown',en:'Climate Adaptation Lab · Freetown'},conv:'aisha'},
    {group:'mentors',name:'Dr Sophie Mendy',av:'SM',color:'#063D34',sub:{fr:'Énergie & Développement · Dakar',en:'Energy & Development · Dakar'}},
    {group:'team',name:'Saïfi Dawalbet Hamit',av:'SH',color:'#244440',sub:{fr:'Coordination du programme · IAG',en:'Programme coordination · AGI'},conv:'maty'},
    {group:'team',name:'Awa Faye',av:'AF',color:'#244440',sub:{fr:'Support entrepreneurs · IAG',en:'Entrepreneur support · AGI'}},
    {group:'partners',name:'Partenaire technique et financier',av:'PF',color:'#B8823A',sub:{fr:'Bailleur technique et financier',en:'Technical and financial partner'},conv:'fatou'}
  ];

  var state={active:null,filter:'all',query:''};
  var els={};

  function escFile(f){return '<span class="m-file"><span class="m-file-ic"><i class="ti '+(f.icon||'ti-file')+'"></i></span><span class="m-file-meta"><span class="m-file-name">'+esc(f.name)+'</span><span class="m-file-size">'+esc(f.size||'')+'</span></span><button class="m-file-dl" type="button" title="'+esc(t('download'))+'" aria-label="'+esc(t('download'))+'"><i class="ti ti-download"></i></button></span>';}

  function lastMsg(c){return c.msgs[c.msgs.length-1];}
  function preview(c){var m=lastMsg(c);if(!m)return '';var who=m.from==='me'?(t('you')+' : '):'';if(m.kind==='file')return who+'📎 '+m.file.name;if(m.kind==='image')return who+t('attached');return who+L(m.text);}

  // ---- conversation list ----------------------------------------------
  function renderList(){
    var q=state.query.trim().toLowerCase();
    var rows=CONVS.filter(function(c){
      if(state.filter==='unread'&&!c.unread)return false;
      if(state.filter==='mentees'&&c.group!=='mentees')return false;
      if(state.filter==='mentors'&&c.group!=='mentors')return false;
      if(q){var hay=(c.name+' '+L(c.role)+' '+preview(c)).toLowerCase();if(hay.indexOf(q)<0)return false;}
      return true;
    });
    els.list.innerHTML='';
    if(!rows.length){els.list.innerHTML='<div class="conv-empty">'+esc(t('noConv'))+'</div>';return;}
    rows.forEach(function(c){
      var m=lastMsg(c);
      var row=document.createElement('button');
      row.type='button';
      row.className='conv'+(state.active===c.id?' active':'')+(c.unread?' has-unread':'');
      row.setAttribute('data-id',c.id);
      row.innerHTML=
        '<span class="conv-av" style="background:'+c.color+'">'+esc(c.av)+'<span class="st-dot '+(c.status==='online'?'on':'off')+'"></span></span>'+
        '<span class="conv-main">'+
          '<span class="conv-top"><span class="conv-name">'+esc(c.name)+verif(c.group)+'</span><span class="conv-time tnum">'+esc(m?m.time:'')+'</span></span>'+
          '<span class="conv-bottom"><span class="conv-prev">'+esc(preview(c))+'</span>'+(c.unread?'<span class="conv-badge tnum">'+c.unread+'</span>':'')+'</span>'+
        '</span>';
      row.addEventListener('click',function(){open(c.id);});
      els.list.appendChild(row);
    });
  }

  // ---- thread ----------------------------------------------------------
  function statusLine(c){
    if(c.status==='online')return t('online');
    if(c.seenMin)return t('lastSeen')+' '+t('min').replace('{n}',Math.round(c.seenMin));
    if(c.seenHrs)return t('lastSeen')+' '+t('hrs').replace('{n}',c.seenHrs);
    if(c.seenDays)return t('lastSeen')+' '+t('days').replace('{n}',c.seenDays);
    return t('lastSeen');
  }

  function renderThread(c,markNewBefore){
    els.thread.innerHTML='';
    var lastDay=null,newShown=false;
    c.msgs.forEach(function(m,i){
      var day=m.day?L(m.day):null;
      if(day&&day!==lastDay){lastDay=day;var ds=document.createElement('div');ds.className='m-day';ds.textContent=day;els.thread.appendChild(ds);}
      if(markNewBefore!=null&&!newShown&&i===markNewBefore){newShown=true;var nd=document.createElement('div');nd.className='m-new'; nd.innerHTML='<span>'+esc(t('newMessages'))+'</span>';els.thread.appendChild(nd);}
      els.thread.appendChild(msgEl(c,m));
    });
    if(c.closed){var cb=document.createElement('div');cb.className='m-closed';cb.innerHTML='<i class="ti ti-lock"></i><span>'+esc(t('closedNote'))+'</span>';els.thread.appendChild(cb);}
    scrollBottom();
  }

  function msgEl(c,m){
    var wrap=document.createElement('div');
    wrap.className='m'+(m.from==='me'?' me':'')+(m.flagged?' flagged':'');
    var avHtml=m.from==='me'?'':'<span class="m-av" style="background:'+c.color+'">'+esc(c.av)+'</span>';
    var body;
    if(m.kind==='file')body=escFile(m.file);
    else body=esc(L(m.text));
    var receipt=m.from==='me'?'<span class="m-receipt'+(m.read?' read':'')+'"><i class="ti '+(m.read?'ti-checks':'ti-check')+'"></i></span>':'';
    var flagTag=m.flagged?'<span class="m-flag"><i class="ti ti-flag"></i>'+esc(t('flagged'))+'</span>':'';
    wrap.innerHTML=avHtml+
      '<span class="m-col">'+
        '<span class="m-bub">'+body+
          '<button class="m-kebab" type="button" aria-label="'+esc(t('report'))+'"><i class="ti ti-dots"></i></button>'+
        '</span>'+
        '<span class="m-foot"><span class="m-time tnum">'+esc(m.time)+'</span>'+receipt+flagTag+'</span>'+
      '</span>';
    var keb=wrap.querySelector('.m-kebab');
    keb.addEventListener('click',function(e){e.stopPropagation();openMsgMenu(keb,c,m);});
    return wrap;
  }

  function scrollBottom(){requestAnimationFrame(function(){els.thread.scrollTop=els.thread.scrollHeight;});}

  function renderHead(c){
    els.head.innerHTML=
      '<button class="th-back" id="thBack" type="button" aria-label="'+esc(t('back'))+'"><i class="ti ti-arrow-left"></i></button>'+
      '<span class="th-av" style="background:'+c.color+'">'+esc(c.av)+'<span class="st-dot '+(c.status==='online'?'on':'off')+'"></span></span>'+
      '<span class="th-id"><span class="th-name">'+esc(c.name)+verif(c.group)+'</span><span class="th-status">'+esc(statusLine(c))+' · '+esc(L(c.role))+'</span></span>'+
      '<span class="th-actions">'+
        (c.group==='mentees'?'<button class="th-act" type="button" data-act="schedule" title="'+esc(t('schedule'))+'" aria-label="'+esc(t('schedule'))+'"><i class="ti ti-calendar-plus"></i></button>':'')+
        '<button class="th-act" type="button" data-act="profile" title="'+esc(t('viewProfile'))+'" aria-label="'+esc(t('viewProfile'))+'"><i class="ti ti-user"></i></button>'+
        '<button class="th-act" type="button" id="convKebab" title="'+esc(t('convActions'))+'" aria-label="'+esc(t('convActions'))+'"><i class="ti ti-dots-vertical"></i></button>'+
      '</span>';
    $('#thBack',els.head).addEventListener('click',function(){els.root.classList.remove('show-thread');});
    var sched=els.head.querySelector('[data-act="schedule"]');if(sched)sched.addEventListener('click',function(){toast(t('sessionToast'));});
    var prof=els.head.querySelector('[data-act="profile"]');if(prof)prof.addEventListener('click',function(){window.location.href=c.group==='mentees'||c.group==='ent'?'profil-startup.html':'profil-mentor.html';});
    $('#convKebab',els.head).addEventListener('click',function(e){e.stopPropagation();openConvMenu($('#convKebab',els.head),c);});
  }

  function open(id){
    var c=find(id);if(!c)return;
    state.active=id;
    var hadUnread=c.unread;
    var firstUnreadIdx=null;
    if(hadUnread){var k=0;for(var i=c.msgs.length-1;i>=0;i--){if(c.msgs[i].from==='them')k++;if(k===hadUnread){firstUnreadIdx=i;break;}}}
    c.unread=0;
    renderHead(c);
    renderThread(c,firstUnreadIdx);
    renderList();
    els.root.classList.add('show-thread');
    els.empty.style.display='none';
    els.convo.style.display='flex';
    setComposer(c);
    closeMenus();
  }
  function find(id){for(var i=0;i<CONVS.length;i++)if(CONVS[i].id===id)return CONVS[i];return null;}
  function setComposer(c){
    var inp=els.input, sb=$('#sendBtn'), ab=$('#attachBtn');
    var off=!!(c&&c.closed);
    if(inp){inp.disabled=off; inp.placeholder=off?t('closedNote'):t('placeholder'); if(inp.parentNode)inp.parentNode.classList.toggle('composer-off',off);}
    if(sb)sb.disabled=off; if(ab)ab.disabled=off;
  }
  function toggleClosed(c){
    c.closed=!c.closed;
    if(state.active===c.id){ renderThread(c,null); setComposer(c); }
    toast(t(c.closed?'closedToast':'reopenToast'));
  }

  // ---- composer --------------------------------------------------------
  var pending=null; // pending attachment {name,size,icon,isImage,src}
  function send(){
    var c=find(state.active);if(!c||c.closed)return;
    var v=els.input.value.trim();
    if(!v&&!pending)return;
    var now=new Date();var hh=('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2);
    // Backend réel : on persiste le message (POST /messages), pas de fausse réponse.
    if(apiOn()){
      if(!v)return; // pièces jointes non gérées côté API pour l'instant
      els.input.value='';autosize();
      var mid='msg-'+Date.now().toString(36);
      c.msgs.push({from:'me',time:hh,read:false,text:{fr:v,en:v},__id:mid});
      renderThread(c,null);renderList();
      CFApi.post('/messages',{ id:mid, threadId:c.id, from:{name:myName(),role:(ROLE==='ent'?'entrepreneur':'mentor'),verified:false}, at:new Date().toISOString(), body:v, read:false }).catch(function(){});
      return;
    }
    if(pending){c.msgs.push({from:'me',time:hh,read:false,kind:'file',file:{name:pending.name,size:pending.size,icon:pending.icon}});clearPending();}
    if(v){c.msgs.push({from:'me',time:hh,read:false,text:{fr:v,en:v}});}
    els.input.value='';autosize();
    renderThread(c,null);renderList();
    maybeReply(c);
  }
  function maybeReply(c){
    if(c.__replied)return;c.__replied=true;
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var replies={aminata:{fr:'Bien reçu, merci Dr Asante !',en:'Got it, thank you Dr Asante!'},kofi:{fr:'Parfait, je m’y mets.',en:'Perfect, I’ll get on it.'},awa:{fr:'Super, merci pour votre retour rapide.',en:'Great, thanks for the quick reply.'},maty:{fr:'Merci, c’est noté.',en:'Thanks, noted.'},aisha:{fr:'Ça marche, à jeudi.',en:'Sounds good, see you Thursday.'},fatou:{fr:'Merci, excellente journée.',en:'Thank you, have a great day.'},james:{fr:'Merci pour le suivi !',en:'Thanks for the follow-up!'}};
    var r=replies[c.id]||{fr:'Merci !',en:'Thanks!'};
    function appendReply(){
      var now=new Date();var hh=('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2);
      c.msgs.push({from:'them',time:hh,text:r});
      if(state.active===c.id){removeTyping();renderThread(c,null);} renderList();
    }
    if(reduce){setTimeout(appendReply,500);return;}
    setTimeout(function(){ if(state.active===c.id) showTyping(c); },700);
    setTimeout(appendReply,2300);
  }
  function showTyping(c){removeTyping();var el=document.createElement('div');el.className='m typing-row';el.id='typingRow';el.innerHTML='<span class="m-av" style="background:'+c.color+'">'+esc(c.av)+'</span><span class="m-col"><span class="m-bub m-typing"><i></i><i></i><i></i></span></span>';els.thread.appendChild(el);scrollBottom();}
  function removeTyping(){var e=$('#typingRow');if(e)e.remove();}

  function autosize(){els.input.style.height='auto';els.input.style.height=Math.min(els.input.scrollHeight,140)+'px';}

  function clearPending(){pending=null;els.tray.innerHTML='';els.tray.classList.remove('show');}
  function setPending(file){
    var isImg=/^image\//.test(file.type);
    pending={name:file.name,size:fmtSize(file.size),icon:isImg?'ti-photo':iconFor(file.name),isImage:isImg};
    els.tray.innerHTML='<span class="att-chip"><i class="ti '+pending.icon+'"></i><span class="att-name">'+esc(pending.name)+'</span><span class="att-size tnum">'+esc(pending.size)+'</span><button type="button" class="att-x" aria-label="x"><i class="ti ti-x"></i></button></span>';
    els.tray.classList.add('show');
    els.tray.querySelector('.att-x').addEventListener('click',clearPending);
  }
  function iconFor(n){n=(n||'').toLowerCase();if(/\.(xlsx?|csv)$/.test(n))return 'ti-file-spreadsheet';if(/\.pdf$/.test(n))return 'ti-file-type-pdf';if(/\.(docx?|txt)$/.test(n))return 'ti-file-text';if(/\.(png|jpe?g|webp|gif)$/.test(n))return 'ti-photo';return 'ti-file';}
  function fmtSize(b){if(b<1024)return b+' o';if(b<1048576)return Math.round(b/1024)+' Ko';return (b/1048576).toFixed(1).replace('.',',')+' Mo';}

  // ---- per-message menu + report --------------------------------------
  var pop=null;
  function closeMenus(){if(pop){pop.remove();pop=null;}}
  function openMsgMenu(anchor,c,m){
    closeMenus();
    pop=document.createElement('div');pop.className='cf-pop';
    pop.innerHTML='<button type="button" data-a="copy"><i class="ti ti-copy"></i>'+esc(t('copy'))+'</button>'+
                  '<button type="button" data-a="report" class="danger"><i class="ti ti-flag"></i>'+esc(t('report'))+'</button>';
    document.body.appendChild(pop);
    var r=anchor.getBoundingClientRect();
    pop.style.top=(r.bottom+6+window.scrollY)+'px';
    pop.style.left=Math.min(r.left,window.innerWidth-pop.offsetWidth-12)+'px';
    pop.querySelector('[data-a="copy"]').addEventListener('click',function(){var txt=m.kind==='file'?m.file.name:L(m.text);if(navigator.clipboard)navigator.clipboard.writeText(txt);toast(t('copied'));closeMenus();});
    pop.querySelector('[data-a="report"]').addEventListener('click',function(){closeMenus();openReport(c,m);});
  }
  function openConvMenu(anchor,c){
    closeMenus();
    pop=document.createElement('div');pop.className='cf-pop';
    pop.innerHTML='<button type="button"><i class="ti ti-bell-off"></i>'+esc(t('mute'))+'</button>'+
                  '<button type="button"><i class="ti ti-archive"></i>'+esc(t('archive'))+'</button>'+
                  '<button type="button" data-a="close"><i class="ti '+(c.closed?'ti-lock-open':'ti-circle-x')+'"></i>'+esc(t(c.closed?'reopenConv':'closeConv'))+'</button>'+
                  '<button type="button" class="danger" data-a="report"><i class="ti ti-flag"></i>'+esc(t('reportConv'))+'</button>';
    document.body.appendChild(pop);
    var r=anchor.getBoundingClientRect();
    pop.style.top=(r.bottom+6+window.scrollY)+'px';
    pop.style.left=Math.min(r.left,window.innerWidth-pop.offsetWidth-12)+'px';
    var rep=pop.querySelector('[data-a="report"]');if(rep)rep.addEventListener('click',function(){closeMenus();openReport(c,null);});
    var clo=pop.querySelector('[data-a="close"]');if(clo)clo.addEventListener('click',function(){closeMenus();toggleClosed(c);});
    pop.querySelectorAll('button:not([data-a])').forEach(function(b){b.addEventListener('click',function(){toast('✓');closeMenus();});});
  }

  var reportTarget=null;
  function openReport(c,m){
    reportTarget={c:c,m:m};
    els.report.classList.add('open');
    var sel=els.report.querySelector('.rsn.sel');if(sel)sel.classList.remove('sel');
    var note=$('#reportNote');if(note)note.value='';
  }
  function closeReport(){els.report.classList.remove('open');reportTarget=null;}
  function submitReport(){
    if(reportTarget&&reportTarget.m){reportTarget.m.flagged=true;if(state.active===reportTarget.c.id)renderThread(reportTarget.c,null);}
    closeReport();toast(t('reported'));
  }

  // ---- new conversation modal -----------------------------------------
  function openNew(){els.newModal.classList.add('open');renderDirectory('');var s=$('#userSearch');if(s){s.value='';s.focus();}}
  function closeNew(){els.newModal.classList.remove('open');}
  function renderDirectory(q){
    q=(q||'').trim().toLowerCase();
    var groups=[['mentees','gMentees'],['ent','gEnt'],['mentors','gMentors'],['team','gTeam'],['partners','gPartners']];
    var host=$('#userList');host.innerHTML='';
    groups.forEach(function(g){
      var items=DIRECTORY.filter(function(d){return d.group===g[0]&&(!q||(d.name+' '+L(d.sub)).toLowerCase().indexOf(q)>=0);});
      if(!items.length)return;
      var h=document.createElement('div');h.className='u-group';h.textContent=t(g[1]);host.appendChild(h);
      items.forEach(function(d){
        var b=document.createElement('button');b.type='button';b.className='u-row';
        b.innerHTML='<span class="u-av" style="background:'+d.color+'">'+esc(d.av.replace(/[^A-Za-z]/g,'')||'•')+'</span><span class="u-meta"><span class="u-name">'+esc(d.name)+verif(d.group)+'</span><span class="u-sub">'+esc(L(d.sub))+'</span></span><i class="ti ti-arrow-right"></i>';
        b.addEventListener('click',function(){startWith(d);});
        host.appendChild(b);
      });
    });
    if(!host.children.length)host.innerHTML='<div class="conv-empty">'+esc(t('noConv'))+'</div>';
  }
  function startWith(d){
    closeNew();
    if(d.conv){open(d.conv);return;}
    // create a new empty conversation
    var id='c'+Date.now();
    CONVS.unshift({id:id,name:d.name,av:d.av.replace(/[^A-Za-z]/g,'')||'•',color:d.color,role:d.sub,group:d.group,tag:{fr:'',en:''},status:'offline',seenHrs:1,unread:0,msgs:[],__replied:false});
    open(id);
    els.input.focus();
  }

  // ---- toast -----------------------------------------------------------
  function toast(msg){var w=$('#msgToast');if(!w)return;var el=document.createElement('div');el.className='cf-toast';el.innerHTML='<i class="ti ti-circle-check"></i><span>'+esc(msg)+'</span>';w.appendChild(el);requestAnimationFrame(function(){requestAnimationFrame(function(){el.classList.add('show');});});setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},300);},2800);}

  // ---- static i18n for chrome -----------------------------------------
  function applyChrome(){
    document.querySelectorAll('[data-mt]').forEach(function(el){el.textContent=t(el.getAttribute('data-mt'));});
    document.querySelectorAll('[data-mt-ph]').forEach(function(el){el.setAttribute('placeholder',t(el.getAttribute('data-mt-ph')));});
    document.querySelectorAll('[data-mt-al]').forEach(function(el){el.setAttribute('aria-label',t(el.getAttribute('data-mt-al')));el.setAttribute('title',t(el.getAttribute('data-mt-al')));});
  }

  function rerender(){applyChrome();renderList();var c=find(state.active);if(c){renderHead(c);renderThread(c,null);}renderDirectoryIfOpen();}
  function renderDirectoryIfOpen(){if(els.newModal&&els.newModal.classList.contains('open'))renderDirectory($('#userSearch').value);}

  // ---- init ------------------------------------------------------------
  function init(){
    els.root=$('#messenger');els.list=$('#convList');els.thread=$('#thread');els.head=$('#threadHead');
    els.input=$('#msgInput');els.tray=$('#attTray');els.empty=$('#threadEmpty');els.convo=$('#threadConvo');
    els.report=$('#reportModal');els.newModal=$('#newMsgModal');
    if(!els.root)return;
    if(!document.getElementById('cf-verif-css')){var vs=document.createElement('style');vs.id='cf-verif-css';vs.textContent='.cf-verif{display:inline-flex;align-items:center;vertical-align:middle;color:#2563EB;margin-left:4px;}.cf-verif i{font-size:15px;}.composer-off{opacity:.5;}.m-closed{margin:14px auto;max-width:84%;text-align:center;font-family:var(--font-sans,sans-serif);font-size:12.5px;color:var(--ink-mute,#5C7B76);background:var(--canvas-soft,#F8FBFA);border:1px solid var(--hair,#DCE9E6);border-radius:10px;padding:9px 14px;display:flex;gap:8px;align-items:center;justify-content:center;}.m-closed i{color:var(--ink-faint,#92ACA7);}';document.head.appendChild(vs);}
    applyChrome();
    renderList();
    // filters
    document.querySelectorAll('.cf-filter').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('.cf-filter').forEach(function(x){x.classList.remove('on');});b.classList.add('on');state.filter=b.getAttribute('data-filter');renderList();});});
    // search
    $('#convSearch').addEventListener('input',function(){state.query=this.value;renderList();});
    // composer
    $('#sendBtn').addEventListener('click',send);
    els.input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    els.input.addEventListener('input',autosize);
    $('#attachBtn').addEventListener('click',function(){$('#attachInput').click();});
    $('#attachInput').addEventListener('change',function(){if(this.files&&this.files[0])setPending(this.files[0]);this.value='';});
    // new message
    $('#newMsgBtn').addEventListener('click',openNew);
    $('#userSearch').addEventListener('input',function(){renderDirectory(this.value);});
    // modals close
    document.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',function(){closeNew();closeReport();});});
    els.newModal.addEventListener('click',function(e){if(e.target===els.newModal)closeNew();});
    els.report.addEventListener('click',function(e){if(e.target===els.report)closeReport();});
    // report reasons
    els.report.querySelectorAll('.rsn').forEach(function(r){r.addEventListener('click',function(){els.report.querySelectorAll('.rsn').forEach(function(x){x.classList.remove('sel');});r.classList.add('sel');});});
    $('#reportSubmit').addEventListener('click',submitReport);
    // global close
    document.addEventListener('click',closeMenus);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeMenus();closeNew();closeReport();}});
    window.addEventListener('resize',function(){closeMenus();});
    // open first conversation on desktop (si au moins une conversation)
    if(window.innerWidth>820 && CONVS[0]){open(CONVS[0].id);} else {els.convo.style.display='none';}
    // re-render on language change
    try{new MutationObserver(rerender).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});}catch(e){}
  }
  // Backend réel : on hydrate les conversations depuis l'API avant de rendre.
  function boot(){
    if(apiOn()){
      buildConvsFromApi().then(function(convs){ CONVS=convs; init(); }, function(){ init(); });
    } else { init(); }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
