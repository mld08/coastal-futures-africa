"""Smoke test bout-en-bout : crée la base en mémoire, amorce, et exerce
inscription / connexion / candidatures / RBAC via le client de test Flask.
Lancer : .venv/Scripts/python.exe smoke_test.py
"""
import os
import re
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SEED_ON_INIT"] = "false"

from app import create_app
from app.extensions import db
from app.seed import seed_all, DEMO_PASSWORD
import app.blueprints.auth as authmod
import app.blueprints.invites as invmod

app = create_app()
ok = 0
fail = 0

# --- Capture des e-mails (pour lire l'OTP / les liens en test) ---
SENT = []
_capture = lambda to, subject, body: SENT.append({"to": to, "subject": subject, "body": body})
authmod.send_email = _capture   # OTP, reset, vérif
invmod.send_email = _capture    # invitations


def last_code(to):
    for m in reversed(SENT):
        if m["to"] == to:
            g = re.search(r"\b(\d{6})\b", m["body"])
            if g:
                return g.group(1)
    return None


def last_token(to):
    for m in reversed(SENT):
        if m["to"] == to:
            g = re.search(r"token=([A-Za-z0-9_-]+)", m["body"])
            if g:
                return g.group(1)
    return None


def admin_login(client, email):
    """Connexion admin en 2 étapes (login -> OTP e-mail -> verify)."""
    client.post("/auth/admin/login", json={"email": email, "password": DEMO_PASSWORD})
    return client.post("/auth/admin/verify-otp", json={"email": email, "code": last_code(email)})


def check(label, cond):
    global ok, fail
    if cond:
        ok += 1
        print(f"  PASS  {label}")
    else:
        fail += 1
        print(f"  FAIL  {label}")


with app.app_context():
    db.create_all()
    seed_all(force=True)

c = app.test_client()

print("\n[health]")
r = c.get("/health")
check("GET /health -> 200", r.status_code == 200 and r.get_json()["status"] == "ok")

print("\n[calls] lecture publique = publiés uniquement")
r = c.get("/calls")
data = r.get_json()
check("GET /calls -> 200 liste", r.status_code == 200 and isinstance(data, list))
check("7 appels publiés visibles", len(data) == 7)
check("forme bilingue {fr,en}", data[0]["title"].get("fr") and data[0]["title"].get("en"))

print("\n[applications] liste réservée admin (401 anonyme)")
r = c.get("/applications")
check("GET /applications anonyme -> 401", r.status_code == 401)

print("\n[register] inscription membre")
r = c.post("/auth/register", json={
    "name": "Test Entrepreneur", "email": "test.entrepreneur@example.sn",
    "password": "MotDePasse123", "memberType": "entrepreneur", "country": "Sénégal"})
check("POST /auth/register -> 201", r.status_code == 201)
check("session ouverte (user renvoyé)", r.get_json().get("user", {}).get("email") == "test.entrepreneur@example.sn")
r = c.get("/auth/me")
check("GET /auth/me authentifié", r.get_json().get("authenticated") is True)
c.post("/auth/logout")

print("\n[register] refus doublon + mot de passe faible")
r = c.post("/auth/register", json={"name": "Dup", "email": "test.entrepreneur@example.sn", "password": "MotDePasse123", "memberType": "entrepreneur"})
check("doublon e-mail -> 409", r.status_code == 409)
r = c.post("/auth/register", json={"name": "Faible", "email": "faible@example.sn", "password": "123", "memberType": "entrepreneur"})
check("mot de passe faible -> 400", r.status_code == 400)

print("\n[login] connexion membre amorcé")
r = c.post("/auth/login", json={"email": "aminata.diallo@example.sn", "password": DEMO_PASSWORD})
check("login membre -> 200", r.status_code == 200)
r = c.post("/auth/login", json={"email": "aminata.diallo@example.sn", "password": "mauvais"})
check("mauvais mot de passe -> 401", r.status_code == 401)

