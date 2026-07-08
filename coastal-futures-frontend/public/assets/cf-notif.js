/* Coastal Futures — admin notification centre.
   Event producers (application submitted, contact received, content reported,
   indicator submitted, member message) call CFNotif.push(...). The topbar bell on
   every admin page renders CFNotif.visible(role,country) and "mark all read" persists.
   Back-end devs : replace with a server feed scoped by role/country server-side. */
(function(){
  function now(){ return new Date().toISOString(); }
  function uid(){ return 'n-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6); }
  window.CFNotif={
    /* CFNotif.push({kind, title:{fr,en}|string, href, target:{role?,country?,user?}}) */
    push:function(o){
      o=o||{};
      var entry={ id:uid(), at:now(), kind:o.kind||'info',
        title:o.title||'', href:o.href||'', target:o.target||{}, read:false };
      try{ if(window.CFCol) CFCol.push('admin_notifs', entry); }catch(e){}
      return entry;
    },
    all:function(){ try{ return window.CFCol?CFCol.all('admin_notifs'):[]; }catch(e){ return []; } },
    /* Backend réel : remplace le seed par les notifications du serveur (GET /notifications). */
    hydrate:function(){
      if(!(window.CFApi && CFApi.useApi)) return Promise.resolve(false);
      return CFApi.get('/notifications').then(function(list){
        if(Array.isArray(list)){ try{ localStorage.setItem('cf-col-admin_notifs', JSON.stringify(list)); }catch(e){} return true; }
        return false;
      }, function(){ return false; });
    },
    /* notifications a given role (and country, for coordinators) is allowed to see.
       super sees everything; a targeted role sees its own + untargeted ones. */
    visible:function(role,country){
      return this.all().filter(function(n){
        var t=n.target||{};
        if(role==='super') return true;
        if(t.role && t.role!==role) return false;
        if(t.country && country && t.country!==country) return false;
        return true;
      });
    },
    unread:function(role,country){ return this.visible(role,country).filter(function(n){ return !n.read; }).length; },
    markRead:function(id){ return window.CFCol?CFCol.patch('admin_notifs',id,{read:true}):null; },
    markAllRead:function(role,country){
      var list=this.visible(role,country);
      list.forEach(function(n){ if(!n.read) try{ CFCol.patch('admin_notifs',n.id,{read:true}); }catch(e){} });
      return list.length;
    }
  };
})();
