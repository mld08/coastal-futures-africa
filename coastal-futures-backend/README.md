# Coastal Futures — Backend (Flask + SQLAlchemy)

API du programme **Coastal Futures Network** (Institut Africain de la Gouvernance).
Elle remplace le stockage `localStorage` / Google Sheets du frontend par un vrai
backend : **inscriptions, connexions, candidatures** et ressources associées.

Le backend est conçu pour **coller au contrat déjà défini par le frontend**
(`coastal-futures-frontend/src/services/api.js`) : le front bascule dessus en
mettant simplement `VITE_USE_API=true`.

---

## 🧱 Stack

| Élément | Choix |
|---|---|
| Framework | Flask 3 (application factory + blueprints) |
| ORM / migrations | SQLAlchemy 2 + Flask-Migrate (Alembic) |
| Base de données | **SQLite** en dev → **PostgreSQL** en prod (même code) |
| Sessions | **Cookies httpOnly signés** (Flask-Login) — anti-XSS |
| CORS | Flask-CORS, origines du front en liste blanche, `credentials` activés |
| Mots de passe | hachage `werkzeug.security` (pbkdf2/scrypt) |

---

## 🚀 Démarrage (dev)

```bash
cd coastal-futures-backend
python -m venv .venv
.venv\Scripts\activate            # Windows ; sur macOS/Linux : source .venv/bin/activate
pip install -r requirements.txt

copy .env.example .env            # puis adapter (SECRET_KEY, CORS_ORIGINS…)

set FLASK_APP=wsgi.py             # PowerShell : $env:FLASK_APP="wsgi.py"
flask db upgrade                  # crée le schéma (SQLite : instance/coastal_futures.db)
flask seed                        # amorce avec les données de démo du front

python wsgi.py                    # http://127.0.0.1:5000
```

Vérification : `curl http://127.0.0.1:5000/health`

**Comptes de démonstration** (mot de passe commun `Coastal2026!`) :

| Rôle | E-mail |
|---|---|
| Super admin | `saifi.dawalbethamit@africagovernanceinstitute.org` |
| Admin contenu | `ousmane.ba@africagovernanceinstitute.org` |
| Coordinateur pays | `aminata.sow@africagovernanceinstitute.org` |
| Modérateur | `kofi.mensah@africagovernanceinstitute.org` |
| Membre (entrepreneur) | `aminata.diallo@example.sn` |

> Hors démo, créez un vrai admin : `flask create-admin` (mot de passe demandé).

---

## 🔌 Brancher le frontend

1. Backend lancé sur `http://127.0.0.1:5000`.
2. Dans `coastal-futures-frontend/.env.local` :
   ```
   VITE_USE_API=true
   VITE_API_BASE_URL=http://127.0.0.1:5000
   ```
3. `npm run dev` côté front.

La façade `api.js` envoie déjà `credentials: 'include'` (cookie de session) et
`CORS_ORIGINS` autorise `http://localhost:5173`. Les services React (newsletter,
contact) fonctionnent immédiatement.

### Câblage des pages legacy (auth & candidatures)

Les écrans historiques (`connexion-admin.html`, `candidature.html`, …) utilisent
la couche synchrone `CFCol` (localStorage), **pas** `api.js`. Pour les brancher,
on remplace leur validation simulée par un appel à l'API, puis on pose les mêmes
clés de session que le reste de l'app attend. Exemple pour la connexion admin :

```js
const r = await fetch(`${API_BASE}/auth/admin/login`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (r.ok) {
  const { session } = await r.json();           // {role,name,email,country}
  localStorage.setItem('cf-admin-auth', '1');   // conserve le chrome/guard existant
  localStorage.setItem('cf-admin-role', session.role);
  localStorage.setItem('cf-admin-name', session.name);
  localStorage.setItem('cf-admin-email', session.email);
  localStorage.setItem('cf-admin-country', session.country || '');
}
```

La **vraie** sécurité est le cookie httpOnly validé côté serveur à chaque appel
protégé ; les clés `localStorage` ne servent plus qu'à l'affichage (barre latérale,
libellé de rôle). Même principe pour `candidature.html` → `POST /applications`.

---

## 📡 Endpoints (v1 : auth + candidatures)

Le contrat REST des ressources suit la façade : `GET/POST/PUT /{resource}`.