print("\n[login] séparation membre / admin")
r = c.post("/auth/login", json={"email": "saifi.dawalbethamit@africagovernanceinstitute.org", "password": DEMO_PASSWORD})
check("admin via /auth/login -> 403", r.status_code == 403)

print("\n[candidature] dépôt public")
r = c.post("/applications", json={
    "appelId": "cohorte-2",
    "candidat": {"nom": "Awa Ndiaye", "email": "awa.ndiaye@example.sn", "genre": "Femme", "pays": "Sénégal", "ville": "Thiès"},
    "projet": {"nom": "Récifs Verts", "stade": "Idéation", "secteur": "mangroves", "description": "Restauration de récifs."},
    "motivation": "Protéger le littoral.", "besoins": "Financement."})
check("POST /applications public -> 201", r.status_code == 201)
app_created = r.get_json()
check("statut initial submitted", app_created["status"] == "submitted")
check("historique 'submitted' ajouté", app_created["history"][0]["action"] == "submitted")
new_id = app_created["id"]

print("\n[admin] connexion + accès candidatures + compteur d'appel incrémenté")
adm = app.test_client()
SUPER = "saifi.dawalbethamit@africagovernanceinstitute.org"
r = adm.post("/auth/admin/login", json={"email": SUPER, "password": DEMO_PASSWORD})
check("admin/login étape 1 -> otpRequired (pas encore connecté)", r.status_code == 200 and r.get_json().get("otpRequired") is True)
check("OTP 2FA envoyé par e-mail (capturé)", last_code(SUPER) is not None)
r = adm.get("/applications")
check("pas de session tant que l'OTP n'est pas validé (401)", r.status_code == 401)
r = adm.post("/auth/admin/verify-otp", json={"email": SUPER, "code": last_code(SUPER)})
check("admin/verify-otp -> 200 + session", r.status_code == 200 and r.get_json()["session"]["role"] == "super")
check("mauvais OTP -> 401", app.test_client().post("/auth/admin/verify-otp", json={"email": SUPER, "code": "000000"}).status_code == 401)
r = adm.get("/applications")
apps = r.get_json()
check("GET /applications admin -> 200", r.status_code == 200)
check("5 candidatures (4 seed + 1 nouvelle)", len(apps) == 5)
r = adm.get("/calls")
cohorte2 = next(x for x in r.get_json() if x["id"] == "cohorte-2")
check("compteur cohorte-2 incrémenté 42 -> 43", cohorte2["apps"] == 43)

print("\n[admin] changement de statut d'une candidature")
r = adm.patch(f"/applications/{new_id}", json={"status": "review", "note": "En cours."})
check("PATCH statut -> 200", r.status_code == 200)
check("statut mis à jour review", r.get_json()["status"] == "review")
check("historique enrichi", r.get_json()["history"][-1]["action"] == "review")

print("\n[rbac] modérateur ne peut pas créer d'appel")
mod = app.test_client()
admin_login(mod, "kofi.mensah@africagovernanceinstitute.org")
r = mod.post("/calls", json={"title": {"fr": "Nouvel appel", "en": "New call"}})
check("modérateur POST /calls -> 403", r.status_code == 403)
r = adm.post("/calls", json={"title": {"fr": "Appel test", "en": "Test call"}, "state": "open"})
check("super POST /calls -> 201", r.status_code == 201)

print("\n[admin] écriture-retour : décision + évaluation persistées (comme cf-candidatures-admin)")
r = adm.patch(f"/applications/{new_id}", json={
    "status": "rejected",
    "history": [{"at": "2026-07-04", "by": "Console", "action": "rejected", "note": "Hors périmètre."}],
    "evaluation": {"durabilite": 30, "emplois": 20, "synergie": 10},
})
check("PATCH status 'rejected' (statut canonique front) -> 200", r.status_code == 200)
body = r.get_json()
check("statut persisté rejected", body["status"] == "rejected")
check("historique pris verbatim", body["history"] == [{"at": "2026-07-04", "by": "Console", "action": "rejected", "note": "Hors périmètre."}])
check("évaluation persistée", body.get("evaluation") == {"durabilite": 30, "emplois": 20, "synergie": 10})
r = adm.get("/applications")
persisted = next(x for x in r.get_json() if x["id"] == new_id)
check("relecture: statut rejected persistant en base", persisted["status"] == "rejected")

