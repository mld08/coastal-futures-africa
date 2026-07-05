"""Ressource `calls` — appels à candidatures.

Contrat façade (src/services/api.js) :
  GET  /calls   -> liste (public : publiés uniquement ; admin : tous)
  POST /calls   -> créer         (admin contenu/pays)
  PUT  /calls   -> remplacer tout (admin)
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..extensions import db
from ..models import Call
from ..security import admin_required, record_audit
from ..util import slugify

bp = Blueprint("calls", __name__, url_prefix="/calls")


@bp.get("")
def list_calls():
    q = Call.query.order_by(Call.created_at.desc())
    items = q.all()
    is_admin = current_user.is_authenticated and getattr(current_user, "is_admin", False)
    if not is_admin:
        items = [c for c in items if c.pub == "published"]
    return jsonify([c.to_public() for c in items])


@bp.post("")
@admin_required("content", "country")
def create_call():
    data = request.get_json(silent=True) or {}
    call_id = data.get("id") or slugify((data.get("title") or {}).get("fr"), "call")
    if db.session.get(Call, call_id):
        return jsonify(error="ID_TAKEN", message="Identifiant déjà utilisé"), 409
    call = Call(id=call_id, **Call.from_public(data))
    db.session.add(call)
    record_audit("call.create", "call", call_id)
    db.session.commit()
    return jsonify(call.to_public()), 201


@bp.put("")
@admin_required("content", "country")
def replace_calls():
    records = request.get_json(silent=True)
    if not isinstance(records, list):
        return jsonify(error="INVALID_BODY", message="Tableau attendu"), 400
    Call.query.delete()
    for data in records:
        cid = data.get("id") or slugify((data.get("title") or {}).get("fr"), "call")
        db.session.add(Call(id=cid, **Call.from_public(data)))
    record_audit("call.replace_all", "call", "")
    db.session.commit()
    return jsonify([c.to_public() for c in Call.query.all()])
