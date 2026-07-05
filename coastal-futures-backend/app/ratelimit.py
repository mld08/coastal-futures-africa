"""Limitation de débit simple, en mémoire (anti-bruteforce sur /auth/*).

Fenêtre glissante par (IP, endpoint). Suffisant pour un serveur unique ; en
prod multi-instances, remplacer par un backend partagé (Redis / Flask-Limiter).
"""
import time
from collections import defaultdict
from functools import wraps

from flask import request, jsonify

_hits = defaultdict(list)  # clé -> [timestamps]


def rate_limit(max_calls, per_seconds):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = f"{request.remote_addr or '?'}:{request.endpoint}"
            now = time.monotonic()
            window = _hits[key]
            # purge des appels hors fenêtre
            cutoff = now - per_seconds
            while window and window[0] < cutoff:
                window.pop(0)
            if len(window) >= max_calls:
                retry = int(per_seconds - (now - window[0])) + 1
                resp = jsonify(error="RATE_LIMITED",
                               message="Trop de tentatives. Réessayez plus tard.")
                resp.status_code = 429
                resp.headers["Retry-After"] = str(max(1, retry))
                return resp
            window.append(now)
            return fn(*args, **kwargs)
        return wrapper
    return decorator
