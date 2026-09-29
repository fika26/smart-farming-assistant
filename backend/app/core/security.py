"""Password hashing and JWT issuing.

Passwords are stored only as bcrypt hashes — nothing in this codebase can read a
user's password back. The signing secret comes from the environment; the development
fallback is generated per-process so a deployment that forgets to set JWT_SECRET
invalidates its own tokens on restart rather than shipping a known key.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings
from app.core.errors import DomainError
from app.core.time import now

ALGORITHM = "HS256"
_EPHEMERAL_SECRET = secrets.token_urlsafe(48)


def signing_secret() -> str:
    if settings.jwt_secret:
        return settings.jwt_secret
    # No secret configured: use a per-process key so tokens never outlive a restart.
    return _EPHEMERAL_SECRET


def secret_is_configured() -> bool:
    return bool(settings.jwt_secret)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str, email: str, remember: bool = False) -> tuple[str, int]:
    minutes = settings.jwt_expiry_minutes * (settings.jwt_remember_multiplier if remember else 1)
    expires_at = now() + timedelta(minutes=minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now().timestamp()),
        "exp": int(expires_at.timestamp()),
        "iss": "smart-farming-assistant",
    }
    return jwt.encode(payload, signing_secret(), algorithm=ALGORITHM), minutes * 60


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, signing_secret(), algorithms=[ALGORITHM],
                          issuer="smart-farming-assistant")
    except jwt.ExpiredSignatureError as exc:
        raise DomainError("Your session has expired. Please sign in again.", 401,
                          "token_expired") from exc
    except jwt.InvalidTokenError as exc:
        raise DomainError("Your session is not valid. Please sign in again.", 401,
                          "invalid_token") from exc


def make_reset_token() -> str:
    return secrets.token_urlsafe(32)


def utc_now() -> datetime:
    return now()
