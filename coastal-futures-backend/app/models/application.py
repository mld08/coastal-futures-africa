"""Application — candidature (collection CFCol `applications`).

Forme attendue par admin-candidatures.html / candidature.html :
  {id, status, appelId, submittedAt, assignee,
   candidat{nom,email,genre,pays,ville},
   projet{nom,stade,secteur,description},
   motivation, besoins,
   pieces[{name,type,size}], complements[], history[{at,by,action,note}]}

Les sous-objets riches (candidat, projet, pièces, historique) sont stockés en
colonnes JSON : fidélité 1:1 avec le front. La normalisation fine
(ApplicationDocument, EvaluationStep du diagramme) pourra suivre par lot.
"""
from ..extensions import db
from ..util import now_utc, iso_date

# Statuts canoniques du front (cf-candidatures-admin.js) : la décision admin
# écrit 'accepted' / 'rejected' / 'incomplete'.
APP_STATUSES = ("submitted", "review", "incomplete", "accepted", "rejected")


class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.String(64), primary_key=True)
    status = db.Column(db.String(20), nullable=False, default="submitted")
    call_id = db.Column(db.String(64), db.ForeignKey("calls.id"), nullable=True, index=True)
    submitted_at = db.Column(db.String(10), nullable=True)   # 'AAAA-MM-JJ'
    assignee = db.Column(db.String(160), default="")

    # Candidat dénormalisé (email indexé pour le suivi candidature-acces).
    candidate_email = db.Column(db.String(255), index=True)
    candidat = db.Column(db.JSON, default=dict)     # {nom,email,genre,pays,ville}
    projet = db.Column(db.JSON, default=dict)       # {nom,stade,secteur,description}

    motivation = db.Column(db.Text, default="")
    besoins = db.Column(db.Text, default="")
    pieces = db.Column(db.JSON, default=list)       # [{name,type,size}]
    complements = db.Column(db.JSON, default=list)
    history = db.Column(db.JSON, default=list)      # [{at,by,action,note}]
    evaluation = db.Column(db.JSON, nullable=True)  # grille d'évaluation (console admin)

    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)
    updated_at = db.Column(db.DateTime, nullable=False, default=now_utc, onupdate=now_utc)

    call = db.relationship("Call", back_populates="applications")

    def to_public(self):
        out = {
            "id": self.id,
            "status": self.status,
            "appelId": self.call_id,
            "submittedAt": self.submitted_at or iso_date(self.created_at),
            "assignee": self.assignee or "",
            "candidat": self.candidat or {},
            "projet": self.projet or {},
            "motivation": self.motivation or "",
            "besoins": self.besoins or "",
            "pieces": self.pieces or [],
            "complements": self.complements or [],
            "history": self.history or [],
        }
        if self.evaluation is not None:
            out["evaluation"] = self.evaluation
        return out

    @classmethod
    def columns_from_public(cls, data):
        candidat = data.get("candidat") or {}
        return dict(
            status=data.get("status", "submitted"),
            call_id=data.get("appelId"),
            submitted_at=data.get("submittedAt"),
            assignee=data.get("assignee", ""),
            candidate_email=(candidat.get("email") or "").strip().lower() or None,
            candidat=candidat,
            projet=data.get("projet") or {},
            motivation=data.get("motivation", ""),
            besoins=data.get("besoins", ""),
            pieces=data.get("pieces") or [],
            complements=data.get("complements") or [],
            history=data.get("history") or [],
            evaluation=data.get("evaluation"),
        )
