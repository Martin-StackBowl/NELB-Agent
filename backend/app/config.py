"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://nelb:nelb_dev_password@localhost:5432/nelb"

    # Azure AI Foundry
    azure_ai_foundry_endpoint: str = ""
    azure_ai_foundry_api_key: str = ""
    azure_ai_foundry_deployment: str = "o4-mini"  # Reasoning model for agent
    azure_ai_foundry_deployment_chat: str = "gpt-4o-mini"  # Chat model for knowledge base
    azure_ai_foundry_api_version: str = "2025-04-01-preview"

    # Azure AI Search (Foundry IQ knowledge base)
    azure_search_endpoint: str = ""
    azure_search_key: str = ""
    azure_search_knowledge_base: str = "nelb-work-guides"

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
        extra = "ignore"  # tolerate stale/extra keys in .env without crashing


settings = Settings()
