/* Coastal Futures — append-only audit trail.
   Every state-changing admin action MUST call CFAudit.log(...). Entries are never
   edited or deleted from the UI (ISO 27001 / SOC 2 spirit). admin-journal-audit.html
   renders CFCol('audit_log'); the PTF "data updates log" renders the indicator slice.
   Back-end devs : replace the localStorage write with an append-only server endpoint;
   the actor must be taken from the server session, never trusted from the client. */
(function(){
  function now(){ return new Date().toISOString(); }
  function uid(){ return 'log-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7); }
  function actorOf(a){
    if(a&&a.name) return {name:a.name, role:a.role||''};
    try{ var s=window.CFAdmin&&CFAdmin.session(); if(s) return {name:s.name, role:s.role}; }catch(e){}
    return {name:'Système', role:''};
  }
  window.CFAudit={
    /* CFAudit.log({action, target, before, after, note, actor?})
       action : short verb key ('application.review', 'indicator.publish', 'content.edit', 'user.suspend'…)
       target : {kind, id, label} the object acted on
       before/after : optional value snapshots for diffable changes */
    log:function(o){
      o=o||{};
      var entry={ id:uid(), at:now(), actor:actorOf(o.actor),
        action:o.action||'', target:o.target||null,
        before:(o.before===undefined?null:o.before), after:(o.after===undefined?null:o.after),
        note:o.note||'' };
      try{ if(window.CFCol) CFCol.push('audit_log', entry); }catch(e){}
      return entry;
    },
    /* all entries, newest first */
    all:function(){ try{ return window.CFCol?CFCol.all('audit_log'):[]; }catch(e){ return []; } },
    /* entries whose action starts with one of the given prefixes */
    byKind:function(prefixes){
      var ps=[].concat(prefixes||[]); var a=this.all();
      if(!ps.length) return a;
      return a.filter(function(e){ return ps.some(function(p){ return (e.action||'').indexOf(p)===0; }); });
    }
  };
})();
