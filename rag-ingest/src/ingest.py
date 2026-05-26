"""JSON 파일(또는 폴더)을 읽어 청크 → 임베딩 → Pinecone 업서트를 수행하는 CLI."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import List

from google import genai
from tqdm import tqdm

from src.chunker import (
    Chunk,
    documents_to_chunks,
    json_to_documents,
    load_json,
)
from src.config import load_settings
from src.embeddings import Embedder
from src.vector_store import PineconeStore


# 폴더를 넘겼을 때 자동으로 처리할 확장자
SUPPORTED_EXTS = {".json", ".txt"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="JSON 파일/폴더를 Pinecone 벡터 DB에 적재합니다.",
    )
    parser.add_argument(
        "json_path",
        type=Path,
        help=(
            "적재할 JSON 파일 경로 또는 폴더 경로. "
            "폴더면 안의 .json/.txt 파일을 모두 처리합니다."
        ),
    )
    parser.add_argument(
        "--namespace",
        default="default",
        help="Pinecone namespace (기본: default)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="해당 namespace의 기존 데이터를 모두 삭제 후 적재",
    )
    parser.add_argument(
        "--text-field",
        action="append",
        default=None,
        help="우선 사용할 텍스트 필드명. 여러 번 지정 가능. 미지정시 기본값 사용",
    )
    parser.add_argument(
        "--ext",
        action="append",
        default=None,
        help=(
            "폴더 모드일 때 처리할 확장자 (예: --ext .txt). "
            "여러 번 지정 가능. 기본: .json, .txt"
        ),
    )
    return parser.parse_args()


def collect_files(path: Path, exts: set[str]) -> List[Path]:
    if path.is_file():
        return [path]
    if path.is_dir():
        files = sorted(
            p for p in path.iterdir() if p.is_file() and p.suffix.lower() in exts
        )
        return files
    raise FileNotFoundError(f"경로를 찾을 수 없습니다: {path}")


def main() -> None:
    args = parse_args()
    settings = load_settings()

    if not args.json_path.exists():
        raise FileNotFoundError(f"파일/폴더를 찾을 수 없습니다: {args.json_path}")

    exts = {e.lower() if e.startswith(".") else f".{e.lower()}" for e in (args.ext or [])}
    if not exts:
        exts = set(SUPPORTED_EXTS)

    files = collect_files(args.json_path, exts)
    if not files:
        print(f"처리할 파일이 없습니다. (대상: {args.json_path}, 확장자: {sorted(exts)})")
        return

    print(f"[1/4] 대상 파일 {len(files)}개")
    for f in files:
        print(f"  - {f}")

    text_fields = tuple(args.text_field) if args.text_field else None

    all_chunks: List[Chunk] = []
    skipped: list[tuple[Path, str]] = []

    for f in files:
        try:
            data = load_json(f)
        except Exception as e:
            skipped.append((f, f"JSON 파싱 실패: {e}"))
            continue

        docs = (
            json_to_documents(data, source=f.stem, text_fields=text_fields)
            if text_fields
            else json_to_documents(data, source=f.stem)
        )
        sub_chunks = documents_to_chunks(
            docs,
            chunk_size=settings.chunk_size,
            overlap=settings.chunk_overlap,
        )
        print(f"  [{f.name}] 문서 {len(docs)}개 → 청크 {len(sub_chunks)}개")
        all_chunks.extend(sub_chunks)

    if skipped:
        print("[skip]")
        for path, reason in skipped:
            print(f"  - {path.name}: {reason}")

    print(
        f"[2/4] 전체 청크 {len(all_chunks)}개 "
        f"(chunk_size={settings.chunk_size}, overlap={settings.chunk_overlap})",
    )
    if not all_chunks:
        print("청크가 없어 종료합니다.")
        return

    gemini_client = genai.Client(api_key=settings.gemini_api_key)
    embedder = Embedder(
        gemini_client,
        model=settings.embedding_model,
        output_dim=settings.embedding_dim,
    )

    print(
        f"[3/4] 임베딩 생성 (model={settings.embedding_model}, dim={settings.embedding_dim})",
    )
    texts = [c.text for c in all_chunks]
    vectors: list[list[float]] = []
    batch = 32
    for start in tqdm(range(0, len(texts), batch), desc="embedding"):
        vectors.extend(embedder.embed_documents(texts[start : start + batch]))

    store = PineconeStore(
        api_key=settings.pinecone_api_key,
        index_name=settings.pinecone_index,
        dimension=settings.embedding_dim,
        cloud=settings.pinecone_cloud,
        region=settings.pinecone_region,
    )

    if args.reset:
        print(f"[reset] namespace='{args.namespace}' 기존 데이터 삭제")
        try:
            store.delete_namespace(args.namespace)
        except Exception as e:  # 비어 있으면 404 가능
            print(f"  (무시) {e}")

    print(f"[4/4] Pinecone 업서트 (index={settings.pinecone_index}, ns={args.namespace})")
    payload = [
        {"id": c.id, "values": v, "metadata": c.metadata}
        for c, v in zip(all_chunks, vectors)
    ]
    n = store.upsert(payload, namespace=args.namespace)
    print(f"  - {n}개 벡터 업서트 완료")

    print("[stats]", store.stats())


if __name__ == "__main__":
    main()
