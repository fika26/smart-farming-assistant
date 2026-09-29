from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    farm_name: str = Field(min_length=2, max_length=80)
    location: str | None = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    remember: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    email_delivery_configured: bool
    # Prototype only: surfaced because no mail provider is wired up. Never returned
    # once EMAIL_PROVIDER is configured.
    prototype_reset_token: str | None = None


class UserPublic(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    farm_name: str
    location: str | None = None
    role: str = "operator"
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class LogoutResponse(BaseModel):
    message: str
