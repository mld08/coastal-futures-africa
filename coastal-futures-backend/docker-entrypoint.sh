#!/bin/sh
# Démarrage du backend : attendre PostgreSQL, appliquer les migrations, puis
# lancer la commande (gunicorn). Seed uniquement si SEED_ON_START=true.
set -e

echo "→ Attente de la base de données…"
python - <<'PY'
import os, sys, time
from sqlalchemy import create_engine, text
url = os.environ["DATABASE_URL"]
for attempt in range(1, 31):
    try:
        create_engine(url).connect().execute(text("SELECT 1"))
        print("  base de données prête.")
        break
    except Exception as exc:
        print(f"  tentative {attempt}/30 — base indisponible ({exc.__class__.__name__})…")
        time.sleep(2)
else:
    sys.exit("Base de données injoignable — abandon.")
PY

echo "→ Application des migrations (flask db upgrade)…"
flask db upgrade

if [ "$SEED_ON_START" = "true" ]; then
  echo "→ Amorçage des données de démonstration (flask seed)…"
  flask seed || true
fi

echo "→ Lancement : $*"
exec "$@"
