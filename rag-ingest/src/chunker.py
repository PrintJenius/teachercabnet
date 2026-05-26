"""JSON 데이터를 임베딩 가능한 문서/청크로 변환."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, List, Optional

import tiktoken


# 단일 record 텍스트화 시 사용 (여러 필드 결합)
DEFAULT_TEXT_FIELDS: tuple[str, ...] = (
    "text",
    "content",
    "body",
    "description",
    "answer",
    "question",
    "title",
)

# Pinecone metadata 값 길이 제한 (string 필드 truncate 기준, 안전마진 포함)
METADATA_VALUE_MAX_CHARS = 4000


@dataclass
class Document:
    id: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict[str, Any]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _stringify_value(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)) or value is None:
        return str(value)
    return json.dumps(value, ensure_ascii=False)


def _record_to_text(record: dict[str, Any], text_fields: Iterable[str]) -> str:
    """우선 지정된 필드를 결합하고, 없으면 모든 필드를 'key: value' 형식으로 직렬화."""
    parts: list[str] = []
    used = False
    for key in text_fields:
        if key in record and record[key] not in (None, "", [], {}):
            parts.append(f"{key}: {_stringify_value(record[key])}")
            used = True
    if used:
        return "\n".join(parts)
    return "\n".join(f"{k}: {_stringify_value(v)}" for k, v in record.items())


def ascii_safe_id(raw: str) -> str:
    """Pinecone 벡터 ID 제약(ASCII only)에 맞도록 변환.

    원본이 이미 ASCII면 그대로 반환하고, 그렇지 않으면 ASCII 문자만 남기고
    뒤에 짧은 해시를 붙여 유일성을 보장합니다.
    """
    if raw.isascii():
        return raw
    digest = hashlib.md5(raw.encode("utf-8")).hexdigest()[:10]
    ascii_only = "".join(c for c in raw if c.isascii() and not c.isspace())
    ascii_only = ascii_only.strip("-_.#:")
    if ascii_only:
        return f"{ascii_only[:60]}-{digest}"
    return f"doc-{digest}"


def _sanitize_metadata(record: dict[str, Any]) -> dict[str, Any]:
    """Pinecone 메타데이터 호환 타입 (str/number/bool/list[str])으로 변환."""
    cleaned: dict[str, Any] = {}
    for key, value in record.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            if isinstance(value, str) and len(value) > METADATA_VALUE_MAX_CHARS:
                value = value[:METADATA_VALUE_MAX_CHARS]
            cleaned[key] = value
        elif isinstance(value, list) and all(isinstance(v, str) for v in value):
            cleaned[key] = value
        else:
            serialized = json.dumps(value, ensure_ascii=False)
            if len(serialized) > METADATA_VALUE_MAX_CHARS:
                serialized = serialized[:METADATA_VALUE_MAX_CHARS]
            cleaned[key] = serialized
    return cleaned


def json_to_documents(
    data: Any,
    source: str,
    text_fields: Iterable[str] = DEFAULT_TEXT_FIELDS,
) -> List[Document]:
    """JSON 구조를 Document 리스트로 변환.

    - list[dict]: 각 dict가 하나의 Document
    - list[str]:  각 문자열이 Document
    - dict:       단일 Document

    `source` 는 ID prefix 로 ASCII 변환되어 사용되고, 원본 문자열은
    metadata 의 `source` 필드에 그대로 보존됩니다.
    """
    docs: List[Document] = []
    safe_source = ascii_safe_id(source)
    original_source = source

    if isinstance(data, list):
        for idx, item in enumerate(data):
            doc_id = f"{safe_source}#{idx}"
            if isinstance(item, dict):
                explicit_id = item.get("id") or item.get("_id")
                if explicit_id is not None:
                    doc_id = f"{safe_source}#{ascii_safe_id(str(explicit_id))}"
                text = _record_to_text(item, text_fields)
                meta = _sanitize_metadata(item)
            else:
                text = _stringify_value(item)
                meta = {}
            meta.setdefault("source", original_source)
            docs.append(Document(id=doc_id, text=text, metadata=meta))
    elif isinstance(data, dict):
        explicit_id = data.get("id") or data.get("_id") or "0"
        text = _record_to_text(data, text_fields)
        meta = _sanitize_metadata(data)
        meta.setdefault("source", original_source)
        docs.append(
            Document(
                id=f"{safe_source}#{ascii_safe_id(str(explicit_id))}",
                text=text,
                metadata=meta,
            ),
        )
    else:
        docs.append(
            Document(
                id=f"{safe_source}#0",
                text=_stringify_value(data),
                metadata={"source": original_source},
            ),
        )

    return docs


_ENCODER: Optional["tiktoken.Encoding"] = None


def _get_encoder() -> "tiktoken.Encoding":
    global _ENCODER
    if _ENCODER is None:
        # 임베딩 모델은 cl100k_base 토크나이저를 공유
        _ENCODER = tiktoken.get_encoding("cl100k_base")
    return _ENCODER


def chunk_document(doc: Document, chunk_size: int, overlap: int) -> List[Chunk]:
    """토큰 기준으로 문서를 슬라이딩 윈도우 청크로 분할."""
    if chunk_size <= 0:
        return [Chunk(id=doc.id, text=doc.text, metadata=dict(doc.metadata))]

    enc = _get_encoder()
    tokens = enc.encode(doc.text)
    if len(tokens) <= chunk_size:
        return [Chunk(id=doc.id, text=doc.text, metadata=dict(doc.metadata))]

    step = max(chunk_size - overlap, 1)
    chunks: List[Chunk] = []
    for i, start in enumerate(range(0, len(tokens), step)):
        token_slice = tokens[start : start + chunk_size]
        if not token_slice:
            break
        text = enc.decode(token_slice)
        meta = dict(doc.metadata)
        meta["chunk_index"] = i
        meta["parent_id"] = doc.id
        meta["text"] = text  # 검색 결과 표시용
        chunks.append(Chunk(id=f"{doc.id}::chunk-{i}", text=text, metadata=meta))
        if start + chunk_size >= len(tokens):
            break
    return chunks


def documents_to_chunks(
    docs: Iterable[Document],
    chunk_size: int,
    overlap: int,
) -> List[Chunk]:
    chunks: List[Chunk] = []
    for doc in docs:
        sub_chunks = chunk_document(doc, chunk_size=chunk_size, overlap=overlap)
        # 단일 청크 케이스에서도 검색 표시용 text 메타데이터 보장
        for c in sub_chunks:
            c.metadata.setdefault("text", c.text)
        chunks.extend(sub_chunks)
    return chunks
