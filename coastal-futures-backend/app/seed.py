"""Amorçage : recopie les données de démonstration du frontend
(public/assets/cf-collections.js et cf-admin-auth.js) dans la base.

Idempotent : ne fait rien si la base contient déjà des comptes, sauf --force.
Mot de passe de démonstration commun (à changer hors démo) : voir DEMO_PASSWORD.
"""
from .extensions import db
from .models import (User, Call, Application, Subscriber, ContactMessage, Content,
                     Thread, Message, MentorRequest, Mentorship, MentorSession, MapProject)
from .seed_content import seed_content
from .util import i18n

# Mot de passe attribué à tous les comptes amorcés (démo uniquement).
DEMO_PASSWORD = "Coastal2026!"

# --- Appels à candidatures (extrait fidèle de cf-collections.js) ---
CALLS = [
    dict(id="cohorte-2", state="open", featured=True,
         type=i18n("Entreprise verte", "Green enterprise"),
         title=i18n("Cohorte 2 : incubation des entreprises vertes", "Cohort 2: green enterprise incubation"),
         desc=i18n("Douze semaines d'accompagnement intensif, accès au réseau de mentors, et soutien complet à la labellisation pour les jeunes entreprises vertes en phase de démarrage.",
                   "Twelve weeks of intensive support, access to the mentor network, and full help towards certification for early-stage young green businesses."),
         countries=["Sénégal", "Ghana", "Guinée-Conakry", "Liberia", "Sierra Leone"],
         criteria=[i18n("Porteur âgé de 18 à 35 ans", "Leader aged 18 to 35"),
                   i18n("Projet vert en phase de démarrage", "Early-stage green project"),
                   i18n("Résider dans un pays du programme", "Resident in a programme country"),
                   i18n("Impact mesurable sur le littoral", "Measurable impact on the coast")],
         deadline="2026-06-30", apps=42, cap=60),
    dict(id="mangroves", state="open",
         type=i18n("Restauration de mangroves", "Mangrove restoration"),
         title=i18n("Bourse restauration de mangroves côtières", "Coastal mangrove restoration grant"),
         desc=i18n("Financement de semis et suivi des indicateurs de surface restaurée pour les projets communautaires de protection du littoral.",
                   "Funding for seedlings and tracking of restored-area indicators for community coastal-protection projects."),
         countries=["Liberia", "Sierra Leone"], deadline="2026-07-15", apps=19),
    dict(id="energie", state="open",
         type=i18n("Énergie renouvelable", "Renewable energy"),
         title=i18n("Fonds énergie renouvelable jeunesse", "Youth renewable energy fund"),
         desc=i18n("Subventions d'amorçage pour les mini-réseaux solaires et solutions d'accès à l'énergie portées par des jeunes.",
                   "Seed grants for youth-led solar mini-grids and energy-access solutions."),
         countries=["Sénégal", "Ghana", "Guinée-Conakry"], deadline="2026-08-12", apps=27),
    dict(id="mentorat", state="open",
         type=i18n("Mentorat", "Mentorship"),
         title=i18n("Programme mentorat finance verte", "Green finance mentorship programme"),
         desc=i18n("Six mois d'accompagnement par des experts de la finance verte pour structurer votre modèle et préparer une levée de fonds.",
                   "Six months of guidance from green-finance experts to structure your model and prepare a fundraise."),
         countries=["Tous les pays"], deadline="2026-08-28", apps=11),
    dict(id="circulaire", state="upcoming",
         type=i18n("Économie circulaire", "Circular economy"),
         title=i18n("Appel économie circulaire côtière", "Coastal circular economy call"),
         desc=i18n("Soutien aux coopératives de collecte et de valorisation des déchets du littoral. Ouverture prochaine, préparez votre dossier.",
                   "Support for coastal waste-collection and recovery cooperatives. Opening soon, prepare your application."),
         countries=["Ghana", "Sénégal"], opens=i18n("Ouverture sept. 2026", "Opens Sept. 2026")),
    dict(id="agriculture", state="upcoming",
         type=i18n("Agriculture résiliente", "Resilient agriculture"),
         title=i18n("Bourse agriculture climato-résiliente", "Climate-resilient agriculture grant"),
         desc=i18n("Financement de parcelles pilotes et d'équipements pour les jeunes agriculteurs des zones côtières.",
                   "Funding for pilot plots and equipment for young farmers in coastal areas."),
         countries=["Sierra Leone", "Liberia"], opens=i18n("Ouverture oct. 2026", "Opens Oct. 2026")),
    dict(id="cohorte-1", state="closed",
         type=i18n("Entreprise verte", "Green enterprise"),
         title=i18n("Cohorte 1 : incubation des entreprises vertes", "Cohort 1: green enterprise incubation"),
         desc=i18n("Premier appel du programme, clôturé en avril 2026. La première cohorte est en cours de constitution.",
                   "The programme first call, closed in April 2026. The first cohort is being assembled."),
         countries=["Tous les pays"], apps=140),
]

