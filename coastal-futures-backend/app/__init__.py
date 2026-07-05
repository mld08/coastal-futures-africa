"""Application factory Coastal Futures (Flask).

Assemble : config -> extensions (db, migrate, login, CORS) -> blueprints ->
commandes CLI. Aucune logique métier ici : uniquement le câblage.
"""
import click
from flask import Flask, jsonify
from flask.cli import with_appcontext

from .config import Config
from .extensions import db, migrate, login_manager


def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)

    # Derrière un reverse-proxy (nginx) : lire X-Forwarded-* pour connaître le
    # vrai schéma (https) et l'IP client. Sans proxy (dev), c'est un no-op.
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    _ensure_instance_folder(app)
    _init_extensions(app)
    _register_blueprints(app)
    _register_errorhandlers(app)
    _register_cli(app)
    return app


def _ensure_instance_folder(app):
    import os
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass


def _init_extensions(app):
    from flask_cors import CORS

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Cookies de session cross-origin : CORS DOIT autoriser les credentials
    # et lister explicitement les origines (jamais '*' avec credentials).
    CORS(
        app,
        resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    from .models import User

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, user_id)


def _register_blueprints(app):
    from .blueprints import register_blueprints
    register_blueprints(app)


def _register_errorhandlers(app):
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify(error="NOT_FOUND", message="Ressource introuvable"), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify(error="METHOD_NOT_ALLOWED", message="Méthode non autorisée"), 405

    @app.errorhandler(500)
    def server_error(_e):
        db.session.rollback()
        return jsonify(error="SERVER_ERROR", message="Erreur interne"), 500


def _register_cli(app):
    app.cli.add_command(seed_command)
    app.cli.add_command(create_admin_command)
    app.cli.add_command(init_db_command)


@click.command("init-db")
@with_appcontext
def init_db_command():
    """Crée les tables (dev rapide sans migration Alembic)."""
    db.create_all()
    click.echo("Tables créées.")


@click.command("seed")
@click.option("--force", is_flag=True, help="Réamorce même si des données existent.")
@with_appcontext
def seed_command(force):
    """Amorce la base avec les données de démonstration du frontend."""
    from .seed import seed_all
    n = seed_all(force=force)
    click.echo(f"Amorçage terminé ({n} enregistrements).")


@click.command("create-admin")
@click.option("--email", prompt=True)
@click.option("--name", prompt=True)
@click.option("--role", default="super",
              type=click.Choice(["super", "content", "country", "moderator"]))
@click.option("--country", default="")
@click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
@with_appcontext
def create_admin_command(email, name, role, country, password):
    """Crée (ou met à jour) un compte administrateur."""
    from .models import User
    from .util import slugify
    email = email.strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(id=slugify(name), email=email, name=name, member_type="admin")
        db.session.add(user)
    user.name = name
    user.member_type = "admin"
    user.admin_role = role
    user.country = country or None
    user.status = "active"
    user.email_verified = True
    user.set_password(password)
    db.session.commit()
    click.echo(f"Admin {email} ({role}) prêt.")
