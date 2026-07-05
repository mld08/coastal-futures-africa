"""Envoi d'e-mails (OTP 2FA, réinitialisation, vérification).

Deux modes selon la config :
  - MAIL_SERVER renseigné  -> envoi SMTP réel (smtplib, stdlib).
  - sinon (développement)  -> l'e-mail est écrit dans instance/outbox/ et logué,
    ce qui permet de LIRE le code OTP / le lien sans serveur SMTP.
"""
import os
import smtplib
from email.message import EmailMessage

from flask import current_app

from .util import now_utc


def _outbox_dir():
    d = os.path.join(current_app.instance_path, "outbox")
    os.makedirs(d, exist_ok=True)
    return d


def send_email(to, subject, body):
    """Envoie (ou capture en dev) un e-mail texte. Best-effort : ne lève pas."""
    cfg = current_app.config
    sender = cfg.get("MAIL_FROM")

    if cfg.get("MAIL_SERVER"):
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = sender
            msg["To"] = to
            msg.set_content(body)
            with smtplib.SMTP(cfg["MAIL_SERVER"], cfg.get("MAIL_PORT", 587), timeout=15) as s:
                if cfg.get("MAIL_USE_TLS"):
                    s.starttls()
                if cfg.get("MAIL_USERNAME"):
                    s.login(cfg["MAIL_USERNAME"], cfg.get("MAIL_PASSWORD", ""))
                s.send_message(msg)
            current_app.logger.info("E-mail envoyé à %s : %s", to, subject)
            return True
        except Exception as exc:  # pragma: no cover - dépend du réseau
            current_app.logger.warning("Échec SMTP (%s) -> capture fichier", exc)

    # Dev / fallback : capture fichier (lisible pour récupérer le code).
    stamp = now_utc().strftime("%Y%m%d-%H%M%S-%f")
    safe_to = "".join(c if c.isalnum() or c in ".@_-" else "_" for c in to)
    path = os.path.join(_outbox_dir(), f"{stamp}_{safe_to}.txt")
    content = f"To: {to}\nFrom: {sender}\nSubject: {subject}\n\n{body}\n"
    try:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
    except OSError:
        pass
    current_app.logger.info("[DEV MAIL] %s | %s\n%s", to, subject, body)
    return False
