"""Enregistrement des blueprints de l'API."""


def register_blueprints(app):
    from .health import bp as health_bp
    from .auth import bp as auth_bp
    from .calls import bp as calls_bp
    from .applications import bp as applications_bp
    from .messaging import bp as messaging_bp
    from .content import content_blueprint
    from .conversations import threads_bp, messages_bp
    from .mentorship import bp as mentorship_bp
    from .projects import bp as projects_bp
    from .invites import bp as invites_bp
    from .users import bp as users_bp
    from .admin_feed import bp as admin_feed_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(calls_bp)
    app.register_blueprint(applications_bp)
    app.register_blueprint(messaging_bp)
    app.register_blueprint(threads_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(mentorship_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(invites_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(admin_feed_bp)

    # Collections éditoriales CMS (modèle document Content).
    app.register_blueprint(content_blueprint("news", "news"))
    app.register_blueprint(content_blueprint("events", "event"))
    app.register_blueprint(content_blueprint("pages", "page"))

    # Annuaires (mêmes patrons : document + pub + upsert/remove admin).
    app.register_blueprint(content_blueprint("entrepreneurs", "entrepreneur"))
    app.register_blueprint(content_blueprint("mentors", "mentor"))
