from __future__ import annotations

import math
from collections.abc import Iterable
from typing import List

from google import genai
from google.genai import types

BATCH_SIZE = 64


def _l2_normalize(vec: List[float]) -> List[float]:
    norm = math.sqrt(sum(x * x for x in vec))
    if norm == 0:
        return vec
    return [x / norm for x in vec]


class Embedder:
    def __init__(self, client: genai.Client, model: str, output_dim: int) -> None:
        self._client = client
        self._model = model
        self._output_dim = output_dim

    def _embed_batch(self, texts: List[str], task_type: str) -> List[List[float]]:
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
        vectors = [e.values for e in resp.embeddings]
        return [_l2_normalize(v) for v in vectors]

    def embed_query(self, text: str) -> List[float]:
        return self._embed_batch([text], task_type="RETRIEVAL_QUERY")[0]
