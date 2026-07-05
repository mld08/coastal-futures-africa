"""Authentification durcie — inscription (+ vérification e-mail), connexion
membre (1 étape), connexion admin & bailleur en DEUX étapes avec code OTP
envoyé par e-mail (2FA réelle), réinitialisation de mot de passe, session,
déconnexion. Anti-bruteforce : rate-limiting sur les endpoints sensibles.

  POST /auth/register             inscription (entrepreneur|mentor|partenaire) + e-mail de vérif
  POST /auth/verify-email         valide l'adresse via le jeton du lien
  POST /auth/login                connexion membre (entrepreneur/mentor) -> session
  POST /auth/admin/login          étape 1 admin : vérifie identifiants -> envoie l'OTP par e-mail
  POST /auth/admin/verify-otp     étape 2 admin : vérifie l'OTP -> session
  POST /auth/admin/resend-otp     renvoie un nouveau code
  POST /auth/ptf/login            étape 1 bailleur : idem (compte partenaire)
  POST /auth/ptf/verify-otp       étape 2 bailleur
  POST /auth/ptf/resend-otp
  POST /auth/forgot-password      envoie un lien de réinitialisation par e-mail
  POST /auth/reset-password       fixe un nouveau mot de passe via le jeton
  GET  /auth/me · POST /auth/logout
"""
from email_validator import validate_email, EmailNotValidError
from flask import Blueprint, jsonify, request, session, current_app
from flask_login import login_user, logout_user, current_user

from ..extensions import db
from ..models import User, OtpCode, AuthToken
from ..mailer import send_email
from ..ratelimit import rate_limit
from ..security import login_required_json, record_audit
from ..util import now_utc, slugify

bp = Blueprint("auth", __name__, url_prefix="/auth")


# --------------------------- helpers ---------------------------
def _clean_email(raw):
    try:
        return validate_email(str(raw or "").strip(),
                              check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        return None


def _unique_id(name, email):
    base = slugify(name) or slugify(email.split("@")[0])
    candidate, i = base, 2
    while db.session.get(User, candidate) is not None:
        candidate = f"{base}-{i}"
        i += 1
    return candidate


def _valid_user(data):
    """Vérifie e-mail + mot de passe (sans ouvrir de session)."""
    email = _clean_email(data.get("email"))
    password = str(data.get("password") or "")
    if not email or not password:
        return None, (jsonify(error="INVALID_CREDENTIALS", message="E-mail ou mot de passe manquant"), 400)
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return None, (jsonify(error="INVALID_CREDENTIALS", message="Identifiants incorrects"), 401)
    if user.status != "active":
        return None, (jsonify(error="ACCOUNT_DISABLED", message="Compte non actif"), 403)
    return user, None


def _open_session(user):
    user.last_login_at = now_utc()
    db.session.commit()
    login_user(user, remember=True)
    session.permanent = True


def _issue_otp(user, purpose):
    """Génère un code, l'envoie par e-mail (ou le capture en dev)."""
    ttl = current_app.config["OTP_TTL_MIN"]
    code, _ = OtpCode.issue(user, purpose, ttl)
    db.session.commit()
    send_email(
        user.email,
        "Coastal Futures — votre code de connexion",
        f"Bonjour {user.name},\n\n"
        f"Votre code de vérification est : {code}\n"
        f"Il expire dans {ttl} minutes.\n\n"
        f"Si vous n'êtes pas à l'origine de cette connexion, ignorez cet e-mail.",
    )


def _verify_otp(purpose):
    """Étape 2 générique : vérifie l'OTP et ouvre la session."""
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    code = str(data.get("code") or "").strip()
    user = User.query.filter_by(email=email).first() if email else None
    if not user:
        return None, (jsonify(error="INVALID_CODE", message="Code incorrect"), 401)
    ok, reason = OtpCode.check(user, purpose, code, current_app.config["OTP_MAX_ATTEMPTS"])
    db.session.commit()
    if not ok:
        msg = {"expired": "Code expiré, demandez-en un nouveau.",
               "too_many": "Trop d'essais, demandez un nouveau code."}.get(reason, "Code incorrect")
        return None, (jsonify(error="INVALID_CODE", message=msg), 401)
    _open_session(user)
    return user, None


# --------------------------- inscription ---------------------------
@bp.post("/register")
@rate_limit(5, 60)
def register():
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    password = str(data.get("password") or "")
    name = str(data.get("name") or "").strip()
    member_type = str(data.get("memberType") or "entrepreneur").strip()

    if not email:
        return jsonify(error="INVALID_EMAIL", message="Adresse e-mail invalide"), 400
    if len(password) < 8:
        return jsonify(error="WEAK_PASSWORD", message="Mot de passe trop court (8 caractères minimum)"), 400
    if not name:
        return jsonify(error="INVALID_NAME", message="Nom requis"), 400
    if member_type not in ("entrepreneur", "mentor", "partenaire"):
        return jsonify(error="INVALID_TYPE", message="Type de compte invalide"), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error="EMAIL_TAKEN", message="Adresse déjà utilisée"), 409

    user = User(
        id=_unique_id(name, email), email=email, name=name, member_type=member_type,
        country=str(data.get("country") or "").strip() or None,
        locale="en" if str(data.get("locale")).lower() == "en" else "fr", status="active")
    user.set_password(password)
    db.session.add(user)
    record_audit("user.register", "user", user.id, actor=name)
    db.session.commit()

    # E-mail de vérification (best-effort).
    token, _ = AuthToken.issue(user, "verify", 60 * 24)
    db.session.commit()
    link = f"{current_app.config['FRONTEND_URL']}/verifier-email?token={token}"
    send_email(user.email, "Coastal Futures — confirmez votre adresse",
               f"Bonjour {name},\n\nConfirmez votre inscription : {link}\n\nÀ bientôt.")

    _open_session(user)
    return jsonify(ok=True, user=user.to_me()), 201


