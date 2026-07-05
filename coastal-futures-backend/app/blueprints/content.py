"""Ressources éditoriales CMS — actualités, événements, pages.

Une fabrique génère un blueprint par ressource, adossé au modèle document
`Content` (discriminé par `kind`). Contrat façade + besoins des éditeurs CFCol :

  GET    /{resource}          liste (public : publiés ; admin : tout)
  POST   /{resource}          upsert par id (CFCol.upsert : créer OU fusionner)
  PUT    /{resource}          remplacer toute la collection
  PATCH  /{resource}/<id>     mise à jour partielle (publication, featured, modération)
  DELETE /{resource}/<id>     suppression

Écriture réservée à l'admin contenu (le super passe toujours).
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..extensions import db
from ..models import Content
from ..security import admin_required, record_audit


def _is_admin():
    return current_user.is_authenticated and getattr(current_user, "is_admin", False)


def content_blueprint(resource, kind):
    bp = Blueprint(f"content_{resource}", __name__, url_prefix=f"/{resource}")

    def _ordered(items):
        # news/events : plus récent d'abord (date) ; pages : par slug.
        if kind in ("news", "event"):
            return sorted(items, key=lambda c: (c.date or ""), reverse=True)
        return sorted(items, key=lambda c: c.slug)

    @bp.get("")
    def list_items():
        items = Content.query.filter_by(kind=kind).all()
        if not _is_admin():
            items = [c for c in items if c.pub == "published"]
        return jsonify([c.to_public() for c in _ordered(items)])

    @bp.post("")
    @admin_required("content")
    def upsert_item():
        obj = request.get_json(silent=True) or {}
        slug = Content.slug_for(obj, kind)
        row = Content.find(kind, slug)
        created = row is None
        if created:
            row = Content(kind=kind, slug=slug)
            db.session.add(row)
        # Sémantique CFCol.upsert : fusion (on préserve les champs non fournis).
        merged = dict(row.data or {})
        merged.update(obj)
        row.apply(merged)
        record_audit(f"{kind}.{'create' if created else 'edit'}", kind, slug)
        db.session.commit()
        return jsonify(row.to_public()), (201 if created else 200)

    @bp.put("")
    @admin_required("content")
    def replace_items():
        records = request.get_json(silent=True)
        if not isinstance(records, list):
            return jsonify(error="INVALID_BODY", message="Tableau attendu"), 400
        Content.query.filter_by(kind=kind).delete()
        for obj in records:
            slug = Content.slug_for(obj, kind)
            db.session.add(Content(kind=kind, slug=slug).apply(obj))
        record_audit(f"{kind}.replace_all", kind, "")
        db.session.commit()
        items = Content.query.filter_by(kind=kind).all()
        return jsonify([c.to_public() for c in _ordered(items)])

    @bp.patch("/<slug>")
    @admin_required("content")
    def patch_item(slug):
        row = Content.find(kind, slug)
        if not row:
            return jsonify(error="NOT_FOUND", message="Introuvable"), 404
        partial = request.get_json(silent=True) or {}
        merged = dict(row.data or {})
        merged.update(partial)
        row.apply(merged)
        record_audit(f"{kind}.patch", kind, slug)
        db.session.commit()
        return jsonify(row.to_public())

    @bp.delete("/<slug>")
    @admin_required("content")
    def delete_item(slug):
        row = Content.find(kind, slug)
        if row:
            db.session.delete(row)
            record_audit(f"{kind}.delete", kind, slug)
            db.session.commit()
        return "", 204

    return bp
