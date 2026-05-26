"""Pinecone에서 검색한 문맥을 바탕으로 Gemini가 답변하는 대화형 CLI."""

from __future__ import annotations

import argparse
import textwrap
from typing import List

from google import genai
from google.genai import types

from src.config import load_settings
from src.embeddings import Embedder
from src.vector_store import PineconeStore


SYSTEM_PROMPT = """당신은 사용자가 제공한 자료(컨텍스트)를 근거로 답하는 한국어 어시스턴트입니다.
규칙:
1. 컨텍스트에 명확한 근거가 있을 때만 단정해서 답하세요.
2. 컨텍스트에 없는 내용은 "제공된 자료에서 확인되지 않습니다" 라고 답하세요.
3. 답변 마지막에 사용한 컨텍스트의 source/id를 [참고] 형태로 표기하세요.
4. 가능하면 간결하게, 필요시 목록 형태로 답하세요.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Pinecone + Gemini 기반 RAG 챗 (CLI)",
    )
    parser.add_argument("--namespace", default="default", help="Pinecone namespace")
    parser.add_argument("--top-k", type=int, default=None, help="검색할 청크 개수")
    parser.add_argument(
        "--show-context",
        action="store_true",
        help="검색된 컨텍스트를 함께 출력",
    )
    parser.add_argument(
        "--once",
        type=str,
        default=None,
        help="단일 질문을 받고 종료 (대화 모드 대신)",
    )
    return parser.parse_args()


def build_context_block(matches: List[dict]) -> str:
    blocks: list[str] = []
    for i, m in enumerate(matches, start=1):
        meta = m["metadata"] or {}
        text = meta.get("text") or ""
        source = meta.get("source", "?")
        score = m.get("score", 0.0)
        blocks.append(
            f"[{i}] (id={m['id']}, source={source}, score={score:.3f})\n{text}",
        )
    return "\n\n".join(blocks)


def answer_question(
    question: str,
    embedder: Embedder,
    store: PineconeStore,
    gemini_client: genai.Client,
    chat_model: str,
    top_k: int,
    namespace: str,
    show_context: bool,
) -> str:
    query_vec = embedder.embed_query(question)
    matches = store.query(vector=query_vec, top_k=top_k, namespace=namespace)

    if not matches:
        return "벡터 DB에 검색 결과가 없습니다. 먼저 ingest.py로 데이터를 적재하세요."

    context_block = build_context_block(matches)

    if show_context:
        print("\n----- 검색된 컨텍스트 -----")
        print(context_block)
        print("---------------------------\n")

    user_prompt = textwrap.dedent(
        f"""\
        다음은 검색된 컨텍스트입니다. 이 자료만 근거로 질문에 답하세요.

        ===== 컨텍스트 =====
        {context_block}
        ====================

        질문: {question}
        """,
    )

    resp = gemini_client.models.generate_content(
        model=chat_model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
        ),
    )
    return resp.text or ""


def main() -> None:
    args = parse_args()
    settings = load_settings()
    top_k = args.top_k or settings.top_k

    gemini_client = genai.Client(api_key=settings.gemini_api_key)
    embedder = Embedder(
        gemini_client,
        model=settings.embedding_model,
        output_dim=settings.embedding_dim,
    )
    store = PineconeStore(
        api_key=settings.pinecone_api_key,
        index_name=settings.pinecone_index,
        dimension=settings.embedding_dim,
        cloud=settings.pinecone_cloud,
        region=settings.pinecone_region,
    )

    if args.once:
        answer = answer_question(
            args.once,
            embedder=embedder,
            store=store,
            gemini_client=gemini_client,
            chat_model=settings.chat_model,
            top_k=top_k,
            namespace=args.namespace,
            show_context=args.show_context,
        )
        print(answer)
        return

    print("=" * 60)
    print(f"RAG Chat (index={settings.pinecone_index}, ns={args.namespace}, top_k={top_k})")
    print(f"model: {settings.chat_model}")
    print("종료하려면 'exit' 또는 'quit' 입력. 컨텍스트 토글: ':ctx'")
    print("=" * 60)

    show_ctx = args.show_context
    while True:
        try:
            question = input("\n질문 > ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not question:
            continue
        if question.lower() in {"exit", "quit"}:
            break
        if question == ":ctx":
            show_ctx = not show_ctx
            print(f"(컨텍스트 표시: {show_ctx})")
            continue

        try:
            answer = answer_question(
                question,
                embedder=embedder,
                store=store,
                gemini_client=gemini_client,
                chat_model=settings.chat_model,
                top_k=top_k,
                namespace=args.namespace,
                show_context=show_ctx,
            )
        except Exception as e:
            print(f"[오류] {e}")
            continue

        print(f"\n답변 >\n{answer}")


if __name__ == "__main__":
    main()