print("\n[bailleur] connexion partenaire (espace PTF, 2FA e-mail)")
PTF_MAIL = "partenaire@example.org"
ptf = app.test_client()
check("partenaire via /auth/login -> 403 (doit passer par /ptf)",
      ptf.post("/auth/login", json={"email": PTF_MAIL, "password": DEMO_PASSWORD}).status_code == 403)
r = ptf.post("/auth/ptf/login", json={"email": PTF_MAIL, "password": DEMO_PASSWORD})
check("ptf/login -> otpRequired", r.status_code == 200 and r.get_json().get("otpRequired") is True)
r = ptf.post("/auth/ptf/verify-otp", json={"email": PTF_MAIL, "code": last_code(PTF_MAIL)})
check("ptf/verify-otp -> 200 partenaire", r.status_code == 200 and r.get_json()["user"]["memberType"] == "partenaire")

print("\n[CMS] lecture publique actualités / événements (publiés)")
r = c.get("/news")
news = r.get_json()
check("GET /news -> liste", r.status_code == 200 and isinstance(news, list))
check("4 actualités publiées", len(news) == 4)
check("forme bilingue + tri par date desc", news[0]["title"].get("fr") and news[0]["date"] >= news[-1]["date"])
r = c.get("/events")
check("GET /events -> 6 événements", r.status_code == 200 and len(r.get_json()) == 6)

print("\n[CMS] création + publication d'un article (admin contenu = éditeur)")
ed = app.test_client()
admin_login(ed, "ousmane.ba@africagovernanceinstitute.org")
r = ed.post("/news", json={
    "id": "essai-cms", "pub": "draft", "date": "2026-07-04",
    "title": {"fr": "Article de test CMS", "en": "CMS test article"},
    "excerpt": {"fr": "Brouillon.", "en": "Draft."}, "body": {"fr": "<p>Contenu.</p>"}})
check("POST /news (upsert) -> 201", r.status_code == 201)
check("public ne voit pas le brouillon", "essai-cms" not in [x["id"] for x in c.get("/news").get_json()])
r = ed.patch("/news/essai-cms", json={"pub": "published"})
check("PATCH publication -> 200", r.status_code == 200 and r.get_json()["pub"] == "published")
check("public voit l'article publié", "essai-cms" in [x["id"] for x in c.get("/news").get_json()])
r = ed.post("/news", json={"id": "essai-cms", "excerpt": {"fr": "Mis à jour.", "en": "Updated."}})
check("upsert = fusion (titre préservé)", r.get_json()["title"]["fr"] == "Article de test CMS" and r.get_json()["excerpt"]["fr"] == "Mis à jour.")
r = ed.delete("/news/essai-cms")
check("DELETE -> 204", r.status_code == 204)
check("supprimé de la liste", "essai-cms" not in [x["id"] for x in ed.get("/news").get_json()])

print("\n[CMS] RBAC : écriture réservée à l'admin")
anon = app.test_client()
r = anon.post("/news", json={"id": "pirate", "title": {"fr": "X"}})
check("POST /news anonyme -> 401", r.status_code == 401)
r = mod.post("/news", json={"id": "pirate", "title": {"fr": "X"}})
check("modérateur POST /news -> 403", r.status_code == 403)

