"""Invitations — le super admin invite un administrateur ou un bailleur ;
l'invité reçoit un e-mail avec un lien d'activation où il choisit son mot de
passe, ce qui crée (ou active) son compte.

  POST   /admin/invites          créer une invitation (super) + e-mail
  GET    /admin/invites          lister                       (super)
  DELETE /admin/invites/<id>     révoquer                      (super)
  GET    /auth/invite/<token>    infos de l'invitation (page d'activation)
  POST   /auth/accept-invite     activer : {token, password, name?} -> compte + session
"""
import hashlib
import secrets
from datetime import timedelta

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_user

from ..extensions import db
from ..models import AdminInvite, User
from ..models.user import ADMIN_ROLES
from ..mailer import send_email
from ..ratelimit import rate_limit
from ..security import admin_required, record_audit
from ..util import now_utc, slugify

bp = Blueprint("invites", __name__)

# rôles invitables : rôles admin + le rôle bailleur "partenaire"
INVITE_ROLES = ADMIN_ROLES + ("partenaire",)


def _hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _expired(inv):
    if not inv.expires_at:
        return False
    return inv.expires_at.replace(tzinfo=now_utc().tzinfo) < now_utc()


# ------------------------- gestion (super admin) -------------------------
@bp.post("/admin/invites")
@admin_required("super")
def create_invite():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email") or "").strip().lower()
    role = str(data.get("role") or "").strip()
    if "@" not in email:
        return jsonify(error="INVALID_EMAIL", message="Adresse invalide"), 400
    if role not in INVITE_ROLES:
        return jsonify(error="INVALID_ROLE", message="Rôle invalide"), 400

    token = secrets.token_urlsafe(24)
    inv = AdminInvite(
        id="inv-" + slugify(email + "-" + secrets.token_hex(3)),
        email=email, role=role, name=str(data.get("name") or "").strip(),
        country=str(data.get("country") or "").strip(), token=_hash(token),
        used=False, expires_at=now_utc() + timedelta(days=7))
    db.session.add(inv)
    record_audit("invite.create", "invite", inv.id)
    db.session.commit()

    page = "invitation-bailleur" if role == "partenaire" else "invitation-admin"
    link = f"{current_app.config['FRONTEND_URL']}/{page}?token={token}"
    send_email(email, "Coastal Futures — votre invitation",
               f"Bonjour,\n\nVous êtes invité(e) à rejoindre Coastal Futures "
               f"({'espace bailleurs' if role == 'partenaire' else 'administration, rôle ' + role}).\n"
               f"Activez votre accès (lien valable 7 jours) : {link}\n")
    return jsonify(inv.to_public()), 201


@bp.get("/admin/invites")
@admin_required("super")
def list_invites():
    items = AdminInvite.query.order_by(AdminInvite.created_at.desc()).all()
    return jsonify([i.to_public() for i in items])


@bp.delete("/admin/invites/<iid>")
@admin_required("super")
def revoke_invite(iid):
    inv = db.session.get(AdminInvite, iid)
    if inv:
        db.session.delete(inv)
        record_audit("invite.revoke", "invite", iid)
        db.session.commit()
    return "", 204


# ------------------------- activation (public) -------------------------
def _find_invite(token):
    inv = AdminInvite.query.filter_by(token=_hash(token or ""), used=False).first()
    if not inv or _expired(inv):
        return None
    return inv


@bp.get("/auth/invite/<token>")
def invite_info(token):
    inv = _find_invite(token)
    if not inv:
        return jsonify(error="INVALID_INVITE", message="Invitation invalide ou expirée"), 404
    return jsonify(valid=True, email=inv.email, role=inv.role,
                   name=inv.name or "", country=inv.country or "")


@bp.post("/auth/accept-invite")
@rate_limit(10, 60)
def accept_invite():
    data = request.get_json(silent=True) or {}
    password = str(data.get("password") or "")
    if len(password) < 8:
        return jsonify(error="WEAK_PASSWORD", message="Mot de passe trop court (8 caractères minimum)"), 400
    inv = _find_invite(str(data.get("token") or ""))
    if not inv:
        return jsonify(error="INVALID_INVITE", message="Invitation invalide ou expirée"), 400

    is_admin_role = inv.role in ADMIN_ROLES
    name = str(data.get("name") or "").strip() or inv.name or inv.email.split("@")[0]

    user = User.query.filter_by(email=inv.email).first()
    if not user:
        base = slugify(name) or slugify(inv.email.split("@")[0])
        uid, i = base, 2
        while db.session.get(User, uid):
            uid, i = f"{base}-{i}", i + 1
        user = User(id=uid, email=inv.email)
        db.session.add(user)
    user.name = name
    user.member_type = "admin" if is_admin_role else "partenaire"
    user.admin_role = inv.role if is_admin_role else None
    user.country = inv.country or None
    user.status = "active"
    user.email_verified = True
    user.set_password(password)
    inv.used = True
    record_audit("invite.accept", "user", user.id, actor=name)
    db.session.commit()

    # L'activation (jeton e-mail + mot de passe) vaut authentification : session ouverte.
    login_user(user, remember=True)
    resp = {"ok": True, "user": user.to_me()}
    if is_admin_role:
        resp["session"] = user.to_session()
    return jsonify(resp)
