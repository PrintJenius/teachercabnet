from __future__ import annotations

import logging
import re
import textwrap
import time
from functools import lru_cache
from typing import Any

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

logger = logging.getLogger(__name__)

from app.config import settings
from app.core.embeddings import Embedder
from app.core.vector_store import PineconeStore
from app.schemas import AskResponse, ReferenceCard

SYSTEM_PROMPT = """당신은 i누리 유아 놀이·수업 자료 검색을 돕는 한국어 어시스턴트입니다.
규칙:
1. 검색된 자료(놀이 활동, 준비물, 실행 단계)에 근거가 있을 때만 추천하세요.
2. 질문과 무관하거나 자료에 없으면 반드시 "제공된 자료에서 확인되지 않습니다." 한 문장만 답하세요. 추측하지 마세요.
3. 놀이·활동 중심으로 간결하게 답하세요.
4. 나이·연령으로 자료를 거르거나 추천하지 마세요.
5. 마크다운 기호를 쓰지 마세요. **, #, - 목록 기호 대신 일반 문장·번호(1. 2.)만 사용하세요.
6. 답변 항목 개수는 아래 [자료 N] 개수와 같게 하세요. 같은 자료를 두 항목으로 나누지 마세요. 자료에 없는 놀이를 지어내지 마세요.
"""

NOT_FOUND_MARKERS = (
    "제공된 자료에서 확인되지 않습니다",
    "관련 자료를 찾지 못했습니다",
    "관련 놀이 자료를 찾지 못했습니다",
)


@lru_cache
def _gemini_client() -> genai.Client:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY가 설정되지 않았습니다.")
    return genai.Client(api_key=settings.gemini_api_key)


@lru_cache
def _embedder() -> Embedder:
    return Embedder(
        _gemini_client(),
        model=settings.embedding_model,
        output_dim=settings.embedding_dim,
    )


@lru_cache
def _store() -> PineconeStore:
    if not settings.pinecone_api_key:
        raise RuntimeError("PINECONE_API_KEY가 설정되지 않았습니다.")
    return PineconeStore(
        api_key=settings.pinecone_api_key,
        index_name=settings.pinecone_index,
        dimension=settings.embedding_dim,
        cloud=settings.pinecone_cloud,
        region=settings.pinecone_region,
    )


def _truncate(text: str, max_chars: int) -> str:
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def _pick_description(meta: dict[str, Any]) -> str:
    for key in ("content", "text", "answer", "body", "description"):
        val = meta.get(key)
        if isinstance(val, str) and val.strip():
            # text 필드에 topic+content가 합쳐진 경우 content만 추출 시도
            if key == "text" and "content:" in val:
                parts = val.split("content:", 1)
                if len(parts) > 1:
                    return parts[1].strip()
            return val.strip()
    return ""


def _pick_title(meta: dict[str, Any]) -> str:
    for key in ("topic", "title", "source"):
        val = meta.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return "제목 없음"


def _pick_url(meta: dict[str, Any]) -> str | None:
    url = meta.get("url")
    if isinstance(url, str) and url.strip():
        return url.strip()
    return None


def _pick_page(meta: dict[str, Any]) -> int | None:
    page = meta.get("page")
    if isinstance(page, bool):
        return None
    parsed: int | None = None
    if isinstance(page, int):
        parsed = page
    elif isinstance(page, float) and page == int(page):
        parsed = int(page)
    elif isinstance(page, str) and page.strip().isdigit():
        parsed = int(page.strip())
    if parsed is not None and parsed > 0:
        return parsed
    return None


def _dedupe_key(meta: dict[str, Any]) -> str:
    url = _pick_url(meta)
    page = _pick_page(meta)
    if url:
        if page is not None:
            return f"url:{url}|page:{page}"
        return f"url:{url}"
    title = _pick_title(meta)
    if page is not None:
        return f"doc:{title}|page:{page}|{_pick_description(meta)[:80]}"
    return f"doc:{title}|{_pick_description(meta)[:80]}"


def _filter_matches_by_score(
    matches: list[dict[str, Any]],
    min_score: float | None = None,
) -> list[dict[str, Any]]:
    threshold = min_score if min_score is not None else settings.min_reference_score
    return [m for m in matches if (m.get("score") or 0.0) >= threshold]


