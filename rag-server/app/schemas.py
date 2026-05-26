from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, description="사용자 질문")
    namespace: str | None = Field(None, description="Pinecone namespace (미지정 시 .env 기본값)")
    top_k: int | None = Field(None, ge=1, le=20, description="검색할 청크 수")
    include_answer: bool = Field(True, description="Gemini 답변 생성 여부 (false면 참고자료만)")


class ReferenceCard(BaseModel):
    """프론트 화면에 표시할 참고 자료 카드."""

    title: str
    description: str
    url: str | None = None
    score: float | None = None
    source: str | None = None
    topic: str | None = None
    domain: str | None = None
    data_type: str | None = None
    page: int | None = None


class AskResponse(BaseModel):
    answer: str | None = None
    references: list[ReferenceCard]


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    namespace: str | None = None
    top_k: int | None = Field(None, ge=1, le=20)


class HealthResponse(BaseModel):
    status: str = "ok"
    index: str
    namespace: str
