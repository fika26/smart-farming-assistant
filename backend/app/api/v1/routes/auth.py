from fastapi import APIRouter, Depends

from app.api.deps import current_user_dep, envelope
from app.core.config import settings
from app.domain.enums import DataSource
from app.schemas.auth import (AuthResponse, ForgotPasswordRequest, ForgotPasswordResponse,
                              LoginRequest, LogoutResponse, RegisterRequest, UserPublic)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=201,
             summary="Create an account and sign in")
def register(payload: RegisterRequest):
    return auth_service.register(payload)


@router.post("/login", response_model=AuthResponse, summary="Sign in")
def login(payload: LoginRequest):
    return auth_service.login(payload)


@router.post("/logout", response_model=LogoutResponse, summary="Sign out")
def logout():
    """Tokens are stateless, so signing out is a client-side discard of the access
    token. The endpoint exists so a future deployment can add a server-side denylist
    without changing the frontend."""
    return LogoutResponse(message="Signed out. Discard the access token on the client.")


@router.get("/me", response_model=UserPublic, summary="The signed-in user")
def me(user: UserPublic = Depends(current_user_dep)):
    return user


@router.post("/forgot-password", response_model=ForgotPasswordResponse,
             summary="Request a password reset")
def forgot_password(payload: ForgotPasswordRequest):
    return auth_service.forgot_password(payload.email)


@router.get("/status", summary="Which parts of auth are configured")
def status():
    return envelope(auth_service.auth_status(), DataSource.DERIVED)


@router.get("/demo-account", summary="Demo credentials for evaluation")
def demo_account():
    """Non-secret demo credentials, exposed so the product can be reviewed without
    creating an account. Remove this route before any real deployment."""
    if not settings.is_simulated:
        return envelope({"available": False}, DataSource.DERIVED)
    return envelope({
        "available": True,
        "email": auth_service.DEMO_USER["email"],
        "password": auth_service.DEMO_USER["password"],
        "note": "Demo-only account seeded by the mock data source.",
    }, DataSource.SIMULATED)
