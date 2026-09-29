"""Authentication service.

Registration, sign-in, session inspection and password-reset requests. All password
comparison goes through bcrypt; failures return one generic message so the API never
reveals whether an email exists.
"""
from __future__ import annotations

from datetime import timedelta
from functools import lru_cache

from app.core.config import settings
from app.core.errors import DomainError
from app.core.security import (create_access_token, decode_access_token, hash_password,
                               make_reset_token, secret_is_configured, verify_password)
from app.core.time import now
from app.domain.catalog import FARM
from app.repositories.users import InMemoryUserRepository, UserRepository, make_user_id
from app.schemas.auth import (AuthResponse, ForgotPasswordResponse, LoginRequest,
                              RegisterRequest, UserPublic)

GENERIC_CREDENTIALS_ERROR = "Email or password is incorrect. Please try again."

DEMO_USER = {
    "full_name": "Ravi Kumar",
    "email": "demo@sunehrakhet.in",
    "password": "farming2026",
    "farm_name": FARM["name"],
    "location": FARM["location"],
}


@lru_cache
def get_user_repository() -> UserRepository:
    """Swap for MongoUserRepository once REPOSITORY=mongo is enabled."""
    repo = InMemoryUserRepository()
    _seed_demo_user(repo)
    return repo


def _seed_demo_user(repo: UserRepository) -> None:
    """A single known account so the product can be demonstrated without sign-up.
    Credentials are non-secret demo values and are printed by GET /api/auth/demo-account."""
    if repo.by_email(DEMO_USER["email"]):
        return
    repo.create({
        "id": make_user_id(DEMO_USER["email"]),
        "full_name": DEMO_USER["full_name"],
        "email": DEMO_USER["email"],
        "password_hash": hash_password(DEMO_USER["password"]),
        "farm_name": DEMO_USER["farm_name"],
        "location": DEMO_USER["location"],
        "role": "operator",
        "created_at": now(),
    })


def _public(user: dict) -> UserPublic:
    return UserPublic(
        id=user["id"], full_name=user["full_name"], email=user["email"],
        farm_name=user["farm_name"], location=user.get("location"),
        role=user.get("role", "operator"), created_at=user["created_at"],
    )


def _issue(user: dict, remember: bool = False) -> AuthResponse:
    token, expires_in = create_access_token(user["id"], user["email"], remember)
    return AuthResponse(access_token=token, expires_in=expires_in, user=_public(user))


def register(payload: RegisterRequest) -> AuthResponse:
    repo = get_user_repository()
    email = payload.email.strip().lower()
    if repo.by_email(email):
        raise DomainError("An account already exists for this email address.", 409,
                          "email_taken")
    if len(payload.password) < settings.password_min_length:
        raise DomainError(
            f"Password must be at least {settings.password_min_length} characters.", 422,
            "weak_password")

    user = repo.create({
        "id": make_user_id(email),
        "full_name": payload.full_name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "farm_name": payload.farm_name.strip(),
        "location": (payload.location or "").strip() or None,
        "role": "operator",
        "created_at": now(),
    })
    return _issue(user)


def login(payload: LoginRequest) -> AuthResponse:
    repo = get_user_repository()
    user = repo.by_email(payload.email)
    # Always run a comparison so a missing account and a wrong password cost the same.
    hashed = user["password_hash"] if user else hash_password("not-a-real-password")
    if not verify_password(payload.password, hashed) or not user:
        raise DomainError(GENERIC_CREDENTIALS_ERROR, 401, "invalid_credentials")
    return _issue(user, payload.remember)


def current_user(token: str) -> UserPublic:
    claims = decode_access_token(token)
    user = get_user_repository().by_id(str(claims.get("sub")))
    if not user:
        raise DomainError("Your session is no longer valid. Please sign in again.", 401,
                          "unknown_user")
    return _public(user)


def forgot_password(email: str) -> ForgotPasswordResponse:
    repo = get_user_repository()
    user = repo.by_email(email)
    token = None
    if user:
        token = make_reset_token()
        repo.set_reset_token(user["id"], token, now() + timedelta(hours=1))

    if settings.email_configured:
        return ForgotPasswordResponse(
            message="If that email is registered, a reset link is on its way.",
            email_delivery_configured=True, prototype_reset_token=None)

    # No mail provider is wired up — say so rather than claiming an email was sent.
    return ForgotPasswordResponse(
        message=("No email service is connected in this prototype, so no message was sent. "
                 "The reset token below is what a real deployment would email as a link."),
        email_delivery_configured=False, prototype_reset_token=token)


def auth_status() -> dict:
    return {
        "auth_required": settings.auth_required,
        "jwt_secret_configured": secret_is_configured(),
        "email_delivery_configured": settings.email_configured,
        "token_lifetime_minutes": settings.jwt_expiry_minutes,
        "user_store": "memory",
    }
