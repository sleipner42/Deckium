from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    
    # OAuth2 settings
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    SECRET_KEY: str = "development_secret_key"  # For state param in OAuth
    REDIRECT_URL: Optional[str] = "http://localhost:8000/api/v1/auth/callback"
    FRONTEND_URL: Optional[str] = "http://localhost:3000"
    
    # JWT settings
    JWT_SECRET_KEY: str = "development_jwt_secret_key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    class Config:
        env_file = ".env"


settings = Settings() 