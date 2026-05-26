"""환경 변수 및 모델/인덱스 설정을 한 곳에서 관리."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str
    pinecone_api_key: str
    pinecone_index: str
    pinecone_cloud: str
    pinecone_region: str
    embedding_model: str
    embedding_dim: int
    chat_model: str
    top_k: int
    chunk_size: int
    chunk_overlap: int


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"환경변수 {name} 가 설정되지 않았습니다. .env 파일을 확인하세요.",
        )
    return value


def load_settings() -> Settings:
    return Settings(
        gemini_api_key=_require("GEMINI_API_KEY"),
        pinecone_api_key=_require("PINECONE_API_KEY"),
        pinecone_index=os.getenv("PINECONE_INDEX", "teachercabinet-play"),
        pinecone_cloud=os.getenv("PINECONE_CLOUD", "aws"),
        pinecone_region=os.getenv("PINECONE_REGION", "us-east-1"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "gemini-embedding-001"),
        embedding_dim=int(os.getenv("EMBEDDING_DIM", "768")),
        chat_model=os.getenv("CHAT_MODEL", "gemini-3.1-flash-lite-preview"),
        top_k=int(os.getenv("TOP_K", "5")),
        chunk_size=int(os.getenv("CHUNK_SIZE", "800")),
        chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "100")),
    )
