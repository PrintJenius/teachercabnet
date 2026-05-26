from __future__ import annotations

import time
from typing import Any, Dict, List

from pinecone import Pinecone, ServerlessSpec


class PineconeStore:
    def __init__(
        self,
        api_key: str,
        index_name: str,
        dimension: int,
        cloud: str = "aws",
        region: str = "us-east-1",
        metric: str = "cosine",
    ) -> None:
        self._pc = Pinecone(api_key=api_key)
        self._index_name = index_name
        self._dimension = dimension
        self._cloud = cloud
        self._region = region
        self._metric = metric
        self._index = self._ensure_index()

    def _ensure_index(self):
        existing = {idx["name"] for idx in self._pc.list_indexes()}
        if self._index_name not in existing:
            self._pc.create_index(
                name=self._index_name,
                dimension=self._dimension,
                metric=self._metric,
                spec=ServerlessSpec(cloud=self._cloud, region=self._region),
            )
            while True:
                desc = self._pc.describe_index(self._index_name)
                if desc.status.get("ready"):
                    break
                time.sleep(1)
        return self._pc.Index(self._index_name)

    def query(
        self,
        vector: List[float],
        top_k: int = 5,
        namespace: str = "",
    ) -> List[Dict[str, Any]]:
        resp = self._index.query(
            vector=vector,
            top_k=top_k,
            namespace=namespace,
            include_metadata=True,
        )
        matches = getattr(resp, "matches", None)
        if matches is None and isinstance(resp, dict):
            matches = resp.get("matches", [])
        if not matches:
            return []

        rows: List[Dict[str, Any]] = []
        for match in matches:
            match_id = getattr(match, "id", None) or (
                match.get("id") if isinstance(match, dict) else None
            )
            score = getattr(match, "score", None)
            if score is None and isinstance(match, dict):
                score = match.get("score")
            meta = getattr(match, "metadata", None)
            if meta is None and isinstance(match, dict):
                meta = match.get("metadata")
            rows.append(
                {
                    "id": match_id,
                    "score": score,
                    "metadata": meta or {},
                },
            )
        return rows
