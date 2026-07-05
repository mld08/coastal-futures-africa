"""Entités administratives : invitations, journal d'audit, notifications.

Formes front (CFCol) :
  admin_invites : {id, email, role, name, country, used, ...}
  audit_log     : {id, action, target_type, target_id, actor, at}
  admin_notifs  : {id, at, kind, target{role}, title{fr,en}, href, read}
"""
from ..extensions import db
from ..util import now_utc, iso_datetime, i18n


class AdminInvite(db.Model):
    __tablename__ = "admin_invites"

    id = db.Column(db.String(64), primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False)       # super|content|country|moderator
    name = db.Column(db.String(160), default="")
    country = db.Column(db.String(80), default="")
    token = db.Column(db.String(64), unique=True, nullable=False)
    used = db.Column(db.Boolean, nullable=False, default=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    def to_public(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "name": self.name or self.email,
            "country": self.country or "",
            "used": self.used,
        }


class AuditLog(db.Model):
    __tablename__ = "audit_log"

    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(80), nullable=False)
    target_type = db.Column(db.String(40), default="")
    target_id = db.Column(db.String(64), default="")
    actor = db.Column(db.String(160), default="")          # nom lisible
    ip_address = db.Column(db.String(64), default="")
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    def to_public(self):
        return {
            "id": self.id,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "actor": self.actor,
            "at": iso_datetime(self.created_at),
        }


class Notification(db.Model):
    __tablename__ = "admin_notifs"

    id = db.Column(db.String(64), primary_key=True)
    kind = db.Column(db.String(40), nullable=False)        # application|moderation|...
    target_role = db.Column(db.String(20), default="super")
    title_fr = db.Column(db.String(255), default="")
    title_en = db.Column(db.String(255), default="")
    href = db.Column(db.String(120), default="")
    read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    def to_public(self):
        return {
            "id": self.id,
            "at": iso_datetime(self.created_at),
            "kind": self.kind,
            "target": {"role": self.target_role},
            "title": i18n(self.title_fr, self.title_en),
            "href": self.href,
            "read": self.read,
        }
