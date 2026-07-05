/* Coastal Futures — donor (PTF) invitation registry (audit v5 §B2 : real gating).

   Donor access is "by invitation only". Until now that was a message, not a control :
   connexion-bailleur.html accepted any well-formed e-mail. This registry makes the
   gate real and auditable :

     - An invitation is ISSUED to a specific e-mail (status: pending) with a single-use
       token and an expiry.
     - invitation-bailleur.html ACTIVATES the token (pending -> active), setting the
       password + 2FA. A token can be activated once; replays read as "used".
     - connexion-bailleur.html only authenticates e-mails whose invitation is ACTIVE
       and not expired. Unknown / pending / revoked / expired e-mails are refused.

   Storage : localStorage 'cf-ptf-invites' (JSON). Seeded once with a demo-active donor
   so the maquette is usable end-to-end, plus a pending and a revoked invite so the
   states are demonstrable. Back-end devs : replace with the invitations table; issuing
   + revoking is an admin action, the token is single-use and server-signed, and the
   login check is server-side (the client list here is advisory). */
(function(){
  var KEY='cf-ptf-invites';
  var YEAR=365*24*60*60*1000, DAY=24*60*60*1000;
  function nowISO(){ return new Date().toISOString(); }
  function plus(ms){ return new Date(Date.now()+ms).toISOString(); }

  var SEED=[
    {email:'partenaire.cf@ptf-exemple.org', org:'Partenaire technique et financier',
     token:'cf-demo-2026', status:'active', issuedAt:'2026-05-20T09:00:00Z',
     activatedAt:'2026-05-22T11:30:00Z', expiresAt:plus(YEAR), issuedBy:'Saïfi Dawalbet Hamit'},
    {email:'delegation@ptf-exemple.org', org:'Partenaire technique et financier',
     token:'cf-pending-7f3a', status:'pending', issuedAt:'2026-06-05T14:10:00Z',
     activatedAt:null, expiresAt:plus(14*DAY), issuedBy:'Saïfi Dawalbet Hamit'},
    {email:'ancien.contact@ptf-exemple.org', org:'Partenaire technique et financier',
     token:'cf-rev-1182', status:'revoked', issuedAt:'2026-04-02T08:00:00Z',
     activatedAt:'2026-04-04T10:00:00Z', expiresAt:plus(YEAR), issuedBy:'Saïfi Dawalbet Hamit'}
  ];

  function read(){
    try{ var raw=localStorage.getItem(KEY); if(raw){ var a=JSON.parse(raw); if(Array.isArray(a)) return a; } }catch(e){}
    write(SEED); return SEED.map(function(x){ return Object.assign({},x); });
  }
  function write(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} return a; }
  function norm(s){ return String(s||'').trim().toLowerCase(); }
  function expired(inv){ try{ return inv.expiresAt && Date.parse(inv.expiresAt) < Date.now(); }catch(e){ return false; } }

  var API={
    list:function(){ return read(); },
    get:function(email){ var e=norm(email); return read().filter(function(i){ return norm(i.email)===e; })[0]||null; },
    getByToken:function(tok){ var t=norm(tok); return read().filter(function(i){ return norm(i.token)===t; })[0]||null; },

    /* effective status of an e-mail : active | pending | revoked | expired | none */
    statusOf:function(email){
      var i=this.get(email); if(!i) return 'none';
      if(i.status==='revoked') return 'revoked';
      if(expired(i)) return 'expired';
      return i.status; // active | pending
    },
    /* the login gate : only an active, unexpired invitation may authenticate */
    canLogin:function(email){ return this.statusOf(email)==='active'; },

    /* the activation gate (invitation-bailleur) :
       ready | used | revoked | expired | invalid */
    tokenState:function(tok){
      var i=this.getByToken(tok); if(!i) return 'invalid';
      if(i.status==='revoked') return 'revoked';
      if(expired(i)) return 'expired';
      if(i.status==='active') return 'used';
      return 'ready'; // pending + valid
    },
    /* the e-mail an invitation was issued to (so the activation page can lock it) */
    emailForToken:function(tok){ var i=this.getByToken(tok); return i?i.email:''; },

    /* activate a pending token -> active (single use) */
    activate:function(tok, email){
      var a=read(), t=norm(tok), done=false;
      a.forEach(function(i){
        if(norm(i.token)===t && i.status==='pending' && !expired(i)){
          i.status='active'; i.activatedAt=nowISO();
          if(email && norm(email)===norm(i.email)) {} // email already bound to the token
          done=true;
        }
      });
      if(done) write(a);
      return done;
    },

    /* admin helpers (issue / revoke) — used by an admin issuance surface */
    issue:function(email, org){
      var a=read(), e=norm(email);
      if(!e) return null;
      var existing=a.filter(function(i){ return norm(i.email)===e; })[0];
      var tok='cf-'+Math.random().toString(36).slice(2,8)+'-'+Math.random().toString(36).slice(2,6);
      if(existing){ existing.status='pending'; existing.token=tok; existing.issuedAt=nowISO(); existing.activatedAt=null; existing.expiresAt=plus(14*DAY); }
      else { a.unshift({email:email, org:org||'Partenaire technique et financier', token:tok, status:'pending', issuedAt:nowISO(), activatedAt:null, expiresAt:plus(14*DAY), issuedBy:'Console programme'}); }
      write(a); return tok;
    },
    revoke:function(email){
      var a=read(), e=norm(email), done=false;
      a.forEach(function(i){ if(norm(i.email)===e){ i.status='revoked'; done=true; } });
      if(done) write(a); return done;
    },

    /* the demo active donor e-mail (lets the maquette log in out of the box) */
    demoEmail:function(){ var i=read().filter(function(x){ return x.status==='active' && !expired(x); })[0]; return i?i.email:''; }
  };

  window.CFPtfInvite=API;
})();
