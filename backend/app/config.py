from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://sim_user:sim_pass@localhost:5432/missile_sim"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000


settings = Settings()
