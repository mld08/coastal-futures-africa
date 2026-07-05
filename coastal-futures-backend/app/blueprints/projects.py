"""Registre des projets de la carte d'impact — `/projects`.

  GET /projects   liste (public : la carte est publique)
  PUT /projects   remplace tout le registre (coordinateur pays / super)

Le front écrit toujours le tableau complet (localStorage cf-map-projects) ;
un PUT « replace all » reflète donc exactement chaque enregistrement.
Les INDICATEURS restent dérivés côté client (cf-derive.js) à partir de ce
registre + des candidatures — on ne les recalcule pas ici.
"""
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import MapProject
from ..security import admin_required, record_audit

bp = Blueprint("projects", __name__, url_prefix="/projects")


@bp.get("")
def list_projects():
    items = MapProject.query.order_by(MapProject.position.asc()).all()
    return jsonify([p.to_public() for p in items])


@bp.put("")
@admin_required("country")
def replace_projects():
    records = request.get_json(silent=True)
    if not isinstance(records, list):
        return jsonify(error="INVALID_BODY", message="Tableau attendu"), 400
    MapProject.query.delete()
    for i, obj in enumerate(records):
        db.session.add(MapProject(position=i, data=obj))
    record_audit("project.replace_all", "project", "")
    db.session.commit()
    items = MapProject.query.order_by(MapProject.position.asc()).all()
    return jsonify([p.to_public() for p in items])
