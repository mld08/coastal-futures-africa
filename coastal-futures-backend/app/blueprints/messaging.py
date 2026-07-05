"""Newsletter (`/newsletters`) et messages de contact (`/contacts`) — gérés
CHEZ NOUS (plus de Google Sheets). L'admin les voit dans la console.

  GET    /newsletters        liste des abonnés            (admin)
  POST   /newsletters        s'abonner (dé-dup serveur)    (public)
  DELETE /newsletters/<id>   supprimer un abonné           (admin)
  GET    /contacts           boîte des messages            (admin)
  POST   /contacts           nous contacter                (public)
                             -> e-mail de notification + notif cloche
  PATCH  /contacts/<id>      marquer lu / non lu           (admin)
  DELETE /contacts/<id>      supprimer                     (admin)
"""
import re

from flask import Blueprint, jsonify, request, current_app

from ..extensions import db
from ..models import Subscriber, ContactMessage, Notification
from ..mailer import send_email
from ..ratelimit import rate_limit
from ..security import admin_required, record_audit
from ..util import slugify, iso_datetime

bp = Blueprint("messaging", __name__)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ------------------------------ newsletter ------------------------------
@bp.get("/newsletters")
@admin_required("content")
def list_newsletters():
    items = Subscriber.query.order_by(Subscriber.created_at.desc()).all()
    return jsonify([s.to_public() for s in items])


@bp.post("/newsletters")
@rate_limit(20, 60)
def subscribe():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email") or "").strip().lower()
    lang = "en" if str(data.get("lang")).lower() == "en" else "fr"
    if not EMAIL_RE.match(email):
        return jsonify(error="INVALID_EMAIL", message="Adresse invalide"), 400
    existing = Subscriber.query.filter_by(email=email).first()
    if existing:
        # dé-duplication côté serveur ; `existing` permet au front d'afficher
        # « déjà inscrit » sans exposer la liste des abonnés.
        return jsonify({**existing.to_public(), "existing": True}), 200
    sub = Subscriber(email=email, lang=lang, status="confirmed",
                     source=str(data.get("source") or "").strip())
    db.session.add(sub)
    db.session.commit()
    return jsonify(sub.to_public()), 201


@bp.delete("/newsletters/<int:sid>")
@admin_required("content")
def delete_subscriber(sid):
    sub = db.session.get(Subscriber, sid)
    if sub:
        db.session.delete(sub)
        db.session.commit()
    return "", 204


# ------------------------------- contact --------------------------------
@bp.get("/contacts")
@admin_required("content", "moderator")
def list_contacts():
    items = ContactMessage.query.order_by(ContactMessage.created_at.desc()).all()
    return jsonify([c.to_public() for c in items])


@bp.post("/contacts")
@rate_limit(10, 60)
def contact():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email") or "").strip().lower()
    message = str(data.get("message") or "").strip()
    if not EMAIL_RE.match(email) or len(message) < 2:
        return jsonify(error="INVALID", message="Champs invalides"), 400
    name = str(data.get("name") or "").strip()
    subject = str(data.get("sujet") or data.get("subject") or "").strip()
    msg = ContactMessage(
        name=name, email=email,
        org=str(data.get("org") or "").strip(),
        pays=str(data.get("pays") or "").strip(),
        subject=subject, message=message,
    )
    db.session.add(msg)

    # Notification cloche admin (super) — le message apparaît dans la console.
    who = name or email
    db.session.merge(Notification(
        id="n-contact-" + slugify(email + "-" + iso_datetime()),
        kind="contact", target_role="super",
        title_fr=f"Nouveau message de contact : {who}",
        title_en=f"New contact message: {who}",
        href="admin-console.html"))
    record_audit("contact.received", "contact", email, actor=who)
    db.session.commit()

    # E-mail de notification à l'équipe (best-effort).
    send_email(
        current_app.config["ADMIN_NOTIFY_EMAIL"],
        f"Coastal Futures — nouveau message de contact ({who})",
        f"Quelqu'un vous a contacté via le site.\n\n"
        f"Nom     : {name or '—'}\n"
        f"E-mail  : {email}\n"
        f"Sujet   : {subject or '—'}\n"
        f"Pays    : {msg.pays or '—'}\n"
        f"Organisation : {msg.org or '—'}\n\n"
        f"Message :\n{message}\n\n"
        f"Retrouvez-le dans la console : Administration › Messages de contact.")
    return jsonify(msg.to_public()), 201


@bp.patch("/contacts/<int:cid>")
@admin_required("content", "moderator")
def patch_contact(cid):
    c = db.session.get(ContactMessage, cid)
    if not c:
        return jsonify(error="NOT_FOUND", message="Message introuvable"), 404
    data = request.get_json(silent=True) or {}
    if "read" in data:
        c.read = bool(data["read"])
    db.session.commit()
    return jsonify(c.to_public())


@bp.delete("/contacts/<int:cid>")
@admin_required("content", "moderator")
def delete_contact(cid):
    c = db.session.get(ContactMessage, cid)
    if c:
        db.session.delete(c)
        db.session.commit()
    return "", 204
