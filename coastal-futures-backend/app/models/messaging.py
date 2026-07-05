"""Newsletter (subscribers) + messages de contact (contacts).

Source de vérité côté backend (plus de Google Sheets). Les formes renvoyées
collent aux collections que l'admin affiche déjà :
  subscribers      : {id, email, lang, status, source, date}
  contact_messages : {id, name, email, org, pays, sujet, message, date, read}
"""
from ..extensions import db
from ..util import now_utc, iso_datetime


class Subscriber(db.Model):
    __tablename__ = "subscribers"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    lang = db.Column(db.String(2), nullable=False, default="fr")
    status = db.Column(db.String(16), nullable=False, default="confirmed")
    source = db.Column(db.String(120), default="")
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    def to_public(self):
        stamp = iso_datetime(self.created_at)
        return {
            "id": self.id,
            "email": self.email,
            "lang": self.lang,
            "status": self.status,
            "source": self.source or "",
            "date": stamp,
            "createdAt": stamp,  # compat newsletterService
        }


class ContactMessage(db.Model):
    __tablename__ = "contacts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), default="")
    email = db.Column(db.String(255), nullable=False)
    org = db.Column(db.String(200), default="")
    pays = db.Column(db.String(80), default="")
    subject = db.Column(db.String(255), default="")   # rendu comme `sujet`
    message = db.Column(db.Text, nullable=False)
    read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    def to_public(self):
        stamp = iso_datetime(self.created_at)
        return {
            "id": self.id,
            "name": self.name or "",
            "email": self.email,
            "org": self.org or "",
            "pays": self.pays or "",
            "sujet": self.subject or "",
            "message": self.message,
            "read": self.read,
            "date": stamp,
            "createdAt": stamp,
        }
