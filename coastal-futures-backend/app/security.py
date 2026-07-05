"""Autorisation (RBAC) et helpers transverses.

La carte rôle -> pages autorisées reste côté front (cf-admin-auth.js) pour le
chrome ; côté serveur on garde la règle simple et fail-closed : certaines
actions exigent un compte admin, éventuellement d'un rôle précis.
"""
from functools import wraps

from flask import jsonify, request
from flask_login import current_user

from .extensions import db
from .models import AuditLog


def _forbidden(msg="Accès refusé"):
    return jsonify(error="FORBIDDEN", message=msg), 403


def login_required_json(fn):
    """Comme flask_login.login_required mais garantit une réponse JSON 401."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify(error="AUTH_REQUIRED", message="Authentification requise"), 401
        return fn(*args, **kwargs)
    return wrapper


def admin_required(*roles):
    """Exige un compte admin. Si `roles` est fourni, restreint à ces rôles.

    Le super-admin passe toujours (all=true dans le front).
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify(error="AUTH_REQUIRED", message="Authentification requise"), 401
            if not getattr(current_user, "is_admin", False):
                return _forbidden("Réservé à l'administration")
            if roles and current_user.admin_role != "super" and current_user.admin_role not in roles:
                return _forbidden("Rôle insuffisant")
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def record_audit(action, target_type="", target_id="", actor=None):
    """Trace append-only d'une action modifiant l'état (cf-audit.js côté front)."""
    if actor is None and current_user.is_authenticated:
        actor = current_user.name
    entry = AuditLog(
        action=action,
        target_type=target_type,
        target_id=str(target_id or ""),
        actor=actor or "Système",
        ip_address=(request.remote_addr or ""),
    )
    db.session.add(entry)
    return entry
