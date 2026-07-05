"""Point d'entrée WSGI (dev : `flask run` ; prod : `gunicorn wsgi:app`)."""
import os

from dotenv import load_dotenv

load_dotenv()  # charge .env avant de lire la config

from app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5000)), debug=True)
