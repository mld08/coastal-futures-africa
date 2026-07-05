"""Sonde de santé (monitoring / vérif de démarrage)."""
from flask import Blueprint, jsonify

from ..util import iso_datetime

bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    return jsonify(status="ok", service="coastal-futures-api", time=iso_datetime())
