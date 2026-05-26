"""Pinecone 인덱스 생성 / 업서트 / 조회 래퍼."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Sequence

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
            print(f"[Pinecone] 인덱스가 없어 새로 생성합니다: {self._index_name}")
            self._pc.create_index(
                name=self._index_name,
                dimension=self._dimension,
                metric=self._metric,
                spec=ServerlessSpec(cloud=self._cloud, region=self._region),
            )
            # 인덱스가 ready 상태가 될 때까지 대기
            while True:
                desc = self._pc.describe_index(self._index_name)
                if desc.status.get("ready"):
                    break
                time.sleep(1)
            print("[Pinecone] 인덱스 생성 완료.")
        return self._pc.Index(self._index_name)

    def upsert(
        self,
        vectors: Sequence[Dict[str, Any]],
        namespace: str = "",
        batch_size: int = 100,
    ) -> int:
        """vectors: [{"id": str, "values": List[float], "metadata": dict}, ...]"""
        total = 0
        for start in range(0, len(vectors), batch_size):
            batch = vectors[start : start + batch_size]
            self._index.upsert(vectors=list(batch), namespace=namespace)
            total += len(batch)
        return total

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
        return [
            {
                "id": match["id"],
                "score": match["score"],
                "metadata": match.get("metadata", {}) or {},
            }
            for match in resp.get("matches", [])
        ]

    def stats(self) -> Dict[str, Any]:
        return self._index.describe_index_stats()

    def delete_namespace(self, namespace: str) -> None:
        self._index.delete(delete_all=True, namespace=namespace)
