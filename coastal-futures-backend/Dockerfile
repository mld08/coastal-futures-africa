# Coastal Futures — image backend (Flask + Gunicorn)
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    FLASK_APP=wsgi.py

WORKDIR /app

# Outils : curl pour le healthcheck ; postgresql-client pour pg_isready (optionnel).
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

# Dépendances Python d'abord (cache Docker).
COPY requirements.txt .
RUN pip install -r requirements.txt

# Code applicatif.
COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# Healthcheck : /health doit répondre 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1

# L'entrypoint attend la BD + applique les migrations, puis lance la commande.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60", \
     "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]