def _group_matches(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """청크 여러 개가 같은 문서(URL)면 1건으로 묶어, 카드·컨텍스트 번호를 맞춘다."""
    best: dict[str, dict[str, Any]] = {}
    order: list[str] = []

    for m in matches:
        meta = m.get("metadata") or {}
        key = _dedupe_key(meta)
        if key not in best:
            order.append(key)
            best[key] = m
            continue
        if (m.get("score") or 0.0) > (best[key].get("score") or 0.0):
            best[key] = m

    return [best[k] for k in order]


def _answer_indicates_no_material(answer: str) -> bool:
    text = (answer or "").strip()
    return any(marker in text for marker in NOT_FOUND_MARKERS)


def _extract_answer_text(resp: Any) -> str:
    """Gemini 응답에서 텍스트 추출 (차단·빈 응답 시 빈 문자열)."""
    text = getattr(resp, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()
    candidates = getattr(resp, "candidates", None) or []
    parts: list[str] = []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if content is None:
            continue
        for part in getattr(content, "parts", None) or []:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                parts.append(part_text.strip())
    return "\n".join(parts).strip()


def _plain_text_answer(answer: str) -> str:
    """UI에 ** 같은 마크다운 원문이 보이지 않도록 정리."""
    text = (answer or "").strip()
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = text.replace("**", "")
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text.strip()


def matches_to_cards(
    matches: list[dict[str, Any]],
    description_max_chars: int | None = None,
) -> list[ReferenceCard]:
    max_chars = description_max_chars or settings.description_max_chars
    seen: set[str] = set()
    cards: list[ReferenceCard] = []

    for m in matches:
        meta = m.get("metadata") or {}
        key = _dedupe_key(meta)
        if key in seen:
            continue
        seen.add(key)

        description = _truncate(_pick_description(meta), max_chars)
        if not description:
            description = _truncate(str(meta.get("text") or ""), max_chars)

        cards.append(
            ReferenceCard(
                title=_pick_title(meta),
                description=description or "(설명 없음)",
                url=_pick_url(meta),
                score=m.get("score"),
                source=meta.get("source") if isinstance(meta.get("source"), str) else None,
                topic=meta.get("topic") if isinstance(meta.get("topic"), str) else None,
                domain=meta.get("domain") if isinstance(meta.get("domain"), str) else None,
                data_type=meta.get("data_type") if isinstance(meta.get("data_type"), str) else None,
                page=_pick_page(meta),
            ),
        )
    return cards


def _generate_chat_answer(user_prompt: str) -> str:
    """Gemini 답변 생성. 주 모델 실패 시 fallback 모델로 재시도."""
    primary = (settings.chat_model or "").strip()
    fallback = (settings.chat_model_fallback or "").strip()
    models: list[str] = []
    for name in (primary, fallback):
        if name and name not in models:
            models.append(name)
    if not models:
        raise RuntimeError("CHAT_MODEL이 설정되지 않았습니다.")

    client = _gemini_client()
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.2,
    )
    last_error: Exception | None = None
    max_retries = max(0, settings.chat_retry_on_server_error)

    for model in models:
        for attempt in range(max_retries + 1):
            try:
                resp = client.models.generate_content(
                    model=model,
                    contents=user_prompt,
                    config=config,
                )
                text = _plain_text_answer(_extract_answer_text(resp))
                if text:
                    return text
                logger.warning("Gemini empty text model=%s", model)
                last_error = RuntimeError("Gemini가 빈 답변을 반환했습니다.")
                break
            except genai_errors.ServerError as e:
                last_error = e
                logger.warning(
                    "Gemini ServerError model=%s attempt=%s: %s",
                    model,
                    attempt + 1,
                    e,
                )
                if attempt < max_retries:
                    time.sleep(0.8 * (attempt + 1))
                    continue
                break
            except genai_errors.ClientError as e:
                last_error = e
                logger.warning("Gemini ClientError model=%s: %s", model, e)
                break
            except Exception as e:
                last_error = e
                logger.warning("Gemini error model=%s: %s", model, e)
                break

    detail = str(last_error) if last_error else "unknown"
    raise RuntimeError(
        f"Gemini 답변 생성 실패 (시도한 모델: {', '.join(models)}). {detail}"
    ) from last_error


def _build_context_block(matches: list[dict[str, Any]]) -> str:
    blocks: list[str] = []
    for i, m in enumerate(matches, start=1):
        meta = m.get("metadata") or {}
        text = _pick_description(meta) or meta.get("text") or ""
        title = _pick_title(meta)
        page = _pick_page(meta)
        page_hint = f" (p.{page})" if page is not None else ""
        blocks.append(f"[자료 {i}] {title}{page_hint}\n{text}")
    return "\n\n".join(blocks)


def search(
    query: str,
    namespace: str | None = None,
    top_k: int | None = None,
) -> list[ReferenceCard]:
    ns = namespace or settings.pinecone_namespace
    k = top_k or settings.top_k
    vec = _embedder().embed_query(query)
    matches = _store().query(vector=vec, top_k=k, namespace=ns)
    matches = _filter_matches_by_score(matches)
    grouped = _group_matches(matches)
    return matches_to_cards(grouped)


def ask(
    question: str,
    namespace: str | None = None,
    top_k: int | None = None,
    include_answer: bool = True,
) -> AskResponse:
    ns = namespace or settings.pinecone_namespace
    k = top_k or settings.top_k
    vec = _embedder().embed_query(question)
    matches = _store().query(vector=vec, top_k=k, namespace=ns)
    matches = _filter_matches_by_score(matches)
    grouped = _group_matches(matches)
    references = matches_to_cards(grouped)

    if not references:
        return AskResponse(
            answer="관련 놀이 자료를 찾지 못했습니다. 다른 키워드로 질문해 보세요."
            if include_answer
            else None,
            references=[],
        )

    if not include_answer:
        return AskResponse(answer=None, references=references)

    n_refs = len(grouped)
    context_block = _build_context_block(grouped)
    user_prompt = textwrap.dedent(
        f"""\
        아래는 검색된 놀이·수업 자료 {n_refs}건입니다. [자료 1]~[자료 {n_refs}] 각각 1개 놀이만 소개하세요.
        답변도 {n_refs}개 항목(1. 2. …)으로 맞추고, 같은 자료를 두 번 쓰지 마세요.
        질문과 무관하거나 자료에 없으면 "제공된 자료에서 확인되지 않습니다."만 출력하세요.

        ===== 자료 =====
        {context_block}
        ================

        질문: {question}
        """,
    )

    answer = _generate_chat_answer(user_prompt)

    if _answer_indicates_no_material(answer):
        return AskResponse(answer=answer, references=[])

    return AskResponse(answer=answer, references=references)
