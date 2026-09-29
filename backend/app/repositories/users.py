"""User storage.

`InMemoryUserRepository` today; the Mongo implementation drops in behind the same
interface (collection `users`, unique index on `email`). Only bcrypt hashes are kept —
`password_hash` never leaves this layer.
"""
from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from datetime import datetime

from app.core.time import now


class UserRepository(ABC):
    @abstractmethod
    def by_email(self, email: str) -> dict | None: ...

    @abstractmethod
    def by_id(self, user_id: str) -> dict | None: ...

    @abstractmethod
    def create(self, user: dict) -> dict: ...

    @abstractmethod
    def set_reset_token(self, user_id: str, token: str, expires_at: datetime) -> None: ...


def make_user_id(email: str) -> str:
    return "usr-" + hashlib.sha1(email.lower().encode()).hexdigest()[:12]


class InMemoryUserRepository(UserRepository):
    def __init__(self) -> None:
        self._by_id: dict[str, dict] = {}
        self._email_index: dict[str, str] = {}

    def by_email(self, email: str) -> dict | None:
        user_id = self._email_index.get(email.strip().lower())
        return self._by_id.get(user_id) if user_id else None

    def by_id(self, user_id: str) -> dict | None:
        return self._by_id.get(user_id)

    def create(self, user: dict) -> dict:
        user.setdefault("created_at", now())
        self._by_id[user["id"]] = user
        self._email_index[user["email"].lower()] = user["id"]
        return user

    def set_reset_token(self, user_id: str, token: str, expires_at: datetime) -> None:
        user = self._by_id.get(user_id)
        if user:
            user["reset_token"] = token
            user["reset_token_expires_at"] = expires_at

    def count(self) -> int:
        return len(self._by_id)
