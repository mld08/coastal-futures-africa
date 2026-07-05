"""Content — stockage « document » des collections éditoriales riches et
bilingues du front : actualités (news), événements (events), pages CMS (page).

Ces objets CFCol portent de nombreux champs {fr,en} imbriqués (title, excerpt,
body HTML, tags, blocks…). Plutôt que 15 colonnes bilingues par type, on stocke
l'objet complet dans une colonne JSON `data` et on remonte quelques colonnes
requêtables (kind, slug, pub, featured, date) pour lister/filtrer/ordonner.
Le sérialiseur rend EXACTEMENT l'objet attendu par CFCol.

Un enregistrement est identifié par (kind, slug) — slug = l'`id` CFCol.
"""
from ..extensions import db
from ..util import now_utc, slugify

CONTENT_KINDS = ("news", "event", "page", "entrepreneur", "mentor")


class Content(db.Model):
    __tablename__ = "content"

    pk = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(16), nullable=False, index=True)   # news|event|page
    slug = db.Column(db.String(96), nullable=False, index=True)   # id CFCol
    pub = db.Column(db.String(16), nullable=False, default="published")
    featured = db.Column(db.Boolean, nullable=False, default=False)
    date = db.Column(db.String(10), nullable=True)                # ordre news/events
    data = db.Column(db.JSON, default=dict)                       # objet CFCol complet
    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)
    updated_at = db.Column(db.DateTime, nullable=False, default=now_utc, onupdate=now_utc)

    __table_args__ = (
        db.UniqueConstraint("kind", "slug", name="uq_content_kind_slug"),
    )

    # --- helpers ---
    @classmethod
    def find(cls, kind, slug):
        return cls.query.filter_by(kind=kind, slug=slug).first()

    def apply(self, obj):
        """Enregistre l'objet complet et synchronise les colonnes requêtables."""
        data = dict(obj or {})
        data["id"] = self.slug
        data["pub"] = data.get("pub", self.pub or "published")
        self.data = data
        self.pub = data["pub"]
        self.featured = bool(data.get("featured", False))
        if data.get("date"):
            self.date = data["date"]
        return self

    def to_public(self):
        out = dict(self.data or {})
        out["id"] = self.slug
        out["pub"] = self.pub
        if self.featured:
            out["featured"] = True
        return out

    @staticmethod
    def slug_for(obj, kind):
        """Déduit un slug : id fourni, sinon dérivé du titre FR."""
        if obj.get("id"):
            return str(obj["id"])
        title = (obj.get("title") or {})
        return slugify(title.get("fr") or title.get("en"), kind)
