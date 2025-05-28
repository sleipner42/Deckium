from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "/app/data/app.db"

    # OAuth2 settings
    GOOGLE_CLIENT_ID: str = ""  # Will be overridden from .env
    GOOGLE_CLIENT_SECRET: str = ""  # Will be overridden from .env
    SECRET_KEY: str = "development_secret_key"  # For state param in OAuth
    REDIRECT_URL: str = "http://localhost:8000/auth/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    # JWT settings
    JWT_SECRET_KEY: str = "development_jwt_secret_key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 365  # 1 year

    # Azure OpenAI settings
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4.1-mini"
    AZURE_OPENAI_API_VERSION: str = "2024-10-21"
    
    # Pexels API settings
    PEXELS_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