print("\n[annuaires] entrepreneurs / mentors (public + admin)")
r = c.get("/entrepreneurs")
check("GET /entrepreneurs -> 12", r.status_code == 200 and len(r.get_json()) == 12)
r = c.get("/mentors")
mentors = r.get_json()
check("GET /mentors -> 8", r.status_code == 200 and len(mentors) == 8)
check("forme annuaire (n, org, dispo, exp[])", mentors[0].get("n") and "exp" in mentors[0])
# édition admin (cf-annuaires-admin : CFCol.upsert) + modération (pub archived)
r = ed.post("/mentors", json={"id": "dr-sophie-mendy", "dispo": False})
check("upsert mentor (fusion) -> 200, name préservé", r.status_code == 200 and r.get_json()["n"] == "Dr Sophie Mendy" and r.get_json()["dispo"] is False)
ed.patch("/entrepreneurs/kofi-mensah", json={"pub": "archived"})
check("modération pub:archived -> masqué du public", "kofi-mensah" not in [x["id"] for x in c.get("/entrepreneurs").get_json()])
check("mais visible de l'admin", "kofi-mensah" in [x["id"] for x in ed.get("/entrepreneurs").get_json()])
r = ed.delete("/mentors/fatima-sesay")
check("DELETE mentor -> 204", r.status_code == 204)
check("modérateur ne peut pas éditer l'annuaire", mod.post("/mentors", json={"id": "x", "n": "X"}).status_code == 403)

print("\n[messagerie] fils + messages (console admin)")
anon2 = app.test_client()
check("GET /threads anonyme -> 401", anon2.get("/threads").status_code == 401)
r = adm.get("/threads")
check("GET /threads admin -> 2 fils", r.status_code == 200 and len(r.get_json()) == 2)
r = adm.get("/messages")
msgs = r.get_json()
check("GET /messages admin -> 2 messages", len(msgs) == 2)
check("forme message (threadId, from)", "threadId" in msgs[0] and "from" in msgs[0])
# réponse admin = CFCol.push -> POST /messages
r = adm.post("/messages", json={"id": "msg-reply-1", "threadId": "th-aminata-diallo",
                                "from": {"name": "Équipe Coastal Futures", "role": "super", "verified": True},
                                "at": "2026-07-04T10:00:00", "body": "Bonjour, voici les prochaines étapes…", "read": True})
check("POST /messages (envoi) -> 201", r.status_code == 201)
check("3 messages après envoi", len(adm.get("/messages").get_json()) == 3)
check("message vide -> 400", adm.post("/messages", json={"threadId": "th-aminata-diallo", "body": "  "}).status_code == 400)
# marquer lu (patch) + fermer le fil (patch)
r = adm.patch("/messages/m-a1", json={"read": True})
check("PATCH message read -> true", r.status_code == 200 and r.get_json()["read"] is True)
r = adm.patch("/threads/th-mohamed-bangura", json={"closed": True, "closedBy": {"name": "Saïfi", "role": "super"}})
check("PATCH thread closed -> true", r.status_code == 200 and r.get_json()["closed"] is True)
check("relecture: fil toujours fermé en base", next(x for x in adm.get("/threads").get_json() if x["id"] == "th-mohamed-bangura")["closed"] is True)

print("\n[mentorat] demandes de mentorat (profil-mentor -> MentorRequest)")
check("GET /mentor_requests anonyme -> 401", app.test_client().get("/mentor_requests").status_code == 401)
r = adm.get("/mentor_requests")
check("GET /mentor_requests admin -> 3 (seed)", r.status_code == 200 and len(r.get_json()) == 3)
# envoi public depuis la fiche mentor (bouton #ccSend)
pub = app.test_client()
r = pub.post("/mentor_requests", json={"mentorId": "dr-kwame-asante", "mentorName": "Dr Kwame Asante",
                                       "from": {"name": "Visiteur"}, "message": "Bonjour, j'aimerais un accompagnement sur mon projet solaire."})
