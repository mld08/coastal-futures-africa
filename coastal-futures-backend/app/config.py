"""Configuration de l'application (12-factor : tout vient de l'environnement)."""
import os


def _bool(name, default=False):
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _origins(name, default):
    raw = os.environ.get(name) or default
    return [o.strip() for o in raw.split(",") if o.strip()]


class Config:
    # --- Sécurité / session ---
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-a-changer-en-production")

    # Cookie de session (Flask-Login s'appuie dessus).
    SESSION_COOKIE_HTTPONLY = True            # jamais lisible par du JS -> anti-XSS
    SESSION_COOKIE_SECURE = _bool("SESSION_COOKIE_SECURE", False)
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    PERMANENT_SESSION_LIFETIME = 8 * 60 * 60  # 8 h (aligné sur cf-ptf-session.js)

    # --- Base de données ---
    # Dev : SQLite dans instance/. Prod : DATABASE_URL (PostgreSQL).
    _db_url = os.environ.get("DATABASE_URL")
    if _db_url:
        # Compat Heroku/Render : "postgres://" -> "postgresql+psycopg2://"
        if _db_url.startswith("postgres://"):
            _db_url = _db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    SQLALCHEMY_DATABASE_URI = _db_url or "sqlite:///coastal_futures.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- CORS (front Vite) ---
    CORS_ORIGINS = _origins("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")

    # --- E-mail (OTP 2FA, réinitialisation, vérification) ---
    # SMTP renseigné -> envoi réel ; sinon (dev) -> écriture dans instance/outbox/.
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
    MAIL_USE_TLS = _bool("MAIL_USE_TLS", True)   # STARTTLS (port 587)
    MAIL_USE_SSL = _bool("MAIL_USE_SSL", False)  # TLS implicite (port 465)
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
    MAIL_FROM = os.environ.get("MAIL_FROM", "Coastal Futures <no-reply@coastalfutures.local>")

    # URL du frontend (liens dans les e-mails : reset, vérification).
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    # Adresse notifiée quand quelqu'un nous contacte (formulaire de contact).
    ADMIN_NOTIFY_EMAIL = os.environ.get(
        "ADMIN_NOTIFY_EMAIL", "contact@africagovernanceinstitute.org")

    # 2FA e-mail : durée de validité du code (minutes) et essais max.
    OTP_TTL_MIN = int(os.environ.get("OTP_TTL_MIN", "10"))
    OTP_MAX_ATTEMPTS = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))

    # --- Divers ---
    SEED_ON_INIT = _bool("SEED_ON_INIT", True)
    JSON_SORT_KEYS = False
