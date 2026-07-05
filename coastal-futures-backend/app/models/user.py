"""User — compte unique couvrant les trois réalms du front :
  - membres  : member_type ∈ {entrepreneur, mentor, partenaire}
  - bailleur : member_type == 'partenaire' (espace PTF)
  - admin    : admin_role ∈ {super, content, country, moderator}

Le front lit deux formes différentes de « compte » :
  - collection `users` (CFCol) : {id,name,email,role,pays,status,joinedAt}
  - session admin (cf-admin-*)  : {role,name,email,country}
Les deux sont produites ici par des sérialiseurs dédiés.
"""
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db
from ..util import now_utc, iso_date

MEMBER_TYPES = ("entrepreneur", "mentor", "partenaire", "admin")
ADMIN_ROLES = ("super", "content", "country", "moderator")
USER_STATUSES = ("active", "invite", "suspendu", "supprime")


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(64), primary_key=True)          # slug (ex. 'aminata-diallo')
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)  # null tant que non activé
    name = db.Column(db.String(160), nullable=False)
    member_type = db.Column(db.String(20), nullable=False, default="entrepreneur")
    admin_role = db.Column(db.String(20), nullable=True)      # null si non-admin
    country = db.Column(db.String(80), nullable=True)
    locale = db.Column(db.String(5), nullable=False, default="fr")
    status = db.Column(db.String(20), nullable=False, default="active")
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    two_factor_enabled = db.Column(db.Boolean, nullable=False, default=False)
    last_login_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)
    updated_at = db.Column(db.DateTime, nullable=False, default=now_utc, onupdate=now_utc)

    # --- mot de passe ---
    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return bool(self.password_hash) and check_password_hash(self.password_hash, raw)

    # --- rôles / accès ---
    @property
    def is_admin(self):
        return self.admin_role in ADMIN_ROLES

    def is_active_account(self):
        return self.status == "active"

    # Flask-Login : compte utilisable pour une session ?
    @property
    def is_active(self):
        return self.status == "active"

    # --- sérialiseurs (formes exactes attendues par le front) ---
    def to_directory(self):
        """Forme de la collection CFCol `users` (annuaire membres)."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.member_type,
            "pays": self.country or "",
            "status": "active" if self.status == "active" else self.status,
            "joinedAt": iso_date(self.created_at),
        }

    def to_session(self):
        """Forme de la session admin (cf-admin-*) posée après connexion."""
        return {
            "role": self.admin_role,
            "name": self.name,
            "email": self.email,
            "country": self.country or "",
        }

    def to_me(self):
        """Profil complet renvoyé par GET /auth/me."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "memberType": self.member_type,
            "adminRole": self.admin_role,
            "country": self.country or "",
            "locale": self.locale,
            "status": self.status,
            "emailVerified": self.email_verified,
            "isAdmin": self.is_admin,
        }