# --- Candidatures (extrait de cf-collections.js) ---
APPLICATIONS = [
    dict(id="app-aminata-diallo", status="review", appelId="cohorte-2", submittedAt="2026-06-05",
         assignee="Saïfi Dawalbet Hamit",
         candidat={"nom": "Aminata Diallo", "email": "aminata.diallo@example.sn", "genre": "Femme", "pays": "Sénégal", "ville": "Dakar"},
         projet={"nom": "Dakar Solar Solutions", "stade": "Amorçage", "secteur": "energie",
                 "description": "Mini-réseaux solaires pour les ateliers de transformation et les chambres froides des communautés de pêche de la Petite Côte."},
         motivation="Je veux donner aux communautés de pêche un accès fiable à l'énergie propre...",
         besoins="Mentorat en finance verte, accès aux appels à candidatures, mise en relation avec des fournisseurs.",
         pieces=[{"name": "presentation-dakar-solar.pdf", "type": "pdf", "size": 1840000},
                 {"name": "piece-identite.jpg", "type": "jpg", "size": 420000}],
         history=[{"at": "2026-06-05", "by": "Aminata Diallo", "action": "submitted", "note": ""},
                  {"at": "2026-06-06", "by": "Saïfi Dawalbet Hamit", "action": "review", "note": "Dossier complet, en cours d'évaluation."}]),
    dict(id="app-mohamed-bangura", status="submitted", appelId="cohorte-2", submittedAt="2026-06-06", assignee="",
         candidat={"nom": "Mohamed Bangura", "email": "mohamed.bangura@example.sl", "genre": "Homme", "pays": "Sierra Leone", "ville": "Freetown"},
         projet={"nom": "Compost côtier", "stade": "Idéation", "secteur": "recyclage",
                 "description": "Collecte et compostage des déchets organiques des marchés côtiers de Freetown."},
         motivation="Les déchets organiques s'accumulent sur le littoral alors qu'ils pourraient nourrir les sols.",
         besoins="Accompagnement pour structurer le modèle économique.",
         pieces=[{"name": "note-projet-compost.pdf", "type": "pdf", "size": 920000}],
         history=[{"at": "2026-06-06", "by": "Mohamed Bangura", "action": "submitted", "note": ""}]),
    dict(id="app-fatou-sarr", status="incomplete", appelId="cohorte-2", submittedAt="2026-06-04", assignee="Aminata Sow",
         candidat={"nom": "Fatou Sarr", "email": "fatou.sarr@example.sn", "genre": "Femme", "pays": "Sénégal", "ville": "Saint-Louis"},
         projet={"nom": "Téranga Agro", "stade": "Amorçage", "secteur": "agriculture",
                 "description": "Parcelles maraîchères climato-résilientes et circuits courts pour Saint-Louis."},
         motivation="Face à la salinisation des terres du delta, je teste des cultures adaptées.",
         besoins="Appui agronomique, mise en relation avec un mentor agriculture.",
         pieces=[{"name": "presentation-teranga.pdf", "type": "pdf", "size": 1240000}],
         history=[{"at": "2026-06-04", "by": "Fatou Sarr", "action": "submitted", "note": ""},
                  {"at": "2026-06-05", "by": "Aminata Sow", "action": "incomplete", "note": "Pièce d'identité manquante."}]),
    dict(id="app-james-tuah", status="submitted", appelId="mangroves", submittedAt="2026-06-07", assignee="",
         candidat={"nom": "James Tuah", "email": "james.tuah@example.lr", "genre": "Homme", "pays": "Liberia", "ville": "Monrovia"},
         projet={"nom": "Mangrove Restore Initiative", "stade": "Idéation", "secteur": "mangroves",
                 "description": "Restauration des mangroves dégradées du littoral de Mesurado."},
         motivation="Les mangroves protègent nos maisons de l'érosion et abritent les nurseries de poissons.",
         besoins="Financement de semis, formation aux techniques de plantation.",
         pieces=[{"name": "projet-mangrove.pdf", "type": "pdf", "size": 1050000}],
         history=[{"at": "2026-06-07", "by": "James Tuah", "action": "submitted", "note": ""}]),
]