### Authentification durcie — `/auth`
2FA par **code OTP envoyé par e-mail** pour admin et bailleur (login en 2 étapes) ;
réinitialisation de mot de passe et vérification d'e-mail par lien ; anti-bruteforce
(rate-limiting). En dev sans SMTP, les e-mails sont écrits dans `instance/outbox/`.
| Méthode | Chemin | Accès |
|---|---|---|
| POST | `/auth/register` | public — inscription + e-mail de vérification |
| POST | `/auth/verify-email` | public — valide l'adresse via le jeton du lien |
| POST | `/auth/login` | public — connexion **membre** (entrepreneur/mentor), 1 étape |
| POST | `/auth/admin/login` → `/auth/admin/verify-otp` | public — admin : mdp puis **OTP e-mail** |
| POST | `/auth/ptf/login` → `/auth/ptf/verify-otp` | public — bailleur : mdp puis **OTP e-mail** |
| POST | `/auth/{admin,ptf}/resend-otp` | public — renvoyer un code |
| POST | `/auth/forgot-password` · `/auth/reset-password` | public — reset par lien e-mail |
| GET | `/auth/me` · POST `/auth/logout` | session courante / déconnexion |

### Appels à candidatures — `/calls`
| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/calls` | public (publiés) · admin (tous) |
| POST | `/calls` | admin `content`/`country` |
| PUT | `/calls` | admin `content`/`country` (remplace tout) |

### Candidatures — `/applications`
| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/applications` | admin |
| POST | `/applications` | **public** (dépôt de dossier) |
| PATCH | `/applications/<id>` | admin (statut, assignation, évaluation, historique) — écriture-retour de la console |
| PUT | `/applications` | admin (remplace tout) |

### Contenus CMS & annuaires — `/news`, `/events`, `/pages`, `/entrepreneurs`, `/mentors`
Adossés au modèle document `Content` (discriminé par `kind`). Même contrat pour toutes.
| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/news` · `/events` · `/pages` · `/entrepreneurs` · `/mentors` | public (publiés) · admin (tout) |
| POST | `/{resource}` | admin `content` — **upsert par id** (fusion, = `CFCol.upsert`) |
| PUT | `/{resource}` | admin `content` (remplace tout) |
| PATCH | `/{resource}/<id>` | admin `content` (publication, featured, modération) |
| DELETE | `/{resource}/<id>` | admin `content` |

### Messagerie — `/threads`, `/messages` (scopée)
| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/threads` · `/messages` | admin (toutes) · **membre (les siennes)** |
| POST | `/messages` | connecté — membre : seulement dans SES fils |
| POST | `/threads` | connecté (création) |
| PATCH | `/threads/<id>` · `/messages/<id>` | admin (fermer, marquer lu…) |

### Invitations — admin & bailleur
| Méthode | Chemin | Accès |
|---|---|---|
| POST/GET | `/admin/invites` | **super admin** — créer (+ e-mail) / lister |
| DELETE | `/admin/invites/<id>` | super admin — révoquer |
| GET | `/auth/invite/<token>` | public — infos de l'invitation |
| POST | `/auth/accept-invite` | public — `{token, password}` → compte activé + session |

### Mentorat — demandes, mentorats, sessions (vues **scopées au mentor connecté**)
| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/mentor_requests` | mentor (les siennes) · admin (toutes) |
| POST | `/mentor_requests` | public (bouton « Envoyer la demande » de la fiche mentor) |
| PATCH | `/mentor_requests/<id>` | mentor concerné / admin — accepter *crée un mentorat* |
| GET | `/mentorships` | mentor (ses mentorés) · admin |
| PATCH | `/mentorships/<id>` | mentor concerné / admin (clôturer : `terminee`) |
| GET/POST | `/mentor_sessions` | mentor (ses sessions / en proposer depuis le dashboard) |
| PATCH | `/mentor_sessions/<id>` | mentor concerné / admin (confirmer, annuler…) |

### Projets / carte d'impact — `/projects`
Registre partagé par la carte publique, `admin-projets`, `admin-carte`. Les
**indicateurs** restent dérivés côté client (cf-derive.js) à partir de ce registre.
| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/projects` | public (la carte est publique) |
| PUT | `/projects` | coordinateur pays / super (remplace tout le registre) |

