"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://nelb:nelb_dev_password@localhost:5432/nelb"

    # Azure AI Foundry
    azure_ai_foundry_endpoint: str = ""
    azure_ai_foundry_api_key: str = ""
    azure_ai_foundry_deployment: str = "gpt-4o"

    # Azure Maps
    azure_maps_key: str = ""

    # Supabase Auth
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    # App config
    app_env: str = "development"
    default_radius_km: float = 5.0
    fairness_threshold_jobs: int = 3
    fairness_window_days: int = 7
    max_recommendations: int = 5

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
