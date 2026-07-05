"""MapProject — registre des projets de la carte d'impact.

Côté front, ce registre vit dans localStorage['cf-map-projects'] (partagé par
carte-impact, admin-projets, admin-carte) et alimente les INDICATEURS dérivés
(cf-derive.js). Les pages écrivent le tableau COMPLET d'un coup ; on le reflète
donc tel quel : stockage document (un blob par projet) qui préserve l'objet
exact — y compris son `id` entier — et son ordre.

Forme : {id, name, type, pays, ville, statut, lat, lng, impact, ...}
"""
from ..extensions import db
from ..util import now_utc


class MapProject(db.Model):
    __tablename__ = "map_projects"

    pk = db.Column(db.Integer, primary_key=True)          # clé interne
    position = db.Column(db.Integer, nullable=False, default=0)  # ordre d'affichage
    data = db.Column(db.JSON, default=dict)               # objet projet complet (id inclus)
    updated_at = db.Column(db.DateTime, nullable=False, default=now_utc, onupdate=now_utc)

    def to_public(self):
        return dict(self.data or {})
