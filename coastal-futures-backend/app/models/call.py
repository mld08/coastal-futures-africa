"""Call — appel à candidatures (collection CFCol `calls`).

Forme publique attendue (voir cf-collections.js) :
  {id, pub, state, featured?, type{fr,en}, title{fr,en}, desc{fr,en},
   countries[], criteria[{fr,en}]?, deadline?, opens{fr,en}?, apps?, cap?}
"""
from ..extensions import db
from ..util import now_utc, i18n

CALL_STATES = ("open", "upcoming", "closed")


class Call(db.Model):
    __tablename__ = "calls"

    id = db.Column(db.String(64), primary_key=True)      # slug (ex. 'cohorte-2')
    pub = db.Column(db.String(16), nullable=False, default="published")  # published | draft
    state = db.Column(db.String(16), nullable=False, default="open")
    featured = db.Column(db.Boolean, nullable=False, default=False)

    type_fr = db.Column(db.String(160), default="")
    type_en = db.Column(db.String(160), default="")
    title_fr = db.Column(db.String(255), default="")
    title_en = db.Column(db.String(255), default="")
    desc_fr = db.Column(db.Text, default="")
    desc_en = db.Column(db.Text, default="")

    countries = db.Column(db.JSON, default=list)          # ["Sénégal", ...]
    criteria = db.Column(db.JSON, default=list)           # [{fr, en}, ...]
    opens = db.Column(db.JSON, nullable=True)             # {fr, en} ou null

    deadline = db.Column(db.String(10), nullable=True)    # 'AAAA-MM-JJ'
    cap = db.Column(db.Integer, nullable=True)            # capacité de la cohorte
    apps = db.Column(db.Integer, nullable=False, default=0)  # compteur affiché

    created_at = db.Column(db.DateTime, nullable=False, default=now_utc)
    updated_at = db.Column(db.DateTime, nullable=False, default=now_utc, onupdate=now_utc)

    applications = db.relationship("Application", back_populates="call", lazy="dynamic")

    def to_public(self):
        out = {
            "id": self.id,
            "pub": self.pub,
            "state": self.state,
            "type": i18n(self.type_fr, self.type_en),
            "title": i18n(self.title_fr, self.title_en),
            "desc": i18n(self.desc_fr, self.desc_en),
            "countries": self.countries or [],
        }
        if self.featured:
            out["featured"] = True
        if self.criteria:
            out["criteria"] = self.criteria
        if self.deadline:
            out["deadline"] = self.deadline
        if self.opens:
            out["opens"] = self.opens
        if self.cap is not None:
            out["cap"] = self.cap
        if self.apps is not None:
            out["apps"] = self.apps
        return out

    @classmethod
    def from_public(cls, data):
        """Construit/actualise depuis la forme front (admin-appels)."""
        return dict(
            pub=data.get("pub", "published"),
            state=data.get("state", "open"),
            featured=bool(data.get("featured", False)),
            type_fr=(data.get("type") or {}).get("fr", ""),
            type_en=(data.get("type") or {}).get("en", ""),
            title_fr=(data.get("title") or {}).get("fr", ""),
            title_en=(data.get("title") or {}).get("en", ""),
            desc_fr=(data.get("desc") or {}).get("fr", ""),
            desc_en=(data.get("desc") or {}).get("en", ""),
            countries=data.get("countries") or [],
            criteria=data.get("criteria") or [],
            opens=data.get("opens"),
            deadline=data.get("deadline"),
            cap=data.get("cap"),
            apps=data.get("apps", 0) or 0,
        )