# --- Comptes membres (cf-collections.js `users`) ---
MEMBERS = [
    dict(id="aminata-diallo", name="Aminata Diallo", email="aminata.diallo@example.sn", role="entrepreneur", pays="Sénégal"),
    dict(id="mohamed-bangura", name="Mohamed Bangura", email="mohamed.bangura@example.sl", role="entrepreneur", pays="Sierra Leone"),
    dict(id="kofi-mensah-ent", name="Kofi Mensah", email="kofi.mensah@example.gh", role="entrepreneur", pays="Ghana"),
    dict(id="dr-kwame-asante", name="Dr Kwame Asante", email="kwame.asante@example.gh", role="mentor", pays="Ghana"),
    dict(id="dr-sophie-mendy", name="Dr Sophie Mendy", email="sophie.mendy@example.sn", role="mentor", pays="Sénégal"),
    dict(id="joseph-kamara", name="Joseph Kamara", email="joseph.kamara@example.sl", role="entrepreneur", pays="Sierra Leone"),
]

# --- Comptes admin (cf-admin-auth.js DIRECTORY) ---
ADMINS = [
    dict(email="saifi.dawalbethamit@africagovernanceinstitute.org", name="Saïfi Dawalbet Hamit", role="super", country=""),
    dict(email="ousmane.ba@africagovernanceinstitute.org", name="Ousmane Bâ", role="content", country=""),
    dict(email="aminata.sow@africagovernanceinstitute.org", name="Aminata Sow", role="country", country="Sénégal"),
    dict(email="kofi.mensah@africagovernanceinstitute.org", name="Kofi Mensah", role="moderator", country=""),
]

# --- Comptes bailleurs / PTF (espace partenaires, cf-ptf-*) ---
# member_type 'partenaire' : `name` porte le nom de l'institution affiché
# dans l'espace bailleurs (cf-ptf-identity.js).
PARTNERS = [
    dict(id="ptf-ue-senegal", name="Partenaire technique et financier",
         email="partenaire@example.org", country=""),
]

SUBSCRIBERS = [
    dict(email="awa.diop@example.sn", lang="fr", source="newsletter · index"),
    dict(email="k.mensah@example.gh", lang="en", source="newsletter · a-propos"),
]

# --- Messages de contact (boîte admin) ---
CONTACTS = [
    dict(name="Fatima Diallo", email="fatima.diallo@example.sn", org="Coopérative Teranga",
         pays="Sénégal", subject="Partenariat local",
         message="Bonjour, notre coopérative souhaiterait collaborer avec le programme sur la Petite Côte.", read=False),
    dict(name="Kofi Owusu", email="kofi.owusu@example.gh", org="", pays="Ghana",
         subject="Question sur les candidatures",
         message="Les inscriptions de la cohorte 2 sont-elles ouvertes aux structures déjà accompagnées ?", read=True),
]