check("POST /mentor_requests public -> 201", r.status_code == 201)
check("statut initial en_attente", r.get_json()["status"] == "en_attente")
new_req = r.get_json()["id"]
check("message vide -> 400", pub.post("/mentor_requests", json={"mentorId": "x", "message": " "}).status_code == 400)
check("4 demandes après envoi", len(adm.get("/mentor_requests").get_json()) == 4)
# identité capturée si connecté
r = ptf.post("/mentor_requests", json={"mentorId": "dr-sophie-mendy", "message": "Demande depuis un compte connecté."})
check("demande connectée capture le compte", r.get_json()["from"]["email"] == "partenaire@example.org")
# accepter / décliner (mentor ou admin)
r = adm.patch(f"/mentor_requests/{new_req}", json={"status": "accepte"})
check("PATCH accepte -> 200", r.status_code == 200 and r.get_json()["status"] == "accepte")
check("statut invalide -> 400", adm.patch(f"/mentor_requests/{new_req}", json={"status": "peut-etre"}).status_code == 400)

print("\n[espace mentor] vues scopées au mentor connecté")
men = app.test_client()
men.post("/auth/login", json={"email": "kwame.asante@example.gh", "password": DEMO_PASSWORD})
reqs = men.get("/mentor_requests").get_json()
check("mentor ne voit QUE ses demandes", len(reqs) > 0 and all(r["mentorId"] == "dr-kwame-asante" for r in reqs))
check("mentor ne voit pas celles d'un autre", all(r["id"] != "mreq-seed-3" for r in reqs))
ms = men.get("/mentorships").get_json()
check("mes mentorés scopés", all(m["mentorId"] == "dr-kwame-asante" for m in ms) and len(ms) >= 1)
before = len(ms)
r = men.patch("/mentor_requests/mreq-seed-2", json={"status": "accepte"})
check("mentor accepte sa demande -> 200", r.status_code == 200 and r.get_json()["status"] == "accepte")
after = men.get("/mentorships").get_json()
check("accepter crée un mentorat (Ibrahim Koroma)", any(m["mentee"]["name"] == "Ibrahim Koroma" for m in after))
check("mentee enrichi depuis l'annuaire (secteur)", any(m["mentee"]["name"] == "Ibrahim Koroma" and m["mentee"]["sector"] == "agriculture" for m in after))
check("mentor NE PEUT PAS toucher la demande d'un autre (403)", men.patch("/mentor_requests/mreq-seed-3", json={"status": "decline"}).status_code == 403)
sess = men.get("/mentor_sessions").get_json()
check("mes sessions scopées", all(s["mentorId"] == "dr-kwame-asante" for s in sess) and len(sess) >= 1)
r = men.post("/mentor_sessions", json={"menteeName": "Ibrahim Koroma", "title": "Premier point", "scheduledAt": "2026-08-01T10:00:00", "channel": "en_ligne"})
check("mentor propose une session -> 201", r.status_code == 201 and r.get_json()["mentorId"] == "dr-kwame-asante")
r = men.patch("/mentorships/ment-kwame-aminata", json={"status": "terminee"})
check("mentor clôture un mentorat -> terminee", r.status_code == 200 and r.get_json()["status"] == "terminee")
check("statut mentorat invalide -> 400", men.patch("/mentorships/ment-kwame-aminata", json={"status": "xxx"}).status_code == 400)
check("mentor NE clôture PAS un mentorat inexistant/autre (404/403)", men.patch("/mentorships/ment-nexiste-pas", json={"status": "terminee"}).status_code == 404)

print("\n[projets / carte d'impact] registre partagé (indicateurs dérivés côté client)")
r = c.get("/projects")
projs = r.get_json()
check("GET /projects public -> 10", r.status_code == 200 and len(projs) == 10)
check("id entier préservé (pas de coercition en slug)", isinstance(projs[0]["id"], int) and projs[0]["name"] == "Dakar Solar Solutions")
check("champs carte présents (lat/lng/statut/impact)", all(k in projs[0] for k in ("lat", "lng", "statut", "impact")))
# écriture réservée au coordinateur pays / super
country = app.test_client()
admin_login(country, "aminata.sow@africagovernanceinstitute.org")
projs2 = [dict(p) for p in projs]
projs2[4]["statut"] = "Labellisé"  # ReCycle Accra : Soumis -> Labellisé
projs2.append(dict(id=11, name="Nouveau projet test", type="energie", pays="Ghana", ville="Kumasi", statut="Soumis", lat=6.7, lng=-1.6, impact="pilote"))
r = country.put("/projects", json=projs2)
check("coordinateur pays PUT /projects -> 200 (11)", r.status_code == 200 and len(r.get_json()) == 11)
after = c.get("/projects").get_json()
check("modif persistée (ReCycle Accra Labellisé)", next(p for p in after if p["id"] == 5)["statut"] == "Labellisé")
check("nouveau projet persisté (id 11)", any(p["id"] == 11 for p in after))
check("admin contenu NE PEUT PAS écrire les projets (403)", ed.put("/projects", json=[]).status_code == 403)
check("PUT /projets anonyme -> 401", app.test_client().put("/projects", json=[]).status_code == 401)

