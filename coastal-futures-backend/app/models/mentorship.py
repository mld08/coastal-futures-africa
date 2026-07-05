"""Mentorat — demandes de mentorat (MentorRequest du diagramme de classes).

Point d'entrée réel côté front : le bouton « Envoyer la demande » de la fiche
mentor (profil-mentor.html). Un entrepreneur adresse une demande à un mentor ;
le mentor (ou l'admin) l'accepte ou la décline.

  status ∈ {en_attente, accepte, decline}

NB : les entités Mentorship / MentorSession du diagramme n'ont pas encore de
consommateur côté front (espace mentor statique) ; elles suivront quand ces
pages seront réécrites pour lire l'API.
"""
from ..extensions import db
from ..util import now_utc, iso_datetime

REQUEST_STATUSES = ("en_attente", "accepte", "decline")
MENTORSHIP_STATUSES = ("active", "terminee")
SESSION_STATUSES = ("proposee", "confirmee", "passee", "annulee")


class MentorRequest(db.Model):
    __tablename__ = "mentor_requests"

    id = db.Column(db.String(80), primary_key=True)
    mentor_id = db.Column(db.String(80), index=True, nullable=True)   # slug annuaire mentors
    mentor_name = db.Column(db.String(160), default="")
    # Demandeur (entrepreneur) : dénormalisé + éventuel lien vers le compte.
    from_user_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=True)
    from_name = db.Column(db.String(160), default="")
    from_email = db.Column(db.String(255), default="")
    message = db.Column(db.Text, default="")
    status = db.Column(db.String(16), nullable=False, default="en_attente")
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    def to_public(self):
        return {
            "id": self.id,
            "mentorId": self.mentor_id,
            "mentorName": self.mentor_name or "",
            "from": {"id": self.from_user_id, "name": self.from_name or "", "email": self.from_email or ""},
            "message": self.message or "",
            "status": self.status,
            "at": iso_datetime(self.created_at),
        }


class Mentorship(db.Model):
    """Accompagnement actif mentor ↔ entrepreneur (créé quand une demande est
    acceptée). Alimente « Mes mentorés » du tableau de bord mentor."""
    __tablename__ = "mentorships"

    id = db.Column(db.String(80), primary_key=True)
    mentor_id = db.Column(db.String(80), index=True, nullable=True)
    mentee_name = db.Column(db.String(160), default="")
    mentee_email = db.Column(db.String(255), default="")
    mentee_org = db.Column(db.String(160), default="")
    mentee_sector = db.Column(db.String(80), default="")
    mentee_country = db.Column(db.String(80), default="")
    status = db.Column(db.String(16), nullable=False, default="active")
    started_at = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    def to_public(self):
        return {
            "id": self.id,
            "mentorId": self.mentor_id,
            "mentee": {
                "name": self.mentee_name or "",
                "email": self.mentee_email or "",
                "org": self.mentee_org or "",
                "sector": self.mentee_sector or "",
                "country": self.mentee_country or "",
            },
            "status": self.status,
            "startedAt": self.started_at,
        }


class MentorSession(db.Model):
    """Séance planifiée entre un mentor et un mentoré."""
    __tablename__ = "mentor_sessions"

    id = db.Column(db.String(80), primary_key=True)
    mentor_id = db.Column(db.String(80), index=True, nullable=True)
    mentee_name = db.Column(db.String(160), default="")
    title = db.Column(db.String(200), default="")
    scheduled_at = db.Column(db.String(32), nullable=True)  # ISO (date ou datetime)
    channel = db.Column(db.String(16), default="en_ligne")  # en_ligne | presentiel
    location = db.Column(db.String(200), default="")
    status = db.Column(db.String(16), nullable=False, default="proposee")
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)

    def to_public(self):
        return {
            "id": self.id,
            "mentorId": self.mentor_id,
            "menteeName": self.mentee_name or "",
            "title": self.title or "",
            "scheduledAt": self.scheduled_at,
            "channel": self.channel,
            "location": self.location or "",
            "status": self.status,
        }