# --- Messagerie : fils + messages (cf-collections.js) ---
TEAM = {"id": "team", "role": "team", "name": "Équipe Coastal Futures", "verified": True}
THREADS = [
    dict(id="th-aminata-diallo", subject=i18n("Étapes après acceptation", "Steps after acceptance"),
         with_name="Aminata Diallo", with_email="aminata.diallo@example.sn",
         participants=[TEAM, {"id": "aminata-diallo", "role": "entrepreneur", "name": "Aminata Diallo"}]),
    dict(id="th-mohamed-bangura", subject=i18n("Pièces du dossier", "Application documents"),
         with_name="Mohamed Bangura", with_email="mohamed.bangura@example.sl",
         participants=[TEAM, {"id": "mohamed-bangura", "role": "entrepreneur", "name": "Mohamed Bangura"}]),
]
MESSAGES = [
    dict(id="m-a1", thread_id="th-aminata-diallo",
         sender={"name": "Aminata Diallo", "role": "entrepreneur", "verified": False},
         at="2026-06-07T08:10:00",
         body="Bonjour, quelles sont les prochaines étapes une fois ma candidature acceptée ?", read=False),
    dict(id="m-m1", thread_id="th-mohamed-bangura",
         sender={"name": "Mohamed Bangura", "role": "entrepreneur", "verified": False},
         at="2026-06-06T15:30:00",
         body="Bonjour, pourriez-vous confirmer que mon dossier est complet ? Merci.", read=False),
]

# --- Demandes de mentorat (MentorRequest) ---
MENTOR_REQUESTS = [
    dict(id="mreq-seed-1", mentor_id="dr-kwame-asante", mentor_name="Dr Kwame Asante",
         from_name="Awa Ndoye", from_email="awa.ndoye@example.sn", status="en_attente",
         message="Bonjour, je porte un projet d'accès à l'énergie propre et je souhaiterais votre accompagnement sur le modèle économique."),
    dict(id="mreq-seed-2", mentor_id="dr-kwame-asante", mentor_name="Dr Kwame Asante",
         from_name="Ibrahim Koroma", from_email="ibrahim.koroma@example.sl", status="en_attente",
         message="Je cherche un mentor pour structurer mon modèle économique avant de candidater à la Cohorte 2."),
    dict(id="mreq-seed-3", mentor_id="dr-sophie-mendy", mentor_name="Dr Sophie Mendy",
         from_name="Fatou Sarr", from_email="fatou.sarr@example.sn", status="accepte",
         message="Bonjour, j'aimerais un appui sur le financement de mes parcelles maraîchères."),
]

# --- Mentorats actifs (Mentorship) ---
MENTORSHIPS = [
    dict(id="ment-kwame-aminata", mentor_id="dr-kwame-asante", mentee_name="Aminata Diallo",
         mentee_email="aminata.diallo@example.sn", mentee_org="Dakar Solar Solutions",
         mentee_sector="energie", mentee_country="Sénégal", status="active", started_at="2026-05-20"),
]

# --- Registre projets carte d'impact (cf-map-projects) ---
PROJECTS = [
    dict(id=1, name="Dakar Solar Solutions", type="energie", pays="Sénégal", ville="Dakar", statut="Labellisé", lat=14.69, lng=-17.04, impact="210 foyers raccordés"),
    dict(id=2, name="Climate Linguère Club", type="hub", pays="Sénégal", ville="Linguère", statut="Labellisé", lat=15.40, lng=-15.12, impact="124 membres actifs"),
    dict(id=3, name="Mangrove Restore Initiative", type="mangroves", pays="Liberia", ville="Monrovia", statut="En incubation", lat=6.30, lng=-10.80, impact="12 ha en restauration"),
    dict(id=4, name="Monrovia Eco Hub", type="hub", pays="Liberia", ville="Monrovia", statut="Labellisé", lat=6.33, lng=-10.76, impact="90 membres actifs"),
    dict(id=5, name="ReCycle Accra", type="recyclage", pays="Ghana", ville="Accra", statut="Soumis", lat=5.56, lng=-0.20, impact="24 t collectées par mois"),
    dict(id=6, name="Accra Green Hub", type="hub", pays="Ghana", ville="Accra", statut="Labellisé", lat=5.61, lng=-0.18, impact="150 membres actifs"),
    dict(id=7, name="Conakry Youth Hub", type="hub", pays="Guinée-Conakry", ville="Conakry", statut="Labellisé", lat=9.64, lng=-13.58, impact="110 membres actifs"),
    dict(id=8, name="Pêche bleue Conakry", type="entreprise", pays="Guinée-Conakry", ville="Conakry", statut="En incubation", lat=9.51, lng=-13.71, impact="6 communautés de pêche"),
    dict(id=9, name="Freetown Climate Hub", type="hub", pays="Sierra Leone", ville="Freetown", statut="Labellisé", lat=8.48, lng=-13.23, impact="124 membres actifs"),
    dict(id=10, name="AgriRésilience Freetown", type="entreprise", pays="Sierra Leone", ville="Freetown", statut="Soumis", lat=8.42, lng=-13.20, impact="80 exploitations"),
]

