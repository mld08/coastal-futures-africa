"""Mentorat — demandes, mentorats actifs et sessions.

Vues scopées : un mentor connecté ne voit QUE ce qui le concerne
(mentor_id == son id de compte) ; un admin voit tout.

  GET   /mentor_requests            demandes reçues            (mentor: siennes ; admin: toutes)
  POST  /mentor_requests            envoyer une demande         (public)
  PATCH /mentor_requests/<id>       accepter/décliner           (mentor concerné ou admin)
                                    -> accepter crée un Mentorship
  GET   /mentorships                mes mentorés                (mentor/admin)
  GET   /mentor_sessions            mes sessions                (mentor/admin)
  POST  /mentor_sessions            proposer une session        (mentor)
  PATCH /mentor_sessions/<id>       confirmer/annuler…          (mentor concerné ou admin)
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..extensions import db
from ..models import MentorRequest, Mentorship, MentorSession, Content
from ..models.mentorship import REQUEST_STATUSES, SESSION_STATUSES, MENTORSHIP_STATUSES
from ..security import login_required_json, record_audit
from ..util import slugify, iso_datetime, iso_date

bp = Blueprint("mentor_requests", __name__)


def _is_admin():
    return getattr(current_user, "is_admin", False)


def _scoped(query, model):
    """Admin : tout ; mentor : seulement mentor_id == son id de compte."""
    if _is_admin():
        return query
    return query.filter(model.mentor_id == current_user.id)


def _owns(row):
    return _is_admin() or (row.mentor_id and row.mentor_id == current_user.id)


# ============================ demandes ============================
@bp.get("/mentor_requests")
@login_required_json
def list_requests():
    q = _scoped(MentorRequest.query, MentorRequest).order_by(MentorRequest.created_at.desc())
    return jsonify([r.to_public() for r in q.all()])


@bp.post("/mentor_requests")
def create_request():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message") or "").strip()
    if len(message) < 2:
        return jsonify(error="EMPTY", message="Message requis"), 400
    frm = data.get("from") or {}
    if current_user.is_authenticated:
        from_user_id, from_name, from_email = current_user.id, current_user.name, current_user.email
    else:
        from_user_id = None
        from_name = str(frm.get("name") or "").strip()
        from_email = str(frm.get("email") or "").strip().lower()
    rid = data.get("id") or ("mreq-" + slugify(
        (data.get("mentorId") or "mentor") + "-" + (from_name or "anon") + "-" + iso_datetime()))
    row = MentorRequest(
        id=rid, mentor_id=data.get("mentorId"), mentor_name=data.get("mentorName", ""),
        from_user_id=from_user_id, from_name=from_name, from_email=from_email,
        message=message, status="en_attente")
    db.session.add(row)
    record_audit("mentor_request.create", "mentor_request", rid, actor=from_name or "Anonyme")
    db.session.commit()
    return jsonify(row.to_public()), 201


@bp.patch("/mentor_requests/<rid>")
@login_required_json
def update_request(rid):
    row = db.session.get(MentorRequest, rid)
    if not row:
        return jsonify(error="NOT_FOUND", message="Demande introuvable"), 404
    if not _owns(row):
        return jsonify(error="FORBIDDEN", message="Demande d'un autre mentor"), 403
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status:
        if new_status not in REQUEST_STATUSES:
            return jsonify(error="INVALID_STATUS", message="Statut invalide"), 400
        row.status = new_status
        # Accepter -> ouvre un accompagnement (Mentorship) s'il n'existe pas déjà.
        if new_status == "accepte":
            _open_mentorship(row)
    record_audit("mentor_request.update", "mentor_request", rid)
    db.session.commit()
    return jsonify(row.to_public())


def _open_mentorship(req):
    mid = "ment-" + slugify((req.mentor_id or "m") + "-" + (req.from_name or "mentee"))
    if db.session.get(Mentorship, mid):
        return
    org = sector = country = ""
    # Enrichit depuis l'annuaire entrepreneurs si le nom correspond.
    for c in Content.query.filter_by(kind="entrepreneur").all():
        if (c.data or {}).get("n") == req.from_name:
            org = (c.data or {}).get("s", "")
            sector = (c.data or {}).get("sec", "")
            country = (c.data or {}).get("pays", "")
            break
    db.session.add(Mentorship(
        id=mid, mentor_id=req.mentor_id, mentee_name=req.from_name or "",
        mentee_email=req.from_email or "", mentee_org=org, mentee_sector=sector,
        mentee_country=country, status="active", started_at=iso_date()))


# ============================ mentorats ============================
@bp.get("/mentorships")
@login_required_json
def list_mentorships():
    q = _scoped(Mentorship.query, Mentorship).order_by(Mentorship.created_at.desc())
    return jsonify([m.to_public() for m in q.all()])


@bp.patch("/mentorships/<mid>")
@login_required_json
def update_mentorship(mid):
    row = db.session.get(Mentorship, mid)
    if not row:
        return jsonify(error="NOT_FOUND", message="Mentorat introuvable"), 404
    if not _owns(row):
        return jsonify(error="FORBIDDEN", message="Mentorat d'un autre mentor"), 403
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status:
        if new_status not in MENTORSHIP_STATUSES:
            return jsonify(error="INVALID_STATUS", message="Statut invalide"), 400
        row.status = new_status
    record_audit("mentorship.update", "mentorship", mid)
    db.session.commit()
    return jsonify(row.to_public())


# ============================ sessions ============================
@bp.get("/mentor_sessions")
@login_required_json
def list_sessions():
    q = _scoped(MentorSession.query, MentorSession).order_by(MentorSession.scheduled_at.asc())
    return jsonify([s.to_public() for s in q.all()])


@bp.post("/mentor_sessions")
@login_required_json
def propose_session():
    data = request.get_json(silent=True) or {}
    if not (data.get("title") or "").strip():
        return jsonify(error="EMPTY", message="Titre requis"), 400
    sid = data.get("id") or ("sess-" + slugify((data.get("menteeName") or "mentee") + "-" + iso_datetime()))
    # Le mentor connecté est le propriétaire (sauf admin qui peut préciser mentorId).
    mentor_id = data.get("mentorId") if _is_admin() else current_user.id
    row = MentorSession(
        id=sid, mentor_id=mentor_id, mentee_name=data.get("menteeName", ""),
        title=data.get("title", ""), scheduled_at=data.get("scheduledAt"),
        channel=data.get("channel", "en_ligne"), location=data.get("location", ""),
        status=data.get("status", "proposee"))
    db.session.add(row)
    record_audit("mentor_session.create", "mentor_session", sid)
    db.session.commit()
    return jsonify(row.to_public()), 201


@bp.patch("/mentor_sessions/<sid>")
@login_required_json
def update_session(sid):
    row = db.session.get(MentorSession, sid)
    if not row:
        return jsonify(error="NOT_FOUND", message="Session introuvable"), 404
    if not _owns(row):
        return jsonify(error="FORBIDDEN", message="Session d'un autre mentor"), 403
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status:
        if new_status not in SESSION_STATUSES:
            return jsonify(error="INVALID_STATUS", message="Statut invalide"), 400
        row.status = new_status
    if "scheduledAt" in data:
        row.scheduled_at = data["scheduledAt"]
    db.session.commit()
    return jsonify(row.to_public())
