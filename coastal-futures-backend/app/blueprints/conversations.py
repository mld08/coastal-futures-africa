"""Messagerie — fils (`/threads`) et messages (`/messages`).

Lecture/gestion réservées à l'admin (la console admin-messagerie est ouverte
aux rôles super/content/country/moderator). L'envoi (`POST /messages`) et la
création de fil (`POST /threads`) exigent seulement d'être authentifié.

  GET   /threads              liste des fils               (admin)
  POST  /threads              créer un fil                  (connecté)
  PATCH /threads/<id>         fermer/rouvrir, etc.          (admin)
  GET   /messages             tous les messages             (admin)
  POST  /messages             envoyer (ajout)               (connecté)
  PATCH /messages/<id>        marquer lu, etc.              (admin)
"""
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Thread, Message
from flask_login import current_user

from ..security import admin_required, login_required_json, record_audit
from ..util import slugify, iso_datetime

threads_bp = Blueprint("threads", __name__, url_prefix="/threads")
messages_bp = Blueprint("messages", __name__, url_prefix="/messages")


def _is_admin():
    return getattr(current_user, "is_admin", False)


def _my_thread_ids():
    """Fils où l'utilisateur courant est participant (membre non-admin)."""
    uid = current_user.id
    umail = (current_user.email or "").lower()
    ids = set()
    for t in Thread.query.all():
        if (t.with_email or "").lower() == umail:
            ids.add(t.id)
            continue
        for p in (t.participants or []):
            if p.get("id") == uid or (p.get("email", "").lower() == umail):
                ids.add(t.id)
                break
    return ids


# ----------------------------- threads -----------------------------
@threads_bp.get("")
@login_required_json
def list_threads():
    q = Thread.query.order_by(Thread.created_at.desc())
    items = q.all() if _is_admin() else [t for t in q.all() if t.id in _my_thread_ids()]
    return jsonify([t.to_public() for t in items])


@threads_bp.post("")
@login_required_json
def create_thread():
    data = request.get_json(silent=True) or {}
    tid = data.get("id") or slugify((data.get("subject") or {}).get("fr"), "thread")
    if db.session.get(Thread, tid):
        return jsonify(error="ID_TAKEN", message="Fil déjà existant"), 409
    thread = Thread(id=tid, **Thread.columns_from_public(data))
    db.session.add(thread)
    record_audit("thread.create", "thread", tid)
    db.session.commit()
    return jsonify(thread.to_public()), 201


@threads_bp.patch("/<tid>")
@admin_required()
def patch_thread(tid):
    thread = db.session.get(Thread, tid)
    if not thread:
        return jsonify(error="NOT_FOUND", message="Fil introuvable"), 404
    data = request.get_json(silent=True) or {}
    if "closed" in data:
        thread.closed = bool(data["closed"])
    if "closedBy" in data:
        thread.closed_by = data["closedBy"]
    if "subject" in data:
        thread.subject = data["subject"]
    if "participants" in data:
        thread.participants = data["participants"]
    record_audit("thread.update", "thread", tid)
    db.session.commit()
    return jsonify(thread.to_public())


# ----------------------------- messages -----------------------------
@messages_bp.get("")
@login_required_json
def list_messages():
    q = Message.query.order_by(Message.created_at.asc())
    if _is_admin():
        items = q.all()
    else:
        mine = _my_thread_ids()
        items = [m for m in q.all() if m.thread_id in mine]
    return jsonify([m.to_public() for m in items])


@messages_bp.post("")
@login_required_json
def send_message():
    data = request.get_json(silent=True) or {}
    if not (data.get("body") or "").strip():
        return jsonify(error="EMPTY", message="Message vide"), 400
    # Un membre ne peut écrire que dans un fil dont il est participant.
    if not _is_admin() and data.get("threadId") not in _my_thread_ids():
        return jsonify(error="FORBIDDEN", message="Fil non autorisé"), 403
    mid = data.get("id") or ("msg-" + slugify(iso_datetime(), "m"))
    if db.session.get(Message, mid):
        return jsonify(error="ID_TAKEN", message="Message déjà existant"), 409
    msg = Message(id=mid, **Message.columns_from_public(data))
    if not msg.at:
        msg.at = iso_datetime()
    db.session.add(msg)
    record_audit("message.send", "message", mid)
    db.session.commit()
    return jsonify(msg.to_public()), 201


@messages_bp.patch("/<mid>")
@admin_required()
def patch_message(mid):
    msg = db.session.get(Message, mid)
    if not msg:
        return jsonify(error="NOT_FOUND", message="Message introuvable"), 404
    data = request.get_json(silent=True) or {}
    if "read" in data:
        msg.read = bool(data["read"])
    if "body" in data:
        msg.body = data["body"]
    db.session.commit()
    return jsonify(msg.to_public())