# --- Sessions (MentorSession) ---
MENTOR_SESSIONS = [
    dict(id="sess-kwame-aminata-1", mentor_id="dr-kwame-asante", mentee_name="Aminata Diallo",
         title="Session avec Aminata Diallo", scheduled_at="2026-07-15T15:00:00",
         channel="en_ligne", location="Visioconférence", status="confirmee"),
    dict(id="sess-kwame-aminata-2", mentor_id="dr-kwame-asante", mentee_name="Aminata Diallo",
         title="Revue du plan de financement", scheduled_at="2026-07-22T11:00:00",
         channel="en_ligne", location="Visioconférence", status="proposee"),
]


def seed_all(force=False):
    if not force and User.query.first():
        return 0
    if force:
        for model in (MentorSession, Mentorship, MentorRequest, Message, Thread,
                      Application, Call, Subscriber, ContactMessage, Content, MapProject):
            model.query.delete()
        # on ne purge pas les comptes créés à la main hors démo
        db.session.query(User).filter(User.id.in_(
            [m["id"] for m in MEMBERS])).delete(synchronize_session=False)

    n = 0
    for c in CALLS:
        if not db.session.get(Call, c["id"]):
            db.session.add(Call(id=c["id"], **Call.from_public(c)))
            n += 1
    for a in APPLICATIONS:
        if not db.session.get(Application, a["id"]):
            db.session.add(Application(id=a["id"], **Application.columns_from_public(a)))
            n += 1
    for m in MEMBERS:
        if not User.query.filter_by(email=m["email"]).first():
            u = User(id=m["id"], email=m["email"], name=m["name"],
                     member_type=m["role"], country=m["pays"], status="active",
                     email_verified=True)
            u.set_password(DEMO_PASSWORD)
            db.session.add(u)
            n += 1
    for a in ADMINS:
        if not User.query.filter_by(email=a["email"]).first():
            from .util import slugify
            u = User(id=slugify(a["name"]), email=a["email"], name=a["name"],
                     member_type="admin", admin_role=a["role"],
                     country=a["country"] or None, status="active", email_verified=True)
            u.set_password(DEMO_PASSWORD)
            db.session.add(u)
            n += 1
    for p in PARTNERS:
        if not User.query.filter_by(email=p["email"]).first():
            u = User(id=p["id"], email=p["email"], name=p["name"],
                     member_type="partenaire", country=p["country"] or None,
                     status="active", email_verified=True)
            u.set_password(DEMO_PASSWORD)
            db.session.add(u)
            n += 1
    for s in SUBSCRIBERS:
        if not Subscriber.query.filter_by(email=s["email"]).first():
            db.session.add(Subscriber(email=s["email"], lang=s["lang"], status="confirmed",
                                      source=s.get("source", "")))
            n += 1
    for ct in CONTACTS:
        if not ContactMessage.query.filter_by(email=ct["email"]).first():
            db.session.add(ContactMessage(**ct))
            n += 1

    n += seed_content(Content, db)  # actualités, événements, pages, annuaires

    for t in THREADS:
        if not db.session.get(Thread, t["id"]):
            db.session.add(Thread(**t))
            n += 1
    for m in MESSAGES:
        if not db.session.get(Message, m["id"]):
            db.session.add(Message(**m))
            n += 1
    for mr in MENTOR_REQUESTS:
        if not db.session.get(MentorRequest, mr["id"]):
            db.session.add(MentorRequest(**mr))
            n += 1
    for ms in MENTORSHIPS:
        if not db.session.get(Mentorship, ms["id"]):
            db.session.add(Mentorship(**ms))
            n += 1
    for se in MENTOR_SESSIONS:
        if not db.session.get(MentorSession, se["id"]):
            db.session.add(MentorSession(**se))
            n += 1
    if MapProject.query.count() == 0:
        for i, p in enumerate(PROJECTS):
            db.session.add(MapProject(position=i, data=p))
            n += 1

    db.session.commit()
    return n
