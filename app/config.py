from pydantic_settings import BaseSettings
from functools import lru_cache
from pydantic import model_validator

class Settings(BaseSettings):
    # Database
    database_url: str

    @model_validator(mode='after')
    def fix_database_url(self):
        if self.database_url:
            if self.database_url.startswith("postgres://"):
                self.database_url = self.database_url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif self.database_url.startswith("postgresql://"):
                self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_public_key: str = ""
    supabase_service_key: str = ""
    
    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Hold / Credit
    hold_expiry_minutes: int = 15
    travel_credit_expiry_days: int = 365
    
    # Email
    email_provider: str = "smtp"  # smtp or gmail_api
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    gmail_service_account_file: str = ""
    gmail_sender_email: str = ""
    
    # App
    environment: str = "development"
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
