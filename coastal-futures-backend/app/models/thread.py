"""Messagerie — fils (threads) et messages, lus/écrits par la console admin
(cf-messagerie-admin.js). Contrairement aux contenus CMS, ce sont des données
relationnelles (un message appartient à un fil), et les messages s'accumulent
(envoi = ajout, pas upsert par id figé).

Formes CFCol :
  threads  : {id, subject{fr,en}, with, withEmail, closed, closedBy?, participants[]}
  messages : {id, threadId, from{name,role,verified}, at, body, read}
"""
from ..extensions import db
from ..util import now_utc


class Thread(db.Model):
    __tablename__ = "threads"

    id = db.Column(db.String(80), primary_key=True)
    subject = db.Column(db.JSON, default=dict)         # {fr, en}
    with_name = db.Column(db.String(160), default="")  # `with` côté front
    with_email = db.Column(db.String(255), default="")
    closed = db.Column(db.Boolean, nullable=False, default=False)
    closed_by = db.Column(db.JSON, nullable=True)       # {name, role} ou null
    participants = db.Column(db.JSON, default=list)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    messages = db.relationship("Message", back_populates="thread",
                               lazy="dynamic", cascade="all, delete-orphan")

    def to_public(self):
        out = {
            "id": self.id,
            "subject": self.subject or {},
            "with": self.with_name or "",
            "withEmail": self.with_email or "",
            "closed": self.closed,
            "participants": self.participants or [],
        }
        if self.closed_by:
            out["closedBy"] = self.closed_by
        return out

    @classmethod
    def columns_from_public(cls, data):
        return dict(
            subject=data.get("subject") or {},
            with_name=data.get("with", ""),
            with_email=data.get("withEmail", ""),
            closed=bool(data.get("closed", False)),
            closed_by=data.get("closedBy"),
            participants=data.get("participants") or [],
        )


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.String(80), primary_key=True)
    thread_id = db.Column(db.String(80), db.ForeignKey("threads.id"), index=True, nullable=True)
    sender = db.Column(db.JSON, default=dict)          # {name, role, verified} -> `from`
    body = db.Column(db.Text, default="")
    at = db.Column(db.String(32), nullable=True)       # horodatage ISO du front
    read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    thread = db.relationship("Thread", back_populates="messages")

    def to_public(self):
        return {
            "id": self.id,
            "threadId": self.thread_id,
            "from": self.sender or {},
            "at": self.at,
            "body": self.body or "",
            "read": self.read,
        }

    @classmethod
    def columns_from_public(cls, data):
        return dict(
            thread_id=data.get("threadId"),
            sender=data.get("from") or {},
            body=data.get("body", ""),
            at=data.get("at"),
            read=bool(data.get("read", False)),
        )
