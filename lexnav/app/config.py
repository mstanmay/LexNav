"""
LexNav application configuration.

All settings loaded from environment variables (or .env file).
No secrets in code — ever.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Google Gemini & Cloud Configuration
    gemini_api_key: str = Field(default="", description="Google Gemini API key (GEMINI_API_KEY)")
    gemini_model: str = Field(default="gemini-2.5-flash", description="Gemini primary reasoning model")
    gemini_embedding_model: str = Field(default="models/text-embedding-004", description="Gemini embedding model")
    google_cloud_project: str = Field(default="", description="Google Cloud Project ID")
    gcs_bucket_name: str = Field(default="lexnav-ephemeral-docs", description="Ephemeral GCS bucket name")
    google_application_credentials: str = Field(default="", description="Path to GCP service account JSON")

    # LLM Compatibility Fallbacks
    llm_api_key: str = Field(default="", description="API key fallback")
    llm_base_url: str = Field(default="", description="API base URL fallback")
    llm_model: str = Field(default="gemini-2.5-flash", description="Chat model fallback")
    llm_embedding_model: str = Field(default="models/text-embedding-004", description="Embedding model fallback")

    # Server
    host: str = Field(default="0.0.0.0", description="Server bind host")
    port: int = Field(default=8080, description="Server bind port")
    log_level: str = Field(default="info", description="Logging level")

    # Session
    session_ttl_seconds: int = Field(default=3600, description="Session TTL in seconds")
    session_reaper_interval_seconds: int = Field(default=60, description="Session reaper interval")

    # Rate Limiting
    rate_limit_per_minute: int = Field(default=500, description="General rate limit per session")
    analyze_rate_limit_per_minute: int = Field(default=200, description="Analyze endpoint rate limit")
    max_concurrent_sessions_per_ip: int = Field(default=50, description="Max sessions per IP")

    # CORS
    cors_origins: str = Field(default="*", description="Comma-separated CORS origins")

    # Pipeline limits
    max_file_size_bytes: int = Field(default=10 * 1024 * 1024, description="10 MB per file")
    max_session_total_bytes: int = Field(default=30 * 1024 * 1024, description="30 MB per session")
    max_docs_per_session: int = Field(default=5, description="Max documents per session")
    max_query_length: int = Field(default=2000, description="Max user query length")

    # LLM Budget
    max_llm_calls_per_action: int = Field(default=5, description="Max LLM calls per analyze action")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# Singleton — import this everywhere
settings = Settings()