### Newsletter & contact — gérés chez nous (plus de Google Sheets)
Tout est en base et visible dans la **console admin**. Un message de contact
**notifie l'équipe par e-mail** (`ADMIN_NOTIFY_EMAIL`) + crée une notif cloche.
| Méthode | Chemin | Accès |
|---|---|---|
| POST | `/newsletters` | public — s'abonner (dé-dup serveur) |
| GET | `/newsletters` | admin — liste des abonnés |
| DELETE | `/newsletters/<id>` | admin |
| POST | `/contacts` | public — nous contacter (→ e-mail équipe + notif) |
| GET | `/contacts` | admin — boîte des messages |
| PATCH | `/contacts/<id>` | admin — marquer lu |
| DELETE | `/contacts/<id>` | admin |

`GET /health` : sonde de disponibilité.

---

## 🗂️ Architecture

```
app/
├── __init__.py       # application factory + commandes CLI (init-db, seed, create-admin)
├── config.py         # config 12-factor (SQLite dev / Postgres prod, cookies, CORS)
├── extensions.py     # db, migrate, login_manager
├── security.py       # RBAC (admin_required), audit
├── util.py           # slug, dates ISO, champ bilingue {fr,en}
├── models/           # calqués sur DIAGS/ClassDiagram.png
│   ├── user.py       # User (membres, bailleurs, admins) + sérialiseurs front
│   ├── call.py       # Call (appels) → forme CFCol `calls`
│   ├── application.py# Application (candidatures) → forme CFCol `applications`
│   ├── admin.py      # AdminInvite, AuditLog, Notification
│   └── messaging.py  # Subscriber, ContactMessage
├── blueprints/       # auth, calls, applications, messaging, health
└── seed.py           # données de démo importées de cf-collections.js
migrations/           # Alembic (Flask-Migrate)
wsgi.py               # point d'entrée
smoke_test.py         # test bout-en-bout (28 assertions)
```

**Principe clé** : chaque modèle expose un sérialiseur (`to_public` / `to_session`
/ `to_directory`) qui produit **exactement** la forme JSON attendue par le front
(champs bilingues `{fr,en}`, statut `pub`, ids en slug). Le front ne voit aucune
différence entre le mock `localStorage` et l'API.

---

## ✅ Tests

```bash
.venv\Scripts\python.exe smoke_test.py
```

Couvre : santé, lecture publique filtrée, inscription (doublon/mot de passe faible),
connexion membre/admin séparée, dépôt de candidature, incrément du compteur d'appel,
changement de statut, RBAC, newsletter/contact. **28/28.**

---

## 🌍 Production (PostgreSQL)

```bash
# .env
SECRET_KEY=<64 hex>                     # python -c "import secrets;print(secrets.token_hex(32))"
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/coastal
CORS_ORIGINS=https://coastalfutures.exemple.org
SESSION_COOKIE_SECURE=true              # HTTPS obligatoire
SESSION_COOKIE_SAMESITE=None            # si front et API sur domaines différents

flask db upgrade
gunicorn -w 4 -b 0.0.0.0:8000 wsgi:app
```

> Cookie cross-site (`SameSite=None`) impose `Secure=true` (HTTPS). Front et API
> sous le même domaine (via reverse-proxy) → gardez `Lax`, plus simple et plus sûr.

---

## 🛣️ Suite (hors périmètre v1)

Le diagramme de classes prévoit plus large. Prochains lots, dans l'ordre suggéré :

1. **Contenus** (`Content` → Article/Event/Resource, Category, Tag) + CMS pages.
2. **Annuaires** (EntrepreneurProfile, mentors) + **mentorat** (MentorRequest,
   Mentorship, MentorSession) + **messagerie** (threads/messages).
3. **Projets / indicateurs** (Project, Indicator, IndicatorSnapshot) + carte d'impact.
4. **Modération** (ModerationItem) + **audit** exposé.
5. Durcissement : **vérification e-mail**, **reset mot de passe**, **invitations
   admin** (modèle déjà présent), **2FA** réelle, protection **CSRF** explicite,
   **rate-limiting** sur `/auth/*`.

Chaque lot suit le même patron : modèle calqué sur le diagramme → sérialiseur à la
forme CFCol → blueprint `GET/POST/PUT /{resource}` → seed → test.
```