print("\n[durcissement] vérification e-mail")
tok = last_token("test.entrepreneur@example.sn")  # e-mail de vérif envoyé à l'inscription
check("e-mail de vérification envoyé à l'inscription", tok is not None)
r = c.post("/auth/verify-email", json={"token": tok})
check("verify-email -> 200", r.status_code == 200)
check("jeton à usage unique (rejeu -> 400)", c.post("/auth/verify-email", json={"token": tok}).status_code == 400)

print("\n[durcissement] réinitialisation de mot de passe par e-mail")
RESET_MAIL = "aminata.diallo@example.sn"
check("forgot e-mail inconnu -> 200 (pas d'énumération)",
      c.post("/auth/forgot-password", json={"email": "inconnu@example.org"}).status_code == 200)
check("aucun e-mail envoyé à l'inconnu", last_token("inconnu@example.org") is None)
r = c.post("/auth/forgot-password", json={"email": RESET_MAIL})
check("forgot -> 200 + lien envoyé", r.status_code == 200 and last_token(RESET_MAIL) is not None)
rtok = last_token(RESET_MAIL)
check("reset mot de passe trop court -> 400", c.post("/auth/reset-password", json={"token": rtok, "password": "abc"}).status_code == 400)
r = c.post("/auth/reset-password", json={"token": rtok, "password": "NouveauPass2026"})
check("reset-password -> 200", r.status_code == 200)
fresh = app.test_client()
check("connexion avec le NOUVEAU mot de passe -> 200",
      fresh.post("/auth/login", json={"email": RESET_MAIL, "password": "NouveauPass2026"}).status_code == 200)
check("ancien mot de passe rejeté -> 401",
      app.test_client().post("/auth/login", json={"email": RESET_MAIL, "password": DEMO_PASSWORD}).status_code == 401)
check("jeton de reset à usage unique (rejeu -> 400)",
      app.test_client().post("/auth/reset-password", json={"token": rtok, "password": "Encore123456"}).status_code == 400)

print("\n[durcissement] rate-limiting anti-bruteforce")
burst = [app.test_client().post("/auth/forgot-password", json={"email": "spam@example.org"}).status_code for _ in range(8)]
check("rafale sur /auth/forgot-password -> 429 déclenché", 429 in burst)

print("\n[invitations] super invite un bailleur -> activation -> compte")
INV_MAIL = "nouveau.bailleur@example.org"
r = adm.post("/admin/invites", json={"email": INV_MAIL, "role": "partenaire", "name": "Nouveau Bailleur"})
check("création invitation (super) -> 201", r.status_code == 201)
itok = last_token(INV_MAIL)
check("e-mail d'invitation envoyé (jeton présent)", itok is not None)
check("admin contenu NE PEUT PAS inviter (403)", ed.post("/admin/invites", json={"email": "x@y.z", "role": "partenaire"}).status_code == 403)
guest = app.test_client()
r = guest.get(f"/auth/invite/{itok}")
check("infos d'invitation valides", r.status_code == 200 and r.get_json()["email"] == INV_MAIL)
r = guest.post("/auth/accept-invite", json={"token": itok, "password": "BailleurPass2026"})
check("activation -> 200 + compte partenaire", r.status_code == 200 and r.get_json()["user"]["memberType"] == "partenaire")
check("jeton d'invitation à usage unique (rejeu -> 400)",
      app.test_client().post("/auth/accept-invite", json={"token": itok, "password": "Autre123456"}).status_code == 400)
