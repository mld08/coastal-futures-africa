"""Flux admin en lecture : notifications (cloche) et journal d'audit.

Le backend écrit DÉJÀ ces enregistrements (Notification à chaque candidature /
message de contact ; AuditLog via record_audit à chaque mutation). On les expose
ici pour que la cloche et la page journal affichent du RÉEL (plus de seed).

  GET /notifications   notifications visibles par l'admin courant   (admin)
  PATCH /notifications/<id>  marquer lu                             (admin)
  GET /audit           journal d'audit (récent d'abord)            (admin)
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..extensions import db
from ..models.admin import Notification, AuditLog
from ..security import admin_required

bp = Blueprint("admin_feed", __name__)


@bp.get("/notifications")
@admin_required()
def list_notifications():
    q = Notification.query.order_by(Notification.created_at.desc()).limit(100).all()
    role = current_user.admin_role
    # Le super voit tout ; un rôle ciblé voit ses notifs + les non-ciblées (super).
    items = [n for n in q if role == "super" or n.target_role in (role, "super", "", None)]
    return jsonify([n.to_public() for n in items])


@bp.patch("/notifications/<nid>")
@admin_required()
def mark_notification(nid):
    n = db.session.get(Notification, nid)
    if not n:
        return jsonify(error="NOT_FOUND", message="Notification introuvable"), 404
    data = request.get_json(silent=True) or {}
    if "read" in data:
        n.read = bool(data["read"])
        db.session.commit()
    return jsonify(n.to_public())


@bp.get("/audit")
@admin_required()
def list_audit():
    rows = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(300).all()
    return jsonify([r.to_public() for r in rows])
