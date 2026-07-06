"""Comptes & indicateurs admin — alimente la table « Utilisateurs et rôles »
et les tuiles du tableau de bord avec des données RÉELLES (plus de maquette).

  GET   /users            liste de tous les comptes            (admin)
  PATCH /users/<id>       change le statut d'un compte         (admin)   {status}
  GET   /admin/stats      indicateurs agrégés du dashboard     (admin)
"""
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..extensions import db
from ..models.user import User, USER_STATUSES, ADMIN_ROLES
from ..models.application import Application
from ..models.content import Content
from ..security import admin_required, record_audit
from ..util import now_utc, iso_date

bp = Blueprint("users", __name__)

APP_OPEN = ("submitted", "review", "incomplete")

# statut interne (modèle) <-> statut attendu par le front (cf-users-table)
_STATUS_OUT = {"active": "active", "suspendu": "suspended", "invite": "pending"}
_STATUS_IN = {"active": "active", "suspended": "suspendu", "pending": "invite"}


def _row(u):
    """Ligne de la table admin : rôle = rôle admin si admin, sinon type de membre."""
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.admin_role if u.is_admin else u.member_type,
        "pays": u.country or "",
        "status": _STATUS_OUT.get(u.status, u.status),
        "joinedAt": iso_date(u.created_at),
        "lastActivity": iso_date(u.last_login_at) if u.last_login_at else "",
    }


# ------------------------------- liste -------------------------------
@bp.get("/users")
@admin_required()
def list_users():
    users = User.query.filter(User.status != "supprime") \
        .order_by(User.created_at.desc()).all()
    return jsonify([_row(u) for u in users])


@bp.patch("/users/<uid>")
@admin_required()
def update_user(uid):
    u = db.session.get(User, uid)
    if not u:
        return jsonify(error="NOT_FOUND", message="Compte introuvable"), 404
    # Seul un super admin peut modifier un autre compte admin.
    if u.is_admin and current_user.admin_role != "super":
        return jsonify(error="FORBIDDEN", message="Réservé au super administrateur"), 403

    data = request.get_json(silent=True) or {}
    if "status" in data:
        new = _STATUS_IN.get(str(data.get("status")))
        if new and new in USER_STATUSES:
            u.status = new
            record_audit("user.status", "user", u.id)
            db.session.commit()
    return jsonify(_row(u))


# ------------------------------- stats -------------------------------
@bp.get("/admin/stats")
@admin_required()
def admin_stats():
    now = now_utc()
    # created_at est stocké naïf (colonnes DateTime sans fuseau) : on compare
    # avec un « maintenant » naïf pour éviter TypeError naive/aware.
    now_naive = now.replace(tzinfo=None)
    cutoff30 = now_naive - timedelta(days=30)
    cutoff7 = (now - timedelta(days=7)).date().isoformat()

    users = User.query.filter(User.status != "supprime").all()
    role_counts = {r: 0 for r in ADMIN_ROLES}
    members = 0
    users_new30 = 0
    for u in users:
        if u.created_at and u.created_at >= cutoff30:
            users_new30 += 1
        if u.is_admin and u.admin_role in role_counts:
            role_counts[u.admin_role] += 1
        elif not u.is_admin:
            members += 1

    apps = Application.query.all()
    apps_open = [a for a in apps if a.status in APP_OPEN]
    # « urgentes » : ouvertes et déposées il y a plus de 7 jours (comparaison
    # lexicographique sûre sur des dates ISO 'AAAA-MM-JJ').
    apps_urgent = sum(1 for a in apps_open
                      if a.submitted_at and a.submitted_at < cutoff7)

    content = Content.query.filter(Content.kind.in_(("news", "event"))).all()
    pending = [c for c in content if (c.pub or "published") != "published"]

    def _no_en(c):
        title = (c.data or {}).get("title") or {}
        return not (title.get("en") or "").strip()

    without_en = sum(1 for c in content
                     if (c.pub or "published") == "published" and _no_en(c))

    return jsonify({
        "usersTotal": len(users),
        "usersNew30d": users_new30,
        "memberCount": members,
        "roleCounts": role_counts,
        "applicationsOpen": len(apps_open),
        "applicationsUrgent": apps_urgent,
        "contentPending": len(pending),
        "contentWithoutEN": without_en,
    })