@bp.post("/verify-email")
def verify_email():
    data = request.get_json(silent=True) or {}
    uid = AuthToken.consume(str(data.get("token") or ""), "verify")
    if not uid:
        db.session.commit()
        return jsonify(error="INVALID_TOKEN", message="Lien invalide ou expiré"), 400
    user = db.session.get(User, uid)
    if user:
        user.email_verified = True
    db.session.commit()
    return jsonify(ok=True)


# --------------------------- connexion membre ---------------------------
@bp.post("/login")
@rate_limit(10, 60)
def login():
    user, err = _valid_user(request.get_json(silent=True) or {})
    if err:
        return err
    if user.is_admin:
        return jsonify(error="USE_ADMIN_LOGIN", message="Utilisez la connexion administration"), 403
    if user.member_type == "partenaire":
        return jsonify(error="USE_PTF_LOGIN", message="Utilisez la connexion bailleurs"), 403
    _open_session(user)
    return jsonify(ok=True, user=user.to_me())


# --------------------------- connexion admin (2FA e-mail) ---------------------------
@bp.post("/admin/login")
@rate_limit(10, 60)
def admin_login():
    user, err = _valid_user(request.get_json(silent=True) or {})
    if err:
        return err
    if not user.is_admin:
        return jsonify(error="NOT_ADMIN", message="Compte non administrateur"), 403
    _issue_otp(user, "admin_login")
    return jsonify(ok=True, otpRequired=True, message="Un code de vérification a été envoyé par e-mail.")


@bp.post("/admin/verify-otp")
@rate_limit(10, 60)
def admin_verify_otp():
    user, err = _verify_otp("admin_login")
    if err:
        return err
    if not user.is_admin:
        return jsonify(error="NOT_ADMIN", message="Compte non administrateur"), 403
    return jsonify(ok=True, session=user.to_session(), user=user.to_me())


@bp.post("/admin/resend-otp")
@rate_limit(3, 60)
def admin_resend_otp():
    email = _clean_email((request.get_json(silent=True) or {}).get("email"))
    user = User.query.filter_by(email=email).first() if email else None
    if user and user.is_admin and user.status == "active":
        _issue_otp(user, "admin_login")
    return jsonify(ok=True)  # réponse générique (pas d'énumération)


# --------------------------- connexion bailleur (2FA e-mail) ---------------------------
@bp.post("/ptf/login")
@rate_limit(10, 60)
def ptf_login():
    user, err = _valid_user(request.get_json(silent=True) or {})
    if err:
        return err
    if user.member_type != "partenaire":
        return jsonify(error="NOT_PTF", message="Compte non partenaire"), 403
    _issue_otp(user, "ptf_login")
    return jsonify(ok=True, otpRequired=True, message="Un code de vérification a été envoyé par e-mail.")


@bp.post("/ptf/verify-otp")
@rate_limit(10, 60)
def ptf_verify_otp():
    user, err = _verify_otp("ptf_login")
    if err:
        return err
    if user.member_type != "partenaire":
        return jsonify(error="NOT_PTF", message="Compte non partenaire"), 403
    return jsonify(ok=True, user=user.to_me())


@bp.post("/ptf/resend-otp")
@rate_limit(3, 60)
def ptf_resend_otp():
    email = _clean_email((request.get_json(silent=True) or {}).get("email"))
    user = User.query.filter_by(email=email).first() if email else None
    if user and user.member_type == "partenaire" and user.status == "active":
        _issue_otp(user, "ptf_login")
    return jsonify(ok=True)


# --------------------------- réinitialisation mot de passe ---------------------------
@bp.post("/forgot-password")
@rate_limit(5, 60)
def forgot_password():
    email = _clean_email((request.get_json(silent=True) or {}).get("email"))
    user = User.query.filter_by(email=email).first() if email else None
    if user and user.status == "active":
        token, _ = AuthToken.issue(user, "reset", 30)
        db.session.commit()
        link = f"{current_app.config['FRONTEND_URL']}/mot-de-passe-oublie?token={token}"
        send_email(user.email, "Coastal Futures — réinitialisation du mot de passe",
                   f"Bonjour {user.name},\n\n"
                   f"Réinitialisez votre mot de passe (lien valable 30 min) : {link}\n\n"
                   f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.")
    return jsonify(ok=True)  # réponse générique (pas d'énumération)


@bp.post("/reset-password")
@rate_limit(10, 60)
def reset_password():
    data = request.get_json(silent=True) or {}
    password = str(data.get("password") or "")
    if len(password) < 8:
        return jsonify(error="WEAK_PASSWORD", message="Mot de passe trop court (8 caractères minimum)"), 400
    uid = AuthToken.consume(str(data.get("token") or ""), "reset")
    if not uid:
        db.session.commit()
        return jsonify(error="INVALID_TOKEN", message="Lien invalide ou expiré"), 400
    user = db.session.get(User, uid)
    if not user:
        db.session.commit()
        return jsonify(error="INVALID_TOKEN", message="Lien invalide"), 400
    user.set_password(password)
    # Invalide les OTP en cours par sécurité.
    OtpCode.query.filter_by(user_id=user.id, consumed=False).update({"consumed": True})
    record_audit("user.reset_password", "user", user.id, actor=user.name)
    db.session.commit()
    return jsonify(ok=True)


# --------------------------- session ---------------------------
@bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return jsonify(authenticated=False), 200
    return jsonify(authenticated=True, user=current_user.to_me())


@bp.post("/logout")
@login_required_json
def logout():
    logout_user()
    session.clear()
    return jsonify(ok=True)
