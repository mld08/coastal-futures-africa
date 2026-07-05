"""Ressource `applications` — candidatures (les « demandes »).

  GET   /applications        -> liste            (admin)
  POST  /applications        -> déposer           (public : candidature.html)
  PATCH /applications/<id>   -> statut/assignation (admin)
  PUT   /applications        -> remplacer tout     (admin)

Dépôt public : on génère l'id, on horodate, on ajoute l'entrée d'historique
« submitted », on incrémente le compteur de l'appel et on notifie l'admin.
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..extensions import db
from ..models import Application, Call, Notification
from ..models.application import APP_STATUSES
from ..security import admin_required, record_audit
from ..util import now_utc, iso_date, iso_datetime, slugify, i18n

bp = Blueprint("applications", __name__, url_prefix="/applications")


def _unique_app_id(candidat):
    base = "app-" + slugify(candidat.get("nom") or "candidat")
    cid, i = base, 2
    while db.session.get(Application, cid):
        cid = f"{base}-{i}"
        i += 1
    return cid


@bp.get("")
@admin_required()
def list_applications():
    items = Application.query.order_by(Application.created_at.desc()).all()
    return jsonify([a.to_public() for a in items])


@bp.post("")
def create_application():
    """Dépôt public d'une candidature (aucune auth requise)."""
    data = request.get_json(silent=True) or {}
    candidat = data.get("candidat") or {}
    projet = data.get("projet") or {}

    if not (candidat.get("nom") and candidat.get("email")):
        return jsonify(error="INVALID", message="Nom et e-mail du candidat requis"), 400
    if not projet.get("nom"):
        return jsonify(error="INVALID", message="Nom du projet requis"), 400

    cols = Application.columns_from_public(data)
    cols["status"] = "submitted"
    cols["submitted_at"] = iso_date()
    cols["assignee"] = ""
    cols["complements"] = []
    cols["history"] = [{
        "at": iso_date(),
        "by": candidat.get("nom"),
        "action": "submitted",
        "note": "",
    }]
    app_row = Application(id=data.get("id") or _unique_app_id(candidat), **cols)
    db.session.add(app_row)

    # Compteur d'appel + notification admin (comme les seeds admin_notifs).
    call = db.session.get(Call, app_row.call_id) if app_row.call_id else None
    if call:
        call.apps = (call.apps or 0) + 1
    projet_nom = projet.get("nom", "")
    cand_nom = candidat.get("nom", "")
    notif = Notification(
        id="n-app-" + slugify(cand_nom, "cand"),
        kind="application",
        target_role="super",
        title_fr=f"Nouvelle candidature : {projet_nom} ({cand_nom})",
        title_en=f"New application: {projet_nom} ({cand_nom})",
        href="admin-candidatures.html",
    )
    db.session.merge(notif)  # merge : idempotent si l'id existe déjà
    record_audit("application.submit", "application", app_row.id, actor=cand_nom)
    db.session.commit()
    return jsonify(app_row.to_public()), 201


@bp.patch("/<app_id>")
@admin_required()
def update_application(app_id):
    """Mise à jour partielle par la console admin : statut, assignation,
    évaluation, historique. La console envoie l'historique complet (déjà
    enrichi côté client) ; sinon on ajoute une entrée à partir de status/note.
    """
    app_row = db.session.get(Application, app_id)
    if not app_row:
        return jsonify(error="NOT_FOUND", message="Candidature introuvable"), 404
    data = request.get_json(silent=True) or {}

    new_status = data.get("status")
    note = str(data.get("note") or "").strip()
    if new_status:
        if new_status not in APP_STATUSES:
            return jsonify(error="INVALID_STATUS", message="Statut invalide"), 400
        app_row.status = new_status
    if "assignee" in data:
        app_row.assignee = str(data.get("assignee") or "")
    if "evaluation" in data:
        app_row.evaluation = data.get("evaluation")

    if isinstance(data.get("history"), list):
        # La console fournit l'historique complet -> on le prend tel quel.
        app_row.history = data["history"]
    elif new_status or note:
        history = list(app_row.history or [])
        history.append({
            "at": iso_date(),
            "by": current_user.name,
            "action": new_status or "note",
            "note": note,
        })
        app_row.history = history

    record_audit("application.update", "application", app_row.id)
    db.session.commit()
    return jsonify(app_row.to_public())


@bp.put("")
@admin_required()
def replace_applications():
    records = request.get_json(silent=True)
    if not isinstance(records, list):
        return jsonify(error="INVALID_BODY", message="Tableau attendu"), 400
    Application.query.delete()
    for data in records:
        candidat = data.get("candidat") or {}
        aid = data.get("id") or _unique_app_id(candidat)
        db.session.add(Application(id=aid, **Application.columns_from_public(data)))
    record_audit("application.replace_all", "application", "")
    db.session.commit()
    return jsonify([a.to_public() for a in Application.query.all()])