r = app.test_client().post("/auth/ptf/login", json={"email": INV_MAIL, "password": "BailleurPass2026"})
check("compte activé peut se connecter (ptf/login otpRequired)", r.status_code == 200 and r.get_json().get("otpRequired") is True)

print("\n[messagerie membre] fils scopés au membre connecté")
mem = app.test_client()
mem.post("/auth/login", json={"email": "mohamed.bangura@example.sl", "password": DEMO_PASSWORD})
th = mem.get("/threads").get_json()
check("membre voit son/ses fil(s)", len(th) >= 1)
check("membre ne voit PAS le fil d'un autre", all(t["id"] != "th-aminata-diallo" for t in th))
r = mem.post("/messages", json={"threadId": "th-mohamed-bangura",
                                "from": {"name": "Mohamed Bangura", "role": "entrepreneur"},
                                "body": "Merci pour votre retour, je complète le dossier."})
check("membre écrit dans SON fil -> 201", r.status_code == 201)
check("membre NE PEUT PAS écrire dans le fil d'un autre (403)",
      mem.post("/messages", json={"threadId": "th-aminata-diallo", "body": "intrus"}).status_code == 403)
check("admin voit TOUS les fils", len(adm.get("/threads").get_json()) >= 2)

print("\n[newsletter] abonnement + gestion admin (plus de Google Sheets)")
import app.blueprints.messaging as msgmod
msgmod.send_email = _capture  # capture aussi les e-mails de notification contact
NOTIFY = app.config["ADMIN_NOTIFY_EMAIL"]
r = c.post("/newsletters", json={"email": "nouveau@example.sn", "lang": "fr", "source": "footer"})
check("POST /newsletters public -> 201", r.status_code == 201 and r.get_json()["source"] == "footer")
check("ré-abonnement dé-dupliqué (200)", c.post("/newsletters", json={"email": "nouveau@example.sn"}).status_code == 200)
check("GET /newsletters anonyme -> 401 (plus public)", app.test_client().get("/newsletters").status_code == 401)
subs = adm.get("/newsletters").get_json()
check("admin voit les abonnés (seed + nouveau)", any(s["email"] == "nouveau@example.sn" for s in subs))
check("DELETE abonné (admin) -> 204", adm.delete(f"/newsletters/{subs[0]['id']}").status_code == 204)

print("\n[contact] message + notification e-mail à l'équipe + boîte admin")
before = len(SENT)
r = c.post("/contacts", json={"name": "Awa Sarr", "email": "awa.sarr@example.sn", "org": "GreenCoop",
                              "pays": "Sénégal", "sujet": "Partenariat", "message": "Bonjour, parlons partenariat."})
check("POST /contacts public -> 201 (forme admin)", r.status_code == 201 and r.get_json()["sujet"] == "Partenariat" and r.get_json()["read"] is False)
cid = r.get_json()["id"]
check("e-mail de notification envoyé à l'équipe", any(m["to"] == NOTIFY and "Awa Sarr" in m["body"] for m in SENT[before:]))
contacts = adm.get("/contacts").get_json()
check("admin voit la boîte (seed + nouveau)", len(contacts) >= 3 and any(x["id"] == cid for x in contacts))
check("visiteur NE voit PAS la boîte (401)", app.test_client().get("/contacts").status_code == 401)
r = adm.patch(f"/contacts/{cid}", json={"read": True})
check("PATCH marquer lu -> read true", r.status_code == 200 and r.get_json()["read"] is True)
check("DELETE message (admin) -> 204", adm.delete(f"/contacts/{cid}").status_code == 204)

print(f"\n=== {ok} PASS / {fail} FAIL ===")
raise SystemExit(1 if fail else 0)
