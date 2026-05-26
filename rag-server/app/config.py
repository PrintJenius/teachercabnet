from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # rag-ingest용 CHUNK_SIZE 등은 무시
    )

    rag_server_host: str = "0.0.0.0"
    # Render는 PORT 환경변수를 주입하므로, PORT가 있으면 우선 사용.
    rag_server_port: int = Field(
        default=8001,
        validation_alias=AliasChoices("PORT", "RAG_SERVER_PORT"),
    )

    gemini_api_key: str = ""
    pinecone_api_key: str = ""
    pinecone_index: str = "teachercabinet-play"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"

    embedding_model: str = "gemini-embedding-001"
    embedding_dim: int = 768
    chat_model: str = "gemini-3.1-flash-lite"
    # 3.1-flash-lite 500 INTERNAL 시 같은 계열 preview로 재시도
    chat_model_fallback: str = "gemini-3.1-flash-lite-preview"
    chat_retry_on_server_error: int = 2

    pinecone_namespace: str = "play_data"
    top_k: int = 5
    min_reference_score: float = 0.72

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    description_max_chars: int = 280

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

settings = Settings()
