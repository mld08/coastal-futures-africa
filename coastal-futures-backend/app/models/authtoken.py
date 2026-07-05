"""Jetons d'authentification : codes OTP (2FA e-mail) et jetons de lien
(réinitialisation de mot de passe, vérification d'e-mail).
"""
import hashlib
import secrets
from datetime import timedelta

from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db
from ..util import now_utc

OTP_PURPOSES = ("admin_login", "ptf_login")
TOKEN_KINDS = ("reset", "verify")


def _sha256(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class OtpCode(db.Model):
    """Code à 6 chiffres envoyé par e-mail pour la double authentification."""
    __tablename__ = "otp_codes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(64), db.ForeignKey("users.id"), index=True, nullable=False)
    purpose = db.Column(db.String(20), nullable=False)
    code_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    consumed = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    @classmethod
    def issue(cls, user, purpose, ttl_min):
        """Invalide les anciens codes et en crée un neuf ; renvoie le code en clair."""
        (cls.query.filter_by(user_id=user.id, purpose=purpose, consumed=False)
            .update({"consumed": True}))
        code = f"{secrets.randbelow(1000000):06d}"
        row = cls(user_id=user.id, purpose=purpose,
                  code_hash=generate_password_hash(code),
                  expires_at=now_utc() + timedelta(minutes=ttl_min))
        db.session.add(row)
        return code, row

    @classmethod
    def check(cls, user, purpose, code, max_attempts):
        """Vérifie le dernier code actif. Renvoie (ok, raison)."""
        row = (cls.query.filter_by(user_id=user.id, purpose=purpose, consumed=False)
               .order_by(cls.created_at.desc()).first())
        if not row:
            return False, "no_code"
        # Comparaison naïve-aware des datetimes (SQLite stocke sans tz).
        if row.expires_at.replace(tzinfo=now_utc().tzinfo) < now_utc():
            return False, "expired"
        if row.attempts >= max_attempts:
            return False, "too_many"
        if not check_password_hash(row.code_hash, str(code or "")):
            row.attempts += 1
            return False, "mismatch"
        row.consumed = True
        return True, "ok"


class AuthToken(db.Model):
    """Jeton à usage unique pour un lien (reset mot de passe / vérif e-mail)."""
    __tablename__ = "auth_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(64), db.ForeignKey("users.id"), index=True, nullable=False)
    kind = db.Column(db.String(12), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, index=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    @classmethod
    def issue(cls, user, kind, ttl_min):
        token = secrets.token_urlsafe(32)
        row = cls(user_id=user.id, kind=kind, token_hash=_sha256(token),
                  expires_at=now_utc() + timedelta(minutes=ttl_min))
        db.session.add(row)
        return token, row

    @classmethod
    def consume(cls, token, kind):
        """Valide et marque utilisé ; renvoie le user_id ou None."""
        row = cls.query.filter_by(token_hash=_sha256(token or ""), kind=kind, used=False).first()
        if not row:
            return None
        if row.expires_at.replace(tzinfo=now_utc().tzinfo) < now_utc():
            return None
        row.used = True
        return row.user_id
