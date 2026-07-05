"""Petits utilitaires partagés (slug, dates, i18n)."""
import re
import unicodedata
from datetime import datetime, timezone


def now_utc():
    return datetime.now(timezone.utc)


def iso_date(dt=None):
    """Date ISO courte AAAA-MM-JJ (comme les seeds du front)."""
    dt = dt or now_utc()
    return dt.strftime("%Y-%m-%d")


def iso_datetime(dt=None):
    """Horodatage ISO sans microsecondes (comme les seeds du front)."""
    dt = dt or now_utc()
    return dt.replace(microsecond=0).isoformat()


def slugify(text, fallback="item"):
    """Transforme un libellé en identifiant stable, compatible CFCol.slug()."""
    text = unicodedata.normalize("NFD", str(text or ""))
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:48]
    return text or f"{fallback}-{int(now_utc().timestamp())}"


def i18n(fr, en=None):
    """Champ bilingue {fr, en} attendu par le front."""
    return {"fr": fr or "", "en": en or fr or ""}
