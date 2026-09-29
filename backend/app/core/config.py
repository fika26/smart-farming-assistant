from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Smart Farming Assistant API"
    app_env: str = "development"
    version: str = "0.1.0"
    api_prefix: str = "/api"

    # mock | http | serial | mqtt  -> swapping this is the only change needed
    # when real ESP32 hardware is connected.
    data_source: str = "mock"
    mock_scenario: str = "drought_onset"
    mock_seed: int = 2026

    # memory | mongo | supabase
    repository: str = "memory"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "smart_farming"
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_db_url: str = ""  # postgres://... — direct connection, for asyncpg

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Extra origins matched by regex, e.g. every Vercel preview deployment:
    # CORS_ORIGIN_REGEX=https://.*\.vercel\.app  (localhost is always allowed)
    cors_origin_regex: str = ""

    # --- Authentication -------------------------------------------------------
    # JWT_SECRET must be set in production. Left empty, security.py falls back to a
    # per-process random key so no known secret is ever shipped.
    jwt_secret: str = ""
    jwt_expiry_minutes: int = 720
    jwt_remember_multiplier: int = 30
    auth_required: bool = True
    password_min_length: int = 8
    # Shared secret presented by ESP32 nodes as X-Device-Key on /api/ingest/*.
    ingest_api_key: str = ""
    # No transactional email provider is configured in this prototype.
    email_provider: str = "none"

    history_days: int = 21
    sample_interval_minutes: int = 30

    # --- AI Assistant -----------------------------------------------------------
    # Real LLM integration for the AI Assistant. Left empty, the assistant falls
    # back to the deterministic rule-based responder (flagged is_mock=true) so the
    # app still runs without a key. Set this to enable real, free-form answers.
    # openai | gemini | anthropic — picks the request/response shape in intelligence/llm.py
    ai_provider: str = "openai"
    ai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"
    ai_base_url: str = "https://api.openai.com/v1/chat/completions"

    @property
    def ai_configured(self) -> bool:
        return bool(self.ai_api_key)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def email_configured(self) -> bool:
        return self.email_provider not in ("", "none")

    @property
    def is_simulated(self) -> bool:
        return self.data_source == "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
