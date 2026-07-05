"""Extensions Flask instanciées une seule fois, initialisées dans la factory."""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

# API JSON : pas de redirection vers une page de login, on renvoie 401.
login_manager.session_protection = "strong"


@login_manager.unauthorized_handler
def _unauthorized():
    from flask import jsonify
    return jsonify(error="AUTH_REQUIRED", message="Authentification requise"), 401
