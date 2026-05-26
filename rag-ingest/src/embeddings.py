"""Gemini 임베딩 호출 래퍼.

- 문서 적재 시: task_type="RETRIEVAL_DOCUMENT"
- 검색 질의 시: task_type="RETRIEVAL_QUERY"

`output_dimensionality` 가 모델 기본(3072)보다 작으면 결과 벡터를
L2 정규화해야 cosine 유사도가 의도대로 동작합니다.
"""

from __future__ import annotations

import math
from collections.abc import Iterable
from typing import List

from google import genai
from google.genai import types


# Gemini embed_content 한 번 호출당 입력 개수 (안전 마진 포함)
BATCH_SIZE = 64


def _l2_normalize(vec: List[float]) -> List[float]:
    norm = math.sqrt(sum(x * x for x in vec))
    if norm == 0:
        return vec
    return [x / norm for x in vec]


class Embedder:
    def __init__(
        self,
        client: genai.Client,
        model: str,
        output_dim: int,
    ) -> None:
        self._client = client
        self._model = model
        self._output_dim = output_dim

    def _embed_batch(self, texts: List[str], task_type: str) -> List[List[float]]:
        # 빈 문자열은 API가 거부하므로 placeholder로 치환
        safe = [t if t and t.strip() else " " for t in texts]
        config = types.EmbedContentConfig(
            output_dimensionality=self._output_dim,
            task_type=task_type,
        )
        resp = self._client.models.embed_content(
            model=self._model,
            contents=safe,
            config=config,
        )
        # 응답은 입력 순서 그대로 반환됨
        vectors = [e.values for e in resp.embeddings]
        # 차원을 줄여 잘라낸 경우 정규화 필요
        return [_l2_normalize(v) for v in vectors]

    def embed_documents(self, texts: Iterable[str]) -> List[List[float]]:
        text_list = list(texts)
        results: List[List[float]] = []
        for start in range(0, len(text_list), BATCH_SIZE):
            chunk = text_list[start : start + BATCH_SIZE]
            results.extend(self._embed_batch(chunk, task_type="RETRIEVAL_DOCUMENT"))
        return results

    def embed_query(self, text: str) -> List[float]:
        return self._embed_batch([text], task_type="RETRIEVAL_QUERY")[0]
